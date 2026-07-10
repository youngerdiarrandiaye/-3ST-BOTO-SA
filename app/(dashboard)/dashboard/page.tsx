import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCard from '@/components/dashboard/StatsCard'
import InfractionsChart from '@/components/dashboard/InfractionsChart'
import RecentInfractions from '@/components/dashboard/RecentInfractions'
import AutoRefresh from '@/components/dashboard/AutoRefresh'
import SuspensionAlerts from '@/components/dashboard/SuspensionAlerts'
import Link from 'next/link'
import { AlertTriangle, CreditCard, BarChart2 } from 'lucide-react'
import type { Infraction, RoleUtilisateur } from '@/lib/types'

const ROLE_WELCOME: Record<Exclude<RoleUtilisateur, 'agent'>, { titre: string; sous: string }> = {
  admin:     { titre: 'Dashboard Administrateur', sous: 'Vue d\'ensemble et gestion — MineAxis MANAGEM | 3ST' },
  hse:       { titre: 'Dashboard HSE',            sous: 'Suivi hygiène, sécurité et environnement — MineAxis' },
  sst:       { titre: 'Dashboard SST',            sous: 'Santé sécurité au travail — MineAxis' },
  direction: { titre: 'Dashboard Direction',      sous: 'Indicateurs et rapports de performance' },
}

async function getDashboardData() {
  const supabase = await createClient()
  const now = new Date()
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const today    = now.toISOString().split('T')[0]
  const dans30j  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: conducteurs_actifs },
    { count: infractions_mois },
    { count: permis_expirant_30j },
    { count: conducteurs_suspendus },
    { count: conducteurs_en_attente },
    { data: dernieresInfractions },
    { data: infractionsParSemaine },
  ] = await Promise.all([
    supabase.from('conducteurs').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    supabase.from('infractions').select('*', { count: 'exact', head: true }).gte('date_heure', debutMois),
    supabase.from('permis_internes').select('*', { count: 'exact', head: true })
      .eq('statut', 'valide').gte('date_expiration', today).lte('date_expiration', dans30j),
    supabase.from('conducteurs').select('*', { count: 'exact', head: true }).eq('statut', 'suspendu'),
    supabase.from('conducteurs').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabase.from('infractions')
      .select('id, date_heure, statut, conducteurs(nom, prenom, matricule), types_infraction(code, libelle, gravite, points_retires)')
      .order('date_heure', { ascending: false })
      .limit(10),
    supabase.from('infractions')
      .select('date_heure, types_infraction(gravite)')
      .gte('date_heure', new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const weekMap: Record<string, { total: number; critiques: number }> = {}
  ;(infractionsParSemaine ?? []).forEach((inf: any) => {
    const d = new Date(inf.date_heure)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay() + 1)
    const key = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    if (!weekMap[key]) weekMap[key] = { total: 0, critiques: 0 }
    weekMap[key].total++
    if ((inf.types_infraction as any)?.gravite === 'critique') weekMap[key].critiques++
  })

  return {
    stats: {
      conducteurs_actifs:    conducteurs_actifs    ?? 0,
      infractions_mois:      infractions_mois      ?? 0,
      permis_expirant_30j:   permis_expirant_30j   ?? 0,
      conducteurs_suspendus: conducteurs_suspendus  ?? 0,
      conducteurs_en_attente: conducteurs_en_attente ?? 0,
    },
    dernieresInfractions: (dernieresInfractions ?? []) as unknown as Infraction[],
    chartData: Object.entries(weekMap).map(([semaine, v]) => ({ semaine, ...v })).slice(-8),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('nom, prenom, role')
    .eq('id', user!.id)
    .single()

  const role = (utilisateur?.role ?? 'agent') as RoleUtilisateur

  // Agent → redirigé vers son espace (conducteurs + infractions)
  if (role === 'agent') redirect('/conducteurs')

  const { stats, dernieresInfractions, chartData } = await getDashboardData()
  const welcome = ROLE_WELCOME[role as Exclude<RoleUtilisateur, 'agent'>]

  const canDeclare  = ['admin', 'hse', 'sst'].includes(role)
  const canPermis   = ['admin', 'hse', 'sst'].includes(role)
  const canRapports = ['admin', 'hse', 'sst', 'direction'].includes(role)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AutoRefresh />
      {['admin', 'hse', 'sst'].includes(role) && <SuspensionAlerts />}

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">{welcome?.titre}</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{welcome?.sous}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canDeclare && (
            <Link href="/infractions/nouvelle"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-semibold rounded-lg hover:bg-[#EF4444]/20 transition-colors">
              <AlertTriangle size={13} />
              Déclarer
            </Link>
          )}
          {canPermis && (
            <Link href="/permis/nouveau"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs font-semibold rounded-lg hover:bg-[#F59E0B]/20 transition-colors">
              <CreditCard size={13} />
              Permis
            </Link>
          )}
          {canRapports && (
            <Link href="/rapports"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] text-xs font-semibold rounded-lg hover:text-[#F0F6FC] hover:border-[#8B949E] transition-colors">
              <BarChart2 size={13} />
              Rapports
            </Link>
          )}
        </div>
      </div>

      {/* 5 Cartes stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatsCard titre="Conducteurs actifs"      valeur={stats.conducteurs_actifs}       icone="Users"          couleur="green"  description="Autorisés à conduire"    delay={0}   href="/conducteurs?statut=actif" />
        <StatsCard titre="En attente validation"   valeur={stats.conducteurs_en_attente}   icone="Clock"          couleur="amber"  description="Workflow N1→N2→N3"       delay={50}  href="/conducteurs?statut=en_attente" />
        <StatsCard titre="Infractions du mois"     valeur={stats.infractions_mois}         icone="AlertTriangle"  couleur="amber"  description="Depuis le 1er du mois"   delay={100} href="/infractions?statut=declaree" />
        <StatsCard titre="Permis expirant (30j)"   valeur={stats.permis_expirant_30j}      icone="CreditCard"     couleur="red"    description="Renouvellement requis"   delay={200} href="/permis" />
        <StatsCard titre="Conducteurs suspendus"   valeur={stats.conducteurs_suspendus}    icone="ShieldX"        couleur="red"    description="Interdits de conduite"   delay={300} href="/conducteurs?statut=suspendu" />
      </div>

      {/* Graphique + Indicateurs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#F0F6FC]">Infractions par semaine</h2>
              <p className="text-xs text-[#8B949E]">8 dernières semaines</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8B949E]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />Critiques</span>
            </div>
          </div>
          <InfractionsChart data={chartData} />
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <h2 className="text-base font-semibold text-[#F0F6FC] mb-4">Indicateurs clés</h2>
          <div className="space-y-0">
            {[
              { label: 'Taux suspension', color: 'text-[#EF4444]',
                val: stats.conducteurs_actifs + stats.conducteurs_suspendus > 0
                  ? `${Math.round((stats.conducteurs_suspendus / (stats.conducteurs_actifs + stats.conducteurs_suspendus)) * 100)}%`
                  : '0%' },
              { label: 'Permis à renouveler', val: String(stats.permis_expirant_30j),   color: 'text-[#F59E0B]' },
              { label: 'Infractions ce mois', val: String(stats.infractions_mois),       color: 'text-[#F59E0B]' },
              { label: 'Conducteurs actifs',  val: String(stats.conducteurs_actifs),     color: 'text-[#10B981]' },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-[#30363D]' : ''}`}>
                <span className="text-sm text-[#8B949E]">{item.label}</span>
                <span className={`text-sm font-bold font-mono ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dernières infractions */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#F0F6FC]">Dernières infractions</h2>
            <p className="text-xs text-[#8B949E]">10 déclarations les plus récentes</p>
          </div>
          <Link href="/infractions" className="text-xs text-[#F59E0B] hover:opacity-70 font-medium transition-opacity">
            Voir tout →
          </Link>
        </div>
        <RecentInfractions infractions={dernieresInfractions} />
      </div>

    </div>
  )
}
