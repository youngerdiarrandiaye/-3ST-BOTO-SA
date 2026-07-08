'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ZoneValidite } from '@/lib/types'

interface Entreprise { id: string; nom: string }

const CATEGORIES_PERMIS = ['A', 'B', 'C', 'D', 'E']
const ZONES: { value: ZoneValidite; label: string }[] = [
  { value: 'miniere',       label: 'Zone minière uniquement' },
  { value: 'administrative', label: 'Zone administrative uniquement' },
  { value: 'les_deux',      label: 'Toutes les zones' },
]

export default function NouveauConducteurForm({ entreprises }: { entreprises: Entreprise[] }) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    matricule:             '',
    nom:                   '',
    prenom:                '',
    date_naissance:        '',
    permis_national:       '',
    permis_civil_autorite: '',
    entreprise_id:         '',
    // V2
    fonction:                '',
    zone_validite:           '' as ZoneValidite | '',
    validation_sst:          false,
    date_validation_sst:     '',
    validation_clinique:     false,
    date_validation_clinique:'',
    contact_urgence_nom:     '',
    contact_urgence_tel:     '',
  })
  const [cats, setCats] = useState<string[]>([])

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function toggleCat(c: string) {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.entreprise_id) { setError('Sélectionnez une entreprise'); return }
    setLoading(true)
    const supabase = createClient()

    const { data: dupMat } = await supabase
      .from('conducteurs').select('id').eq('matricule', form.matricule.trim()).maybeSingle()
    if (dupMat) { setError('Ce matricule est déjà attribué à un autre conducteur.'); setLoading(false); return }

    if (form.permis_national.trim()) {
      const { data: dupPN } = await supabase
        .from('conducteurs').select('id').eq('permis_national', form.permis_national.trim()).maybeSingle()
      if (dupPN) { setError('Ce numéro de permis national est déjà enregistré pour un autre conducteur.'); setLoading(false); return }
    }

    const { error: err } = await supabase.from('conducteurs').insert({
      matricule:               form.matricule,
      nom:                     form.nom,
      prenom:                  form.prenom,
      date_naissance:          form.date_naissance    || null,
      permis_national:         form.permis_national        || null,
      permis_civil_autorite:   form.permis_civil_autorite  || null,
      entreprise_id:           form.entreprise_id,
      statut:                  'inactif',
      // V2
      fonction:                form.fonction?.trim()  || null,
      type_permis_conduite:    cats,
      zone_validite:           form.zone_validite     || null,
      validation_sst:          form.validation_sst,
      date_validation_sst:     form.validation_sst    ? (form.date_validation_sst     || null) : null,
      validation_clinique:     form.validation_clinique,
      date_validation_clinique:form.validation_clinique ? (form.date_validation_clinique || null) : null,
      contact_urgence_nom:     form.contact_urgence_nom?.trim()  || null,
      contact_urgence_tel:     form.contact_urgence_tel?.trim()  || null,
    })
    if (err) {
      const msg = err.message
      if (msg.includes('conducteurs_matricule_unique')) setError('Ce matricule est déjà attribué à un autre conducteur.')
      else if (msg.includes('conducteurs_permis_national_unique')) setError('Ce numéro de permis national est déjà enregistré pour un autre conducteur.')
      else setError(msg)
      setLoading(false)
      return
    }
    router.push('/conducteurs')
    router.refresh()
  }

  const inputCls = `w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`
  const labelCls = `block text-sm font-medium text-[#8B949E] mb-1.5`
  const sectionCls = `pt-4 border-t border-[#30363D]`

  return (
    <form onSubmit={handleSubmit} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-5">

      {/* — Identité — */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Matricule *</label>
          <input value={form.matricule} onChange={e => set('matricule', e.target.value)}
            placeholder="EX-001" required className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Prénom *</label>
          <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
            placeholder="Mamadou" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nom *</label>
          <input value={form.nom} onChange={e => set('nom', e.target.value)}
            placeholder="Diallo" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date de naissance</label>
          <input type="date" value={form.date_naissance}
            onChange={e => set('date_naissance', e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>N° Permis national</label>
          <input value={form.permis_national} onChange={e => set('permis_national', e.target.value)}
            placeholder="SN-2024-123456" className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Autorité émettrice</label>
          <input value={form.permis_civil_autorite} onChange={e => set('permis_civil_autorite', e.target.value)}
            placeholder="Ex : Préfecture de Dakar" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Entreprise *</label>
          <select value={form.entreprise_id} onChange={e => set('entreprise_id', e.target.value)}
            required className={`${inputCls} cursor-pointer`}>
            <option value="">Sélectionner une entreprise</option>
            {entreprises.map(ent => (
              <option key={ent.id} value={ent.id}>{ent.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* — Poste & Zone — */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Poste & Zone</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fonction / Poste</label>
            <input value={form.fonction} onChange={e => set('fonction', e.target.value)}
              placeholder="Chauffeur camion minier" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Zone de validité</label>
            <select value={form.zone_validite} onChange={e => set('zone_validite', e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="">Non définie</option>
              {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* — Catégories de permis national — */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Catégories permis national</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES_PERMIS.map(cat => (
            <button key={cat} type="button" onClick={() => toggleCat(cat)}
              className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all duration-150 cursor-pointer
                ${cats.includes(cat)
                  ? 'bg-[#F59E0B] text-[#0D1117] border-[#F59E0B]'
                  : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:border-[#F59E0B]/40'}`}
            >{cat}</button>
          ))}
        </div>
        {cats.length > 0 && (
          <p className="text-xs text-[#8B949E] mt-2">Sélectionnées : {cats.sort().join(', ')}</p>
        )}
      </div>

      {/* — Habilitations — */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Habilitations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* SST */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.validation_sst}
                onChange={e => set('validation_sst', e.target.checked)}
                className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
              <span className="text-sm text-[#F0F6FC]">Habilitation SST validée</span>
            </label>
            {form.validation_sst && (
              <input type="date" value={form.date_validation_sst}
                onChange={e => set('date_validation_sst', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
                placeholder="Date de validation SST" />
            )}
          </div>
          {/* Clinique */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.validation_clinique}
                onChange={e => set('validation_clinique', e.target.checked)}
                className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
              <span className="text-sm text-[#F0F6FC]">Visite médicale clinique validée</span>
            </label>
            {form.validation_clinique && (
              <input type="date" value={form.date_validation_clinique}
                onChange={e => set('date_validation_clinique', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
                placeholder="Date de visite médicale" />
            )}
          </div>
        </div>
      </div>

      {/* — Contact d'urgence — */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Contact d&apos;urgence</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nom complet</label>
            <input value={form.contact_urgence_nom} onChange={e => set('contact_urgence_nom', e.target.value)}
              placeholder="Ex : Fatou Diallo" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input value={form.contact_urgence_tel} onChange={e => set('contact_urgence_tel', e.target.value)}
              placeholder="+221 77 000 00 00" className={inputCls} />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:border-[#F59E0B]/30 transition-colors cursor-pointer">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
            hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 cursor-pointer disabled:opacity-50"
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}>
          {loading ? 'Enregistrement…' : 'Créer le conducteur'}
        </button>
      </div>
    </form>
  )
}
