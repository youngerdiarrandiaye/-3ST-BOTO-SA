import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMsgUtilisateur } from '@/lib/errors/handler'

export async function POST(req: NextRequest) {
  // Vérifier que le demandeur est admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: caller } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — rôle admin requis' }, { status: 403 })
  }

  const body = await req.json()
  const { email, password, nom, prenom, role, telephone, service } = body

  if (!email || !password || !nom || !prenom || !role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const ROLES_VALIDES = ['admin', 'hse', 'sst', 'direction', 'agent']
  if (!ROLES_VALIDES.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Créer le compte Auth avec les métadonnées pour le trigger
  const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom, prenom, role },
  })

  if (authErr) {
    return NextResponse.json({ error: getMsgUtilisateur(authErr) }, { status: 400 })
  }

  // Upsert dans utilisateurs (au cas où le trigger n'aurait pas tout rempli)
  const SERVICES_VALIDES = ['3st', 'sst_hse']
  await admin
    .from('utilisateurs')
    .upsert({
      id:        newUser.user.id,
      email,
      nom,
      prenom,
      role,
      telephone: telephone || null,
      service:   role === 'agent' && SERVICES_VALIDES.includes(service) ? service : null,
      actif:     true,
    }, { onConflict: 'id' })

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
