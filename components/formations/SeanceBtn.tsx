'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Loader2 } from 'lucide-react'

interface Props {
  formationId: string
  nbFaites: number
  nbTotal: number
}

export default function SeanceBtn({ formationId, nbFaites, nbTotal }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const done = nbFaites >= nbTotal

  async function handleClick() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/formations/${formationId}/seance`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) return null

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F59E0B]/30
          bg-[#F59E0B]/5 text-[#F59E0B] text-sm font-semibold
          hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/60
          hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]
          active:scale-[0.97] transition-all duration-150
          disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : <PlusCircle size={15} />
        }
        Marquer séance effectuée
      </button>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}
