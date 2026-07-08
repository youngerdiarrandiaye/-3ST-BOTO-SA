import { createClient } from '@/lib/supabase/server'
import RapportsClient from '@/components/rapports/RapportsClient'

export default async function RapportsPage() {
  const supabase = await createClient()

  // Données pour les rapports
  const [
    { data: conducteurs },
    { data: infractions },
    { data: permis },
    { data: formations },
    { data: sanctions },
  ] = await Promise.all([
    supabase.from('conducteurs').select('id, nom, prenom, matricule, statut, points_actuels, entreprises(nom)').order('nom'),
    supabase.from('infractions').select('*, conducteurs(nom, prenom, matricule), types_infraction(code, libelle, gravite, points_retires)').order('date_heure', { ascending: false }),
    supabase.from('permis_internes').select('*, conducteurs(nom, prenom, matricule)').order('date_expiration'),
    supabase.from('formations').select('*, conducteurs(nom, prenom, matricule)').order('created_at', { ascending: false }),
    supabase.from('sanctions').select('*, conducteurs(nom, prenom, matricule)').order('created_at', { ascending: false }),
  ])

  return (
    <RapportsClient
      conducteurs={conducteurs ?? []}
      infractions={infractions ?? []}
      permis={permis ?? []}
      formations={formations ?? []}
      sanctions={sanctions ?? []}
    />
  )
}
