'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Shield } from 'lucide-react'
import CreateUserForm from './CreateUserForm'

interface Utilisateur {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  telephone: string | null
  actif: boolean
  created_at?: string
  service?: '3st' | 'sst_hse' | null
}

const ROLE_BADGE: Record<string, { cls: string; label: string }> = {
  admin:     { cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',       label: 'Admin' },
  hse:       { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',           label: 'HSE' },
  sst:       { cls: 'bg-green-500/10 text-green-400 border-green-500/20',        label: 'SST' },
  direction: { cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',     label: 'Direction' },
  agent:     { cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20',           label: 'Agent' },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  utilisateurs: Utilisateur[]
  currentUserId: string
}

export default function UtilisateursClient({ utilisateurs: initial, currentUserId }: Props) {
  const router = useRouter()
  const [utilisateurs, setUtilisateurs] = useState(initial)

  function handleCreated(newUser: Utilisateur) {
    setUtilisateurs(prev => [newUser, ...prev])
  }

  async function toggleActif(id: string, actif: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    if (res.ok) {
      setUtilisateurs(prev => prev.map(u => u.id === id ? { ...u, actif: !actif } : u))
    }
  }

  const total     = utilisateurs.length
  const actifs    = utilisateurs.filter(u => u.actif).length
  const parRole   = utilisateurs.reduce((acc: Record<string, number>, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Utilisateurs</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} compte{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg">
            <Shield size={14} className="text-[#F59E0B]" />
            <span className="text-xs font-medium text-[#F59E0B]">Zone admin</span>
          </div>
          <CreateUserForm onCreated={handleCreated} />
        </div>
      </div>

      {/* Stats par rôle */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-[#8B949E]">Total</p>
          <p className="text-xl font-black font-mono mt-1 text-[#F0F6FC]">{total}</p>
          <p className="text-xs text-[#8B949E] mt-0.5">{actifs} actifs</p>
        </div>
        {['admin', 'hse', 'sst', 'direction', 'agent'].map(role => {
          const badge = ROLE_BADGE[role]
          return (
            <div key={role} className="bg-[#161B22] border border-[#30363D] rounded-xl p-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>{badge.label}</span>
              <p className="text-xl font-black font-mono mt-2 text-[#F0F6FC]">{parRole[role] ?? 0}</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        {utilisateurs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={36} className="text-[#30363D] mb-3" />
            <p className="text-[#8B949E] text-sm">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Téléphone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden lg:table-cell">Créé le</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {utilisateurs.map(u => {
                  const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.agent
                  const isMe = u.id === currentUserId
                  return (
                    <tr
                      key={u.id}
                      onClick={() => router.push(`/utilisateurs/${u.id}`)}
                      className={`cursor-pointer hover:bg-[#21262D] transition-colors group ${isMe ? 'bg-[#F59E0B]/5' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#8B949E]">
                              {u.prenom?.[0]}{u.nom?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[#F0F6FC] group-hover:text-[#F59E0B] transition-colors">{u.prenom} {u.nom}</p>
                            {isMe && <p className="text-xs text-[#F59E0B]">Vous</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-[#8B949E]">{u.email}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-xs text-[#8B949E]">{u.telephone ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`text-xs px-2 py-1 rounded-full border font-medium w-fit ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {u.role === 'agent' && u.service && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold w-fit tracking-wide ${
                              u.service === '3st'
                                ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                            }`}>
                              {u.service === '3st' ? '3ST' : 'SST/HSE'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-[#8B949E]">
                        {u.created_at ? fmt(u.created_at) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {isMe ? (
                          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                            bg-green-500/10 border border-green-500/20 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Actif
                          </span>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); toggleActif(u.id, u.actif) }}
                            title={u.actif ? 'Désactiver ce compte' : 'Activer ce compte'}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium
                              cursor-pointer active:scale-[0.96] transition-all duration-150
                              ${u.actif
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-orange-500/15 hover:border-orange-500/40 hover:text-orange-300 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.2)]'
                                : 'bg-[#21262D] text-[#8B949E] border-[#30363D] hover:bg-green-500/15 hover:border-green-500/40 hover:text-green-300 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.2)]'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full transition-colors
                              ${u.actif ? 'bg-green-400' : 'bg-[#8B949E]'}`} />
                            {u.actif ? 'Actif' : 'Inactif'}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs text-[#8B949E] group-hover:text-[#F59E0B] transition-colors">
                          →
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
