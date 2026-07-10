import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChangePasswordForm from '@/components/profil/ChangePasswordForm'

export default async function MotDePassePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour au tableau de bord
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Changer mon mot de passe</h1>
        <p className="text-sm text-[#8B949E] mt-1">
          Vous serez déconnecté après le changement.
        </p>
      </div>

      <ChangePasswordForm email={user.email!} />
    </div>
  )
}
