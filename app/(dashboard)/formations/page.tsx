import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import FormationsTableClient from '@/components/formations/FormationsTableClient'

interface SearchParams { q?: string; statut?: string; page?: string }
interface PageProps { searchParams: Promise<SearchParams> }

export default async function FormationsPage({ searchParams }: PageProps) {
  const { q, statut, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const meResult = user
    ? await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
    : { data: null }
  const role = meResult.data?.role ?? 'agent'
  const canCreate = ['admin', 'hse', 'sst'].includes(role)

  let query = supabase
    .from('formations')
    .select('*, conducteurs(id, nom, prenom, matricule)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (statut) query = query.eq('statut', statut)

  const { data: formations } = await query

  const rows = (formations ?? []).filter(f => {
    if (!q) return true
    const term = q.toLowerCase()
    const c = f.conducteurs as any
    return (
      f.organisme?.toLowerCase().includes(term) ||
      c?.nom?.toLowerCase().includes(term) ||
      c?.prenom?.toLowerCase().includes(term) ||
      c?.matricule?.toLowerCase().includes(term)
    )
  })

  const totalPages = Math.ceil(rows.length / 10)
  const pageRows   = rows.slice((pageNum - 1) * 10, pageNum * 10)

  const total    = rows.length
  const enCours  = rows.filter(f => f.statut === 'en_cours').length
  const validees = rows.filter(f => f.statut === 'validee').length
  const ptsTotaux = rows.filter(f => f.statut === 'validee').reduce((sum, f) => sum + (f.points_recuperes ?? 0), 0)

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Formations</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} formation{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link
            href="/formations/nouvelle"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:bg-[#FBBF24] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            <Plus size={15} />
            Ajouter une formation
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',       val: total,     color: 'text-[#F0F6FC]', bg: 'bg-[#161B22]' },
          { label: 'En cours',    val: enCours,   color: 'text-blue-400',  bg: 'bg-blue-500/5' },
          { label: 'Validées',    val: validees,  color: 'text-green-400', bg: 'bg-green-500/5' },
          { label: 'Points récupérés', val: ptsTotaux, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/5' },
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
          placeholder="Organisme, conducteur…"
          className="flex-1 px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
            placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
        />
        <select
          name="statut"
          defaultValue={statut ?? ''}
          className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]"
        >
          <option value="">Tous statuts</option>
          <option value="en_cours">En cours</option>
          <option value="validee">Validée</option>
          <option value="annulee">Annulée</option>
        </select>
        <button type="submit" className="px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90">
          Filtrer
        </button>
        {(q || statut) && (
          <Link href="/formations" className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] text-center">
            Effacer
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <FormationsTableClient rows={pageRows as any} />
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          total={total}
          basePath="/formations"
          searchParams={{ q, statut }}
        />
      </div>

    </div>
  )
}
