-- ============================================================
-- Migration : Unicité des données + Blocage permis en doublon
-- Idempotent — peut être rejoué sans danger
-- ============================================================

-- 1. Unicité matricule conducteur
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conducteurs_matricule_unique'
  ) THEN
    ALTER TABLE conducteurs ADD CONSTRAINT conducteurs_matricule_unique UNIQUE (matricule);
    RAISE NOTICE 'UNIQUE ajouté : conducteurs.matricule';
  ELSE
    RAISE NOTICE 'Déjà existant : conducteurs.matricule UNIQUE';
  END IF;
END$$;

-- 2. Unicité numéro de permis national
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conducteurs_permis_national_unique'
  ) THEN
    ALTER TABLE conducteurs ADD CONSTRAINT conducteurs_permis_national_unique UNIQUE (permis_national);
  END IF;
END$$;

-- 3. Trigger : blocage création permis interne si permis actif/suspendu existe déjà
CREATE OR REPLACE FUNCTION check_permis_actif_unique()
RETURNS TRIGGER AS $$
DECLARE
  v_nom   TEXT;
  v_prenom TEXT;
  v_permis_id UUID;
BEGIN
  SELECT p.id, c.nom, c.prenom
  INTO v_permis_id, v_nom, v_prenom
  FROM permis_internes p
  JOIN conducteurs c ON c.id = p.conducteur_id
  WHERE p.conducteur_id = NEW.conducteur_id
    AND p.statut IN ('valide', 'suspendu')
    AND p.id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Le conducteur % % a déjà un permis interne actif ou suspendu (id: %)',
      v_prenom, v_nom, v_permis_id
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_permis_actif ON permis_internes;
CREATE TRIGGER trg_check_permis_actif
  BEFORE INSERT ON permis_internes
  FOR EACH ROW EXECUTE FUNCTION check_permis_actif_unique();
