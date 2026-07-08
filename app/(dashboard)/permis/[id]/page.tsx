import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, CheckCircle2, XCircle } from 'lucide-react'
import BadgeStatut from '@/components/conducteurs/BadgeStatut'
import QrCodeDisplay from '@/components/conducteurs/QrCodeDisplay'
import PermisActionBtn from '@/components/permis/PermisActionBtn'
import type { StatutPermis } from '@/lib/types'

interface PageProps { params: Promise<{ id: string }> }

const ZONE_LABEL: Record<string, string> = {
  miniere:        'Zone minière',
  administrative: 'Zone administrative',
  les_deux:       'Toutes les zones',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function PermisDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  const canGerer = ['admin', 'hse', 'sst'].includes(me?.role ?? '')

  const { data: permis } = await supabase
    .from('permis_internes')
    .select('*, conducteurs(id, nom, prenom, matricule, entreprises(nom))')
    .eq('id', id)
    .single()

  if (!permis) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const effectiveStatut = (permis.statut === 'valide' && permis.date_expiration < today)
    ? 'expire'
    : permis.statut
  const staleInDb  = effectiveStatut !== permis.statut
  const isExpired  = new Date(permis.date_expiration) < new Date()
  const expireSoon = !isExpired && (
    (new Date(permis.date_expiration).getTime() - Date.now()) / 86400000 <= 30
  )

  const c = permis.conducteurs as any

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/permis"
          className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors">
          <ArrowLeft size={15} />
          Permis internes
        </Link>
        <Link href={`/permis/${id}/print`} target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
            text-[#8B949E] border border-[#30363D] bg-[#161B22]
            hover:text-[#F0F6FC] hover:border-[#F59E0B]/40 hover:bg-[#21262D] transition-all duration-150">
          <Printer size={13} />
          Imprimer
        </Link>
      </div>

      {/* En-tête — numéro + statut + QR */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-2xl font-black text-[#F0F6FC] break-all">{permis.numero}</span>
              <BadgeStatut statut={effectiveStatut as StatutPermis} />
            </div>
            {staleInDb && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                Permis expiré — clôture automatique en attente (prochain chargement)
              </div>
            )}
            {expireSoon && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                Expire dans moins de 30 jours — renouvellement recommandé
              </div>
            )}
            <p className="text-sm text-[#8B949E]">Permis interne de conduite — MineAxis MANAGEM | 3ST</p>
          </div>
          <div className="flex-shrink-0">
            <QrCodeDisplay value={permis.numero} size={88} label={permis.numero} />
          </div>
        </div>
      </div>

      {/* Conducteur */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-3">Conducteur</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-[#F59E0B]">
              {c?.prenom?.[0]}{c?.nom?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#F0F6FC]">{c?.prenom} {c?.nom}</p>
            <p className="text-sm text-[#8B949E] font-mono">{c?.matricule}</p>
            {c?.entreprises?.nom && (
              <p className="text-xs text-[#8B949E] mt-0.5">{c.entreprises.nom}</p>
            )}
          </div>
          {c?.id && (
            <Link href={`/conducteurs/${c.id}`}
              className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg
                text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 transition-all duration-150 whitespace-nowrap">
              Voir fiche →
            </Link>
          )}
        </div>
      </div>

      {/* Dates + Zone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard label="Délivré le" value={fmt(permis.date_delivrance)} />
        <InfoCard
          label="Expire le"
          value={fmt(permis.date_expiration)}
          accent={isExpired ? 'red' : expireSoon ? 'yellow' : undefined}
        />
        <InfoCard
          label="Zone de validité"
          value={permis.zone_validite ? ZONE_LABEL[permis.zone_validite] ?? permis.zone_validite : '—'}
        />
      </div>

      {/* Catégories + Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-3">Catégories</p>
          {permis.categories?.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {(permis.categories as string[]).map(cat => (
                <span key={cat}
                  className="w-10 h-10 flex items-center justify-center bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg text-sm font-bold text-[#F59E0B]">
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8B949E]">—</p>
          )}
        </div>
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-3">Type permis site</p>
          <p className="text-sm font-semibold text-[#F0F6FC]">{permis.type_permis_site ?? '—'}</p>
        </div>
      </div>

      {/* Habilitations */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-3">Habilitations à la délivrance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HabilitationCard label="SST validée" ok={permis.validation_sst} />
          <HabilitationCard label="Visite médicale" ok={permis.validation_clinique} />
        </div>
      </div>

      {/* Actions */}
      {canGerer && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-3">Actions</p>
          <PermisActionBtn
            permisId={id}
            statut={permis.statut}
            conducteurId={c?.id}
            dateExpiration={permis.date_expiration}
          />
          {(permis as any).motif_changement && (
            <p className="text-xs text-[#8B949E] mt-3 pt-3 border-t border-[#30363D]">
              Dernier motif enregistré : <span className="text-[#F0F6FC] italic">{(permis as any).motif_changement}</span>
            </p>
          )}
        </div>
      )}

    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'yellow' }) {
  const valCls = accent === 'red' ? 'text-red-400 font-bold' : accent === 'yellow' ? 'text-yellow-400 font-semibold' : 'text-[#F0F6FC]'
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
      <p className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold mb-1.5">{label}</p>
      <p className={`text-sm font-semibold ${valCls}`}>{value}</p>
    </div>
  )
}

function HabilitationCard({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${ok ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
      {ok
        ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
        : <XCircle size={16} className="text-red-400 flex-shrink-0" />
      }
      <div>
        <p className={`text-sm font-semibold ${ok ? 'text-green-300' : 'text-red-300'}`}>{label}</p>
        <p className={`text-xs ${ok ? 'text-green-500/70' : 'text-red-500/70'}`}>{ok ? 'Validée' : 'Non validée'}</p>
      </div>
    </div>
  )
}
