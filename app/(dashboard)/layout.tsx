import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import RealtimeWatcher from '@/components/ui/RealtimeWatcher'
import type { RoleUtilisateur } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dans7j = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: utilisateur },
    { count: infractionsEnAttente },
    { count: permisExpirant7j },
  ] = await Promise.all([
    supabase.from('utilisateurs').select('nom, prenom, role').eq('id', user.id).single(),
    supabase.from('infractions').select('*', { count: 'exact', head: true }).eq('statut', 'declaree'),
    supabase.from('permis_internes').select('*', { count: 'exact', head: true })
      .eq('statut', 'valide').lte('date_expiration', dans7j),
  ])

  const alertes = {
    infractions: infractionsEnAttente ?? 0,
    permis:      permisExpirant7j    ?? 0,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117]">
      <RealtimeWatcher />
      <Sidebar
        userNom={utilisateur?.nom}
        userPrenom={utilisateur?.prenom}
        userRole={utilisateur?.role as RoleUtilisateur}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar alertes={alertes} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
