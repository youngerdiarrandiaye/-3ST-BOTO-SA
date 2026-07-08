import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import UtilisateurDetailClient from '@/components/admin/UtilisateurDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UtilisateurDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = me?.role === 'admin'
  const isSelf  = id === user.id

  // Seul l'admin peut consulter les profils des autres
  if (!isAdmin && !isSelf) redirect('/dashboard')

  const { data: target } = await supabase
    .from('utilisateurs')
    .select('id, email, nom, prenom, role, telephone, actif, service, created_at')
    .eq('id', id)
    .single()

  if (!target) redirect('/utilisateurs')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={isAdmin ? '/utilisateurs' : '/dashboard'}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        {isAdmin ? 'Utilisateurs' : 'Tableau de bord'}
      </Link>

      <UtilisateurDetailClient
        user={target}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
