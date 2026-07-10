'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError } from '@/lib/toast'

const passwordSchema = z.object({
  ancien_mdp:   z.string().min(1, 'Ancien mot de passe requis'),
  nouveau_mdp:  z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins 1 majuscule')
    .regex(/[0-9]/, 'Au moins 1 chiffre'),
  confirmer_mdp: z.string(),
}).refine(d => d.nouveau_mdp === d.confirmer_mdp, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmer_mdp'],
}).refine(d => d.ancien_mdp !== d.nouveau_mdp, {
  message: 'Le nouveau mot de passe doit être différent',
  path: ['nouveau_mdp'],
})

type FormData = z.infer<typeof passwordSchema>

function force(mdp: string) {
  if (!mdp) return { score: 0, label: '', color: '' }
  let score = 0
  if (mdp.length >= 8)  score++
  if (mdp.length >= 12) score++
  if (/[A-Z]/.test(mdp)) score++
  if (/[0-9]/.test(mdp)) score++
  if (/[^A-Za-z0-9]/.test(mdp)) score++
  if (score <= 2) return { score, label: 'Faible',  color: 'bg-red-500' }
  if (score <= 3) return { score, label: 'Moyen',   color: 'bg-amber-500' }
  return          { score, label: 'Fort',   color: 'bg-green-500' }
}

export default function ChangePasswordForm({ email }: { email: string }) {
  const router = useRouter()
  const [showAncien,    setShowAncien]    = useState(false)
  const [showNouveau,   setShowNouveau]   = useState(false)
  const [showConfirmer, setShowConfirmer] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
  })

  const nouveauMdp = watch('nouveau_mdp') ?? ''
  const forceScore = force(nouveauMdp)

  async function onSubmit(data: FormData) {
    const supabase = createClient()

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: data.ancien_mdp,
    })
    if (signInErr) {
      toastError.ancienMotDePasseIncorrect()
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: data.nouveau_mdp })
    if (updateErr) {
      toastError.erreurServeur()
      return
    }

    toastSuccess.motDePasseModifie()
    setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }, 2000)
  }

  const inputCls = (err?: { message?: string }) =>
    `w-full px-4 py-3 min-h-[44px] bg-[#0D1117] border rounded-lg text-sm text-[#F0F6FC]
    placeholder-[#8B949E] focus:outline-none transition-colors pr-12
    ${err
      ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-[#30363D] focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20'}`

  const labelCls = 'block text-sm font-medium text-[#8B949E] mb-1.5'
  const errCls   = 'mt-1 text-xs text-red-400 flex items-center gap-1'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-5"
      noValidate
    >
      {/* Ancien mot de passe */}
      <div>
        <label className={labelCls}>Ancien mot de passe *</label>
        <div className="relative">
          <input
            {...register('ancien_mdp')}
            type={showAncien ? 'text' : 'password'}
            placeholder="Votre mot de passe actuel"
            className={inputCls(errors.ancien_mdp)}
          />
          <button
            type="button"
            onClick={() => setShowAncien(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
          >
            {showAncien ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.ancien_mdp && <p className={errCls}>⚠ {errors.ancien_mdp.message}</p>}
      </div>

      {/* Nouveau mot de passe */}
      <div>
        <label className={labelCls}>Nouveau mot de passe *</label>
        <div className="relative">
          <input
            {...register('nouveau_mdp')}
            type={showNouveau ? 'text' : 'password'}
            placeholder="Min 8 car., 1 majuscule, 1 chiffre"
            className={inputCls(errors.nouveau_mdp)}
          />
          <button
            type="button"
            onClick={() => setShowNouveau(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
          >
            {showNouveau ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {/* Indicateur de force */}
        {nouveauMdp.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 bg-[#30363D] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${forceScore.color}`}
                style={{ width: `${(forceScore.score / 5) * 100}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${
              forceScore.score <= 2 ? 'text-red-400'
              : forceScore.score <= 3 ? 'text-amber-400'
              : 'text-green-400'
            }`}>
              Sécurité : {forceScore.label}
            </p>
          </div>
        )}
        {errors.nouveau_mdp && <p className={errCls}>⚠ {errors.nouveau_mdp.message}</p>}
      </div>

      {/* Confirmation */}
      <div>
        <label className={labelCls}>Confirmer le nouveau mot de passe *</label>
        <div className="relative">
          <input
            {...register('confirmer_mdp')}
            type={showConfirmer ? 'text' : 'password'}
            placeholder="Répétez le nouveau mot de passe"
            className={inputCls(errors.confirmer_mdp)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmer(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
          >
            {showConfirmer ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmer_mdp && <p className={errCls}>⚠ {errors.confirmer_mdp.message}</p>}
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] bg-[#F59E0B] text-[#0D1117] font-semibold rounded-lg
          hover:bg-[#D97706] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Lock size={16} />
        {isSubmitting ? 'Modification en cours…' : 'Modifier le mot de passe'}
      </button>

      <p className="text-xs text-center text-[#8B949E]">
        Vous serez automatiquement déconnecté après le changement.
      </p>
    </form>
  )
}
