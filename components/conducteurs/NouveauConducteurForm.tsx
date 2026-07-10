'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Briefcase, MapPin, Calendar, ShieldCheck, Phone,
  CheckCircle2, Circle, ChevronRight, AlertTriangle,
  Loader2, XCircle, Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ZoneValidite } from '@/lib/types'
import { toastSuccess, toastError, toastWarn } from '@/lib/toast'

interface Entreprise { id: string; nom: string }

const CATEGORIES_PERMIS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const ZONES: { value: ZoneValidite; label: string }[] = [
  { value: 'miniere',        label: 'Zone minière uniquement' },
  { value: 'administrative', label: 'Zone administrative uniquement' },
  { value: 'les_deux',       label: 'Toutes les zones' },
]

const TYPES_ZONE = [
  'Zone usine', 'Zone mine', 'Zone administrative',
  'Zone chantier', 'Zone dépôt', 'Toutes zones',
]

// ── helpers ──────────────────────────────────────────────────────────────────

function calcAge(dateStr: string): number {
  const birth = new Date(dateStr)
  const now   = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

const LETTRES = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/
const TEL_RE  = /^\+?[\d\s\-(). ]{8,20}$/

// ── schéma Zod ───────────────────────────────────────────────────────────────

const conducteurSchema = z.object({
  nom: z.string()
    .min(2,  'Nom requis (min 2 caractères)')
    .max(50, 'Nom trop long (max 50 caractères)')
    .regex(LETTRES, 'Lettres uniquement — pas de chiffres ni de symboles'),
  prenom: z.string()
    .min(2,  'Prénom requis (min 2 caractères)')
    .max(50, 'Prénom trop long (max 50 caractères)')
    .regex(LETTRES, 'Lettres uniquement — pas de chiffres ni de symboles'),
  matricule: z.string()
    .min(3,  'Matricule requis (min 3 caractères)')
    .max(20, 'Matricule trop long (max 20 caractères)')
    .regex(/^[A-Z0-9][A-Z0-9\-]*[A-Z0-9]$|^[A-Z0-9]{1,2}$/i,
      'Format invalide — commence et finit par une lettre ou un chiffre, tirets au milieu uniquement'),
  entreprise_id:           z.string().min(1, 'Sélectionnez une entreprise'),
  type_zone:               z.string().min(1, 'Sélectionnez un type de zone'),
  fonction: z.string()
    .min(3,  'Fonction requise (min 3 caractères)')
    .max(80, 'Fonction trop longue (max 80 caractères)'),
  date_debut_autorisation: z.string().min(1, 'Date de début requise'),
  est_temporaire:          z.boolean(),
  date_fin_autorisation:   z.string().optional(),
  date_naissance:          z.string().optional(),
  permis_national: z.string()
    .max(30, 'Trop long (max 30 caractères)')
    .optional()
    .or(z.literal('')),
  permis_civil_autorite:    z.string().max(80).optional().or(z.literal('')),
  zone_validite:            z.string().optional(),
  validation_sst:           z.boolean(),
  date_validation_sst: z.string().optional().refine(
    v => !v || new Date(v) <= new Date(),
    { message: 'La date de validation SST ne peut pas être dans le futur' }
  ),
  validation_clinique:      z.boolean(),
  date_validation_clinique: z.string().optional().refine(
    v => !v || new Date(v) <= new Date(),
    { message: 'La date de visite médicale ne peut pas être dans le futur' }
  ),
  contact_urgence_nom:      z.string().max(80).optional().or(z.literal('')),
  contact_urgence_tel: z.string().optional().or(z.literal('')).refine(
    v => !v || TEL_RE.test(v),
    { message: 'Format téléphone invalide — ex: +221 77 000 00 00' }
  ),
})
.refine(
  d => !d.est_temporaire || !!d.date_fin_autorisation,
  { message: 'Date de fin requise pour un conducteur temporaire', path: ['date_fin_autorisation'] }
)
.refine(
  d => {
    if (!d.est_temporaire || !d.date_fin_autorisation || !d.date_debut_autorisation) return true
    return d.date_fin_autorisation > d.date_debut_autorisation
  },
  { message: 'La date de fin doit être postérieure à la date de début', path: ['date_fin_autorisation'] }
)
.refine(
  d => {
    if (!d.validation_sst || !d.date_validation_sst) return true
    return new Date(d.date_validation_sst) <= new Date()
  },
  { message: 'La date de validation SST ne peut pas être dans le futur', path: ['date_validation_sst'] }
)
.refine(
  d => {
    if (!d.validation_clinique || !d.date_validation_clinique) return true
    return new Date(d.date_validation_clinique) <= new Date()
  },
  { message: 'La date de visite médicale ne peut pas être dans le futur', path: ['date_validation_clinique'] }
)

type FormData = z.infer<typeof conducteurSchema>

// ── styles ───────────────────────────────────────────────────────────────────

const inp    = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-colors`
const inpErr = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-red-500/60 rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors`
const inpOk  = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-green-500/40 rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors`
const lbl    = `block text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1.5`
const errMsg = `mt-1.5 text-[11px] text-red-400 flex items-center gap-1.5`
const warnMsg = `mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5`

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#F59E0B]" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">{title}</span>
      {subtitle && (
        <span className="ml-1 text-[9px] font-semibold text-[#484F58] uppercase tracking-widest">— {subtitle}</span>
      )}
    </div>
  )
}

const WORKFLOW_STEPS = [
  { level: 'N1', label: 'Responsable Département', desc: "Valide l'aptitude au poste" },
  { level: 'N2', label: 'Responsable SST',          desc: 'Valide les habilitations sécurité' },
  { level: 'N3', label: 'Clinique / Médecin',        desc: "Valide l'aptitude médicale" },
]

// ── composant ────────────────────────────────────────────────────────────────

export default function NouveauConducteurForm({ entreprises }: { entreprises: Entreprise[] }) {
  const router = useRouter()
  const [cats, setCats]         = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Vérification doublon matricule en temps réel
  const [matStatus, setMatStatus] = useState<'idle' | 'checking' | 'ok' | 'pris'>('idle')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(conducteurSchema),
    mode: 'onChange',
    defaultValues: {
      est_temporaire:      false,
      validation_sst:      false,
      validation_clinique: false,
    },
  })

  const estTemporaire  = watch('est_temporaire')
  const valSst         = watch('validation_sst')
  const valClinique    = watch('validation_clinique')
  const matriculeVal   = watch('matricule')
  const dateNaissVal   = watch('date_naissance')
  const dateDebutVal   = watch('date_debut_autorisation')

  // ── check matricule doublon (debounce 500ms) ──────────────────────────────
  const checkMatricule = useCallback((val: string) => {
    const v = val?.trim().toUpperCase()
    if (!v || v.length < 3 || errors.matricule) { setMatStatus('idle'); return }
    setMatStatus('checking')
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('conducteurs').select('id').eq('matricule', v).maybeSingle()
      setMatStatus(data ? 'pris' : 'ok')
    }, 500)
    return t
  }, [errors.matricule])

  useEffect(() => {
    const t = checkMatricule(matriculeVal ?? '')
    return () => { if (t) clearTimeout(t) }
  }, [matriculeVal, checkMatricule])

  // ── calcul d'âge ─────────────────────────────────────────────────────────
  const ageInfo = (() => {
    if (!dateNaissVal) return null
    const age = calcAge(dateNaissVal)
    if (isNaN(age) || age < 0) return { type: 'error', msg: 'Date de naissance invalide' }
    if (new Date(dateNaissVal) > new Date()) return { type: 'error', msg: 'La date de naissance ne peut pas être dans le futur' }
    if (age < 18) return { type: 'error',   msg: `Âge : ${age} ans — Conducteur trop jeune (minimum 18 ans)` }
    if (age > 70) return { type: 'warning', msg: `Âge : ${age} ans — Vérifier l'aptitude médicale obligatoire` }
    return       { type: 'ok',      msg: `Âge : ${age} ans` }
  })()

  function toggleCat(c: string) {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function onSubmit(data: FormData) {
    // Bloquer si doublon matricule confirmé
    if (matStatus === 'pris') {
      toastError.matriculeExiste(data.matricule.trim().toUpperCase())
      return
    }
    // Bloquer si âge invalide
    if (ageInfo?.type === 'error') {
      toastWarn.validationManquante('Date de naissance — ' + ageInfo.msg)
      return
    }

    const supabase = createClient()
    const mat = data.matricule.trim().toUpperCase()

    // Double-vérification serveur du matricule
    const { data: dupMat } = await supabase
      .from('conducteurs').select('id').eq('matricule', mat).maybeSingle()
    if (dupMat) { toastError.matriculeExiste(mat); return }

    // Doublon permis national
    if (data.permis_national?.trim()) {
      const { data: dupPN } = await supabase
        .from('conducteurs').select('id')
        .eq('permis_national', data.permis_national.trim()).maybeSingle()
      if (dupPN) {
        toastError.champObligatoire(`N° Permis national "${data.permis_national.trim()}" déjà enregistré`)
        return
      }
    }

    const { error: insertErr } = await supabase.from('conducteurs').insert({
      matricule:                mat,
      nom:                      data.nom.trim(),
      prenom:                   data.prenom.trim(),
      date_naissance:           data.date_naissance              || null,
      permis_national:          data.permis_national?.trim()     || null,
      permis_civil_autorite:    data.permis_civil_autorite?.trim() || null,
      entreprise_id:            data.entreprise_id,
      statut:                   'en_attente',
      fonction:                 data.fonction.trim(),
      type_permis_conduite:     cats,
      zone_validite:            data.zone_validite               || null,
      type_zone:                data.type_zone,
      validation_sst:           data.validation_sst,
      date_validation_sst:      data.validation_sst ? (data.date_validation_sst || null) : null,
      validation_clinique:      data.validation_clinique,
      date_validation_clinique: data.validation_clinique ? (data.date_validation_clinique || null) : null,
      contact_urgence_nom:      data.contact_urgence_nom?.trim() || null,
      contact_urgence_tel:      data.contact_urgence_tel?.trim() || null,
      est_temporaire:           data.est_temporaire,
      date_debut_autorisation:  data.date_debut_autorisation,
      date_fin_autorisation:    data.est_temporaire ? (data.date_fin_autorisation || null) : null,
    })

    if (insertErr) {
      if (insertErr.message.includes('conducteurs_matricule_unique'))
        toastError.matriculeExiste(mat)
      else
        toastError.erreurServeur()
      return
    }

    toastSuccess.conducteurCree(`${data.prenom.trim()} ${data.nom.trim()}`)
    router.push('/conducteurs')
    router.refresh()
  }

  const cls = (f: keyof FormData) => errors[f] ? inpErr : inp

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={e => { setSubmitted(true); handleSubmit(onSubmit)(e) }}
      className="space-y-3"
      noValidate
    >

      {/* ─── 1. IDENTITÉ ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={User} title="Identité du conducteur" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Matricule avec check temps-réel */}
          <div className="sm:col-span-2">
            <label className={lbl}>Matricule *</label>
            <div className="relative">
              <input
                {...register('matricule')}
                placeholder="EX-001"
                className={`${errors.matricule ? inpErr : matStatus === 'pris' ? inpErr : matStatus === 'ok' ? inpOk : inp} font-mono uppercase pr-10`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {matStatus === 'checking' && <Loader2 size={14} className="text-[#8B949E] animate-spin" />}
                {matStatus === 'ok'       && <CheckCircle2 size={14} className="text-green-400" />}
                {matStatus === 'pris'     && <XCircle size={14} className="text-red-400" />}
              </div>
            </div>
            {errors.matricule && (
              <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.matricule.message}</p>
            )}
            {!errors.matricule && matStatus === 'pris' && (
              <p className={errMsg}><XCircle size={11} className="flex-shrink-0" />Ce matricule est déjà enregistré dans le système</p>
            )}
            {!errors.matricule && matStatus === 'ok' && (
              <p className="mt-1.5 text-[11px] text-green-400 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="flex-shrink-0" />Matricule disponible
              </p>
            )}
          </div>

          {/* Prénom */}
          <div>
            <label className={lbl}>Prénom *</label>
            <input {...register('prenom')} placeholder="Mamadou" className={cls('prenom')} />
            {errors.prenom && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.prenom.message}</p>}
          </div>

          {/* Nom */}
          <div>
            <label className={lbl}>Nom *</label>
            <input {...register('nom')} placeholder="Diallo" className={cls('nom')} />
            {errors.nom && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.nom.message}</p>}
          </div>

          {/* Date de naissance */}
          <div>
            <label className={lbl}>Date de naissance</label>
            <input
              type="date"
              {...register('date_naissance')}
              max={new Date().toISOString().slice(0, 10)}
              className={`${ageInfo?.type === 'error' ? inpErr : inp} [color-scheme:dark]`}
            />
            {ageInfo?.type === 'error'   && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{ageInfo.msg}</p>}
            {ageInfo?.type === 'warning' && <p className={warnMsg}><AlertTriangle size={11} className="flex-shrink-0" />{ageInfo.msg}</p>}
            {ageInfo?.type === 'ok'      && <p className="mt-1.5 text-[11px] text-[#8B949E] flex items-center gap-1.5"><Info size={11} className="flex-shrink-0" />{ageInfo.msg}</p>}
          </div>

          {/* Entreprise */}
          <div>
            <label className={lbl}>Entreprise *</label>
            <select {...register('entreprise_id')} className={`${cls('entreprise_id')} cursor-pointer`}>
              <option value="">Sélectionner une entreprise</option>
              {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
            {errors.entreprise_id && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.entreprise_id.message}</p>}
          </div>

          {/* Permis national */}
          <div>
            <label className={lbl}>N° Permis national</label>
            <input
              {...register('permis_national')}
              placeholder="SN-2024-123456"
              className={`${cls('permis_national')} font-mono`}
            />
            {errors.permis_national && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.permis_national.message}</p>}
          </div>

          {/* Autorité émettrice */}
          <div>
            <label className={lbl}>Autorité émettrice</label>
            <input
              {...register('permis_civil_autorite')}
              placeholder="Préfecture de Dakar"
              className={cls('permis_civil_autorite')}
            />
            {errors.permis_civil_autorite && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.permis_civil_autorite.message}</p>}
          </div>

        </div>
      </div>

      {/* ─── 2. POSTE & ZONE ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={Briefcase} title="Poste & Zone d'affectation" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className={lbl}>Fonction / Poste *</label>
            <input {...register('fonction')} placeholder="Chauffeur camion minier" className={cls('fonction')} />
            {errors.fonction && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.fonction.message}</p>}
          </div>

          <div>
            <label className={lbl}>Type de zone *</label>
            <select {...register('type_zone')} className={`${cls('type_zone')} cursor-pointer`}>
              <option value="">Sélectionner une zone</option>
              {TYPES_ZONE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type_zone && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.type_zone.message}</p>}
          </div>

          <div>
            <label className={lbl}>Zone de validité</label>
            <select {...register('zone_validite')} className={`${inp} cursor-pointer`}>
              <option value="">Non définie</option>
              {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* ─── 3. PÉRIODE D'AUTORISATION ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={Calendar} title="Période d'autorisation" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className={lbl}>Date de début *</label>
            <input
              type="date"
              {...register('date_debut_autorisation')}
              className={`${cls('date_debut_autorisation')} [color-scheme:dark]`}
            />
            {errors.date_debut_autorisation && (
              <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.date_debut_autorisation.message}</p>
            )}
          </div>

          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
              <input type="checkbox" {...register('est_temporaire')}
                className="w-5 h-5 accent-[#F59E0B] cursor-pointer rounded" />
              <div>
                <span className="text-sm text-[#F0F6FC]">Conducteur temporaire</span>
                <p className="text-[10px] text-[#8B949E]/60">Autorisation limitée dans le temps</p>
              </div>
            </label>
          </div>

          {estTemporaire && (
            <div>
              <label className={lbl}>Date de fin *</label>
              <input
                type="date"
                {...register('date_fin_autorisation')}
                min={dateDebutVal || undefined}
                className={`${cls('date_fin_autorisation')} [color-scheme:dark]`}
              />
              {errors.date_fin_autorisation && (
                <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.date_fin_autorisation.message}</p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ─── 4. CATÉGORIES PERMIS ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={MapPin} title="Catégories permis national" subtitle="Optionnel" />
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_PERMIS.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCat(cat)}
                className={`w-11 h-11 rounded-lg text-sm font-black border-2 transition-all duration-150 cursor-pointer
                  ${cats.includes(cat)
                    ? 'bg-[#F59E0B] text-[#0D1117] border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:border-[#F59E0B]/40 hover:text-[#F0F6FC]'
                  }`}
              >{cat}</button>
            ))}
          </div>
          {cats.length > 0 && (
            <p className="text-[10px] font-mono text-[#8B949E] mt-2.5">
              Sélectionnées : <span className="text-[#F59E0B] font-bold">{cats.sort().join(' · ')}</span>
            </p>
          )}
        </div>
      </div>

      {/* ─── 5. HABILITATIONS ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={ShieldCheck} title="Habilitations" subtitle="Optionnel — v11" />
        <div className="p-5 space-y-3">

          <div className="flex items-start gap-2 px-3 py-2.5 bg-[#0D1117] border border-[#21262D] rounded-lg">
            <Info size={11} className="text-[#484F58] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#484F58] leading-relaxed">
              Cochez uniquement si déjà validées. Elles seront confirmées lors du workflow 3 niveaux.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* SST */}
            <div className="space-y-2">
              <label className={`flex items-center gap-2.5 cursor-pointer min-h-[44px] px-3.5 py-3 rounded-xl border transition-all
                ${valSst ? 'bg-green-500/5 border-green-500/25' : 'bg-[#0D1117] border-[#30363D] hover:border-[#30363D]/80'}`}>
                <input type="checkbox" {...register('validation_sst')}
                  className="w-5 h-5 accent-[#F59E0B] cursor-pointer flex-shrink-0" />
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${valSst ? 'text-green-400' : 'text-[#8B949E]'}`}>
                    Habilitation SST
                  </p>
                  <p className="text-[10px] text-[#8B949E]/60">Sécurité & Sauvetage au Travail</p>
                </div>
                {valSst && <CheckCircle2 size={13} className="text-green-400 ml-auto flex-shrink-0" />}
              </label>
              {valSst && (
                <div>
                  <input type="date" {...register('date_validation_sst')}
                    max={new Date().toISOString().slice(0, 10)}
                    className={`${cls('date_validation_sst')} [color-scheme:dark]`} />
                  {errors.date_validation_sst && (
                    <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.date_validation_sst.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Clinique */}
            <div className="space-y-2">
              <label className={`flex items-center gap-2.5 cursor-pointer min-h-[44px] px-3.5 py-3 rounded-xl border transition-all
                ${valClinique ? 'bg-green-500/5 border-green-500/25' : 'bg-[#0D1117] border-[#30363D] hover:border-[#30363D]/80'}`}>
                <input type="checkbox" {...register('validation_clinique')}
                  className="w-5 h-5 accent-[#F59E0B] cursor-pointer flex-shrink-0" />
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${valClinique ? 'text-green-400' : 'text-[#8B949E]'}`}>
                    Visite médicale
                  </p>
                  <p className="text-[10px] text-[#8B949E]/60">Aptitude clinique confirmée</p>
                </div>
                {valClinique && <CheckCircle2 size={13} className="text-green-400 ml-auto flex-shrink-0" />}
              </label>
              {valClinique && (
                <div>
                  <input type="date" {...register('date_validation_clinique')}
                    max={new Date().toISOString().slice(0, 10)}
                    className={`${cls('date_validation_clinique')} [color-scheme:dark]`} />
                  {errors.date_validation_clinique && (
                    <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.date_validation_clinique.message}</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ─── 6. CONTACT D'URGENCE ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={Phone} title="Contact d'urgence" subtitle="Optionnel" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Nom complet</label>
            <input {...register('contact_urgence_nom')} placeholder="Fatou Diallo" className={cls('contact_urgence_nom')} />
            {errors.contact_urgence_nom && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.contact_urgence_nom.message}</p>}
          </div>
          <div>
            <label className={lbl}>Téléphone</label>
            <input
              {...register('contact_urgence_tel')}
              placeholder="+221 77 000 00 00"
              type="tel"
              className={cls('contact_urgence_tel')}
            />
            {errors.contact_urgence_tel && <p className={errMsg}><AlertTriangle size={11} className="flex-shrink-0" />{errors.contact_urgence_tel.message}</p>}
          </div>
        </div>
      </div>

      {/* ─── WORKFLOW DE VALIDATION ─── */}
      <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#484F58] mb-3">
          Workflow v11 — après création
        </p>
        <div className="relative">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#21262D]" />
          <div className="space-y-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.level} className="flex items-start gap-3 relative">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10
                  ${i === 0 ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40' : 'bg-[#0D1117] border-[#21262D]'}`}>
                  {i === 0
                    ? <ChevronRight size={10} className="text-[#F59E0B]" />
                    : <Circle size={8} className="text-[#30363D]" />
                  }
                </div>
                <div className="pt-0.5 min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${i === 0 ? 'text-[#F59E0B]' : 'text-[#484F58]'}`}>
                    {step.level} — {step.label}
                  </p>
                  <p className="text-[10px] text-[#484F58]/70">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[9px] text-[#30363D] mt-3 leading-relaxed">
          Statut initial : <span className="font-mono text-[#484F58]">en_attente</span> — aucune conduite autorisée sans permis interne actif.
        </p>
      </div>

      {/* ─── RÉCAP ERREURS (visible après première tentative de soumission) ─── */}
      {submitted && !isValid && (
        <div className="px-4 py-4 bg-red-950/40 border border-red-500/25 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Formulaire incomplet — corrigez les erreurs avant d&apos;enregistrer
            </p>
          </div>
          <ul className="ml-4 space-y-1">
            {(Object.entries(errors) as [string, { message?: string }][]).slice(0, 5).map(([field, e]) => (
              <li key={field} className="text-[11px] text-red-300/70 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                {e?.message ?? field}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── ACTIONS ─── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-3 min-h-[44px] text-sm text-[#8B949E] border border-[#30363D] rounded-lg
            hover:text-[#F0F6FC] hover:border-[#F59E0B]/30 transition-colors cursor-pointer">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting || matStatus === 'pris' || ageInfo?.type === 'error'}
          className={`min-h-[44px] px-6 py-3 text-sm font-bold rounded-lg transition-all duration-150
            ${!isSubmitting && matStatus !== 'pris' && ageInfo?.type !== 'error'
              ? 'bg-[#F59E0B] text-[#0D1117] cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'bg-[#21262D] text-[#484F58] cursor-not-allowed'
            }`}
        >
          {isSubmitting
            ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Enregistrement…</span>
            : matStatus === 'pris'
            ? 'Matricule déjà utilisé'
            : 'Créer le conducteur'
          }
        </button>
      </div>

    </form>
  )
}
