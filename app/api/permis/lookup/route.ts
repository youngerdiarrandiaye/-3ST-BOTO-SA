import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const numero = searchParams.get('numero')?.trim()

  if (!numero) {
    return NextResponse.json({ error: 'Paramètre numero requis' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: permis, error } = await supabase
    .from('permis_internes')
    .select(`
      id, numero, statut, date_expiration, categories,
      conducteurs (
        id, nom, prenom, matricule, statut, points_actuels,
        entreprises ( nom )
      )
    `)
    .eq('numero', numero)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur lors de la recherche du permis' }, { status: 500 })
  if (!permis) return NextResponse.json({ error: `Permis "${numero}" introuvable` }, { status: 404 })

  return NextResponse.json({ permis })
}
