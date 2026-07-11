import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMsgUtilisateur } from '@/lib/errors/handler'

const CHAMPS_MODIFIABLES = ['description', 'localisation', 'date_heure', 'zone_constatee'] as const

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
    return NextResponse.json({ error: 'Rôle insuffisant pour modifier une infraction' }, { status: 403 })

  const admin = createAdminClient()
  const { data: inf } = await admin
    .from('infractions').select('statut').eq('id', id).single()
  if (!inf) return NextResponse.json({ error: 'Infraction introuvable' }, { status: 404 })

  if (inf.statut !== 'declaree')
    return NextResponse.json(
      { error: 'Seules les infractions en attente de traitement peuvent être modifiées' },
      { status: 422 }
    )

  const body = await req.json()

  // Ne garder que les champs autorisés
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in body) update[champ] = body[champ] ?? null
  }

  if (Object.keys(update).length === 1)
    return NextResponse.json({ error: 'Aucun champ valide à modifier' }, { status: 400 })

  const { error } = await admin
    .from('infractions').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })
  return NextResponse.json({ success: true })
}
