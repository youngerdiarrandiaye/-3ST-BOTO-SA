import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { resultat, date } = await req.json()
  if (!resultat || !['reussi', 'echoue', 'en_attente'].includes(resultat)) {
    return NextResponse.json({ error: 'Résultat invalide' }, { status: 400 })
  }

  const { data: f } = await admin
    .from('formations')
    .select('statut, test_reprise_requis')
    .eq('id', id)
    .single()

  if (!f) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })
  if (!f.test_reprise_requis) return NextResponse.json({ error: 'Pas de test requis pour cette formation' }, { status: 400 })
  if (f.statut !== 'en_cours') return NextResponse.json({ error: 'Formation non active' }, { status: 400 })

  const { error } = await admin
    .from('formations')
    .update({
      test_reprise_resultat: resultat,
      test_reprise_date:     date || new Date().toISOString().split('T')[0],
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
