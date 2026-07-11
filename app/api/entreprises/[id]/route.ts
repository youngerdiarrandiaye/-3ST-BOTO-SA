import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getMsgUtilisateur } from '@/lib/errors/handler'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('entreprises')
    .select(`
      *,
      conducteurs(
        id, matricule, nom, prenom, statut, points_actuels,
        permis_internes(id, statut, date_expiration)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { nom, type, contact_nom, contact_tel, contact_email, actif } = await request.json()

  if (nom !== undefined && !nom?.trim()) {
    return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 })
  }
  if (type !== undefined && !['sous_traitant', 'partenaire', 'interne'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (nom         !== undefined) update.nom           = nom.trim()
  if (type        !== undefined) update.type          = type
  if (contact_nom !== undefined) update.contact_nom   = contact_nom?.trim() || null
  if (contact_tel !== undefined) update.contact_tel   = contact_tel?.trim() || null
  if (contact_email !== undefined) update.contact_email = contact_email?.trim() || null
  if (actif       !== undefined) update.actif         = Boolean(actif)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('entreprises').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Suppression réservée à l\'administrateur' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Refuse la suppression si des conducteurs sont encore rattachés
  const { count } = await admin
    .from('conducteurs')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${count} conducteur(s) rattaché(s) à cette entreprise` },
      { status: 409 }
    )
  }

  const { error } = await admin.from('entreprises').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
