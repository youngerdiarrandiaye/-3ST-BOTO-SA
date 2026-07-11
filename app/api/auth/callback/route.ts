import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ROUTES_AUTORISEES = [
  '/dashboard', '/conducteurs', '/infractions', '/permis',
  '/formations', '/sanctions', '/rapports', '/entreprises',
  '/utilisateurs', '/scan', '/profil',
]

function validerRedirectUrl(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('://') &&
    !raw.includes('\\') &&
    ROUTES_AUTORISEES.some(r => raw === r || raw.startsWith(r + '/'))
  ) return raw
  return '/dashboard'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = validerRedirectUrl(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Échec de l'échange — rediriger vers login avec message
  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
