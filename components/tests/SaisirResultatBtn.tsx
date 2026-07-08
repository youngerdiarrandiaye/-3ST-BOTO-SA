'use client'

import { useState } from 'react'
import { X, Loader2, CheckSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  testId: string
}

export default function SaisirResultatBtn({ testId }: Props) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [resultat,     setResultat]     = useState<'' | 'reussi' | 'echoue'>('')
  const [score,        setScore]        = useState('')
  const [observations, setObservations] = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!resultat) { setError('Sélectionnez un résultat'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultat,
          score:        score !== '' ? Number(score) : null,
          observations: observations || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 transition-colors`
  const labelCls = `block text-xs font-semibold text-[#8B949E] mb-1.5 uppercase tracking-wide`

  return (
    <>
      <button
        onClick={() => { setResultat(''); setScore(''); setObservations(''); setError(''); setOpen(true) }}
        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border
          text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/5
          hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50
          active:scale-[0.97] transition-all duration-150"
      >
        <CheckSquare size={12} />
        Saisir résultat
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl flex flex-col cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D]">
              <h3 className="text-base font-bold text-[#F0F6FC]">Saisir le résultat</h3>
              <button onClick={() => setOpen(false)} disabled={loading}
                className="cursor-pointer p-2 text-[#8B949E] hover:text-[#F0F6FC] rounded-lg hover:bg-[#21262D] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form id="saisir-resultat-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Résultat */}
              <div>
                <label className={labelCls}>Résultat *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setResultat('reussi')}
                    className={`cursor-pointer py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                      resultat === 'reussi'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-[#30363D] text-[#8B949E] hover:border-green-500/40'
                    }`}>
                    ✓ Réussi
                  </button>
                  <button type="button" onClick={() => setResultat('echoue')}
                    className={`cursor-pointer py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                      resultat === 'echoue'
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-[#30363D] text-[#8B949E] hover:border-red-500/40'
                    }`}>
                    ✗ Échoué
                  </button>
                </div>
              </div>

              {/* Score */}
              <div>
                <label className={labelCls}>Score (0 – 100)</label>
                <input type="number" min={0} max={100} value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder="Ex : 87" className={inputCls} />
              </div>

              {/* Observations */}
              <div>
                <label className={labelCls}>Observations</label>
                <textarea value={observations} onChange={e => setObservations(e.target.value)}
                  rows={2} placeholder="Remarques sur le test…"
                  className={`${inputCls} resize-none`} />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-[#30363D]">
              <button type="button" onClick={() => setOpen(false)} disabled={loading}
                className="cursor-pointer flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40">
                Annuler
              </button>
              <button type="submit" form="saisir-resultat-form" disabled={loading}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
