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
    return NextResponse.json({ error: 'Rôle insuffisant pour lever une sanction' }, { status: 403 })
  }

  const admin = createAdminClient()

  // SÉCURITÉ : lire conducteur_id depuis la sanction en base — jamais depuis le body
  const { data: sanction, error: sanctionErr } = await admin
    .from('sanctions')
    .select('id, conducteur_id')
    .eq('id', id)
    .single()

  if (sanctionErr || !sanction) {
    return NextResponse.json({ error: 'Sanction introuvable' }, { status: 404 })
  }

  const conducteur_id = sanction.conducteur_id
  const today = new Date().toISOString().split('T')[0]

  const { error } = await admin
    .from('sanctions')
    .update({ levee_le: today, levee_par: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })

  // Si plus aucune sanction active → restaurer le conducteur suspendu
  const { data: restantes } = await admin
    .from('sanctions')
    .select('id')
    .eq('conducteur_id', conducteur_id)
    .is('levee_le', null)

  const autresActives = (restantes ?? []).filter(s => s.id !== id)

  if (autresActives.length === 0) {
    await admin
      .from('conducteurs')
      .update({ statut: 'actif', updated_at: new Date().toISOString() })
      .eq('id', conducteur_id)
      .eq('statut', 'suspendu')
  }

  return NextResponse.json({ success: true })
}
