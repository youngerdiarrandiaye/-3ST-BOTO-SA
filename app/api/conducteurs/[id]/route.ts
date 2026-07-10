import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || !['admin', 'hse', 'sst'].includes(me.role)) {
    return NextResponse.json({ error: 'Rôle insuffisant pour modifier un conducteur' }, { status: 403 })
  }

  const body = await req.json()
  const {
    nom, prenom, date_naissance, permis_national, permis_civil_autorite, entreprise_id, statut,
    // V2
    fonction, type_permis_conduite, zone_validite, type_zone,
    validation_sst, date_validation_sst,
    validation_clinique, date_validation_clinique,
    contact_urgence_nom, contact_urgence_tel,
    // Am. 4 — temporaire
    est_temporaire, date_debut_autorisation, date_fin_autorisation,
  } = body

  if (!nom?.trim() || !prenom?.trim() || !entreprise_id) {
    return NextResponse.json({ error: 'nom, prenom et entreprise_id sont obligatoires' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch current statut to decide auto-transition
  const { data: current } = await admin
    .from('conducteurs')
    .select('statut')
    .eq('id', id)
    .single()

  const sst_ok      = Boolean(validation_sst)
  const clinique_ok = Boolean(validation_clinique)
  const bothValid   = sst_ok && clinique_ok

  const updateData: Record<string, unknown> = {
    nom:                   nom.trim(),
    prenom:                prenom.trim(),
    date_naissance:        date_naissance || null,
    permis_national:       permis_national?.trim()      || null,
    permis_civil_autorite: permis_civil_autorite?.trim() || null,
    entreprise_id,
    // V2
    fonction:                  fonction?.trim() || null,
    type_permis_conduite:      Array.isArray(type_permis_conduite) ? type_permis_conduite : [],
    zone_validite:             zone_validite || null,
    type_zone:                 type_zone     || null,
    est_temporaire:            Boolean(est_temporaire),
    date_debut_autorisation:   date_debut_autorisation || null,
    date_fin_autorisation:     est_temporaire ? (date_fin_autorisation || null) : null,
    validation_sst:            sst_ok,
    date_validation_sst:       sst_ok ? (date_validation_sst || null) : null,
    validation_clinique:       clinique_ok,
    date_validation_clinique:  clinique_ok ? (date_validation_clinique || null) : null,
    contact_urgence_nom:       contact_urgence_nom?.trim() || null,
    contact_urgence_tel:       contact_urgence_tel?.trim() || null,
    updated_at:                new Date().toISOString(),
  }

  if (statut && ['admin', 'hse'].includes(me.role)) {
    // Explicit override from admin/hse
    const statutsValides = ['actif', 'suspendu', 'retire', 'inactif']
    if (statutsValides.includes(statut)) updateData.statut = statut
  } else {
    // Auto-transition based on validations (never disturb suspendu/retire)
    const cur = current?.statut
    if (bothValid && cur === 'inactif') {
      updateData.statut = 'actif'
    } else if (!bothValid && cur === 'actif') {
      updateData.statut = 'inactif'
    }
  }

  const { error } = await admin
    .from('conducteurs')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message ?? 'Mise à jour impossible' }, { status: 500 })
  return NextResponse.json({ success: true })
}
