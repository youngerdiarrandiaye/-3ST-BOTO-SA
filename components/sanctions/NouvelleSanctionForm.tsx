'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, User, ShieldX, FileText, Calendar } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { toastError, toastSuccess } from '@/lib/toast'

interface Conducteur { id: string; matricule: string; nom: string; prenom: string }

interface Props {
  conducteurs: Conducteur[]
  conducteurIdDefault?: string
  infractionId?: string
  infractionContext?: {
    id: string
    date_heure: string
    localisation: string | null
    types_infraction: { code: string; libelle: string; gravite: string; points_retires: number } | null
  } | null
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#EF4444]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#EF4444]" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">{title}</span>
      {subtitle && <span className="ml-1 text-[9px] font-semibold text-[#484F58] uppercase tracking-widest">— {subtitle}</span>}
    </div>
  )
}

const inp = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 transition-colors`
const lbl = `block text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1.5`

export default function NouvelleSanctionForm({ conducteurs, conducteurIdDefault, infractionId, infractionContext }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    conducteur_id: conducteurIdDefault ?? '',
    type:          'suspension_temp',
    motif:         '',
    date_debut:    today,
    date_fin:      '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const selectedCond = conducteurs.find(c => c.id === form.conducteur_id)

  // validations dérivées
  const motifTropCourt  = form.motif.trim().length > 0 && form.motif.trim().length < 10
  const datFinAvantDeb  = form.type === 'suspension_temp' && form.date_fin && form.date_fin < form.date_debut
  const datFinDansPassé = form.type === 'suspension_temp' && form.date_fin && form.date_fin < today

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.conducteur_id) { toastError.champObligatoire('Conducteur'); return }
    if (!form.motif.trim())  { toastError.champObligatoire('Motif de la sanction'); return }
    if (form.motif.trim().length < 10) { toastError.champObligatoire('Motif trop court — minimum 10 caractères'); return }
    if (form.type === 'suspension_temp' && !form.date_fin) {
      toastError.champObligatoire('Date de fin pour la suspension temporaire')
      return
    }
    if (datFinAvantDeb) {
      toastError.champObligatoire('Date de fin doit être après la date de début')
      return
    }

    setLoading(true)

    const res = await fetch('/api/sanctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conducteur_id: form.conducteur_id,
        type:          form.type,
        motif:         form.motif.trim(),
        date_debut:    form.date_debut,
        date_fin:      form.type === 'suspension_temp' ? (form.date_fin || null) : null,
        infraction_id: infractionId ?? null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toastError.champObligatoire(data.error ?? 'Erreur serveur')
      setLoading(false)
      return
    }

    const nom = selectedCond ? `${selectedCond.prenom} ${selectedCond.nom}` : 'Conducteur'
    toastSuccess.conducteurSuspendu(nom)
    router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/sanctions')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Contexte infraction */}
      {infractionContext && (
        <div className="px-4 py-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Suite à infraction</p>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#F0F6FC]">{infractionContext.types_infraction?.libelle ?? '—'}</p>
              <p className="text-[11px] text-[#8B949E] mt-0.5">
                {fmtDT(infractionContext.date_heure)}
                {infractionContext.localisation && <span> · {infractionContext.localisation}</span>}
              </p>
            </div>
            {infractionContext.types_infraction?.gravite && (
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <GraviteBadge gravite={infractionContext.types_infraction.gravite} />
                <span className="text-xs font-mono font-bold text-red-400">
                  −{infractionContext.types_infraction.points_retires} pts
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 1. CONDUCTEUR ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={User} title="Conducteur sanctionné" />
        <div className="p-5 space-y-3">
          <SearchableSelect
            value={form.conducteur_id}
            onChange={v => set('conducteur_id', v)}
            placeholder="Rechercher un conducteur…"
            accentColor="#EF4444"
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

      {/* ─── 2. TYPE DE SANCTION ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={ShieldX} title="Type de sanction" />
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { val: 'suspension_temp',   label: 'Suspension temporaire', desc: 'Durée limitée avec date de fin',       color: 'orange' },
              { val: 'retrait_definitif', label: 'Retrait définitif',     desc: 'Retrait permanent du permis interne',  color: 'red' },
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => set('type', opt.val)}
                className={`p-4 min-h-[64px] rounded-xl border-2 text-left transition-all duration-150 cursor-pointer
                  ${form.type === opt.val
                    ? opt.color === 'red'
                      ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.15)]'
                      : 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_16px_rgba(249,115,22,0.15)]'
                    : 'bg-[#0D1117] border-[#30363D] hover:border-[#8B949E]/40'
                  }`}
              >
                <p className={`text-sm font-bold ${form.type === opt.val ? (opt.color === 'red' ? 'text-red-400' : 'text-orange-400') : 'text-[#8B949E]'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] mt-0.5 text-[#484F58]">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 3. MOTIF & DATES ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <SectionHeader icon={FileText} title="Motif & Dates" />
        <div className="p-5 space-y-4">

          <div>
            <label className={lbl}>
              Motif détaillé *
              <span className={`ml-2 font-mono text-[10px] ${motifTropCourt ? 'text-red-400' : 'text-[#484F58]'}`}>
                {form.motif.trim().length}/10 min
              </span>
            </label>
            <textarea
              value={form.motif}
              onChange={e => set('motif', e.target.value)}
              rows={4}
              placeholder="Décrivez précisément le motif de la sanction, les circonstances et les faits constatés…"
              className={`${inp} resize-none ${motifTropCourt ? '!border-red-500/60 focus:!border-red-500' : ''}`}
            />
            {motifTropCourt && (
              <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={11} className="flex-shrink-0" />
                Motif trop court — décrivez précisément les faits (min 10 caractères)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date de début *</label>
              <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)}
                className={`${inp} [color-scheme:dark]`} />
            </div>

            {form.type === 'suspension_temp' && (
              <div>
                <label className={lbl}>Date de fin *</label>
                <input
                  type="date"
                  value={form.date_fin}
                  onChange={e => set('date_fin', e.target.value)}
                  min={form.date_debut}
                  className={`${inp} [color-scheme:dark] ${datFinAvantDeb ? '!border-red-500/60' : ''}`}
                />
                {datFinAvantDeb && (
                  <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="flex-shrink-0" />Antérieure à la date de début
                  </p>
                )}
                {!datFinAvantDeb && datFinDansPassé && (
                  <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="flex-shrink-0" />Date dans le passé — vérifier
                  </p>
                )}
              </div>
            )}
          </div>

          {form.type === 'retrait_definitif' && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-red-950/40 border border-red-500/30 rounded-xl">
              <ShieldX size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-red-400 uppercase tracking-wide">Action irréversible</p>
                <p className="text-[11px] text-red-300/70 mt-0.5">
                  Le retrait définitif suspend le conducteur immédiatement et révoque son permis interne.
                  Une formation de réhabilitation sera requise pour toute réintégration.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ACTIONS ─── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-3 min-h-[44px] text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:border-[#EF4444]/30 transition-colors cursor-pointer">
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || motifTropCourt || !!datFinAvantDeb}
          className={`min-h-[44px] px-6 py-3 text-sm font-bold rounded-lg transition-all duration-150
            ${!loading && !motifTropCourt && !datFinAvantDeb
              ? 'bg-[#EF4444] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : 'bg-[#21262D] text-[#484F58] cursor-not-allowed'
            }`}
        >
          {loading ? 'Enregistrement…' : 'Appliquer la sanction'}
        </button>
      </div>
    </form>
  )
}
