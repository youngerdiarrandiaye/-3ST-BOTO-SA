import { createClient } from '@/lib/supabase/server'
import NouveauConducteurForm from '@/components/conducteurs/NouveauConducteurForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NouveauConducteurPage() {
  const supabase = await createClient()
  const { data: entreprises } = await supabase
    .from('entreprises')
    .select('id, nom')
    .eq('actif', true)
    .order('nom')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/conducteurs"
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux conducteurs
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Nouveau conducteur</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Enregistrement d&apos;un nouveau conducteur sur le site</p>
      </div>

      <NouveauConducteurForm entreprises={entreprises ?? []} />
    </div>
  )
}
