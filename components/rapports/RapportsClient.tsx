'use client'

import { useState } from 'react'
import { FileText, Download, Filter, Printer, CalendarDays } from 'lucide-react'
import { GRAVITE_LABEL, GRAVITE_BADGE_CLS } from '@/lib/gravite'
import { STATUT_INF_LABEL, STATUT_CONDUCTEUR_LABEL, STATUT_FORMATION_LABEL, STATUT_PERMIS_LABEL, TYPE_SANCTION_LABEL } from '@/lib/labels'

type Rapport = 'conducteurs' | 'infractions' | 'permis_expirants' | 'formations' | 'sanctions'

const RAPPORTS: { id: Rapport; label: string; desc: string }[] = [
  { id: 'conducteurs',    label: 'Liste des conducteurs',   desc: 'Tous les conducteurs avec statut et capital points' },
  { id: 'infractions',   label: 'Registre des infractions', desc: 'Toutes les infractions déclarées avec gravité et statut' },
  { id: 'permis_expirants', label: 'Permis expirant bientôt', desc: 'Permis à renouveler dans les 60 prochains jours' },
  { id: 'formations',    label: 'Historique des formations', desc: 'Formations et points récupérés par conducteur' },
  { id: 'sanctions',     label: 'Registre des sanctions',   desc: 'Suspensions et retraits de permis' },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(escapeCSV).join(',')).join('\n')
  const bom = '﻿'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  conducteurs: any[]
  infractions: any[]
  permis: any[]
  formations: any[]
  sanctions: any[]
}

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function RapportsClient({ conducteurs, infractions, permis, formations, sanctions }: Props) {
  const [selected, setSelected] = useState<Rapport>('conducteurs')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const now = new Date()
  const [moisRapport, setMoisRapport] = useState(now.getMonth())
  const [anneeRapport, setAnneeRapport] = useState(now.getFullYear())

  function handleRapportMensuel() {
    const moisLabel = MOIS_LABELS[moisRapport]
    const debut = new Date(anneeRapport, moisRapport, 1)
    const fin   = new Date(anneeRapport, moisRapport + 1, 0, 23, 59, 59)

    const infMois = infractions.filter(i => {
      const d = new Date(i.date_heure)
      return d >= debut && d <= fin
    })
    const formMois = formations.filter(f => {
      const d = new Date(f.date_debut)
      return d >= debut && d <= fin
    })
    const permisMois = permis.filter(p => {
      const d = new Date(p.date_delivrance)
      return d >= debut && d <= fin
    })
    const suspendus = conducteurs.filter(c => c.statut === 'suspendu')

    // Top 5 types d'infractions du mois
    const typeCount: Record<string, { libelle: string; gravite: string; count: number; pts: number }> = {}
    infMois.forEach((i: any) => {
      const t = i.types_infraction
      if (!t) return
      if (!typeCount[t.code]) typeCount[t.code] = { libelle: t.libelle, gravite: t.gravite, count: 0, pts: t.points_retires }
      typeCount[t.code].count++
    })
    const top5 = Object.values(typeCount).sort((a, b) => b.count - a.count).slice(0, 5)

    const gravColor = (g: string) => g === 'critique' ? '#EF4444' : g === 'majeure' ? '#F59E0B' : '#6B7280'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Rapport HSE — ${moisLabel} ${anneeRapport}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box }
    body { font-family:Arial,sans-serif; font-size:11px; color:#111; background:#fff; padding:24px }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111; padding-bottom:14px; margin-bottom:20px }
    .logo { font-size:22px; font-weight:900 } .logo span { color:#D97706 }
    .tagline { font-size:10px; color:#555; margin-top:3px }
    .meta { text-align:right; font-size:10px; color:#555 }
    .meta strong { display:block; font-size:14px; color:#111; font-weight:700 }
    h2 { font-size:13px; font-weight:700; color:#111; border-left:4px solid #D97706; padding-left:10px; margin:20px 0 10px }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:4px }
    .kpi { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px 14px }
    .kpi-val { font-size:24px; font-weight:900; color:#111 }
    .kpi-label { font-size:10px; color:#555; margin-top:4px }
    .kpi-red .kpi-val { color:#EF4444 } .kpi-amber .kpi-val { color:#D97706 } .kpi-green .kpi-val { color:#059669 }
    table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:4px }
    th { background:#1A1A1A; color:#fff; text-align:left; padding:5px 8px; font-size:9px; text-transform:uppercase; letter-spacing:.05em }
    td { padding:4px 8px; border-bottom:1px solid #E5E7EB; vertical-align:top }
    tr:nth-child(even) td { background:#F9FAFB }
    .badge { display:inline-block; padding:1px 7px; border-radius:99px; font-size:9px; font-weight:700; border:1px solid }
    .footer { margin-top:20px; font-size:9px; color:#999; text-align:center; border-top:1px solid #E5E7EB; padding-top:10px }
    @media print { body { padding:12px } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Plateforme <span>3ST</span></div>
      <div class="tagline">HSE — Site minier · Rapport mensuel</div>
    </div>
    <div class="meta">
      <strong>${moisLabel} ${anneeRapport}</strong>
      <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div>Confidentiel</div>
    </div>
  </div>

  <h2>Statistiques du mois</h2>
  <div class="kpi-grid">
    <div class="kpi kpi-amber"><div class="kpi-val">${infMois.length}</div><div class="kpi-label">Infractions déclarées</div></div>
    <div class="kpi kpi-green"><div class="kpi-val">${permisMois.length}</div><div class="kpi-label">Permis délivrés</div></div>
    <div class="kpi kpi-green"><div class="kpi-val">${formMois.length}</div><div class="kpi-label">Formations engagées</div></div>
    <div class="kpi kpi-red"><div class="kpi-val">${suspendus.length}</div><div class="kpi-label">Conducteurs suspendus</div></div>
  </div>

  <h2>Top infractions du mois</h2>
  ${top5.length === 0 ? '<p style="color:#555;font-size:10px;padding:8px 0">Aucune infraction ce mois.</p>' : `
  <table>
    <thead><tr><th>Type d'infraction</th><th>Gravité</th><th>Occurrences</th><th>Points retirés</th></tr></thead>
    <tbody>${top5.map(t => `
      <tr>
        <td>${t.libelle}</td>
        <td><span style="color:${gravColor(t.gravite)};font-weight:700">${t.gravite.toUpperCase()}</span></td>
        <td style="font-weight:700;text-align:center">${t.count}</td>
        <td style="color:#EF4444;font-weight:700;text-align:center">−${t.pts} pts</td>
      </tr>`).join('')}
    </tbody>
  </table>`}

  <h2>Conducteurs suspendus</h2>
  ${suspendus.length === 0 ? '<p style="color:#059669;font-size:10px;padding:8px 0">Aucun conducteur suspendu.</p>' : `
  <table>
    <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Entreprise</th><th>Points</th></tr></thead>
    <tbody>${suspendus.map((c: any) => `
      <tr>
        <td style="font-family:monospace">${c.matricule}</td>
        <td style="font-weight:700">${c.nom}</td>
        <td>${c.prenom}</td>
        <td>${(c.entreprises as any)?.nom ?? '—'}</td>
        <td style="color:#EF4444;font-weight:700">${c.points_actuels}/20</td>
      </tr>`).join('')}
    </tbody>
  </table>`}

  <h2>Formations du mois</h2>
  ${formMois.length === 0 ? '<p style="color:#555;font-size:10px;padding:8px 0">Aucune formation ce mois.</p>' : `
  <table>
    <thead><tr><th>Conducteur</th><th>Matricule</th><th>Organisme</th><th>Début</th><th>Statut</th></tr></thead>
    <tbody>${formMois.map((f: any) => `
      <tr>
        <td>${(f.conducteurs as any)?.prenom} ${(f.conducteurs as any)?.nom}</td>
        <td style="font-family:monospace">${(f.conducteurs as any)?.matricule ?? ''}</td>
        <td>${f.organisme}</td>
        <td>${fmt(f.date_debut)}</td>
        <td>${f.statut === 'validee' ? `<span style="color:#059669;font-weight:700">Validée +${f.points_recuperes}pts</span>` : f.statut}</td>
      </tr>`).join('')}
    </tbody>
  </table>`}

  <div class="footer">Document généré par MineAxis — MANAGEM | 3ST — ${moisLabel} ${anneeRapport} — Confidentiel</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10)

    if (selected === 'conducteurs') {
      const rows = [
        ['Matricule', 'Nom', 'Prénom', 'Statut', 'Points', 'Entreprise'],
        ...conducteurs.map(c => [
          c.matricule, c.nom, c.prenom, c.statut, c.points_actuels,
          (c.entreprises as any)?.nom ?? '',
        ]),
      ]
      downloadCSV(`conducteurs_${today}.csv`, rows)
    } else if (selected === 'infractions') {
      const rows = [
        ['Date', 'Conducteur', 'Matricule', 'Type', 'Gravité', 'Points retirés', 'Lieu', 'Statut'],
        ...getFilteredRows().map((inf: any) => [
          fmtDT(inf.date_heure),
          `${(inf.conducteurs as any)?.prenom} ${(inf.conducteurs as any)?.nom}`,
          (inf.conducteurs as any)?.matricule,
          (inf.types_infraction as any)?.libelle,
          GRAVITE_LABEL[(inf.types_infraction as any)?.gravite] ?? (inf.types_infraction as any)?.gravite,
          (inf.types_infraction as any)?.points_retires,
          inf.localisation ?? '',
          STATUT_INF_LABEL[inf.statut] ?? inf.statut,
        ]),
      ]
      downloadCSV(`infractions_${today}.csv`, rows)
    } else if (selected === 'permis_expirants') {
      const rows = [
        ['N° Permis', 'Conducteur', 'Matricule', 'Catégories', 'Délivré le', 'Expire le', 'Statut'],
        ...getFilteredRows().map((p: any) => [
          p.numero,
          `${(p.conducteurs as any)?.prenom} ${(p.conducteurs as any)?.nom}`,
          (p.conducteurs as any)?.matricule,
          (p.categories ?? []).join(' '),
          fmt(p.date_delivrance),
          fmt(p.date_expiration),
          STATUT_PERMIS_LABEL[p.statut] ?? p.statut,
        ]),
      ]
      downloadCSV(`permis_expirants_${today}.csv`, rows)
    } else if (selected === 'formations') {
      const rows = [
        ['Conducteur', 'Matricule', 'Organisme', 'Début', 'Fin', 'Points récupérés', 'Statut'],
        ...getFilteredRows().map((f: any) => [
          `${(f.conducteurs as any)?.prenom} ${(f.conducteurs as any)?.nom}`,
          (f.conducteurs as any)?.matricule,
          f.organisme,
          fmt(f.date_debut),
          f.date_fin ? fmt(f.date_fin) : '',
          f.points_recuperes,
          STATUT_FORMATION_LABEL[f.statut] ?? f.statut,
        ]),
      ]
      downloadCSV(`formations_${today}.csv`, rows)
    } else if (selected === 'sanctions') {
      const rows = [
        ['Conducteur', 'Matricule', 'Type', 'Motif', 'Début', 'Fin', 'Levée le'],
        ...getFilteredRows().map((s: any) => [
          `${(s.conducteurs as any)?.prenom} ${(s.conducteurs as any)?.nom}`,
          (s.conducteurs as any)?.matricule,
          TYPE_SANCTION_LABEL[s.type] ?? s.type,
          s.motif,
          fmt(s.date_debut),
          s.date_fin ? fmt(s.date_fin) : '',
          s.levee_le ? fmt(s.levee_le) : '',
        ]),
      ]
      downloadCSV(`sanctions_${today}.csv`, rows)
    }
  }

  function handlePrint() {
    const rapportLabel = RAPPORTS.find(r => r.id === selected)?.label ?? selected
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const rows  = getFilteredRows()

    // Build table HTML based on selected report
    let headers: string[] = []
    let bodyRows: string[][] = []

    if (selected === 'conducteurs') {
      headers = ['Matricule', 'Prénom', 'Nom', 'Entreprise', 'Statut', 'Points']
      bodyRows = rows.map((c: any) => [
        c.matricule, c.prenom, c.nom,
        (c.entreprises as any)?.nom ?? '—',
        STATUT_CONDUCTEUR_LABEL[c.statut] ?? c.statut, `${c.points_actuels}/20`,
      ])
    } else if (selected === 'infractions') {
      headers = ['Date', 'Conducteur', 'Matricule', 'Type', 'Gravité', 'Pts', 'Statut']
      bodyRows = rows.map((inf: any) => [
        fmtDT(inf.date_heure),
        `${(inf.conducteurs as any)?.prenom} ${(inf.conducteurs as any)?.nom}`,
        (inf.conducteurs as any)?.matricule ?? '',
        (inf.types_infraction as any)?.libelle ?? '',
        GRAVITE_LABEL[(inf.types_infraction as any)?.gravite] ?? '',
        `-${(inf.types_infraction as any)?.points_retires ?? 0}`,
        STATUT_INF_LABEL[inf.statut] ?? inf.statut,
      ])
    } else if (selected === 'permis_expirants') {
      headers = ['N° Permis', 'Conducteur', 'Matricule', 'Catégories', 'Expire le', 'Statut']
      bodyRows = rows.map((p: any) => [
        p.numero,
        `${(p.conducteurs as any)?.prenom} ${(p.conducteurs as any)?.nom}`,
        (p.conducteurs as any)?.matricule ?? '',
        (p.categories ?? []).join(' '),
        fmt(p.date_expiration),
        STATUT_PERMIS_LABEL[p.statut] ?? p.statut,
      ])
    } else if (selected === 'formations') {
      headers = ['Conducteur', 'Matricule', 'Organisme', 'Début', 'Fin', 'Points', 'Statut']
      bodyRows = rows.map((f: any) => [
        `${(f.conducteurs as any)?.prenom} ${(f.conducteurs as any)?.nom}`,
        (f.conducteurs as any)?.matricule ?? '',
        f.organisme,
        fmt(f.date_debut),
        f.date_fin ? fmt(f.date_fin) : '—',
        f.statut === 'validee' ? `+${f.points_recuperes}` : '',
        STATUT_FORMATION_LABEL[f.statut] ?? f.statut,
      ])
    } else if (selected === 'sanctions') {
      headers = ['Conducteur', 'Matricule', 'Type', 'Motif', 'Début', 'Fin', 'Levée le']
      bodyRows = rows.map((s: any) => [
        `${(s.conducteurs as any)?.prenom} ${(s.conducteurs as any)?.nom}`,
        (s.conducteurs as any)?.matricule ?? '',
        s.type === 'retrait_definitif' ? 'Retrait définitif' : 'Suspension temp.',
        s.motif,
        fmt(s.date_debut),
        s.date_fin ? fmt(s.date_fin) : '—',
        s.levee_le ? fmt(s.levee_le) : '—',
      ])
    }

    const tableHtml = `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>MineAxis — ${rapportLabel} — ${today}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
    .logo { font-size: 18px; font-weight: 900; }
    .logo span { color: #D97706; }
    .meta { text-align: right; font-size: 10px; color: #555; }
    h2 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 10px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1A1A1A; color: white; text-align: left; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 4px 8px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 8px; }
    @media print { body { padding: 10px; } button { display: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Plateforme <span>3ST</span></div>
      <div style="font-size:9px;color:#555;margin-top:2px;">HSE — Site minier</div>
    </div>
    <div class="meta">
      <div>Imprimé le ${today}</div>
      <div>${rows.length} enregistrement${rows.length > 1 ? 's' : ''}</div>
    </div>
  </div>
  <h2>${rapportLabel}</h2>
  <p class="subtitle">Export MineAxis — MANAGEM | 3ST · ${today}</p>
  ${tableHtml}
  <div class="footer">Document généré par MineAxis — MANAGEM | 3ST — Confidentiel</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  function getFilteredRows(): any[] {
    let rows: any[] = []

    if (selected === 'conducteurs') rows = conducteurs
    else if (selected === 'infractions') rows = infractions
    else if (selected === 'permis_expirants') {
      const in60 = Date.now() + 60 * 86400000
      rows = permis.filter(p => {
        const exp = new Date(p.date_expiration).getTime()
        return exp <= in60 && p.statut === 'valide'
      })
    }
    else if (selected === 'formations') rows = formations
    else if (selected === 'sanctions') rows = sanctions

    // Filtre texte
    if (search.trim()) {
      const term = search.toLowerCase()
      rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(term))
    }

    // Filtre dates
    if (dateFrom || dateTo) {
      rows = rows.filter(r => {
        const dateStr: string = r.date_heure ?? r.date_debut ?? r.date_delivrance ?? r.date_debut ?? r.created_at ?? ''
        if (!dateStr) return true
        const d = new Date(dateStr)
        if (dateFrom && d < new Date(dateFrom)) return false
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false
        return true
      })
    }

    return rows
  }

  const filteredRows = getFilteredRows()

  function renderPreview() {
    if (filteredRows.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="px-5 py-12 text-center text-[#8B949E] text-sm">Aucun résultat</td>
        </tr>
      )
    }

    if (selected === 'conducteurs') {
      return filteredRows.slice(0, 20).map((c: any) => (
        <tr key={c.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]">
          <td className="px-4 py-2.5 font-mono text-xs text-[#8B949E]">{c.matricule}</td>
          <td className="px-4 py-2.5 text-sm text-[#F0F6FC]">{c.prenom} {c.nom}</td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{(c.entreprises as any)?.nom ?? '—'}</td>
          <td className="px-4 py-2.5"><StatutDot statut={c.statut} /></td>
          <td className="px-4 py-2.5 font-mono text-sm font-bold"
            style={{ color: c.points_actuels > 10 ? '#10B981' : c.points_actuels > 5 ? '#F59E0B' : '#EF4444' }}>
            {c.points_actuels}/20
          </td>
        </tr>
      ))
    }

    if (selected === 'infractions') {
      return filteredRows.slice(0, 20).map((inf: any) => (
        <tr key={inf.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]">
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{fmtDT(inf.date_heure)}</td>
          <td className="px-4 py-2.5 text-sm text-[#F0F6FC]">{(inf.conducteurs as any)?.prenom} {(inf.conducteurs as any)?.nom}</td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{(inf.types_infraction as any)?.libelle}</td>
          <td className="px-4 py-2.5"><GravDot gravite={(inf.types_infraction as any)?.gravite} /></td>
          <td className="px-4 py-2.5 font-mono text-sm font-bold text-red-400">-{(inf.types_infraction as any)?.points_retires}</td>
        </tr>
      ))
    }

    if (selected === 'permis_expirants') {
      return filteredRows.slice(0, 20).map((p: any) => {
        const days = Math.ceil((new Date(p.date_expiration).getTime() - Date.now()) / 86400000)
        return (
          <tr key={p.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]">
            <td className="px-4 py-2.5 font-mono text-xs text-[#F59E0B]">{p.numero}</td>
            <td className="px-4 py-2.5 text-sm text-[#F0F6FC]">{(p.conducteurs as any)?.prenom} {(p.conducteurs as any)?.nom}</td>
            <td className="px-4 py-2.5 text-xs text-[#8B949E]">{fmt(p.date_expiration)}</td>
            <td className="px-4 py-2.5">
              <span className={`text-xs font-bold ${days < 0 ? 'text-red-400' : days < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
                {days < 0 ? `Expiré (${-days}j)` : `J-${days}`}
              </span>
            </td>
          </tr>
        )
      })
    }

    if (selected === 'formations') {
      return filteredRows.slice(0, 20).map((f: any) => (
        <tr key={f.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]">
          <td className="px-4 py-2.5 text-sm text-[#F0F6FC]">{(f.conducteurs as any)?.prenom} {(f.conducteurs as any)?.nom}</td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{f.organisme}</td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{fmt(f.date_debut)}{f.date_fin ? ` → ${fmt(f.date_fin)}` : ''}</td>
          <td className="px-4 py-2.5">
            {f.statut === 'validee'
              ? <span className="text-xs font-bold text-green-400">+{f.points_recuperes} pts</span>
              : <span className="text-xs text-[#8B949E]">{STATUT_FORMATION_LABEL[f.statut] ?? f.statut}</span>
            }
          </td>
        </tr>
      ))
    }

    if (selected === 'sanctions') {
      return filteredRows.slice(0, 20).map((s: any) => (
        <tr key={s.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]">
          <td className="px-4 py-2.5 text-sm text-[#F0F6FC]">{(s.conducteurs as any)?.prenom} {(s.conducteurs as any)?.nom}</td>
          <td className="px-4 py-2.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              s.type === 'retrait_definitif'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            }`}>
              {s.type === 'retrait_definitif' ? 'Définitif' : 'Temp.'}
            </span>
          </td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E] max-w-[200px] truncate">{s.motif}</td>
          <td className="px-4 py-2.5 text-xs text-[#8B949E]">{fmt(s.date_debut)}{s.date_fin ? ` → ${fmt(s.date_fin)}` : ''}</td>
        </tr>
      ))
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F0F6FC]">Rapports</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Génération et export des données HSE</p>
      </div>

      {/* UC-28 — Rapport mensuel HSE */}
      <div className="bg-[#161B22] border border-[#F59E0B]/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-[#F0F6FC]">Rapport mensuel HSE</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 font-semibold">Direction</span>
        </div>
        <p className="text-xs text-[#8B949E] mb-4">Statistiques consolidées, top infractions, conducteurs suspendus et formations du mois sélectionné.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8B949E] font-medium">Mois</label>
            <select
              value={moisRapport}
              onChange={e => setMoisRapport(Number(e.target.value))}
              className="px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
                focus:outline-none focus:border-[#F59E0B] cursor-pointer"
            >
              {MOIS_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8B949E] font-medium">Année</label>
            <select
              value={anneeRapport}
              onChange={e => setAnneeRapport(Number(e.target.value))}
              className="px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
                focus:outline-none focus:border-[#F59E0B] cursor-pointer"
            >
              {[anneeRapport - 1, anneeRapport, anneeRapport + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRapportMensuel}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-bold rounded-lg
              hover:bg-[#D97706] active:scale-[0.97] transition-all cursor-pointer"
          >
            <Printer size={14} />
            Télécharger PDF
          </button>
        </div>
      </div>

      {/* Sélection rapport */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RAPPORTS.map(r => (
          <button
            key={r.id}
            onClick={() => { setSelected(r.id); setSearch(''); setDateFrom(''); setDateTo('') }}
            className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer
              ${selected === r.id
                ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F0F6FC]'
                : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:bg-[#21262D] hover:border-[#F59E0B]/40 hover:text-[#F0F6FC] hover:shadow-[0_0_0_1px_rgba(245,158,11,0.1)]'
              }`}
          >
            <div className="flex items-start gap-3">
              <FileText size={16} className={selected === r.id ? 'text-[#F59E0B] mt-0.5' : 'text-[#30363D] mt-0.5'} />
              <div>
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{r.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-[#8B949E]" />
          <p className="text-sm font-medium text-[#8B949E]">Filtres</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les résultats…"
            className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
              placeholder-[#8B949E] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
              focus:outline-none focus:border-[#F59E0B] [color-scheme:dark]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            min={dateFrom}
            className="px-3 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC]
              focus:outline-none focus:border-[#F59E0B] [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Preview + Export */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363D]">
          <p className="text-sm font-medium text-[#F0F6FC]">
            {RAPPORTS.find(r => r.id === selected)?.label}
            <span className="ml-2 text-xs text-[#8B949E]">({filteredRows.length} ligne{filteredRows.length !== 1 ? 's' : ''})</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] text-sm font-semibold rounded-lg
                hover:text-[#F0F6FC] hover:bg-[#21262D] hover:border-[#8B949E]/60 hover:shadow-[0_0_0_1px_rgba(139,148,158,0.15)]
                active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Printer size={14} />
              PDF
            </button>
            <button
              onClick={handleExport}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0D1117] text-sm font-semibold rounded-lg
                hover:bg-[#E68A00] hover:shadow-[0_0_0_2px_rgba(245,158,11,0.3)]
                active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>{renderPreview()}</tbody>
          </table>
          {filteredRows.length > 20 && (
            <p className="px-5 py-3 text-xs text-[#8B949E] border-t border-[#30363D]">
              Aperçu limité à 20 lignes · L&apos;export CSV contiendra les {filteredRows.length} lignes
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatutDot({ statut }: { statut: string }) {
  const cls: Record<string, string> = {
    actif:             'bg-green-400',
    suspendu:          'bg-yellow-400',
    retrait_definitif: 'bg-red-400',
    inactif:           'bg-gray-400',
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${cls[statut] ?? 'bg-gray-400'}`} />
      <span className="text-xs text-[#8B949E]">{STATUT_CONDUCTEUR_LABEL[statut] ?? statut}</span>
    </span>
  )
}

function GravDot({ gravite }: { gravite: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${GRAVITE_BADGE_CLS[gravite] ?? ''}`}>
      {GRAVITE_LABEL[gravite] ?? gravite}
    </span>
  )
}
