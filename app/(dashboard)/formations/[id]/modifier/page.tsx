import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NouvelleFormationForm from '@/components/formations/NouvelleFormationForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function ModifierFormationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) redirect('/formations')

  const [{ data: formation }, { data: conducteurs }] = await Promise.all([
    supabase
      .from('formations')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('conducteurs')
      .select('id, matricule, nom, prenom')
      .order('nom'),
  ])

  if (!formation) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/formations/${id}`}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour à la formation
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Modifier la formation</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">{formation.organisme}</p>
      </div>

      <NouvelleFormationForm
        conducteurs={conducteurs ?? []}
        formation={formation as any}
      />
    </div>
  )
}
