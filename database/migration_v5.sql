-- =============================================================================
-- migration_v5.sql — Permis internes : unicité, motif, validation dates
-- =============================================================================

-- 1. Colonne motif_changement (raison du dernier changement de statut)
ALTER TABLE permis_internes ADD COLUMN IF NOT EXISTS motif_changement TEXT;

-- 2. Index unique partiel : un seul permis valide ou suspendu par conducteur
--    Les permis retirés/expirés restent accessibles comme historique
DROP INDEX IF EXISTS idx_permis_unique_actif;
CREATE UNIQUE INDEX idx_permis_unique_actif
  ON permis_internes(conducteur_id)
  WHERE statut IN ('valide', 'suspendu');

-- 3. Trigger : valider les dates à l'insertion (pas de permis antidaté)
CREATE OR REPLACE FUNCTION valider_dates_permis()
RETURNS TRIGGER AS $$
BEGIN
  -- Date de délivrance ne peut pas être dans le passé
  IF NEW.date_delivrance < CURRENT_DATE THEN
    RAISE EXCEPTION 'PERMIS_DATE_PASSE';
  END IF;
  -- Date d'expiration doit être postérieure à la date de délivrance
  IF NEW.date_expiration <= NEW.date_delivrance THEN
    RAISE EXCEPTION 'PERMIS_DATE_INVALIDE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valider_dates_permis ON permis_internes;
CREATE TRIGGER trg_valider_dates_permis
  BEFORE INSERT ON permis_internes
  FOR EACH ROW EXECUTE FUNCTION valider_dates_permis();

-- 4. Fonction utilitaire : auto-expiration des permis dont la date est dépassée
--    Appelable via RPC ou depuis le runner de migration
CREATE OR REPLACE FUNCTION auto_expirer_permis_obsoletes()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE permis_internes
     SET statut     = 'expire',
         updated_at = NOW()
   WHERE statut         = 'valide'
     AND date_expiration < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
