import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()

  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return NextResponse.json({ error: 'Rôle insuffisant' }, { status: 403 })

  const body = await req.json()
  const { conducteur_id, date_test, type, evaluateur_id, resultat, score, observations } = body

  if (!conducteur_id || !date_test)
    return NextResponse.json({ error: 'conducteur_id et date_test sont obligatoires' }, { status: 400 })

  if (type && !['initial', 'reprise'].includes(type))
    return NextResponse.json({ error: 'Type invalide (initial | reprise)' }, { status: 400 })

  if (resultat && !['reussi', 'echoue', 'en_attente'].includes(resultat))
    return NextResponse.json({ error: 'Résultat invalide' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('tests_conduite').insert({
    conducteur_id,
    date_test,
    type:         type ?? 'initial',
    evaluateur_id: evaluateur_id ?? null,
    resultat:     resultat ?? 'en_attente',
    score:        (score !== undefined && score !== '' && score !== null) ? Number(score) : null,
    observations: observations?.trim() || null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
