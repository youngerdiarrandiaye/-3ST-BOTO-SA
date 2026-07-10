'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, BookOpen, Calendar, BarChart2, FlaskConical, AlertTriangle } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { toastError } from '@/lib/toast'
import type { ResultatTest } from '@/lib/types'

interface Conducteur { id: string; matricule: string; nom: string; prenom: string }

interface FormationData {
  id: string; conducteur_id: string; organisme: string; date_debut: string; date_fin: string | null
  points_recuperes: number; statut: string; theme: string | null; formateur_nom: string | null
  formateur_qualif: string | null; nb_seances: number; nb_seances_faites: number
  duree_par_seance: number | null; test_reprise_requis: boolean
  test_reprise_resultat: ResultatTest | null; test_reprise_date: string | null
  heures_validees: number | null
}

interface Props {
  conducteurs: Conducteur[]
  conducteurIdDefault?: string
  formation?: FormationData
}

const THEMES = [
  'Sécurité routière minière', 'Code de la route BOTO SA', 'Conduite défensive',
  'Gestion des risques mine', 'Premiers secours — SST',
  'Remise à niveau — Suite retrait définitif', 'Autre',
]

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#F59E0B]" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">{title}</span>
      {subtitle && <span className="ml-1 text-[9px] font-semibold text-[#484F58] uppercase tracking-widest">— {subtitle}</span>}
    </div>
  )
}

const inp = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`
const lbl = `block text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1.5`
const errMsg = `mt-1.5 text-[11px] text-red-400 flex items-center gap-1.5`

export default function NouvelleFormationForm({ conducteurs, conducteurIdDefault, formation }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const isEdit = Boolean(formation)
  const today  = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    conducteur_id:         formation?.conducteur_id    ?? conducteurIdDefault ?? '',
    organisme:             formation?.organisme        ?? '',
    date_debut:            formation?.date_debut       ?? today,
    date_fin:              formation?.date_fin         ?? '',
    points_recuperes:      String(formation?.points_recuperes  ?? 0),
    statut:                formation?.statut           ?? 'en_cours',
    theme:                 formation?.theme            ?? '',
    formateur_nom:         formation?.formateur_nom    ?? '',
    formateur_qualif:      formation?.formateur_qualif ?? '',
    nb_seances:            String(formation?.nb_seances       ?? 1),
    nb_seances_faites:     String(formation?.nb_seances_faites ?? 0),
    duree_par_seance:      formation?.duree_par_seance ? String(formation.duree_par_seance) : '',
    test_reprise_requis:   formation?.test_reprise_requis ?? false,
    test_reprise_resultat: (formation?.test_reprise_resultat ?? '') as ResultatTest | '',
    test_reprise_date:     formation?.test_reprise_date ?? '',
    heures_validees:       formation?.heures_validees != null ? String(formation.heures_validees) : '',
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  const selectedCond = conducteurs.find(c => c.id === form.conducteur_id)

  // Validations dérivées
  const datFinAvantDeb   = form.date_fin && form.date_fin < form.date_debut
  const seancesFaitesTrop = parseInt(form.nb_seances_faites) > parseInt(form.nb_seances)
  const pointsBloques    = form.statut !== 'validee' && parseInt(form.points_recuperes) > 0

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.conducteur_id)    { toastError.champObligatoire('Conducteur'); return }
    if (!form.organisme.trim()) { toastError.champObligatoire("Organisme de formation"); return }
    if (datFinAvantDeb)         { toastError.champObligatoire('Date de fin antérieure à la date de début'); return }
    if (seancesFaitesTrop)      { toastError.champObligatoire('Séances réalisées > séances prévues'); return }

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
        theme:                form.theme            || null,
        formateur_nom:        form.formateur_nom     || null,
        formateur_qualif:     form.formateur_qualif  || null,
        nb_seances:           form.nb_seances,
        nb_seances_faites:    form.nb_seances_faites,
        duree_par_seance:     form.duree_par_seance  || null,
        test_reprise_requis:  form.test_reprise_requis,
        test_reprise_resultat: form.test_reprise_requis ? (form.test_reprise_resultat || null) : null,
        test_reprise_date:    form.test_reprise_requis ? (form.test_reprise_date      || null) : null,
        heures_validees:      form.heures_validees ? parseFloat(form.heures_validees) : 0,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toastError.champObligatoire(data.error ?? 'Erreur serveur')
      setLoading(false)
      return
    }

    const { toastSuccess } = await import('@/lib/toast')
    toastSuccess.sauvegarde()
    router.push(
      isEdit ? `/formations/${formation!.id}`
        : conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/formations'
    )
    router.refresh()
  }

  // Progression séances
  const pctSeances = parseInt(form.nb_seances) > 0
    ? Math.min(100, Math.round((parseInt(form.nb_seances_faites) / parseInt(form.nb_seances)) * 100))
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>

      {/* ─── 1. CONDUCTEUR ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={User} title="Conducteur" />
        <div className="p-5 space-y-3">
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
          {selectedCond && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg">
              <div className="w-7 h-7 rounded-lg bg-[#21262D] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-black text-[#8B949E]">{selectedCond.prenom[0]}{selectedCond.nom[0]}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#F0F6FC]">{selectedCond.prenom} {selectedCond.nom}</p>
                <p className="font-mono text-[10px] text-[#8B949E]">{selectedCond.matricule}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. ORGANISME & THÈME ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={BookOpen} title="Organisme & Thème" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Organisme de formation *</label>
            <input type="text" value={form.organisme} onChange={e => set('organisme', e.target.value)}
              placeholder="INPP, FOREM, interne…" className={inp} />
          </div>
          <div>
            <label className={lbl}>Thème</label>
            <select value={form.theme} onChange={e => set('theme', e.target.value)} className={`${inp} cursor-pointer`}>
              <option value="">Sélectionner un thème</option>
              {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Formateur (nom)</label>
            <input value={form.formateur_nom} onChange={e => set('formateur_nom', e.target.value)}
              placeholder="Nom du formateur" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Qualification formateur</label>
            <input value={form.formateur_qualif} onChange={e => set('formateur_qualif', e.target.value)}
              placeholder="Ex : Formateur SST agréé" className={inp} />
          </div>
        </div>
      </div>

      {/* ─── 3. DATES & SÉANCES ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={Calendar} title="Dates & Séances" />
        <div className="p-5 space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date de début *</label>
              <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)}
                className={`${inp} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={lbl}>Date de fin</label>
              <input type="date" value={form.date_fin} onChange={e => set('date_fin', e.target.value)}
                min={form.date_debut}
                className={`${inp} [color-scheme:dark] ${datFinAvantDeb ? '!border-red-500/60' : ''}`} />
              {datFinAvantDeb && (
                <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />Date de fin antérieure au début</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Séances prévues</label>
              <input type="number" value={form.nb_seances} onChange={e => set('nb_seances', e.target.value)}
                min="1" max="50" className={inp} />
            </div>
            <div>
              <label className={lbl}>Séances réalisées</label>
              <input type="number" value={form.nb_seances_faites}
                onChange={e => set('nb_seances_faites', e.target.value)}
                min="0" max={form.nb_seances}
                className={`${inp} ${seancesFaitesTrop ? '!border-red-500/60' : ''}`} />
              {seancesFaitesTrop && (
                <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />Dépasse le nombre prévu</p>
              )}
            </div>
            <div>
              <label className={lbl}>Durée / séance (min)</label>
              <input type="number" value={form.duree_par_seance}
                onChange={e => set('duree_par_seance', e.target.value)}
                min="30" placeholder="60" className={inp} />
            </div>
          </div>

          {/* Barre de progression */}
          {parseInt(form.nb_seances) > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-[#8B949E] mb-1.5">
                <span>Progression</span>
                <span className="font-mono font-bold">{form.nb_seances_faites}/{form.nb_seances} séances ({pctSeances}%)</span>
              </div>
              <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${seancesFaitesTrop ? 'bg-red-500' : pctSeances === 100 ? 'bg-green-500' : 'bg-[#F59E0B]'}`}
                  style={{ width: `${Math.min(pctSeances, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. HEURES VALIDÉES & RÉSULTAT ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={BarChart2} title="Résultat & Points" />
        <div className="p-5 space-y-4">

          {/* Heures validées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className={lbl}>Heures de formation validées</label>
              <input type="number" value={form.heures_validees}
                onChange={e => set('heures_validees', e.target.value)}
                min="0" max="100" step="0.5" placeholder="Ex : 4" className={inp} />
            </div>
            {form.heures_validees && parseFloat(form.heures_validees) > 0 && (
              <div className="px-4 py-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
                <p className="text-[10px] text-[#8B949E] uppercase tracking-widest">Calcul auto à la validation</p>
                <p className="text-base font-bold text-[#F59E0B] mt-1">
                  {parseFloat(form.heures_validees).toFixed(1)} h → +{Math.floor(parseFloat(form.heures_validees) / 2) * 2} pts
                </p>
                <p className="text-[10px] text-[#8B949E]/60 mt-0.5">Règle : 2h = +2 points</p>
              </div>
            )}
          </div>

          {/* Statut + Points */}
          {isEdit ? (
            <div className="max-w-xs">
              <label className={lbl}>
                Points récupérés
                {formation?.statut !== 'validee' && (
                  <span className="ml-1 text-[10px] text-[#484F58]">(appliqués si validée)</span>
                )}
              </label>
              <input type="number" value={form.points_recuperes}
                onChange={e => set('points_recuperes', e.target.value)}
                min="0" max="20" className={inp} />
              <p className="mt-1.5 text-[10px] text-[#484F58]">
                Statut géré via les boutons d&apos;action sur la page de détail.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Statut *</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)} className={`${inp} cursor-pointer`}>
                  <option value="en_cours">En cours</option>
                  <option value="validee">Validée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>
              <div>
                <label className={lbl}>
                  Points récupérés
                  {form.statut !== 'validee' && <span className="ml-1 text-[10px] text-[#484F58]">(si validée)</span>}
                </label>
                <input type="number" value={form.points_recuperes}
                  onChange={e => set('points_recuperes', e.target.value)}
                  min="0" max="20" disabled={form.statut !== 'validee'}
                  className={`${inp} disabled:opacity-40 disabled:cursor-not-allowed`} />
                {pointsBloques && (
                  <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />Points ne s&apos;appliquent que si statut = Validée</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. TEST DE REPRISE ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={FlaskConical} title="Test de reprise" subtitle="Optionnel" />
        <div className="p-5 space-y-4">
          <label className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl border cursor-pointer transition-all
            ${form.test_reprise_requis ? 'bg-[#F59E0B]/5 border-[#F59E0B]/25' : 'bg-[#0D1117] border-[#30363D] hover:border-[#30363D]/80'}`}>
            <input type="checkbox" checked={form.test_reprise_requis}
              onChange={e => set('test_reprise_requis', e.target.checked)}
              className="w-5 h-5 accent-[#F59E0B] cursor-pointer flex-shrink-0" />
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${form.test_reprise_requis ? 'text-[#F59E0B]' : 'text-[#8B949E]'}`}>
                Test de reprise requis
              </p>
              <p className="text-[10px] text-[#8B949E]/60">À l&apos;issue de cette formation</p>
            </div>
          </label>

          {form.test_reprise_requis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Résultat du test</label>
                <select value={form.test_reprise_resultat}
                  onChange={e => set('test_reprise_resultat', e.target.value)} className={`${inp} cursor-pointer`}>
                  <option value="">Non passé</option>
                  <option value="en_attente">En attente</option>
                  <option value="reussi">Réussi</option>
                  <option value="echoue">Échoué</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Date du test</label>
                <input type="date" value={form.test_reprise_date}
                  onChange={e => set('test_reprise_date', e.target.value)}
                  className={`${inp} [color-scheme:dark]`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ACTIONS ─── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-3 min-h-[44px] text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:border-[#F59E0B]/30 transition-colors cursor-pointer">
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || !!datFinAvantDeb || seancesFaitesTrop}
          className={`min-h-[44px] px-6 py-3 text-sm font-bold rounded-lg transition-all duration-150
            ${!loading && !datFinAvantDeb && !seancesFaitesTrop
              ? 'bg-[#F59E0B] text-[#0D1117] cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'bg-[#21262D] text-[#484F58] cursor-not-allowed'
            }`}
        >
          {loading ? 'Enregistrement…' : isEdit ? 'Sauvegarder' : 'Enregistrer la formation'}
        </button>
      </div>
    </form>
  )
}
