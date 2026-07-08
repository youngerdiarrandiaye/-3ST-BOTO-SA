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
    .from('utilisateurs').select('role').eq('id', user.id).single()

  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return NextResponse.json({ error: 'Rôle insuffisant' }, { status: 403 })

  const body = await req.json()
  const { resultat, score, observations } = body

  if (!resultat || !['reussi', 'echoue'].includes(resultat))
    return NextResponse.json({ error: 'Résultat invalide (reussi | echoue)' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('tests_conduite').update({
    resultat,
    score:        (score !== undefined && score !== '' && score !== null) ? Number(score) : null,
    observations: observations?.trim() || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
