import { GRAVITE_LABEL, GRAVITE_BADGE_CLS } from '@/lib/gravite'
import type { GraviteInfraction } from '@/lib/types'

interface Props {
  gravite: GraviteInfraction | string | null | undefined
  size?: 'xs' | 'sm'
}

export default function GraviteBadge({ gravite, size = 'xs' }: Props) {
  const g = (gravite ?? 'mineure') as GraviteInfraction
  const cls = GRAVITE_BADGE_CLS[g] ?? GRAVITE_BADGE_CLS.mineure
  const label = GRAVITE_LABEL[g] ?? g

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${pad} ${cls}`}>
      {label}
    </span>
  )
}
