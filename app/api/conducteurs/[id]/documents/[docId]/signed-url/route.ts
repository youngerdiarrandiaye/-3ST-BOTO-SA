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

  const admin = createAdminClient()
  const { data: doc } = await admin.from('documents_conducteur')
    .select('url').eq('id', docId).eq('conducteur_id', id).single()
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.url, 3600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
