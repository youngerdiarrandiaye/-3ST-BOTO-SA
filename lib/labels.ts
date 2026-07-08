// Labels français pour tous les enums affichés côté utilisateur
// Usage: STATUT_INF_LABEL[value] ?? value

export const STATUT_INF_LABEL: Record<string, string> = {
  declaree:  'En attente',
  traitee:   'Traitée',
  contestee: 'Contestée',
}

export const STATUT_CONDUCTEUR_LABEL: Record<string, string> = {
  actif:             'Actif',
  suspendu:          'Suspendu',
  retrait_definitif: 'Retrait définitif',
}

export const STATUT_FORMATION_LABEL: Record<string, string> = {
  en_cours: 'En cours',
  validee:  'Validée',
  annulee:  'Annulée',
}

export const STATUT_PERMIS_LABEL: Record<string, string> = {
  valide:   'Valide',
  suspendu: 'Suspendu',
  retire:   'Retiré',
  expire:   'Expiré',
}

export const TYPE_SANCTION_LABEL: Record<string, string> = {
  avertissement:     'Avertissement',
  suspension_temp:   'Suspension temporaire',
  retrait_definitif: 'Retrait définitif',
}

export const ZONE_LABEL: Record<string, string> = {
  miniere:      'Zone minière',
  hors_miniere: 'Hors zone minière',
  les_deux:     'Les deux zones',
  administrative: 'Zone administrative',
}
