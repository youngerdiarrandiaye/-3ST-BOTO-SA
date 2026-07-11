'use client'

import { useState, useTransition } from 'react'
import { Clock, RefreshCw, X } from 'lucide-react'
import { renouvelerAutorisationTemporaire } from '@/app/actions/conducteurs-temporaires'
import { toastSuccess, toastError } from '@/lib/toast'
import { getStatutTemporaire } from '@/lib/utils/conducteur-temporaire'
import type { NiveauTemporaire } from '@/lib/utils/conducteur-temporaire'
import { useRouter } from 'next/navigation'

interface Props {
  conducteurId: string
  nom: string
  prenom: string
  dateFin: string
  canRenouveler: boolean
}

const BANNER_STYLES: Record<NiveauTemporaire, { bg: string; border: string; icon: string; text: string; title: string }> = {
  expire:    { bg: 'bg-red-500/8',    border: 'border-red-600/30',    icon: 'text-red-400',    text: 'text-red-400',    title: 'Autorisation expirée — Accès site interdit' },
  critique:  { bg: 'bg-red-500/8',    border: 'border-red-500/25',    icon: 'text-red-400',    text: 'text-red-400',    title: 'Expiration imminente — 1 à 3 jours restants' },
  urgent:    { bg: 'bg-orange-500/8', border: 'border-orange-500/25', icon: 'text-orange-400', text: 'text-orange-400', title: 'Expiration urgente — 4 à 7 jours restants' },
  attention: { bg: 'bg-amber-500/8',  border: 'border-amber-500/25',  icon: 'text-amber-400',  text: 'text-amber-400',  title: 'Expiration proche — moins de 2 semaines' },
  ok:        { bg: 'bg-green-500/5',  border: 'border-green-500/15',  icon: 'text-green-400',  text: 'text-green-400',  title: 'Conducteur temporaire — autorisation valide' },
}

export default function BannerAutorisationTemporaire({
  conducteurId, nom, prenom, dateFin, canRenouveler,
}: Props) {
  const { niveau, joursRestants } = getStatutTemporaire(dateFin)
  const styles = BANNER_STYLES[niveau]
  const router = useRouter()

  const [showForm, setShowForm] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [isPending, startTransition] = useTransition()

  if (niveau === 'ok') return null

  function handleRenouveler() {
    if (!newDate) { toastError.champObligatoire('Nouvelle date'); return }
    startTransition(async () => {
      const res = await renouvelerAutorisationTemporaire(conducteurId, newDate)
      if (res.ok) {
        const dateLabel = new Date(newDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        toastSuccess.renouvellementReussi(`${prenom} ${nom}`, dateLabel)
        setShowForm(false)
        router.refresh()
      } else {
        toastError.erreurServeur()
      }
    })
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div className={`rounded-xl border p-5 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${styles.bg} border ${styles.border}`}>
          <Clock size={20} className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-sm font-bold uppercase tracking-wide ${styles.text}`}>{styles.title}</h2>
            {niveau === 'expire' && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text}`}>
                Conduite interdite
              </span>
            )}
          </div>

          <p className="text-xs text-[#8B949E] mt-1.5">
            {niveau === 'expire'
              ? `L'autorisation temporaire de ${prenom} ${nom} a expiré le ${new Date(dateFin).toLocaleDateString('fr-FR')}. Un renouvellement est requis pour rétablir l'accès.`
              : `Autorisation jusqu'au ${new Date(dateFin).toLocaleDateString('fr-FR')} — ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''}.`
            }
          </p>

          {showForm && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={newDate}
                min={minDateStr}
                onChange={e => setNewDate(e.target.value)}
                className="px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
                  focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30"
              />
              <button
                onClick={handleRenouveler}
                disabled={isPending || !newDate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] text-[#0D1117] text-xs font-bold rounded-lg
                  hover:bg-[#FBBF24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
                {isPending ? 'Enregistrement…' : 'Confirmer'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] rounded transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {canRenouveler && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[#F59E0B]/30
              text-[#F59E0B] bg-[#F59E0B]/5 hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/60
              transition-colors font-medium cursor-pointer"
          >
            Renouveler →
          </button>
        )}
      </div>
    </div>
  )
}
