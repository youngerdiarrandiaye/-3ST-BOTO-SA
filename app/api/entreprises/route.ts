import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { nom, type, contact_nom, contact_tel, contact_email } = await request.json()

  if (!nom?.trim()) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
  if (!['sous_traitant', 'partenaire', 'interne'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('entreprises')
    .insert({
      nom:           nom.trim(),
      type,
      contact_nom:   contact_nom?.trim()   || null,
      contact_tel:   contact_tel?.trim()   || null,
      contact_email: contact_email?.trim() || null,
      actif:         true,
    })
    .select('*, conducteurs(id)')
    .single()

  if (error) return NextResponse.json({ error: 'Création impossible' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
