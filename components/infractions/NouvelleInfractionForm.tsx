'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, AlertOctagon } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { GRAVITE_LABEL } from '@/lib/gravite'
import type { ZoneInfraction } from '@/lib/types'

interface Conducteur { id: string; matricule: string; nom: string; prenom: string }
interface TypeInfraction {
  id: string; code: string; libelle: string; gravite: string
  points_retires: number; zone_applicable: ZoneInfraction
}

interface Temoin { nom: string; prenom: string; matricule: string; telephone: string; declaration: string }

interface Props {
  conducteurs: Conducteur[]
  typesInfraction: TypeInfraction[]
  conducteurIdDefault?: string
}

import GraviteBadge from '@/components/ui/GraviteBadge'

const ZONES_LABEL: Record<ZoneInfraction, string> = {
  miniere:      'Zone minière',
  hors_miniere: 'Hors zone minière',
  les_deux:     'Toutes zones',
}

function emptyTemoin(): Temoin {
  return { nom: '', prenom: '', matricule: '', telephone: '', declaration: '' }
}

export default function NouvelleInfractionForm({ conducteurs, typesInfraction, conducteurIdDefault }: Props) {
  const router = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [recidive, setRecidive] = useState<{ est: boolean; nb: number } | null>(null)

  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  const defaultDateTime = now.toISOString().slice(0, 16)

  const [form, setForm] = useState({
    conducteur_id:           conducteurIdDefault ?? '',
    type_infraction_id:      '',
    date_heure:              defaultDateTime,
    localisation:            '',
    description:             '',
    zone_constatee:          '' as ZoneInfraction | '',
    conducteur_refuse_signe: false,
  })
  const [temoins, setTemoins] = useState<Temoin[]>([])

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  const selectedType = typesInfraction.find(t => t.id === form.type_infraction_id)

  useEffect(() => {
    if (!form.conducteur_id || !form.type_infraction_id) {
      setRecidive(null)
      return
    }
    const params = new URLSearchParams({
      conducteur_id:      form.conducteur_id,
      type_infraction_id: form.type_infraction_id,
    })
    fetch(`/api/infractions/recidive-check?${params}`)
      .then(r => r.json())
      .then(d => setRecidive({ est: d.est_recidive, nb: d.nb_recidives }))
      .catch(() => setRecidive(null))
  }, [form.conducteur_id, form.type_infraction_id])

  // Témoins
  function addTemoin()   { setTemoins(prev => [...prev, emptyTemoin()]) }
  function removeTemoin(i: number) { setTemoins(prev => prev.filter((_, idx) => idx !== i)) }
  function setTemoin(i: number, k: keyof Temoin, v: string) {
    setTemoins(prev => prev.map((t, idx) => idx === i ? { ...t, [k]: v } : t))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.conducteur_id)      { setError('Sélectionnez un conducteur'); return }
    if (!form.type_infraction_id) { setError("Sélectionnez le type d'infraction"); return }
    if (!form.zone_constatee)     { setError('Indiquez la zone de constatation'); return }

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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur serveur')
      setLoading(false)
      return
    }

    router.push(conducteurIdDefault ? `/conducteurs/${form.conducteur_id}` : '/infractions')
    router.refresh()
  }

  const inputCls = `w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 transition-colors`

  return (
    <form onSubmit={handleSubmit} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-5">

      {/* Conducteur */}
      <div>
        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Conducteur *</label>
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
      </div>

      {/* Type infraction */}
      <div>
        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Type d&apos;infraction *</label>
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
          <div className="mt-2 px-4 py-3 bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-[#8B949E]">{selectedType.code}</span>
              <p className="text-sm text-[#F0F6FC] mt-0.5">{selectedType.libelle}</p>
              <span className="text-xs text-[#8B949E]">{ZONES_LABEL[selectedType.zone_applicable]}</span>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <GraviteBadge gravite={selectedType.gravite} />
              <p className="text-sm font-mono font-bold text-red-400 mt-0.5">-{selectedType.points_retires} pts</p>
            </div>
          </div>
        )}
      </div>

      {/* Badge RÉCIDIVE (UC-31) */}
      {recidive?.est && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-orange-500/10 border border-orange-500/40 rounded-xl">
          <AlertOctagon size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-400 uppercase tracking-wide">Récidive détectée</p>
            <p className="text-xs text-orange-300/80 mt-0.5">
              Ce conducteur a déjà commis {recidive.nb} infraction{recidive.nb > 1 ? 's' : ''} de ce
              type au cours des 12 derniers mois.
            </p>
          </div>
        </div>
      )}

      {/* Zone constatée + Date/heure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Zone de constatation *</label>
          <select value={form.zone_constatee} onChange={e => set('zone_constatee', e.target.value)}
            required className={`${inputCls} cursor-pointer`}>
            <option value="">Sélectionner la zone</option>
            <option value="miniere">Zone minière</option>
            <option value="hors_miniere">Hors zone minière</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Date et heure *</label>
          <input type="datetime-local" value={form.date_heure}
            onChange={e => set('date_heure', e.target.value)} required
            className={`${inputCls} [color-scheme:dark]`} />
        </div>
      </div>

      {/* Localisation */}
      <div>
        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Localisation</label>
        <input type="text" value={form.localisation} onChange={e => set('localisation', e.target.value)}
          placeholder="Zone A, Carrière nord…" className={inputCls} />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} placeholder="Détails de l'infraction observée…" className={`${inputCls} resize-none`} />
      </div>

      {/* Refus de signature */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.conducteur_refuse_signe}
            onChange={e => set('conducteur_refuse_signe', e.target.checked)}
            className="w-4 h-4 accent-[#EF4444] cursor-pointer" />
          <span className="text-sm text-[#F0F6FC]">Le conducteur a refusé de signer le PV</span>
        </label>
      </div>

      {/* Témoins */}
      <div className="pt-4 border-t border-[#30363D]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">
            Témoins {temoins.length > 0 && `(${temoins.length})`}
          </p>
          <button type="button" onClick={addTemoin}
            className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#30363D]
              text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#EF4444]/40 transition-all">
            <Plus size={12} /> Ajouter un témoin
          </button>
        </div>

        {temoins.length === 0 && (
          <p className="text-xs text-[#8B949E] italic">Aucun témoin — optionnel</p>
        )}

        <div className="space-y-4">
          {temoins.map((t, i) => (
            <div key={i} className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8B949E]">Témoin {i + 1}</span>
                <button type="button" onClick={() => removeTemoin(i)}
                  className="cursor-pointer p-1 text-[#8B949E] hover:text-red-400 transition-colors rounded">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1">Nom *</label>
                  <input value={t.nom} onChange={e => setTemoin(i, 'nom', e.target.value)}
                    placeholder="Nom" className={`${inputCls} text-xs py-2`} />
                </div>
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1">Prénom</label>
                  <input value={t.prenom} onChange={e => setTemoin(i, 'prenom', e.target.value)}
                    placeholder="Prénom" className={`${inputCls} text-xs py-2`} />
                </div>
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1">Matricule</label>
                  <input value={t.matricule} onChange={e => setTemoin(i, 'matricule', e.target.value)}
                    placeholder="Matricule" className={`${inputCls} font-mono text-xs py-2`} />
                </div>
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1">Téléphone</label>
                  <input value={t.telephone} onChange={e => setTemoin(i, 'telephone', e.target.value)}
                    placeholder="+221 77…" className={`${inputCls} text-xs py-2`} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8B949E] mb-1">Déclaration</label>
                <textarea value={t.declaration} onChange={e => setTemoin(i, 'declaration', e.target.value)}
                  rows={2} placeholder="Déclaration du témoin…"
                  className={`${inputCls} resize-none text-xs py-2`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="cursor-pointer px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:border-[#EF4444]/30 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="cursor-pointer px-5 py-2.5 bg-[#EF4444] text-white text-sm font-semibold rounded-lg
            hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}>
          {loading ? 'Enregistrement…' : "Déclarer l'infraction"}
        </button>
      </div>
    </form>
  )
}
