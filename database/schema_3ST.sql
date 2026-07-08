-- ============================================================
-- PLATEFORME 3ST -- Schema Supabase complet
-- Xaran Dev | Juin 2026 | Version 1.0
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- 2. ENUMS
-- ============================================================
CREATE TYPE role_utilisateur    AS ENUM ('admin', 'hse', 'sst', 'direction', 'agent');
CREATE TYPE statut_conducteur   AS ENUM ('actif', 'suspendu', 'retire', 'inactif');
CREATE TYPE statut_permis       AS ENUM ('valide', 'suspendu', 'retire', 'expire');
CREATE TYPE gravite_infraction  AS ENUM ('mineure', 'majeure', 'critique', 'eliminatoire');
CREATE TYPE zone_infraction     AS ENUM ('miniere', 'hors_miniere', 'les_deux');
CREATE TYPE zone_validite       AS ENUM ('miniere', 'administrative', 'les_deux');
CREATE TYPE resultat_test       AS ENUM ('reussi', 'echoue', 'en_attente');
CREATE TYPE type_sanction       AS ENUM ('suspension_temp', 'retrait_definitif');
CREATE TYPE statut_formation    AS ENUM ('en_cours', 'validee', 'annulee');
CREATE TYPE statut_infraction   AS ENUM ('declaree', 'traitee', 'contestee', 'annulee');
CREATE TYPE type_entreprise     AS ENUM ('sous_traitant', 'partenaire', 'interne');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 Entreprises
CREATE TABLE entreprises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           TEXT NOT NULL,
  type          type_entreprise NOT NULL DEFAULT 'sous_traitant',
  contact_nom   TEXT,
  contact_tel   TEXT,
  contact_email TEXT,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Utilisateurs (etend auth.users de Supabase)
CREATE TABLE utilisateurs (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  role          role_utilisateur NOT NULL DEFAULT 'agent',
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  telephone     TEXT,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Conducteurs
CREATE TABLE conducteurs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule       TEXT NOT NULL UNIQUE,
  nom             TEXT NOT NULL,
  prenom          TEXT NOT NULL,
  date_naissance  DATE,
  photo_url       TEXT,
  entreprise_id   UUID NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
  statut          statut_conducteur NOT NULL DEFAULT 'inactif',
  points_actuels  INT NOT NULL DEFAULT 20 CHECK (points_actuels >= 0 AND points_actuels <= 20),
  permis_national           TEXT,
  permis_civil_autorite     TEXT,
  fonction                  TEXT,
  type_permis_conduite      TEXT[]    DEFAULT '{}',
  validation_sst            BOOLEAN   NOT NULL DEFAULT FALSE,
  date_validation_sst       DATE,
  validation_clinique       BOOLEAN   NOT NULL DEFAULT FALSE,
  date_validation_clinique  DATE,
  zone_validite             zone_validite,
  contact_urgence_nom       TEXT,
  contact_urgence_tel       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Permis internes
CREATE TABLE permis_internes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id    UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  numero           TEXT NOT NULL UNIQUE,
  qr_code_url      TEXT,
  categories       TEXT[] NOT NULL DEFAULT '{}',
  date_delivrance  DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration  DATE NOT NULL,
  statut           statut_permis NOT NULL DEFAULT 'valide',
  delivre_par      UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  zone_validite    zone_validite,
  type_permis_site TEXT,
  validation_sst   BOOLEAN NOT NULL DEFAULT FALSE,
  validation_clinique BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT date_coherente CHECK (date_expiration > date_delivrance)
);

-- 3.5 Tests de conduite
CREATE TABLE tests_conduite (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  evaluateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  date_test     DATE NOT NULL DEFAULT CURRENT_DATE,
  type          TEXT NOT NULL DEFAULT 'initial' CHECK (type IN ('initial', 'reprise')),
  resultat      resultat_test NOT NULL DEFAULT 'en_attente',
  score         INT CHECK (score >= 0 AND score <= 100),
  observations  TEXT,
  permis_id     UUID REFERENCES permis_internes(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 Types d'infraction (bareme)
CREATE TABLE types_infraction (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT NOT NULL UNIQUE,
  libelle               TEXT NOT NULL,
  gravite               gravite_infraction NOT NULL,
  points_retires        INT NOT NULL CHECK (points_retires >= 0 AND points_retires <= 20),
  suspend_auto          BOOLEAN NOT NULL DEFAULT FALSE,
  zone_applicable       zone_infraction NOT NULL DEFAULT 'les_deux',
  retrait_definitif_auto BOOLEAN NOT NULL DEFAULT FALSE,
  description           TEXT,
  actif                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 Infractions
CREATE TABLE infractions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id             UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  agent_id                  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  type_infraction_id        UUID NOT NULL REFERENCES types_infraction(id) ON DELETE RESTRICT,
  date_heure                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  localisation              TEXT,
  description               TEXT,
  photos_urls               TEXT[] DEFAULT '{}',
  signature_agent           TEXT,
  signature_conducteur      TEXT,
  statut                    statut_infraction NOT NULL DEFAULT 'declaree',
  sync_id                   UUID UNIQUE,
  zone_constatee            zone_infraction,
  est_recidive              BOOLEAN NOT NULL DEFAULT FALSE,
  nb_recidives              INT     NOT NULL DEFAULT 0,
  conducteur_refuse_signe   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 Temoins d'infractions
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

-- 3.9 Retraits de points (historique)
CREATE TABLE retraits_points (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id  UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  infraction_id  UUID REFERENCES infractions(id) ON DELETE SET NULL,
  formation_id   UUID,
  points_avant   INT NOT NULL,
  points_delta   INT NOT NULL,
  points_apres   INT NOT NULL,
  motif          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 Sanctions
CREATE TABLE sanctions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  infraction_id UUID REFERENCES infractions(id) ON DELETE SET NULL,
  type          type_sanction NOT NULL,
  date_debut    DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin      DATE,
  motif         TEXT NOT NULL,
  decideur_id   UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  levee_le      DATE,
  levee_par     UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT date_fin_coherente CHECK (date_fin IS NULL OR date_fin > date_debut)
);

-- 3.10 Formations de recuperation
CREATE TABLE formations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conducteur_id         UUID NOT NULL REFERENCES conducteurs(id) ON DELETE RESTRICT,
  organisme             TEXT NOT NULL,
  date_debut            DATE NOT NULL,
  date_fin              DATE,
  points_recuperes      INT NOT NULL DEFAULT 0 CHECK (points_recuperes >= 0),
  attestation_url       TEXT,
  statut                statut_formation NOT NULL DEFAULT 'en_cours',
  valide_par            UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  theme                 TEXT,
  formateur_nom         TEXT,
  formateur_qualif      TEXT,
  nb_seances            INT     NOT NULL DEFAULT 1,
  nb_seances_faites     INT     NOT NULL DEFAULT 0,
  duree_par_seance      INT,
  test_reprise_requis   BOOLEAN NOT NULL DEFAULT FALSE,
  test_reprise_resultat resultat_test,
  test_reprise_date     DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK differee : formations -> retraits_points
ALTER TABLE retraits_points
  ADD CONSTRAINT fk_formation
  FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE SET NULL;

-- 3.11 Journal des activites (audit log)
CREATE TABLE journal_activites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  table_cible    TEXT NOT NULL,
  entite_id      UUID,
  avant          JSONB,
  apres          JSONB,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INDEX PERFORMANCES
-- ============================================================
CREATE INDEX idx_conducteurs_statut        ON conducteurs(statut);
CREATE INDEX idx_conducteurs_entreprise    ON conducteurs(entreprise_id);
CREATE INDEX idx_conducteurs_points        ON conducteurs(points_actuels);
CREATE INDEX idx_permis_conducteur         ON permis_internes(conducteur_id);
CREATE INDEX idx_permis_statut             ON permis_internes(statut);
CREATE INDEX idx_permis_expiration         ON permis_internes(date_expiration);
CREATE INDEX idx_infractions_conducteur    ON infractions(conducteur_id);
CREATE INDEX idx_infractions_agent         ON infractions(agent_id);
CREATE INDEX idx_infractions_date          ON infractions(date_heure DESC);
CREATE INDEX idx_infractions_sync_id       ON infractions(sync_id);
CREATE INDEX idx_sanctions_conducteur      ON sanctions(conducteur_id);
CREATE INDEX idx_formations_conducteur     ON formations(conducteur_id);
CREATE INDEX idx_journal_utilisateur       ON journal_activites(utilisateur_id);
CREATE INDEX idx_journal_created           ON journal_activites(created_at DESC);

-- ============================================================
-- 5. TRIGGERS -- updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entreprises_updated     BEFORE UPDATE ON entreprises     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_utilisateurs_updated    BEFORE UPDATE ON utilisateurs     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conducteurs_updated     BEFORE UPDATE ON conducteurs      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permis_updated          BEFORE UPDATE ON permis_internes  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_infractions_updated     BEFORE UPDATE ON infractions      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_formations_updated      BEFORE UPDATE ON formations       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. TRIGGER -- Calcul automatique des points apres infraction
-- ============================================================
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

CREATE TRIGGER trg_infraction_points
  AFTER INSERT ON infractions
  FOR EACH ROW EXECUTE FUNCTION traiter_infraction();

-- ============================================================
-- 7. TRIGGER -- Recuperation de points apres formation validee
-- ============================================================
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
          statut = CASE WHEN statut IN ('suspendu', 'retire') AND v_points_apres > 0 THEN 'actif'::statut_conducteur ELSE statut END
    WHERE id = NEW.conducteur_id;

    INSERT INTO retraits_points (conducteur_id, formation_id, points_avant, points_delta, points_apres, motif)
    VALUES (NEW.conducteur_id, NEW.id, v_points_avant, NEW.points_recuperes, v_points_apres,
            'Recuperation - Formation : ' || NEW.organisme);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_formation_validation
  AFTER UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION traiter_formation_validee();

-- ============================================================
-- 8. TRIGGER -- Expiration automatique des permis (pg_cron)
-- ============================================================
CREATE OR REPLACE FUNCTION verifier_expiration_permis()
RETURNS VOID AS $$
BEGIN
  UPDATE permis_internes
    SET statut = 'expire'
  WHERE statut = 'valide'
    AND date_expiration < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('verifier-permis-expiration', '0 6 * * *', 'SELECT verifier_expiration_permis()');

-- ============================================================
-- 9. TRIGGER -- Detection de recidive (BEFORE INSERT infractions)
-- ============================================================
CREATE OR REPLACE FUNCTION detecter_recidive()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM infractions
  WHERE conducteur_id      = NEW.conducteur_id
    AND type_infraction_id = NEW.type_infraction_id
    AND created_at         >= NOW() - INTERVAL '12 months';

  IF v_count > 0 THEN
    NEW.est_recidive := TRUE;
    NEW.nb_recidives := v_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detecter_recidive
  BEFORE INSERT ON infractions
  FOR EACH ROW EXECUTE FUNCTION detecter_recidive();

-- ============================================================
-- 10. TRIGGER -- Formation obligatoire apres retrait definitif
-- ============================================================
CREATE OR REPLACE FUNCTION creer_formation_obligatoire()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'retrait_definitif' THEN
    INSERT INTO formations (
      conducteur_id, organisme, theme,
      nb_seances, nb_seances_faites,
      test_reprise_requis, date_debut,
      statut, points_recuperes
    ) VALUES (
      NEW.conducteur_id,
      'BOTO SA — Formation interne',
      'Remise à niveau sécurité — Suite retrait définitif',
      5, 0, TRUE,
      CURRENT_DATE,
      'en_cours', 10
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_formation_obligatoire
  AFTER INSERT ON sanctions
  FOR EACH ROW EXECUTE FUNCTION creer_formation_obligatoire();

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE entreprises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conducteurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE permis_internes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests_conduite      ENABLE ROW LEVEL SECURITY;
ALTER TABLE types_infraction    ENABLE ROW LEVEL SECURITY;
ALTER TABLE infractions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE temoins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE retraits_points     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_activites   ENABLE ROW LEVEL SECURITY;

-- Helper : recuperer le role de l'utilisateur connecte
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS role_utilisateur AS $$
  SELECT role FROM utilisateurs WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- Policies : Administrateur (acces total) ----
CREATE POLICY "admin_all" ON entreprises       FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON utilisateurs            FOR ALL    USING (get_user_role() = 'admin');
CREATE POLICY "self_read_utilisateur"              ON utilisateurs FOR SELECT USING (id = auth.uid());
CREATE POLICY "hse_sst_read_utilisateurs"          ON utilisateurs FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "admin_all" ON conducteurs       FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON permis_internes   FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON tests_conduite    FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "hse_sst_read_tests"     ON tests_conduite FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_insert_tests"   ON tests_conduite FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_update_tests"   ON tests_conduite FOR UPDATE USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "direction_read_tests"   ON tests_conduite FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "admin_all" ON types_infraction  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON infractions       FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON retraits_points   FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON sanctions         FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON formations        FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all" ON journal_activites FOR ALL USING (get_user_role() = 'admin');

-- ---- Policies : HSE & SST ----
CREATE POLICY "hse_sst_read_conducteurs"     ON conducteurs      FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_permis"          ON permis_internes  FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_infractions"     ON infractions      FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_sanctions"       ON sanctions        FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_formations"      ON formations       FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_entreprises"     ON entreprises      FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_retraits"        ON retraits_points  FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_read_types"           ON types_infraction FOR SELECT USING (get_user_role() IN ('hse','sst'));

CREATE POLICY "hse_sst_write_permis"         ON permis_internes  FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_update_permis"        ON permis_internes  FOR UPDATE USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_write_infraction"     ON infractions      FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_write_sanction"       ON sanctions        FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_update_formation"     ON formations       FOR UPDATE USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_write_conducteur"     ON conducteurs      FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_update_conducteur"    ON conducteurs      FOR UPDATE USING (get_user_role() IN ('hse','sst'));

-- ---- Policies : Direction 3ST (lecture seule) ----
CREATE POLICY "direction_read_conducteurs"   ON conducteurs      FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_permis"        ON permis_internes  FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_infractions"   ON infractions      FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_sanctions"     ON sanctions        FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_formations"    ON formations       FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_entreprises"   ON entreprises      FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "direction_read_retraits"      ON retraits_points  FOR SELECT USING (get_user_role() = 'direction');

-- ---- Policies : Agent terrain ----
CREATE POLICY "agent_read_conducteurs"       ON conducteurs      FOR SELECT USING (get_user_role() = 'agent');
CREATE POLICY "agent_read_permis"            ON permis_internes  FOR SELECT USING (get_user_role() = 'agent');
CREATE POLICY "agent_read_types"             ON types_infraction FOR SELECT USING (get_user_role() = 'agent');
CREATE POLICY "agent_write_infraction"       ON infractions      FOR INSERT WITH CHECK (get_user_role() = 'agent' AND agent_id = auth.uid());
CREATE POLICY "agent_read_infraction"        ON infractions      FOR SELECT USING (get_user_role() = 'agent' AND agent_id = auth.uid());

-- ---- Policies : Temoins ----
CREATE POLICY "admin_all_temoins"       ON temoins FOR ALL    USING (get_user_role() = 'admin');
CREATE POLICY "hse_sst_read_temoins"   ON temoins FOR SELECT USING (get_user_role() IN ('hse','sst'));
CREATE POLICY "hse_sst_write_temoins"  ON temoins FOR INSERT WITH CHECK (get_user_role() IN ('hse','sst','agent'));
CREATE POLICY "direction_read_temoins" ON temoins FOR SELECT USING (get_user_role() = 'direction');
CREATE POLICY "agent_read_temoins"     ON temoins FOR SELECT USING (get_user_role() = 'agent');

-- ============================================================
-- 10. DONNEES DE REFERENCE -- Bareme types d'infraction
-- ============================================================
INSERT INTO types_infraction (code, libelle, gravite, points_retires, suspend_auto) VALUES
  ('VIT-01', 'Exces de vitesse mineur (< 20 km/h)',         'mineure',   2,  FALSE),
  ('VIT-02', 'Exces de vitesse majeur (> 20 km/h)',         'majeure',   4,  FALSE),
  ('VIT-03', 'Exces de vitesse critique (> 50 km/h)',       'critique',  8,  TRUE),
  ('ALC-01', 'Conduite sous influence alcool (taux mineur)','majeure',   6,  TRUE),
  ('ALC-02', 'Conduite sous influence alcool (taux eleve)', 'critique',  20, TRUE),
  ('SEC-01', 'Non-port de la ceinture de securite',         'mineure',   2,  FALSE),
  ('SEC-02', 'Non-port des EPI obligatoires',               'mineure',   2,  FALSE),
  ('SEC-03', 'Utilisation telephone en conduisant',         'majeure',   4,  FALSE),
  ('PRI-01', 'Non-respect des priorites',                   'majeure',   4,  FALSE),
  ('SIG-01', 'Non-respect des panneaux de signalisation',   'mineure',   2,  FALSE),
  ('ACC-01', 'Accident avec dommages materiels',            'majeure',   6,  FALSE),
  ('ACC-02', 'Accident corporel',                           'critique',  10, TRUE),
  ('AUT-01', 'Conduite sans permis interne valide',         'critique',  20, TRUE),
  ('ZON-01', 'Acces zone interdite',                        'majeure',   4,  FALSE),
  ('SOM-01', 'Conduite en etat de fatigue averee',          'majeure',   4,  TRUE);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
