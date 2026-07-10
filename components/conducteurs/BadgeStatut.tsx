import type { StatutConducteur, StatutPermis } from '@/lib/types'

const CONFIG = {
  actif:       { label: 'Actif',       dot: 'bg-green-400',  cls: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  suspendu:    { label: 'Suspendu',    dot: 'bg-red-400',    cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
  retire:      { label: 'Retiré',      dot: 'bg-gray-400',   cls: 'bg-gray-500/10   text-gray-400   border-gray-500/20'   },
  inactif:     { label: 'Inactif',     dot: 'bg-gray-400',   cls: 'bg-gray-500/10   text-gray-400   border-gray-500/20'   },
  en_attente:  { label: 'En attente',  dot: 'bg-amber-400',  cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
  refuse:      { label: 'Refusé',      dot: 'bg-red-400',    cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
  valide:      { label: 'Valide',      dot: 'bg-green-400',  cls: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  expire:      { label: 'Expiré',      dot: 'bg-orange-400', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
}

interface Props {
  statut: StatutConducteur | StatutPermis
}

export default function BadgeStatut({ statut }: Props) {
  const cfg = CONFIG[statut] ?? { label: statut, dot: 'bg-gray-400', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
