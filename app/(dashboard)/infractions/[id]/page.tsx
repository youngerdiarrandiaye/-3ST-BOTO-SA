import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, UserX, Users, FileText } from 'lucide-react'
import GraviteBadge from '@/components/ui/GraviteBadge'
import InfractionActionBtn from '@/components/infractions/InfractionActionBtn'

interface PageProps { params: Promise<{ id: string }> }

const STATUT_CLS: Record<string, string> = {
  declaree:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  traitee:   'bg-green-500/10  text-green-400  border-green-500/20',
  contestee: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  annulee:   'bg-gray-500/10   text-gray-400   border-gray-500/20',
}
const STATUT_LABEL: Record<string, string> = {
  declaree:  'En attente de traitement',
  traitee:   'Traitée',
  contestee: 'Contestée',
  annulee:   'Annulée',
}

const ZONE_LABEL: Record<string, string> = {
  miniere:      'Zone minière',
  hors_miniere: 'Hors zone minière',
  les_deux:     'Toutes zones',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function InfractionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: inf }, meResult] = await Promise.all([
    supabase
      .from('infractions')
      .select(`
        *,
        conducteurs(id, nom, prenom, matricule, entreprises(nom)),
        types_infraction(code, libelle, gravite, points_retires, zone_applicable),
        utilisateurs(nom, prenom, service),
        temoins(id, nom, prenom, matricule, telephone, declaration)
      `)
      .eq('id', id)
      .single(),
    user
      ? supabase.from('utilisateurs').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!inf) notFound()

  const role = meResult.data?.role ?? 'agent'
  const canTraiter = ['admin', 'hse', 'sst'].includes(role)

  const c = inf.conducteurs as any
  const t = inf.types_infraction as any
  const u = inf.utilisateurs as any
  const temoins: any[] = Array.isArray((inf as any).temoins) ? (inf as any).temoins : []

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <Link
        href="/infractions"
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux infractions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#8B949E] bg-[#21262D] px-2 py-1 rounded-md border border-[#30363D]">
              {t?.code ?? '—'}
            </span>
            <GraviteBadge gravite={t?.gravite ?? 'mineure'} />
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUT_CLS[inf.statut] ?? ''}`}>
              {STATUT_LABEL[inf.statut] ?? inf.statut}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#F0F6FC] leading-snug">
            {t?.libelle ?? 'Infraction inconnue'}
          </h1>
          <p className="text-sm text-[#8B949E]">
            <Clock size={12} className="inline mr-1.5 align-middle" />
            {fmt(inf.date_heure)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <p className="text-3xl font-black font-mono text-red-400">-{t?.points_retires ?? 0}</p>
          <p className="text-xs text-[#8B949E]">points retirés</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conducteur */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteur</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-red-400">
                {c?.prenom?.[0]}{c?.nom?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#F0F6FC]">{c?.prenom} {c?.nom}</p>
              <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
              {c?.entreprises?.nom && (
                <p className="text-xs text-[#8B949E]">{c.entreprises.nom}</p>
              )}
            </div>
          </div>
          {c?.id && (
            <Link
              href={`/conducteurs/${c.id}`}
              className="block text-center text-xs text-[#8B949E] border border-[#30363D] rounded-lg py-2 hover:text-[#F59E0B] hover:border-[#F59E0B]/30 transition-colors"
            >
              Voir la fiche conducteur →
            </Link>
          )}
        </div>

        {/* Type + Zone */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Type d&apos;infraction</p>
          <div>
            <p className="font-semibold text-sm text-[#F0F6FC]">{t?.libelle ?? '—'}</p>
            {t?.zone_applicable && (
              <p className="text-xs text-[#8B949E] mt-1">{ZONE_LABEL[t.zone_applicable] ?? t.zone_applicable}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#0D1117] rounded-lg px-3 py-2">
              <p className="text-[#8B949E] mb-0.5">Zone constatée</p>
              <p className="text-[#F0F6FC] font-medium">{ZONE_LABEL[inf.zone_constatee as string] ?? '—'}</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg px-3 py-2">
              <p className="text-[#8B949E] mb-0.5">Localisation</p>
              <p className="text-[#F0F6FC] font-medium truncate">{inf.localisation ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {inf.description && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#8B949E]" />
            <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Description</p>
          </div>
          <p className="text-sm text-[#F0F6FC]/80 leading-relaxed">{inf.description}</p>
        </div>
      )}

      {/* Refus de signature */}
      {inf.conducteur_refuse_signe && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <UserX size={16} className="text-orange-400 flex-shrink-0" />
          <p className="text-sm font-medium text-orange-300">
            Le conducteur a refusé de signer le procès-verbal
          </p>
        </div>
      )}

      {/* Témoins */}
      {temoins.length > 0 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#8B949E]" />
            <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">
              Témoins ({temoins.length})
            </p>
          </div>
          <div className="space-y-3">
            {temoins.map((temoin: any, i: number) => (
              <div key={i} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-[#F0F6FC]">
                    {temoin.prenom} {temoin.nom}
                  </p>
                  {temoin.matricule && (
                    <span className="font-mono text-xs text-[#8B949E] bg-[#21262D] px-2 py-0.5 rounded">
                      {temoin.matricule}
                    </span>
                  )}
                  {temoin.telephone && (
                    <span className="text-xs text-[#8B949E]">{temoin.telephone}</span>
                  )}
                </div>
                {temoin.declaration && (
                  <p className="text-xs text-[#F0F6FC]/70 italic leading-relaxed">
                    &ldquo;{temoin.declaration}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pied de page : déclaré par + actions */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-4 border-t border-[#30363D]">
        <div className="flex items-center gap-2 text-xs text-[#8B949E] flex-wrap">
          <AlertTriangle size={12} />
          Déclaré le {fmtShort(inf.created_at)}
          {u && (
            <span className="flex items-center gap-1.5">
              par <span className="text-[#F0F6FC] font-medium">{u.prenom} {u.nom}</span>
              {u.service && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-wide ${
                  u.service === '3st'
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {u.service === '3st' ? '3ST' : 'SST/HSE'}
                </span>
              )}
            </span>
          )}
        </div>
        {canTraiter && c?.id && (
          <InfractionActionBtn
            infractionId={inf.id}
            statut={inf.statut}
            conducteurId={c.id}
            role={role}
            description={inf.description}
            localisation={inf.localisation}
            dateHeure={inf.date_heure}
            zoneConstatee={inf.zone_constatee as string | null}
          />
        )}
      </div>

    </div>
  )
}
