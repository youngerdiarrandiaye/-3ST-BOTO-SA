'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Image, Trash2, Download, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

const TYPES_DOCUMENT: { value: string; label: string }[] = [
  { value: 'photo_permis',         label: 'Photo du permis' },
  { value: 'copie_permis_pdf',     label: 'Copie permis (PDF)' },
  { value: 'attestation_medicale', label: 'Attestation médicale' },
  { value: 'autre_document',       label: 'Autre document' },
]

interface Document {
  id: string
  type_document: string
  nom_fichier: string
  taille_bytes: number | null
  created_at: string
}

function formatBytes(n: number | null) {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function typeLabel(value: string) {
  return TYPES_DOCUMENT.find(t => t.value === value)?.label ?? value
}

export default function OngletDocuments({
  conducteurId,
  canWrite,
}: {
  conducteurId: string
  canWrite: boolean
}) {
  const [docs,       setDocs]       = useState<Document[]>([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [typeDoc,    setTypeDoc]    = useState(TYPES_DOCUMENT[0].value)
  const [dragging,   setDragging]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/conducteurs/${conducteurId}/documents`)
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [conducteurId])

  async function uploadFile(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('type_document', typeDoc)
    const res = await fetch(`/api/conducteurs/${conducteurId}/documents`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      const msg: string = data.error ?? ''
      if (/trop (lourd|grand)|taille|size/i.test(msg)) toastError.fichierTropLourd('10 MB')
      else if (/format|type|mime/i.test(msg)) toastError.formatNonAccepte('JPG, PNG, PDF')
      else toastError.erreurServeur()
    } else {
      toastSuccess.documentUploade(typeLabel(typeDoc))
      load()
    }
    setUploading(false)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) uploadFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) uploadFile(f)
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Supprimer ce document ?')) return
    setDeleting(docId)
    const res = await fetch(`/api/conducteurs/${conducteurId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    })
    setDeleting(null)
    if (res.ok) toastSuccess.sauvegarde()
    else toastError.erreurServeur()
    load()
  }

  async function download(docId: string, nom: string) {
    const res = await fetch(`/api/conducteurs/${conducteurId}/documents/${docId}/signed-url`)
    if (!res.ok) return
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url; a.download = nom; a.click()
  }

  const inputCls = `w-full px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
    focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 transition-colors cursor-pointer`

  return (
    <div className="space-y-4">

      {canWrite && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select value={typeDoc} onChange={e => setTypeDoc(e.target.value)} className={inputCls}>
              {TYPES_DOCUMENT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#F59E0B] text-[#0D1117] text-sm font-semibold
                rounded-lg hover:bg-[#D97706] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Envoi…' : 'Choisir'}
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${dragging
                ? 'border-[#F59E0B] bg-[#F59E0B]/5'
                : 'border-[#30363D] hover:border-[#F59E0B]/40 hover:bg-[#161B22]'}`}
          >
            <Upload size={20} className="mx-auto mb-2 text-[#8B949E]" />
            <p className="text-sm text-[#8B949E]">Glisser-déposer un fichier ici</p>
            <p className="text-xs text-[#8B949E]/60 mt-1">PDF ou image • max 10 MB</p>
          </div>

          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={onFileInput} className="hidden" />

        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-[#8B949E]" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-10 text-[#8B949E] text-sm">
          Aucun document enregistré
        </div>
      ) : (
        <div className="divide-y divide-[#30363D]">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0 w-9 h-9 bg-[#0D1117] rounded-lg flex items-center justify-center">
                {doc.nom_fichier.endsWith('.pdf')
                  ? <FileText size={16} className="text-red-400" />
                  : <Image size={16} className="text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F0F6FC] truncate">{doc.nom_fichier}</p>
                <p className="text-xs text-[#8B949E]">
                  {typeLabel(doc.type_document)} · {formatBytes(doc.taille_bytes)} ·{' '}
                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => download(doc.id, doc.nom_fichier)}
                  className="p-2 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer"
                  title="Télécharger"
                >
                  <Download size={14} />
                </button>
                {canWrite && (
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-2 text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleting === doc.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
