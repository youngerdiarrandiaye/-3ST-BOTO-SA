'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, RotateCcw, XCircle, ShieldOff, Pencil,
  X, Loader2, AlertTriangle, Gavel, ChevronRight, Eye,
} from 'lucide-react'

interface Props {
  infractionId: string
  statut: string
  conducteurId: string
  role: string
  compact?: boolean
  // Pour pré-remplir le formulaire de modification
  description?: string | null
  localisation?: string | null
  dateHeure?: string
  zoneConstatee?: string | null
}

type ModalMode = 'traiter' | 'modifier' | 'annuler' | 'cloturer' | 'lever' | null

const ZONE_OPTIONS = [
  { value: 'miniere',      label: 'Zone minière' },
  { value: 'hors_miniere', label: 'Hors zone minière' },
]

export default function InfractionActionBtn({
  infractionId, statut, conducteurId, role, compact = false,
  description: descInit, localisation: locInit, dateHeure: dhInit, zoneConstatee: zoneInit,
}: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalMode>(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Traiter
  const [choixTraiter, setChoixTraiter] = useState<'traitee' | 'contestee'>('traitee')

  // Modifier
  const toLocalDT = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }
  const [modifForm, setModifForm] = useState({
    description:   descInit ?? '',
    localisation:  locInit  ?? '',
    date_heure:    toLocalDT(dhInit),
    zone_constatee: zoneInit ?? '',
  })

  const canGerer   = ['admin', 'hse', 'sst'].includes(role)
  const canAnnuler = ['admin', 'hse', 'sst'].includes(role)

  function open(m: ModalMode) { setModal(m); setErreur(null) }
  function close() { setModal(null); setErreur(null) }

  // --- Transition statut (PATCH /statut) ---
  async function patchStatut(nextStatut: string) {
    setLoading(true); setErreur(null)
    try {
      const res = await fetch(`/api/infractions/${infractionId}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nextStatut }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      close(); router.refresh()
    } catch (e: any) { setErreur(e.message) }
    finally { setLoading(false) }
  }

  // --- Modification (PATCH /) ---
  async function handleModifier(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setErreur(null)
    try {
      const res = await fetch(`/api/infractions/${infractionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:    modifForm.description   || null,
          localisation:   modifForm.localisation  || null,
          date_heure:     modifForm.date_heure ? new Date(modifForm.date_heure).toISOString() : undefined,
          zone_constatee: modifForm.zone_constatee || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      close(); router.refresh()
    } catch (e: any) { setErreur(e.message) }
    finally { setLoading(false) }
  }

  if (!canGerer) return null

  const inputCls = `w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 transition-colors`

  return (
    <>
      {/* ── DÉCLARÉE : actions primaires en ligne ── */}
      {statut === 'declaree' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <InlineBtn color="amber" onClick={() => open('traiter')} icon={<CheckCircle2 size={12} />} label="Traiter" />
            <InlineBtn color="blue"  onClick={() => open('modifier')} icon={<Pencil size={12} />}      label="Modifier" />
            {canAnnuler && (
              <InlineBtn color="red" onClick={() => open('annuler')} icon={<XCircle size={12} />} label="Annuler" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1"><SanctionnerLink conducteurId={conducteurId} infractionId={infractionId} /></div>
            {compact && <VoirPlusLink infractionId={infractionId} />}
          </div>
        </div>
      )}

      {/* ── CONTESTÉE ── */}
      {statut === 'contestee' && (
        compact ? (
          /* Table : Sanctionner + Voir plus, verdict sur la page détail */
          <div className="flex items-center gap-1.5">
            <div className="flex-1"><SanctionnerLink conducteurId={conducteurId} infractionId={infractionId} /></div>
            <VoirPlusLink infractionId={infractionId} />
          </div>
        ) : (
          /* Détail : panneau de verdict complet */
          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B949E]">
              Résolution de la contestation
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => open('cloturer')}
                className="cursor-pointer group flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2
                  border-green-500/30 bg-green-500/5 text-green-400
                  hover:border-green-500/70 hover:bg-green-500/15
                  hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]
                  active:scale-[0.97] transition-all duration-150"
              >
                <CheckCircle2 size={18} strokeWidth={2} />
                <div className="text-center leading-tight">
                  <p className="text-xs font-bold">Clôturer</p>
                  <p className="text-[10px] text-green-400/60 mt-0.5">Infraction confirmée</p>
                </div>
              </button>

              {canAnnuler ? (
                <button
                  onClick={() => open('lever')}
                  className="cursor-pointer group flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2
                    border-[#30363D] bg-[#0D1117] text-[#8B949E]
                    hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400
                    hover:shadow-[0_0_16px_rgba(239,68,68,0.1)]
                    active:scale-[0.97] transition-all duration-150"
                >
                  <ShieldOff size={18} strokeWidth={2} />
                  <div className="text-center leading-tight">
                    <p className="text-xs font-bold">Lever</p>
                    <p className="text-[10px] text-[#8B949E]/60 mt-0.5 group-hover:text-red-400/60">Contestation fondée</p>
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2
                  border-[#30363D]/40 bg-[#0D1117]/50 text-[#8B949E]/40 cursor-not-allowed"
                  title="Réservé à l'administrateur ou au responsable HSE"
                >
                  <ShieldOff size={18} strokeWidth={2} />
                  <div className="text-center leading-tight">
                    <p className="text-xs font-bold">Lever</p>
                    <p className="text-[10px] mt-0.5">Admin / HSE</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[#30363D]" />
              <span className="text-[10px] text-[#8B949E]/50 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-[#30363D]" />
            </div>

            <SanctionnerLink conducteurId={conducteurId} infractionId={infractionId} />
          </div>
        )
      )}

      {/* ── TRAITÉE : sanction uniquement ── */}
      {statut === 'traitee' && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1"><SanctionnerLink conducteurId={conducteurId} infractionId={infractionId} /></div>
          {compact && <VoirPlusLink infractionId={infractionId} />}
        </div>
      )}
      {/* ── Modaux ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !loading && close()}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >

            {/* ── TRAITER ── */}
            {modal === 'traiter' && (
              <div className="p-6 space-y-5">
                <ModalHeader title="Traiter l'infraction" onClose={close} loading={loading} />
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceCard
                    selected={choixTraiter === 'traitee'}
                    onClick={() => setChoixTraiter('traitee')}
                    Icon={CheckCircle2}
                    label="Traitée"
                    sub="Infraction résolue"
                    activeCls="border-[#10B981] bg-[#10B981]/10 text-[#10B981]"
                  />
                  <ChoiceCard
                    selected={choixTraiter === 'contestee'}
                    onClick={() => setChoixTraiter('contestee')}
                    Icon={RotateCcw}
                    label="Contestée"
                    sub="En attente vérif."
                    activeCls="border-[#A78BFA] bg-[#A78BFA]/10 text-[#A78BFA]"
                  />
                </div>
                <p className="text-xs text-[#8B949E] leading-relaxed">
                  {choixTraiter === 'traitee'
                    ? "L'infraction sera clôturée et enregistrée dans le journal d'audit."
                    : "L'infraction sera signalée comme contestée et mise en attente de vérification."}
                </p>
                <ErreurMsg msg={erreur} />
                <ModalActions
                  loading={loading} onCancel={close}
                  confirmCls={choixTraiter === 'traitee' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#7C3AED] hover:bg-[#6D28D9]'}
                  onConfirm={() => patchStatut(choixTraiter)}
                />
              </div>
            )}

            {/* ── MODIFIER ── */}
            {modal === 'modifier' && (
              <form onSubmit={handleModifier} className="p-6 space-y-4">
                <ModalHeader title="Corriger l'infraction" onClose={close} loading={loading} />
                <div className="px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400">
                    <AlertTriangle size={11} className="inline mr-1.5 align-middle" />
                    Seules les corrections factuelles sont autorisées. La modification est tracée.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1.5 font-medium">Zone de constatation</label>
                    <select
                      value={modifForm.zone_constatee}
                      onChange={e => setModifForm(f => ({ ...f, zone_constatee: e.target.value }))}
                      className={`cursor-pointer ${inputCls}`}
                    >
                      <option value="">Non définie</option>
                      {ZONE_OPTIONS.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1.5 font-medium">Date et heure</label>
                    <input type="datetime-local"
                      value={modifForm.date_heure}
                      onChange={e => setModifForm(f => ({ ...f, date_heure: e.target.value }))}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1.5 font-medium">Localisation</label>
                    <input type="text"
                      value={modifForm.localisation}
                      onChange={e => setModifForm(f => ({ ...f, localisation: e.target.value }))}
                      placeholder="Zone A, Carrière nord…"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8B949E] mb-1.5 font-medium">Description</label>
                    <textarea rows={3}
                      value={modifForm.description}
                      onChange={e => setModifForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Détails de l'infraction…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
                <ErreurMsg msg={erreur} />
                <ModalActions
                  loading={loading} onCancel={close}
                  confirmCls="bg-blue-600 hover:bg-blue-500"
                  confirmLabel="Enregistrer"
                  isSubmit
                />
              </form>
            )}

            {/* ── ANNULER ── */}
            {modal === 'annuler' && (
              <div className="p-6 space-y-4">
                <ModalHeader title="Annuler l'infraction" onClose={close} loading={loading} />
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-red-300">Action irréversible</p>
                      <p className="text-xs text-[#F0F6FC]/70 leading-relaxed">
                        L'infraction sera marquée comme annulée. Les points éventuellement retirés seront à restituer manuellement via une formation.
                      </p>
                    </div>
                  </div>
                </div>
                <ErreurMsg msg={erreur} />
                <ModalActions
                  loading={loading} onCancel={close}
                  confirmCls="bg-[#EF4444] hover:bg-[#F87171]"
                  confirmLabel="Annuler l'infraction"
                  onConfirm={() => patchStatut('annulee')}
                />
              </div>
            )}

            {/* ── CLÔTURER (contestee → traitee) ── */}
            {modal === 'cloturer' && (
              <div className="p-6 space-y-4">
                <ModalHeader title="Clôturer l'infraction" onClose={close} loading={loading} />
                <p className="text-sm text-[#F0F6FC]/70 leading-relaxed">
                  Après investigation, l'infraction est confirmée. Elle sera marquée comme <span className="text-green-400 font-semibold">traitée</span> et close définitivement.
                </p>
                <ErreurMsg msg={erreur} />
                <ModalActions
                  loading={loading} onCancel={close}
                  confirmCls="bg-[#10B981] hover:bg-[#059669]"
                  confirmLabel="Confirmer et clôturer"
                  onConfirm={() => patchStatut('traitee')}
                />
              </div>
            )}

            {/* ── LEVER (contestee → annulee) ── */}
            {modal === 'lever' && (
              <div className="p-6 space-y-4">
                <ModalHeader title="Lever l'infraction" onClose={close} loading={loading} />
                <p className="text-sm text-[#F0F6FC]/70 leading-relaxed">
                  Après investigation, la contestation est jugée fondée. L'infraction sera <span className="text-gray-300 font-semibold">annulée</span> et retirée du dossier du conducteur.
                </p>
                <ErreurMsg msg={erreur} />
                <ModalActions
                  loading={loading} onCancel={close}
                  confirmCls="bg-[#6B7280] hover:bg-[#9CA3AF]"
                  confirmLabel="Lever l'infraction"
                  onConfirm={() => patchStatut('annulee')}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}

/* ── Boutons inline réutilisables ── */

type BtnColor = 'amber' | 'blue' | 'red'
const BTN_CLS: Record<BtnColor, string> = {
  amber: 'border-[#F59E0B]/50 text-[#F59E0B] bg-[#F59E0B]/10 hover:bg-[#F59E0B]/25 hover:border-[#F59E0B] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  blue:  'border-blue-500/50  text-blue-400  bg-blue-500/10  hover:bg-blue-500/25  hover:border-blue-500  hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  red:   'border-red-500/50   text-red-400   bg-red-500/10   hover:bg-red-500/25   hover:border-red-500   hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
}

function InlineBtn({ color, onClick, icon, label }: {
  color: BtnColor; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all duration-150 ${BTN_CLS[color]}`}
    >
      {icon} {label}
    </button>
  )
}

function SanctionnerLink({ conducteurId, infractionId }: { conducteurId: string; infractionId: string }) {
  return (
    <Link
      href={`/sanctions/nouvelle?conducteur=${conducteurId}&infraction=${infractionId}`}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-purple-500/30
        text-purple-400 bg-purple-500/5 text-xs font-semibold
        hover:bg-purple-500/15 hover:border-purple-500/60
        hover:shadow-[0_0_14px_rgba(139,92,246,0.2)]
        transition-all duration-150"
    >
      <Gavel size={13} />
      <span>Sanctionner</span>
      <ChevronRight size={13} className="ml-auto opacity-50" />
    </Link>
  )
}

function VoirPlusLink({ infractionId }: { infractionId: string }) {
  return (
    <Link
      href={`/infractions/${infractionId}`}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#30363D]
        text-[#8B949E] bg-[#0D1117] text-xs font-semibold whitespace-nowrap
        hover:bg-[#21262D] hover:border-[#8B949E]/50 hover:text-[#F0F6FC]
        transition-all duration-150"
    >
      <Eye size={13} />
      <span>Voir plus</span>
    </Link>
  )
}

/* ── Sous-composants modaux ── */

function ModalHeader({ title, onClose, loading }: { title: string; onClose: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-[#F0F6FC]">{title}</h3>
      <button onClick={onClose} disabled={loading}
        className="cursor-pointer p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}

function ChoiceCard({ selected, onClick, Icon, label, sub, activeCls }: {
  selected: boolean; onClick: () => void; Icon: React.ElementType
  label: string; sub: string; activeCls: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        selected ? activeCls : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:bg-[#21262D]'
      }`}>
      <Icon size={24} strokeWidth={2} />
      <div className="text-center">
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

function ErreurMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{msg}</p>
  )
}

function ModalActions({ loading, onCancel, confirmCls, confirmLabel = 'Confirmer', onConfirm, isSubmit = false }: {
  loading: boolean; onCancel: () => void; confirmCls: string
  confirmLabel?: string; onConfirm?: () => void; isSubmit?: boolean
}) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onCancel} disabled={loading}
        className="cursor-pointer flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40">
        Annuler
      </button>
      <button
        type={isSubmit ? 'submit' : 'button'}
        onClick={isSubmit ? undefined : onConfirm}
        disabled={loading}
        className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-40 ${confirmCls}`}>
        {loading && <Loader2 size={14} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  )
}
