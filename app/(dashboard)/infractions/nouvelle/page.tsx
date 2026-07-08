import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NouvelleInfractionForm from '@/components/infractions/NouvelleInfractionForm'

interface PageProps {
  searchParams: Promise<{ conducteur?: string }>
}

export default async function NouvelleInfractionPage({ searchParams }: PageProps) {
  const { conducteur: conducteurIdDefault } = await searchParams
  const supabase = await createClient()

  // Récupérer l'utilisateur connecté pour l'agent_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst', 'agent'].includes(me?.role ?? '')) redirect('/dashboard')

  const [{ data: conducteurs }, { data: typesInfraction }] = await Promise.all([
    supabase
      .from('conducteurs')
      .select('id, matricule, nom, prenom')
      .eq('statut', 'actif')
      .order('nom'),
    supabase
      .from('types_infraction')
      .select('id, code, libelle, gravite, points_retires, zone_applicable')
      .eq('actif', true)
      .order('gravite')
      .order('code'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={conducteurIdDefault ? `/conducteurs/${conducteurIdDefault}` : '/infractions'}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        {conducteurIdDefault ? 'Retour à la fiche conducteur' : 'Retour aux infractions'}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Déclarer une infraction</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Enregistrement d&apos;une nouvelle infraction sur le site</p>
      </div>

      <NouvelleInfractionForm
        conducteurs={conducteurs ?? []}
        typesInfraction={typesInfraction ?? []}
        conducteurIdDefault={conducteurIdDefault}
      />
    </div>
  )
}
