import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
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
    return NextResponse.json({ error: 'Rôle insuffisant pour traiter une infraction' }, { status: 403 })
  }

  const body = await req.json()
  const { statut } = body

  if (!['traitee', 'contestee'].includes(statut)) {
    return NextResponse.json({ error: 'Statut invalide — valeurs acceptées : traitee, contestee' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Machine d'états : seule une infraction 'declaree' peut être traitée ici
  const { data: inf } = await admin
    .from('infractions').select('statut').eq('id', id).single()
  if (!inf) return NextResponse.json({ error: 'Infraction introuvable' }, { status: 404 })
  if (inf.statut !== 'declaree') {
    return NextResponse.json(
      { error: `Transition invalide : cette infraction est déjà "${inf.statut}". Utilisez l'endpoint /statut pour les transitions avancées.` },
      { status: 422 }
    )
  }

  const { error } = await admin
    .from('infractions')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message ?? 'Mise à jour impossible' }, { status: 500 })
  return NextResponse.json({ success: true })
}
