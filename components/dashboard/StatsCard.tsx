'use client'

import { useEffect, useRef, useState } from 'react'
import { Users, AlertTriangle, CreditCard, ShieldX, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

const ICONS = { Users, AlertTriangle, CreditCard, ShieldX, TrendingUp, TrendingDown }

type IconKey = keyof typeof ICONS

interface StatsCardProps {
  titre: string
  valeur: number
  icone: IconKey
  couleur: 'green' | 'amber' | 'red' | 'blue'
  description?: string
  delay?: number
  href?: string
}

const COULEURS = {
  green: { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20'  },
  amber: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20'  },
  red:   { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20'    },
  blue:  { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
}

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now()
      const step = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.round(eased * target))
        if (progress < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current) }
  }, [target, duration, delay])

  return count
}

export default function StatsCard({ titre, valeur, icone, couleur, description, delay = 0, href }: StatsCardProps) {
  const [visible, setVisible] = useState(false)
  const count = useCountUp(visible ? valeur : 0, 1200, 0)
  const c = COULEURS[couleur]
  const Icon = ICONS[icone]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const inner = (
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#8B949E] font-medium truncate">{titre}</p>
        <p className={`text-3xl font-black mt-1.5 font-mono ${c.text}`}>
          {count.toLocaleString('fr-FR')}
        </p>
        {description && <p className="text-xs text-[#8B949E] mt-1">{description}</p>}
      </div>
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center ml-3`}>
        <Icon size={20} className={c.text} />
      </div>
    </div>
  )

  const cls = `relative bg-[#161B22] border border-[#30363D] rounded-xl p-5
    transition-all duration-200 ease-out
    hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#F59E0B]/20
    ${href ? 'cursor-pointer' : 'cursor-default'}
    ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`

  const style = { transition: `opacity 300ms ease ${delay}ms, transform 300ms ease ${delay}ms, box-shadow 200ms ease-out, border-color 200ms ease-out` }

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>{inner}</Link>
    )
  }

  return (
    <div className={cls} style={style}>{inner}</div>
  )
}
