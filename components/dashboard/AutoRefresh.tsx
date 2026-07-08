'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Rafraîchit les données serveur toutes les 30 secondes (UC-26)
export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
