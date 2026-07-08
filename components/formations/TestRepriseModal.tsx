'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, X, Loader2 } from 'lucide-react'
import type { ResultatTest } from '@/lib/types'

interface Props {
  formationId: string
  resultatActuel: ResultatTest | null
}

export default function TestRepriseModal({ formationId, resultatActuel }: Props) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [resultat, setResultat] = useState<ResultatTest>(resultatActuel ?? 'en_attente')
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0])

  async function handleSave() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/formations/${formationId}/test-reprise`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resultat, date }),
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

  const OPTS: { val: ResultatTest; label: string; cls: string }[] = [
    { val: 'reussi',     label: 'Réussi',     cls: 'border-green-500/40 bg-green-500/5 text-green-400 hover:bg-green-500/15' },
    { val: 'echoue',     label: 'Échoué',     cls: 'border-red-500/40 bg-red-500/5 text-red-400 hover:bg-red-500/15' },
    { val: 'en_attente', label: 'En attente', cls: 'border-[#30363D] bg-[#21262D] text-[#8B949E] hover:bg-[#30363D]' },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30
          bg-blue-500/5 text-blue-400 text-sm font-semibold
          hover:bg-blue-500/15 hover:border-blue-500/60
          hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]
          active:scale-[0.97] transition-all duration-150 cursor-pointer"
      >
        <ClipboardCheck size={15} />
        Saisir résultat du test
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F0F6FC]">Test de reprise</h3>
                <button onClick={() => setOpen(false)} disabled={loading}
                  className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded-md hover:bg-[#21262D] cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Résultat */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#8B949E]">Résultat</p>
                <div className="flex gap-2">
                  {OPTS.map(o => (
                    <button
                      key={o.val}
                      onClick={() => setResultat(o.val)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer
                        ${resultat === o.val
                          ? o.cls + ' ring-2 ring-offset-1 ring-offset-[#161B22] ring-current'
                          : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:bg-[#21262D]'
                        }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Date du test</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm
                    text-[#F0F6FC] focus:outline-none focus:border-blue-500/60 transition-colors
                    [color-scheme:dark]"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                    hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                    rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 cursor-pointer">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
