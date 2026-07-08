import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EntreprisesClient from '@/components/admin/EntreprisesClient'

export default async function EntreprisesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = currentUser?.role ?? ''
  const canAccess = ['admin', 'hse', 'sst', 'direction'].includes(role)
  if (!canAccess) redirect('/dashboard')

  const canCreate = ['admin', 'hse'].includes(role)

  const { data: entreprises } = await supabase
    .from('entreprises')
    .select('*, conducteurs(id)')
    .order('nom')

  return <EntreprisesClient entreprises={entreprises ?? []} canCreate={canCreate} />
}
