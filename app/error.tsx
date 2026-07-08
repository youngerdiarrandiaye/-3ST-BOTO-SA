'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[3ST] Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#F0F6FC]">Une erreur est survenue</h1>
          <p className="text-sm text-[#8B949E] mt-1.5">
            Quelque chose s&apos;est mal passé. Réessayez ou contactez l&apos;administrateur.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-[#30363D] mt-2">#{error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161B22] border border-[#30363D] text-[#F0F6FC]
            text-sm font-semibold rounded-lg hover:border-[#F59E0B]/40 hover:text-[#F59E0B]
            active:scale-[0.97] transition-all duration-150"
        >
          <RefreshCw size={15} />
          Réessayer
        </button>
      </div>
    </div>
  )
}
