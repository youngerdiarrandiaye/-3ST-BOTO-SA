'use client'

export default function PrintToolbar({ numero }: { numero: string }) {
  return (
    <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3
      bg-[#161B22] border-b border-[#30363D]">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
      >
        ← Retour
      </button>
      <span className="text-sm font-mono text-[#8B949E]">{numero}</span>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
          hover:bg-[#D97706] active:scale-[0.98] transition-all"
      >
        🖨 Imprimer
      </button>
    </div>
  )
}
