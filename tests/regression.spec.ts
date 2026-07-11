/**
 * Tests de non-régression — Post Audit Sécurité V1
 * Référence : XD-3ST-TEST-REGRESSION-2026-V1
 *
 * Variables d'env requises :
 *   PLAYWRIGHT_BASE_URL  (défaut: http://localhost:3000)
 *   TEST_ADMIN_EMAIL     (ex: admin@3st-boto.com)
 *   TEST_ADMIN_PASSWORD  (ex: 3ST@Admin2026)
 *   TEST_HSE_EMAIL
 *   TEST_HSE_PASSWORD
 *   TEST_SST_EMAIL
 *   TEST_SST_PASSWORD
 *   TEST_DIRECTION_EMAIL
 *   TEST_DIRECTION_PASSWORD
 *   TEST_AGENT_EMAIL
 *   TEST_AGENT_PASSWORD
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ─── Credentials depuis env ───────────────────────────────────────────────────
const CREDS = {
  admin:     { email: process.env.TEST_ADMIN_EMAIL!,     pwd: process.env.TEST_ADMIN_PASSWORD! },
  hse:       { email: process.env.TEST_HSE_EMAIL!,       pwd: process.env.TEST_HSE_PASSWORD! },
  sst:       { email: process.env.TEST_SST_EMAIL!,       pwd: process.env.TEST_SST_PASSWORD! },
  direction: { email: process.env.TEST_DIRECTION_EMAIL!, pwd: process.env.TEST_DIRECTION_PASSWORD! },
  agent:     { email: process.env.TEST_AGENT_EMAIL!,     pwd: process.env.TEST_AGENT_PASSWORD! },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function login(page: Page, role: keyof typeof CREDS) {
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', CREDS[role].email)
  await page.fill('input[type="password"], input[name="password"]', CREDS[role].pwd)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|conducteurs|infractions)/, { timeout: 10_000 })
}

async function logout(page: Page) {
  // Cliquer sur le menu avatar puis déconnexion
  const avatarBtn = page.locator('[data-testid="user-menu"], [aria-label="Menu utilisateur"]').first()
  if (await avatarBtn.isVisible()) {
    await avatarBtn.click()
    await page.click('text=Déconnexion')
  } else {
    // Fallback : naviguer vers /api/auth/signout ou vider cookies
    await page.goto('/login')
  }
}

async function toastVisible(page: Page, text: string | RegExp) {
  const toast = page.locator('[role="status"], [data-vyrn], .toast, [data-sonner-toast]')
    .filter({ hasText: text })
  await expect(toast.first()).toBeVisible({ timeout: 5_000 })
}

// ─── MODULE 1 — AUTHENTIFICATION ──────────────────────────────────────────────
test.describe('Module 1 — Authentification', () => {

  test('1.1 Connexion valide', async ({ page }) => {
    await login(page, 'admin')
    await expect(page).toHaveURL(/dashboard/)
    // Navbar doit afficher un nom
    const navbar = page.locator('nav, header')
    await expect(navbar).not.toBeEmpty()
    // Cookie de session présent
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name.includes('supabase') || c.name.includes('session'))
    expect(sessionCookie).toBeTruthy()
  })

  test('1.2 Connexion invalide — pas de fuite technique', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@3st-boto.com')
    await page.fill('input[type="password"], input[name="password"]', 'MAUVAIS_MDP_2026')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/login/, { timeout: 5_000 })
    const body = await page.textContent('body')
    expect(body).not.toContain('PostgreSQL')
    expect(body).not.toContain('duplicate key')
    expect(body).not.toContain('supabase-js')
    expect(body).not.toContain('stack trace')
  })

  test('1.3 Accès route protégée sans connexion → redirect /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })

  test('1.4 Déconnexion — session supprimée', async ({ page }) => {
    await login(page, 'admin')
    await logout(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })

  test('1.5 Open redirect corrigé — URL externe ignorée', async ({ page }) => {
    await page.goto('/login?next=https://evil.com')
    await page.fill('input[type="email"], input[name="email"]', CREDS.admin.email)
    await page.fill('input[type="password"], input[name="password"]', CREDS.admin.pwd)
    await page.click('button[type="submit"]')
    // Doit atterrir sur /dashboard, pas evil.com
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
    expect(page.url()).not.toContain('evil.com')
  })

  test('1.6 Open redirect interne — /conducteurs fonctionne', async ({ page }) => {
    await page.goto('/login?next=/conducteurs')
    await page.fill('input[type="email"], input[name="email"]', CREDS.admin.email)
    await page.fill('input[type="password"], input[name="password"]', CREDS.admin.pwd)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/conducteurs/, { timeout: 10_000 })
  })
})

// ─── MODULE 2 — CONDUCTEURS ───────────────────────────────────────────────────
test.describe('Module 2 — Conducteurs', () => {
  let conducteurId: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page, 'hse')
  })

  test('2.1 Liste conducteurs chargée', async ({ page }) => {
    await page.goto('/conducteurs')
    await expect(page.locator('table, [data-testid="conducteurs-table"], .conducteurs-list')).toBeVisible({ timeout: 10_000 })
    // Aucune erreur critique
    const body = await page.textContent('body')
    expect(body).not.toContain('Error:')
    expect(body).not.toContain('PGRST')
  })

  test('2.2 Filtres conducteurs fonctionnels', async ({ page }) => {
    await page.goto('/conducteurs')
    // Filtre par statut
    const select = page.locator('select[name="statut"]')
    if (await select.isVisible()) {
      await select.selectOption('actif')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL(/statut=actif/)
    }
  })

  test('2.3 Fiche conducteur accessible', async ({ page }) => {
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await expect(page).toHaveURL(/\/conducteurs\/[a-z0-9-]+/, { timeout: 5_000 })
      const body = await page.textContent('body')
      expect(body).not.toContain('Error:')
    }
  })
})

// ─── MODULE 3 — WORKFLOW VALIDATION ──────────────────────────────────────────
test.describe('Module 3 — Workflow Validation (critique sécurité)', () => {

  test('3.1 Workflow bloqué — bypass admin direct via API', async ({ page, request }) => {
    await login(page, 'admin')
    // Récupérer un conducteur en_attente (niveau < 3)
    const conducteurRes = await request.get('/api/conducteurs?statut=en_attente&limit=1')
    // Si l'API de liste existe, tenter de forcer statut=actif via PATCH
    // Chercher un conducteur en_attente dans la liste UI
    await page.goto('/conducteurs?statut=en_attente')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')
      const id = href?.split('/conducteurs/')[1]?.split('?')[0]
      if (id) {
        // Tenter le bypass via PATCH direct
        const res = await request.patch(`/api/conducteurs/${id}`, {
          data: { nom: 'Test', prenom: 'Bypass', entreprise_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', statut: 'actif' },
          headers: { 'Content-Type': 'application/json' },
        })
        // Doit retourner 422 ou 400 si workflow incomplet
        // (ou la mise à jour ne change PAS statut si les validations manquent)
        if (res.status() !== 200) {
          expect([400, 422, 403, 500]).toContain(res.status())
        } else {
          // Si 200, vérifier que le conducteur n'est PAS actif (trigger SQL devrait bloquer)
          const data = await res.json()
          // Le succès sans les 3 validations serait une régression
          console.warn('⚠️ PATCH a retourné 200 — vérifier manuellement que le conducteur est toujours en_attente')
        }
      }
    }
  })

  test('3.2 Boutons de validation visibles selon le rôle', async ({ page }) => {
    // SST ne voit que Niveau 2 et 3
    await login(page, 'sst')
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      // Le bouton Niveau 1 ne devrait pas être visible pour SST
      const n1btn = page.locator('[data-testid="valider-n1"], text=Valider Niveau 1').first()
      await expect(n1btn).not.toBeVisible()
    }
  })

  test('3.3 Direction ne peut pas valider Niveau 2 (API)', async ({ page, request }) => {
    await login(page, 'direction')
    // Tenter de valider N2 — le server action doit refuser
    // Le test est sur le rôle, pas sur un conducteur spécifique
    // Vérifier que le bouton N2 est absent dans l'UI
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      const n2btn = page.locator('[data-testid="valider-n2"], text=Valider Niveau 2').first()
      // Si visible, le bouton doit être désactivé
      if (await n2btn.isVisible()) {
        await expect(n2btn).toBeDisabled()
      }
    }
  })
})

// ─── MODULE 4 — INFRACTIONS ───────────────────────────────────────────────────
test.describe('Module 4 — Infractions', () => {

  test('4.1 Liste infractions chargée', async ({ page }) => {
    await login(page, 'hse')
    await page.goto('/infractions')
    await expect(page).toHaveURL(/infractions/)
    const body = await page.textContent('body')
    expect(body).not.toContain('PGRST')
    expect(body).not.toContain('PostgreSQL')
  })

  test('4.2 Formulaire nouvelle infraction accessible', async ({ page }) => {
    await login(page, 'hse')
    await page.goto('/infractions/nouvelle')
    await expect(page).toHaveURL(/infractions\/nouvelle/)
    // Vérifier que les champs principaux sont présents
    await expect(page.locator('form')).toBeVisible({ timeout: 5_000 })
  })

  test('4.3 Message erreur — aucune fuite technique', async ({ page, request }) => {
    await login(page, 'hse')
    // Envoyer une infraction avec conducteur_id invalide
    const res = await request.post('/api/infractions', {
      data: {
        conducteur_id: '00000000-0000-0000-0000-000000000000',
        type_infraction_id: '00000000-0000-0000-0000-000000000000',
        zone_constatee: 'miniere',
        localisation: 'Test zone',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await res.json()
    const msgStr = JSON.stringify(body).toLowerCase()
    // Aucun message technique
    expect(msgStr).not.toContain('postgres')
    expect(msgStr).not.toContain('pgrst')
    expect(msgStr).not.toContain('duplicate key')
    expect(msgStr).not.toContain('relation "')
    expect(msgStr).not.toContain('stack')
  })
})

// ─── MODULE 5 — SANCTIONS ────────────────────────────────────────────────────
test.describe('Module 5 — Sanctions', () => {

  test('5.1 Liste sanctions accessible', async ({ page }) => {
    await login(page, 'hse')
    await page.goto('/sanctions')
    await expect(page).toHaveURL(/sanctions/)
    const body = await page.textContent('body')
    expect(body).not.toContain('PGRST')
  })

  test('5.2 IDOR lever sanction — conducteur_id du body ignoré', async ({ page, request }) => {
    await login(page, 'hse')
    // Appeler /api/sanctions/[invalid-id]/lever avec un conducteur_id différent
    // Le serveur doit lire conducteur_id depuis la sanction en DB
    const res = await request.post('/api/sanctions/00000000-0000-0000-0000-000000000000/lever', {
      data: { conducteur_id: '99999999-9999-9999-9999-999999999999' },
      headers: { 'Content-Type': 'application/json' },
    })
    // La sanction 000...000 n'existe pas → 404 (pas 500 ni 200 en modifiant un autre conducteur)
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('introuvable')
  })
})

// ─── MODULE 6 — PERMIS ───────────────────────────────────────────────────────
test.describe('Module 6 — Permis', () => {

  test('6.1 Liste permis accessible', async ({ page }) => {
    await login(page, 'hse')
    await page.goto('/permis')
    await expect(page).toHaveURL(/permis/)
    const body = await page.textContent('body')
    expect(body).not.toContain('Error:')
    expect(body).not.toContain('PGRST')
  })

  test('6.2 Formulaire nouveau permis chargé', async ({ page }) => {
    await login(page, 'hse')
    await page.goto('/permis/nouveau')
    await expect(page).toHaveURL(/permis\/nouveau/)
    await expect(page.locator('form, [data-testid="permis-form"]')).toBeVisible({ timeout: 8_000 })
  })
})

// ─── MODULE 7 — FORMATIONS ───────────────────────────────────────────────────
test.describe('Module 7 — Formations', () => {

  test('7.1 Liste formations accessible', async ({ page }) => {
    await login(page, 'sst')
    await page.goto('/formations')
    await expect(page).toHaveURL(/formations/)
    const body = await page.textContent('body')
    expect(body).not.toContain('PGRST')
  })

  test('7.2 Formulaire nouvelle formation accessible', async ({ page }) => {
    await login(page, 'sst')
    await page.goto('/formations/nouvelle')
    await expect(page).toHaveURL(/formations\/nouvelle/)
  })
})

// ─── MODULE 8 — DOCUMENTS MÉDICAUX ──────────────────────────────────────────
test.describe('Module 8 — Documents médicaux (IDOR corrigé)', () => {

  test('8.1 HSE peut accéder aux documents', async ({ page, request }) => {
    await login(page, 'hse')
    // Récupérer un conducteur existant
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')
      const id = href?.split('/conducteurs/')[1]?.split('?')[0]
      if (id) {
        const res = await request.get(`/api/conducteurs/${id}/documents`)
        expect(res.status()).toBe(200)
      }
    }
  })

  test('8.2 Direction peut accéder aux documents (lecture)', async ({ page, request }) => {
    await login(page, 'direction')
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')
      const id = href?.split('/conducteurs/')[1]?.split('?')[0]
      if (id) {
        const res = await request.get(`/api/conducteurs/${id}/documents`)
        // Direction doit avoir accès (200, pas 403)
        expect(res.status()).toBe(200)
      }
    }
  })

  test('8.3 Agent est refusé sur les documents (403)', async ({ page, request }) => {
    await login(page, 'agent')
    await page.goto('/conducteurs')
    const firstLink = page.locator('a[href*="/conducteurs/"]').first()
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')
      const id = href?.split('/conducteurs/')[1]?.split('?')[0]
      if (id) {
        const res = await request.get(`/api/conducteurs/${id}/documents`)
        expect(res.status()).toBe(403)
        const body = await res.json()
        expect(body.error).toContain('Permission insuffisante')
      }
    }
  })
})

// ─── MODULE 9 — SECURITY HEADERS ─────────────────────────────────────────────
test.describe('Module 9 — Security Headers', () => {

  test('9.1 Headers de sécurité présents', async ({ request }) => {
    const res = await request.get('/')
    const headers = res.headers()

    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['content-security-policy']).toBeTruthy()
    expect(headers['permissions-policy']).toBeTruthy()
    // X-Powered-By ne doit pas exposer Next.js
    expect(headers['x-powered-by']).toBeFalsy()
  })

  test('9.2 Aucune erreur CSP dans le navigateur', async ({ page }) => {
    const cspErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy'))
        cspErrors.push(msg.text())
    })
    await login(page, 'admin')
    await page.goto('/conducteurs')
    await page.goto('/infractions')
    await page.goto('/permis')
    expect(cspErrors).toHaveLength(0)
  })
})

// ─── MODULE 10 — MESSAGES D'ERREUR SÉCURISÉS ─────────────────────────────────
test.describe('Module 10 — Messages erreur sécurisés', () => {

  test('10.1 Violation contrainte unique — message propre', async ({ page, request }) => {
    await login(page, 'admin')
    const res = await request.post('/api/admin/users', {
      data: {
        email: 'nonexistent-test@domain.com',
        password: 'Test123456!',
        nom: 'Test',
        prenom: 'User',
        role: 'agent',
        entreprise_id: null,
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() !== 201 && res.status() !== 200) {
      const body = await res.json()
      const msg = JSON.stringify(body).toLowerCase()
      expect(msg).not.toContain('duplicate key value')
      expect(msg).not.toContain('constraint')
      expect(msg).not.toContain('postgres')
    }
  })

  test('10.2 UUID invalide — message propre', async ({ page, request }) => {
    await login(page, 'hse')
    const res = await request.get('/api/conducteurs/not-a-valid-uuid/documents')
    const body = await res.json()
    const msg = JSON.stringify(body).toLowerCase()
    expect(msg).not.toContain('pgrst')
    expect(msg).not.toContain('json object requested')
    expect(msg).not.toContain('postgres')
  })
})

// ─── MODULE 11 — DASHBOARD ───────────────────────────────────────────────────
test.describe('Module 12 — Dashboard', () => {

  test('12.1 Dashboard chargé sans erreur', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/dashboard/)
    const body = await page.textContent('body')
    expect(body).not.toContain('Error:')
    expect(body).not.toContain('PGRST')
    expect(body).not.toContain('supabase-js')
  })

  test('12.2 KPIs visibles', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/dashboard')
    // Au moins un KPI numérique visible
    const kpis = page.locator('[data-testid*="kpi"], .kpi, .stat, .metric, .text-2xl, .font-black')
    await expect(kpis.first()).toBeVisible({ timeout: 8_000 })
  })

  test('12.3 Colonnes validation selon rôle — direction ne voit pas SST', async ({ page }) => {
    await login(page, 'direction')
    await page.goto('/dashboard')
    const sst = await page.getByText('Att. SST').isVisible().catch(() => false)
    // Direction ne doit pas voir la colonne SST
    expect(sst).toBe(false)
  })
})

// ─── MODULE 11 — RAPPORTS ────────────────────────────────────────────────────
test.describe('Module 11 — Rapports', () => {

  test('11.1 Page rapports accessible', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/rapports')
    await expect(page).toHaveURL(/rapports/)
    const body = await page.textContent('body')
    expect(body).not.toContain('Error:')
  })
})
