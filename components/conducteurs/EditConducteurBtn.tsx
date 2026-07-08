'use client'

import { useState } from 'react'
import { Pencil, X, Loader2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Conducteur, StatutConducteur, ZoneValidite } from '@/lib/types'

interface Entreprise {
  id: string
  nom: string
}

interface Props {
  conducteur: Conducteur
  entreprises: Entreprise[]
  canChangeStatut: boolean
}

const STATUTS: { value: StatutConducteur; label: string; color: string }[] = [
  { value: 'actif',     label: 'Actif',     color: 'text-[#10B981]' },
  { value: 'suspendu',  label: 'Suspendu',  color: 'text-[#EF4444]' },
  { value: 'retire',    label: 'Retraité',  color: 'text-[#8B949E]' },
  { value: 'inactif',   label: 'Inactif',   color: 'text-[#F59E0B]' },
]

const ZONES: { value: ZoneValidite; label: string }[] = [
  { value: 'miniere',        label: 'Zone minière' },
  { value: 'administrative', label: 'Zone administrative' },
  { value: 'les_deux',       label: 'Toutes les zones' },
]

export default function EditConducteurBtn({ conducteur, entreprises, canChangeStatut }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const [nom,           setNom]           = useState(conducteur.nom)
  const [prenom,        setPrenom]        = useState(conducteur.prenom)
  const [dateNaissance, setDateNaissance] = useState(conducteur.date_naissance ?? '')
  const [permisNat,     setPermisNat]     = useState(conducteur.permis_national ?? '')
  const [permisAutorite, setPermisAutorite] = useState(conducteur.permis_civil_autorite ?? '')
  const [entrepriseId,  setEntrepriseId]  = useState(conducteur.entreprise_id)
  const [statut,        setStatut]        = useState<StatutConducteur>(conducteur.statut)
  // V2
  const [fonction,       setFonction]       = useState(conducteur.fonction ?? '')
  const [zoneValidite,   setZoneValidite]   = useState<ZoneValidite | ''>(conducteur.zone_validite ?? '')
  const [valSst,         setValSst]         = useState(conducteur.validation_sst)
  const [dateSst,        setDateSst]        = useState(conducteur.date_validation_sst ?? '')
  const [valClinique,    setValClinique]    = useState(conducteur.validation_clinique)
  const [dateClinique,   setDateClinique]   = useState(conducteur.date_validation_clinique ?? '')
  const [urgNom,         setUrgNom]         = useState(conducteur.contact_urgence_nom ?? '')
  const [urgTel,         setUrgTel]         = useState(conducteur.contact_urgence_tel ?? '')

  function resetForm() {
    setNom(conducteur.nom)
    setPrenom(conducteur.prenom)
    setDateNaissance(conducteur.date_naissance ?? '')
    setPermisNat(conducteur.permis_national ?? '')
    setPermisAutorite(conducteur.permis_civil_autorite ?? '')
    setEntrepriseId(conducteur.entreprise_id)
    setStatut(conducteur.statut)
    setFonction(conducteur.fonction ?? '')
    setZoneValidite(conducteur.zone_validite ?? '')
    setValSst(conducteur.validation_sst)
    setDateSst(conducteur.date_validation_sst ?? '')
    setValClinique(conducteur.validation_clinique)
    setDateClinique(conducteur.date_validation_clinique ?? '')
    setUrgNom(conducteur.contact_urgence_nom ?? '')
    setUrgTel(conducteur.contact_urgence_tel ?? '')
    setErreur(null)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!nom.trim() || !prenom.trim()) {
      setErreur('Nom et prénom sont obligatoires.')
      return
    }
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/conducteurs/${conducteur.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom:             nom.trim(),
          prenom:          prenom.trim(),
          date_naissance:  dateNaissance || null,
          permis_national:       permisNat.trim()       || null,
          permis_civil_autorite: permisAutorite.trim()  || null,
          entreprise_id:         entrepriseId,
          statut:          canChangeStatut ? statut : undefined,
          // V2
          fonction:                  fonction.trim() || null,
          zone_validite:             zoneValidite    || null,
          validation_sst:            valSst,
          date_validation_sst:       valSst    ? (dateSst     || null) : null,
          validation_clinique:       valClinique,
          date_validation_clinique:  valClinique ? (dateClinique || null) : null,
          contact_urgence_nom:       urgNom.trim() || null,
          contact_urgence_tel:       urgTel.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setErreur(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 transition-colors`

  const labelCls = `block text-xs font-semibold text-[#8B949E] mb-1.5 uppercase tracking-wide`

  return (
    <>
      <button
        onClick={() => { resetForm(); setOpen(true) }}
        className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] text-sm font-medium rounded-lg
          hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#F59E0B]/40 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15)]
          active:scale-[0.97] transition-all duration-150"
      >
        <Pencil size={14} />
        Modifier
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[90dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D]">
              <div>
                <h3 className="text-base font-bold text-[#F0F6FC]">Modifier le conducteur</h3>
                <p className="text-xs text-[#8B949E] mt-0.5 font-mono">{conducteur.matricule}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="cursor-pointer p-2 text-[#8B949E] hover:text-[#F0F6FC] rounded-lg hover:bg-[#21262D] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form id="edit-conducteur-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Nom / Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prénom</label>
                  <input
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                    className={inputCls}
                    placeholder="Prénom"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Nom</label>
                  <input
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className={inputCls}
                    placeholder="Nom"
                    required
                  />
                </div>
              </div>

              {/* Date de naissance */}
              <div>
                <label className={labelCls}>Date de naissance</label>
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Permis civil */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>N° Permis national</label>
                  <input
                    value={permisNat}
                    onChange={e => setPermisNat(e.target.value)}
                    className={`${inputCls} font-mono`}
                    placeholder="SN-2024-123456"
                  />
                </div>
                <div>
                  <label className={labelCls}>Autorité émettrice</label>
                  <input
                    value={permisAutorite}
                    onChange={e => setPermisAutorite(e.target.value)}
                    className={inputCls}
                    placeholder="Préfecture de Dakar"
                  />
                </div>
              </div>

              {/* Entreprise */}
              <div>
                <label className={labelCls}>Entreprise</label>
                <select
                  value={entrepriseId}
                  onChange={e => setEntrepriseId(e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                  required
                >
                  {entreprises.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.nom}</option>
                  ))}
                </select>
              </div>

              {/* Statut (admin/hse seulement) */}
              {canChangeStatut && (
                <div>
                  <label className={labelCls}>Statut conducteur</label>
                  <div className="grid grid-cols-4 gap-2">
                    {STATUTS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatut(s.value)}
                        className={`cursor-pointer py-2 px-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                          statut === s.value
                            ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                            : 'border-[#30363D] text-[#8B949E] hover:border-[#8B949E]'
                        } ${statut === s.value ? s.color : ''}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {statut !== conducteur.statut && statut === 'suspendu' && (
                    <p className="text-xs text-amber-400 mt-1.5">
                      ⚠ La suspension manuelle n&apos;affecte pas les points du conducteur.
                    </p>
                  )}
                </div>
              )}

              {/* V2 — Poste & Zone */}
              <div className="pt-3 border-t border-[#30363D] space-y-3">
                <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Poste & Zone</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Fonction</label>
                    <input value={fonction} onChange={e => setFonction(e.target.value)}
                      placeholder="Chauffeur minier" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Zone de validité</label>
                    <select value={zoneValidite} onChange={e => setZoneValidite(e.target.value as ZoneValidite | '')}
                      className={`${inputCls} cursor-pointer`}>
                      <option value="">Non définie</option>
                      {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* V2 — Habilitations */}
              <div className="pt-3 border-t border-[#30363D] space-y-3">
                <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Habilitations</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={valSst} onChange={e => setValSst(e.target.checked)}
                      className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
                    <span className="text-xs text-[#F0F6FC]">SST validée</span>
                  </label>
                  {valSst && (
                    <input type="date" value={dateSst} onChange={e => setDateSst(e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`} />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={valClinique} onChange={e => setValClinique(e.target.checked)}
                      className="w-4 h-4 accent-[#F59E0B] cursor-pointer" />
                    <span className="text-xs text-[#F0F6FC]">Visite médicale validée</span>
                  </label>
                  {valClinique && (
                    <input type="date" value={dateClinique} onChange={e => setDateClinique(e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`} />
                  )}
                </div>
              </div>

              {/* V2 — Contact urgence */}
              <div className="pt-3 border-t border-[#30363D] space-y-3">
                <p className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Contact d&apos;urgence</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nom</label>
                    <input value={urgNom} onChange={e => setUrgNom(e.target.value)}
                      placeholder="Fatou Diallo" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Téléphone</label>
                    <input value={urgTel} onChange={e => setUrgTel(e.target.value)}
                      placeholder="+221 77 000 00 00" className={inputCls} />
                  </div>
                </div>
              </div>

              {erreur && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {erreur}
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#30363D]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="cursor-pointer flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="edit-conducteur-form"
                disabled={loading}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
