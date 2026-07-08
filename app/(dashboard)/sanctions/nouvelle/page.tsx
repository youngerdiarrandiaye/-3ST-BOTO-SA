import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NouvelleSanctionForm from '@/components/sanctions/NouvelleSanctionForm'

interface PageProps {
  searchParams: Promise<{ conducteur?: string; infraction?: string }>
}

export default async function NouvelleSanctionPage({ searchParams }: PageProps) {
  const { conducteur: conducteurIdDefault, infraction: infractionId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) redirect('/dashboard')

  const [{ data: conducteurs }, infractionResult] = await Promise.all([
    supabase.from('conducteurs').select('id, matricule, nom, prenom').order('nom'),
    infractionId
      ? supabase
          .from('infractions')
          .select('id, date_heure, localisation, types_infraction(code, libelle, gravite, points_retires)')
          .eq('id', infractionId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const infractionContext = infractionResult.data as any ?? null

  const backHref = conducteurIdDefault
    ? `/conducteurs/${conducteurIdDefault}`
    : infractionId
      ? `/infractions/${infractionId}`
      : '/sanctions'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Appliquer une sanction</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Suspension temporaire ou retrait définitif du permis interne</p>
      </div>

      <NouvelleSanctionForm
        conducteurs={conducteurs ?? []}
        conducteurIdDefault={conducteurIdDefault}
        infractionId={infractionId}
        infractionContext={infractionContext}
      />
    </div>
  )
}
