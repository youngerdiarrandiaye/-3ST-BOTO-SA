'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, AlertTriangle,
  GraduationCap, ShieldX, BarChart2, Building2,
  LogOut, Menu, X, ShieldCheck, UserCog, Settings, ScanLine,
} from 'lucide-react'
import { useState } from 'react'
import type { RoleUtilisateur } from '@/lib/types'

// Définition des items avec restriction de rôles
// roles: undefined = tous les rôles authentifiés
const NAV_ITEMS: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: RoleUtilisateur[]
  section?: 'main' | 'admin'
}[] = [
  // Section principale
  // Dashboard : visible pour tous sauf agent (agent a sa propre vue simplifiée mais pas dans la nav)
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin','hse','sst','direction'] },
  { href: '/conducteurs', label: 'Conducteurs', icon: Users },
  { href: '/scan',        label: 'Scanner',     icon: ScanLine,        roles: ['admin','hse','sst','agent'] },
  { href: '/infractions', label: 'Infractions', icon: AlertTriangle,   roles: ['admin','hse','sst','agent'] },
  { href: '/permis',      label: 'Permis',      icon: CreditCard,      roles: ['admin','hse','sst'] },
  { href: '/formations',  label: 'Formations',  icon: GraduationCap,   roles: ['admin','hse','sst'] },
  { href: '/sanctions',   label: 'Sanctions',   icon: ShieldX,         roles: ['admin','hse','sst'] },
  { href: '/rapports',    label: 'Rapports',    icon: BarChart2,       roles: ['admin','hse','sst','direction'] },
  // Section admin
  { href: '/entreprises', label: 'Entreprises', icon: Building2,  roles: ['admin','hse','sst'], section: 'admin' },
  { href: '/utilisateurs',label: 'Utilisateurs',icon: UserCog,    roles: ['admin'],         section: 'admin' },
  { href: '/parametres',  label: 'Paramètres',  icon: Settings,   roles: ['admin'],         section: 'admin' },
]

const ROLE_LABELS: Record<RoleUtilisateur, string> = {
  admin:     'Administrateur',
  hse:       'HSE',
  sst:       'SST',
  direction: 'Direction',
  agent:     'Agent terrain',
}

interface SidebarProps {
  userNom?: string
  userPrenom?: string
  userRole?: RoleUtilisateur
}

export default function Sidebar({ userNom, userPrenom, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userNom && userPrenom
    ? `${userPrenom[0]}${userNom[0]}`.toUpperCase()
    : '??'

  // Filtrer selon le rôle
  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  })

  const mainItems  = visibleItems.filter(i => i.section !== 'admin')
  const adminItems = visibleItems.filter(i => i.section === 'admin')

  const NavLink = ({ href, label, icon: Icon }: typeof NAV_ITEMS[0]) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-150 group
          ${isActive
            ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
            : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#F0F6FC]'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F59E0B] rounded-r-full" />
        )}
        <Icon
          className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#F59E0B]' : 'text-[#8B949E] group-hover:text-[#F0F6FC]'}`}
          size={18}
        />
        {label}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#30363D]">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F59E0B] flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#0D1117]" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-[#F0F6FC] font-bold text-base leading-none">MineAxis</span>
          <span className="block text-[#F59E0B] font-black text-xs leading-none tracking-wide">MANAGEM | 3ST</span>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainItems.map(item => <NavLink key={item.href} {...item} />)}

        {/* Section admin */}
        {adminItems.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#30363D]">Administration</p>
            </div>
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Section utilisateur */}
      <div className="px-3 py-4 border-t border-[#30363D]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[#F59E0B]">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F0F6FC] truncate">
              {userPrenom} {userNom}
            </p>
            <p className="text-xs text-[#8B949E] truncate">
              {userRole ? ROLE_LABELS[userRole] : '—'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-1.5 rounded-md text-[#8B949E] hover:text-[#EF4444] hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-[#0D1117] border-r border-[#30363D] h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile — bouton hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#161B22] border border-[#30363D] text-[#F0F6FC] cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Mobile — drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 z-50 flex flex-col w-60 h-screen bg-[#0D1117] border-r border-[#30363D]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
