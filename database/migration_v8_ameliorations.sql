-- ══════════════════════════════════════════════════════════════
-- Migration V8 — Améliorations V2.1 (7 évolutions fonctionnelles)
-- XD-3ST-AMELIO-2026-V1
-- ══════════════════════════════════════════════════════════════

-- ─── Am. 3 — Type de zone ────────────────────────────────────
ALTER TABLE conducteurs     ADD COLUMN IF NOT EXISTS type_zone TEXT;
ALTER TABLE permis_internes ADD COLUMN IF NOT EXISTS type_zone TEXT;

-- ─── Am. 4 — Conducteurs temporaires ─────────────────────────
ALTER TABLE conducteurs
  ADD COLUMN IF NOT EXISTS est_temporaire          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_debut_autorisation DATE,
  ADD COLUMN IF NOT EXISTS date_fin_autorisation   DATE;

CREATE OR REPLACE FUNCTION desactiver_conducteurs_expires()
RETURNS VOID AS $$
BEGIN
  UPDATE conducteurs
  SET statut = 'inactif'
  WHERE est_temporaire = TRUE
    AND date_fin_autorisation < CURRENT_DATE
    AND statut = 'actif';
END;
$$ LANGUAGE plpgsql;

-- ─── Am. 2 — Workflow validation 4 étapes ────────────────────
ALTER TABLE conducteurs
  ADD COLUMN IF NOT EXISTS validation_resp_dept       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_validation_resp_dept  DATE,
  ADD COLUMN IF NOT EXISTS nom_resp_dept              TEXT,
  ADD COLUMN IF NOT EXISTS autorisation_resp_sst      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_autorisation_resp_sst DATE,
  ADD COLUMN IF NOT EXISTS nom_resp_sst               TEXT,
  ADD COLUMN IF NOT EXISTS autorisation_equipe_sst      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_autorisation_equipe_sst DATE,
  ADD COLUMN IF NOT EXISTS nom_equipe_sst             TEXT,
  ADD COLUMN IF NOT EXISTS autorisation_clinique      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_autorisation_clinique DATE,
  ADD COLUMN IF NOT EXISTS medecin_clinique           TEXT;

CREATE OR REPLACE FUNCTION verifier_validations_conducteur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validation_resp_dept    = TRUE
    AND NEW.autorisation_resp_sst  = TRUE
    AND NEW.autorisation_equipe_sst = TRUE
    AND NEW.autorisation_clinique  = TRUE
    AND OLD.statut = 'en_attente'
  THEN
    NEW.statut := 'actif';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validations_conducteur ON conducteurs;
CREATE TRIGGER trg_validations_conducteur
  BEFORE UPDATE ON conducteurs
  FOR EACH ROW EXECUTE FUNCTION verifier_validations_conducteur();

-- ─── Am. 5 — Documents conducteur ────────────────────────────
CREATE TABLE IF NOT EXISTS documents_conducteur (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID        NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  type_document TEXT        NOT NULL,
  nom_fichier   TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  taille_bytes  INT,
  uploaded_par  UUID        REFERENCES utilisateurs(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents_conducteur ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='documents_conducteur' AND policyname='doc_read'
  ) THEN
    CREATE POLICY "doc_read" ON documents_conducteur
      FOR SELECT USING (get_user_role() IN ('admin','hse','sst','direction'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='documents_conducteur' AND policyname='doc_write'
  ) THEN
    CREATE POLICY "doc_write" ON documents_conducteur
      FOR INSERT WITH CHECK (get_user_role() IN ('admin','hse','sst'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='documents_conducteur' AND policyname='doc_delete'
  ) THEN
    CREATE POLICY "doc_delete" ON documents_conducteur
      FOR DELETE USING (get_user_role() IN ('admin','hse','sst'));
  END IF;
END $$;

-- ─── Am. 6 — Heures validées + points automatiques ───────────
ALTER TABLE formations ADD COLUMN IF NOT EXISTS heures_validees DECIMAL(5,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION calculer_points_formation()
RETURNS TRIGGER AS $$
DECLARE
  v_points_gagnes INT;
  v_points_avant  INT;
  v_points_apres  INT;
BEGIN
  IF NEW.statut = 'validee' AND OLD.statut != 'validee' THEN
    v_points_gagnes := FLOOR(NEW.heures_validees / 2) * 2;
    IF v_points_gagnes > 0 THEN
      SELECT points_actuels INTO v_points_avant
      FROM conducteurs WHERE id = NEW.conducteur_id;

      v_points_apres := LEAST(20, v_points_avant + v_points_gagnes);

      UPDATE conducteurs SET
        points_actuels = v_points_apres,
        statut = CASE
          WHEN v_points_apres >= 1 AND statut = 'suspendu' THEN 'actif'
          ELSE statut
        END
      WHERE id = NEW.conducteur_id;

      INSERT INTO retraits_points
        (conducteur_id, formation_id, points_avant, points_delta, points_apres, motif)
      VALUES (
        NEW.conducteur_id, NEW.id,
        v_points_avant, v_points_gagnes, v_points_apres,
        'Formation : ' || NEW.heures_validees || 'h → +' || v_points_gagnes || ' points'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_points_formation ON formations;
CREATE TRIGGER trg_points_formation
  AFTER UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION calculer_points_formation();
