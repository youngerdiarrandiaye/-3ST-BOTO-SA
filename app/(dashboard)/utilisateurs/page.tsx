import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UtilisateursClient from '@/components/admin/UtilisateursClient'

export default async function UtilisateursPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'admin') redirect('/dashboard')

  const { data: utilisateurs } = await supabase
    .from('utilisateurs')
    .select('id, email, nom, prenom, role, telephone, actif, created_at, service')
    .order('created_at', { ascending: false })

  return (
    <UtilisateursClient
      utilisateurs={(utilisateurs ?? []) as any}
      currentUserId={user.id}
    />
  )
}
