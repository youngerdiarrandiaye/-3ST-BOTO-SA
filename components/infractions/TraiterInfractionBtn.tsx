'use client'

import { useState } from 'react'
import { CheckCircle2, RotateCcw, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  infractionId: string
  statut: string
}

export default function TraiterInfractionBtn({ infractionId, statut }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [choix, setChoix] = useState<'traitee' | 'contestee'>('traitee')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  if (statut !== 'declaree') return null

  async function handleSubmit() {
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/infractions/${infractionId}/traiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: choix }),
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
        onClick={() => { setOpen(true); setErreur(null); setChoix('traitee') }}
        className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-[#F59E0B]/50 text-[#F59E0B] bg-[#F59E0B]/10 font-semibold whitespace-nowrap hover:bg-[#F59E0B]/25 hover:border-[#F59E0B] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-150"
      >
        Traiter
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
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#F0F6FC]">Traiter l&apos;infraction</h3>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="cursor-pointer p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Sélection du statut */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setChoix('traitee')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  choix === 'traitee'
                    ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                    : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:bg-[#21262D]'
                }`}
              >
                <CheckCircle2 size={24} strokeWidth={2} />
                <div className="text-center">
                  <p className="text-xs font-bold">Traitée</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Infraction résolue</p>
                </div>
              </button>

              <button
                onClick={() => setChoix('contestee')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  choix === 'contestee'
                    ? 'border-[#A78BFA] bg-[#A78BFA]/10 text-[#A78BFA]'
                    : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:bg-[#21262D]'
                }`}
              >
                <RotateCcw size={24} strokeWidth={2} />
                <div className="text-center">
                  <p className="text-xs font-bold">Contestée</p>
                  <p className="text-[10px] opacity-70 mt-0.5">En attente vérif.</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-[#8B949E] mb-5 leading-relaxed">
              {choix === 'traitee'
                ? 'L\'infraction sera clôturée. Cette décision est enregistrée dans le journal d\'audit.'
                : 'L\'infraction sera signalée comme contestée par le conducteur et mise en attente de vérification.'
              }
            </p>

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
                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 ${
                  choix === 'traitee'
                    ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                    : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                }`}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
