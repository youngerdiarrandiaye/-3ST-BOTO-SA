'use client'

import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, AlertTriangle, CreditCard, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const BREADCRUMBS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/conducteurs': 'Conducteurs',
  '/permis':      'Permis internes',
  '/infractions': 'Infractions',
  '/formations':  'Formations',
  '/sanctions':   'Sanctions',
  '/rapports':    'Rapports',
  '/entreprises': 'Entreprises',
  '/utilisateurs':'Utilisateurs',
  '/parametres':  'Paramètres',
  '/nouvelle':    'Nouvelle déclaration',
  '/nouveau':     'Nouveau',
}

interface Alertes {
  infractions: number
  permis: number
}

interface NavbarProps {
  alertes?: Alertes
}

export default function Navbar({ alertes = { infractions: 0, permis: 0 } }: NavbarProps) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const totalAlertes = alertes.infractions + alertes.permis

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const segments = pathname.split('/').filter(Boolean)
  const rootSegment = '/' + (segments[0] || 'dashboard')
  const rootLabel = BREADCRUMBS[rootSegment] ?? segments[0]

  return (
    <header
      className={`
        sticky top-0 z-30 h-16 flex items-center justify-between px-6
        border-b border-[#30363D] transition-all duration-200
        ${scrolled ? 'bg-[#0D1117]/80 backdrop-blur-lg' : 'bg-[#0D1117]'}
      `}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm pl-10 lg:pl-0">
        <span className="text-[#8B949E]">MineAxis</span>
        <ChevronRight size={14} className="text-[#30363D]" />
        {segments.length > 1 ? (
          <>
            <span className="text-[#8B949E]">{rootLabel}</span>
            <ChevronRight size={14} className="text-[#30363D]" />
            <span className="text-[#F0F6FC] font-medium capitalize">
              {BREADCRUMBS['/' + segments[segments.length - 1]] ?? segments[segments.length - 1]}
            </span>
          </>
        ) : (
          <span className="text-[#F0F6FC] font-medium">{rootLabel}</span>
        )}
      </nav>

      {/* Droite */}
      <div className="flex items-center gap-3">
        {/* Cloche alertes */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(prev => !prev)}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              open ? 'text-[#F0F6FC] bg-[#21262D]' : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
            }`}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {totalAlertes > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#EF4444] text-white text-[10px] font-bold rounded-full leading-none">
                {totalAlertes > 99 ? '99+' : totalAlertes}
              </span>
            )}
          </button>

          {/* Dropdown notifications */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D]">
                <span className="text-sm font-semibold text-[#F0F6FC]">Alertes</span>
                {totalAlertes > 0 && (
                  <span className="text-xs font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full">
                    {totalAlertes}
                  </span>
                )}
                <button onClick={() => setOpen(false)} className="text-[#8B949E] hover:text-[#F0F6FC] ml-auto cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              {/* Items */}
              {totalAlertes === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={28} className="text-[#30363D] mx-auto mb-2" />
                  <p className="text-sm text-[#8B949E]">Aucune alerte en cours</p>
                  <p className="text-xs text-[#8B949E]/60 mt-1">Le site est sous contrôle</p>
                </div>
              ) : (
                <div className="py-1">
                  {alertes.infractions > 0 && (
                    <Link
                      href="/infractions?statut=declaree"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#21262D] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
                          {alertes.infractions} infraction{alertes.infractions > 1 ? 's' : ''} en attente
                        </p>
                        <p className="text-xs text-[#8B949E] mt-0.5">Déclarées et non encore traitées</p>
                      </div>
                      <ChevronRight size={14} className="text-[#30363D] group-hover:text-[#F59E0B] flex-shrink-0 mt-1 transition-colors" />
                    </Link>
                  )}

                  {alertes.permis > 0 && (
                    <Link
                      href="/permis"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#21262D] transition-colors group border-t border-[#30363D]/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CreditCard size={14} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">
                          {alertes.permis} permis expirent bientôt
                        </p>
                        <p className="text-xs text-[#8B949E] mt-0.5">Dans les 7 prochains jours</p>
                      </div>
                      <ChevronRight size={14} className="text-[#30363D] group-hover:text-[#F59E0B] flex-shrink-0 mt-1 transition-colors" />
                    </Link>
                  )}
                </div>
              )}

              {/* Footer */}
              {totalAlertes > 0 && (
                <div className="px-4 py-2.5 border-t border-[#30363D] bg-[#0D1117]/40">
                  <p className="text-xs text-[#8B949E] text-center">
                    Mise à jour à chaque navigation
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
