import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst', 'agent'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const {
    conducteur_id, type_infraction_id, date_heure, localisation, description,
    // V2
    zone_constatee, conducteur_refuse_signe, temoins,
  } = await request.json()

  if (!conducteur_id || !type_infraction_id || !date_heure) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  // Validation date : ne peut pas être dans le futur
  if (new Date(date_heure) > new Date()) {
    return NextResponse.json({ error: 'La date/heure ne peut pas être dans le futur' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: typeInf } = await admin
    .from('types_infraction').select('id').eq('id', type_infraction_id).single()
  if (!typeInf) return NextResponse.json({ error: 'Type infraction introuvable' }, { status: 400 })

  const { data: cond } = await admin
    .from('conducteurs').select('id').eq('id', conducteur_id).single()
  if (!cond) return NextResponse.json({ error: 'Conducteur introuvable' }, { status: 400 })

  // 1. Insérer l'infraction (le trigger detecter_recidive s'exécute BEFORE INSERT)
  const { data: infraction, error: infErr } = await admin
    .from('infractions')
    .insert({
      conducteur_id,
      agent_id:            user.id,
      type_infraction_id,
      date_heure:          new Date(date_heure).toISOString(),
      localisation:        localisation || null,
      description:         description  || null,
      statut:              'declaree',
      // V2
      zone_constatee:         zone_constatee || null,
      conducteur_refuse_signe: Boolean(conducteur_refuse_signe),
    })
    .select('id')
    .single()

  if (infErr) return NextResponse.json({ error: 'Erreur lors de la création de l\'infraction' }, { status: 500 })

  // La déduction de points est gérée par le trigger trg_infraction_points (schema_3ST.sql:277)
  // qui s'exécute AFTER INSERT et gère aussi la suspension automatique.

  // 2. Insérer les témoins (V2)
  if (Array.isArray(temoins) && temoins.length > 0) {
    const rows = temoins
      .filter((t: any) => t?.nom?.trim())
      .map((t: any) => ({
        infraction_id: infraction.id,
        nom:           t.nom.trim(),
        prenom:        t.prenom?.trim()      || null,
        matricule:     t.matricule?.trim()   || null,
        telephone:     t.telephone?.trim()   || null,
        declaration:   t.declaration?.trim() || null,
      }))
    if (rows.length > 0) {
      const { error: temoinsErr } = await admin.from('temoins').insert(rows)
      if (temoinsErr) {
        console.error('[3ST] Témoins non sauvegardés pour infraction', infraction.id, ':', temoinsErr.message)
        return NextResponse.json(
          { id: infraction.id, warning: 'Infraction créée mais témoins non enregistrés' },
          { status: 207 }
        )
      }
    }
  }

  return NextResponse.json({ id: infraction.id })
}
