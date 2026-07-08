import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import BadgeStatut from '@/components/conducteurs/BadgeStatut'
import JaugePoints from '@/components/conducteurs/JaugePoints'
import Pagination from '@/components/ui/Pagination'
import type { Conducteur } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>
}

async function getConducteurs(q?: string, statut?: string): Promise<Conducteur[]> {
  const supabase = await createClient()

  let query = supabase
    .from('conducteurs')
    .select('*, entreprises(nom)')
    .order('nom', { ascending: true })

  if (q) {
    query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%`)
  }
  if (statut && statut !== 'tous') {
    query = query.eq('statut', statut)
  }

  const { data } = await query.limit(500)
  return (data ?? []) as Conducteur[]
}

export default async function ConducteursPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = params.q ?? ''
  const statut = params.statut ?? 'tous'
  const pageNum = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user!.id).single()
  const canCreate = ['admin', 'hse', 'sst'].includes(me?.role ?? '')

  const conducteurs = await getConducteurs(q, statut)

  const totalPages = Math.ceil(conducteurs.length / 10)
  const pageRows   = conducteurs.slice((pageNum - 1) * 10, pageNum * 10)

  const FILTRES = [
    { value: 'tous',     label: 'Tous',       count: null },
    { value: 'actif',    label: 'Actifs',      count: null },
    { value: 'suspendu', label: 'Suspendus',   count: null },
    { value: 'retire',   label: 'Retirés',     count: null },
    { value: 'inactif',  label: 'Inactifs',    count: null },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Conducteurs</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">
            {conducteurs.length} conducteur{conducteurs.length > 1 ? 's' : ''} trouvé{conducteurs.length > 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/conducteurs/nouveau"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:bg-[#FBBF24] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            <Plus size={16} />
            Nouveau conducteur
          </Link>
        )}
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form className="flex-1" method="GET">
          {statut !== 'tous' && <input type="hidden" name="statut" value={statut} />}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Rechercher par nom, prénom ou matricule…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
                placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors"
            />
          </div>
        </form>

        {/* Filtres statut */}
        <div className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] rounded-lg p-1">
          {FILTRES.map(f => (
            <Link
              key={f.value}
              href={`/conducteurs?${q ? `q=${encodeURIComponent(q)}&` : ''}statut=${f.value}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                ${statut === f.value
                  ? 'bg-[#F59E0B] text-[#0D1117]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
                }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        {conducteurs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#8B949E] text-sm">Aucun conducteur trouvé</p>
            {q && <p className="text-[#8B949E] text-xs mt-1">Essayez avec un autre terme de recherche</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D]">
                  {['Conducteur', 'Matricule', 'Entreprise', 'Points', 'Statut', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[#8B949E] uppercase tracking-wider first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#30363D]/50 hover:bg-[#21262D] transition-colors duration-100"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Conducteur */}
                    <td className="py-3 px-4 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#8B949E]">
                            {c.prenom[0]}{c.nom[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#F0F6FC]">{c.prenom} {c.nom}</p>
                        </div>
                      </div>
                    </td>

                    {/* Matricule */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-[#21262D] px-2 py-1 rounded text-[#8B949E]">
                        {c.matricule}
                      </span>
                    </td>

                    {/* Entreprise */}
                    <td className="py-3 px-4 text-[#8B949E] text-sm">
                      {c.entreprises?.nom ?? '—'}
                    </td>

                    {/* Points */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <JaugePoints points={c.points_actuels} compact />
                        <span className={`font-mono font-bold text-sm ${
                          c.points_actuels > 10 ? 'text-[#10B981]' :
                          c.points_actuels > 5  ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}>
                          {c.points_actuels}/20
                        </span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-4">
                      <BadgeStatut statut={c.statut} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 pr-5 text-right">
                      <Link
                        href={`/conducteurs/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                          text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                          hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]
                          hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
                          active:scale-[0.97] transition-all duration-150"
                      >
                        Voir fiche →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          total={conducteurs.length}
          basePath="/conducteurs"
          searchParams={params as Record<string, string | undefined>}
        />
      </div>

    </div>
  )
}
