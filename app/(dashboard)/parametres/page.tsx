import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParametresClient from '@/components/admin/ParametresClient'

export default async function ParametresPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'admin') redirect('/dashboard')

  const { data: typesInfraction } = await supabase
    .from('types_infraction')
    .select('*')
    .order('gravite')
    .order('code')

  return <ParametresClient typesInfraction={typesInfraction ?? []} />
}
