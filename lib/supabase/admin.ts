import { createClient } from '@supabase/supabase-js'
import { env, requireServerEnv } from '@/lib/config/env'

// Client admin — service_role uniquement côté serveur, JAMAIS exposé au client
export function createAdminClient() {
  const { serviceRoleKey } = requireServerEnv()
  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
