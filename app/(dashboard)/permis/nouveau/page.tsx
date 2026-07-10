import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NouveauPermisForm from '@/components/permis/NouveauPermisForm'

interface PageProps {
  searchParams: Promise<{ conducteur?: string; renouvelle?: string }>
}

export default async function NouveauPermisPage({ searchParams }: PageProps) {
  const { conducteur: conducteurIdDefault, renouvelle } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: me } = await admin.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) redirect('/dashboard')

  const [{ data: conducteursActifs }, ancienPermisResult] = await Promise.all([
    admin
      .from('conducteurs')
      .select('id, matricule, nom, prenom, validation_sst, validation_clinique, zone_validite, type_zone, statut')
      // actif : renouvellement / en_attente éligible : premier permis (SST + clinique validées)
      .or('statut.eq.actif,and(statut.eq.en_attente,validation_sst.eq.true,validation_clinique.eq.true)')
      .order('nom'),
    renouvelle
      ? admin
          .from('permis_internes')
          .select('numero, categories, zone_validite, type_zone, validation_sst, validation_clinique, conducteur_id')
          .eq('id', renouvelle)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const ancienPermis = ancienPermisResult.data

  // Si le conducteur n'est pas actif (ex: suspendu), l'inclure quand même pour le renouvellement
  let conducteurs = conducteursActifs ?? []
  if (conducteurIdDefault && ancienPermis) {
    const inList = conducteurs.some(c => c.id === conducteurIdDefault)
    if (!inList) {
      const { data: target } = await admin
        .from('conducteurs')
        .select('id, matricule, nom, prenom, validation_sst, validation_clinique, zone_validite, type_zone, statut')
        .eq('id', conducteurIdDefault)
        .single()
      if (target) conducteurs = [target, ...conducteurs]
    }
  }

  const renewData = ancienPermis ? {
    numero:             ancienPermis.numero as string,
    categories:         (ancienPermis.categories as string[]) ?? [],
    zone_validite:      ancienPermis.zone_validite as string | null,
    type_zone:          ancienPermis.type_zone as string | null,
    validation_sst:     (ancienPermis.validation_sst as boolean) ?? false,
    validation_clinique:(ancienPermis.validation_clinique as boolean) ?? false,
  } : undefined

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={conducteurIdDefault ? `/conducteurs/${conducteurIdDefault}` : '/permis'}
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        {conducteurIdDefault ? 'Retour à la fiche conducteur' : 'Retour aux permis'}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">
          {renewData ? 'Renouveler un permis interne' : 'Délivrer un permis interne'}
        </h1>
        {renewData ? (
          <p className="text-sm text-blue-400 mt-0.5">
            Renouvellement du permis N° <span className="font-mono font-bold">{renewData.numero}</span> — données pré-remplies
          </p>
        ) : (
          <p className="text-sm text-[#8B949E] mt-0.5">Création d&apos;un nouveau permis d&apos;accès au site</p>
        )}
      </div>

      <NouveauPermisForm
        conducteurs={conducteurs}
        conducteurIdDefault={conducteurIdDefault}
        delivreurId={user.id}
        renewData={renewData}
      />
    </div>
  )
}
