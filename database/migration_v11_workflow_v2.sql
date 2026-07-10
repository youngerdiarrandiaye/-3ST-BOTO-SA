-- ══════════════════════════════════════════════════════════════
-- Migration V11 — Workflow validation 3 niveaux
-- XD-3ST-WORKFLOW-2026-V2
-- ══════════════════════════════════════════════════════════════

-- Colonnes workflow manquantes
ALTER TABLE conducteurs
  ADD COLUMN IF NOT EXISTS motif_refus_dept          TEXT,
  ADD COLUMN IF NOT EXISTS motif_refus_resp_sst      TEXT,
  ADD COLUMN IF NOT EXISTS motif_refus_clinique      TEXT,
  ADD COLUMN IF NOT EXISTS valideur_clinique         TEXT,
  ADD COLUMN IF NOT EXISTS niveau_validation_courant INT NOT NULL DEFAULT 1;

-- Conducteurs déjà actifs/suspendus/retirés → niveau complet
UPDATE conducteurs
SET niveau_validation_courant = 4
WHERE statut IN ('actif', 'suspendu', 'retire');

-- Nouveau conducteur → en_attente par défaut
ALTER TABLE conducteurs ALTER COLUMN statut SET DEFAULT 'en_attente';

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trg_validations_conducteur ON conducteurs;
DROP TRIGGER IF EXISTS trg_workflow_validation    ON conducteurs;

-- Nouveau trigger workflow séquentiel 3 niveaux
CREATE OR REPLACE FUNCTION gerer_workflow_validation()
RETURNS TRIGGER AS $$
BEGIN

  -- ── NIVEAU 1 : Responsable département ──────────────────────
  IF NEW.validation_resp_dept = TRUE AND OLD.validation_resp_dept = FALSE THEN
    IF NEW.niveau_validation_courant != 1 THEN
      RAISE EXCEPTION 'Niveau 1 deja traite';
    END IF;
    NEW.date_validation_resp_dept  := CURRENT_DATE;
    NEW.niveau_validation_courant  := 2;
  END IF;

  IF NEW.validation_resp_dept = FALSE
     AND NEW.motif_refus_dept IS NOT NULL
     AND OLD.motif_refus_dept IS DISTINCT FROM NEW.motif_refus_dept THEN
    NEW.statut                    := 'refuse';
    NEW.niveau_validation_courant := 1;
    RETURN NEW;
  END IF;

  -- ── NIVEAU 2 : Responsable SST ──────────────────────────────
  IF NEW.autorisation_resp_sst = TRUE AND OLD.autorisation_resp_sst = FALSE THEN
    IF NEW.validation_resp_dept = FALSE THEN
      RAISE EXCEPTION 'Niveau 1 (Responsable departement) non valide';
    END IF;
    IF NEW.niveau_validation_courant != 2 THEN
      RAISE EXCEPTION 'Niveau 2 deja traite ou niveau 1 non valide';
    END IF;
    NEW.date_autorisation_resp_sst := CURRENT_DATE;
    NEW.niveau_validation_courant  := 3;
  END IF;

  IF NEW.autorisation_resp_sst = FALSE
     AND NEW.motif_refus_resp_sst IS NOT NULL
     AND OLD.motif_refus_resp_sst IS DISTINCT FROM NEW.motif_refus_resp_sst THEN
    NEW.statut := 'refuse';
    RETURN NEW;
  END IF;

  -- ── NIVEAU 3 : Clinique ──────────────────────────────────────
  IF NEW.autorisation_clinique = TRUE AND OLD.autorisation_clinique = FALSE THEN
    IF NEW.autorisation_resp_sst = FALSE THEN
      RAISE EXCEPTION 'Niveau 2 (Responsable SST) non valide';
    END IF;
    IF NEW.niveau_validation_courant != 3 THEN
      RAISE EXCEPTION 'Niveau 3 deja traite ou niveaux precedents non valides';
    END IF;
    NEW.date_autorisation_clinique := CURRENT_DATE;
    NEW.niveau_validation_courant  := 4;
  END IF;

  IF NEW.autorisation_clinique = FALSE
     AND NEW.motif_refus_clinique IS NOT NULL
     AND OLD.motif_refus_clinique IS DISTINCT FROM NEW.motif_refus_clinique THEN
    NEW.statut := 'refuse';
    RETURN NEW;
  END IF;

  -- ── VALIDATION COMPLÈTE → ACTIF ─────────────────────────────
  IF NEW.validation_resp_dept  = TRUE
     AND NEW.autorisation_resp_sst = TRUE
     AND NEW.autorisation_clinique = TRUE
     AND NEW.statut = 'en_attente' THEN
    NEW.statut                    := 'actif';
    NEW.niveau_validation_courant := 4;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_workflow_validation
  BEFORE UPDATE ON conducteurs
  FOR EACH ROW EXECUTE FUNCTION gerer_workflow_validation();
