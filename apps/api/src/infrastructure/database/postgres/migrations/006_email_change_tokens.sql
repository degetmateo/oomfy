-- Hito 54: tokens de confirmación para cambio de correo electrónico
CREATE TABLE IF NOT EXISTS email_change_token (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    new_email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_change_token_hash ON email_change_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_change_token_user ON email_change_token(user_id);
