'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BadgeStatut from './BadgeStatut'
import QrCodeDisplay from './QrCodeDisplay'
import TraiterInfractionBtn from '@/components/infractions/TraiterInfractionBtn'
import LeverSanctionBtn from '@/components/sanctions/LeverSanctionBtn'
import PermisActionBtn from '@/components/permis/PermisActionBtn'
import GraviteBadge from '@/components/ui/GraviteBadge'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import { STATUT_FORMATION_LABEL } from '@/lib/labels'
import NouveauTestBtn from '@/components/tests/NouveauTestBtn'
import SaisirResultatBtn from '@/components/tests/SaisirResultatBtn'
import type { PermisInterne, Infraction, Formation, Sanction, TestConduite, StatutPermis } from '@/lib/types'
const STATUT_INF_CLS = {
  declaree:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  traitee:   'bg-green-500/10  text-green-400  border-green-500/20',
  contestee: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
const STATUT_INF_LABEL = {
  declaree:  'En attente',
  traitee:   'Traitée',
  contestee: 'Contestée',
}
const STATUT_FORM_CLS = {
  en_cours: 'bg-blue-500/10   text-blue-400   border-blue-500/20',
  validee:  'bg-green-500/10  text-green-400  border-green-500/20',
  annulee:  'bg-gray-500/10   text-gray-400   border-gray-500/20',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface ConducteurValidations {
  validation_sst: boolean
  date_validation_sst: string | null
  validation_clinique: boolean
  date_validation_clinique: string | null
}

interface Props {
  permis: PermisInterne[]
  infractions: Infraction[]
  formations: Formation[]
  sanctions: Sanction[]
  historique: any[]
  tests: TestConduite[]
  conducteurId: string
  conducteur: ConducteurValidations
  canTraiter?: boolean
  canLever?: boolean
  canGererPermis?: boolean
  canGererTests?: boolean
}

const ONGLETS = ['Permis', 'Validations', 'Infractions', 'Formations', 'Sanctions', 'Historique points', 'Tests']

export default function OngletsConducteur({
  permis, infractions, formations, sanctions, historique, tests,
  conducteurId, conducteur, canTraiter = false, canLever = false,
  canGererPermis = false, canGererTests = false,
}: Props) {
  useRealtimeRefresh(['infractions', 'sanctions', 'formations', 'conducteurs', 'permis_internes', 'tests_conduite'])
  const router = useRouter()
  const [actif, setActif] = useState(0)
  const [validating, setValidating] = useState<'sst' | 'clinique' | null>(null)

  async function handleValidation(type: 'sst' | 'clinique', value: boolean) {
    setValidating(type)
    try {
      await fetch(`/api/conducteurs/${conducteurId}/validations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })
      router.refresh()
    } finally {
      setValidating(null)
    }
  }

  const COUNTS = [permis.length, 0, infractions.length, formations.length, sanctions.length, historique.length, tests.length]

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">

      {/* Tabs header */}
      <div className="flex border-b border-[#30363D] overflow-x-auto">
        {ONGLETS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActif(i)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer
              ${actif === i
                ? 'text-[#F59E0B] border-[#F59E0B] bg-[#F59E0B]/5'
                : 'text-[#8B949E] border-transparent hover:text-[#F0F6FC] hover:bg-[#21262D]'
              }`}
          >
            {label}
            {COUNTS[i] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono
                ${actif === i ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#21262D] text-[#8B949E]'}`}>
                {COUNTS[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="p-5">

        {/* --- PERMIS --- */}
        {actif === 0 && (
          <div className="space-y-3">
            {permis.length === 0
              ? <EmptyState message="Aucun permis délivré" />
              : permis.map(p => {
                  const isExpire        = new Date(p.date_expiration) < new Date()
                  const effectiveStatut = (p.statut === 'valide' && isExpire ? 'expire' : p.statut) as StatutPermis
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#F59E0B]/20 transition-colors gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#F0F6FC]">{p.numero}</span>
                          <BadgeStatut statut={effectiveStatut} />
                        </div>
                        <p className="text-xs text-[#8B949E]">
                          Délivré le {fmt(p.date_delivrance)} · Expire le{' '}
                          <span className={isExpire ? 'text-red-400 font-semibold' : 'text-[#F0F6FC]'}>
                            {fmt(p.date_expiration)}
                          </span>
                          {isExpire && ' ⚠'}
                        </p>
                        {p.categories.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {p.categories.map(cat => (
                              <span key={cat} className="text-xs px-2 py-0.5 bg-[#21262D] rounded text-[#8B949E]">{cat}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <QrCodeDisplay value={p.numero} size={56} label={p.numero} />
                        {canGererPermis && <PermisActionBtn permisId={p.id} statut={p.statut} conducteurId={conducteurId} dateExpiration={p.date_expiration} />}
                        <Link
                          href={`/permis/${p.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                            text-[#8B949E] border border-[#30363D] hover:text-[#F0F6FC] hover:border-[#F59E0B]/40
                            hover:bg-[#21262D] active:scale-[0.97] transition-all duration-150"
                        >
                          🖨 Imprimer
                        </Link>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* --- VALIDATIONS --- */}
        {actif === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-[#8B949E] mb-4">
              Ces deux validations sont <span className="text-[#F0F6FC] font-semibold">obligatoires</span> avant de pouvoir délivrer un permis interne.
            </p>

            {/* SST */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              conducteur.validation_sst
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-[#0D1117] border-[#30363D]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                  conducteur.validation_sst ? 'bg-green-500/15' : 'bg-[#21262D]'
                }`}>
                  {conducteur.validation_sst ? '✅' : '⬜'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F0F6FC]">Habilitation SST</p>
                  <p className="text-xs text-[#8B949E] mt-0.5">Santé & Sécurité au Travail</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                {conducteur.validation_sst ? (
                  <>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                      Validée
                    </span>
                    {conducteur.date_validation_sst && (
                      <p className="text-xs text-[#8B949E]">le {fmt(conducteur.date_validation_sst)}</p>
                    )}
                    {canGererTests && (
                      <button
                        onClick={() => handleValidation('sst', false)}
                        disabled={validating === 'sst'}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5
                          hover:bg-red-500/15 hover:border-red-500/40 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
                      >
                        {validating === 'sst' ? '…' : 'Révoquer'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      Non validée
                    </span>
                    {canGererTests && (
                      <button
                        onClick={() => handleValidation('sst', true)}
                        disabled={validating === 'sst'}
                        className="text-xs px-2.5 py-1 rounded-lg border border-green-500/20 text-green-400 bg-green-500/5
                          hover:bg-green-500/15 hover:border-green-500/40 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
                      >
                        {validating === 'sst' ? '…' : 'Valider'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Clinique */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              conducteur.validation_clinique
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-[#0D1117] border-[#30363D]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                  conducteur.validation_clinique ? 'bg-green-500/15' : 'bg-[#21262D]'
                }`}>
                  {conducteur.validation_clinique ? '✅' : '⬜'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F0F6FC]">Visite médicale clinique</p>
                  <p className="text-xs text-[#8B949E] mt-0.5">Certificat médical d&apos;aptitude</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                {conducteur.validation_clinique ? (
                  <>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                      Validée
                    </span>
                    {conducteur.date_validation_clinique && (
                      <p className="text-xs text-[#8B949E]">le {fmt(conducteur.date_validation_clinique)}</p>
                    )}
                    {canGererTests && (
                      <button
                        onClick={() => handleValidation('clinique', false)}
                        disabled={validating === 'clinique'}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5
                          hover:bg-red-500/15 hover:border-red-500/40 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
                      >
                        {validating === 'clinique' ? '…' : 'Révoquer'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      Non validée
                    </span>
                    {canGererTests && (
                      <button
                        onClick={() => handleValidation('clinique', true)}
                        disabled={validating === 'clinique'}
                        className="text-xs px-2.5 py-1 rounded-lg border border-green-500/20 text-green-400 bg-green-500/5
                          hover:bg-green-500/15 hover:border-green-500/40 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
                      >
                        {validating === 'clinique' ? '…' : 'Valider'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Résumé */}
            <div className={`mt-2 flex items-center gap-3 p-3.5 rounded-lg border ${
              conducteur.validation_sst && conducteur.validation_clinique
                ? 'bg-green-500/5 border-green-500/20 text-green-400'
                : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
            }`}>
              <span className="text-base flex-shrink-0">
                {conducteur.validation_sst && conducteur.validation_clinique ? '✅' : '⚠️'}
              </span>
              <p className="text-xs font-semibold">
                {conducteur.validation_sst && conducteur.validation_clinique
                  ? 'Toutes les validations sont complètes — la délivrance du permis est autorisée.'
                  : `Validations manquantes : ${[
                      !conducteur.validation_sst && 'SST',
                      !conducteur.validation_clinique && 'Visite médicale',
                    ].filter(Boolean).join(' + ')} — impossible de délivrer un permis.`
                }
              </p>
            </div>
          </div>
        )}

        {/* --- INFRACTIONS --- */}
        {actif === 2 && (
          <div className="space-y-2">
            {infractions.length === 0
              ? <EmptyState message="Aucune infraction enregistrée" />
              : infractions.map((inf: any) => (
                <div key={inf.id} className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-[#F0F6FC]">{inf.types_infraction?.libelle}</span>
                        <GraviteBadge gravite={inf.types_infraction?.gravite} />
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_INF_CLS[(inf.statut as keyof typeof STATUT_INF_CLS)]}`}>
                          {STATUT_INF_LABEL[inf.statut as keyof typeof STATUT_INF_LABEL] ?? inf.statut}
                        </span>
                        {canTraiter && (
                          <TraiterInfractionBtn infractionId={inf.id} statut={inf.statut} />
                        )}
                      </div>
                      <p className="text-xs text-[#8B949E]">
                        {fmtDT(inf.date_heure)}
                        {inf.localisation ? ` · ${inf.localisation}` : ''}
                        {inf.utilisateurs ? ` · Par ${inf.utilisateurs.prenom} ${inf.utilisateurs.nom}` : ''}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-red-400 flex-shrink-0">
                      -{inf.types_infraction?.points_retires ?? 0} pts
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* --- FORMATIONS --- */}
        {actif === 3 && (
          <div className="space-y-3">
            {formations.length === 0
              ? <EmptyState message="Aucune formation enregistrée" />
              : formations.map(f => {
                  const pct = (f.nb_seances ?? 0) > 0
                    ? Math.min(100, Math.round(((f.nb_seances_faites ?? 0) / (f.nb_seances ?? 1)) * 100))
                    : null
                  return (
                    <Link
                      key={f.id}
                      href={`/formations/${f.id}`}
                      className="flex items-start justify-between p-4 bg-[#0D1117] border border-[#30363D] rounded-lg
                        hover:border-[#F59E0B]/20 hover:bg-[#21262D]/40 transition-all cursor-pointer group block"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
                            {f.organisme}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_FORM_CLS[f.statut]}`}>
                            {STATUT_FORMATION_LABEL[f.statut] ?? f.statut}
                          </span>
                          {f.test_reprise_requis && f.statut === 'en_cours' && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400">
                              Test requis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8B949E] mt-1">
                          {fmt(f.date_debut)}{f.date_fin ? ` → ${fmt(f.date_fin)}` : ' · En cours'}
                        </p>
                        {pct !== null && f.statut === 'en_cours' && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-[#30363D] rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-[#F59E0B] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#8B949E] font-mono">
                              {f.nb_seances_faites ?? 0}/{f.nb_seances ?? 1}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4 text-right">
                        {f.statut === 'validee' && (
                          <span className="font-mono font-bold text-sm text-[#10B981]">+{f.points_recuperes} pts</span>
                        )}
                        <span className="block text-xs text-[#8B949E] group-hover:text-[#F59E0B] mt-1 transition-colors">→</span>
                      </div>
                    </Link>
                  )
                })
            }
          </div>
        )}

        {/* --- SANCTIONS --- */}
        {actif === 4 && (
          <div className="space-y-3">
            {sanctions.length === 0
              ? <EmptyState message="Aucune sanction enregistrée" />
              : sanctions.map(s => (
                <div key={s.id} className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                          ${s.type === 'retrait_definitif' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                          {s.type === 'retrait_definitif' ? 'Retrait définitif' : 'Suspension temporaire'}
                        </span>
                        {canLever && (
                          <LeverSanctionBtn
                            sanctionId={s.id}
                            conducteurId={conducteurId}
                            type={s.type}
                            levee_le={s.levee_le}
                          />
                        )}
                      </div>
                      <p className="text-sm text-[#F0F6FC] mt-2">{s.motif}</p>
                      <p className="text-xs text-[#8B949E] mt-1">
                        Depuis {fmt(s.date_debut)}{s.date_fin ? ` jusqu'au ${fmt(s.date_fin)}` : ' (durée indéterminée)'}
                      </p>
                    </div>
                    {s.levee_le && (
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex-shrink-0">
                        Levée le {fmt(s.levee_le)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* --- HISTORIQUE POINTS --- */}
        {actif === 5 && (
          <div className="space-y-1">
            {historique.length === 0
              ? <EmptyState message="Aucun mouvement de points" />
              : historique.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between py-3 border-b border-[#30363D]/50">
                  <div>
                    <p className="text-sm text-[#F0F6FC]">{h.motif}</p>
                    <p className="text-xs text-[#8B949E] mt-0.5">{fmtDT(h.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`font-mono font-bold text-sm ${h.points_delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {h.points_delta > 0 ? '+' : ''}{h.points_delta} pts
                    </p>
                    <p className="text-xs text-[#8B949E] font-mono">{h.points_avant} → {h.points_apres}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {/* --- TESTS DE CONDUITE --- */}
        {actif === 6 && (() => {
          const dernierReussi = tests.find(t => t.resultat === 'reussi')
          return (
            <div className="space-y-3">

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                {canGererTests && <NouveauTestBtn conducteurId={conducteurId} />}
                {dernierReussi && canGererPermis && (
                  <a
                    href={`/permis/nouveau?conducteur=${conducteurId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg
                      text-[#10B981] border border-[#10B981]/25 bg-[#10B981]/8
                      hover:bg-[#10B981]/20 hover:border-[#10B981]/50
                      hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]
                      active:scale-[0.97] transition-all duration-150"
                  >
                    🎫 Délivrer le permis
                  </a>
                )}
              </div>

              {tests.length === 0
                ? <EmptyState message="Aucun test de conduite enregistré" />
                : tests.map(t => {
                    const isReussi   = t.resultat === 'reussi'
                    const isEchoue   = t.resultat === 'echoue'
                    const isAttente  = t.resultat === 'en_attente'
                    return (
                      <div key={t.id} className={`p-4 rounded-lg border ${
                        isReussi  ? 'bg-green-500/5 border-green-500/20'
                        : isEchoue ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-[#0D1117] border-[#30363D]'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#F0F6FC]">
                                {fmt(t.date_test)}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-[#21262D] text-[#8B949E] font-medium">
                                {t.type === 'initial' ? 'Initial' : 'Reprise'}
                              </span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                                isReussi  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : isEchoue ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {isReussi ? '✓ Réussi' : isEchoue ? '✗ Échoué' : '⏳ En attente'}
                              </span>
                              {t.score !== null && (
                                <span className="font-mono text-sm font-bold text-[#F0F6FC]">
                                  {t.score}/100
                                </span>
                              )}
                            </div>
                            {t.evaluateur && (
                              <p className="text-xs text-[#8B949E]">
                                Évaluateur : {t.evaluateur.prenom} {t.evaluateur.nom}
                              </p>
                            )}
                            {t.observations && (
                              <p className="text-xs text-[#8B949E]/70 italic">
                                &ldquo;{t.observations}&rdquo;
                              </p>
                            )}
                          </div>
                          {isAttente && canGererTests && (
                            <div className="flex-shrink-0">
                              <SaisirResultatBtn testId={t.id} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )
        })()}

      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-[#8B949E] text-sm text-center py-8">{message}</p>
}
