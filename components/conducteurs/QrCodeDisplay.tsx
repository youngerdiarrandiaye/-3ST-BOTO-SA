'use client'

import { useMemo, useState } from 'react'
import { encodeQR } from '@/lib/qrcode'
import { X } from 'lucide-react'

interface Props {
  value: string
  size?: number
  label?: string
}

export default function QrCodeDisplay({ value, size = 56, label }: Props) {
  const [enlarged, setEnlarged] = useState(false)

  const matrix = useMemo(() => encodeQR(value), [value])

  if (!matrix) {
    return (
      <div
        className="flex-shrink-0 bg-[#21262D] border border-[#30363D] rounded flex items-center justify-center text-[#8B949E] text-[9px]"
        style={{ width: size, height: size }}
      >
        N/A
      </div>
    )
  }

  const n = matrix.length
  const quiet = 2 // quiet zone modules
  const total = n + quiet * 2

  const QrSvg = ({ svgSize }: { svgSize: number }) => {
    const mod = svgSize / total
    return (
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${total} ${total}`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <rect width={total} height={total} fill="white" />
        {matrix.map((row, r) =>
          row.map((dark, c) =>
            dark ? (
              <rect
                key={`${r}-${c}`}
                x={c + quiet}
                y={r + quiet}
                width={1}
                height={1}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
    )
  }

  return (
    <>
      {/* Small clickable QR code */}
      <button
        onClick={() => setEnlarged(true)}
        className="flex-shrink-0 rounded overflow-hidden border border-[#30363D] hover:border-[#F59E0B]/40 transition-colors cursor-zoom-in cursor-pointer"
        style={{ width: size, height: size }}
        title={`Agrandir le QR Code — ${value}`}
        aria-label={`QR Code ${value}`}
      >
        <QrSvg svgSize={size} />
      </button>

      {/* Full-screen overlay */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer"
          onClick={() => setEnlarged(false)}
        >
          <div
            className="relative bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlarged(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors text-black cursor-pointer"
            >
              <X size={14} />
            </button>
            <QrSvg svgSize={240} />
            {label && (
              <p className="text-[#0D1117] text-xs font-mono font-bold tracking-wide text-center">
                {label}
              </p>
            )}
            <p className="text-[#6B7280] text-[10px]">Tapez en dehors pour fermer</p>
          </div>
        </div>
      )}
    </>
  )
}
