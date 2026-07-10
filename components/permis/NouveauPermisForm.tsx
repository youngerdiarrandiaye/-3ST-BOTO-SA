'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Ban, CheckCircle2, Circle, Shield,
  MapPin, Calendar, LayoutGrid, User, RefreshCw, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError, toastInfo } from '@/lib/toast'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { ZoneValidite } from '@/lib/types'

interface Conducteur {
  id: string
  matricule: string
  nom: string
  prenom: string
  statut: string
  validation_sst: boolean
  validation_clinique: boolean
  zone_validite: ZoneValidite | null
  type_zone: string | null
}

interface RenewData {
  numero: string
  categories: string[]
  zone_validite: string | null
  type_zone: string | null
  validation_sst: boolean
  validation_clinique: boolean
}

interface Props {
  conducteurs: Conducteur[]
  conducteurIdDefault?: string
  delivreurId: string
  renewData?: RenewData
}

const CATEGORIES: { code: string; desc: string }[] = [
  { code: 'A', desc: 'Moto / 2 roues' },
  { code: 'B', desc: 'Véhicule léger' },
  { code: 'C', desc: 'Poids lourd' },
  { code: 'D', desc: 'Transport pers.' },
  { code: 'E', desc: 'Avec remorque' },
  { code: 'F', desc: 'Engin chantier' },
  { code: 'G', desc: 'Engin minier' },
]

const TYPES_ZONE = [
  'Zone usine', 'Zone mine', 'Zone administrative',
  'Zone chantier', 'Zone dépôt', 'Toutes zones',
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

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

export default function NouveauPermisForm({ conducteurs, conducteurIdDefault, delivreurId, renewData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const today        = new Date().toISOString().slice(0, 10)
  const oneYearLater = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)

  const [form, setForm] = useState({
    conducteur_id:   conducteurIdDefault ?? '',
    date_delivrance: today,
    date_expiration: oneYearLater,
    zone_validite:   (renewData?.zone_validite ?? '') as ZoneValidite | '',
    type_zone:       renewData?.type_zone ?? '',
  })
  const [categories, setCategories]   = useState<string[]>(renewData?.categories ?? [])
  const [permisActif, setPermisActif] = useState<{ numero: string; statut: string } | null>(null)
  const [autoRempli, setAutoRempli]   = useState(false)

  // Auto-fill zone depuis le profil conducteur + check permis actif
  useEffect(() => {
    if (!form.conducteur_id) {
      setPermisActif(null)
      setAutoRempli(false)
      return
    }

    if (!renewData) {
      const c = conducteurs.find(x => x.id === form.conducteur_id)
      if (c) {
        setForm(prev => ({
          ...prev,
          zone_validite: (c.zone_validite ?? '') as ZoneValidite | '',
          type_zone:     c.type_zone ?? '',
        }))
        setAutoRempli(true)
      }
    }

    const supabase = createClient()
    supabase
      .from('permis_internes')
      .select('numero, statut, date_expiration')
      .eq('conducteur_id', form.conducteur_id)
      .in('statut', ['valide', 'suspendu'])
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setPermisActif(null); return }
        if (data.statut === 'valide' && data.date_expiration && new Date(data.date_expiration) < new Date()) {
          setPermisActif(null)
        } else {
          setPermisActif(data as { numero: string; statut: string })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.conducteur_id])

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (autoRempli && ['zone_validite', 'type_zone'].includes(k)) {
      setAutoRempli(false)
    }
  }

  function toggleCat(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const sel                  = conducteurs.find(c => c.id === form.conducteur_id)
  const sst_ko               = !!sel && !sel.validation_sst
  const clinique_ko          = !!sel && !sel.validation_clinique
  const bloque_hab           = sst_ko || clinique_ko
  const date_livr_ko         = form.date_delivrance < today
  const date_exp_ko          = form.date_expiration <= form.date_delivrance
  const duree                = (form.date_delivrance && form.date_expiration && !date_exp_ko)
    ? daysBetween(form.date_delivrance, form.date_expiration)
    : null

  const checks = [
    { id: 'cond',  label: 'Conducteur sélectionné',       ok: !!form.conducteur_id,        detail: !form.conducteur_id ? 'Rechercher par nom ou matricule' : undefined },
    { id: 'sst',   label: 'Habilitation SST validée',      ok: !sst_ko,                     detail: sst_ko ? 'Compléter la fiche conducteur' : undefined },
    { id: 'clin',  label: 'Visite médicale validée',        ok: !clinique_ko,                detail: clinique_ko ? 'Compléter la fiche conducteur' : undefined },
    { id: 'perm',  label: 'Aucun permis actif existant',    ok: !permisActif,                detail: permisActif ? `Retirer le N° ${permisActif.numero}` : undefined },
    { id: 'cats',  label: 'Catégorie(s) sélectionnée(s)',  ok: categories.length > 0,       detail: categories.length === 0 ? 'Sélectionner au moins une catégorie' : undefined },
    { id: 'dates', label: 'Dates de validité cohérentes',  ok: !date_livr_ko && !date_exp_ko, detail: (date_livr_ko || date_exp_ko) ? 'Corriger les dates' : undefined },
  ]
  const allOk = checks.every(c => c.ok)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allOk) return
    setLoading(true)
    const supabase = createClient()
    const numero   = genNumero(sel?.matricule ?? 'XX')

    const { error: err } = await supabase.from('permis_internes').insert({
      conducteur_id:    form.conducteur_id,
      numero,
      categories,
      date_delivrance:  form.date_delivrance,
      date_expiration:  form.date_expiration,
      delivre_par:      delivreurId,
      statut:           'valide',
      qr_code_url:      null,
      zone_validite:       form.zone_validite || null,
      type_zone:           form.type_zone    || null,
      validation_sst:      sel?.validation_sst      ?? false,
      validation_clinique: sel?.validation_clinique ?? false,
    })

    if (err) {
      toastError.erreurServeur()
      setLoading(false)
      return
    }

    toastSuccess.permisDelivre(numero)
    toastInfo.qrCodeGenere()
    router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/permis')
    router.refresh()
  }

  const inp = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors cursor-pointer`
  const lbl = `block text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1.5`

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* ─────── 1. CONDUCTEUR ─────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <User size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">Conducteur</span>
        </div>

        <div className="p-5 space-y-3">
          <SearchableSelect
            value={form.conducteur_id}
            onChange={v => set('conducteur_id', v)}
            placeholder="Rechercher par nom ou matricule…"
            options={conducteurs.map(c => ({
              value: c.id,
              label: `${c.prenom} ${c.nom}`,
              sublabel: c.matricule,
            }))}
          />

          {/* Fiche conducteur OK */}
          {sel && !bloque_hab && !permisActif && (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-[#8B949E]">
                  {sel.prenom[0]}{sel.nom[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#F0F6FC] truncate">{sel.prenom} {sel.nom}</p>
                <p className="font-mono text-[10px] text-[#8B949E]">{sel.matricule}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-500/10 text-green-400 border border-green-500/20">SST ✓</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-500/10 text-green-400 border border-green-500/20">CLIN ✓</span>
              </div>
            </div>
          )}

          {/* Blocage — habilitations manquantes */}
          {bloque_hab && (
            <div className="px-4 py-4 bg-red-950/40 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2.5">
                <Ban size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Délivrance bloquée — habilitations manquantes</p>
              </div>
              <div className="ml-4 space-y-1.5">
                {sst_ko && (
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs text-[#F0F6FC]/70">Habilitation SST non validée</p>
                  </div>
                )}
                {clinique_ko && (
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs text-[#F0F6FC]/70">Visite médicale clinique non validée</p>
                  </div>
                )}
                <p className="text-[10px] text-red-400/60 mt-2">→ Compléter les validations dans la fiche conducteur avant de délivrer le permis.</p>
              </div>
            </div>
          )}

          {/* Blocage — permis actif */}
          {permisActif && (
            <div className="px-4 py-4 bg-red-950/40 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Ban size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Permis actif en cours — délivrance bloquée</p>
              </div>
              <p className="text-xs text-[#F0F6FC]/70 ml-4">
                N° <span className="font-mono font-bold text-red-300">{permisActif.numero}</span>
                {' '}({permisActif.statut === 'suspendu' ? 'suspendu' : 'valide'}) — retirez-le avant d&apos;en délivrer un nouveau.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─────── 2. CATÉGORIES ─────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <LayoutGrid size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">Catégories autorisées *</span>
          {categories.length > 0 && (
            <span className="ml-auto font-mono text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
              {categories.sort().join(' · ')}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {CATEGORIES.map(({ code, desc }) => {
              const active = categories.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleCat(code)}
                  className={`flex flex-col items-center justify-center gap-1 h-[68px] rounded-xl border-2 transition-all duration-150 cursor-pointer select-none
                    ${active
                      ? 'bg-[#F59E0B] text-[#0D1117] border-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-[1.03]'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:border-[#F59E0B]/40 hover:text-[#F0F6FC]'
                    }`}
                >
                  <span className="text-xl font-black leading-none">{code}</span>
                  <span className={`text-[8px] font-semibold uppercase leading-tight text-center px-0.5 ${active ? 'text-[#0D1117]/60' : 'text-[#8B949E]/50'}`}>
                    {desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─────── 3. ZONE ─────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <MapPin size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">Zone de conduite</span>
          {autoRempli && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <RefreshCw size={9} />
              Pré-rempli depuis le profil
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Zone de validité</label>
              <select value={form.zone_validite} onChange={e => set('zone_validite', e.target.value)} className={inp}>
                <option value="">Non définie</option>
                {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Type de zone</label>
              <select value={form.type_zone} onChange={e => set('type_zone', e.target.value)} className={inp}>
                <option value="">Non défini</option>
                {TYPES_ZONE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Habilitations — lecture seule depuis la fiche conducteur */}
          {sel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border ${
                sel.validation_sst
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-red-950/30 border-red-500/20'
              }`}>
                {sel.validation_sst
                  ? <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
                  : <Ban          size={13} className="text-red-400 flex-shrink-0" />
                }
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${sel.validation_sst ? 'text-green-400' : 'text-red-400'}`}>
                    SST {sel.validation_sst ? 'validée' : 'non validée'}
                  </p>
                  <p className="text-[9px] text-[#8B949E]/50 mt-0.5">Depuis la fiche conducteur</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border ${
                sel.validation_clinique
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-red-950/30 border-red-500/20'
              }`}>
                {sel.validation_clinique
                  ? <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
                  : <Ban          size={13} className="text-red-400 flex-shrink-0" />
                }
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${sel.validation_clinique ? 'text-green-400' : 'text-red-400'}`}>
                    Visite médicale {sel.validation_clinique ? 'validée' : 'non validée'}
                  </p>
                  <p className="text-[9px] text-[#8B949E]/50 mt-0.5">Depuis la fiche conducteur</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────── 4. VALIDITÉ ─────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <Calendar size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">Période de validité *</span>
          {duree && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-[#8B949E]">
              <Clock size={10} />
              {duree} jours
            </span>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date de délivrance *</label>
            <input
              type="date"
              value={form.date_delivrance}
              onChange={e => set('date_delivrance', e.target.value)}
              required
              min={today}
              className={`${inp} [color-scheme:dark] ${date_livr_ko ? '!border-red-500/60 focus:!border-red-500 focus:!ring-red-500/20' : ''}`}
            />
            {date_livr_ko && (
              <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle size={11} className="flex-shrink-0" />
                Date dans le passé
              </p>
            )}
          </div>
          <div>
            <label className={lbl}>Date d&apos;expiration *</label>
            <input
              type="date"
              value={form.date_expiration}
              onChange={e => set('date_expiration', e.target.value)}
              required
              min={form.date_delivrance}
              className={`${inp} [color-scheme:dark] ${date_exp_ko ? '!border-red-500/60 focus:!border-red-500 focus:!ring-red-500/20' : ''}`}
            />
            {date_exp_ko && (
              <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle size={11} className="flex-shrink-0" />
                Antérieure à la délivrance
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─────── 5. CHECKLIST PRÉ-DÉLIVRANCE ─────── */}
      <div className={`rounded-xl border p-5 transition-all ${
        allOk
          ? 'bg-green-500/5 border-green-500/25'
          : 'bg-[#161B22] border-[#30363D]'
      }`}>
        <div className="flex items-center gap-2.5 mb-3">
          <Shield size={13} className={allOk ? 'text-green-400' : 'text-[#8B949E]'} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">
            Vérifications pré-délivrance
          </span>
          <span className={`ml-auto text-[10px] font-bold ${allOk ? 'text-green-400' : 'text-[#8B949E]'}`}>
            {checks.filter(c => c.ok).length}/{checks.length}
          </span>
        </div>

        <div className="space-y-2">
          {checks.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              {c.ok
                ? <CheckCircle2 size={13} className="text-green-400 flex-shrink-0 mt-px" />
                : <Circle      size={13} className="text-[#484F58] flex-shrink-0 mt-px" />
              }
              <div className="min-w-0">
                <p className={`text-xs font-medium ${c.ok ? 'text-[#F0F6FC]' : 'text-[#8B949E]'}`}>{c.label}</p>
                {!c.ok && c.detail && (
                  <p className="text-[10px] text-[#484F58] mt-0.5">{c.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────── ACTIONS ─────── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-3 min-h-[44px] text-sm text-[#8B949E] border border-[#30363D] rounded-lg
            hover:text-[#F0F6FC] hover:border-[#F59E0B]/30 transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || !allOk}
          className={`min-h-[44px] px-6 py-3 text-sm font-bold rounded-lg transition-all duration-150
            ${allOk && !loading
              ? 'bg-[#F59E0B] text-[#0D1117] cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'bg-[#21262D] text-[#484F58] cursor-not-allowed'
            }`}
        >
          {loading
            ? 'Délivrance en cours…'
            : !allOk
            ? `${checks.filter(c => c.ok).length}/${checks.length} conditions remplies`
            : renewData ? 'Renouveler le permis' : 'Délivrer le permis interne'}
        </button>
      </div>
    </form>
  )
}
