function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `[3ST] Variable d'environnement manquante : ${name}\n` +
      `L'application ne peut pas démarrer sans cette variable.\n` +
      `Vérifiez votre fichier .env.local ou la configuration Coolify.`
    )
  }
  return value
}

export const env = {
  supabaseUrl:        requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey:    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const

// Validation serveur uniquement — ne pas importer côté client
export function requireServerEnv() {
  return {
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
