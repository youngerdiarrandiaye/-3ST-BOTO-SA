import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ShieldX, ShieldOff, User, Calendar,
  FileText, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import LeverSanctionBtn from '@/components/sanctions/LeverSanctionBtn'

interface PageProps { params: Promise<{ id: string }> }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isActive(s: { date_fin: string | null; levee_le: string | null }) {
  if (s.levee_le) return false
  if (!s.date_fin) return true
  return new Date(s.date_fin) >= new Date()
}

export default async function SanctionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const meResult = user
    ? await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
    : { data: null }
  const role = meResult.data?.role ?? 'agent'
  const canLever = ['admin', 'hse', 'sst'].includes(role)

  const { data: sanction } = await supabase
    .from('sanctions')
    .select(`
      *,
      conducteurs(id, nom, prenom, matricule, statut),
      decideur:utilisateurs!sanctions_decideur_id_fkey(nom, prenom),
      levee_par_user:utilisateurs!sanctions_levee_par_fkey(nom, prenom)
    `)
    .eq('id', id)
    .single()

  if (!sanction) notFound()

  const active = isActive(sanction)
  const c = sanction.conducteurs as any
  const decideur = sanction.decideur as any
  const leveeParUser = sanction.levee_par_user as any

  const isDefinitif = sanction.type === 'retrait_definitif'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/sanctions"
          className="flex items-center gap-1.5 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
        >
          <ArrowLeft size={15} />
          Retour aux sanctions
        </Link>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDefinitif ? 'bg-red-500/15 border border-red-500/30' : 'bg-orange-500/10 border border-orange-500/20'
          }`}>
            {isDefinitif
              ? <ShieldX size={22} className="text-red-400" />
              : <ShieldOff size={22} className="text-orange-400" />
            }
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F0F6FC]">
              {isDefinitif ? 'Retrait définitif' : 'Suspension temporaire'}
            </h1>
            <p className="text-sm text-[#8B949E] mt-0.5 font-mono">#{id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Badge état */}
        {sanction.levee_le ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20 text-sm font-medium">
            <CheckCircle2 size={14} />
            Levée
          </span>
        ) : active ? (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20 text-sm font-medium">
            <Clock size={14} />
            Expirée
          </span>
        )}
      </div>

      {/* Conducteur */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B949E] mb-3">Conducteur sanctionné</p>
        <Link
          href={`/conducteurs/${c?.id}`}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-[#8B949E]" />
          </div>
          <div>
            <p className="font-semibold text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
              {c?.prenom} {c?.nom}
            </p>
            <p className="text-xs text-[#8B949E] font-mono">{c?.matricule}</p>
          </div>
          <ArrowLeft size={14} className="ml-auto text-[#8B949E] rotate-180 group-hover:text-[#F59E0B] transition-colors" />
        </Link>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Période */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">Période</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-[#8B949E] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#8B949E]">Début</p>
                <p className="text-sm font-medium text-[#F0F6FC]">{fmt(sanction.date_debut)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-[#8B949E] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#8B949E]">Fin</p>
                <p className="text-sm font-medium text-[#F0F6FC]">
                  {sanction.date_fin ? fmt(sanction.date_fin) : 'Indéterminée'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Décideur / Levée */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">Responsables</p>
          <div className="space-y-2">
            {decideur && (
              <div>
                <p className="text-xs text-[#8B949E]">Décideur</p>
                <p className="text-sm font-medium text-[#F0F6FC]">{decideur.prenom} {decideur.nom}</p>
              </div>
            )}
            {sanction.levee_le && leveeParUser && (
              <div>
                <p className="text-xs text-[#8B949E]">Levée par</p>
                <p className="text-sm font-medium text-green-400">{leveeParUser.prenom} {leveeParUser.nom}</p>
                <p className="text-xs text-[#8B949E]">le {fmt(sanction.levee_le)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Motif */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-[#8B949E]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">Motif de la sanction</p>
        </div>
        <p className="text-sm text-[#F0F6FC] leading-relaxed whitespace-pre-wrap">{sanction.motif}</p>
      </div>

      {/* Infraction liée */}
      {sanction.infraction_id && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Infraction liée</p>
          </div>
          <Link
            href={`/infractions/${sanction.infraction_id}`}
            className="text-sm text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
          >
            Voir le dossier d'infraction →
          </Link>
        </div>
      )}

      {/* Action lever */}
      {canLever && active && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B949E] mb-3">Actions</p>
          <LeverSanctionBtn
            sanctionId={sanction.id}
            conducteurId={c?.id ?? ''}
            type={sanction.type}
            levee_le={sanction.levee_le}
          />
        </div>
      )}

    </div>
  )
}
