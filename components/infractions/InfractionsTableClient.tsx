'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import InfractionActionBtn from './InfractionActionBtn'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import type { GraviteInfraction, StatutInfraction } from '@/lib/types'

const STATUT_BADGE: Record<string, string> = {
  declaree:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  traitee:   'bg-green-500/10  text-green-400  border-green-500/20',
  contestee: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  annulee:   'bg-gray-500/10   text-gray-400   border-gray-500/20',
}

const STATUT_LABEL: Record<string, string> = {
  declaree:  'En attente',
  traitee:   'Traitée',
  contestee: 'Contestée',
  annulee:   'Annulée',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Row {
  id: string
  conducteur_id: string
  date_heure: string
  localisation: string | null
  statut: StatutInfraction
  conducteurs: any
  types_infraction: any
  utilisateurs: any
}

interface Props {
  rows: Row[]
  canTraiter: boolean
  role?: string
}

export default function InfractionsTableClient({ rows, canTraiter, role = 'agent' }: Props) {
  useRealtimeRefresh(['infractions', 'sanctions'])
  const router = useRouter()

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle size={36} className="text-[#30363D] mb-3" />
        <p className="text-[#8B949E] text-sm">Aucune infraction trouvée</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteur</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Infraction</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Date</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden lg:table-cell">Lieu</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
            <th className="w-8 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30363D]">
          {rows.map(inf => {
            const c    = inf.conducteurs
            const t    = inf.types_infraction
            const u    = inf.utilisateurs
            const grav = (t?.gravite ?? 'mineure') as GraviteInfraction
            const stat = inf.statut
            const pts  = t?.points_retires ?? 0

            return (
              <tr
                key={inf.id}
                onClick={() => router.push(`/infractions/${inf.id}`)}
                className="hover:bg-[#21262D] transition-colors group cursor-pointer"
              >
                {/* Conducteur */}
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
                    {c?.prenom} {c?.nom}
                  </p>
                  <p className="text-xs text-[#8B949E] font-mono mt-0.5">{c?.matricule}</p>
                </td>

                {/* Infraction : type + gravité + points */}
                <td className="px-5 py-3.5">
                  <p className="text-[#F0F6FC] font-medium">{t?.libelle ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <GraviteBadge gravite={grav} />
                    {pts > 0 && (
                      <span className="text-xs font-mono font-bold text-red-400">−{pts} pts</span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <p className="text-[#8B949E] text-xs">{fmt(inf.date_heure)}</p>
                  {u && (
                    <p className="flex items-center gap-1.5 text-xs text-[#8B949E]/50 mt-0.5">
                      par {u.prenom} {u.nom}
                      {u.service && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${
                          u.service === '3st'
                            ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {u.service === '3st' ? '3ST' : 'SST/HSE'}
                        </span>
                      )}
                    </p>
                  )}
                </td>

                {/* Lieu */}
                <td className="px-5 py-3.5 hidden lg:table-cell text-[#8B949E] text-xs max-w-[150px]">
                  <span className="truncate block">{inf.localisation ?? '—'}</span>
                </td>

                {/* Statut + actions */}
                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                  <div className="space-y-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUT_BADGE[stat] ?? ''}`}>
                      {STATUT_LABEL[stat] ?? stat}
                    </span>
                    {canTraiter && (
                      <InfractionActionBtn
                        infractionId={inf.id}
                        statut={inf.statut}
                        conducteurId={inf.conducteur_id}
                        role={role}
                        compact
                      />
                    )}
                  </div>
                </td>

                {/* Chevron navigation */}
                <td className="pr-4 text-[#30363D] group-hover:text-[#8B949E] transition-colors">
                  <ChevronRight size={15} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
