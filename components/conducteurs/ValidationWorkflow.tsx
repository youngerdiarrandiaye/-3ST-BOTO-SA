'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle, XCircle, Clock, Lock,
  UserCheck, ShieldCheck, Stethoscope, Loader2,
} from 'lucide-react'
import { validerNiveau1, validerNiveau2, validerNiveau3 } from '@/app/actions/validations'
import { toastSuccess, toastError, toastWarn } from '@/lib/toast'
import type { RoleUtilisateur } from '@/lib/types'

type NiveauState = 'bloque' | 'en_attente' | 'valide' | 'refuse'

interface Props {
  conducteurId: string
  userRole: RoleUtilisateur
  // état global
  niveau: number   // niveau_validation_courant (1–4)
  statut: string   // statut conducteur
  // niveau 1 — Responsable Département
  val_dept: boolean
  date_dept: string | null
  nom_dept: string | null
  motif_dept: string | null
  // niveau 2 — Responsable SST
  val_sst: boolean
  date_sst: string | null
  nom_sst: string | null
  motif_sst: string | null
  // niveau 3 — Clinique
  val_clinique: boolean
  date_clinique: string | null
  medecin: string | null
  valideur_clinique: string | null
  motif_clinique: string | null
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getState(
  valide: boolean,
  motif: string | null,
  niveauCourant: number,
  thisNiveau: number,
): NiveauState {
  if (valide) return 'valide'
  if (motif) return 'refuse'
  if (niveauCourant === thisNiveau) return 'en_attente'
  return 'bloque'
}

const STATE_CFG: Record<NiveauState, {
  iconFn: (size: number) => React.ReactNode
  iconCls: string
  ringCls: string
  bgCard: string
  borderCard: string
  labelCls: string
  pillCls: string
  pillLabel: string
  connectorCls: string
}> = {
  bloque: {
    iconFn: s => <Lock size={s} />,
    iconCls: 'bg-[#21262D] text-[#4B5563]',
    ringCls: 'border-[#30363D]',
    bgCard: 'bg-[#0D1117]',
    borderCard: 'border-[#30363D]',
    labelCls: 'text-[#4B5563]',
    pillCls: 'bg-[#21262D] text-[#4B5563] border-[#30363D]',
    pillLabel: 'Bloqué',
    connectorCls: 'bg-[#30363D]',
  },
  en_attente: {
    iconFn: s => <Clock size={s} />,
    iconCls: 'bg-amber-500/10 text-amber-400',
    ringCls: 'border-amber-500/40',
    bgCard: 'bg-amber-500/5',
    borderCard: 'border-amber-500/20',
    labelCls: 'text-[#F0F6FC]',
    pillCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    pillLabel: 'En attente',
    connectorCls: 'bg-[#30363D]',
  },
  valide: {
    iconFn: s => <CheckCircle size={s} />,
    iconCls: 'bg-green-500/10 text-green-400',
    ringCls: 'border-green-500/40',
    bgCard: 'bg-green-500/5',
    borderCard: 'border-green-500/20',
    labelCls: 'text-[#F0F6FC]',
    pillCls: 'bg-green-500/10 text-green-400 border-green-500/20',
    pillLabel: 'Validé',
    connectorCls: 'bg-green-500/25',
  },
  refuse: {
    iconFn: s => <XCircle size={s} />,
    iconCls: 'bg-red-500/10 text-red-400',
    ringCls: 'border-red-500/40',
    bgCard: 'bg-red-500/5',
    borderCard: 'border-red-500/20',
    labelCls: 'text-[#F0F6FC]',
    pillCls: 'bg-red-500/10 text-red-400 border-red-500/20',
    pillLabel: 'Refusé',
    connectorCls: 'bg-[#30363D]',
  },
}

export default function ValidationWorkflow({
  conducteurId, userRole, niveau, statut,
  val_dept, date_dept, nom_dept, motif_dept,
  val_sst, date_sst, nom_sst, motif_sst,
  val_clinique, date_clinique, medecin, valideur_clinique, motif_clinique,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [openPanel, setOpenPanel] = useState<{ level: 1 | 2 | 3; action: 'valider' | 'refuser' } | null>(null)
  const [medecinNom, setMedecinNom] = useState('')
  const [motif, setMotif] = useState('')

  const canN1 = ['admin', 'direction'].includes(userRole)
  const canN2 = ['admin', 'sst'].includes(userRole)
  const canN3 = ['admin', 'sst', 'hse'].includes(userRole)

  const n1State = getState(val_dept, motif_dept, niveau, 1)
  const n2State = getState(val_sst, motif_sst, niveau, 2)
  const n3State = getState(val_clinique, motif_clinique, niveau, 3)

  const totalValide = [val_dept, val_sst, val_clinique].filter(Boolean).length
  const isComplete  = statut === 'actif' || totalValide === 3

  function openForm(level: 1 | 2 | 3, action: 'valider' | 'refuser') {
    setOpenPanel({ level, action })
    setMedecinNom('')
    setMotif('')
  }

  function handleSubmit() {
    if (!openPanel) return
    const { level, action } = openPanel

    if (action === 'refuser' && !motif.trim()) {
      toastError.champObligatoire('Motif de refus')
      return
    }

    startTransition(async () => {
      let result: { error?: string }

      if (action === 'valider') {
        if (level === 1) result = await validerNiveau1(conducteurId, true)
        else if (level === 2) result = await validerNiveau2(conducteurId, true)
        else result = await validerNiveau3(conducteurId, true, medecinNom.trim() || undefined)
      } else {
        if (level === 1) result = await validerNiveau1(conducteurId, false, motif.trim())
        else if (level === 2) result = await validerNiveau2(conducteurId, false, motif.trim())
        else result = await validerNiveau3(conducteurId, false, undefined, motif.trim())
      }

      const labels: Record<1 | 2 | 3, string> = {
        1: 'Responsable Département',
        2: 'Responsable SST',
        3: 'Clinique',
      }
      if (result.error) {
        toastError.erreurServeur()
      } else if (action === 'valider') {
        toastSuccess.validationApprouvee(labels[level])
      } else {
        toastWarn.validationRefusee(labels[level])
      }

      setOpenPanel(null)
      setMedecinNom('')
      setMotif('')
    })
  }

  const levels: {
    num: 1 | 2 | 3
    label: string
    subtitle: string
    typeIcon: React.ReactNode
    state: NiveauState
    can: boolean
    date: string | null
    nom: string | null
    extra: string | null
    motifRefus: string | null
  }[] = [
    {
      num: 1, label: 'Responsable Département', subtitle: 'Rôle : admin / direction',
      typeIcon: <UserCheck size={18} />,
      state: n1State, can: canN1,
      date: date_dept, nom: nom_dept, extra: null, motifRefus: motif_dept,
    },
    {
      num: 2, label: 'Responsable SST', subtitle: 'Rôle : admin / SST',
      typeIcon: <ShieldCheck size={18} />,
      state: n2State, can: canN2,
      date: date_sst, nom: nom_sst, extra: null, motifRefus: motif_sst,
    },
    {
      num: 3, label: 'Clinique / Médecin', subtitle: 'Rôle : admin / SST / HSE',
      typeIcon: <Stethoscope size={18} />,
      state: n3State, can: canN3,
      date: date_clinique,
      nom: medecin,
      extra: valideur_clinique,
      motifRefus: motif_clinique,
    },
  ]

  const inputCls = [
    'w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg',
    'text-sm text-[#F0F6FC] placeholder-[#8B949E]',
    'focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20',
    'transition-colors',
  ].join(' ')

  return (
    <div className="space-y-4">

      {/* Progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
            style={{ width: `${(totalValide / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono font-bold text-[#F0F6FC] flex-shrink-0 tabular-nums">
          {totalValide}/3
        </span>
        {isComplete && (
          <span className="text-xs px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full font-semibold flex-shrink-0">
            Processus complet ✓
          </span>
        )}
        {statut === 'refuse' && !isComplete && (
          <span className="text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full font-semibold flex-shrink-0">
            Dossier refusé
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {levels.map((lv, idx) => {
          const cfg      = STATE_CFG[lv.state]
          const isOpen   = openPanel?.level === lv.num
          const showAct  = lv.can && lv.state === 'en_attente'

          return (
            <div key={lv.num} className="flex gap-4">

              {/* Indicateur vertical */}
              <div className="flex flex-col items-center w-10 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${cfg.iconCls} ${cfg.ringCls}`}>
                  {cfg.iconFn(18)}
                </div>
                {idx < 2 && (
                  <div className={`w-0.5 flex-1 mt-1 min-h-[2rem] transition-colors ${cfg.connectorCls}`} />
                )}
              </div>

              {/* Contenu */}
              <div className="pb-4 flex-1 min-w-0">
                <div className={`rounded-xl border p-4 transition-all ${cfg.bgCard} ${cfg.borderCard}`}>

                  {/* En-tête */}
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8B949E]">{lv.typeIcon}</span>
                          <p className={`text-sm font-semibold ${cfg.labelCls}`}>{lv.label}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.pillCls}`}>
                          {cfg.pillLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#4B5563] mt-0.5">{lv.subtitle}</p>
                    </div>

                    {/* Boutons d'action */}
                    {showAct && !isOpen && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => openForm(lv.num, 'valider')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                            bg-[#F59E0B] text-[#0D1117] rounded-lg hover:bg-[#D97706]
                            active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                          Valider
                        </button>
                        <button
                          onClick={() => openForm(lv.num, 'refuser')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                            text-red-400 border border-red-500/20 rounded-lg
                            hover:bg-red-500/10 hover:border-red-500/40
                            active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Détails si validé */}
                  {lv.state === 'valide' && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {lv.date && (
                        <span className="text-xs text-[#8B949E] font-mono">{fmt(lv.date)}</span>
                      )}
                      {lv.nom && (
                        <span className="text-xs text-[#8B949E]">
                          {lv.num === 3 ? `Médecin : ${lv.nom}` : `par ${lv.nom}`}
                        </span>
                      )}
                      {lv.num === 3 && lv.extra && (
                        <span className="text-xs text-[#8B949E]">· validé par {lv.extra}</span>
                      )}
                    </div>
                  )}

                  {/* Motif de refus */}
                  {lv.state === 'refuse' && lv.motifRefus && (
                    <div className="mt-2.5 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                      <p className="text-xs font-semibold text-red-400 mb-1">Motif de refus</p>
                      <p className="text-xs text-[#8B949E] leading-relaxed">{lv.motifRefus}</p>
                    </div>
                  )}

                  {/* Formulaire inline */}
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-[#30363D] space-y-3">
                      {openPanel?.action === 'valider' && lv.num === 3 && (
                        <div>
                          <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wide mb-1.5">
                            Nom du médecin <span className="text-[#4B5563] normal-case font-normal">(optionnel)</span>
                          </label>
                          <input
                            value={medecinNom}
                            onChange={e => setMedecinNom(e.target.value)}
                            placeholder="Dr. Prénom Nom"
                            className={inputCls}
                          />
                        </div>
                      )}

                      {openPanel?.action === 'refuser' && (
                        <div>
                          <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wide mb-1.5">
                            Motif de refus <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            value={motif}
                            onChange={e => setMotif(e.target.value)}
                            placeholder="Précisez la raison du refus…"
                            rows={3}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                      )}

                      {openPanel?.action === 'valider' && lv.num !== 3 && (
                        <p className="text-xs text-[#8B949E]">
                          Votre nom sera enregistré automatiquement comme valideur.
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setOpenPanel(null)}
                          disabled={isPending}
                          className="flex-1 py-2 text-xs text-[#8B949E] border border-[#30363D] rounded-lg
                            hover:text-[#F0F6FC] hover:border-[#8B949E]/30 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isPending || (openPanel?.action === 'refuser' && !motif.trim())}
                          className={[
                            'flex-1 py-2 text-xs font-semibold rounded-lg',
                            'flex items-center justify-center gap-1.5',
                            'cursor-pointer disabled:opacity-50 active:scale-[0.97] transition-all',
                            openPanel?.action === 'valider'
                              ? 'bg-[#F59E0B] text-[#0D1117] hover:bg-[#D97706]'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
                          ].join(' ')}
                        >
                          {isPending && <Loader2 size={12} className="animate-spin" />}
                          {isPending
                            ? 'Enregistrement…'
                            : openPanel?.action === 'valider' ? 'Confirmer la validation' : 'Confirmer le refus'
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
