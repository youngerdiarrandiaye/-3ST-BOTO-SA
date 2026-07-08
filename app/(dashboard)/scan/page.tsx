import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScanClient from '@/components/scan/ScanClient'

export const metadata = { title: 'Scanner un permis — MineAxis' }

export default async function ScanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'hse', 'sst', 'agent'].includes(me?.role ?? '')) {
    redirect('/dashboard')
  }

  return <ScanClient />
}
