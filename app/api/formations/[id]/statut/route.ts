import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getMsgUtilisateur } from '@/lib/errors/handler'

interface Ctx { params: Promise<{ id: string }> }

const TRANSITIONS: Record<string, string[]> = {
  en_cours: ['validee', 'annulee'],
  validee:  ['annulee'],
  annulee:  ['en_cours'],
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  const role = me?.role ?? ''
  if (!['admin', 'hse', 'sst'].includes(role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { statut: nextStatut, points_recuperes } = await request.json()

  const admin = createAdminClient()
  const { data: prev } = await admin
    .from('formations')
    .select('statut, points_recuperes, conducteur_id')
    .eq('id', id)
    .single()

  if (!prev) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })

  const allowed = TRANSITIONS[prev.statut] ?? []
  if (!allowed.includes(nextStatut)) {
    return NextResponse.json({ error: `Transition ${prev.statut} → ${nextStatut} non autorisée` }, { status: 422 })
  }

  // Transitions out of validee or annulee are admin-only
  const isAdminOnly = prev.statut === 'validee' || prev.statut === 'annulee'
  if (isAdminOnly && role !== 'admin') {
    return NextResponse.json({ error: 'Action réservée à l\'administrateur' }, { status: 403 })
  }

  // Prevent falsy-zero: an explicit 0 must be preserved, not fallen back to prev
  const pts = parseInt(String(points_recuperes), 10)
  const newPts = Number.isNaN(pts) ? (prev.points_recuperes ?? 0) : Math.max(0, pts)
  const oldPts = prev.points_recuperes ?? 0

  const { error: updateErr } = await admin
    .from('formations')
    .update({
      statut:           nextStatut,
      points_recuperes: nextStatut === 'validee' ? newPts : oldPts,
      valide_par:       nextStatut === 'validee' ? user.id : null,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: getMsgUtilisateur(updateErr) }, { status: 500 })

  // Points delta: en_cours→validee credits, validee→annulee debits
  // en_cours→annulee and annulee→en_cours do not move points
  let delta = 0
  if (prev.statut === 'en_cours' && nextStatut === 'validee') delta = +newPts
  else if (prev.statut === 'validee' && nextStatut === 'annulee') delta = -oldPts

  if (delta !== 0) {
    const { data: cond } = await admin
      .from('conducteurs').select('points_actuels').eq('id', prev.conducteur_id).single()
    if (cond) {
      const ptsAvant = cond.points_actuels ?? 0
      const ptsApres = Math.max(0, Math.min(20, ptsAvant + delta))
      const [condRes, logRes] = await Promise.all([
        admin.from('conducteurs')
          .update({ points_actuels: ptsApres })
          .eq('id', prev.conducteur_id),
        admin.from('retraits_points').insert({
          conducteur_id: prev.conducteur_id,
          motif:         delta > 0 ? `Formation validée — récupération de points` : `Annulation formation validée`,
          points_delta:  delta,
          points_avant:  ptsAvant,
          points_apres:  ptsApres,
        }),
      ])
      if (condRes.error || logRes.error) {
        console.error('[3ST] Points delta partiel sur transition formation:', condRes.error ?? logRes.error)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
