import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
  total: number
  basePath: string
  searchParams: Record<string, string | undefined>
}

export default function Pagination({ page, totalPages, total, basePath, searchParams }: Props) {
  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k !== 'page' && v) params.set(k, v)
    })
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const from = (page - 1) * 10 + 1
  const to   = Math.min(page * 10, total)

  // Pages à afficher (autour de la page courante)
  const pages: number[] = []
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    pages.push(p)
  }

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#30363D]">
      <p className="text-xs text-[#8B949E]">
        {from}–{to} sur <span className="font-semibold text-[#F0F6FC]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        {/* Précédent */}
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-lg text-[#30363D] cursor-not-allowed">
            <ChevronLeft size={16} />
          </span>
        )}

        {/* Numéros de page */}
        {pages[0] > 1 && (
          <>
            <Link href={href(1)} className="flex items-center justify-center w-8 h-8 rounded-lg text-xs text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors">1</Link>
            {pages[0] > 2 && <span className="text-[#30363D] text-xs px-1">…</span>}
          </>
        )}

        {pages.map(p => (
          <Link
            key={p}
            href={href(p)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-colors
              ${p === page
                ? 'bg-[#F59E0B] text-[#0D1117] font-bold'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
              }`}
          >
            {p}
          </Link>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="text-[#30363D] text-xs px-1">…</span>}
            <Link href={href(totalPages)} className="flex items-center justify-center w-8 h-8 rounded-lg text-xs text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors">{totalPages}</Link>
          </>
        )}

        {/* Suivant */}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors"
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-lg text-[#30363D] cursor-not-allowed">
            <ChevronRight size={16} />
          </span>
        )}
      </div>
    </div>
  )
}
