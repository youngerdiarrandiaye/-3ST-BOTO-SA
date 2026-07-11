import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMsgUtilisateur } from '@/lib/errors/handler'

const TRANSITIONS: Record<string, string[]> = {
  declaree:  ['traitee', 'contestee', 'annulee'],
  contestee: ['traitee', 'annulee'],
  traitee:   [],
  annulee:   [],
}

// Admin, HSE et SST peuvent lever une contestation (annuler)
const ADMIN_ONLY = ['annulee']
const ROLES_ANNULER = ['admin', 'hse', 'sst']

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

  const { statut } = await req.json()
  if (!statut) return NextResponse.json({ error: 'statut requis' }, { status: 400 })

  if (ADMIN_ONLY.includes(statut) && !ROLES_ANNULER.includes(me.role))
    return NextResponse.json({ error: 'Action réservée à l\'administrateur ou au responsable HSE' }, { status: 403 })

  const admin = createAdminClient()
  const { data: inf } = await admin
    .from('infractions').select('statut').eq('id', id).single()
  if (!inf) return NextResponse.json({ error: 'Infraction introuvable' }, { status: 404 })

  const allowed = TRANSITIONS[inf.statut] ?? []
  if (!allowed.includes(statut))
    return NextResponse.json(
      { error: `Transition invalide : ${inf.statut} → ${statut}` },
      { status: 422 }
    )

  const { error } = await admin
    .from('infractions')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })
  return NextResponse.json({ success: true })
}
