'use client'

import { useState } from 'react'
import { Plus, X, Check, Eye, EyeOff, HardHat, ShieldCheck } from 'lucide-react'

interface Utilisateur {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  telephone: string | null
  actif: boolean
  service?: '3st' | 'sst_hse' | null
}

const ROLES = [
  { val: 'hse',       label: 'HSE',              desc: 'Hygiène Sécurité Environnement' },
  { val: 'sst',       label: 'SST',              desc: 'Santé Sécurité au Travail' },
  { val: 'direction', label: 'Direction',        desc: 'Consultation et rapports' },
  { val: 'agent',     label: 'Agent terrain',    desc: 'Déclaration infractions' },
  { val: 'admin',     label: 'Administrateur',   desc: 'Accès total' },
]

interface Props {
  onCreated: (user: Utilisateur) => void
}

export default function CreateUserForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '', role: 'hse', telephone: '',
    service: '3st' as '3st' | 'sst_hse',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Mot de passe minimum 8 caractères'); return }

    setLoading(true)
    const payload = {
      ...form,
      service: form.role === 'agent' ? form.service : null,
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur serveur'); setLoading(false); return }

    onCreated({
      id:        data.userId,
      email:     form.email,
      nom:       form.nom,
      prenom:    form.prenom,
      role:      form.role,
      telephone: form.telephone || null,
      actif:     true,
      service:   form.role === 'agent' ? form.service : null,
    })

    setForm({ email: '', password: '', nom: '', prenom: '', role: 'hse', telephone: '', service: '3st' })
    setOpen(false)
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
          hover:bg-[#E68A00] hover:shadow-[0_0_0_2px_rgba(245,158,11,0.3)]
          active:scale-[0.97] transition-all duration-150 cursor-pointer"
      >
        <Plus size={15} />
        Créer un utilisateur
      </button>
    )
  }

  return (
    <div className="bg-[#161B22] border border-[#F59E0B]/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#F0F6FC]">Nouvel utilisateur</p>
        <button onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] active:scale-[0.95] transition-all duration-150 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">Prénom *</label>
            <input value={form.prenom} onChange={e => set('prenom', e.target.value)} required placeholder="Prénom"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">Nom *</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)} required placeholder="Nom"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="email@example.com"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">Téléphone</label>
            <input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+221 77 000 00 00"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]" />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-xs font-medium text-[#8B949E] mb-1">Mot de passe * (min. 8 caractères)</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              minLength={8}
              placeholder="Mot de passe temporaire"
              className="w-full px-3 py-2 pr-10 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#8B949E]
              hover:text-[#F0F6FC] hover:bg-[#21262D] transition-all duration-150 cursor-pointer"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Rôle */}
        <div>
          <label className="block text-xs font-medium text-[#8B949E] mb-2">Rôle *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button
                key={r.val}
                type="button"
                onClick={() => set('role', r.val)}
                className={`p-3 rounded-lg border text-left active:scale-[0.98] transition-all duration-150 cursor-pointer
                  ${form.role === r.val
                    ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F0F6FC] shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:bg-[#21262D] hover:border-[#8B949E]/60 hover:text-[#F0F6FC]'
                  }`}
              >
                <p className="text-xs font-bold">{r.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Service — visible pour le rôle agent uniquement */}
        {form.role === 'agent' && (
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-2">
              Service d&apos;appartenance *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set('service', '3st')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer active:scale-[0.97]
                  ${form.service === '3st'
                    ? 'bg-[#F59E0B]/10 border-[#F59E0B]/60 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                    : 'bg-[#0D1117] border-[#30363D] hover:bg-[#21262D] hover:border-[#8B949E]/50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  form.service === '3st' ? 'bg-[#F59E0B]/20' : 'bg-[#21262D]'
                }`}>
                  <HardHat size={20} className={form.service === '3st' ? 'text-[#F59E0B]' : 'text-[#8B949E]'} />
                </div>
                <div>
                  <p className={`text-xs font-black tracking-wider ${form.service === '3st' ? 'text-[#F59E0B]' : 'text-[#8B949E]'}`}>
                    3ST
                  </p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${form.service === '3st' ? 'text-[#F0F6FC]/70' : 'text-[#8B949E]/50'}`}>
                    Opérations site minier
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => set('service', 'sst_hse')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer active:scale-[0.97]
                  ${form.service === 'sst_hse'
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_16px_rgba(59,130,246,0.15)]'
                    : 'bg-[#0D1117] border-[#30363D] hover:bg-[#21262D] hover:border-[#8B949E]/50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  form.service === 'sst_hse' ? 'bg-blue-500/20' : 'bg-[#21262D]'
                }`}>
                  <ShieldCheck size={20} className={form.service === 'sst_hse' ? 'text-blue-400' : 'text-[#8B949E]'} />
                </div>
                <div>
                  <p className={`text-xs font-black tracking-wider ${form.service === 'sst_hse' ? 'text-blue-400' : 'text-[#8B949E]'}`}>
                    SST/HSE
                  </p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${form.service === 'sst_hse' ? 'text-[#F0F6FC]/70' : 'text-[#8B949E]/50'}`}>
                    Santé Sécurité Environnement
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-sm font-medium text-[#8B949E] border border-[#30363D] rounded-lg
              hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#8B949E]/50
              active:scale-[0.97] transition-all duration-150 cursor-pointer">
            Annuler
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
              hover:bg-[#E68A00] hover:shadow-[0_0_0_2px_rgba(245,158,11,0.3)]
              active:scale-[0.97] disabled:opacity-50 transition-all duration-150 cursor-pointer">
            <Check size={14} />
            {loading ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  )
}
