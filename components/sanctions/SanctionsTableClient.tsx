'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import LeverSanctionBtn from './LeverSanctionBtn'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isActive(s: { date_debut: string; date_fin: string | null; levee_le: string | null }) {
  if (s.levee_le) return false
  if (!s.date_fin) return true
  return new Date(s.date_fin) >= new Date()
}

interface Row {
  id: string
  type: string
  date_debut: string
  date_fin: string | null
  motif: string
  levee_le: string | null
  conducteurs: any
}

interface Props {
  rows: Row[]
  canLever: boolean
}

export default function SanctionsTableClient({ rows, canLever }: Props) {
  useRealtimeRefresh(['sanctions', 'conducteurs'])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldOff size={36} className="text-[#30363D] mb-3" />
        <p className="text-[#8B949E] text-sm">Aucune sanction trouvée</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteur</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Type</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Motif</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden lg:table-cell">Période</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30363D]">
          {rows.map(s => {
            const c = s.conducteurs
            const active = isActive(s)
            return (
              <tr key={s.id} className="hover:bg-[#21262D] transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/conducteurs/${c?.id}`} className="hover:text-[#F59E0B] transition-colors">
                    <p className="font-medium text-[#F0F6FC]">{c?.prenom} {c?.nom}</p>
                    <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                    s.type === 'retrait_definitif'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  }`}>
                    {s.type === 'retrait_definitif' ? 'Retrait définitif' : 'Suspension temp.'}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell text-[#8B949E] text-xs max-w-[200px]">
                  <p className="truncate">{s.motif}</p>
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-[#8B949E]">
                  {fmt(s.date_debut)}
                  {s.date_fin ? ` → ${fmt(s.date_fin)}` : ' · Indéterminé'}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.levee_le ? (
                      <span className="text-xs px-2 py-1 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                        Levée
                      </span>
                    ) : active ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-xs text-red-400">Active</span>
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20">
                        Expirée
                      </span>
                    )}
                    {canLever && (
                      <LeverSanctionBtn
                        sanctionId={s.id}
                        conducteurId={c?.id ?? ''}
                        type={s.type}
                        levee_le={s.levee_le}
                      />
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
