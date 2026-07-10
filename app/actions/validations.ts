'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getMe() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role, nom, prenom')
    .eq('id', user.id)
    .single()
  if (!me) return null
  return { role: me.role as string, fullName: `${me.prenom} ${me.nom}`.trim() }
}

export async function validerNiveau1(
  conducteurId: string,
  valider: boolean,
  motif?: string,
): Promise<{ error?: string }> {
  const me = await getMe()
  if (!me) return { error: 'Non authentifié' }
  if (!['admin', 'direction'].includes(me.role))
    return { error: 'Rôle insuffisant — admin ou direction requis' }
  if (!valider && !motif?.trim())
    return { error: 'Motif de refus requis' }

  const admin = createAdminClient()

  // Fetch current statut to reset 'refuse' → 'en_attente' on re-validation
  const { data: current } = await admin
    .from('conducteurs')
    .select('statut')
    .eq('id', conducteurId)
    .single()

  const updateData: Record<string, unknown> = { nom_resp_dept: me.fullName }

  if (valider) {
    updateData.validation_resp_dept = true
    updateData.motif_refus_dept = null
    if (current?.statut === 'refuse') updateData.statut = 'en_attente'
  } else {
    updateData.validation_resp_dept = false
    updateData.motif_refus_dept = motif!.trim()
  }

  const { error } = await admin.from('conducteurs').update(updateData).eq('id', conducteurId)
  if (error) return { error: error.message }
  revalidatePath(`/conducteurs/${conducteurId}`)
  return {}
}

export async function validerNiveau2(
  conducteurId: string,
  valider: boolean,
  motif?: string,
): Promise<{ error?: string }> {
  const me = await getMe()
  if (!me) return { error: 'Non authentifié' }
  if (!['admin', 'sst'].includes(me.role))
    return { error: 'Rôle insuffisant — admin ou SST requis' }
  if (!valider && !motif?.trim())
    return { error: 'Motif de refus requis' }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('conducteurs')
    .select('statut')
    .eq('id', conducteurId)
    .single()

  const updateData: Record<string, unknown> = { nom_resp_sst: me.fullName }

  if (valider) {
    updateData.autorisation_resp_sst = true
    updateData.motif_refus_resp_sst = null
    updateData.validation_sst = true
    if (current?.statut === 'refuse') updateData.statut = 'en_attente'
  } else {
    updateData.autorisation_resp_sst = false
    updateData.motif_refus_resp_sst = motif!.trim()
    // SST refusé invalide aussi la visite médicale
    updateData.validation_sst = false
    updateData.validation_clinique = false
  }

  const { error } = await admin.from('conducteurs').update(updateData).eq('id', conducteurId)
  if (error) return { error: error.message }
  revalidatePath(`/conducteurs/${conducteurId}`)
  return {}
}

export async function validerNiveau3(
  conducteurId: string,
  valider: boolean,
  medecinNom?: string,
  motif?: string,
): Promise<{ error?: string }> {
  const me = await getMe()
  if (!me) return { error: 'Non authentifié' }
  if (!['admin', 'sst', 'hse'].includes(me.role))
    return { error: 'Rôle insuffisant — admin, SST ou HSE requis' }
  if (!valider && !motif?.trim())
    return { error: 'Motif de refus requis' }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('conducteurs')
    .select('statut')
    .eq('id', conducteurId)
    .single()

  const updateData: Record<string, unknown> = { valideur_clinique: me.fullName }

  if (valider) {
    updateData.autorisation_clinique = true
    updateData.medecin_clinique = medecinNom?.trim() || null
    updateData.motif_refus_clinique = null
    // N3 validé = workflow complet → les deux champs permis activés
    updateData.validation_sst = true
    updateData.validation_clinique = true
    if (current?.statut === 'refuse') updateData.statut = 'en_attente'
  } else {
    updateData.autorisation_clinique = false
    updateData.motif_refus_clinique = motif!.trim()
    updateData.validation_clinique = false
  }

  const { error } = await admin.from('conducteurs').update(updateData).eq('id', conducteurId)
  if (error) return { error: error.message }
  revalidatePath(`/conducteurs/${conducteurId}`)
  return {}
}
