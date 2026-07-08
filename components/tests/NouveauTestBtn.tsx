'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, ClipboardCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Evaluateur { id: string; nom: string; prenom: string }

export default function NouveauTestBtn({ conducteurId }: { conducteurId: string }) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [evals,   setEvals]   = useState<Evaluateur[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    date_test:         today,
    type:              'initial' as 'initial' | 'reprise',
    evaluateur_id:     '',
    saisir_maintenant: false,
    resultat:          '' as '' | 'reussi' | 'echoue',
    score:             '',
    observations:      '',
  })

  useEffect(() => {
    if (!open) return
    createClient()
      .from('utilisateurs')
      .select('id, nom, prenom')
      .in('role', ['admin', 'hse', 'sst'])
      .eq('actif', true)
      .order('nom')
      .then(({ data }) => setEvals(data ?? []))
  }, [open])

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (form.saisir_maintenant && !form.resultat) { setError('Sélectionnez un résultat'); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        conducteur_id: conducteurId,
        date_test:     form.date_test,
        type:          form.type,
        evaluateur_id: form.evaluateur_id || null,
      }
      if (form.saisir_maintenant && form.resultat) {
        body.resultat     = form.resultat
        body.score        = form.score !== '' ? Number(form.score) : null
        body.observations = form.observations || null
      }
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        onClick={() => { setForm(f => ({ ...f, date_test: today, type: 'initial', evaluateur_id: '', saisir_maintenant: false, resultat: '', score: '', observations: '' })); setError(''); setOpen(true) }}
        className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] text-sm font-medium rounded-lg
          hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#F59E0B]/40 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15)]
          active:scale-[0.97] transition-all duration-150"
      >
        <Plus size={14} />
        Nouveau test
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90dvh] flex flex-col cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D]">
              <div className="flex items-center gap-3">
                <ClipboardCheck size={18} className="text-[#F59E0B]" />
                <h3 className="text-base font-bold text-[#F0F6FC]">Nouveau test de conduite</h3>
              </div>
              <button onClick={() => setOpen(false)} disabled={loading}
                className="cursor-pointer p-2 text-[#8B949E] hover:text-[#F0F6FC] rounded-lg hover:bg-[#21262D] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form id="nouveau-test-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Date */}
              <div>
                <label className={labelCls}>Date du test *</label>
                <input type="date" value={form.date_test} onChange={e => set('date_test', e.target.value)}
                  required className={`${inputCls} [color-scheme:dark]`} />
              </div>

              {/* Type */}
              <div>
                <label className={labelCls}>Type de test</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['initial', 'reprise'] as const).map(t => (
                    <button key={t} type="button" onClick={() => set('type', t)}
                      className={`cursor-pointer py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                        form.type === t
                          ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]'
                          : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E]'
                      }`}>
                      {t === 'initial' ? 'Initial' : 'Reprise'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Évaluateur */}
              <div>
                <label className={labelCls}>Évaluateur</label>
                <select value={form.evaluateur_id} onChange={e => set('evaluateur_id', e.target.value)}
                  className={`${inputCls} cursor-pointer`}>
                  <option value="">— Non assigné —</option>
                  {evals.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.prenom} {ev.nom}</option>
                  ))}
                </select>
              </div>

              {/* Saisir résultat maintenant */}
              <div className="pt-3 border-t border-[#30363D]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.saisir_maintenant}
                    onChange={e => set('saisir_maintenant', e.target.checked)}
                    className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
                  <span className="text-sm text-[#F0F6FC]">Saisir le résultat maintenant</span>
                </label>
              </div>

              {form.saisir_maintenant && (
                <div className="space-y-4 pl-1">
                  {/* Résultat */}
                  <div>
                    <label className={labelCls}>Résultat *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => set('resultat', 'reussi')}
                        className={`cursor-pointer py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                          form.resultat === 'reussi'
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : 'border-[#30363D] text-[#8B949E] hover:border-green-500/40'
                        }`}>
                        ✓ Réussi
                      </button>
                      <button type="button" onClick={() => set('resultat', 'echoue')}
                        className={`cursor-pointer py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                          form.resultat === 'echoue'
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
                    <input type="number" min={0} max={100} value={form.score}
                      onChange={e => set('score', e.target.value)}
                      placeholder="Ex : 87" className={inputCls} />
                  </div>

                  {/* Observations */}
                  <div>
                    <label className={labelCls}>Observations</label>
                    <textarea value={form.observations} onChange={e => set('observations', e.target.value)}
                      rows={3} placeholder="Remarques sur le déroulement du test…"
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </form>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#30363D]">
              <button type="button" onClick={() => setOpen(false)} disabled={loading}
                className="cursor-pointer flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40">
                Annuler
              </button>
              <button type="submit" form="nouveau-test-form" disabled={loading}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
