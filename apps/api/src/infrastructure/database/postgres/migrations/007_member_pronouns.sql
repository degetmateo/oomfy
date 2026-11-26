-- Añadir columna pronouns a members y refrescar vista de compatibilidad
ALTER TABLE members ADD COLUMN IF NOT EXISTS pronouns VARCHAR(32) NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'oomfy') THEN
    CREATE OR REPLACE VIEW oomfy AS SELECT * FROM members;
  END IF;
END $$;
