'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, RotateCcw,
  X, Loader2, AlertTriangle, Star,
} from 'lucide-react'
import { toastSuccess } from '@/lib/toast'

interface Props {
  formationId: string
  statut: string
  role: string
  pointsRecuperes: number
}

type ModalMode = 'valider' | 'annuler' | 'reactiver' | null

export default function FormationActionBtn({ formationId, statut, role, pointsRecuperes }: Props) {
  const router = useRouter()
  const [modal,   setModal]   = useState<ModalMode>(null)
  const [loading, setLoading] = useState(false)
  const [erreur,  setErreur]  = useState<string | null>(null)
  const [pts,     setPts]     = useState(String(pointsRecuperes))

  const isAdmin = role === 'admin'
  const canGerer = ['admin', 'hse', 'sst'].includes(role)

  function open(m: ModalMode) { setModal(m); setErreur(null) }
  function close() { setModal(null); setErreur(null) }

  async function patch(nextStatut: string, extraPts?: number) {
    setLoading(true); setErreur(null)
    try {
      const res = await fetch(`/api/formations/${formationId}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: nextStatut,
          points_recuperes: extraPts ?? pointsRecuperes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      if (nextStatut === 'validee') toastSuccess.formationValidee(extraPts ?? pointsRecuperes)
      else if (nextStatut === 'annulee') toastSuccess.formationAnnulee()
      else if (nextStatut === 'en_cours') toastSuccess.formationReactivee()
      close(); router.refresh()
    } catch (e: any) { setErreur(e.message) }
    finally { setLoading(false) }
  }

  if (!canGerer) return null

  return (
    <>
      {/* ── EN COURS : Valider | Annuler ── */}
      {statut === 'en_cours' && (
        <div className="flex gap-3">
          <button
            onClick={() => { setPts(String(pointsRecuperes)); open('valider') }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2
              border-green-500/40 bg-green-500/5 text-green-400 font-semibold text-sm
              hover:border-green-500/70 hover:bg-green-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]
              active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <CheckCircle2 size={16} strokeWidth={2} />
            Valider la formation
          </button>
          <button
            onClick={() => open('annuler')}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2
              border-[#30363D] bg-[#0D1117] text-[#8B949E] font-semibold text-sm
              hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400
              hover:shadow-[0_0_16px_rgba(239,68,68,0.1)]
              active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <XCircle size={16} strokeWidth={2} />
            Annuler
          </button>
        </div>
      )}

      {/* ── VALIDÉE : Annuler (admin only) ── */}
      {statut === 'validee' && isAdmin && (
        <button
          onClick={() => open('annuler')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30
            text-red-400 bg-red-500/5 text-sm font-semibold
            hover:bg-red-500/15 hover:border-red-500/60
            active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <XCircle size={14} />
          Annuler la formation
        </button>
      )}

      {/* ── ANNULÉE : Réactiver (admin only) ── */}
      {statut === 'annulee' && isAdmin && (
        <button
          onClick={() => open('reactiver')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/30
            text-blue-400 bg-blue-500/5 text-sm font-semibold
            hover:bg-blue-500/15 hover:border-blue-500/60
            active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <RotateCcw size={14} />
          Réactiver
        </button>
      )}

      {/* ── MODAUX ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => !loading && close()}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >

            {/* ── VALIDER ── */}
            {modal === 'valider' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F0F6FC]">Valider la formation</h3>
                  <button onClick={close} disabled={loading}
                    className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs text-green-400 leading-relaxed">
                    La formation sera marquée comme <strong>validée</strong>. Les points seront crédités
                    immédiatement sur le capital du conducteur.
                  </p>
                </div>

                {/* Points récupérés */}
                <div>
                  <label className="block text-sm font-medium text-[#8B949E] mb-2 flex items-center gap-1.5">
                    <Star size={13} className="text-[#F59E0B]" />
                    Points récupérés
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={pts}
                      onChange={e => setPts(e.target.value)}
                      min="0" max="20"
                      className="w-24 px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm
                        text-[#F0F6FC] font-mono text-center focus:outline-none focus:border-green-500/60
                        focus:ring-1 focus:ring-green-500/30 transition-colors"
                    />
                    <span className="text-sm text-[#8B949E]">pts crédités sur le permis interne</span>
                  </div>
                </div>

                {erreur && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erreur}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={close} disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                      hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                    Annuler
                  </button>
                  <button
                    onClick={() => patch('validee', parseInt(pts, 10) || 0)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                      rounded-lg text-white bg-[#10B981] hover:bg-[#059669] transition-colors disabled:opacity-40 cursor-pointer">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Valider
                  </button>
                </div>
              </div>
            )}

            {/* ── ANNULER ── */}
            {modal === 'annuler' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F0F6FC]">Annuler la formation</h3>
                  <button onClick={close} disabled={loading}
                    className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-red-300">Action irréversible</p>
                      <p className="text-xs text-[#F0F6FC]/70 leading-relaxed">
                        {statut === 'validee'
                          ? `Les ${pointsRecuperes} points précédemment crédités seront automatiquement déduits du capital du conducteur.`
                          : 'La formation sera annulée. Aucun point ne sera modifié.'}
                      </p>
                    </div>
                  </div>
                </div>
                {erreur && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erreur}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={close} disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                      hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                    Retour
                  </button>
                  <button
                    onClick={() => patch('annulee')}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                      rounded-lg text-white bg-[#EF4444] hover:bg-[#F87171] transition-colors disabled:opacity-40 cursor-pointer">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Confirmer l'annulation
                  </button>
                </div>
              </div>
            )}

            {/* ── RÉACTIVER ── */}
            {modal === 'reactiver' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F0F6FC]">Réactiver la formation</h3>
                  <button onClick={close} disabled={loading}
                    className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-sm text-[#F0F6FC]/70 leading-relaxed">
                  La formation sera remise <span className="text-blue-400 font-semibold">en cours</span>.
                  Aucun point ne sera modifié — utilisez le bouton Valider ensuite pour créditer les points.
                </p>
                {erreur && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erreur}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={close} disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                      hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                    Annuler
                  </button>
                  <button
                    onClick={() => patch('en_cours')}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                      rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 cursor-pointer">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Réactiver
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
