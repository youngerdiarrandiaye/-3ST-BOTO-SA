import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import SanctionsTableClient from '@/components/sanctions/SanctionsTableClient'
import Pagination from '@/components/ui/Pagination'

interface SearchParams { q?: string; type?: string; page?: string }
interface PageProps { searchParams: Promise<SearchParams> }

export default async function SanctionsPage({ searchParams }: PageProps) {
  const { q, type, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [queryResult, meResult] = await Promise.all([
    supabase
      .from('sanctions')
      .select('*, conducteurs(id, nom, prenom, matricule)')
      .order('created_at', { ascending: false })
      .limit(500),
    user
      ? supabase.from('utilisateurs').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const { data: sanctions } = queryResult
  const role = meResult.data?.role ?? 'agent'
  const canLever = ['admin', 'hse', 'sst'].includes(role)
  const canCreate = ['admin', 'hse', 'sst'].includes(role)

  function isActive(s: { date_debut: string; date_fin: string | null; levee_le: string | null }) {
    if (s.levee_le) return false
    if (!s.date_fin) return true
    return new Date(s.date_fin) >= new Date()
  }

  const rows = (sanctions ?? []).filter(s => {
    if (type && s.type !== type) return false
    if (q) {
      const term = q.toLowerCase()
      const c = s.conducteurs as any
      if (
        !s.motif?.toLowerCase().includes(term) &&
        !c?.nom?.toLowerCase().includes(term) &&
        !c?.prenom?.toLowerCase().includes(term) &&
        !c?.matricule?.toLowerCase().includes(term)
      ) return false
    }
    return true
  })

  const totalPages = Math.ceil(rows.length / 10)
  const pageRows   = rows.slice((pageNum - 1) * 10, pageNum * 10)

  const total      = rows.length
  const actives    = rows.filter(s => isActive(s)).length
  const definitifs = rows.filter(s => s.type === 'retrait_definitif').length
  const levees     = rows.filter(s => !!s.levee_le).length

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Sanctions</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} sanction{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link
            href="/sanctions/nouvelle"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EF4444] text-white text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(239,68,68,0.5)] hover:bg-[#F87171] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            <Plus size={15} />
            Appliquer une sanction
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      val: total,      color: 'text-[#F0F6FC]',  bg: 'bg-[#161B22]' },
          { label: 'En cours',   val: actives,    color: 'text-red-400',    bg: 'bg-red-500/5' },
          { label: 'Définitifs', val: definitifs, color: 'text-red-400',    bg: 'bg-red-500/5' },
          { label: 'Levées',     val: levees,     color: 'text-green-400',  bg: 'bg-green-500/5' },
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
          placeholder="Conducteur, motif…"
          className="flex-1 px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
            placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]"
        >
          <option value="">Tous types</option>
          <option value="suspension_temp">Suspension temporaire</option>
          <option value="retrait_definitif">Retrait définitif</option>
        </select>
        <button type="submit" className="px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90">
          Filtrer
        </button>
        {(q || type) && (
          <Link href="/sanctions" className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] text-center">
            Effacer
          </Link>
        )}
      </form>

      {/* Table interactive */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SanctionsTableClient rows={pageRows as any} canLever={canLever} />
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          total={total}
          basePath="/sanctions"
          searchParams={{ q, type }}
        />
      </div>

    </div>
  )
}
