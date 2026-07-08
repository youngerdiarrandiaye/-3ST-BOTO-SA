'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Souscrit aux changements Postgres sur les tables listées et déclenche
 * un router.refresh() déboncé (400 ms) pour resynchroniser les données
 * côté serveur sans rechargement complet de la page.
 *
 * Usage:  useRealtimeRefresh(['infractions', 'sanctions'])
 */
export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter()
  // ID unique par instance pour éviter les conflits de noms de canaux
  const channelId = useRef(`rt-${Math.random().toString(36).slice(2, 9)}`)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const flush = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 400)
    }

    const channels = tables.map((table, i) =>
      supabase
        .channel(`${channelId.current}-${i}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          flush
        )
        .subscribe()
    )

    return () => {
      if (timer.current) clearTimeout(timer.current)
      channels.forEach(c => supabase.removeChannel(c))
    }
  // tables est stable après le mount — on ignore le lint warning intentionnellement
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
