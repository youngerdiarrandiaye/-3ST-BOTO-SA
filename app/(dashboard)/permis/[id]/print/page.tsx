import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { encodeQR } from '@/lib/qrcode'
import PrintTrigger from './PrintTrigger'
import PrintToolbar from './PrintToolbar'

interface PageProps {
  params: Promise<{ id: string }>
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const ZONE_LABEL: Record<string, string> = {
  miniere:        'Zone minière',
  administrative: 'Zone administrative',
  les_deux:       'Toutes les zones',
}

export default async function PrintPermisPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'hse', 'sst'].includes(me.role)) redirect('/permis')

  const { data: permis } = await supabase
    .from('permis_internes')
    .select('*, conducteurs(nom, prenom, matricule, fonction, entreprises(nom))')
    .eq('id', id)
    .single()

  if (!permis) notFound()

  const c = permis.conducteurs as any
  const matrix = encodeQR(permis.numero)
  const n = matrix ? matrix.length : 0
  const quiet = 2
  const total = n + quiet * 2

  const isExpire = new Date(permis.date_expiration) < new Date()

  return (
    <>
      <PrintTrigger />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 10mm;
          }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 2px solid #000 !important; }
        }
        @media screen {
          body { background: #0D1117; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <PrintToolbar numero={permis.numero} />

      {/* Print card */}
      <div className="no-print pt-16" />
      <div className="flex items-center justify-center min-h-screen p-8 print:p-0 print:block print:min-h-0">
        <div className="card bg-white text-[#0D1117] w-full max-w-[720px] rounded-2xl shadow-2xl overflow-hidden
          print:rounded-none print:max-w-full print:w-full">

          {/* Header band */}
          <div style={{ background: '#0D1117' }} className="px-8 py-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div style={{ background: '#F59E0B', color: '#0D1117' }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm">
                  MA
                </div>
                <div>
                  <p style={{ color: '#F59E0B' }} className="text-xs font-bold uppercase tracking-widest">
                    Site Minier
                  </p>
                  <p style={{ color: '#F0F6FC' }} className="font-black text-lg leading-tight">
                    PERMIS INTERNE DE CONDUITE
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p style={{ color: '#8B949E' }} className="text-xs uppercase tracking-wider">Statut</p>
              <p style={{ color: isExpire ? '#EF4444' : permis.statut === 'valide' ? '#10B981' : '#F59E0B' }}
                className="font-bold text-sm mt-0.5">
                {isExpire ? 'EXPIRÉ' : permis.statut.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="flex gap-8">

              {/* Left — Info */}
              <div className="flex-1 space-y-6">

                {/* Conducteur */}
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] mb-3 pb-1.5
                    border-b border-[#E5E7EB]">
                    Conducteur
                  </p>
                  <p className="text-2xl font-black tracking-tight text-[#0D1117]">
                    {c?.prenom} {c?.nom?.toUpperCase()}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B7280] w-20">Matricule</span>
                      <span className="font-mono font-bold text-sm bg-[#F3F4F6] px-2 py-0.5 rounded">
                        {c?.matricule}
                      </span>
                    </div>
                    {c?.fonction && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B7280] w-20">Fonction</span>
                        <span className="text-sm text-[#374151]">{c.fonction}</span>
                      </div>
                    )}
                    {c?.entreprises?.nom && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B7280] w-20">Entreprise</span>
                        <span className="text-sm text-[#374151]">{c.entreprises.nom}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Autorisation */}
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] mb-3 pb-1.5
                    border-b border-[#E5E7EB]">
                    Autorisation
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5 border border-[#E5E7EB]">
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wide mb-1">Catégories</p>
                      <div className="flex gap-1 flex-wrap">
                        {permis.categories.map((cat: string) => (
                          <span key={cat} className="font-bold text-sm bg-[#0D1117] text-white px-2 py-0.5 rounded">
                            {cat}
                          </span>
                        ))}
                        {permis.categories.length === 0 && <span className="text-sm text-[#9CA3AF]">—</span>}
                      </div>
                    </div>
                    <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5 border border-[#E5E7EB]">
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wide mb-1">Zone</p>
                      <p className="text-sm font-semibold text-[#0D1117]">
                        {ZONE_LABEL[permis.zone_validite ?? ''] ?? '—'}
                      </p>
                    </div>
                    {permis.type_permis_site && (
                      <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5 border border-[#E5E7EB] col-span-2">
                        <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wide mb-1">Type</p>
                        <p className="text-sm font-semibold text-[#0D1117]">{permis.type_permis_site}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Validité */}
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] mb-3 pb-1.5
                    border-b border-[#E5E7EB]">
                    Validité
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5 border border-[#E5E7EB]">
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wide mb-1">Délivré le</p>
                      <p className="text-sm font-semibold text-[#0D1117]">{fmt(permis.date_delivrance)}</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2.5 border ${
                      isExpire
                        ? 'bg-red-50 border-red-200'
                        : 'bg-[#F9FAFB] border-[#E5E7EB]'
                    }`}>
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wide mb-1">Expire le</p>
                      <p className={`text-sm font-bold ${isExpire ? 'text-red-600' : 'text-[#0D1117]'}`}>
                        {fmt(permis.date_expiration)}
                        {isExpire && ' ⚠'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Habilitations */}
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B949E] mb-3 pb-1.5
                    border-b border-[#E5E7EB]">
                    Habilitations
                  </p>
                  <div className="flex gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
                      permis.validation_sst
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {permis.validation_sst ? '✓' : '✗'} SST
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
                      permis.validation_clinique
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {permis.validation_clinique ? '✓' : '✗'} Visite médicale
                    </div>
                  </div>
                </section>
              </div>

              {/* Right — QR Code */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="border-2 border-[#0D1117] rounded-xl p-3 bg-white">
                  {matrix ? (
                    <svg
                      width={160}
                      height={160}
                      viewBox={`0 0 ${total} ${total}`}
                      xmlns="http://www.w3.org/2000/svg"
                      shapeRendering="crispEdges"
                    >
                      <rect width={total} height={total} fill="white" />
                      {matrix.map((row, r) =>
                        row.map((dark, c2) =>
                          dark ? (
                            <rect key={`${r}-${c2}`} x={c2 + quiet} y={r + quiet} width={1} height={1} fill="black" />
                          ) : null
                        )
                      )}
                    </svg>
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-[#9CA3AF] text-xs">
                      QR indisponible
                    </div>
                  )}
                </div>
                <p className="font-mono text-xs font-bold text-[#0D1117] text-center leading-tight">
                  {permis.numero}
                </p>
                <p className="text-[10px] text-[#6B7280] text-center">
                  Scanner pour vérifier
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}
            className="px-8 py-4 flex items-center justify-between">
            <p className="text-xs text-[#6B7280]">
              Ce permis est délivré par le service HSE — MineAxis MANAGEM | 3ST.
              Il doit être présenté sur demande des agents de sécurité.
            </p>
            <div className="text-right flex-shrink-0 ml-6">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">Signature / Cachet</p>
              <div className="mt-4 w-24 border-b border-[#9CA3AF]" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
