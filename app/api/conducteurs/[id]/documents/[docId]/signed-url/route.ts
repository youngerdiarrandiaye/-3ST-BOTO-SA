import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'documents-conducteurs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst', 'direction'].includes(me.role))
    return NextResponse.json({ error: 'Permission insuffisante — documents médicaux réservés HSE/SST/Direction/Admin' }, { status: 403 })

  const admin = createAdminClient()
  const { data: doc } = await admin.from('documents_conducteur')
    .select('url').eq('id', docId).eq('conducteur_id', id).single()
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.url, 3600)
  if (error) return NextResponse.json({ error: 'Impossible de générer le lien de téléchargement' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
