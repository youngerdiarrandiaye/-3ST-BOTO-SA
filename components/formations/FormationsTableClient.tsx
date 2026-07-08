'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import type { StatutFormation } from '@/lib/types'

const STATUT_BADGE: Record<StatutFormation, string> = {
  en_cours: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  validee:  'bg-green-500/10 text-green-400 border-green-500/20',
  annulee:  'bg-gray-500/10 text-gray-400 border-gray-500/20',
}
const STATUT_LABEL: Record<StatutFormation, string> = {
  en_cours: 'En cours',
  validee:  'Validée',
  annulee:  'Annulée',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Row {
  id: string
  organisme: string
  date_debut: string
  date_fin: string | null
  statut: StatutFormation
  points_recuperes: number | null
  conducteurs: { id: string; nom: string; prenom: string; matricule: string } | null
}

interface Props { rows: Row[] }

export default function FormationsTableClient({ rows }: Props) {
  const router = useRouter()

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GraduationCap size={36} className="text-[#30363D] mb-3" />
        <p className="text-[#8B949E] text-sm">Aucune formation trouvée</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteur</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Organisme</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Période</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Points</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30363D]">
          {rows.map(f => {
            const c = f.conducteurs
            const stat = f.statut
            return (
              <tr
                key={f.id}
                onClick={() => router.push(`/formations/${f.id}`)}
                className="hover:bg-[#21262D] transition-colors group cursor-pointer"
              >
                {/* Conducteur — stopPropagation pour ne pas déclencher la navigation de ligne */}
                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                  <Link href={`/conducteurs/${c?.id}`} className="hover:text-[#F59E0B] transition-colors">
                    <p className="font-medium text-[#F0F6FC] group-hover:text-[#F59E0B]">{c?.prenom} {c?.nom}</p>
                    <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
                  </Link>
                </td>

                <td className="px-5 py-3.5">
                  <p className="font-medium text-[#F0F6FC]">{f.organisme}</p>
                </td>

                <td className="px-5 py-3.5 hidden md:table-cell text-xs text-[#8B949E]">
                  {fmt(f.date_debut)}
                  {f.date_fin ? ` → ${fmt(f.date_fin)}` : ' · En cours'}
                </td>

                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full border ${STATUT_BADGE[stat]}`}>
                    {STATUT_LABEL[stat]}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-right font-mono font-bold">
                  {stat === 'validee'
                    ? <span className="text-green-400">+{f.points_recuperes ?? 0}</span>
                    : <span className="text-[#8B949E]">—</span>
                  }
                </td>

                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                  <Link
                    href={`/formations/${f.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                      text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                      hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]
                      hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
                      active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
