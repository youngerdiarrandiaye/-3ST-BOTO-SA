import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'documents-conducteurs'
const MAX_SIZE: Record<string, number> = {
  photo_permis:        5 * 1024 * 1024,
  copie_permis_pdf:   10 * 1024 * 1024,
  attestation_medicale:10 * 1024 * 1024,
  autre_document:     10 * 1024 * 1024,
}
const TYPES_DOCUMENT = Object.keys(MAX_SIZE)
const MIME_ALLOWED: Record<string, string[]> = {
  photo_permis:         ['image/jpeg', 'image/png', 'image/webp'],
  copie_permis_pdf:     ['application/pdf'],
  attestation_medicale: ['application/pdf', 'image/jpeg', 'image/png'],
  autre_document:       ['application/pdf', 'image/jpeg', 'image/png'],
}

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst', 'direction'].includes(me.role))
    return NextResponse.json({ error: 'Permission insuffisante — documents médicaux réservés HSE/SST/Direction/Admin' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('documents_conducteur')
    .select('id, type_document, nom_fichier, taille_bytes, created_at')
    .eq('conducteur_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erreur lors de la récupération des documents' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 })

  const form = await req.formData()
  const file      = form.get('file') as File | null
  const typeDoc   = form.get('type_document') as string | null

  if (!file || !typeDoc) return NextResponse.json({ error: 'Fichier et type requis' }, { status: 400 })
  if (!TYPES_DOCUMENT.includes(typeDoc)) return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })

  const allowedMimes = MIME_ALLOWED[typeDoc]
  if (!allowedMimes.includes(file.type))
    return NextResponse.json({ error: `Type MIME non autorisé. Attendu : ${allowedMimes.join(', ')}` }, { status: 400 })

  if (file.size > MAX_SIZE[typeDoc])
    return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_SIZE[typeDoc] / 1024 / 1024} MB)` }, { status: 400 })

  const admin   = createAdminClient()
  const ext     = file.name.split('.').pop()
  const path    = `${id}/${typeDoc}/${Date.now()}.${ext}`
  const buffer  = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { error: dbErr } = await admin.from('documents_conducteur').insert({
    conducteur_id: id,
    type_document: typeDoc,
    nom_fichier:   file.name,
    url:           path,
    taille_bytes:  file.size,
    uploaded_par:  user.id,
  })
  if (dbErr) {
    await admin.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst'].includes(me.role))
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 })

  const { docId } = await req.json()
  if (!docId) return NextResponse.json({ error: 'docId requis' }, { status: 400 })

  const admin = createAdminClient()
  const { data: doc } = await admin.from('documents_conducteur')
    .select('url').eq('id', docId).eq('conducteur_id', id).single()
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  await admin.storage.from(BUCKET).remove([doc.url])
  await admin.from('documents_conducteur').delete().eq('id', docId)

  return NextResponse.json({ success: true })
}
