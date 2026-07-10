-- ══════════════════════════════════════════════════════════════
-- Migration V10 — Correctif trigger verifier_validations_conducteur
-- Supprime la référence à 'en_attente' qui n'est pas dans l'ENUM
-- statut_conducteur ('actif', 'suspendu', 'retire', 'inactif').
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verifier_validations_conducteur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validation_resp_dept     = TRUE
    AND NEW.autorisation_resp_sst   = TRUE
    AND NEW.autorisation_equipe_sst = TRUE
    AND NEW.autorisation_clinique   = TRUE
    AND OLD.statut = 'inactif'
  THEN
    NEW.statut := 'actif';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
