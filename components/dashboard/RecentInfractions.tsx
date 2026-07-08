'use client'
import type { Infraction } from '@/lib/types'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import { STATUT_INF_LABEL } from '@/lib/labels'

const STATUT_BADGE: Record<string, string> = {
  declaree:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  traitee:   'bg-green-500/10 text-green-400 border-green-500/20',
  contestee: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  annulee:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

interface RecentInfractionsProps {
  infractions: Infraction[]
}

export default function RecentInfractions({ infractions }: RecentInfractionsProps) {
  useRealtimeRefresh(['infractions'])

  if (!infractions.length) {
    return (
      <div className="py-10 text-center text-[#8B949E] text-sm">
        Aucune infraction enregistrée
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363D]">
            {['Conducteur', 'Infraction', 'Gravité', 'Points', 'Date', 'Statut'].map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[#8B949E] uppercase tracking-wider first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {infractions.map((inf, i) => (
            <tr
              key={inf.id}
              className="border-b border-[#30363D]/50 hover:bg-[#21262D] transition-colors duration-100 group"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <td className="py-3 px-4 first:pl-0">
                <p className="font-medium text-[#F0F6FC]">
                  {inf.conducteurs?.prenom} {inf.conducteurs?.nom}
                </p>
                <p className="text-xs text-[#8B949E] font-mono">{inf.conducteurs?.matricule}</p>
              </td>
              <td className="py-3 px-4">
                <p className="text-[#F0F6FC]">{inf.types_infraction?.libelle}</p>
                <p className="text-xs text-[#8B949E] font-mono">{inf.types_infraction?.code}</p>
              </td>
              <td className="py-3 px-4">
                <GraviteBadge gravite={inf.types_infraction?.gravite} />
              </td>
              <td className="py-3 px-4">
                <span className="font-mono font-bold text-red-400">
                  -{inf.types_infraction?.points_retires ?? 0}
                </span>
              </td>
              <td className="py-3 px-4 text-[#8B949E] whitespace-nowrap">
                {formatDate(inf.date_heure)}
              </td>
              <td className="py-3 px-4 last:pr-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUT_BADGE[inf.statut]}`}>
                  {STATUT_INF_LABEL[inf.statut] ?? inf.statut}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
