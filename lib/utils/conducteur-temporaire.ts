export type NiveauTemporaire = 'expire' | 'critique' | 'urgent' | 'attention' | 'ok'

export interface StatutTemporaire {
  niveau: NiveauTemporaire
  joursRestants: number
}

export function getStatutTemporaire(dateFin: string): StatutTemporaire {
  // Compare date strings to match SQL CURRENT_DATE logic exactly:
  // expire = dateFin < today (strict past), not same day
  const todayStr = new Date().toISOString().split('T')[0]
  const finStr   = dateFin.split('T')[0]

  if (finStr < todayStr) {
    return { niveau: 'expire', joursRestants: -1 }
  }

  // finStr >= todayStr : count remaining days from midnight to midnight
  const joursRestants = Math.round(
    (new Date(finStr).getTime() - new Date(todayStr).getTime()) / 86400000
  )

  let niveau: NiveauTemporaire
  if (joursRestants <= 3)  niveau = 'critique'
  else if (joursRestants <= 7)  niveau = 'urgent'
  else if (joursRestants <= 14) niveau = 'attention'
  else                          niveau = 'ok'

  return { niveau, joursRestants }
}

export function estAutoriseConducteur(conducteur: {
  statut: string
  est_temporaire: boolean
  date_fin_autorisation: string | null
}): boolean {
  if (conducteur.statut !== 'actif') return false
  if (!conducteur.est_temporaire)    return true
  if (!conducteur.date_fin_autorisation) return true
  return getStatutTemporaire(conducteur.date_fin_autorisation).niveau !== 'expire'
}
