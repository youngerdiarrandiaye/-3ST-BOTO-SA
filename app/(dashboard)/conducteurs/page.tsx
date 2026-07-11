import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, Users, Clock, ShieldAlert, CheckCircle2, UserX, ChevronRight } from 'lucide-react'
import BadgeStatut from '@/components/conducteurs/BadgeStatut'
import BadgeTemporaire from '@/components/conducteurs/BadgeTemporaire'
import JaugePoints from '@/components/conducteurs/JaugePoints'
import Pagination from '@/components/ui/Pagination'
import type { Conducteur, RoleUtilisateur } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ConducteursPage({ searchParams }: PageProps) {
  const params   = await searchParams
  const q        = params.q ?? ''
  const statut   = params.statut ?? 'tous'
  const pageNum  = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user!.id).single()
  const role      = (me?.role ?? 'agent') as RoleUtilisateur
  const canCreate = ['admin', 'hse', 'sst'].includes(role)

  // Fetch tous les conducteurs (filtre statut serveur-side)
  let query = supabase
    .from('conducteurs')
    .select('*, entreprises(nom)')
    .order('nom', { ascending: true })

  if (q) query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%`)
  if (statut && statut !== 'tous') query = query.eq('statut', statut)

  const { data: rawData } = await query.limit(500)
  const conducteurs = (rawData ?? []) as (Conducteur & { entreprises?: { nom: string } })[]

  // Stats globales (sur TOUS les conducteurs, sans filtre)
  const { data: allRaw } = await supabase
    .from('conducteurs')
    .select('statut, niveau_validation_courant, est_temporaire, date_fin_autorisation')
    .limit(2000)

  const now = new Date()
  const all = allRaw ?? []
  const total      = all.length
  const nbActif    = all.filter(c => c.statut === 'actif').length
  // Validation non effective = en_attente (nouveau workflow) + inactif (ancien workflow non migré)
  const nbNonValide = all.filter(c => c.statut === 'en_attente' || c.statut === 'inactif').length
  const nbAttente  = all.filter(c => c.statut === 'en_attente').length
  const nbInactif  = all.filter(c => c.statut === 'inactif').length
  const nbSuspendu = all.filter(c => c.statut === 'suspendu').length
  const nbRefuse   = all.filter(c => c.statut === 'refuse').length
  const nbRetire   = all.filter(c => c.statut === 'retire').length
  const nbTemporairesExpires = all.filter(c =>
    c.est_temporaire &&
    c.date_fin_autorisation &&
    new Date(c.date_fin_autorisation) < now
  ).length

  // Pipeline validation — combien en attente à chaque niveau (en_attente seulement, workflow actif)
  const pipelineN1 = all.filter(c => c.statut === 'en_attente' && c.niveau_validation_courant === 1).length
  const pipelineN2 = all.filter(c => c.statut === 'en_attente' && c.niveau_validation_courant === 2).length
  const pipelineN3 = all.filter(c => c.statut === 'en_attente' && c.niveau_validation_courant === 3).length

  // Pagination
  const totalPages = Math.ceil(conducteurs.length / 10)
  const pageRows   = conducteurs.slice((pageNum - 1) * 10, pageNum * 10)

  const FILTRES = [
    { value: 'tous',       label: 'Tous',           count: total },
    { value: 'actif',      label: 'Actifs',          count: nbActif },
    { value: 'en_attente', label: 'En attente',      count: nbAttente },
    { value: 'inactif',    label: 'Inactifs',        count: nbInactif },
    { value: 'suspendu',   label: 'Suspendus',       count: nbSuspendu },
    { value: 'refuse',     label: 'Refusés',         count: nbRefuse },
    { value: 'retire',     label: 'Retirés',         count: nbRetire },
  ]

  // Pipeline visible seulement pour les rôles concernés
  const canSeeN1 = ['admin', 'direction'].includes(role)
  const canSeeN2 = ['admin', 'sst'].includes(role)
  const canSeeN3 = ['admin', 'sst', 'hse'].includes(role)
  const showPipeline = (canSeeN1 || canSeeN2 || canSeeN3) && nbAttente > 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Conducteurs</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} conducteur{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link
            href="/conducteurs/nouveau"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:bg-[#FBBF24] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
          >
            <Plus size={16} />
            Nouveau conducteur
          </Link>
        )}
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Actifs"
          value={nbActif}
          sub={total ? `${Math.round((nbActif / total) * 100)}% du total` : '—'}
          color="green"
          href="/conducteurs?statut=actif"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Non validés"
          value={nbNonValide}
          sub="Validation non effectuée"
          color="amber"
          href="/conducteurs?statut=en_attente"
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          label="Suspendus"
          value={nbSuspendu}
          sub="Conduite interdite"
          color="red"
          href="/conducteurs?statut=suspendu"
        />
        <StatCard
          icon={<UserX size={18} />}
          label="Refusés"
          value={nbRefuse}
          sub="Dossier rejeté"
          color="red"
          href="/conducteurs?statut=refuse"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Temp. expirés"
          value={nbTemporairesExpires}
          sub="Renouvellement requis"
          color={nbTemporairesExpires > 0 ? 'red' : 'gray'}
          href="/conducteurs?statut=inactif"
        />
      </div>

      {/* ── Pipeline validation ────────────────────────────────────────────── */}
      {showPipeline && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-[#8B949E]" />
            <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">
              Pipeline de validation — dossiers en attente
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {canSeeN1 && (
              <PipelineCard
                level={1}
                label="Resp. Département"
                roles="Admin · Direction"
                count={pipelineN1}
                href="/conducteurs?statut=en_attente"
              />
            )}
            {canSeeN2 && (
              <PipelineCard
                level={2}
                label="Resp. SST"
                roles="Admin · SST"
                count={pipelineN2}
                href="/conducteurs?statut=en_attente"
              />
            )}
            {canSeeN3 && (
              <PipelineCard
                level={3}
                label="Clinique / Médecin"
                roles="Admin · SST · HSE"
                count={pipelineN3}
                href="/conducteurs?statut=en_attente"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Recherche + filtres ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1" method="GET">
          {statut !== 'tous' && <input type="hidden" name="statut" value={statut} />}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nom, prénom ou matricule…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
                placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] rounded-lg p-1 flex-wrap">
          {FILTRES.map(f => (
            <Link
              key={f.value}
              href={`/conducteurs?${q ? `q=${encodeURIComponent(q)}&` : ''}statut=${f.value}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                ${statut === f.value
                  ? 'bg-[#F59E0B] text-[#0D1117]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
                }`}
            >
              {f.label}
              {f.count !== null && f.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  statut === f.value ? 'bg-[#0D1117]/20 text-[#0D1117]' : 'bg-[#21262D] text-[#6B7280]'
                }`}>
                  {f.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        {conducteurs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-[#8B949E] text-sm">Aucun conducteur trouvé</p>
            {q && <p className="text-[#8B949E] text-xs">Essayez avec un autre terme de recherche</p>}
            {statut !== 'tous' && !q && (
              <Link href="/conducteurs" className="text-xs text-[#F59E0B] hover:underline">
                Voir tous les conducteurs
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D]">
                  {['Conducteur', 'Matricule', 'Entreprise', 'Validation', 'Points', 'Statut', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[#8B949E] uppercase tracking-wider first:pl-5 last:pr-5 last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c, i) => {
                  const niveau = (c as any).niveau_validation_courant as number ?? 1
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[#30363D]/50 hover:bg-[#21262D] transition-colors duration-100 group"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Conducteur */}
                      <td className="py-3 px-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            c.statut === 'actif'      ? 'bg-green-500/10  border-green-500/30'  :
                            c.statut === 'en_attente' ? 'bg-amber-500/10  border-amber-500/30'  :
                            c.statut === 'refuse'     ? 'bg-red-500/10    border-red-500/30'    :
                            c.statut === 'suspendu'   ? 'bg-red-500/10    border-red-500/30'    :
                            'bg-[#21262D] border-[#30363D]'
                          }`}>
                            <span className="text-xs font-bold text-[#8B949E]">
                              {c.prenom[0]}{c.nom[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
                              {c.prenom} {c.nom}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {c.est_temporaire && (
                                c.date_fin_autorisation
                                  ? <BadgeTemporaire dateFin={c.date_fin_autorisation} compact />
                                  : <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">Temp.</span>
                              )}
                            </div>
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
                        {(c as any).entreprises?.nom ?? '—'}
                      </td>

                      {/* Validation / Niveau */}
                      <td className="py-3 px-4">
                        <ValidationCell statut={c.statut} niveau={niveau} />
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <JaugePoints points={c.points_actuels} compact />
                          <span className={`font-mono font-bold text-sm tabular-nums ${
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

                      {/* Action */}
                      <td className="py-3 px-4 pr-5 text-right">
                        <Link
                          href={`/conducteurs/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                            text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                            hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]
                            hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
                            active:scale-[0.97] transition-all duration-150"
                        >
                          Fiche <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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

// ─── Composants utilitaires ───────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color, href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  color: 'green' | 'amber' | 'red' | 'gray'
  href?: string
}) {
  const colors = {
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', icon: 'text-green-400', val: 'text-green-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', val: 'text-amber-400' },
    red:   { bg: 'bg-red-500/10',   border: 'border-red-500/20',   icon: 'text-red-400',   val: 'text-red-400'   },
    gray:  { bg: 'bg-[#21262D]',    border: 'border-[#30363D]',    icon: 'text-[#8B949E]', val: 'text-[#F0F6FC]' },
  }
  const c = colors[color]
  const inner = (
    <div className={`p-4 rounded-xl border ${c.bg} ${c.border} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2 rounded-lg bg-white/5 ${c.icon} flex-shrink-0`}>{icon}</div>
        <span className={`text-2xl font-black tabular-nums ${c.val}`}>{value}</span>
      </div>
      <p className="mt-2.5 text-sm font-semibold text-[#F0F6FC]">{label}</p>
      <p className="text-xs text-[#8B949E] mt-0.5">{sub}</p>
    </div>
  )
  if (href && value > 0) return <Link href={href} className="block hover:scale-[1.02] transition-transform">{inner}</Link>
  return <div>{inner}</div>
}

function PipelineCard({
  level, label, roles, count, href,
}: {
  level: 1 | 2 | 3
  label: string
  roles: string
  count: number
  href: string
}) {
  const urgent = count > 0
  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-4 rounded-xl border transition-all
        ${urgent
          ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
          : 'bg-[#0D1117] border-[#30363D] opacity-50'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
          ${urgent ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#21262D] text-[#4B5563]'}`}>
          {level}
        </div>
        <div>
          <p className={`text-sm font-semibold ${urgent ? 'text-[#F0F6FC]' : 'text-[#4B5563]'}`}>{label}</p>
          <p className="text-xs text-[#4B5563]">{roles}</p>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className={`text-xl font-black tabular-nums ${urgent ? 'text-amber-400' : 'text-[#4B5563]'}`}>
          {count}
        </span>
        <p className="text-[10px] text-[#4B5563]">en attente</p>
      </div>
    </Link>
  )
}

function ValidationCell({ statut, niveau }: { statut: string; niveau: number }) {
  if (statut === 'actif') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 size={13} />
        Complet
      </span>
    )
  }
  if (statut === 'refuse') {
    return (
      <span className="text-xs text-red-400 font-medium">Refusé</span>
    )
  }
  if (statut === 'en_attente') {
    const pct = ((niveau - 1) / 3) * 100
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 bg-[#30363D] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-[#8B949E] font-mono tabular-nums">
            {niveau <= 1 ? '0' : niveau - 1}/3
          </span>
        </div>
        <p className="text-[10px] text-amber-400 font-medium">Niv.{Math.min(niveau, 3)}</p>
      </div>
    )
  }
  // suspendu, retire, inactif
  return <span className="text-xs text-[#4B5563]">—</span>
}
