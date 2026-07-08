-- ============================================================
-- MIGRATION V2 — Plateforme 3ST HSE | BOTO SA
-- Xaran Dev | Juin 2026
-- ============================================================
-- ORDRE D'EXÉCUTION DANS SUPABASE SQL EDITOR :
--   ➜ Exécuter la SECTION A seule (ALTER TYPE hors transaction)
--   ➜ Puis exécuter les SECTIONS B à K ensemble ou par bloc
-- ============================================================

-- ============================================================
-- SECTION A — Nouveau enum gravite (exécuter SEUL, hors transaction)
-- ============================================================
ALTER TYPE gravite_infraction ADD VALUE IF NOT EXISTS 'eliminatoire';

-- ============================================================
-- SECTION B — Nouveaux types enum
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_infraction') THEN
    CREATE TYPE zone_infraction AS ENUM ('miniere', 'hors_miniere', 'les_deux');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_validite') THEN
    CREATE TYPE zone_validite AS ENUM ('miniere', 'administrative', 'les_deux');
  END IF;
END$$;

-- ============================================================
-- SECTION C — ALTER TABLE conducteurs
-- ============================================================
ALTER TABLE conducteurs
  ADD COLUMN IF NOT EXISTS fonction                   TEXT,
  ADD COLUMN IF NOT EXISTS type_permis_conduite        TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS validation_sst             BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_validation_sst        DATE,
  ADD COLUMN IF NOT EXISTS validation_clinique        BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_validation_clinique   DATE,
  ADD COLUMN IF NOT EXISTS zone_validite              zone_validite,
  ADD COLUMN IF NOT EXISTS contact_urgence_nom        TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_tel        TEXT;

-- ============================================================
-- SECTION D — ALTER TABLE permis_internes
-- ============================================================
ALTER TABLE permis_internes
  ADD COLUMN IF NOT EXISTS zone_validite        zone_validite,
  ADD COLUMN IF NOT EXISTS type_permis_site     TEXT,
  ADD COLUMN IF NOT EXISTS validation_sst       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validation_clinique  BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- SECTION E — ALTER TABLE types_infraction
-- ============================================================
ALTER TABLE types_infraction
  ADD COLUMN IF NOT EXISTS zone_applicable        zone_infraction NOT NULL DEFAULT 'les_deux',
  ADD COLUMN IF NOT EXISTS retrait_definitif_auto BOOLEAN         NOT NULL DEFAULT FALSE;

-- ============================================================
-- SECTION F — ALTER TABLE infractions
-- ============================================================
ALTER TABLE infractions
  ADD COLUMN IF NOT EXISTS zone_constatee           zone_infraction,
  ADD COLUMN IF NOT EXISTS est_recidive             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nb_recidives             INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conducteur_refuse_signe  BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- SECTION G — ALTER TABLE formations
-- ============================================================
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS theme                  TEXT,
  ADD COLUMN IF NOT EXISTS formateur_nom          TEXT,
  ADD COLUMN IF NOT EXISTS formateur_qualif       TEXT,
  ADD COLUMN IF NOT EXISTS nb_seances             INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nb_seances_faites      INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duree_par_seance       INT,
  ADD COLUMN IF NOT EXISTS test_reprise_requis    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS test_reprise_resultat  resultat_test,
  ADD COLUMN IF NOT EXISTS test_reprise_date      DATE;

-- ============================================================
-- SECTION H — CREATE TABLE temoins
-- ============================================================
CREATE TABLE IF NOT EXISTS temoins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  infraction_id UUID NOT NULL REFERENCES infractions(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  prenom        TEXT,
  matricule     TEXT,
  telephone     TEXT,
  declaration   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temoins_infraction ON temoins(infraction_id);

ALTER TABLE temoins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_temoins"       ON temoins FOR ALL    USING (get_user_role() = 'admin');
CREATE POLICY "hse_sst_read_temoins"   ON temoins FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_write_temoins"  ON temoins FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst','agent'));
CREATE POLICY "direction_read_temoins" ON temoins FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "agent_read_temoins"     ON temoins FOR SELECT USING (get_user_role() = 'agent');

-- ============================================================
-- SECTION I — Mise à jour du barème existant (zone + retrait_definitif_auto)
-- Safe : UPDATE ciblé par code unique
-- ============================================================
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='VIT-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='VIT-02';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='VIT-03';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='ALC-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=TRUE  WHERE code='ALC-02';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='SEC-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='SEC-02';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='SEC-03';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='PRI-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='SIG-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='ACC-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=TRUE  WHERE code='ACC-02';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=TRUE  WHERE code='AUT-01';
UPDATE types_infraction SET zone_applicable='miniere',  retrait_definitif_auto=FALSE WHERE code='ZON-01';
UPDATE types_infraction SET zone_applicable='les_deux', retrait_definitif_auto=FALSE WHERE code='SOM-01';

-- Nouveaux types V2 (20 types supplémentaires → total 35)
-- ON CONFLICT (code) DO NOTHING = idempotent, safe à re-exécuter
INSERT INTO types_infraction
  (code, libelle, gravite, points_retires, suspend_auto, zone_applicable, retrait_definitif_auto)
VALUES
  ('VIT-04','Vitesse excessive en zone de chantier actif',           'critique',     8,  TRUE,  'miniere',  FALSE),
  ('VIT-05','Non-respect distance de sécurité dans convoi minier',   'majeure',      4,  FALSE, 'miniere',  FALSE),
  ('SEC-04','Défaut d''éclairage ou signalisation du véhicule',      'mineure',      2,  FALSE, 'les_deux', FALSE),
  ('SEC-05','Véhicule en mauvais état technique mis en circulation', 'majeure',      5,  FALSE, 'les_deux', FALSE),
  ('SEC-06','Surcharge ou chargement non sécurisé',                  'majeure',      4,  FALSE, 'les_deux', FALSE),
  ('EPI-01','Non-port du casque de protection en zone mine',         'majeure',      4,  FALSE, 'miniere',  FALSE),
  ('EPI-02','Non-port du gilet haute visibilité obligatoire',        'mineure',      2,  FALSE, 'miniere',  FALSE),
  ('ZON-02','Entrée en zone d''abattage sans autorisation',          'critique',    10,  TRUE,  'miniere',  FALSE),
  ('ZON-03','Franchissement voie sans arrêt obligatoire',            'majeure',      6,  FALSE, 'miniere',  FALSE),
  ('ENV-01','Déversement carburant / produit dangereux',             'majeure',      6,  FALSE, 'les_deux', FALSE),
  ('ENV-02','Abandon de véhicule hors zone désignée',                'mineure',      2,  FALSE, 'les_deux', FALSE),
  ('COM-01','Refus d''obtempérer à un agent de contrôle',            'majeure',      6,  FALSE, 'les_deux', FALSE),
  ('COM-02','Comportement agressif / incivilité grave',              'majeure',      4,  FALSE, 'les_deux', FALSE),
  ('DOC-01','Documents de bord manquants ou périmés',                'mineure',      2,  FALSE, 'les_deux', FALSE),
  ('DOC-02','Falsification de documents officiels',                  'eliminatoire',20,  TRUE,  'les_deux', TRUE),
  ('MAN-01','Manœuvre dangereuse compromettant la sécurité',         'majeure',      5,  FALSE, 'les_deux', FALSE),
  ('MAN-02','Marche arrière non sécurisée sans signaleur',           'mineure',      3,  FALSE, 'miniere',  FALSE),
  ('SOM-02','Endormissement au volant constaté',                     'eliminatoire',20,  TRUE,  'les_deux', TRUE),
  ('DRG-01','Conduite sous influence de stupéfiants',                'eliminatoire',20,  TRUE,  'les_deux', TRUE),
  ('SUR-01','Dépassement dangereux en zone de circulation minière',  'critique',     8,  TRUE,  'miniere',  FALSE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SECTION J — Trigger détection récidive (BEFORE INSERT infractions)
-- ============================================================
CREATE OR REPLACE FUNCTION detecter_recidive()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM infractions
  WHERE conducteur_id       = NEW.conducteur_id
    AND type_infraction_id  = NEW.type_infraction_id
    AND created_at          >= NOW() - INTERVAL '12 months';

  IF v_count > 0 THEN
    NEW.est_recidive  := TRUE;
    NEW.nb_recidives  := v_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detecter_recidive ON infractions;
CREATE TRIGGER trg_detecter_recidive
  BEFORE INSERT ON infractions
  FOR EACH ROW EXECUTE FUNCTION detecter_recidive();

-- ============================================================
-- SECTION K — Trigger création formation obligatoire (AFTER INSERT sanctions)
-- Workflow BOTO SA : retrait_definitif → 5 séances formation → test reprise → +10pts → actif
-- ============================================================
CREATE OR REPLACE FUNCTION creer_formation_obligatoire()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'retrait_definitif' THEN
    INSERT INTO formations (
      conducteur_id,
      organisme,
      theme,
      nb_seances,
      nb_seances_faites,
      test_reprise_requis,
      date_debut,
      statut,
      points_recuperes
    ) VALUES (
      NEW.conducteur_id,
      'BOTO SA — Formation interne',
      'Remise à niveau sécurité — Suite retrait définitif',
      5,
      0,
      TRUE,
      CURRENT_DATE,
      'en_cours',
      10
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_formation_obligatoire ON sanctions;
CREATE TRIGGER trg_formation_obligatoire
  AFTER INSERT ON sanctions
  FOR EACH ROW EXECUTE FUNCTION creer_formation_obligatoire();

-- ============================================================
-- FIN MIGRATION V2
-- ============================================================
