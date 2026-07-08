'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, CreditCard, CheckCircle2, XCircle, QrCode, Printer, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import BadgeStatut from '@/components/conducteurs/BadgeStatut'
import QrCodeDisplay from '@/components/conducteurs/QrCodeDisplay'
import PermisActionBtn from '@/components/permis/PermisActionBtn'
import type { StatutPermis } from '@/lib/types'

export interface PermisRow {
  id: string
  numero: string
  statut: string
  date_delivrance: string
  date_expiration: string
  categories: string[]
  zone_validite: string | null
  type_permis_site: string | null
  validation_sst: boolean
  validation_clinique: boolean
  conducteurs: {
    id: string
    nom: string
    prenom: string
    matricule: string
    entreprises: { nom: string } | null
  } | null
}

type SortField = 'numero' | 'conducteur_nom' | 'date_expiration' | 'date_delivrance' | 'statut'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpiringSoon(dateExp: string) {
  const days = (new Date(dateExp).getTime() - Date.now()) / 86400000
  return days > 0 && days <= 30
}

function getEffectiveStatut(p: PermisRow): string {
  if (p.statut === 'valide' && new Date(p.date_expiration) < new Date()) return 'expire'
  return p.statut
}

const ZONE_LABEL: Record<string, string> = {
  miniere:        'Zone minière',
  administrative: 'Zone administrative',
  les_deux:       'Toutes les zones',
}

interface Props {
  rows: PermisRow[]
  canGerer: boolean
}

export default function PermisTableClient({ rows, canGerer }: Props) {
  const [selected, setSelected]   = useState<PermisRow | null>(null)
  const [sortField, setSortField] = useState<SortField>('date_expiration')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortedRows = [...rows].sort((a, b) => {
    let va: string, vb: string
    switch (sortField) {
      case 'conducteur_nom':
        va = `${a.conducteurs?.nom ?? ''} ${a.conducteurs?.prenom ?? ''}`
        vb = `${b.conducteurs?.nom ?? ''} ${b.conducteurs?.prenom ?? ''}`
        break
      case 'statut':
        va = getEffectiveStatut(a)
        vb = getEffectiveStatut(b)
        break
      default:
        va = (a as any)[sortField] ?? ''
        vb = (b as any)[sortField] ?? ''
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CreditCard size={36} className="text-[#30363D] mb-3" />
        <p className="text-[#8B949E] text-sm">Aucun permis trouvé</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363D] bg-[#0D1117]">
              <SortHeader field="numero" label="N° Permis" active={sortField} dir={sortDir} onSort={toggleSort} />
              <SortHeader field="conducteur_nom" label="Conducteur" active={sortField} dir={sortDir} onSort={toggleSort} />
              <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Catégories</th>
              <SortHeader field="date_delivrance" label="Délivré le" active={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortHeader field="date_expiration" label="Expire le" active={sortField} dir={sortDir} onSort={toggleSort} />
              <SortHeader field="statut" label="Statut" active={sortField} dir={sortDir} onSort={toggleSort} />
              <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">QR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {sortedRows.map(p => {
              const c = p.conducteurs
              const effectiveSt = getEffectiveStatut(p)
              const expireSoon  = effectiveSt === 'valide' && isExpiringSoon(p.date_expiration)
              const isExpired   = effectiveSt === 'expire'
              const staleInDb   = effectiveSt !== p.statut
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="hover:bg-[#21262D] transition-colors group cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/permis/${p.id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-mono text-sm font-bold text-[#F0F6FC] hover:text-[#F59E0B] transition-colors"
                    >
                      {p.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">{c?.prenom} {c?.nom}</p>
                    <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(p.categories ?? []).map((cat: string) => (
                        <span key={cat} className="text-xs px-2 py-0.5 bg-[#21262D] border border-[#30363D] rounded text-[#8B949E]">{cat}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-[#8B949E]">{fmt(p.date_delivrance)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-mono ${
                      isExpired  ? 'text-red-400 font-bold' :
                      expireSoon ? 'text-yellow-400 font-bold' :
                      'text-[#8B949E]'
                    }`}>
                      {fmt(p.date_expiration)}
                      {expireSoon && !isExpired && (
                        <span className="ml-1 text-[10px] bg-yellow-500/10 border border-yellow-500/20 px-1 rounded">bientôt</span>
                      )}
                      {isExpired && staleInDb && (
                        <span className="ml-1 text-[10px] bg-red-500/10 border border-red-500/20 px-1 rounded">à clôturer</span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <BadgeStatut statut={effectiveSt as StatutPermis} />
                  </td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">
                    <div className="flex justify-end">
                      <QrCodeDisplay value={p.numero} size={40} label={p.numero} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal détail */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#30363D]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-lg font-black text-[#F0F6FC]">{selected.numero}</span>
                  <BadgeStatut statut={getEffectiveStatut(selected) as StatutPermis} />
                  {getEffectiveStatut(selected) !== selected.statut && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      Clôture en attente
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8B949E]">Permis interne site minier</p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <Link
                  href={`/permis/${selected.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-[#8B949E] border border-[#30363D] hover:text-[#F0F6FC] hover:border-[#F59E0B]/30 transition-all"
                >
                  Détail →
                </Link>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Conducteur */}
              <div className="flex items-center gap-3 p-3.5 bg-[#0D1117] border border-[#30363D] rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#F59E0B]">
                    {selected.conducteurs?.prenom?.[0]}{selected.conducteurs?.nom?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#F0F6FC]">
                    {selected.conducteurs?.prenom} {selected.conducteurs?.nom}
                  </p>
                  <p className="text-xs text-[#8B949E]">
                    <span className="font-mono">{selected.conducteurs?.matricule}</span>
                    {selected.conducteurs?.entreprises?.nom && (
                      <span> · {selected.conducteurs.entreprises.nom}</span>
                    )}
                  </p>
                </div>
                {selected.conducteurs?.id && (
                  <Link
                    href={`/conducteurs/${selected.conducteurs.id}`}
                    onClick={e => e.stopPropagation()}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                      text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                      hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]
                      hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
                      active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
                  >
                    Voir fiche →
                  </Link>
                )}
              </div>

              {/* Détails permis */}
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Délivré le" value={fmt(selected.date_delivrance)} />
                <Detail
                  label="Expire le"
                  value={fmt(selected.date_expiration)}
                  accent={new Date(selected.date_expiration) < new Date() ? 'red' : isExpiringSoon(selected.date_expiration) ? 'yellow' : undefined}
                />
                <Detail
                  label="Zone de validité"
                  value={selected.zone_validite ? ZONE_LABEL[selected.zone_validite] ?? selected.zone_validite : '—'}
                />
                <Detail
                  label="Type permis site"
                  value={selected.type_permis_site ?? '—'}
                />
              </div>

              {/* Catégories */}
              {selected.categories.length > 0 && (
                <div>
                  <p className="text-xs text-[#8B949E] mb-2 font-medium uppercase tracking-wider">Catégories</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.categories.map(cat => (
                      <span key={cat} className="w-9 h-9 flex items-center justify-center bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg text-sm font-bold text-[#F59E0B]">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Habilitations */}
              <div className="grid grid-cols-2 gap-3">
                <Habilitation label="SST validée" ok={selected.validation_sst} />
                <Habilitation label="Visite médicale" ok={selected.validation_clinique} />
              </div>

              {/* QR + Actions */}
              <div className="flex items-end justify-between gap-4 pt-1">
                <div className="space-y-3">
                  {canGerer && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#8B949E] font-medium uppercase tracking-wider">Actions</p>
                      <PermisActionBtn
                        permisId={selected.id}
                        statut={selected.statut}
                        conducteurId={selected.conducteurs?.id}
                        dateExpiration={selected.date_expiration}
                      />
                    </div>
                  )}
                  <Link
                    href={`/permis/${selected.id}/print`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
                      text-[#8B949E] border border-[#30363D] bg-[#0D1117]
                      hover:text-[#F0F6FC] hover:border-[#F59E0B]/40 hover:bg-[#21262D]
                      active:scale-[0.97] transition-all duration-150"
                  >
                    <Printer size={12} />
                    Imprimer
                  </Link>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <QrCode size={12} className="text-[#8B949E]" />
                  <QrCodeDisplay value={selected.numero} size={80} label={selected.numero} />
                  <p className="text-[10px] text-[#8B949E] font-mono text-center leading-tight">{selected.numero}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SortHeader({
  field, label, active, dir, onSort, className = '',
}: {
  field: SortField; label: string; active: SortField; dir: 'asc' | 'desc'
  onSort: (f: SortField) => void; className?: string
}) {
  const isActive = active === field
  return (
    <th
      className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors
        ${isActive ? 'text-[#F59E0B]' : 'text-[#8B949E] hover:text-[#F0F6FC]'} ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive
          ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ArrowUpDown size={10} className="opacity-40" />
        }
      </span>
    </th>
  )
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'yellow' }) {
  const valueCls = accent === 'red' ? 'text-red-400 font-semibold' : accent === 'yellow' ? 'text-yellow-400 font-semibold' : 'text-[#F0F6FC]'
  return (
    <div className="bg-[#0D1117] border border-[#30363D] rounded-lg px-3.5 py-2.5">
      <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-sm font-medium ${valueCls}`}>{value}</p>
    </div>
  )
}

function Habilitation({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border ${ok ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
      {ok
        ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
        : <XCircle size={14} className="text-red-400 flex-shrink-0" />
      }
      <span className={`text-xs font-medium ${ok ? 'text-green-300' : 'text-red-300'}`}>{label}</span>
    </div>
  )
}
