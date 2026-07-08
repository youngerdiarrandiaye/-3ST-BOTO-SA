#!/usr/bin/env node
/**
 * Runner de migration 3ST HSE
 * Usage : npm run migrate
 *
 * - Lit .env.local pour les credentials Supabase
 * - Crée la table _migrations si elle n'existe pas
 * - Applique uniquement les migrations non encore exécutées
 * - Idempotent : relançable sans risque de perte de données
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = join(__dir, '..')

// ─── Lire .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) throw new Error('.env.local introuvable')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env     = loadEnv()
const PAT     = env.SUPABASE_ACCESS_TOKEN
const URL_SB  = env.NEXT_PUBLIC_SUPABASE_URL
const PROJECT = URL_SB?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!PAT)     throw new Error('SUPABASE_ACCESS_TOKEN manquant dans .env.local')
if (!PROJECT) throw new Error('NEXT_PUBLIC_SUPABASE_URL invalide dans .env.local')

// ─── Exécuter du SQL via Management API ──────────────────────────────────────
async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query }),
    }
  )
  const json = await res.json()
  if (!res.ok) {
    const msg = json?.message ?? JSON.stringify(json)
    throw new Error(`SQL Error (${res.status}): ${msg}`)
  }
  return json
}

// ─── Migrations ordonnées ─────────────────────────────────────────────────────
// Ordre déterministe : ajoute ici les nouveaux fichiers à la suite
const MIGRATIONS = [
  'migration_v2.sql',
  'migration_unicite.sql',
  'migration_v3.sql',
  'migration_v4.sql',
  'migration_v5.sql',
]

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀  Runner de migration 3ST — projet : ${PROJECT}\n`)

  // Créer la table de suivi si elle n'existe pas
  await sql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  // Lire les migrations déjà appliquées
  const rows   = await sql('SELECT name FROM _migrations ORDER BY id')
  const done   = new Set((rows ?? []).map(r => r.name))

  let applied = 0

  for (const filename of MIGRATIONS) {
    if (done.has(filename)) {
      console.log(`  ✓  ${filename}  (déjà appliquée)`)
      continue
    }

    const filePath = join(ROOT, 'database', filename)
    if (!existsSync(filePath)) {
      console.warn(`  ⚠  ${filename}  introuvable — ignorée`)
      continue
    }

    process.stdout.write(`  ▶  ${filename}  …`)
    const content = readFileSync(filePath, 'utf8')

    try {
      await sql(content)
      await sql(`INSERT INTO _migrations (name) VALUES ('${filename.replace(/'/g, "''")}')`)
      console.log('  ✅')
      applied++
    } catch (err) {
      // "already exists" = migration appliquée manuellement avant le runner
      const alreadyExists = /already exists|42710|42P07|42P16/i.test(err.message)
      if (alreadyExists) {
        console.log('  ⚠  (objets déjà présents — marquée comme appliquée)')
        try {
          await sql(`INSERT INTO _migrations (name) VALUES ('${filename.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING`)
        } catch (_) { /* ignore */ }
        applied++
      } else {
        console.log('  ❌')
        console.error(`\n     ${err.message}\n`)
        process.exit(1)
      }
    }
  }

  if (applied === 0) {
    console.log('\n  Aucune migration en attente — base à jour.\n')
  } else {
    console.log(`\n  ${applied} migration(s) appliquée(s) avec succès.\n`)
  }
}

main().catch(err => {
  console.error('\n❌  Erreur fatale :', err.message)
  process.exit(1)
})
