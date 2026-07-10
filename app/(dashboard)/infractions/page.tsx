import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import InfractionsTableClient from '@/components/infractions/InfractionsTableClient'
import Pagination from '@/components/ui/Pagination'

interface SearchParams { q?: string; statut?: string; gravite?: string; page?: string }
interface PageProps { searchParams: Promise<SearchParams> }

export default async function InfractionsPage({ searchParams }: PageProps) {
  const { q, statut, gravite, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const meResult = user
    ? await admin.from('utilisateurs').select('role').eq('id', user.id).single()
    : { data: null }

  const role = meResult.data?.role ?? 'agent'
  const canTraiter = ['admin', 'hse', 'sst'].includes(role)
  const isAgent = role === 'agent'

  let query = admin
    .from('infractions')
    .select('*, conducteurs(nom, prenom, matricule), types_infraction(code, libelle, gravite, points_retires), utilisateurs(nom, prenom, service)')
    .order('date_heure', { ascending: false })
    .limit(500)

  // Un agent ne voit que ses propres déclarations
  if (isAgent && user) query = query.eq('agent_id', user.id)

  const { data: infractions } = await query

  // Filtres
  let rows = (infractions ?? []).filter(inf => {
    if (statut && inf.statut !== statut) return false
    if (q) {
      const term = q.toLowerCase()
      const c = inf.conducteurs as any
      const t = inf.types_infraction as any
      if (
        !c?.nom?.toLowerCase().includes(term) &&
        !c?.prenom?.toLowerCase().includes(term) &&
        !c?.matricule?.toLowerCase().includes(term) &&
        !t?.libelle?.toLowerCase().includes(term)
      ) return false
    }
    return true
  })

  if (gravite) {
    rows = rows.filter(inf => (inf.types_infraction as any)?.gravite === gravite)
  }

  const totalPages = Math.ceil(rows.length / 10)
  const pageRows   = rows.slice((pageNum - 1) * 10, pageNum * 10)

  const total    = rows.length
  const declarees = rows.filter(i => i.statut === 'declaree').length
  const traitees  = rows.filter(i => i.statut === 'traitee').length
  const critiques = rows.filter(i => (i.types_infraction as any)?.gravite === 'critique').length

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">
            {isAgent ? 'Mes déclarations' : 'Infractions'}
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">
            {isAgent
              ? `${total} infraction${total !== 1 ? 's' : ''} que vous avez déclarée${total !== 1 ? 's' : ''}`
              : `${total} déclaration${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        {(canTraiter || isAgent) && (
          <Link
            href="/infractions/nouvelle"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EF4444] text-white text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(239,68,68,0.5)] hover:bg-[#F87171] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            <AlertTriangle size={15} />
            Déclarer une infraction
          </Link>
        )}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      val: total,     color: 'text-[#F0F6FC]',   bg: 'bg-[#161B22]' },
          { label: 'En attente', val: declarees, color: 'text-blue-400',    bg: 'bg-blue-500/5' },
          { label: 'Traitées',   val: traitees,  color: 'text-green-400',   bg: 'bg-green-500/5' },
          { label: 'Critiques',  val: critiques, color: 'text-red-400',     bg: 'bg-red-500/5' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#30363D] rounded-xl p-4`}>
            <p className="text-xs text-[#8B949E]">{s.label}</p>
            <p className={`text-2xl font-black font-mono mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <form method="GET" className="flex flex-col sm:flex-row gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Conducteur, type d'infraction…"
          className="flex-1 px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
            placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
        />
        <select
          name="statut"
          defaultValue={statut ?? ''}
          className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]"
        >
          <option value="">Tous statuts</option>
          <option value="declaree">En attente</option>
          <option value="traitee">Traitée</option>
          <option value="contestee">Contestée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select
          name="gravite"
          defaultValue={gravite ?? ''}
          className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]"
        >
          <option value="">Toute gravité</option>
          <option value="mineure">Mineure</option>
          <option value="majeure">Majeure</option>
          <option value="critique">Critique</option>
          <option value="eliminatoire">Éliminatoire</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Filtrer
        </button>
        {(q || statut || gravite) && (
          <Link
            href="/infractions"
            className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] transition-colors text-center"
          >
            Effacer
          </Link>
        )}
      </form>

      {/* Table interactive */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <InfractionsTableClient rows={pageRows as any} canTraiter={canTraiter} role={role} />
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          total={total}
          basePath="/infractions"
          searchParams={{ q, statut, gravite }}
        />
      </div>

    </div>
  )
}
