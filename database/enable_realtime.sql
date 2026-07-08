-- ============================================================
-- Activation Supabase Realtime pour les tables 3ST
-- Idempotent — peut être rejoué sans danger
-- ============================================================

-- REPLICA IDENTITY FULL : inclure l'ancienne ET la nouvelle
-- ligne dans chaque event (UPDATE/DELETE lisibles côté client)
ALTER TABLE infractions      REPLICA IDENTITY FULL;
ALTER TABLE sanctions        REPLICA IDENTITY FULL;
ALTER TABLE formations       REPLICA IDENTITY FULL;
ALTER TABLE conducteurs      REPLICA IDENTITY FULL;
ALTER TABLE permis_internes  REPLICA IDENTITY FULL;
ALTER TABLE temoins          REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication supabase_realtime
-- (idempotent : on vérifie avant d'exécuter)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'infractions',
    'sanctions',
    'formations',
    'conducteurs',
    'permis_internes',
    'temoins'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Realtime activé : %', t;
    ELSE
      RAISE NOTICE 'Realtime déjà actif : %', t;
    END IF;
  END LOOP;
END$$;
