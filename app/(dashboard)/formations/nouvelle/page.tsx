import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NouvelleFormationForm from '@/components/formations/NouvelleFormationForm'

interface PageProps {
  searchParams: Promise<{ conducteur?: string }>
}

export default async function NouvelleFormationPage({ searchParams }: PageProps) {
  const { conducteur: conducteurIdDefault } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) redirect('/dashboard')

  const { data: conducteurs } = await supabase
    .from('conducteurs')
    .select('id, matricule, nom, prenom')
    .order('nom')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={conducteurIdDefault ? `/conducteurs/${conducteurIdDefault}` : '/formations'}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Ajouter une formation</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Enregistrement d&apos;une formation ou recyclage</p>
      </div>

      <NouvelleFormationForm
        conducteurs={conducteurs ?? []}
        conducteurIdDefault={conducteurIdDefault}
      />
    </div>
  )
}
