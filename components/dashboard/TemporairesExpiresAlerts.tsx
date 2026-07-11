'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Clock, X } from 'lucide-react'

interface Alert {
  id:           string
  nom:          string
  prenom:       string
  conducteurId: string
}

export default function TemporairesExpiresAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const channelId = useRef(`temp-expire-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(channelId.current)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conducteurs' },
        (payload) => {
          const rec = payload.new as any
          const old = payload.old as any

          // Triggered when a temporary conductor's statut switches to inactif
          // by the pg_cron expiration job
          if (
            rec.est_temporaire &&
            old.statut === 'actif' &&
            rec.statut === 'inactif'
          ) {
            const alert: Alert = {
              id:           `${rec.id}-${Date.now()}`,
              nom:          rec.nom   ?? '',
              prenom:       rec.prenom ?? '',
              conducteurId: rec.id,
            }
            setAlerts(prev => [alert, ...prev].slice(0, 5))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function dismiss(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <div
          key={a.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-amber-500/8 border-amber-500/25"
        >
          <Clock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">
              Autorisation temporaire expirée
            </p>
            <p className="text-xs text-[#8B949E] mt-0.5">
              {a.prenom} {a.nom} — accès site révoqué automatiquement
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/conducteurs/${a.conducteurId}`}
              className="text-xs text-[#F59E0B] hover:opacity-70 font-medium transition-opacity"
            >
              Voir →
            </Link>
            <button
              onClick={() => dismiss(a.id)}
              className="p-1 text-[#8B949E] hover:text-[#F0F6FC] rounded transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
