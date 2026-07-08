import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <AlertTriangle size={36} className="text-[#F59E0B]" />
        </div>
        <div>
          <p className="text-7xl font-black font-mono text-[#F59E0B]">404</p>
          <h1 className="text-xl font-bold text-[#F0F6FC] mt-2">Page introuvable</h1>
          <p className="text-sm text-[#8B949E] mt-1.5">
            Cette page n&apos;existe pas ou vous n&apos;avez pas les droits d&apos;accès.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
            hover:bg-[#FBBF24] hover:scale-[1.03] active:scale-[0.97] transition-all duration-150"
        >
          <ArrowLeft size={16} />
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
