'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  accentColor?: string
  disabled?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  accentColor = '#F59E0B',
  disabled = false,
}: Props) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  // Fermer au clic extérieur
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 40)
  }

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>

      {/* ── Déclencheur ── */}
      <button
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-left
          flex items-center gap-2 transition-all duration-150 outline-none
          hover:border-[#484F58] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={open ? { borderColor: accentColor, boxShadow: `0 0 0 3px ${accentColor}26` } : {}}
      >
        <span className={`flex-1 truncate ${selected ? 'text-[#F0F6FC]' : 'text-[#8B949E]'}`}>
          {selected ? selected.label : placeholder}
        </span>

        {/* Sous-étiquette de la sélection (ex: matricule) */}
        {selected?.sublabel && (
          <span className="text-xs font-mono text-[#8B949E] flex-shrink-0">{selected.sublabel}</span>
        )}

        {/* Bouton effacer */}
        {selected && !disabled && (
          <span
            role="button"
            onMouseDown={e => { e.stopPropagation(); onChange('') }}
            className="text-[#8B949E] hover:text-[#F0F6FC] flex-shrink-0 p-0.5 -mr-0.5 cursor-pointer"
          >
            <X size={13} />
          </span>
        )}

        <ChevronDown
          size={15}
          className={`text-[#8B949E] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        >
          {/* Champ de recherche */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#30363D] bg-[#0D1117]">
            <Search size={14} className="text-[#8B949E] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-sm text-[#F0F6FC] placeholder-[#8B949E] outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Liste des options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#8B949E]">
                Aucun résultat pour &ldquo;{query}&rdquo;
              </p>
            ) : (
              filtered.map(opt => {
                const isSel = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors duration-75
                      hover:bg-[#21262D] cursor-pointer"
                    style={isSel ? { backgroundColor: `${accentColor}18` } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={isSel ? { color: accentColor } : { color: '#F0F6FC' }}>
                        {opt.label}
                      </p>
                      {opt.sublabel && (
                        <p className="text-xs text-[#8B949E] mt-0.5 font-mono truncate">{opt.sublabel}</p>
                      )}
                    </div>
                    {isSel && <Check size={14} className="flex-shrink-0" style={{ color: accentColor }} />}
                  </button>
                )
              })
            )}
          </div>

          {/* Pied : compteur */}
          <div className="px-4 py-2 border-t border-[#30363D] bg-[#0D1117]">
            <p className="text-xs text-[#8B949E]">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              {query && <> pour &ldquo;{query}&rdquo;</>}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
