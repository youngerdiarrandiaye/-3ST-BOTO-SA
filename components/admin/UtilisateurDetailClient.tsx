'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Mail, Phone, Calendar, Loader2,
  Pencil, X, Save, UserX, UserCheck, AlertTriangle, Check,
  HardHat, ShieldCheck,
} from 'lucide-react'

interface User {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  telephone: string | null
  service: '3st' | 'sst_hse' | null
  actif: boolean
  created_at?: string
}

interface Props {
  user: User
  currentUserId: string
  isAdmin: boolean
}

const ROLES = [
  {
    val: 'admin',
    label: 'Administrateur',
    short: 'Admin',
    desc: 'Accès total à la plateforme',
    cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    dot: 'bg-[#F59E0B]',
  },
  {
    val: 'hse',
    label: 'HSE',
    short: 'HSE',
    desc: 'Hygiène, Sécurité, Environnement',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  {
    val: 'sst',
    label: 'SST',
    short: 'SST',
    desc: 'Santé et Sécurité au Travail',
    cls: 'bg-green-500/10 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  {
    val: 'direction',
    label: 'Direction',
    short: 'Direction',
    desc: 'Consultation et rapports seulement',
    cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  {
    val: 'agent',
    label: 'Agent terrain',
    short: 'Agent',
    desc: 'Déclaration d\'infractions uniquement',
    cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    dot: 'bg-gray-400',
  },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 transition-colors`

export default function UtilisateurDetailClient({ user: initial, currentUserId, isAdmin }: Props) {
  const router = useRouter()
  const [user, setUser]             = useState(initial)
  const [editOpen, setEditOpen]     = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toggling, setToggling]     = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [erreur, setErreur]         = useState<string | null>(null)

  // Edit form state
  const [nom,       setNom]       = useState(user.nom)
  const [prenom,    setPrenom]    = useState(user.prenom)
  const [telephone, setTelephone] = useState(user.telephone ?? '')

  const isSelf    = user.id === currentUserId
  const canEdit   = isSelf || isAdmin
  const canManage = isAdmin && !isSelf

  const roleMeta = ROLES.find(r => r.val === user.role) ?? ROLES[4]

  // ── Sauvegarder les infos ──────────────────────────────────────────────
  async function saveInfo() {
    if (!nom.trim() || !prenom.trim()) { setErreur('Nom et prénom obligatoires'); return }
    setSaving(true)
    setErreur(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:       nom.trim(),
        prenom:    prenom.trim(),
        telephone: telephone.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setUser(u => ({ ...u, nom: nom.trim(), prenom: prenom.trim(), telephone: telephone.trim() || null }))
      setEditOpen(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErreur(d.error ?? 'Erreur serveur')
    }
  }

  // ── Toggle actif ───────────────────────────────────────────────────────
  async function toggleActif() {
    setToggling(true)
    setErreur(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !user.actif }),
    })
    setToggling(false)
    setConfirmOpen(false)
    if (res.ok) {
      setUser(u => ({ ...u, actif: !u.actif }))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErreur(d.error ?? 'Erreur serveur')
    }
  }

  // ── Changer le rôle ────────────────────────────────────────────────────
  async function changeRole(role: string) {
    if (role === user.role) return
    setRoleLoading(true)
    setErreur(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setRoleLoading(false)
    if (res.ok) {
      setUser(u => ({ ...u, role, service: role === 'agent' ? u.service : null }))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErreur(d.error ?? 'Erreur serveur')
    }
  }

  // ── Changer le service (agent seulement) ───────────────────────────────
  async function changeService(service: '3st' | 'sst_hse') {
    if (service === user.service) return
    setServiceLoading(true)
    setErreur(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: user.role, service }),
    })
    setServiceLoading(false)
    if (res.ok) {
      setUser(u => ({ ...u, service }))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErreur(d.error ?? 'Erreur serveur')
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        {/* Bandeau coloré */}
        <div className={`h-2 w-full ${user.actif ? 'bg-gradient-to-r from-[#F59E0B]/60 to-[#F59E0B]/20' : 'bg-[#30363D]'}`} />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 font-black text-xl
              ${user.actif ? 'bg-[#21262D] border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-[#21262D] border-[#30363D] text-[#8B949E]'}`}>
              {user.prenom?.[0]?.toUpperCase()}{user.nom?.[0]?.toUpperCase()}
            </div>

            {/* Identité */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[#F0F6FC] truncate">{user.prenom} {user.nom}</h1>
                {isSelf && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 font-medium">
                    Vous
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${roleMeta.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dot}`} />
                  {roleMeta.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium
                  ${user.actif
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.actif ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  {user.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            {/* Bouton Modifier */}
            {canEdit && (
              <button
                onClick={() => { setNom(user.nom); setPrenom(user.prenom); setTelephone(user.telephone ?? ''); setErreur(null); setEditOpen(true) }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] text-sm font-medium rounded-lg
                  hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#F59E0B]/40 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15)]
                  active:scale-[0.97] transition-all duration-150 flex-shrink-0 cursor-pointer"
              >
                <Pencil size={13} />
                Modifier
              </button>
            )}
          </div>

          {/* Détails contact */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#30363D]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#21262D] flex items-center justify-center flex-shrink-0">
                <Mail size={12} className="text-[#8B949E]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">Email</p>
                <p className="text-xs text-[#F0F6FC] truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#21262D] flex items-center justify-center flex-shrink-0">
                <Phone size={12} className="text-[#8B949E]" />
              </div>
              <div>
                <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">Téléphone</p>
                <p className="text-xs text-[#F0F6FC]">{user.telephone || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#21262D] flex items-center justify-center flex-shrink-0">
                <Calendar size={12} className="text-[#8B949E]" />
              </div>
              <div>
                <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">Membre depuis</p>
                <p className="text-xs text-[#F0F6FC]">{user.created_at ? fmt(user.created_at) : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rôle & Permissions ─────────────────────────────────────────── */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#8B949E]" />
            <p className="text-sm font-semibold text-[#F0F6FC]">Rôle & Permissions</p>
          </div>
          {roleLoading && <Loader2 size={14} className="animate-spin text-[#8B949E]" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLES.map(r => {
            const isActive = user.role === r.val
            return (
              <button
                key={r.val}
                type="button"
                disabled={!canManage || roleLoading}
                onClick={() => canManage && changeRole(r.val)}
                className={`relative p-3.5 rounded-xl border text-left transition-all duration-150
                  ${canManage ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'}
                  ${isActive
                    ? `${r.cls} shadow-[0_0_0_1px_inset_rgba(0,0,0,0.2)]`
                    : canManage
                      ? 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:bg-[#21262D] hover:border-[#8B949E]/40 hover:text-[#F0F6FC]'
                      : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] opacity-60'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActive ? r.dot : 'bg-[#30363D]'}`} />
                    <span className="text-xs font-bold">{r.short}</span>
                  </div>
                  {isActive && <Check size={13} className="opacity-70" />}
                </div>
                <p className="text-xs opacity-60 mt-1 ml-4">{r.desc}</p>
              </button>
            )
          })}
        </div>

        {!canManage && (
          <p className="text-xs text-[#8B949E] mt-3 flex items-center gap-1.5">
            <AlertTriangle size={11} />
            {isSelf ? 'Vous ne pouvez pas modifier votre propre rôle.' : 'Accès admin requis pour modifier le rôle.'}
          </p>
        )}

        {/* ── Sélecteur service (agent uniquement) ── */}
        {user.role === 'agent' && (
          <div className="mt-4 pt-4 border-t border-[#30363D] space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Service d&apos;appartenance</p>
              {serviceLoading && <Loader2 size={12} className="animate-spin text-[#8B949E]" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: '3st'    as const, label: '3ST',     sub: 'Opérations site minier', Icon: HardHat,     cls: 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
                { val: 'sst_hse' as const, label: 'SST/HSE', sub: 'Santé Sécurité Env.',    Icon: ShieldCheck, cls: 'border-blue-500/60 bg-blue-500/10 text-blue-400',      dot: 'bg-blue-400'  },
              ].map(s => {
                const isActive = user.service === s.val
                return (
                  <button
                    key={s.val}
                    type="button"
                    disabled={!canManage || serviceLoading}
                    onClick={() => canManage && changeService(s.val)}
                    className={`relative p-3 rounded-xl border text-left transition-all duration-150
                      ${canManage ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'}
                      ${isActive
                        ? `${s.cls} shadow-[0_0_0_1px_inset_rgba(0,0,0,0.2)]`
                        : canManage
                          ? 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:bg-[#21262D] hover:border-[#8B949E]/40 hover:text-[#F0F6FC]'
                          : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] opacity-60'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <s.Icon size={15} />
                      {isActive && <Check size={12} className="opacity-70" />}
                    </div>
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{s.sub}</p>
                  </button>
                )
              })}
            </div>
            {!user.service && canManage && (
              <p className="text-[10px] text-[#F59E0B] flex items-center gap-1.5">
                <AlertTriangle size={10} />
                Service non défini — sélectionnez l&apos;appartenance de cet agent.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Zone de danger ─────────────────────────────────────────────── */}
      {canManage && (
        <div className="bg-[#161B22] border border-red-500/20 rounded-xl p-5">
          <p className="text-sm font-semibold text-[#F0F6FC] mb-1">Zone de danger</p>
          <p className="text-xs text-[#8B949E] mb-4">
            {user.actif
              ? 'Désactiver ce compte bloque immédiatement l\'accès à la plateforme.'
              : 'Réactiver ce compte restaure l\'accès à la plateforme.'}
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer
              active:scale-[0.97] transition-all duration-150
              ${user.actif
                ? 'text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]'
                : 'text-green-400 border-green-500/30 bg-green-500/5 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.2)]'
              }`}
          >
            {user.actif ? <UserX size={15} /> : <UserCheck size={15} />}
            {user.actif ? 'Désactiver ce compte' : 'Réactiver ce compte'}
          </button>
        </div>
      )}

      {/* Erreur globale */}
      {erreur && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={12} />
          {erreur}
        </p>
      )}

      {/* ── Modal Modifier les infos ───────────────────────────────────── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !saving && setEditOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363D]">
              <h3 className="text-sm font-bold text-[#F0F6FC]">Modifier les informations</h3>
              <button onClick={() => setEditOpen(false)} disabled={saving}
                className="p-1.5 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8B949E] mb-1.5 uppercase tracking-wide">Prénom</label>
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} className={inputCls} placeholder="Prénom" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B949E] mb-1.5 uppercase tracking-wide">Nom</label>
                  <input value={nom} onChange={e => setNom(e.target.value)} className={inputCls} placeholder="Nom" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] mb-1.5 uppercase tracking-wide">Téléphone</label>
                <input value={telephone} onChange={e => setTelephone(e.target.value)} className={inputCls} placeholder="+221 77 000 00 00" />
              </div>
              <p className="text-xs text-[#8B949E] flex items-center gap-1.5">
                <Mail size={11} />
                L&apos;email ne peut pas être modifié ici.
              </p>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-[#30363D]">
              <button onClick={() => setEditOpen(false)} disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                  hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                Annuler
              </button>
              <button onClick={saveInfo} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] text-[#0D1117] rounded-lg
                  hover:bg-[#E68A00] transition-colors disabled:opacity-40 cursor-pointer">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation désactivation ──────────────────────────── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !toggling && setConfirmOpen(false)}
        >
          <div
            className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${user.actif ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {user.actif ? <UserX size={18} className="text-red-400" /> : <UserCheck size={18} className="text-green-400" />}
              </div>
              <h3 className="text-base font-bold text-[#F0F6FC]">
                {user.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
              </h3>
            </div>

            <p className="text-sm text-[#F0F6FC]/70 leading-relaxed mb-5">
              {user.actif
                ? <>Le compte de <strong className="text-[#F0F6FC]">{user.prenom} {user.nom}</strong> sera immédiatement désactivé. L&apos;utilisateur ne pourra plus se connecter.</>
                : <>Le compte de <strong className="text-[#F0F6FC]">{user.prenom} {user.nom}</strong> sera réactivé et l&apos;utilisateur pourra à nouveau se connecter.</>
              }
            </p>

            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} disabled={toggling}
                className="flex-1 px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg
                  hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors disabled:opacity-40 cursor-pointer">
                Annuler
              </button>
              <button onClick={toggleActif} disabled={toggling}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer
                  ${user.actif ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#10B981] text-white hover:bg-[#059669]'}`}>
                {toggling ? <Loader2 size={14} className="animate-spin" /> : (user.actif ? <UserX size={14} /> : <UserCheck size={14} />)}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
