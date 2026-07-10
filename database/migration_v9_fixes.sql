-- ══════════════════════════════════════════════════════════════
-- Migration V9 — Correctifs post-déploiement V2.1
-- ══════════════════════════════════════════════════════════════

-- ─── Correctif Am. 2 — Trigger workflow : accepter statut 'inactif' ──────────
-- Le trigger vérifiait uniquement OLD.statut = 'en_attente', mais les conducteurs
-- sont créés avec statut = 'inactif'. Élargi à IN ('en_attente', 'inactif').
CREATE OR REPLACE FUNCTION verifier_validations_conducteur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validation_resp_dept     = TRUE
    AND NEW.autorisation_resp_sst   = TRUE
    AND NEW.autorisation_equipe_sst = TRUE
    AND NEW.autorisation_clinique   = TRUE
    AND OLD.statut IN ('en_attente', 'inactif')
  THEN
    NEW.statut := 'actif';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── pg_cron — désactivation automatique des conducteurs expirés ──────────────
-- Tente d'installer pg_cron et de planifier la tâche quotidienne.
-- Sans pg_cron, le bloc échoue silencieusement (NOTICE) — le reste de la
-- migration continue.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron non disponible sur cette instance : %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Déprogrammer si déjà planifié pour éviter les doublons
    BEGIN
      PERFORM cron.unschedule('desactiver-conducteurs-expires');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    -- Planifier tous les jours à 06h00 UTC
    PERFORM cron.schedule(
      'desactiver-conducteurs-expires',
      '0 6 * * *',
      'SELECT desactiver_conducteurs_expires()'
    );
    RAISE NOTICE 'Tâche cron planifiée : desactiver-conducteurs-expires (0 6 * * *)';
  ELSE
    RAISE NOTICE 'pg_cron absent — planifier manuellement via votre crontab système.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors de la planification cron : %', SQLERRM;
END $$;
