import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type Ctx = { params: Promise<{ id: string }> }

const ETAPES = ['resp_dept', 'resp_sst', 'equipe_sst', 'clinique'] as const
type Etape = typeof ETAPES[number]

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 })

  const body = await req.json()
  const { etape, valider, nom_valideur, date_validation, medecin } = body as {
    etape: Etape
    valider: boolean
    nom_valideur?: string
    date_validation?: string
    medecin?: string
  }

  if (!ETAPES.includes(etape))
    return NextResponse.json({ error: `Étape invalide. Valeurs: ${ETAPES.join(', ')}` }, { status: 400 })

  const admin = createAdminClient()

  const update: Record<string, unknown> = {}
  const today = new Date().toISOString().slice(0, 10)

  switch (etape) {
    case 'resp_dept':
      update.validation_resp_dept     = valider
      update.nom_resp_dept            = valider ? (nom_valideur || null) : null
      update.date_validation_resp_dept = valider ? (date_validation || today) : null
      break
    case 'resp_sst':
      update.autorisation_resp_sst      = valider
      update.nom_resp_sst               = valider ? (nom_valideur || null) : null
      update.date_autorisation_resp_sst = valider ? (date_validation || today) : null
      break
    case 'equipe_sst':
      update.autorisation_equipe_sst      = valider
      update.nom_equipe_sst               = valider ? (nom_valideur || null) : null
      update.date_autorisation_equipe_sst = valider ? (date_validation || today) : null
      break
    case 'clinique':
      update.autorisation_clinique      = valider
      update.medecin_clinique           = valider ? (medecin || nom_valideur || null) : null
      update.date_autorisation_clinique = valider ? (date_validation || today) : null
      break
  }

  const { error } = await admin.from('conducteurs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/conducteurs/${id}`)
  return NextResponse.json({ success: true })
}
