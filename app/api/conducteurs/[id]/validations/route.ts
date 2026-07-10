import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function PATCH(
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
    return NextResponse.json({ error: 'Rôle insuffisant' }, { status: 403 })
  }

  const { type, value } = await req.json()
  if (!['sst', 'clinique'].includes(type) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch current state
  const { data: current } = await admin
    .from('conducteurs')
    .select('statut, validation_sst, validation_clinique')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Conducteur introuvable' }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)   // "YYYY-MM-DD" — colonne DATE
  const updateData: Record<string, unknown> = {}

  if (type === 'sst') {
    updateData.validation_sst = value
    updateData.date_validation_sst = value ? today : null
  } else {
    updateData.validation_clinique = value
    updateData.date_validation_clinique = value ? today : null
  }

  // Compute resulting state
  const sst_ok      = type === 'sst'      ? value : current.validation_sst
  const clinique_ok = type === 'clinique' ? value : current.validation_clinique
  const bothValid   = sst_ok && clinique_ok

  // Auto-transition statut
  if (bothValid && current.statut === 'inactif') {
    updateData.statut = 'actif'
  } else if (!bothValid && current.statut === 'actif') {
    updateData.statut = 'inactif'
  }

  const { error } = await admin
    .from('conducteurs')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message ?? 'Mise à jour impossible' }, { status: 500 })
  revalidatePath(`/conducteurs/${id}`)
  return NextResponse.json({ success: true, statut: updateData.statut ?? current.statut })
}
