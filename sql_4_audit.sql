-- Run this FOURTH
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT,
  details JSONB,
  ip TEXT,
  username TEXT
);
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
