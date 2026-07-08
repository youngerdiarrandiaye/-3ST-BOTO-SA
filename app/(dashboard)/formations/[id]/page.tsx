import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, GraduationCap, User, Calendar,
  BookOpen, ClipboardList,
} from 'lucide-react'
import type { StatutFormation, ResultatTest } from '@/lib/types'
import FormationActionBtn from '@/components/formations/FormationActionBtn'
import SeanceBtn from '@/components/formations/SeanceBtn'
import TestRepriseModal from '@/components/formations/TestRepriseModal'

interface PageProps { params: Promise<{ id: string }> }

const STATUT_BADGE: Record<StatutFormation, string> = {
  en_cours: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  validee:  'bg-green-500/10 text-green-400 border-green-500/20',
  annulee:  'bg-gray-500/10 text-gray-400 border-gray-500/20',
}
const STATUT_LABEL: Record<StatutFormation, string> = {
  en_cours: 'En cours', validee: 'Validée', annulee: 'Annulée',
}

const TEST_BADGE: Record<ResultatTest, string> = {
  reussi:     'bg-green-500/10 text-green-400 border-green-500/20',
  echoue:     'bg-red-500/10 text-red-400 border-red-500/20',
  en_attente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}
const TEST_LABEL: Record<ResultatTest, string> = {
  reussi: 'Réussi', echoue: 'Échoué', en_attente: 'En attente',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#30363D] last:border-0">
      <span className="text-sm text-[#8B949E] flex-shrink-0 w-44">{label}</span>
      <span className="text-sm text-[#F0F6FC] text-right">{value ?? '—'}</span>
    </div>
  )
}

export default async function FormationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  const role = me?.role ?? 'agent'
  const canEdit = ['admin', 'hse', 'sst'].includes(role)

  const { data: f } = await supabase
    .from('formations')
    .select('*, conducteurs(id, nom, prenom, matricule)')
    .eq('id', id)
    .single()

  if (!f) notFound()

  const c = f.conducteurs as any
  const stat = f.statut as StatutFormation

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/formations"
          className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors">
          <ArrowLeft size={16} /> Formations
        </Link>
        {canEdit && (
          <Link href={`/formations/${id}/modifier`}
            className="flex items-center gap-2 px-4 py-2 bg-[#161B22] border border-[#30363D] rounded-lg
              text-sm text-[#F0F6FC] hover:border-[#F59E0B]/50 hover:text-[#F59E0B] transition-colors">
            <Pencil size={14} /> Modifier
          </Link>
        )}
      </div>

      {/* En-tête */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
          <GraduationCap size={24} className="text-[#F59E0B]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#F0F6FC]">{f.organisme}</h1>
            <span className={`text-xs px-2 py-1 rounded-full border ${STATUT_BADGE[stat]}`}>
              {STATUT_LABEL[stat]}
            </span>
          </div>
          {f.theme && <p className="text-sm text-[#8B949E] mt-0.5">{f.theme}</p>}
        </div>
        {stat === 'validee' && (
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-black font-mono text-green-400">+{f.points_recuperes}</p>
            <p className="text-xs text-[#8B949E]">points</p>
          </div>
        )}
      </div>

      {/* Conducteur */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#21262D] rounded-lg">
            <User size={18} className="text-[#8B949E]" />
          </div>
          <div>
            <Link href={`/conducteurs/${c?.id}`}
              className="font-semibold text-[#F0F6FC] hover:text-[#F59E0B] transition-colors">
              {c?.prenom} {c?.nom}
            </Link>
            <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
          </div>
        </div>
      </div>

      {/* Détails formation */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1 flex items-center gap-2">
          <BookOpen size={13} /> Détails
        </p>
        <div className="mt-2">
          <Row label="Date de début" value={fmt(f.date_debut)} />
          <Row label="Date de fin"   value={f.date_fin ? fmt(f.date_fin) : <span className="text-[#8B949E] italic">En cours</span>} />
          {f.formateur_nom && <Row label="Formateur" value={
            <span>{f.formateur_nom}{f.formateur_qualif && <span className="text-[#8B949E] ml-1">({f.formateur_qualif})</span>}</span>
          } />}
        </div>
      </div>

      {/* Séances */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar size={13} /> Séances
        </p>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-black font-mono text-[#F0F6FC]">{f.nb_seances_faites ?? 0}</p>
            <p className="text-xs text-[#8B949E] mt-0.5">réalisées</p>
          </div>
          <div className="text-[#30363D] text-xl">/</div>
          <div className="text-center">
            <p className="text-2xl font-black font-mono text-[#8B949E]">{f.nb_seances ?? 1}</p>
            <p className="text-xs text-[#8B949E] mt-0.5">prévues</p>
          </div>
          {f.duree_par_seance && (
            <>
              <div className="flex-1" />
              <div className="text-center">
                <p className="text-xl font-bold font-mono text-[#F59E0B]">{f.duree_par_seance} min</p>
                <p className="text-xs text-[#8B949E] mt-0.5">/ séance</p>
              </div>
            </>
          )}
        </div>
        {/* Barre de progression */}
        {(f.nb_seances ?? 0) > 0 && (
          <div className="mt-4 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F59E0B] rounded-full transition-all"
              style={{ width: `${Math.min(100, ((f.nb_seances_faites ?? 0) / (f.nb_seances ?? 1)) * 100)}%` }}
            />
          </div>
        )}
        {canEdit && stat === 'en_cours' && (
          <div className="mt-4">
            <SeanceBtn
              formationId={id}
              nbFaites={f.nb_seances_faites ?? 0}
              nbTotal={f.nb_seances ?? 1}
            />
          </div>
        )}
      </div>

      {/* Test de reprise */}
      {f.test_reprise_requis && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList size={13} /> Test de reprise
          </p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#F0F6FC]">
              {f.test_reprise_date ? fmt(f.test_reprise_date) : 'Date non définie'}
            </p>
            {f.test_reprise_resultat ? (
              <span className={`text-xs px-2 py-1 rounded-full border ${TEST_BADGE[f.test_reprise_resultat as ResultatTest]}`}>
                {TEST_LABEL[f.test_reprise_resultat as ResultatTest]}
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full border border-[#30363D] text-[#8B949E]">Non passé</span>
            )}
          </div>
          {canEdit && stat === 'en_cours' && (
            <div className="mt-4">
              <TestRepriseModal
                formationId={id}
                resultatActuel={f.test_reprise_resultat as ResultatTest | null}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      {canEdit && (
        <FormationActionBtn
          formationId={id}
          statut={stat}
          role={role}
          pointsRecuperes={f.points_recuperes ?? 0}
        />
      )}

    </div>
  )
}
