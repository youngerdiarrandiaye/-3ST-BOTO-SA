'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { ResultatTest } from '@/lib/types'

interface Conducteur { id: string; matricule: string; nom: string; prenom: string }

interface FormationData {
  id: string
  conducteur_id: string
  organisme: string
  date_debut: string
  date_fin: string | null
  points_recuperes: number
  statut: string
  theme: string | null
  formateur_nom: string | null
  formateur_qualif: string | null
  nb_seances: number
  nb_seances_faites: number
  duree_par_seance: number | null
  test_reprise_requis: boolean
  test_reprise_resultat: ResultatTest | null
  test_reprise_date: string | null
}

interface Props {
  conducteurs: Conducteur[]
  conducteurIdDefault?: string
  formation?: FormationData
}

const THEMES = [
  'Sécurité routière minière',
  'Code de la route BOTO SA',
  'Conduite défensive',
  'Gestion des risques mine',
  'Premiers secours — SST',
  'Remise à niveau — Suite retrait définitif',
  'Autre',
]

export default function NouvelleFormationForm({ conducteurs, conducteurIdDefault, formation }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isEdit = Boolean(formation)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    conducteur_id:        formation?.conducteur_id   ?? conducteurIdDefault ?? '',
    organisme:            formation?.organisme       ?? '',
    date_debut:           formation?.date_debut      ?? today,
    date_fin:             formation?.date_fin        ?? '',
    points_recuperes:     String(formation?.points_recuperes ?? 0),
    statut:               formation?.statut          ?? 'en_cours',
    // V2
    theme:                formation?.theme           ?? '',
    formateur_nom:        formation?.formateur_nom   ?? '',
    formateur_qualif:     formation?.formateur_qualif ?? '',
    nb_seances:           String(formation?.nb_seances       ?? 1),
    nb_seances_faites:    String(formation?.nb_seances_faites ?? 0),
    duree_par_seance:     formation?.duree_par_seance ? String(formation.duree_par_seance) : '',
    test_reprise_requis:  formation?.test_reprise_requis ?? false,
    test_reprise_resultat: (formation?.test_reprise_resultat ?? '') as ResultatTest | '',
    test_reprise_date:    formation?.test_reprise_date ?? '',
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.conducteur_id)    { setError('Sélectionnez un conducteur'); return }
    if (!form.organisme.trim()) { setError("Renseignez l'organisme de formation"); return }

    setLoading(true)

    const res = await fetch(isEdit ? `/api/formations/${formation!.id}` : '/api/formations', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(!isEdit && { conducteur_id: form.conducteur_id }),
        ...(!isEdit && { statut: form.statut }),
        organisme:            form.organisme.trim(),
        date_debut:           form.date_debut,
        date_fin:             form.date_fin || null,
        points_recuperes:     form.points_recuperes,
        // V2
        theme:                form.theme              || null,
        formateur_nom:        form.formateur_nom       || null,
        formateur_qualif:     form.formateur_qualif    || null,
        nb_seances:           form.nb_seances,
        nb_seances_faites:    form.nb_seances_faites,
        duree_par_seance:     form.duree_par_seance    || null,
        test_reprise_requis:  form.test_reprise_requis,
        test_reprise_resultat: form.test_reprise_requis ? (form.test_reprise_resultat || null) : null,
        test_reprise_date:    form.test_reprise_requis ? (form.test_reprise_date     || null) : null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur serveur')
      setLoading(false)
      return
    }

    router.push(
      isEdit
        ? `/formations/${formation!.id}`
        : conducteurIdDefault
          ? `/conducteurs/${form.conducteur_id}`
          : '/formations'
    )
    router.refresh()
  }

  const inputCls = `w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`
  const labelCls = `block text-sm font-medium text-[#8B949E] mb-1.5`
  const sectionCls = `pt-4 border-t border-[#30363D]`

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
      </div>

      {/* Organisme + Thème */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Organisme de formation *</label>
          <input type="text" value={form.organisme} onChange={e => set('organisme', e.target.value)}
            placeholder="INPP, FOREM, interne…" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Thème</label>
          <select value={form.theme} onChange={e => set('theme', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Sélectionner un thème</option>
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Formateur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Formateur (nom)</label>
          <input value={form.formateur_nom} onChange={e => set('formateur_nom', e.target.value)}
            placeholder="Nom du formateur" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Qualification formateur</label>
          <input value={form.formateur_qualif} onChange={e => set('formateur_qualif', e.target.value)}
            placeholder="Ex : Formateur SST agréé" className={inputCls} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de début *</label>
          <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)}
            required className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Date de fin</label>
          <input type="date" value={form.date_fin} onChange={e => set('date_fin', e.target.value)}
            min={form.date_debut} className={`${inputCls} [color-scheme:dark]`} />
        </div>
      </div>

      {/* Séances */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Séances</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Nb séances prévues</label>
            <input type="number" value={form.nb_seances} onChange={e => set('nb_seances', e.target.value)}
              min="1" max="20" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Séances réalisées</label>
            <input type="number" value={form.nb_seances_faites}
              onChange={e => set('nb_seances_faites', e.target.value)}
              min="0" max={form.nb_seances} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Durée / séance (min)</label>
            <input type="number" value={form.duree_par_seance}
              onChange={e => set('duree_par_seance', e.target.value)}
              min="30" placeholder="60" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Statut + Points */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Résultat</p>
        {isEdit ? (
          /* In edit mode, statut is managed by action buttons — only points are editable here */
          <div className="space-y-3">
            <div className="max-w-xs">
              <label className={labelCls}>
                Points récupérés
                {formation?.statut !== 'validee' && (
                  <span className="ml-1 text-xs text-[#30363D]">(appliqués si validée)</span>
                )}
              </label>
              <input type="number" value={form.points_recuperes}
                onChange={e => set('points_recuperes', e.target.value)}
                min="0" max="20" className={inputCls} />
            </div>
            <p className="text-xs text-[#8B949E]">
              Pour changer le statut, utilisez les boutons d&apos;action sur la page de détail.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Statut *</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="en_cours">En cours</option>
                <option value="validee">Validée</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Points récupérés
                {form.statut !== 'validee' && (
                  <span className="ml-1 text-xs text-[#30363D]">(si validée)</span>
                )}
              </label>
              <input type="number" value={form.points_recuperes}
                onChange={e => set('points_recuperes', e.target.value)}
                min="0" max="20" disabled={form.statut !== 'validee'}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`} />
            </div>
          </div>
        )}
      </div>

      {/* Test de reprise */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Test de reprise</p>
        <label className="flex items-center gap-2.5 cursor-pointer mb-4">
          <input type="checkbox" checked={form.test_reprise_requis}
            onChange={e => set('test_reprise_requis', e.target.checked)}
            className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
          <span className="text-sm text-[#F0F6FC]">Test de reprise requis à l&apos;issue de cette formation</span>
        </label>

        {form.test_reprise_requis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Résultat du test</label>
              <select value={form.test_reprise_resultat}
                onChange={e => set('test_reprise_resultat', e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">Non passé</option>
                <option value="en_attente">En attente</option>
                <option value="reussi">Réussi</option>
                <option value="echoue">Échoué</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date du test</label>
              <input type="date" value={form.test_reprise_date}
                onChange={e => set('test_reprise_date', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>
          </div>
        )}
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
          {loading ? 'Enregistrement…' : isEdit ? 'Sauvegarder les modifications' : 'Enregistrer la formation'}
        </button>
      </div>
    </form>
  )
}
