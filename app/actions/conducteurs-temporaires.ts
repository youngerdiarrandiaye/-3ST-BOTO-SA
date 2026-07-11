'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getMsgUtilisateur } from '@/lib/errors/handler'
import { revalidatePath } from 'next/cache'

const renouvellementSchema = z.object({
  conducteurId: z.string().uuid('ID conducteur invalide'),
  nouvelleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)')
    .refine((d) => new Date(d) > new Date(), 'La nouvelle date doit être dans le futur'),
})

export async function renouvelerAutorisationTemporaire(
  conducteurId: string,
  nouvelleDate: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return { ok: false, error: 'Permission insuffisante' }

  const parsed = renouvellementSchema.safeParse({ conducteurId, nouvelleDate })
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data: conducteur, error: fetchErr } = await admin
    .from('conducteurs')
    .select('id, nom, prenom, est_temporaire, statut')
    .eq('id', conducteurId)
    .single()

  if (fetchErr || !conducteur) return { ok: false, error: 'Conducteur introuvable' }
  if (!conducteur.est_temporaire)
    return { ok: false, error: "Ce conducteur n'est pas temporaire" }

  const { error: updateErr } = await admin
    .from('conducteurs')
    .update({
      date_fin_autorisation: nouvelleDate,
      statut: 'actif',
    })
    .eq('id', conducteurId)

  if (updateErr) return { ok: false, error: getMsgUtilisateur(updateErr) }

  revalidatePath('/conducteurs')
  revalidatePath(`/conducteurs/${conducteurId}`)
  revalidatePath('/dashboard')

  return { ok: true }
}
