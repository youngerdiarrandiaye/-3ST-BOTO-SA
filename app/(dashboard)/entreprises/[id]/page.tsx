import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users, ArrowLeft, Phone, Mail, User,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight,
} from 'lucide-react'
import EntrepriseDetailClient from '@/components/admin/EntrepriseDetailClient'

interface Params { params: Promise<{ id: string }> }

const TYPE_LABEL: Record<string, string> = {
  sous_traitant: 'Sous-traitant',
  partenaire:    'Partenaire',
  interne:       'Interne',
}
const TYPE_CLS: Record<string, string> = {
  sous_traitant: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  partenaire:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  interne:       'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
}
const STATUT_CLS: Record<string, string> = {
  actif:    'bg-green-500/10 text-green-400',
  suspendu: 'bg-orange-500/10 text-orange-400',
  retire:   'bg-red-500/10 text-red-400',
  inactif:  'bg-[#30363D] text-[#8B949E]',
}
const STATUT_LABEL: Record<string, string> = {
  actif: 'Actif', suspendu: 'Suspendu', retire: 'Retraité', inactif: 'Inactif',
}

export default async function EntrepriseDetailPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [meRes, entrepriseRes] = await Promise.all([
    supabase.from('utilisateurs').select('role').eq('id', user.id).single(),
    createAdminClient()
      .from('entreprises')
      .select(`
        *,
        conducteurs(
          id, matricule, nom, prenom, statut, points_actuels,
          permis_internes(id, statut, date_expiration)
        )
      `)
      .eq('id', id)
      .single(),
  ])

  const role = meRes.data?.role ?? ''
  if (!['admin', 'hse'].includes(role)) redirect('/dashboard')

  if (entrepriseRes.error || !entrepriseRes.data) notFound()

  const e = entrepriseRes.data as any
  const conducteurs = (e.conducteurs ?? []) as any[]
  const isAdmin = role === 'admin'

  const nbActifs    = conducteurs.filter((c: any) => c.statut === 'actif').length
  const nbSuspendus = conducteurs.filter((c: any) => c.statut === 'suspendu').length
  const nbRetires   = conducteurs.filter((c: any) => c.statut === 'retire').length

  // Find conducteurs with permis expiring in 30 days
  const today = new Date()
  const in30  = new Date(today); in30.setDate(today.getDate() + 30)
  const nbPermisAlerte = conducteurs.filter((c: any) =>
    c.permis_internes?.some((p: any) => {
      if (p.statut !== 'valide') return false
      const exp = new Date(p.date_expiration)
      return exp >= today && exp <= in30
    })
  ).length

  return (
    <div className="space-y-6">

      {/* Back + header */}
      <div>
        <Link href="/entreprises"
          className="inline-flex items-center gap-1.5 text-sm text-[#8B949E] hover:text-[#F0F6FC] mb-4 transition-colors">
          <ArrowLeft size={14} /> Entreprises
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#161B22] border border-[#30363D] flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-[#F0F6FC]">{e.nom}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${TYPE_CLS[e.type] ?? ''}`}>
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full
                  ${e.actif ? 'bg-green-500/10 text-green-400' : 'bg-[#30363D] text-[#8B949E]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${e.actif ? 'bg-green-400' : 'bg-gray-500'}`} />
                  {e.actif ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-[#8B949E] mt-0.5">
                Depuis le {new Date(e.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Actions client */}
          <EntrepriseDetailClient
            id={e.id}
            nom={e.nom}
            type={e.type}
            actif={e.actif}
            contact_nom={e.contact_nom}
            contact_tel={e.contact_tel}
            contact_email={e.contact_email}
            nbConducteurs={conducteurs.length}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Conducteurs',  val: conducteurs.length, icon: Users,          cls: 'text-[#F0F6FC]' },
          { label: 'Actifs',       val: nbActifs,           icon: CheckCircle2,   cls: 'text-green-400' },
          { label: 'Suspendus',    val: nbSuspendus,        icon: XCircle,        cls: nbSuspendus > 0 ? 'text-orange-400' : 'text-[#8B949E]' },
          { label: 'Permis alerte',val: nbPermisAlerte,     icon: AlertTriangle,  cls: nbPermisAlerte > 0 ? 'text-[#F59E0B]' : 'text-[#8B949E]' },
        ].map(s => (
          <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[#8B949E]">{s.label}</p>
              <s.icon size={13} className={s.cls} />
            </div>
            <p className={`text-2xl font-black font-mono ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      {(e.contact_nom || e.contact_tel || e.contact_email) && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Contact</p>
          <div className="flex flex-wrap gap-5">
            {e.contact_nom && (
              <div className="flex items-center gap-2 text-sm text-[#F0F6FC]">
                <User size={13} className="text-[#8B949E]" />
                {e.contact_nom}
              </div>
            )}
            {e.contact_tel && (
              <a href={`tel:${e.contact_tel}`} className="flex items-center gap-2 text-sm text-[#F0F6FC] hover:text-[#F59E0B] transition-colors">
                <Phone size={13} className="text-[#8B949E]" />
                {e.contact_tel}
              </a>
            )}
            {e.contact_email && (
              <a href={`mailto:${e.contact_email}`} className="flex items-center gap-2 text-sm text-[#F0F6FC] hover:text-[#F59E0B] transition-colors">
                <Mail size={13} className="text-[#8B949E]" />
                {e.contact_email}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Liste conducteurs */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#30363D] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#F0F6FC]">
            Conducteurs
            <span className="ml-2 text-xs text-[#8B949E] font-normal">{conducteurs.length}</span>
          </p>
          {nbRetires > 0 && (
            <span className="text-xs text-[#8B949E]">{nbRetires} retraité{nbRetires > 1 ? 's' : ''}</span>
          )}
        </div>

        {conducteurs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Users size={32} className="text-[#30363D] mb-3" />
            <p className="text-sm text-[#8B949E]">Aucun conducteur rattaché</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0D1117] border-b border-[#30363D]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteur</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Matricule</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Points</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {conducteurs.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#21262D] transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/conducteurs/${c.id}`}
                        className="font-medium text-[#F0F6FC] hover:text-[#F59E0B] transition-colors">
                        {c.prenom} {c.nom}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#8B949E]">{c.matricule}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_CLS[c.statut] ?? 'bg-[#30363D] text-[#8B949E]'}`}>
                        {STATUT_LABEL[c.statut] ?? c.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-mono font-bold text-sm ${
                        c.points_actuels <= 5 ? 'text-red-400' :
                        c.points_actuels <= 10 ? 'text-[#F59E0B]' : 'text-green-400'
                      }`}>
                        {c.points_actuels}
                      </span>
                      <span className="text-xs text-[#8B949E]">/20</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/conducteurs/${c.id}`}>
                        <ChevronRight size={14} className="text-[#30363D] group-hover:text-[#8B949E] transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
