'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, X, Check, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { toastSuccess, toastError } from '@/lib/toast'

const PAGE_SIZE = 15

interface Entreprise {
  id: string
  nom: string
  type: string
  contact_nom: string | null
  contact_tel: string | null
  contact_email: string | null
  actif: boolean
  conducteurs: { id: string }[]
}

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

const EMPTY_FORM = { nom: '', type: 'sous_traitant', contact_nom: '', contact_tel: '', contact_email: '' }

const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
  placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 transition-colors`

export default function EntreprisesClient({ entreprises: initial, canCreate = false }: { entreprises: Entreprise[], canCreate?: boolean }) {
  const router = useRouter()

  const [entreprises, setEntreprises] = useState(initial)
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [createForm,  setCreateForm]  = useState(EMPTY_FORM)
  const [createErr,   setCreateErr]   = useState('')

  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState<string>('tous')
  const [filterActif, setFilterActif] = useState<string>('tous')
  const [page,        setPage]        = useState(1)

  function setC(k: string, v: string) { setCreateForm(f => ({ ...f, [k]: v })) }

  function updateSearch(v: string)      { setSearch(v);      setPage(1) }
  function updateFilterType(v: string)  { setFilterType(v);  setPage(1) }
  function updateFilterActif(v: string) { setFilterActif(v); setPage(1) }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateErr('')
    if (!createForm.nom.trim()) { setCreateErr("Renseignez le nom de l'entreprise"); return }

    setCreating(true)
    const res = await fetch('/api/entreprises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:           createForm.nom.trim(),
        type:          createForm.type,
        contact_nom:   createForm.contact_nom  || null,
        contact_tel:   createForm.contact_tel  || null,
        contact_email: createForm.contact_email || null,
      }),
    })

    setCreating(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toastError.erreurServeur()
      setCreateErr(d.error ?? 'Erreur serveur')
      return
    }

    const data = await res.json()
    toastSuccess.entrepriseCreee(createForm.nom.trim())
    setEntreprises(prev => [...prev, data as Entreprise].sort((a, b) => a.nom.localeCompare(b.nom)))
    setCreateForm(EMPTY_FORM)
    setShowCreate(false)
  }

  async function handleToggle(id: string, actif: boolean, e: React.MouseEvent) {
    e.stopPropagation()
    const res = await fetch(`/api/entreprises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    if (res.ok) {
      const nom = entreprises.find(ent => ent.id === id)?.nom ?? ''
      if (!actif) toastSuccess.entrepriseActivee(nom)
      else toastSuccess.entrepriseDesactivee(nom)
      setEntreprises(prev => prev.map(ent => ent.id === id ? { ...ent, actif: !actif } : ent))
    } else {
      toastError.erreurServeur()
    }
  }

  // Filtrage
  const filtered = entreprises.filter(e => {
    if (search && !e.nom.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType  !== 'tous' && e.type !== filterType)           return false
    if (filterActif === 'actif'   && !e.actif)                     return false
    if (filterActif === 'inactif' &&  e.actif)                     return false
    return true
  })

  const total      = entreprises.length
  const actifs     = entreprises.filter(e => e.actif).length
  const nbCond     = entreprises.reduce((s, e) => s + (e.conducteurs?.length ?? 0), 0)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F6FC]">Entreprises</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} entreprise{total !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setShowCreate(v => !v); setCreateErr('') }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
              hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            {showCreate ? <X size={15} /> : <Plus size={15} />}
            {showCreate ? 'Annuler' : 'Nouvelle entreprise'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',        val: total },
          { label: 'Actives',      val: actifs },
          { label: 'Conducteurs',  val: nbCond },
        ].map(s => (
          <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
            <p className="text-xs text-[#8B949E]">{s.label}</p>
            <p className="text-2xl font-black font-mono mt-1 text-[#F0F6FC]">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <form onSubmit={handleCreate}
          className="bg-[#161B22] border border-[#F59E0B]/20 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-[#F0F6FC]">Nouvelle entreprise</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Nom *</label>
              <input value={createForm.nom} onChange={e => setC('nom', e.target.value)}
                required placeholder="Nom de l'entreprise" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Type *</label>
              <select value={createForm.type} onChange={e => setC('type', e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="sous_traitant">Sous-traitant</option>
                <option value="partenaire">Partenaire</option>
                <option value="interne">Interne</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Nom du contact</label>
              <input value={createForm.contact_nom} onChange={e => setC('contact_nom', e.target.value)}
                placeholder="Optionnel" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Téléphone</label>
              <input value={createForm.contact_tel} onChange={e => setC('contact_tel', e.target.value)}
                placeholder="Optionnel" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">Email</label>
              <input type="email" value={createForm.contact_email}
                onChange={e => setC('contact_email', e.target.value)}
                placeholder="Optionnel" className={inputCls} />
            </div>
          </div>

          {createErr && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle size={14} /> {createErr}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg hover:text-[#F0F6FC] transition-colors cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer">
              {creating ? <Spinner size="sm" /> : <Check size={14} />}
              {creating ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            value={search}
            onChange={e => updateSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-8 pr-3 py-2 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
              placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] transition-colors"
          />
        </div>
        <select value={filterType} onChange={e => updateFilterType(e.target.value)}
          className="px-3 py-2 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#8B949E] focus:outline-none focus:border-[#F59E0B] cursor-pointer">
          <option value="tous">Tous types</option>
          <option value="sous_traitant">Sous-traitant</option>
          <option value="partenaire">Partenaire</option>
          <option value="interne">Interne</option>
        </select>
        <select value={filterActif} onChange={e => updateFilterActif(e.target.value)}
          className="px-3 py-2 bg-[#161B22] border border-[#30363D] rounded-lg text-sm text-[#8B949E] focus:outline-none focus:border-[#F59E0B] cursor-pointer">
          <option value="tous">Tous statuts</option>
          <option value="actif">Actives</option>
          <option value="inactif">Inactives</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={36} className="text-[#30363D] mb-3" />
            <p className="text-[#8B949E] text-sm">
              {entreprises.length === 0
                ? 'Aucune entreprise enregistrée'
                : 'Aucune entreprise ne correspond aux filtres'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Entreprise</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Conducteurs</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {pageRows.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => router.push(`/entreprises/${e.id}`)}
                    className="hover:bg-[#21262D] transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#F0F6FC]">{e.nom}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${TYPE_CLS[e.type] ?? ''}`}>
                        {TYPE_LABEL[e.type] ?? e.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-xs text-[#8B949E]">
                      {e.contact_nom ?? '—'}
                      {e.contact_tel && <span className="ml-2">{e.contact_tel}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-[#F0F6FC]">
                      {e.conducteurs?.length ?? 0}
                    </td>
                    <td className="px-5 py-3.5" onClick={ev => ev.stopPropagation()}>
                      <button
                        onClick={ev => handleToggle(e.id, e.actif, ev)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer
                          ${e.actif
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${e.actif ? 'bg-green-400' : 'bg-gray-500'}`} />
                        {e.actif ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5" onClick={ev => ev.stopPropagation()}>
                      <Link
                        href={`/entreprises/${e.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                          text-[#F59E0B] border border-[#F59E0B]/20 bg-[#F59E0B]/5
                          hover:bg-[#F59E0B]/15 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]
                          hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
                          active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#30363D] bg-[#0D1117]">
            <p className="text-xs text-[#8B949E]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((n, i) =>
                  n === '…' ? (
                    <span key={`sep-${i}`} className="px-1 text-[#8B949E] text-xs">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`min-w-[28px] h-7 text-xs font-medium rounded-lg transition-colors cursor-pointer
                        ${page === n
                          ? 'bg-[#F59E0B] text-[#0D1117] font-bold'
                          : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]'
                        }`}
                    >
                      {n}
                    </button>
                  )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
