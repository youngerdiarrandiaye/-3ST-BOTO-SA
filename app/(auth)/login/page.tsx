'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Identifiants incorrects. Contactez votre administrateur.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F59E0B] mb-4">
            <span className="text-lg font-black text-[#0D1117] leading-none">M</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">MineAxis</h1>
          <p className="text-[#F59E0B] text-xs font-bold tracking-widest uppercase mt-0.5">MANAGEM | 3ST</p>
          <p className="text-[#8B949E] text-sm mt-1">Gestion des autorisations de conduite</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@3st.com"
              className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#30363D] text-[#F0F6FC] placeholder-[#8B949E] text-base
                focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20
                transition-colors duration-150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-[#161B22] border border-[#30363D] text-[#F0F6FC] placeholder-[#8B949E] text-base
                focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20
                transition-colors duration-150"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#F59E0B] text-[#0D1117] font-semibold text-base
              hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150
              disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
              mt-2"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)' }}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /><span>Connexion…</span></span>
              : 'Se connecter'
            }
          </button>
        </form>

        <p className="text-center text-xs text-[#8B949E] mt-8">
          Accès restreint — MineAxis MANAGEM | 3ST<br />
          Réinitialisation par administrateur uniquement
        </p>
      </div>
    </div>
  )
}
