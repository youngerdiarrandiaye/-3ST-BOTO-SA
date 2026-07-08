-- Migration v6 : Service d'appartenance des agents
-- À exécuter dans Supabase Studio → SQL Editor

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS service TEXT
    CHECK (service IN ('3st', 'sst_hse'));

COMMENT ON COLUMN utilisateurs.service IS
  'Service d''appartenance de l''agent : 3st = opérationnel site minier, sst_hse = santé sécurité environnement';
