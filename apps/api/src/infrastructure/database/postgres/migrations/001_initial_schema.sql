-- Migración Inicial de PostgreSQL para Oomfy
CREATE TABLE IF NOT EXISTS oomfy (
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

ALTER TABLE oomfy ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS session (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES oomfy(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip VARCHAR(64) NOT NULL,
    platform VARCHAR(64) NOT NULL,
    token TEXT NOT NULL
);

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session' AND column_name='oomfy_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session' AND column_name='user_id') THEN 
    ALTER TABLE session RENAME COLUMN oomfy_id TO user_id; 
  END IF; 
END $$;

CREATE TABLE IF NOT EXISTS icon (
    id UUID PRIMARY KEY REFERENCES oomfy(id) ON DELETE CASCADE,
    url TEXT,
    delete_url TEXT,
    source VARCHAR(20) DEFAULT 'other',
    imgbb_id VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS banner (
    id UUID PRIMARY KEY REFERENCES oomfy(id) ON DELETE CASCADE,
    url TEXT,
    delete_url TEXT,
    source VARCHAR(20) DEFAULT 'other',
    imgbb_id VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS chat (
    id UUID PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'private' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS participant (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES oomfy(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,
    UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS message (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES oomfy(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'sent' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oomfy_username ON oomfy(username);
CREATE INDEX IF NOT EXISTS idx_oomfy_email ON oomfy(email);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_chat_user ON participant(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_chat_created ON message(chat_id, created_at DESC);
