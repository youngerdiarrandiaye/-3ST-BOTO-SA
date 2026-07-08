'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, X, Check } from 'lucide-react'
import GraviteBadge from '@/components/ui/GraviteBadge'

interface TypeInfraction {
  id: string
  code: string
  libelle: string
  gravite: string
  points_retires: number
  suspend_auto: boolean
  description: string | null
  actif: boolean
}

export default function ParametresClient({ typesInfraction: initial }: { typesInfraction: TypeInfraction[] }) {
  const [types, setTypes] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    code: '', libelle: '', gravite: 'mineure', points_retires: '3', suspend_auto: false, description: '',
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.code.trim() || !form.libelle.trim()) { setError('Code et libellé sont requis'); return }

    setLoading(true)
    const supabase = createClient()

    const { data, error: err } = await supabase.from('types_infraction').insert({
      code:           form.code.trim().toUpperCase(),
      libelle:        form.libelle.trim(),
      gravite:        form.gravite,
      points_retires: parseInt(form.points_retires, 10) || 1,
      suspend_auto:   form.suspend_auto,
      description:    form.description || null,
      actif:          true,
    }).select('*').single()

    if (err) { setError(err.message); setLoading(false); return }

    setTypes(prev => [...prev, data as TypeInfraction])
    setForm({ code: '', libelle: '', gravite: 'mineure', points_retires: '3', suspend_auto: false, description: '' })
    setShowForm(false)
    setLoading(false)
  }

  async function toggleActif(id: string, actif: boolean) {
    const supabase = createClient()
    await supabase.from('types_infraction').update({ actif: !actif }).eq('id', id)
    setTypes(prev => prev.map(t => t.id === id ? { ...t, actif: !actif } : t))
  }

  const actifs    = types.filter(t => t.actif).length
  const critiques = types.filter(t => t.gravite === 'critique').length

  return (
    <div className="space-y-6">

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
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90 cursor-pointer"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Annuler' : 'Nouveau type'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', val: types.length },
          { label: 'Actifs', val: actifs },
          { label: 'Critiques', val: critiques },
        ].map(s => (
          <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <p className="text-xs text-[#8B949E]">{s.label}</p>
            <p className="text-2xl font-black font-mono mt-1 text-[#F0F6FC]">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#161B22] border border-[#F59E0B]/20 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-[#F0F6FC]">Nouveau type d&apos;infraction</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1">Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value)} required placeholder="EX: VIT-001"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1">Gravité *</label>
              <select value={form.gravite} onChange={e => set('gravite', e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B] cursor-pointer">
                <option value="mineure">Mineure</option>
                <option value="majeure">Majeure</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8B949E] mb-1">Libellé *</label>
              <input value={form.libelle} onChange={e => set('libelle', e.target.value)} required placeholder="Description courte de l'infraction"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1">Points retirés *</label>
              <input type="number" min="1" max="20" value={form.points_retires} onChange={e => set('points_retires', e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#F59E0B]" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => set('suspend_auto', !form.suspend_auto)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer
                    ${form.suspend_auto ? 'bg-[#EF4444]' : 'bg-[#30363D]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                    ${form.suspend_auto ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-[#8B949E]">Suspension automatique</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8B949E] mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                placeholder="Description détaillée optionnelle"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] resize-none" />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer">
              <Check size={14} />
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {/* Table types d'infraction */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#30363D]">
          <p className="text-sm font-semibold text-[#F0F6FC]">Types d&apos;infraction</p>
        </div>
        {types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Settings size={36} className="text-[#30363D] mb-3" />
            <p className="text-[#8B949E] text-sm">Aucun type configuré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Libellé</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Gravité</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Points</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Suspend. auto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-[#21262D] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#F0F6FC]">{t.code}</td>
                    <td className="px-5 py-3.5 text-[#F0F6FC]">{t.libelle}</td>
                    <td className="px-5 py-3.5">
                      <GraviteBadge gravite={t.gravite} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-400">-{t.points_retires}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {t.suspend_auto
                        ? <span className="text-xs text-red-400">Oui</span>
                        : <span className="text-xs text-[#8B949E]">Non</span>
                      }
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
