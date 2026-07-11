import { getStatutTemporaire } from '@/lib/utils/conducteur-temporaire'
import type { NiveauTemporaire } from '@/lib/utils/conducteur-temporaire'

const NIVEAU: Record<NiveauTemporaire, {
  bg: string; border: string; text: string; dot: string
}> = {
  expire:    { bg: 'bg-red-900/40',    border: 'border-red-600/40',    text: 'text-red-400',    dot: 'bg-red-500'    },
  critique:  { bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500'    },
  urgent:    { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  attention: { bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-500'  },
  ok:        { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  dot: 'bg-green-500'  },
}

interface Props {
  dateFin: string
  compact?: boolean
}

export default function BadgeTemporaire({ dateFin, compact = false }: Props) {
  const { niveau, joursRestants } = getStatutTemporaire(dateFin)
  const cfg = NIVEAU[niveau]

  if (compact) {
    const label =
      niveau === 'expire'   ? 'Expiré'
      : niveau === 'ok'     ? 'Temp.'
      : `Exp. ${joursRestants}j`

    return (
      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        {label}
      </span>
    )
  }

  const label =
    niveau === 'expire'   ? 'Autorisation expirée'
    : niveau === 'ok'     ? 'Temporaire'
    : `Exp. dans ${joursRestants}j`

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={`text-xs font-bold ${cfg.text}`}>{label}</span>
    </div>
  )
}
