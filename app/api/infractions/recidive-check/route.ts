import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conducteur_id      = searchParams.get('conducteur_id')
  const type_infraction_id = searchParams.get('type_infraction_id')

  if (!conducteur_id || !type_infraction_id) {
    return NextResponse.json({ est_recidive: false, nb_recidives: 0 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ est_recidive: false, nb_recidives: 0 }, { status: 401 })

  const depuis12mois = new Date()
  depuis12mois.setFullYear(depuis12mois.getFullYear() - 1)

  const { count } = await supabase
    .from('infractions')
    .select('id', { count: 'exact', head: true })
    .eq('conducteur_id', conducteur_id)
    .eq('type_infraction_id', type_infraction_id)
    .gte('created_at', depuis12mois.toISOString())

  return NextResponse.json({
    est_recidive: (count ?? 0) > 0,
    nb_recidives: count ?? 0,
  })
}
