'use client'

import { useState } from 'react'
import { PauseCircle, XCircle, PlayCircle, Loader2, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  permisId: string
  statut: string
  conducteurId?: string
  dateExpiration?: string
}

type Action = {
  label: string
  nextStatut: string
  Icon: React.ElementType
  btnCls: string
  confirmCls: string
  confirmMsg: string
  motifRequis?: boolean
}

const STATUT_LABEL: Record<string, string> = {
  suspendu: 'suspendu', retire: 'retiré', valide: 'réactivé', expire: 'clôturé',
}

const A_SUSPENDRE: Action = {
  label: 'Suspendre', nextStatut: 'suspendu', Icon: PauseCircle,
  btnCls: 'border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 hover:border-amber-500 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  confirmCls: 'bg-[#F59E0B] text-[#0D1117] hover:bg-[#FBBF24]',
  confirmMsg: 'Le permis sera suspendu. Le conducteur ne pourra plus opérer sur site jusqu\'à réactivation.',
}
const A_RETIRER: Action = {
  label: 'Retirer', nextStatut: 'retire', Icon: XCircle,
  btnCls: 'border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/25 hover:border-red-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  confirmCls: 'bg-[#EF4444] text-white hover:bg-[#F87171]',
  confirmMsg: 'Le retrait est définitif et irréversible. Ce permis ne pourra plus être réactivé.',
  motifRequis: true,
}
const A_REACTIVER: Action = {
  label: 'Réactiver', nextStatut: 'valide', Icon: PlayCircle,
  btnCls: 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/25 hover:border-green-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  confirmCls: 'bg-[#10B981] text-white hover:bg-[#059669]',
  confirmMsg: 'Le permis redeviendra valide et le conducteur pourra à nouveau opérer sur site.',
}
const A_EXPIRER: Action = {
  label: 'Clôturer', nextStatut: 'expire', Icon: XCircle,
  btnCls: 'border-gray-500/50 text-gray-400 bg-gray-500/10 hover:bg-gray-500/25 hover:border-gray-500 hover:shadow-[0_0_12px_rgba(156,163,175,0.3)]',
  confirmCls: 'bg-[#6B7280] text-white hover:bg-[#9CA3AF]',
  confirmMsg: 'Le permis sera marqué comme expiré. Un renouvellement pourra être délivré ensuite.',
}

export default function PermisActionBtn({ permisId, statut, conducteurId, dateExpiration }: Props) {
  const router = useRouter()
  const [open, setOpen]           = useState(false)
  const [chosen, setChosen]       = useState<Action | null>(null)
  const [loading, setLoading]     = useState(false)
  const [erreur, setErreur]       = useState<string | null>(null)
  const [motif, setMotif]         = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isDateExpired = !!dateExpiration && new Date(dateExpiration) < new Date()

  let actions: Action[] = []
  let canRenew = false

  if (statut === 'valide' && isDateExpired) {
    actions = [A_EXPIRER, A_RETIRER]
    canRenew = !!conducteurId
  } else if (statut === 'valide') {
    actions = [A_SUSPENDRE, A_RETIRER]
  } else if (statut === 'suspendu') {
    actions = [A_REACTIVER, A_RETIRER]
  } else if (statut === 'retire' || statut === 'expire') {
    canRenew = !!conducteurId
  }

  if (!actions.length && !canRenew) return null

  function openWith(action: Action) {
    setChosen(action)
    setErreur(null)
    setMotif('')
    setSuccessMsg(null)
    setOpen(true)
  }

  async function confirm() {
    if (!chosen) return
    if (chosen.motifRequis && !motif.trim()) {
      setErreur('Un motif est obligatoire pour retirer un permis.')
      return
    }
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/permis/${permisId}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: chosen.nextStatut, motif: motif.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      const label = STATUT_LABEL[chosen.nextStatut] ?? 'mis à jour'
      setSuccessMsg(`Permis ${label} avec succès.`)
      setTimeout(() => {
        setOpen(false)
        setSuccessMsg(null)
        router.refresh()
      }, 1800)
    } catch (e: any) {
      const msg: string = e.message ?? ''
      // Transition impossible : déjà dans cet état ou bloqué
      if (msg.includes('déjà retiré')) {
        setErreur('Ce permis est déjà retiré. La page va être actualisée.')
        setTimeout(() => { setOpen(false); router.refresh() }, 2000)
      } else if (msg.includes('déjà expiré')) {
        setErreur('Ce permis est déjà expiré. La page va être actualisée.')
        setTimeout(() => { setOpen(false); router.refresh() }, 2000)
      } else if (msg.includes('déjà suspendu')) {
        setErreur('Ce permis est déjà suspendu. La page va être actualisée.')
        setTimeout(() => { setOpen(false); router.refresh() }, 2000)
      } else if (msg.includes('Transition invalide') || msg.includes('impossible')) {
        setErreur('Cette action n\'est plus disponible — le statut a changé. La page va être actualisée.')
        setTimeout(() => { setOpen(false); router.refresh() }, 2200)
      } else {
        setErreur(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.map(action => (
          <button
            key={action.nextStatut}
            onClick={() => openWith(action)}
            className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all duration-150 active:scale-95 ${action.btnCls}`}
          >
            <action.Icon size={12} />
            {action.label}
          </button>
        ))}
        {canRenew && (
          <Link
            href={`/permis/nouveau?conducteur=${conducteurId}&renouvelle=${permisId}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 bg-blue-500/10 font-semibold whitespace-nowrap flex items-center gap-1.5 hover:bg-blue-500/25 hover:border-blue-500 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-150"
          >
            <RefreshCw size={12} />
            Renouveler
          </Link>
        )}
      </div>

      {open && chosen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => !loading && !successMsg && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {successMsg ? (
              /* Vue succès */
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle2 size={36} className="text-green-400" />
                <p className="text-sm font-semibold text-green-400 text-center">{successMsg}</p>
                <p className="text-xs text-[#8B949E]">Actualisation en cours…</p>
              </div>
            ) : (
              /* Vue confirmation */
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#F0F6FC]">{chosen.label} le permis</h3>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="cursor-pointer p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-sm text-[#F0F6FC]/70 leading-relaxed mb-4">
                  {chosen.confirmMsg}
                </p>

                {/* Motif */}
                {(chosen.nextStatut === 'suspendu' || chosen.nextStatut === 'retire') && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                      Motif{chosen.motifRequis ? ' *' : ' (optionnel)'}
                    </label>
                    <textarea
                      value={motif}
                      onChange={e => setMotif(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 resize-none transition-colors"
                      placeholder={chosen.nextStatut === 'retire' ? 'Raison du retrait définitif…' : 'Raison de la suspension…'}
                    />
                  </div>
                )}

                {erreur && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                    {erreur}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="cursor-pointer flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirm}
                    disabled={loading}
                    className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 ${chosen.confirmCls}`}
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Confirmer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
