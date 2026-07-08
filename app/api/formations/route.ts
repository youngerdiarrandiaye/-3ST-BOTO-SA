import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs').select('role').eq('id', user.id).single()
  if (!['admin', 'hse', 'sst'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const {
    conducteur_id, organisme, date_debut, date_fin, points_recuperes, statut,
    // V2
    theme, formateur_nom, formateur_qualif,
    nb_seances, nb_seances_faites, duree_par_seance,
    test_reprise_requis, test_reprise_resultat, test_reprise_date,
  } = await request.json()

  if (!conducteur_id || !organisme?.trim() || !date_debut || !statut) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const pts   = parseInt(points_recuperes, 10) || 0
  const admin = createAdminClient()

  const { data: formation, error: formErr } = await admin
    .from('formations')
    .insert({
      conducteur_id,
      organisme:        organisme.trim(),
      date_debut,
      date_fin:         date_fin || null,
      points_recuperes: pts,
      statut,
      valide_par:       statut === 'validee' ? user.id : null,
      // V2
      theme:                  theme?.trim()            || null,
      formateur_nom:          formateur_nom?.trim()     || null,
      formateur_qualif:       formateur_qualif?.trim()  || null,
      nb_seances:             parseInt(nb_seances, 10)  || 1,
      nb_seances_faites:      parseInt(nb_seances_faites, 10) || 0,
      duree_par_seance:       duree_par_seance ? parseInt(duree_par_seance, 10) : null,
      test_reprise_requis:    Boolean(test_reprise_requis),
      test_reprise_resultat:  test_reprise_requis ? (test_reprise_resultat || null) : null,
      test_reprise_date:      test_reprise_requis ? (test_reprise_date     || null) : null,
    })
    .select('id')
    .single()

  if (formErr) return NextResponse.json({ error: 'Erreur lors de la création de la formation' }, { status: 500 })

  // Créditer les points si formation validée
  if (statut === 'validee' && pts > 0) {
    const { data: cond } = await admin
      .from('conducteurs').select('points_actuels').eq('id', conducteur_id).single()

    if (cond) {
      const ptsAvant = cond.points_actuels ?? 0
      const ptsApres = Math.min(20, ptsAvant + pts)

      await Promise.all([
        admin.from('conducteurs')
          .update({ points_actuels: ptsApres })
          .eq('id', conducteur_id),
        admin.from('retraits_points').insert({
          conducteur_id,
          motif:        `Formation validée — ${organisme.trim()}`,
          points_delta: +pts,
          points_avant:  ptsAvant,
          points_apres:  ptsApres,
        }),
      ])
    }
  }

  return NextResponse.json({ id: formation.id })
}
