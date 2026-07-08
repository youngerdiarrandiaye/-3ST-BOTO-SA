'use client'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'

// Tables opérationnelles surveillées globalement dans tout le dashboard.
// Toute mutation sur ces tables déclenche un router.refresh() deboncé (400ms),
// ce qui force le re-fetch des Server Components de la route courante —
// y compris les pages entièrement Server (conducteurs, formations, permis)
// et les compteurs de la Navbar (infractions en attente, permis expirant).
const TABLES = ['infractions', 'sanctions', 'formations', 'conducteurs', 'permis_internes']

export default function RealtimeWatcher() {
  useRealtimeRefresh(TABLES)
  return null
}
