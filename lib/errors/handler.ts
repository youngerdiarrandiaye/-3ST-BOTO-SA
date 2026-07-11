const CODES_POSTGRES: Record<string, string> = {
  '23505': 'Cet enregistrement existe déjà',
  '23503': 'Référence invalide — donnée liée introuvable',
  '23502': 'Champ obligatoire manquant',
  '42501': 'Accès refusé — permissions insuffisantes',
  'PGRST116': 'Enregistrement introuvable',
  'PGRST301': 'Accès refusé',
}

const PATTERNS_SENSIBLES = [
  /postgres/i, /supabase/i, /stack trace/i, /at Object\./,
  /\.ts:\d+/, /\.js:\d+/, /\bSELECT\b/i, /\bINSERT\b/i,
  /\bUPDATE\b/i, /\bDELETE\b/i, /FROM public\./i,
  /relation ".*" does not exist/i, /column ".*" does not exist/i,
  /duplicate key value violates/i, /violates foreign key/i,
]

// Messages métier 3ST déjà formatés pour l'utilisateur
const PREFIXES_METIER = [
  'Workflow de validation incomplet',
  'Accès refusé', 'Non authentifié', 'Rôle insuffisant',
  'Sanction introuvable', 'Document introuvable',
  'Conducteur introuvable', 'Permission insuffisante',
  'obligatoire', 'invalide', 'requis',
]

export function getMsgUtilisateur(error: unknown): string {
  if (!error) return 'Une erreur inattendue est survenue'

  const err = error as Record<string, unknown>
  const code = (err.code ?? err.error_code ?? '') as string
  const messageBrut = (err.message ?? err.error ?? '') as string

  if (CODES_POSTGRES[code]) return CODES_POSTGRES[code]

  if (PREFIXES_METIER.some(p => messageBrut.includes(p))) return messageBrut

  if (PATTERNS_SENSIBLES.some(p => p.test(messageBrut))) {
    console.error('[3ST] Erreur masquée:', { code, message: messageBrut })
    return 'Erreur serveur — contactez l\'administrateur'
  }

  if (messageBrut && messageBrut.length < 200) return messageBrut

  return 'Une erreur est survenue — réessayez'
}
