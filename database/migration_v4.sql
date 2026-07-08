-- ============================================================
-- MIGRATION V4 — Correctifs UC-30 et UC-33
-- Idempotent : CREATE OR REPLACE sur les deux fonctions trigger
-- ============================================================
-- A. UC-30 : statut conducteur → 'retire' (pas 'suspendu') pour retrait_definitif
-- B. UC-33 : réactivation depuis 'retire' en plus de 'suspendu' après formation
-- ============================================================

-- ─── A. Fix UC-30 ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION traiter_infraction()
RETURNS TRIGGER AS $$
DECLARE
  v_type         types_infraction%ROWTYPE;
  v_conducteur   conducteurs%ROWTYPE;
  v_points_avant INT;
  v_points_apres INT;
  v_sanction     type_sanction;
BEGIN
  SELECT * INTO v_type       FROM types_infraction WHERE id = NEW.type_infraction_id;
  SELECT * INTO v_conducteur FROM conducteurs       WHERE id = NEW.conducteur_id;

  v_points_avant := v_conducteur.points_actuels;
  v_points_apres := GREATEST(0, v_points_avant - v_type.points_retires);

  IF v_points_apres = 0 OR v_type.suspend_auto THEN
    IF v_type.gravite IN ('critique', 'eliminatoire') OR v_type.retrait_definitif_auto THEN
      v_sanction := 'retrait_definitif'::type_sanction;
    ELSE
      v_sanction := 'suspension_temp'::type_sanction;
    END IF;
  END IF;

  UPDATE conducteurs
    SET points_actuels = v_points_apres,
        statut = CASE
          WHEN v_sanction = 'retrait_definitif' THEN 'retire'::statut_conducteur
          WHEN v_sanction = 'suspension_temp'   THEN 'suspendu'::statut_conducteur
          ELSE statut
        END
  WHERE id = NEW.conducteur_id;

  INSERT INTO retraits_points (conducteur_id, infraction_id, points_avant, points_delta, points_apres, motif)
  VALUES (NEW.conducteur_id, NEW.id, v_points_avant, -v_type.points_retires, v_points_apres,
          'Infraction : ' || v_type.libelle);

  IF v_sanction IS NOT NULL THEN
    INSERT INTO sanctions (conducteur_id, infraction_id, type, motif)
    VALUES (NEW.conducteur_id, NEW.id, v_sanction,
            'Sanction automatique — ' || v_type.libelle);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── B. Fix UC-33 ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION traiter_formation_validee()
RETURNS TRIGGER AS $$
DECLARE
  v_points_avant INT;
  v_points_apres INT;
BEGIN
  IF NEW.statut = 'validee' AND OLD.statut != 'validee' THEN
    SELECT points_actuels INTO v_points_avant FROM conducteurs WHERE id = NEW.conducteur_id;
    v_points_apres := LEAST(20, v_points_avant + NEW.points_recuperes);

    UPDATE conducteurs
      SET points_actuels = v_points_apres,
          statut = CASE
            WHEN statut IN ('suspendu', 'retire') AND v_points_apres > 0
            THEN 'actif'::statut_conducteur
            ELSE statut
          END
    WHERE id = NEW.conducteur_id;

    INSERT INTO retraits_points (conducteur_id, formation_id, points_avant, points_delta, points_apres, motif)
    VALUES (NEW.conducteur_id, NEW.id, v_points_avant, NEW.points_recuperes, v_points_apres,
            'Recuperation - Formation : ' || NEW.organisme);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
