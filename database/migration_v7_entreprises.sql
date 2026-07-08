-- ============================================================
-- MIGRATION V7 — Seed entreprises réelles site minier
-- MineAxis MANAGEM | 3ST — 40 entreprises
-- ============================================================

-- Étape 1 : ajouter contrainte UNIQUE sur nom (si pas déjà là)
ALTER TABLE entreprises
  ADD CONSTRAINT entreprises_nom_unique UNIQUE (nom);

-- Étape 2 : insérer les entreprises, ignorer si déjà existant
INSERT INTO entreprises (nom, type, actif) VALUES
  -- Internes
  ('3ST',                    'interne',       TRUE),
  ('ACADEMIE 3ST',           'interne',       TRUE),

  -- Partenaires principaux
  ('MANAGEM',                'partenaire',    TRUE),
  ('VIVO ENERGY',            'partenaire',    TRUE),
  ('WARTSILA',               'partenaire',    TRUE),

  -- Sous-traitants (ordre alphabétique)
  ('ACRGT',                  'sous_traitant', TRUE),
  ('ALAM',                   'sous_traitant', TRUE),
  ('ALS',                    'sous_traitant', TRUE),
  ('APS',                    'sous_traitant', TRUE),
  ('ARGOS',                  'sous_traitant', TRUE),
  ('BATIFORT',               'sous_traitant', TRUE),
  ('BOTO SA',                'sous_traitant', TRUE),
  ('CADEX',                  'sous_traitant', TRUE),
  ('CARTEL',                 'sous_traitant', TRUE),
  ('CHALLENGE 2000',         'sous_traitant', TRUE),
  ('DR SETT',                'sous_traitant', TRUE),
  ('E-A-T-S',                'sous_traitant', TRUE),
  ('EIFFAGE',                'sous_traitant', TRUE),
  ('EPC MINEEX',             'sous_traitant', TRUE),
  ('FTE',                    'sous_traitant', TRUE),
  ('GMIC',                   'sous_traitant', TRUE),
  ('GLOBAL AVIATION',        'sous_traitant', TRUE),
  ('HERACLES SECURITE',      'sous_traitant', TRUE),
  ('KSI',                    'sous_traitant', TRUE),
  ('KMTS',                   'sous_traitant', TRUE),
  ('LOCASEN',                'sous_traitant', TRUE),
  ('MCI',                    'sous_traitant', TRUE),
  ('MINEEX',                 'sous_traitant', TRUE),
  ('MOTA ENGIL',             'sous_traitant', TRUE),
  ('NEEMBA/MOTA',            'sous_traitant', TRUE),
  ('PARAGON TAILINGS',       'sous_traitant', TRUE),
  ('SCM',                    'sous_traitant', TRUE),
  ('SCS',                    'sous_traitant', TRUE),
  ('SENECARTOURS',           'sous_traitant', TRUE),
  ('SENECARTOURS/MOTA',      'sous_traitant', TRUE),
  ('SHIELD',                 'sous_traitant', TRUE),
  ('SMT',                    'sous_traitant', TRUE),
  ('SOLEVO SN',              'sous_traitant', TRUE),
  ('WAKILO',                 'sous_traitant', TRUE),
  ('entreprise Aliou diop',  'sous_traitant', TRUE)

ON CONFLICT (nom) DO NOTHING;
