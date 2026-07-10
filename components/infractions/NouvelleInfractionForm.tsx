'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, AlertOctagon, AlertTriangle, User, Tag, MapPin, Clock, Users, ShieldAlert, TrendingDown, Zap } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { GRAVITE_LABEL } from '@/lib/gravite'
import type { ZoneInfraction } from '@/lib/types'
import { toastError, toastWarn, toastSuccess } from '@/lib/toast'

interface Conducteur {
  id: string
  matricule: string
  nom: string
  prenom: string
  statut: string
  points_actuels: number
  fonction: string | null
  entreprises: { nom: string } | { nom: string }[] | null
}
interface TypeInfraction {
  id: string
  code: string
  libelle: string
  gravite: string
  points_retires: number
  zone_applicable: ZoneInfraction
  suspend_auto: boolean
  retrait_definitif_auto: boolean
}
interface Temoin { nom: string; prenom: string; matricule: string; telephone: string; declaration: string }

interface Props {
  conducteurs: Conducteur[]
  typesInfraction: TypeInfraction[]
  conducteurIdDefault?: string
}

const ZONES_LABEL: Record<ZoneInfraction, string> = {
  miniere:      'Zone minière',
  hors_miniere: 'Hors zone minière',
  les_deux:     'Toutes zones',
}

function getNowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function emptyTemoin(): Temoin {
  return { nom: '', prenom: '', matricule: '', telephone: '', declaration: '' }
}

function PointsBar({ pts, max = 20 }: { pts: number; max?: number }) {
  const pct   = Math.max(0, Math.min(100, (pts / max) * 100))
  const color = pts <= 0 ? '#EF4444' : pts <= 5 ? '#F97316' : pts <= 10 ? '#F59E0B' : '#22C55E'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-[#8B949E]">Solde de points</span>
        <span className="font-mono font-bold" style={{ color }}>{pts} pt{pts !== 1 ? 's' : ''}</span>
      </div>
      <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-[#21262D] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#EF4444]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#EF4444]" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">{title}</span>
      {subtitle && <span className="ml-1 text-[9px] font-semibold text-[#484F58] uppercase tracking-widest">— {subtitle}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

const inp = `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 transition-colors`
const lbl = `block text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1.5`

export default function NouvelleInfractionForm({ conducteurs, typesInfraction, conducteurIdDefault }: Props) {
  const router = useRouter()
  const [loading,     setLoading]     = useState(false)
  const [recidive,    setRecidive]    = useState<{ est: boolean; nb: number } | null>(null)
  const [maxDateTime, setMaxDateTime] = useState(getNowLocal)

  const [form, setForm] = useState({
    conducteur_id:           conducteurIdDefault ?? '',
    type_infraction_id:      '',
    date_heure:              getNowLocal(),
    localisation:            '',
    description:             '',
    zone_constatee:          '' as ZoneInfraction | '',
    conducteur_refuse_signe: false,
  })
  const [temoins, setTemoins] = useState<Temoin[]>([])

  useEffect(() => {
    const interval = setInterval(() => setMaxDateTime(getNowLocal()), 60_000)
    return () => clearInterval(interval)
  }, [])

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  const selectedType = typesInfraction.find(t => t.id === form.type_infraction_id)
  const selectedCond = conducteurs.find(c => c.id === form.conducteur_id)
  const dateFuture   = form.date_heure > maxDateTime

  const zoneIncompatible = !!(
    selectedType && form.zone_constatee &&
    selectedType.zone_applicable !== 'les_deux' &&
    selectedType.zone_applicable !== form.zone_constatee
  )

  const pointsApres = selectedCond && selectedType
    ? selectedCond.points_actuels - selectedType.points_retires
    : null

  useEffect(() => {
    if (!form.conducteur_id || !form.type_infraction_id) { setRecidive(null); return }
    const params = new URLSearchParams({ conducteur_id: form.conducteur_id, type_infraction_id: form.type_infraction_id })
    fetch(`/api/infractions/recidive-check?${params}`)
      .then(r => r.json())
      .then(d => {
        const rec = { est: d.est_recidive, nb: d.nb_recidives }
        setRecidive(rec)
        if (rec.est && selectedType) toastWarn.recidiveDetectee(selectedType.libelle, rec.nb)
      })
      .catch(() => setRecidive(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.conducteur_id, form.type_infraction_id])

  function addTemoin()   { setTemoins(prev => [...prev, emptyTemoin()]) }
  function removeTemoin(i: number) { setTemoins(prev => prev.filter((_, idx) => idx !== i)) }
  function setTemoin(i: number, k: keyof Temoin, v: string) {
    setTemoins(prev => prev.map((t, idx) => idx === i ? { ...t, [k]: v } : t))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.conducteur_id)      { toastError.champObligatoire('Conducteur'); return }
    if (!form.type_infraction_id) { toastError.champObligatoire("Type d'infraction"); return }
    if (!form.zone_constatee)     { toastError.champObligatoire('Zone de constatation'); return }
    if (form.date_heure > getNowLocal()) {
      toastError.champObligatoire('Date/heure — ne peut pas être dans le futur')
      return
    }

    setLoading(true)

    const res = await fetch('/api/infractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conducteur_id:           form.conducteur_id,
        type_infraction_id:      form.type_infraction_id,
        date_heure:              new Date(form.date_heure).toISOString(),
        localisation:            form.localisation  || null,
        description:             form.description   || null,
        zone_constatee:          form.zone_constatee || null,
        conducteur_refuse_signe: form.conducteur_refuse_signe,
        temoins:                 temoins.filter(t => t.nom.trim()),
      }),
    })

    if (res.status === 207) {
      toastSuccess.infractionEnregistree(selectedType?.libelle ?? 'infraction', selectedType?.points_retires ?? 0)
      toastWarn.validationManquante('Témoins non enregistrés — réessayez depuis la fiche infraction')
      router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/infractions')
      router.refresh()
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg: string = data.error ?? ''
      if (/suspendu|interdit/i.test(msg)) {
        toastError.conducteurSuspendu(selectedCond ? `${selectedCond.prenom} ${selectedCond.nom}` : 'Ce conducteur')
      } else {
        toastError.erreurServeur()
      }
      setLoading(false)
      return
    }

    toastSuccess.infractionEnregistree(selectedType?.libelle ?? 'infraction', selectedType?.points_retires ?? 0)
    router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/infractions')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* ─── 1. CONDUCTEUR ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <SectionHeader icon={User} title="Conducteur concerné" />
        <div className="p-5 space-y-3">
          <SearchableSelect
            value={form.conducteur_id}
            onChange={v => set('conducteur_id', v)}
            placeholder="Rechercher par nom ou matricule…"
            accentColor="#EF4444"
            options={conducteurs.map(c => ({
              value: c.id,
              label: `${c.prenom} ${c.nom}`,
              sublabel: c.statut === 'suspendu'
                ? `${c.matricule} · SUSPENDU · ${c.points_actuels} pts`
                : `${c.matricule} · ${c.points_actuels} pts`,
            }))}
          />

          {selectedCond && (
            <div className={`rounded-xl border p-4 space-y-3
              ${selectedCond.statut === 'suspendu'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-[#0D1117] border-[#30363D]'}`}>
              {/* Identité */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#21262D] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-[#8B949E]">
                    {selectedCond.prenom[0]}{selectedCond.nom[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#F0F6FC]">{selectedCond.prenom} {selectedCond.nom}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono text-[10px] text-[#8B949E]">{selectedCond.matricule}</span>
                    {selectedCond.fonction && (
                      <span className="text-[10px] text-[#484F58]">· {selectedCond.fonction}</span>
                    )}
                    {(() => {
                      const e = selectedCond.entreprises
                      const nom = Array.isArray(e) ? e[0]?.nom : e?.nom
                      return nom ? <span className="text-[10px] text-[#484F58]">· {nom}</span> : null
                    })()}
                  </div>
                </div>
                {selectedCond.statut === 'suspendu' && (
                  <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                    Suspendu
                  </span>
                )}
              </div>

              {/* Solde de points */}
              <PointsBar pts={selectedCond.points_actuels} />

              {/* Avertissement si solde faible */}
              {selectedCond.points_actuels <= 5 && selectedCond.points_actuels > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />
                  <p className="text-[11px] text-orange-300">Solde de points critique — {selectedCond.points_actuels} pts restants</p>
                </div>
              )}
              {selectedCond.points_actuels <= 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <ShieldAlert size={12} className="text-red-400 flex-shrink-0" />
                  <p className="text-[11px] text-red-300 font-bold">Solde de points épuisé — suspension en cours ou imminente</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. TYPE D'INFRACTION ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <SectionHeader icon={Tag} title="Type d'infraction" />
        <div className="p-5 space-y-3">
          <SearchableSelect
            value={form.type_infraction_id}
            onChange={v => set('type_infraction_id', v)}
            placeholder="Rechercher un type d'infraction…"
            accentColor="#EF4444"
            options={typesInfraction.map(t => ({
              value: t.id,
              label: `[${t.code}] ${t.libelle}`,
              sublabel: `${GRAVITE_LABEL[t.gravite] ?? t.gravite} · −${t.points_retires} pts · ${ZONES_LABEL[t.zone_applicable]}`,
            }))}
          />

          {selectedType && (
            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-[#8B949E]">{selectedType.code}</span>
                  <p className="text-sm font-bold text-[#F0F6FC] mt-0.5 leading-snug">{selectedType.libelle}</p>
                  <p className="text-[10px] text-[#8B949E] mt-0.5">{ZONES_LABEL[selectedType.zone_applicable]}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <GraviteBadge gravite={selectedType.gravite} />
                  <p className="text-lg font-black font-mono text-red-400 mt-1">−{selectedType.points_retires} pts</p>
                </div>
              </div>

              {/* Flags suspend_auto / retrait_definitif_auto */}
              {(selectedType.suspend_auto || selectedType.retrait_definitif_auto) && (
                <div className="space-y-1.5 pt-1 border-t border-[#21262D]">
                  {selectedType.suspend_auto && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <Zap size={12} className="text-orange-400 flex-shrink-0" />
                      <p className="text-[11px] text-orange-300 font-semibold">Déclenche une suspension automatique</p>
                    </div>
                  )}
                  {selectedType.retrait_definitif_auto && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertOctagon size={12} className="text-red-400 flex-shrink-0" />
                      <p className="text-[11px] text-red-300 font-bold">Peut entraîner un retrait définitif du permis</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {recidive?.est && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-orange-500/10 border border-orange-500/40 rounded-xl">
              <AlertOctagon size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-orange-400 uppercase tracking-wide">Récidive détectée</p>
                <p className="text-[11px] text-orange-300/80 mt-0.5">
                  {recidive.nb} infraction{recidive.nb > 1 ? 's' : ''} de ce type dans les 12 derniers mois.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── IMPACT ─── visible seulement quand conducteur + type sélectionnés */}
      {selectedCond && selectedType && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
          <SectionHeader icon={TrendingDown} title="Analyse d'impact" />
          <div className="p-5 space-y-4">

            {/* Bilan points */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Points actuels',  val: selectedCond.points_actuels, color: 'text-[#F0F6FC]' },
                { label: 'Points retirés',  val: `-${selectedType.points_retires}`, color: 'text-red-400' },
                {
                  label: 'Solde restant',
                  val: pointsApres,
                  color: (pointsApres ?? 0) <= 0 ? 'text-red-500' : (pointsApres ?? 0) <= 5 ? 'text-orange-400' : 'text-green-400',
                },
              ].map(item => (
                <div key={item.label} className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-[#8B949E] mb-1 leading-tight">{item.label}</p>
                  <p className={`text-xl font-black font-mono ${item.color}`}>{item.val}</p>
                </div>
              ))}
            </div>

            {/* Barre de points après déduction */}
            {pointsApres !== null && (
              <PointsBar pts={Math.max(0, pointsApres)} />
            )}

            {/* Alertes conséquences */}
            <div className="space-y-2">
              {(pointsApres ?? 1) <= 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <ShieldAlert size={15} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-red-400 uppercase tracking-wide">Solde épuisé après infraction</p>
                    <p className="text-[11px] text-red-300/80 mt-0.5">Le conducteur passera à 0 point — risque de suspension</p>
                  </div>
                </div>
              )}
              {selectedType.suspend_auto && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <Zap size={15} className="text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-orange-400 uppercase tracking-wide">Suspension automatique</p>
                    <p className="text-[11px] text-orange-300/80 mt-0.5">Cette infraction déclenche une suspension immédiate du permis</p>
                  </div>
                </div>
              )}
              {selectedType.retrait_definitif_auto && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-900/20 border border-red-500/50 rounded-xl">
                  <AlertOctagon size={15} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-red-400 uppercase tracking-wide">Retrait définitif possible</p>
                    <p className="text-[11px] text-red-300/80 mt-0.5">Ce type d&apos;infraction peut entraîner un retrait définitif du permis de conduire</p>
                  </div>
                </div>
              )}
              {selectedCond.statut === 'suspendu' && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <ShieldAlert size={15} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-red-400 uppercase tracking-wide">Conducteur déjà suspendu</p>
                    <p className="text-[11px] text-red-300/80 mt-0.5">Ce conducteur est en suspension — l&apos;infraction sera tout de même enregistrée</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. CONSTATATION ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <SectionHeader icon={MapPin} title="Constatation" />
        <div className="p-5 space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Zone de constatation *</label>
              <select value={form.zone_constatee} onChange={e => set('zone_constatee', e.target.value)}
                className={`${inp} cursor-pointer ${zoneIncompatible ? '!border-amber-500/50' : ''}`}>
                <option value="">Sélectionner la zone</option>
                <option value="miniere">Zone minière</option>
                <option value="hors_miniere">Hors zone minière</option>
              </select>
              {zoneIncompatible && (
                <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={11} className="flex-shrink-0" />
                  Type applicable en {ZONES_LABEL[selectedType!.zone_applicable]} uniquement
                </p>
              )}
            </div>
            <div>
              <label className={lbl}>Date et heure *</label>
              <input
                type="datetime-local"
                value={form.date_heure}
                onChange={e => set('date_heure', e.target.value)}
                max={maxDateTime}
                className={`${inp} [color-scheme:dark] ${dateFuture ? '!border-red-500/60' : ''}`}
              />
              {dateFuture && (
                <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                  <Clock size={11} className="flex-shrink-0" />Date dans le futur — non autorisé
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={lbl}>Localisation précise</label>
            <input type="text" value={form.localisation} onChange={e => set('localisation', e.target.value)}
              placeholder="Carrière nord, zone A, point km 3…" className={inp} />
          </div>

          <div>
            <label className={`${lbl} flex items-center justify-between`}>
              <span>Description des faits</span>
              {form.description.length > 0 && (
                <span className="text-[#484F58] font-mono font-normal normal-case tracking-normal">
                  {form.description.length} car.
                </span>
              )}
            </label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Détails de l'infraction observée…"
              className={`${inp} resize-none`} />
          </div>

          <label className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl border cursor-pointer transition-all
            ${form.conducteur_refuse_signe
              ? 'bg-red-500/5 border-red-500/25'
              : 'bg-[#0D1117] border-[#30363D] hover:border-[#30363D]/80'}`}>
            <input type="checkbox" checked={form.conducteur_refuse_signe}
              onChange={e => set('conducteur_refuse_signe', e.target.checked)}
              className="w-5 h-5 accent-[#EF4444] cursor-pointer flex-shrink-0" />
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${form.conducteur_refuse_signe ? 'text-red-400' : 'text-[#8B949E]'}`}>
                Refus de signature du PV
              </p>
              <p className="text-[10px] text-[#8B949E]/60">Le conducteur a refusé de signer</p>
            </div>
          </label>
        </div>
      </div>

      {/* ─── 4. TÉMOINS ─── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl">
        <SectionHeader
          icon={Users}
          title={`Témoins${temoins.length > 0 ? ` (${temoins.length})` : ''}`}
          subtitle="Optionnel"
          action={
            <button type="button" onClick={addTemoin}
              className="cursor-pointer flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-[#30363D]
                text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#EF4444]/40 transition-all">
              <Plus size={11} /> Ajouter
            </button>
          }
        />
        <div className="p-5 space-y-3">
          {temoins.length === 0 && (
            <p className="text-[11px] text-[#484F58] italic">Aucun témoin déclaré</p>
          )}
          {temoins.map((t, i) => (
            <div key={i} className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Témoin {i + 1}</span>
                <button type="button" onClick={() => removeTemoin(i)}
                  className="cursor-pointer p-1 text-[#8B949E] hover:text-red-400 transition-colors rounded">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Nom *</label>
                  <input value={t.nom} onChange={e => setTemoin(i, 'nom', e.target.value)}
                    placeholder="Nom" className={`${inp} text-sm py-2`} />
                </div>
                <div>
                  <label className={lbl}>Prénom</label>
                  <input value={t.prenom} onChange={e => setTemoin(i, 'prenom', e.target.value)}
                    placeholder="Prénom" className={`${inp} text-sm py-2`} />
                </div>
                <div>
                  <label className={lbl}>Matricule</label>
                  <input value={t.matricule} onChange={e => setTemoin(i, 'matricule', e.target.value)}
                    placeholder="Matricule" className={`${inp} font-mono text-sm py-2`} />
                </div>
                <div>
                  <label className={lbl}>Téléphone</label>
                  <input value={t.telephone} onChange={e => setTemoin(i, 'telephone', e.target.value)}
                    placeholder="+221 77…" className={`${inp} text-sm py-2`} />
                </div>
              </div>
              <div>
                <label className={lbl}>Déclaration</label>
                <textarea value={t.declaration} onChange={e => setTemoin(i, 'declaration', e.target.value)}
                  rows={2} placeholder="Déclaration du témoin…"
                  className={`${inp} resize-none text-sm py-2`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ACTIONS ─── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={() => router.back()}
          className="cursor-pointer px-4 py-3 min-h-[44px] text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:border-[#EF4444]/30 transition-colors">
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || dateFuture}
          className={`min-h-[44px] px-6 py-3 text-sm font-bold rounded-xl transition-all duration-150
            ${!loading && !dateFuture
              ? 'bg-[#EF4444] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : 'bg-[#21262D] text-[#484F58] cursor-not-allowed'
            }`}
        >
          {loading ? 'Enregistrement…' : "Déclarer l'infraction"}
        </button>
      </div>
    </form>
  )
}
