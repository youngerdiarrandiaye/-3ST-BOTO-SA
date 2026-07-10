'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, Loader2, UserCheck, Stethoscope, ShieldCheck, Users } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

type Etape = 'resp_dept' | 'resp_sst' | 'equipe_sst' | 'clinique'

interface EtapeData {
  cle: Etape
  label: string
  icon: React.ReactNode
  valide: boolean
  date: string | null
  valideur: string | null
}

interface Props {
  conducteurId: string
  validation_resp_dept: boolean
  date_validation_resp_dept: string | null
  nom_resp_dept: string | null
  autorisation_resp_sst: boolean
  date_autorisation_resp_sst: string | null
  nom_resp_sst: string | null
  autorisation_equipe_sst: boolean
  date_autorisation_equipe_sst: string | null
  nom_equipe_sst: string | null
  autorisation_clinique: boolean
  date_autorisation_clinique: string | null
  medecin_clinique: string | null
  canValider: boolean
}

export default function WorkflowValidations({
  conducteurId,
  validation_resp_dept, date_validation_resp_dept, nom_resp_dept,
  autorisation_resp_sst, date_autorisation_resp_sst, nom_resp_sst,
  autorisation_equipe_sst, date_autorisation_equipe_sst, nom_equipe_sst,
  autorisation_clinique, date_autorisation_clinique, medecin_clinique,
  canValider,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<Etape | null>(null)
  const [open, setOpen] = useState<Etape | null>(null)
  const [nom, setNom] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const etapes: EtapeData[] = [
    {
      cle: 'resp_dept', label: 'Responsable département',
      icon: <UserCheck size={18} />,
      valide: validation_resp_dept,
      date: date_validation_resp_dept,
      valideur: nom_resp_dept,
    },
    {
      cle: 'resp_sst', label: 'Responsable SST',
      icon: <ShieldCheck size={18} />,
      valide: autorisation_resp_sst,
      date: date_autorisation_resp_sst,
      valideur: nom_resp_sst,
    },
    {
      cle: 'equipe_sst', label: 'Équipe SST',
      icon: <Users size={18} />,
      valide: autorisation_equipe_sst,
      date: date_autorisation_equipe_sst,
      valideur: nom_equipe_sst,
    },
    {
      cle: 'clinique', label: 'Clinique (médecin)',
      icon: <Stethoscope size={18} />,
      valide: autorisation_clinique,
      date: date_autorisation_clinique,
      valideur: medecin_clinique,
    },
  ]

  const total = etapes.filter(e => e.valide).length
  const allDone = total === 4

  async function soumettre(etape: Etape, valider: boolean) {
    setLoading(etape)
    const res = await fetch(`/api/conducteurs/${conducteurId}/validations-workflow`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etape,
        valider,
        nom_valideur: nom.trim() || undefined,
        date_validation: date,
        medecin: etape === 'clinique' ? nom.trim() || undefined : undefined,
      }),
    })
    setLoading(null)
    setOpen(null)
    setNom('')
    if (!res.ok) {
      if (res.status === 403) toastError.rlsRefus()
      else toastError.erreurServeur()
      return
    }
    if (valider) {
      const label = etapes.find(e => e.cle === etape)?.label ?? etape
      toastSuccess.validationApprouvee(label)
    }
    router.refresh()
  }

  const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 transition-colors`

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[#30363D] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
            style={{ width: `${(total / 4) * 100}%` }}
          />
        </div>
        <span className="text-sm font-mono font-bold text-[#F0F6FC] flex-shrink-0">
          {total}/4
        </span>
        {allDone && (
          <span className="text-xs px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full font-semibold">
            Toutes validées ✓
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {etapes.map((e, idx) => (
          <div key={e.cle} className="flex gap-4">
            {/* Ligne verticale */}
            <div className="flex flex-col items-center w-10 flex-shrink-0">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                e.valide
                  ? 'bg-green-500/10 border-green-500 text-green-400'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8B949E]'
              }`}>
                {e.valide ? <CheckCircle size={18} className="text-green-400" /> : <Clock size={18} />}
              </div>
              {idx < 3 && (
                <div className={`w-0.5 h-8 mt-1 ${
                  e.valide ? 'bg-green-500/30' : 'bg-[#30363D]'
                }`} />
              )}
            </div>

            {/* Contenu */}
            <div className="pb-6 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${e.valide ? 'text-[#F0F6FC]' : 'text-[#8B949E]'}`}>
                    {e.label}
                  </p>
                  {e.valide && e.valideur && (
                    <p className="text-xs text-[#8B949E] mt-0.5">{e.valideur}</p>
                  )}
                  {e.valide && e.date && (
                    <p className="text-xs text-[#8B949E] mt-0.5 font-mono">
                      {new Date(e.date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {canValider && (
                  <div className="flex gap-2 flex-shrink-0">
                    {!e.valide ? (
                      <button
                        onClick={() => { setOpen(e.cle); setNom(''); setDate(new Date().toISOString().slice(0, 10)) }}
                        disabled={loading === e.cle}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg
                          hover:bg-[#D97706] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loading === e.cle ? <Loader2 size={12} className="animate-spin" /> : null}
                        Valider
                      </button>
                    ) : (
                      <button
                        onClick={() => soumettre(e.cle, false)}
                        disabled={loading === e.cle}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8B949E] border border-[#30363D]
                          rounded-lg hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loading === e.cle ? <Loader2 size={12} className="animate-spin" /> : null}
                        Révoquer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Formulaire inline de validation */}
              {open === e.cle && (
                <div className="mt-3 p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wide">
                    {e.cle === 'clinique' ? 'Médecin' : 'Nom du valideur'}
                  </p>
                  <input
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    placeholder={e.cle === 'clinique' ? 'Dr. Nom du médecin' : 'Prénom Nom'}
                    className={inputCls}
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setOpen(null)}
                      className="flex-1 py-2 text-xs text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => soumettre(e.cle, true)}
                      disabled={loading === e.cle}
                      className="flex-1 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg hover:bg-[#D97706] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading === e.cle ? 'Enregistrement…' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
