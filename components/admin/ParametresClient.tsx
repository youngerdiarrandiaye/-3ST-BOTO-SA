'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, X, Check, ShieldX } from 'lucide-react'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { toastError, toastSuccess } from '@/lib/toast'

interface TypeInfraction {
  id: string
  code: string
  libelle: string
  gravite: string
  points_retires: number
  suspend_auto: boolean
  retrait_definitif_auto: boolean
  zone_applicable: string
  description: string | null
  actif: boolean
}

const ZONE_LABEL: Record<string, string> = {
  miniere:      'Zone minière',
  hors_miniere: 'Hors zone minière',
  les_deux:     'Toutes zones',
}

const lbl = `block text-xs font-medium text-[#8B949E] mb-1`
const inp = `w-full px-3 py-2 min-h-[38px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`

export default function ParametresClient({ typesInfraction: initial }: { typesInfraction: TypeInfraction[] }) {
  const [types,    setTypes]    = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const [form, setForm] = useState({
    code:                   '',
    libelle:                '',
    gravite:                'mineure',
    points_retires:         '3',
    zone_applicable:        'les_deux',
    suspend_auto:           false,
    retrait_definitif_auto: false,
    description:            '',
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function resetForm() {
    setForm({
      code: '', libelle: '', gravite: 'mineure', points_retires: '3',
      zone_applicable: 'les_deux', suspend_auto: false, retrait_definitif_auto: false, description: '',
    })
    setShowForm(false)
  }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.code.trim())    { toastError.champObligatoire('Code'); return }
    if (!form.libelle.trim()) { toastError.champObligatoire('Libellé'); return }

    const pts = parseInt(form.points_retires, 10)
    if (isNaN(pts) || pts < 1 || pts > 20) {
      toastError.champObligatoire('Points retirés — entre 1 et 20')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('types_infraction')
      .insert({
        code:                   form.code.trim().toUpperCase(),
        libelle:                form.libelle.trim(),
        gravite:                form.gravite,
        points_retires:         pts,
        zone_applicable:        form.zone_applicable,
        suspend_auto:           form.suspend_auto,
        retrait_definitif_auto: form.retrait_definitif_auto,
        description:            form.description.trim() || null,
        actif:                  true,
      })
      .select('*')
      .single()

    setLoading(false)

    if (err) {
      if (err.message.includes('duplicate') || err.message.includes('unique')) {
        toastError.matriculeExiste(form.code.trim().toUpperCase())
      } else {
        toastError.erreurServeur()
      }
      return
    }

    setTypes(prev => [...prev, data as TypeInfraction])
    toastSuccess.sauvegarde()
    resetForm()
  }

  async function toggleActif(id: string, actif: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('types_infraction')
      .update({ actif: !actif })
      .eq('id', id)

    if (error) { toastError.erreurServeur(); return }
    setTypes(prev => prev.map(t => t.id === id ? { ...t, actif: !actif } : t))
  }

  const actifs      = types.filter(t => t.actif).length
  const critiques   = types.filter(t => t.gravite === 'critique' || t.gravite === 'eliminatoire').length

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Paramètres</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Configuration des types d&apos;infraction</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg">
            <Settings size={14} className="text-[#F59E0B]" />
            <span className="text-xs font-medium text-[#F59E0B]">Zone admin</span>
          </div>
          <button
            onClick={() => showForm ? resetForm() : setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90 cursor-pointer transition-opacity"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Annuler' : 'Nouveau type'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',          val: types.length, color: 'text-[#F0F6FC]' },
          { label: 'Actifs',         val: actifs,       color: 'text-green-400' },
          { label: 'Critique / Élim', val: critiques,   color: 'text-red-400'   },
        ].map(s => (
          <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <p className="text-xs text-[#8B949E]">{s.label}</p>
            <p className={`text-2xl font-black font-mono mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={handleCreate}
          className="bg-[#161B22] border border-[#F59E0B]/20 rounded-xl p-5 space-y-4">
          <p className="text-sm font-bold text-[#F0F6FC]">Nouveau type d&apos;infraction</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Code */}
            <div>
              <label className={lbl}>Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value)}
                placeholder="VIT-001" required
                className={`${inp} uppercase font-mono`} />
            </div>

            {/* Gravité */}
            <div>
              <label className={lbl}>Gravité *</label>
              <select value={form.gravite} onChange={e => set('gravite', e.target.value)}
                className={`${inp} cursor-pointer`}>
                <option value="mineure">Mineure</option>
                <option value="majeure">Majeure</option>
                <option value="critique">Critique</option>
                <option value="eliminatoire">Éliminatoire</option>
              </select>
            </div>

            {/* Libellé */}
            <div className="sm:col-span-2">
              <label className={lbl}>Libellé *</label>
              <input value={form.libelle} onChange={e => set('libelle', e.target.value)}
                placeholder="Description courte de l'infraction" required
                className={inp} />
            </div>

            {/* Points */}
            <div>
              <label className={lbl}>Points retirés * (1–20)</label>
              <input type="number" min="1" max="20"
                value={form.points_retires} onChange={e => set('points_retires', e.target.value)}
                className={inp} />
            </div>

            {/* Zone applicable */}
            <div>
              <label className={lbl}>Zone applicable *</label>
              <select value={form.zone_applicable} onChange={e => set('zone_applicable', e.target.value)}
                className={`${inp} cursor-pointer`}>
                <option value="les_deux">Toutes zones</option>
                <option value="miniere">Zone minière uniquement</option>
                <option value="hors_miniere">Hors zone minière uniquement</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4">
              {/* Suspension auto */}
              <label className="flex items-center gap-3 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border border-[#30363D] bg-[#0D1117] hover:border-[#F59E0B]/30 transition-colors">
                <button type="button" onClick={() => set('suspend_auto', !form.suspend_auto)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer
                    ${form.suspend_auto ? 'bg-[#EF4444]' : 'bg-[#30363D]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                    ${form.suspend_auto ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <p className={`text-xs font-bold ${form.suspend_auto ? 'text-red-400' : 'text-[#8B949E]'}`}>
                    Suspension automatique
                  </p>
                  <p className="text-[10px] text-[#484F58]">Suspend le conducteur à chaque infraction</p>
                </div>
              </label>

              {/* Retrait définitif auto */}
              <label className="flex items-center gap-3 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border border-[#30363D] bg-[#0D1117] hover:border-[#EF4444]/30 transition-colors">
                <button type="button" onClick={() => set('retrait_definitif_auto', !form.retrait_definitif_auto)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer
                    ${form.retrait_definitif_auto ? 'bg-[#EF4444]' : 'bg-[#30363D]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                    ${form.retrait_definitif_auto ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <p className={`text-xs font-bold flex items-center gap-1.5 ${form.retrait_definitif_auto ? 'text-red-400' : 'text-[#8B949E]'}`}>
                    {form.retrait_definitif_auto && <ShieldX size={11} />}
                    Retrait définitif auto
                  </p>
                  <p className="text-[10px] text-[#484F58]">Révocation immédiate et permanente</p>
                </div>
              </label>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className={lbl}>Description <span className="text-[#484F58] font-normal">(optionnel)</span></label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="Détails supplémentaires sur ce type d'infraction…"
                className={`${inp} resize-none`} />
            </div>
          </div>

          {/* Avertissement retrait définitif */}
          {form.retrait_definitif_auto && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl">
              <ShieldX size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300/80">
                Le retrait définitif automatique révoque immédiatement et définitivement le permis du conducteur.
                Réservé aux infractions éliminatoires.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={resetForm}
              className="px-4 py-2 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] cursor-pointer transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity">
              <Check size={14} />
              {loading ? 'Création…' : 'Créer le type'}
            </button>
          </div>
        </form>
      )}

      {/* Tableau */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#30363D] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#F0F6FC]">Types d&apos;infraction</p>
          <p className="text-xs text-[#8B949E]">{types.length} type{types.length !== 1 ? 's' : ''}</p>
        </div>

        {types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Settings size={36} className="text-[#30363D] mb-3" />
            <p className="text-[#8B949E] text-sm">Aucun type configuré</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-[#F59E0B] hover:opacity-70 transition-opacity cursor-pointer">
              Créer le premier type →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Libellé</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Gravité</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Pts</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Zone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden lg:table-cell">Auto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-[#21262D] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#F0F6FC]">{t.code}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-[#F0F6FC]">{t.libelle}</p>
                      {t.description && (
                        <p className="text-[10px] text-[#484F58] mt-0.5 max-w-[240px] truncate">{t.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <GraviteBadge gravite={t.gravite} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-400">−{t.points_retires}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-[#8B949E]">{ZONE_LABEL[t.zone_applicable] ?? t.zone_applicable}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        {t.suspend_auto && (
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Suspension</span>
                        )}
                        {t.retrait_definitif_auto && (
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide flex items-center gap-1">
                            <ShieldX size={10} />Retrait déf.
                          </span>
                        )}
                        {!t.suspend_auto && !t.retrait_definitif_auto && (
                          <span className="text-[10px] text-[#484F58]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActif(t.id, t.actif)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer
                          ${t.actif
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.actif ? 'bg-green-400' : 'bg-gray-500'}`} />
                        {t.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
