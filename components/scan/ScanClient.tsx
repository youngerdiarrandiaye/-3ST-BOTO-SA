'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ScanLine, AlertTriangle, CheckCircle2,
  User, Building2, RefreshCw, ShieldX, CreditCard,
} from 'lucide-react'
import QRScanner from './QRScanner'
import { STATUT_PERMIS_LABEL } from '@/lib/labels'
import Spinner from '@/components/ui/Spinner'

type LookupState =
  | { status: 'scanning' }
  | { status: 'loading'; numero: string }
  | { status: 'found'; permis: any }
  | { status: 'not_found'; numero: string }
  | { status: 'error'; message: string }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ScanClient() {
  const [state, setState] = useState<LookupState>({ status: 'scanning' })
  const [scanKey, setScanKey] = useState(0)

  const handleScan = useCallback(async (text: string) => {
    setState({ status: 'loading', numero: text })
    try {
      const res = await fetch(`/api/permis/lookup?numero=${encodeURIComponent(text)}`)
      const data = await res.json()
      if (res.ok)               setState({ status: 'found', permis: data.permis })
      else if (res.status === 404) setState({ status: 'not_found', numero: text })
      else                      setState({ status: 'error', message: data.error ?? 'Erreur serveur' })
    } catch {
      setState({ status: 'error', message: 'Erreur réseau' })
    }
  }, [])

  function reset() {
    setScanKey(k => k + 1)
    setState({ status: 'scanning' })
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Header */}
      <Link
        href="/infractions"
        className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux infractions
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC] flex items-center gap-2.5">
          <ScanLine className="text-[#F59E0B]" size={24} />
          Scanner un permis
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">
          Pointez la caméra vers le QR code du permis interne
        </p>
      </div>

      {/* Zone scanner */}
      {(state.status === 'scanning' || state.status === 'loading') && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
          <QRScanner key={scanKey} onResult={handleScan} />
          {state.status === 'loading' && (
            <div className="px-5 py-4 border-t border-[#30363D] flex items-center gap-3">
              <Spinner size="sm" className="flex-shrink-0" />
              <p className="text-sm text-[#8B949E]">
                Recherche du permis{' '}
                <span className="font-mono text-[#F0F6FC]">{state.numero}</span>…
              </p>
            </div>
          )}
        </div>
      )}

      {/* Résultat — TROUVÉ */}
      {state.status === 'found' && <FoundResult permis={state.permis} onReset={reset} />}

      {/* Résultat — INTROUVABLE */}
      {state.status === 'not_found' && (
        <div className="bg-[#161B22] border border-orange-500/30 rounded-xl p-6 text-center space-y-3">
          <CreditCard size={36} className="text-orange-400 mx-auto" />
          <p className="font-semibold text-[#F0F6FC]">Permis introuvable</p>
          <p className="text-sm text-[#8B949E]">
            Le numéro{' '}
            <span className="font-mono text-orange-400">{state.numero}</span>{' '}
            n&apos;est pas enregistré dans le système.
          </p>
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#21262D] border border-[#30363D] rounded-xl text-sm text-[#F0F6FC] hover:border-[#F59E0B]/30 active:scale-[0.98] transition-all cursor-pointer">
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      )}

      {/* Résultat — ERREUR */}
      {state.status === 'error' && (
        <div className="bg-[#161B22] border border-red-500/30 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle size={36} className="text-red-400 mx-auto" />
          <p className="font-semibold text-[#F0F6FC]">Erreur</p>
          <p className="text-sm text-[#8B949E]">{state.message}</p>
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#21262D] border border-[#30363D] rounded-xl text-sm text-[#F0F6FC] hover:border-[#F59E0B]/30 active:scale-[0.98] transition-all cursor-pointer">
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sous-composant résultat ─────────────────────────────────────────────────

function FoundResult({ permis: p, onReset }: { permis: any; onReset: () => void }) {
  const c = p.conducteurs
  const isExpired = new Date(p.date_expiration) < new Date()
  const isSuspended = c?.statut === 'suspendu'
  const isPermisKO = p.statut !== 'valide'
  const pts = c?.points_actuels ?? 0

  return (
    <div className="space-y-4">
      {/* Carte conducteur */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">

        {/* Bandeau statut */}
        {(isSuspended || isPermisKO) ? (
          <div className={`px-5 py-3 flex items-center gap-2 border-b border-[#30363D] ${isSuspended ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
            <ShieldX size={14} className={isSuspended ? 'text-red-400' : 'text-orange-400'} />
            <span className={`text-xs font-bold uppercase tracking-wide ${isSuspended ? 'text-red-400' : 'text-orange-400'}`}>
              {isSuspended ? 'Conducteur suspendu' : `Permis ${STATUT_PERMIS_LABEL[p.statut] ?? p.statut}`}
            </span>
          </div>
        ) : (
          <div className="px-5 py-3 flex items-center gap-2 bg-green-500/5 border-b border-[#30363D]">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-green-400">Permis valide</span>
          </div>
        )}

        {/* Identité */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-[#F59E0B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl text-[#F0F6FC] leading-tight">{c?.prenom} {c?.nom}</p>
              <p className="text-sm font-mono text-[#8B949E] mt-0.5">{c?.matricule}</p>
              {c?.entreprises && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Building2 size={12} className="text-[#8B949E]" />
                  <span className="text-xs text-[#8B949E]">{c.entreprises.nom}</span>
                </div>
              )}
            </div>
          </div>

          {/* Métriques permis */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-[#8B949E]">N° Permis</p>
              <p className="text-sm font-mono font-bold text-[#F0F6FC] mt-0.5 truncate">{p.numero}</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-[#8B949E]">Expire le</p>
              <p className={`text-sm font-mono font-bold mt-0.5 ${isExpired ? 'text-red-400' : 'text-[#F0F6FC]'}`}>
                {fmt(p.date_expiration)}{isExpired && ' ⚠'}
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-[#8B949E]">Points</p>
              <p className={`text-sm font-mono font-bold mt-0.5 ${pts <= 3 ? 'text-red-400' : pts <= 7 ? 'text-orange-400' : 'text-green-400'}`}>
                {pts} / 20
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-[#8B949E]">Catégories</p>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {(p.categories ?? []).length > 0
                  ? (p.categories as string[]).map(cat => (
                      <span key={cat} className="text-xs px-1.5 py-0.5 bg-[#21262D] rounded text-[#F0F6FC] font-mono">{cat}</span>
                    ))
                  : <span className="text-xs text-[#8B949E]">—</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <Link
          href={`/infractions/nouvelle?conducteur=${c?.id}`}
          className="flex items-center justify-center gap-2 w-full px-5 py-4 bg-[#EF4444] text-white font-bold rounded-xl
            hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 text-sm"
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
        >
          <AlertTriangle size={16} />
          Déclarer une infraction
        </Link>

        <Link
          href={`/conducteurs/${c?.id}`}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-[#161B22] border border-[#30363D] text-[#F0F6FC]
            font-medium rounded-xl hover:border-[#F59E0B]/30 hover:bg-[#21262D] transition-colors text-sm"
        >
          <User size={16} />
          Voir la fiche conducteur
        </Link>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          Scanner un autre permis
        </button>
      </div>
    </div>
  )
}
