CREATE TABLE IF NOT EXISTS password_reset (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES oomfy(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(token);

