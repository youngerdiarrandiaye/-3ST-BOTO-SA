-- ============================================================
-- MIGRATION V3 — Plateforme 3ST HSE
-- UC-06 à UC-10 : Permis civil, Tests de conduite, Statut initial
-- Juillet 2026
-- ============================================================
-- Exécuter dans Supabase SQL Editor (tout en une fois)
-- ============================================================

-- SECTION A — ALTER TABLE conducteurs
ALTER TABLE conducteurs
  ADD COLUMN IF NOT EXISTS permis_civil_autorite TEXT;

ALTER TABLE conducteurs
  ALTER COLUMN statut SET DEFAULT 'inactif';

-- SECTION B — ALTER TABLE tests_conduite
ALTER TABLE tests_conduite
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'initial'
    CHECK (type IN ('initial', 'reprise'));

-- SECTION C — RLS : tests_conduite (manquant dans v1)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tests_conduite' AND policyname = 'hse_sst_read_tests'
  ) THEN
    EXECUTE 'CREATE POLICY "hse_sst_read_tests" ON tests_conduite
      FOR SELECT USING (get_user_role() IN (''hse'', ''sst''))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tests_conduite' AND policyname = 'hse_sst_insert_tests'
  ) THEN
    EXECUTE 'CREATE POLICY "hse_sst_insert_tests" ON tests_conduite
      FOR INSERT WITH CHECK (get_user_role() IN (''hse'', ''sst''))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tests_conduite' AND policyname = 'hse_sst_update_tests'
  ) THEN
    EXECUTE 'CREATE POLICY "hse_sst_update_tests" ON tests_conduite
      FOR UPDATE USING (get_user_role() IN (''hse'', ''sst''))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tests_conduite' AND policyname = 'direction_read_tests'
  ) THEN
    EXECUTE 'CREATE POLICY "direction_read_tests" ON tests_conduite
      FOR SELECT USING (get_user_role() = ''direction'')';
  END IF;
END $$;

-- SECTION D — RLS : utilisateurs (lecture propre profil + lecture par hse/sst)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'utilisateurs' AND policyname = 'self_read_utilisateur'
  ) THEN
    EXECUTE 'CREATE POLICY "self_read_utilisateur" ON utilisateurs
      FOR SELECT USING (id = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'utilisateurs' AND policyname = 'hse_sst_read_utilisateurs'
  ) THEN
    EXECUTE 'CREATE POLICY "hse_sst_read_utilisateurs" ON utilisateurs
      FOR SELECT USING (get_user_role() IN (''hse'', ''sst''))';
  END IF;
END $$;

-- ============================================================
-- SECTION E — Recharger le cache schema PostgREST
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- FIN MIGRATION V3
-- ============================================================
