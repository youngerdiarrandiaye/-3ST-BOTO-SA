'use client'

interface JaugePointsProps {
  points: number
  compact?: boolean
  animated?: boolean
}

export default function JaugePoints({ points, compact = false, animated = false }: JaugePointsProps) {
  const pct = (points / 20) * 100
  const couleur = points > 10 ? '#10B981' : points > 5 ? '#F59E0B' : '#EF4444'

  if (compact) {
    return (
      <div className="w-16 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: couleur }}
        />
      </div>
    )
  }

  // Version large avec SVG (fiche conducteur)
  const r = 54
  const cx = 64
  const cy = 64
  const circonference = 2 * Math.PI * r
  const arc = circonference * 0.75
  const dashOffset = arc - (arc * pct) / 100
  const rotation = 135

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-[135deg]">
          {/* Fond */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#30363D" strokeWidth="10"
            strokeDasharray={`${arc} ${circonference}`}
            strokeLinecap="round"
          />
          {/* Valeur */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke={couleur} strokeWidth="10"
            strokeDasharray={`${arc} ${circonference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' : undefined }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black text-3xl font-mono leading-none" style={{ color: couleur }}>
            {points}
          </span>
          <span className="text-xs text-[#8B949E] mt-0.5">/ 20 pts</span>
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color: couleur }}>
        {points > 10 ? 'Capital intact' : points > 5 ? 'Attention requise' : 'Risque élevé'}
      </p>
      {points < 1 && (
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md
          bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444]">
          Conduite interdite
        </span>
      )}
    </div>
  )
}
