interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
const TRACK = { sm: 'border-2', md: 'border-2', lg: 'border-[3px]' }

export default function Spinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`${SIZE[size]} ${TRACK[size]} rounded-full border-[#30363D] border-t-[#F59E0B] animate-spin ${className}`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-[#8B949E] animate-pulse">Chargement…</p>
      </div>
    </div>
  )
}
