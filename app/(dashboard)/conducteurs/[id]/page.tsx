import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CreditCard, GraduationCap, ShieldOff } from 'lucide-react'
import BadgeStatut from '@/components/conducteurs/BadgeStatut'
import BadgeTemporaire from '@/components/conducteurs/BadgeTemporaire'
import BannerAutorisationTemporaire from '@/components/conducteurs/BannerAutorisationTemporaire'
import JaugePoints from '@/components/conducteurs/JaugePoints'
import OngletsConducteur from '@/components/conducteurs/OngletsConducteur'
import EditConducteurBtn from '@/components/conducteurs/EditConducteurBtn'
import type { Conducteur, RoleUtilisateur } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FicheConducteurPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Requêtes en parallèle : conducteur + données onglets + rôle utilisateur + entreprises
  const [
    { data: conducteur },
    { data: me },
    { data: entreprisesRaw },
  ] = await Promise.all([
    supabase.from('conducteurs').select('*, entreprises(nom)').eq('id', id).single(),
    user ? supabase.from('utilisateurs').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    supabase.from('entreprises').select('id, nom').eq('actif', true).order('nom'),
  ])

  if (!conducteur) notFound()

  const c = conducteur as Conducteur & { entreprises: { nom: string } }
  const role = me?.role ?? 'agent'
  const canEdit       = ['admin', 'hse', 'sst'].includes(role)
  const canTraiter    = ['admin', 'hse', 'sst'].includes(role)
  const canLever      = ['admin', 'hse', 'sst'].includes(role)
  const canChangeStatut = ['admin', 'hse'].includes(role)
  const canDeclare    = ['admin', 'hse', 'sst', 'agent'].includes(role)
  const canPermis     = ['admin', 'hse', 'sst'].includes(role)
  const canFormation  = ['admin', 'hse', 'sst'].includes(role)
  const canGererTests = ['admin', 'hse', 'sst'].includes(role)

  // Données onglets (après avoir confirmé que le conducteur existe)
  const [
    { data: permis },
    { data: infractions },
    { data: formations },
    { data: sanctions },
    { data: historique },
    { data: tests },
  ] = await Promise.all([
    supabase.from('permis_internes').select('*').eq('conducteur_id', id).order('created_at', { ascending: false }),
    supabase.from('infractions').select('*, types_infraction(code, libelle, gravite, points_retires), utilisateurs(nom, prenom)').eq('conducteur_id', id).order('date_heure', { ascending: false }),
    supabase.from('formations').select('*').eq('conducteur_id', id).order('created_at', { ascending: false }),
    supabase.from('sanctions').select('*').eq('conducteur_id', id).order('created_at', { ascending: false }),
    supabase.from('retraits_points').select('*').eq('conducteur_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('tests_conduite').select('*, evaluateur:evaluateur_id(nom, prenom)').eq('conducteur_id', id).order('date_test', { ascending: false }),
  ])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Retour */}
      <Link
        href="/conducteurs"
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux conducteurs
      </Link>

      {/* En-tête fiche */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">

          {/* Avatar + infos */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-[#8B949E]">
                {c.prenom[0]}{c.nom[0]}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#F0F6FC]">{c.prenom} {c.nom}</h1>
                <BadgeStatut statut={c.statut} />
              </div>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="font-mono text-sm bg-[#21262D] px-2 py-0.5 rounded text-[#8B949E]">
                  {c.matricule}
                </span>
                <span className="text-sm text-[#8B949E]">{c.entreprises?.nom ?? '—'}</span>
                {c.type_zone && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                    bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[#F59E0B]">
                    {c.type_zone}
                  </span>
                )}
                {c.est_temporaire && (
                  c.date_fin_autorisation
                    ? <BadgeTemporaire dateFin={c.date_fin_autorisation} />
                    : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">Temporaire</span>
                )}
                {c.date_naissance && (
                  <span className="text-sm text-[#8B949E]">
                    Né le {new Date(c.date_naissance).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {c.permis_national && (
                  <span className="text-sm text-[#8B949E] font-mono">
                    {c.permis_national}
                    {c.permis_civil_autorite && (
                      <span className="font-sans ml-1.5 text-[#8B949E]/60">· {c.permis_civil_autorite}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Jauge points */}
          <div className="flex-shrink-0">
            <JaugePoints points={c.points_actuels} animated />
          </div>

          {/* Boutons actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {canEdit && (
              <EditConducteurBtn
                conducteur={c}
                entreprises={entreprisesRaw ?? []}
                canChangeStatut={canChangeStatut}
              />
            )}
            {canDeclare && (
              <Link
                href={`/infractions/nouvelle?conducteur=${c.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm font-medium rounded-lg hover:bg-[#EF4444]/20 transition-colors"
              >
                <AlertTriangle size={14} />
                Infraction
              </Link>
            )}
            {canPermis && (
              <Link
                href={`/permis/nouveau?conducteur=${c.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm font-medium rounded-lg hover:bg-[#F59E0B]/20 transition-colors"
              >
                <CreditCard size={14} />
                Permis
              </Link>
            )}
            {canFormation && (
              <Link
                href={`/formations/nouvelle?conducteur=${c.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm font-medium rounded-lg hover:bg-[#10B981]/20 transition-colors"
              >
                <GraduationCap size={14} />
                Formation
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Banner réhabilitation (UC-33) — visible uniquement pour statut 'retire' */}
      {c.statut === 'retire' && (() => {
        const rehab = (formations ?? []).find((f: any) => f.test_reprise_requis && f.statut === 'en_cours')
        const pct = rehab
          ? Math.round(((rehab.nb_seances_faites ?? 0) / (rehab.nb_seances ?? 1)) * 100)
          : 0
        return (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-500/10 rounded-xl flex-shrink-0">
                <ShieldOff size={20} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">Retrait définitif</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    Conduite interdite
                  </span>
                </div>
                {rehab ? (
                  <>
                    <p className="text-xs text-[#8B949E] mt-1.5">
                      Formation de réhabilitation en cours — {rehab.nb_seances_faites ?? 0}/{rehab.nb_seances ?? 5} séances effectuées
                      {rehab.test_reprise_resultat === 'reussi' ? ' · Test réussi ✓' : ''}
                    </p>
                    <div className="mt-2.5 h-1.5 bg-[#30363D] rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-[#F59E0B] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#8B949E] mt-1.5">
                    Aucune formation de réhabilitation active. Créer une formation obligatoire pour initier le processus.
                  </p>
                )}
              </div>
              {rehab && (
                <Link
                  href={`/formations/${rehab.id}`}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[#F59E0B]/30
                    text-[#F59E0B] bg-[#F59E0B]/5 hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/60
                    transition-colors font-medium"
                >
                  Voir →
                </Link>
              )}
            </div>
          </div>
        )
      })()}

      {/* Banner autorisation temporaire */}
      {c.est_temporaire && c.date_fin_autorisation && (
        <BannerAutorisationTemporaire
          conducteurId={c.id}
          nom={c.nom}
          prenom={c.prenom}
          dateFin={c.date_fin_autorisation}
          canRenouveler={canEdit}
        />
      )}

      {/* Onglets */}
      <OngletsConducteur
        permis={permis ?? []}
        infractions={infractions ?? []}
        formations={formations ?? []}
        sanctions={sanctions ?? []}
        historique={historique ?? []}
        tests={tests ?? []}
        conducteurId={id}
        userRole={role as RoleUtilisateur}
        conducteur={{
          statut:                     c.statut,
          niveau_validation_courant:  (c as any).niveau_validation_courant  ?? 1,
          // Niveau 1
          validation_resp_dept:       (c as any).validation_resp_dept       ?? false,
          date_validation_resp_dept:  (c as any).date_validation_resp_dept  ?? null,
          nom_resp_dept:              (c as any).nom_resp_dept               ?? null,
          motif_refus_dept:           (c as any).motif_refus_dept            ?? null,
          // Niveau 2
          autorisation_resp_sst:      (c as any).autorisation_resp_sst      ?? false,
          date_autorisation_resp_sst: (c as any).date_autorisation_resp_sst ?? null,
          nom_resp_sst:               (c as any).nom_resp_sst                ?? null,
          motif_refus_resp_sst:       (c as any).motif_refus_resp_sst        ?? null,
          // Niveau 3
          autorisation_clinique:      (c as any).autorisation_clinique      ?? false,
          date_autorisation_clinique: (c as any).date_autorisation_clinique  ?? null,
          medecin_clinique:           (c as any).medecin_clinique            ?? null,
          valideur_clinique:          (c as any).valideur_clinique           ?? null,
          motif_refus_clinique:       (c as any).motif_refus_clinique        ?? null,
        }}
        canTraiter={canTraiter}
        canLever={canLever}
        canGererPermis={canPermis}
        canGererTests={canGererTests}
        canWrite={canEdit}
      />

    </div>
  )
}
