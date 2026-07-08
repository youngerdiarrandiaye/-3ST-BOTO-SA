// Record<string, string> intentionnel : permet l'indexation avec string|any
// sans cast, tout en gardant les 4 valeurs exhaustives à la définition.

export const GRAVITE_LABEL: Record<string, string> = {
  mineure:      'Mineure',
  majeure:      'Majeure',
  critique:     'Critique',
  eliminatoire: 'Éliminatoire',
}

export const GRAVITE_BADGE_CLS: Record<string, string> = {
  mineure:      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  majeure:      'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critique:     'bg-red-500/10    text-red-400    border-red-500/20',
  eliminatoire: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export const GRAVITE_DOT_CLS: Record<string, string> = {
  mineure:      'bg-yellow-400',
  majeure:      'bg-orange-400',
  critique:     'bg-red-400',
  eliminatoire: 'bg-purple-400',
}
