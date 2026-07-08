import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PermisTableClient from '@/components/permis/PermisTableClient'
import Pagination from '@/components/ui/Pagination'

function isExpiringSoon(dateExp: string) {
  const days = (new Date(dateExp).getTime() - Date.now()) / 86400000
  return days > 0 && days <= 30
}

interface SearchParams { q?: string; statut?: string; page?: string }
interface PageProps { searchParams: Promise<SearchParams> }

export default async function PermisPage({ searchParams }: PageProps) {
  const { q, statut, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const today   = new Date().toISOString().slice(0, 10)

  // Auto-expiration : marque les permis valides dont la date est dépassée
  try {
    const admin = createAdminClient()
    await admin
      .from('permis_internes')
      .update({ statut: 'expire', updated_at: new Date().toISOString() })
      .eq('statut', 'valide')
      .lt('date_expiration', today)
  } catch { /* non bloquant */ }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = user
    ? await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
    : { data: null }
  const canGerer = ['admin', 'hse', 'sst'].includes((me as any)?.role ?? '')

  let query = supabase
    .from('permis_internes')
    .select('*, conducteurs(id, nom, prenom, matricule, entreprises(nom))')
    .order('created_at', { ascending: false })
    .limit(500)

  if (statut) query = query.eq('statut', statut)

  const { data: permis } = await query

  const rows = (permis ?? []).filter(p => {
    if (!q) return true
    const term = q.toLowerCase()
    const c = p.conducteurs as any
    return (
      p.numero.toLowerCase().includes(term) ||
      c?.nom?.toLowerCase().includes(term) ||
      c?.prenom?.toLowerCase().includes(term) ||
      c?.matricule?.toLowerCase().includes(term)
    )
  })

  const totalPages = Math.ceil(rows.length / 10)
  const pageRows   = rows.slice((pageNum - 1) * 10, pageNum * 10)

  const total     = rows.length
  const valides   = rows.filter(p => p.statut === 'valide' && p.date_expiration >= today).length
  const expires   = rows.filter(p => p.statut === 'expire' || (p.statut === 'valide' && p.date_expiration < today)).length
  const expirant  = rows.filter(p => p.statut === 'valide' && isExpiringSoon(p.date_expiration)).length

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Permis internes</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} permis</p>
        </div>
        {canGerer && (
          <Link
            href="/permis/nouveau"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
              shadow-md hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:bg-[#FBBF24] hover:scale-[1.04]
              active:scale-[0.97] transition-all duration-150"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            <Plus size={15} />
            Délivrer un permis
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',          val: total,    color: 'text-[#F0F6FC]', bg: 'bg-[#161B22]' },
          { label: 'Valides',        val: valides,  color: 'text-green-400', bg: 'bg-green-500/5' },
          { label: 'Expirés',        val: expires,  color: 'text-red-400',   bg: 'bg-red-500/5' },
          { label: 'Expirant < 30j', val: expirant, color: 'text-yellow-400',bg: 'bg-yellow-500/5' },
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
          placeholder="Numéro de permis, conducteur…"
          className="flex-1 px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
            placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
        />
        <select
          name="statut"
          defaultValue={statut ?? ''}
          className="px-3 py-2.5 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]"
        >
          <option value="">Tous statuts</option>
          <option value="valide">Valide</option>
          <option value="suspendu">Suspendu</option>
          <option value="retire">Retiré</option>
          <option value="expire">Expiré</option>
        </select>
        <button type="submit" className="px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90">
          Filtrer
        </button>
        {(q || statut) && (
          <Link href="/permis" className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] text-center">
            Effacer
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <PermisTableClient rows={pageRows as any} canGerer={canGerer} />
        <Pagination
          page={pageNum}
          totalPages={totalPages}
          total={total}
          basePath="/permis"
          searchParams={{ q, statut }}
        />
      </div>

    </div>
  )
}
