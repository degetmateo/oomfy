-- Sincronización de nombres de tablas y colecciones a 'members'
DO $$
BEGIN
  -- Si existe la tabla 'oomfy' y no existe 'members', renombramos la tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oomfy')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    ALTER TABLE oomfy RENAME TO members;
  END IF;

  -- Aseguramos que la tabla members exista
  CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    bio TEXT,
    location VARCHAR(32),
    link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- Renombrar o crear índices correspondientes para 'members'
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_oomfy_username') THEN
    ALTER INDEX idx_oomfy_username RENAME TO idx_members_username;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_oomfy_email') THEN
    ALTER INDEX idx_oomfy_email RENAME TO idx_members_email;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
  END IF;

  -- Vista de compatibilidad hacia atrás para evitar cualquier rotura
  CREATE OR REPLACE VIEW oomfy AS SELECT * FROM members;
END $$;

