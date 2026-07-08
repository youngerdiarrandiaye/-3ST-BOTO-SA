import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { conducteur_id, type, motif, date_debut, date_fin, infraction_id } = await request.json()
  if (!conducteur_id || !type || !motif?.trim() || !date_debut) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  if (type === 'suspension_temp' && !date_fin) {
    return NextResponse.json({ error: 'Date de fin requise pour une suspension temporaire' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Insérer la sanction
  const { data: sanction, error: sancErr } = await admin
    .from('sanctions')
    .insert({
      conducteur_id,
      type,
      motif: motif.trim(),
      date_debut,
      date_fin: type === 'suspension_temp' ? (date_fin || null) : null,
      decideur_id: user.id,
      infraction_id: infraction_id ?? null,
    })
    .select('id')
    .single()

  if (sancErr) return NextResponse.json({ error: 'Erreur lors de la création de la sanction' }, { status: 500 })

  // 2. Mettre à jour le statut du conducteur
  const nouveauStatut = type === 'retrait_definitif' ? 'retire' : 'suspendu'
  const { error: condErr } = await admin.from('conducteurs')
    .update({ statut: nouveauStatut })
    .eq('id', conducteur_id)

  if (condErr) {
    console.error('[3ST] Sanction créée mais statut conducteur non mis à jour:', condErr.message)
    return NextResponse.json(
      { error: 'Sanction enregistrée mais mise à jour du statut conducteur impossible' },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: sanction.id })
}
