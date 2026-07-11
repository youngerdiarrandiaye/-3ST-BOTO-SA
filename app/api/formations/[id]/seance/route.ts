import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getMsgUtilisateur } from '@/lib/errors/handler'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: f } = await admin
    .from('formations')
    .select('nb_seances, nb_seances_faites, statut')
    .eq('id', id)
    .single()

  if (!f) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })
  if (f.statut !== 'en_cours') return NextResponse.json({ error: 'Formation non active' }, { status: 400 })
  if ((f.nb_seances_faites ?? 0) >= (f.nb_seances ?? 1)) {
    return NextResponse.json({ error: 'Toutes les séances sont déjà enregistrées' }, { status: 400 })
  }

  const newCount = (f.nb_seances_faites ?? 0) + 1

  const { error } = await admin.from('formations').update({ nb_seances_faites: newCount }).eq('id', id)
  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })

  return NextResponse.json({ nb_seances_faites: newCount })
}
