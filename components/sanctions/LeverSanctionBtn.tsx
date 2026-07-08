'use client'

import { useState } from 'react'
import { ShieldCheck, X, Loader2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  sanctionId: string
  conducteurId: string
  type: string
  levee_le: string | null
}

export default function LeverSanctionBtn({ sanctionId, conducteurId, type, levee_le }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Retrait définitif = irrévocable, déjà levée = pas d'action
  if (levee_le || type === 'retrait_definitif') return null

  async function handleSubmit() {
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/sanctions/${sanctionId}/lever`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conducteur_id: conducteurId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setErreur(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setErreur(null) }}
        className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10 font-semibold whitespace-nowrap hover:bg-[#10B981]/25 hover:border-[#10B981] hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-150"
      >
        Lever
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Titre */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-[#10B981]" />
                </div>
                <h3 className="text-base font-bold text-[#F0F6FC]">Lever la sanction</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="cursor-pointer p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Avertissement */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-5">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#F0F6FC]/80 leading-relaxed">
                La suspension sera <strong className="text-[#F0F6FC]">levée immédiatement</strong>.
                Si aucune autre sanction n&apos;est en cours, le conducteur retrouvera
                le statut <span className="text-[#10B981] font-semibold">Actif</span>.
              </p>
            </div>

            {erreur && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
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
                onClick={handleSubmit}
                disabled={loading}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
