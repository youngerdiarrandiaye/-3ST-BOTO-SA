'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Power, X, Check, AlertTriangle } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

interface Props {
  id: string
  nom: string
  type: string
  actif: boolean
  contact_nom: string | null
  contact_tel: string | null
  contact_email: string | null
  nbConducteurs: number
  isAdmin: boolean
}

const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 transition-colors`

export default function EntrepriseDetailClient({
  id, nom, type, actif, contact_nom, contact_tel, contact_email, nbConducteurs, isAdmin,
}: Props) {
  const router = useRouter()

  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toggling,   setToggling]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState('')

  const [form, setForm] = useState({
    nom:           nom,
    type:          type,
    contact_nom:   contact_nom   ?? '',
    contact_tel:   contact_tel   ?? '',
    contact_email: contact_email ?? '',
  })

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleToggleActif() {
    setToggling(true)
    setError('')
    const res = await fetch(`/api/entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur serveur')
    } else {
      router.refresh()
    }
    setToggling(false)
  }

  async function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!form.nom.trim()) { setError('Le nom est requis'); return }
    setSaving(true)
    const res = await fetch(`/api/entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:           form.nom.trim(),
        type:          form.type,
        contact_nom:   form.contact_nom.trim()   || null,
        contact_tel:   form.contact_tel.trim()   || null,
        contact_email: form.contact_email.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur serveur')
      return
    }
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/entreprises/${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Suppression impossible')
      setDeleteOpen(false)
      return
    }
    router.push('/entreprises')
    router.refresh()
  }

  const canDelete = isAdmin && nbConducteurs === 0

  return (
    <>
      {/* Barre d'actions */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Modifier */}
        <button
          onClick={() => { setEditOpen(true); setError('') }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium
            text-[#8B949E] bg-[#161B22] border border-[#30363D] rounded-lg cursor-pointer
            hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#F59E0B]/40 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15)]
            active:scale-[0.97] transition-all duration-150"
        >
          <Pencil size={13} /> Modifier
        </button>

        {/* Activer / Désactiver */}
        <button
          onClick={handleToggleActif}
          disabled={toggling}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border rounded-lg cursor-pointer
            active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
            ${actif
              ? 'text-orange-400 bg-[#161B22] border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/50 hover:text-orange-300 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.2)]'
              : 'text-green-400 bg-[#161B22] border-green-500/20 hover:bg-green-500/15 hover:border-green-500/50 hover:text-green-300 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.2)]'
            }`}
        >
          {toggling ? <Spinner size="sm" /> : <Power size={13} />}
          {actif ? 'Désactiver' : 'Activer'}
        </button>

        {/* Supprimer */}
        {isAdmin && (
          <button
            onClick={() => canDelete ? setDeleteOpen(true) : undefined}
            disabled={!canDelete}
            title={!canDelete
              ? `${nbConducteurs} conducteur(s) rattaché(s) — retirez-les d'abord`
              : 'Supprimer cette entreprise'}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border rounded-lg transition-all duration-150
              ${canDelete
                ? 'text-red-400 bg-[#161B22] border-red-500/20 cursor-pointer hover:bg-red-500 hover:border-red-500 hover:text-white hover:shadow-[0_0_0_2px_rgba(239,68,68,0.25)] active:scale-[0.97]'
                : 'text-[#30363D] bg-[#0D1117] border-[#21262D] cursor-not-allowed opacity-50'
              }`}
          >
            <Trash2 size={13} />
            {canDelete && <span>Supprimer</span>}
          </button>
        )}
      </div>

      {/* Erreur globale */}
      {error && !editOpen && !deleteOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
          bg-red-500/10 border border-red-500/20 text-red-400 text-sm shadow-xl">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError('')} className="cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Modal édition */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D]">
              <p className="text-base font-semibold text-[#F0F6FC]">Modifier l&apos;entreprise</p>
              <button onClick={() => setEditOpen(false)} className="text-[#8B949E] hover:text-[#F0F6FC] transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Nom *</label>
                  <input value={form.nom} onChange={e => setF('nom', e.target.value)}
                    required placeholder="Nom de l'entreprise" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setF('type', e.target.value)} className={`${inputCls} cursor-pointer`}>
                    <option value="sous_traitant">Sous-traitant</option>
                    <option value="partenaire">Partenaire</option>
                    <option value="interne">Interne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Nom du contact</label>
                  <input value={form.contact_nom} onChange={e => setF('contact_nom', e.target.value)}
                    placeholder="Optionnel" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Téléphone</label>
                  <input value={form.contact_tel} onChange={e => setF('contact_tel', e.target.value)}
                    placeholder="Optionnel" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setF('contact_email', e.target.value)}
                    placeholder="Optionnel" className={inputCls} />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] transition-colors cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
                    hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer">
                  {saving ? <Spinner size="sm" /> : <Check size={14} />}
                  {saving ? 'Enregistrement…' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#F0F6FC]">Supprimer l&apos;entreprise</p>
                <p className="text-sm text-[#8B949E] mt-1">
                  <strong className="text-[#F0F6FC]">{nom}</strong> sera supprimée définitivement. Cette action est irréversible.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setDeleteOpen(false); setError('') }}
                className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] transition-colors cursor-pointer">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg
                  hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer">
                {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
