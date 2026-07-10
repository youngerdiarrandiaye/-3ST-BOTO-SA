#!/usr/bin/env node
/**
 * Runner de migration 3ST HSE
 * Usage : npm run migrate
 *
 * Supporte deux modes selon NEXT_PUBLIC_SUPABASE_URL :
 *   - Supabase Cloud  (*.supabase.co)  → Management API  api.supabase.com
 *   - Self-hosted                       → pg_meta via Kong  {URL}/pg/query
 *
 * Idempotent : relançable sans risque.
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

const env            = loadEnv()
const PAT            = env.SUPABASE_ACCESS_TOKEN
const SERVICE_KEY    = env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL   = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')

if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL manquant dans .env.local')

// ─── Détection cloud vs self-hosted ──────────────────────────────────────────
const cloudProject = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const isCloud      = Boolean(cloudProject)

// ─── Exécuter du SQL ──────────────────────────────────────────────────────────
async function sql(query) {
  let res

  if (isCloud) {
    // Supabase Cloud : Management API
    if (!PAT) throw new Error('SUPABASE_ACCESS_TOKEN requis pour Supabase Cloud')
    res = await fetch(
      `https://api.supabase.com/v1/projects/${cloudProject}/database/query`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query }),
      }
    )
  } else {
    // Self-hosted : pg_meta via Kong
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY requis pour self-hosted')
    res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        apikey:          SERVICE_KEY,
      },
      body: JSON.stringify({ query }),
    })
  }

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }

  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? json?.raw ?? `HTTP ${res.status}`
    throw new Error(`SQL Error (${res.status}): ${msg}`)
  }
  return json
}

// ─── Migrations ordonnées ─────────────────────────────────────────────────────
const MIGRATIONS = [
  'migration_v2.sql',
  'migration_unicite.sql',
  'migration_v3.sql',
  'migration_v4.sql',
  'migration_v5.sql',
  'migration_v8_ameliorations.sql',
  'migration_v9_fixes.sql',
  'migration_v11_workflow_v2.sql',
]

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const mode = isCloud ? `Cloud (project: ${cloudProject})` : `Self-hosted (${SUPABASE_URL})`
  console.log(`\n🚀  Runner de migration 3ST — ${mode}\n`)

  // Créer la table de suivi si elle n'existe pas
  await sql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const rows = await sql('SELECT name FROM _migrations ORDER BY id')
  const done = new Set((Array.isArray(rows) ? rows : (rows?.rows ?? [])).map(r => r.name))

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
      await sql(`INSERT INTO _migrations (name) VALUES ('${filename.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING`)
      console.log('  ✅')
      applied++
    } catch (err) {
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
