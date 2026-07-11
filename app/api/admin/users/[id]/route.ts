import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getMsgUtilisateur } from '@/lib/errors/handler'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: caller } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabase
    .from('utilisateurs')
    .select('id, email, nom, prenom, role, telephone, actif, service, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: caller } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — rôle admin requis' }, { status: 403 })
  }

  const isSelf = id === user.id
  const body = await request.json()
  const update: Record<string, unknown> = {}

  // nom / prenom / telephone — editable by self OR admin
  if (body.nom       !== undefined) update.nom       = String(body.nom).trim()
  if (body.prenom    !== undefined) update.prenom    = String(body.prenom).trim()
  if (body.telephone !== undefined) update.telephone = body.telephone ? String(body.telephone).trim() : null

  // actif / role / service — admin only, never self
  if (!isSelf) {
    if (body.actif !== undefined) update.actif = Boolean(body.actif)
    if (body.role  !== undefined) {
      const ROLES_VALIDES = ['admin', 'hse', 'sst', 'direction', 'agent']
      if (!ROLES_VALIDES.includes(body.role)) {
        return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
      }
      update.role = body.role
    }
    if (body.service !== undefined) {
      const SERVICES_VALIDES = ['3st', 'sst_hse']
      const effectiveRole = (body.role ?? update.role) as string | undefined
      update.service = effectiveRole === 'agent' && SERVICES_VALIDES.includes(body.service)
        ? body.service
        : null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('utilisateurs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })

  return NextResponse.json({ ok: true })
}
