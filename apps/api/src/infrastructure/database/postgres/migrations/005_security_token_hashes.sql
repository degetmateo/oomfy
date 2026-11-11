-- Hito 49: tokens opacos de un solo uso y hashes para sesiones
CREATE TABLE IF NOT EXISTS verification_token (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_token_hash ON verification_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_token_user ON verification_token(user_id);

ALTER TABLE session
    ADD COLUMN IF NOT EXISTS previous_token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_prev_token ON session(previous_token_hash);
CREATE INDEX IF NOT EXISTS idx_members_username_lower ON members (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_members_email_lower ON members (LOWER(email));

DELETE FROM password_reset WHERE expires_at <= NOW();
DELETE FROM session WHERE created_at <= NOW() - INTERVAL '30 days';

