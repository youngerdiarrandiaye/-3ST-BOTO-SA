import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('formations')
    .select('*, conducteurs(id, nom, prenom, matricule)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: prev, error: fetchErr } = await admin
    .from('formations').select('statut, points_recuperes, conducteur_id').eq('id', id).single()
  if (fetchErr || !prev) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })

  const {
    organisme, date_debut, date_fin, points_recuperes,
    theme, formateur_nom, formateur_qualif,
    nb_seances, nb_seances_faites, duree_par_seance,
    test_reprise_requis, test_reprise_resultat, test_reprise_date,
  } = await request.json()

  if (!organisme?.trim() || !date_debut) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  // statut is not editable via this endpoint — use PATCH /[id]/statut for transitions
  const pts = parseInt(String(points_recuperes), 10)
  const newPts = Number.isNaN(pts) ? (prev.points_recuperes ?? 0) : Math.max(0, pts)

  const { error: updateErr } = await admin
    .from('formations')
    .update({
      organisme:        organisme.trim(),
      date_debut,
      date_fin:         date_fin || null,
      points_recuperes: newPts,
      theme:                  theme?.trim()            || null,
      formateur_nom:          formateur_nom?.trim()     || null,
      formateur_qualif:       formateur_qualif?.trim()  || null,
      nb_seances:             Math.max(1, parseInt(nb_seances, 10) || 1),
      nb_seances_faites:      parseInt(nb_seances_faites, 10) || 0,
      duree_par_seance:       duree_par_seance ? parseInt(duree_par_seance, 10) : null,
      test_reprise_requis:    Boolean(test_reprise_requis),
      test_reprise_resultat:  test_reprise_requis ? (test_reprise_resultat || null) : null,
      test_reprise_date:      test_reprise_requis ? (test_reprise_date     || null) : null,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message ?? 'Mise à jour impossible' }, { status: 500 })

  // If the formation is already validated and points changed, adjust the driver balance
  const oldPts = prev.points_recuperes ?? 0
  const delta = prev.statut === 'validee' ? newPts - oldPts : 0

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
          motif:         `Formation modifiée — ${organisme.trim()}`,
          points_delta:  delta,
          points_avant:  ptsAvant,
          points_apres:  ptsApres,
        }),
      ])
      if (condRes.error || logRes.error) {
        console.error('[3ST] Points delta partiel sur formation modifiée:', condRes.error ?? logRes.error)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
