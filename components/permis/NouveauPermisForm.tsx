'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { ZoneValidite } from '@/lib/types'

interface Conducteur {
  id: string; matricule: string; nom: string; prenom: string
  // V2
  validation_sst: boolean; validation_clinique: boolean; zone_validite: ZoneValidite | null
}

interface RenewData {
  numero: string
  categories: string[]
  zone_validite: string | null
  type_permis_site: string | null
  validation_sst: boolean
  validation_clinique: boolean
}

interface Props {
  conducteurs: Conducteur[]
  conducteurIdDefault?: string
  delivreurId: string
  renewData?: RenewData
}

const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const TYPES_PERMIS_SITE = [
  'Léger (VL)',
  'Poids lourd (PL)',
  'Engin minier',
  'Transport de matières dangereuses',
  'Conduite sur piste minière',
]

const ZONES: { value: ZoneValidite; label: string }[] = [
  { value: 'miniere',        label: 'Zone minière' },
  { value: 'administrative', label: 'Zone administrative' },
  { value: 'les_deux',       label: 'Toutes les zones' },
]

function genNumero(matricule: string) {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PI-${year}-${matricule.replace(/[^A-Z0-9]/gi, '')}-${rand}`.toUpperCase()
}

export default function NouveauPermisForm({ conducteurs, conducteurIdDefault, delivreurId, renewData }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const today       = new Date().toISOString().slice(0, 10)
  const oneYearLater = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)

  const [form, setForm] = useState({
    conducteur_id:    conducteurIdDefault ?? '',
    date_delivrance:  today,
    date_expiration:  oneYearLater,
    // V2
    zone_validite:    (renewData?.zone_validite ?? '') as ZoneValidite | '',
    type_permis_site: renewData?.type_permis_site ?? '',
    validation_sst:    renewData?.validation_sst ?? false,
    validation_clinique: renewData?.validation_clinique ?? false,
  })
  const [categories, setCategories] = useState<string[]>(renewData?.categories ?? [])
  const [permisActif, setPermisActif] = useState<{ numero: string; statut: string } | null>(null)

  useEffect(() => {
    if (!form.conducteur_id) { setPermisActif(null); return }
    const supabase = createClient()
    supabase
      .from('permis_internes')
      .select('numero, statut, date_expiration')
      .eq('conducteur_id', form.conducteur_id)
      .in('statut', ['valide', 'suspendu'])
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setPermisActif(null); return }
        // Un permis valide dont la date est passée n'est pas bloquant
        if (data.statut === 'valide' && data.date_expiration && new Date(data.date_expiration) < new Date()) {
          setPermisActif(null)
        } else {
          setPermisActif(data as any)
        }
      })
  }, [form.conducteur_id])

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function toggleCat(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const selectedConducteur = conducteurs.find(c => c.id === form.conducteur_id)

  const sst_manquante      = !!selectedConducteur && !selectedConducteur.validation_sst
  const clinique_manquante = !!selectedConducteur && !selectedConducteur.validation_clinique
  const validations_bloquantes = sst_manquante || clinique_manquante

  const dateDelivrancePassee = form.date_delivrance < today
  const dateExpirationInvalide = form.date_expiration <= form.date_delivrance

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.conducteur_id)    { setError('Sélectionnez un conducteur'); return }
    if (categories.length === 0) { setError('Sélectionnez au moins une catégorie'); return }
    if (dateDelivrancePassee) {
      setError('La date de délivrance ne peut pas être antérieure à aujourd\'hui.')
      return
    }
    if (dateExpirationInvalide) {
      setError('La date d\'expiration doit être postérieure à la date de délivrance.')
      return
    }
    if (validations_bloquantes) {
      setError(`Impossible de délivrer le permis : ${[sst_manquante && 'validation SST', clinique_manquante && 'visite médicale clinique'].filter(Boolean).join(' et ')} manquante(s).`)
      return
    }
    if (permisActif) { setError(`Ce conducteur a déjà un permis interne actif (N° ${permisActif.numero}).`); return }

    setLoading(true)
    const supabase = createClient()
    const numero   = genNumero(selectedConducteur?.matricule ?? 'XX')

    const { error: err } = await supabase.from('permis_internes').insert({
      conducteur_id:   form.conducteur_id,
      numero,
      categories,
      date_delivrance: form.date_delivrance,
      date_expiration: form.date_expiration,
      delivre_par:     delivreurId,
      statut:          'valide',
      qr_code_url:     null,
      // V2
      zone_validite:      form.zone_validite      || null,
      type_permis_site:   form.type_permis_site   || null,
      validation_sst:     form.validation_sst,
      validation_clinique: form.validation_clinique,
    })

    if (err) {
      const msg = err.message
      if (msg.includes('PERMIS_DATE_PASSE'))
        setError('La date de délivrance ne peut pas être antérieure à aujourd\'hui.')
      else if (msg.includes('PERMIS_DATE_INVALIDE'))
        setError('La date d\'expiration doit être postérieure à la date de délivrance.')
      else if (msg.includes('idx_permis_unique_actif') || msg.includes('PERMIS_ACTIF_EXISTS') || msg.includes('déjà un permis interne actif'))
        setError('Ce conducteur a déjà un permis interne actif ou suspendu. Retirez-le avant d\'en créer un nouveau.')
      else setError(msg)
      setLoading(false)
      return
    }

    router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/permis')
    router.refresh()
  }

  const inputCls = `w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`
  const labelCls = `block text-sm font-medium text-[#8B949E] mb-1.5`

  return (
    <form onSubmit={handleSubmit} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-5">

      {/* Conducteur */}
      <div>
        <label className={labelCls}>Conducteur *</label>
        <SearchableSelect
          value={form.conducteur_id}
          onChange={v => set('conducteur_id', v)}
          placeholder="Rechercher un conducteur…"
          options={conducteurs.map(c => ({
            value: c.id,
            label: `${c.prenom} ${c.nom}`,
            sublabel: c.matricule,
          }))}
        />

        {/* Blocage habilitations — hard block */}
        {validations_bloquantes && (
          <div className="mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2">
              <Ban size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-400">Délivrance bloquée — habilitations manquantes</p>
            </div>
            {sst_manquante && (
              <p className="text-xs text-[#F0F6FC]/70 ml-5">
                ✗ Habilitation SST non validée
              </p>
            )}
            {clinique_manquante && (
              <p className="text-xs text-[#F0F6FC]/70 ml-5">
                ✗ Visite médicale clinique non validée
              </p>
            )}
            <p className="text-xs text-red-400/70 ml-5 mt-1">
              Complétez les validations dans la fiche conducteur avant de délivrer le permis.
            </p>
          </div>
        )}

        {/* Blocage permis actif — hard block */}
        {permisActif && (
          <div className="mt-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <Ban size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-400">Permis interne en cours — délivrance bloquée</p>
            </div>
            <p className="text-xs text-[#F0F6FC]/70 ml-5">
              N° <span className="font-mono font-bold text-red-300">{permisActif.numero}</span>
              {' '}({permisActif.statut === 'suspendu' ? 'suspendu' : 'valide'}) — retirez-le avant d&apos;en délivrer un nouveau.
            </p>
          </div>
        )}
      </div>

      {/* Catégories */}
      <div>
        <label className={labelCls}>Catégories *</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} type="button" onClick={() => toggleCat(cat)}
              className={`cursor-pointer w-10 h-10 rounded-lg text-sm font-bold border transition-all duration-150
                ${categories.includes(cat)
                  ? 'bg-[#F59E0B] text-[#0D1117] border-[#F59E0B]'
                  : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:border-[#F59E0B]/40'}`}>
              {cat}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <p className="text-xs text-[#8B949E] mt-2">Sélectionnées : {categories.sort().join(', ')}</p>
        )}
      </div>

      {/* Zone + Type permis site */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Zone de validité</label>
          <select value={form.zone_validite} onChange={e => set('zone_validite', e.target.value)}
            className={`${inputCls} cursor-pointer`}>
            <option value="">Non définie</option>
            {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type de permis site</label>
          <select value={form.type_permis_site} onChange={e => set('type_permis_site', e.target.value)}
            className={`${inputCls} cursor-pointer`}>
            <option value="">Non défini</option>
            {TYPES_PERMIS_SITE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Habilitations sur le permis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.validation_sst}
            onChange={e => set('validation_sst', e.target.checked)}
            className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
          <span className="text-sm text-[#F0F6FC]">SST validée au moment de la délivrance</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.validation_clinique}
            onChange={e => set('validation_clinique', e.target.checked)}
            className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
          <span className="text-sm text-[#F0F6FC]">Visite médicale validée</span>
        </label>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de délivrance *</label>
          <input type="date" value={form.date_delivrance}
            onChange={e => set('date_delivrance', e.target.value)} required
            min={today}
            className={`${inputCls} [color-scheme:dark] ${dateDelivrancePassee ? 'border-red-500/60 focus:border-red-500' : ''}`} />
          {dateDelivrancePassee && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={11} className="flex-shrink-0" />
              La date de délivrance ne peut pas être dans le passé.
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Date d&apos;expiration *</label>
          <input type="date" value={form.date_expiration}
            onChange={e => set('date_expiration', e.target.value)} required
            min={form.date_delivrance}
            className={`${inputCls} [color-scheme:dark] ${dateExpirationInvalide ? 'border-red-500/60 focus:border-red-500' : ''}`} />
          {dateExpirationInvalide && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={11} className="flex-shrink-0" />
              La date d&apos;expiration doit être postérieure à la date de délivrance.
            </p>
          )}
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
        <button type="submit" disabled={loading || !!permisActif || validations_bloquantes || dateDelivrancePassee || dateExpirationInvalide}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50
            ${(permisActif || validations_bloquantes || dateDelivrancePassee || dateExpirationInvalide)
              ? 'bg-[#30363D] text-[#8B949E] cursor-not-allowed'
              : 'bg-[#F59E0B] text-[#0D1117] hover:scale-[1.02] active:scale-[0.98]'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}>
          {loading ? 'Enregistrement…'
            : permisActif ? 'Délivrance bloquée'
            : validations_bloquantes ? 'Habilitations requises'
            : dateDelivrancePassee ? 'Date de délivrance invalide'
            : dateExpirationInvalide ? 'Dates incohérentes'
            : 'Délivrer le permis'}
        </button>
      </div>
    </form>
  )
}
