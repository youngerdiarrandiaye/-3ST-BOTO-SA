import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMsgUtilisateur } from '@/lib/errors/handler'

const TRANSITIONS: Record<string, string[]> = {
  valide:   ['suspendu', 'retire', 'expire'],
  suspendu: ['valide', 'retire'],
  retire:   [],
  expire:   [],
}

const STATUT_LABEL: Record<string, string> = {
  retire: 'retiré', expire: 'expiré', suspendu: 'suspendu', valide: 'actif',
}

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
    return NextResponse.json({ error: 'Rôle insuffisant pour modifier un permis' }, { status: 403 })
  }

  const body = await req.json()
  const { statut, motif } = body
  if (!statut) return NextResponse.json({ error: 'statut requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: permis } = await admin
    .from('permis_internes')
    .select('statut')
    .eq('id', id)
    .single()

  if (!permis) return NextResponse.json({ error: 'Permis introuvable' }, { status: 404 })

  // Cas spécial : déjà dans cet état
  if (permis.statut === statut) {
    return NextResponse.json(
      { error: `Ce permis est déjà ${STATUT_LABEL[statut] ?? statut}.` },
      { status: 422 }
    )
  }

  const transitions = TRANSITIONS[permis.statut] ?? []
  if (!transitions.includes(statut)) {
    if (permis.statut === 'retire') {
      return NextResponse.json(
        { error: 'Ce permis est déjà retiré définitivement. Aucune action possible.' },
        { status: 422 }
      )
    }
    if (permis.statut === 'expire') {
      return NextResponse.json(
        { error: 'Ce permis est expiré. Seul un renouvellement est possible.' },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: `Transition impossible : ce permis ne peut pas passer de "${permis.statut}" à "${statut}".` },
      { status: 422 }
    )
  }

  const updateData: Record<string, unknown> = {
    statut,
    updated_at: new Date().toISOString(),
  }
  if (motif) updateData.motif_changement = motif

  const { error } = await admin
    .from('permis_internes')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: getMsgUtilisateur(error) }, { status: 500 })
  return NextResponse.json({ success: true })
}
