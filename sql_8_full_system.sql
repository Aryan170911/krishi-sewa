-- ============================================================
-- FULL DB SYSTEM OVERHAUL
-- Run in Supabase SQL Editor AFTER sql_6_hardening.sql
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- 1. SOFT DELETES — add deleted_at to all user-facing tables
-- ============================================================
ALTER TABLE users            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE orders           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE support_chats    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deleted   ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted  ON orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. FULL-TEXT SEARCH — add tsvector columns
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE OR REPLACE FUNCTION products_search_update() RETURNS TRIGGER AS $$
DECLARE
  tags_text TEXT;
BEGIN
  -- Handle tags as either jsonb array or text array
  BEGIN
    tags_text := array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.tags, '[]'::jsonb))),
      ' '
    );
  EXCEPTION WHEN OTHERS THEN
    tags_text := '';
  END;
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(tags_text, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search ON products;
CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_update();

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(search_vector);

-- Backfill search_vector for existing products
UPDATE products SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(short_description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- ============================================================
-- 3. SESSIONS — server-side session tracking (for revocation)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,  -- hashed session token
  device_info TEXT,                  -- user agent, OS, browser
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(expires_at) WHERE revoked_at IS NULL;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. USER DEVICES — track and allow device management
-- ============================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  device_id TEXT NOT NULL,            -- cookie-stored device ID
  device_name TEXT,                    -- "iPhone 15", "Chrome on Windows"
  device_type TEXT,                    -- mobile, desktop, tablet
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  trusted BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, device_id)
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON user_devices(user_email);
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. SAVED ADDRESSES — multiple addresses per user
-- ============================================================
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  label TEXT DEFAULT 'Home',           -- Home, Work, Other
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  landmark TEXT,
  city TEXT,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON user_addresses(user_email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_addresses_default ON user_addresses(user_email, is_default) WHERE is_default = true;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_addresses_updated_at ON user_addresses;
CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. CART — server-side cart for cross-device sync
-- ============================================================
CREATE TABLE IF NOT EXISTS user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carts_user ON user_carts(user_email);
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_carts_updated_at ON user_carts;
CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON user_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. WISHLIST — saved products
-- ============================================================
CREATE TABLE IF NOT EXISTS user_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON user_wishlist(user_email);
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. ORDER EVENTS — full status history per order
-- ============================================================
CREATE TABLE IF NOT EXISTS order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- created, paid, shipped, delivered, cancelled, refunded
  actor_email TEXT,           -- user or admin who triggered
  actor_type TEXT,            -- user, admin, system
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_type ON order_events(event_type);
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. PASSWORD RESET TOKENS — secure reset flow
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON password_reset_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token_hash);
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: trigger to delete expired tokens after 24h
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '24 hours';
  DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '7 days';
  DELETE FROM rate_limit_log WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. EMAIL VERIFICATION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verify_email ON email_verification_tokens(user_email);
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. EMAIL NOTIFICATIONS LOG — track all emails sent
-- ============================================================
CREATE TABLE IF NOT EXISTS email_notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,                -- order_confirmed, password_reset, etc
  resend_id TEXT,               -- Resend API message ID
  status TEXT DEFAULT 'sent',   -- sent, failed, bounced
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_notif_recipient ON email_notifications(recipient, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notif_status ON email_notifications(status);
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. USER PREFERENCES — notification settings, theme, etc
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_email TEXT PRIMARY KEY,
  email_order_updates BOOLEAN DEFAULT true,
  email_promotions BOOLEAN DEFAULT true,
  email_support_replies BOOLEAN DEFAULT true,
  sms_order_updates BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  currency TEXT DEFAULT 'INR',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_prefs_updated_at ON user_preferences;
CREATE TRIGGER trg_prefs_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 13. API KEYS — admin programmatic access
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,         -- hashed key
  key_prefix TEXT NOT NULL,              -- first 8 chars for display (e.g., "ks_live_a1b2...")
  scope TEXT DEFAULT 'read',            -- read, write, admin
  created_by TEXT,                       -- admin email
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 14. WEBHOOKS — outgoing webhooks for events
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,                -- ['order.created', 'order.paid', etc]
  secret TEXT NOT NULL,                  -- for HMAC signing
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  last_triggered_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = true;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 15. WEBHOOK DELIVERIES — log of all webhook attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  duration_ms INT,
  attempt INT DEFAULT 1,
  success BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_webhook ON webhook_deliveries(webhook_id, created_at DESC);
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 16. SUPPORT ASSIGNMENTS — track who handles which chat
-- ============================================================
CREATE TABLE IF NOT EXISTS support_assignments (
  id BIGSERIAL PRIMARY KEY,
  chat_id INT NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_assign_chat ON support_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_assign_admin ON support_assignments(admin_email);
ALTER TABLE support_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 17. SUPPORT READ RECEIPTS — track when each party read
-- ============================================================
CREATE TABLE IF NOT EXISTS support_read_receipts (
  id BIGSERIAL PRIMARY KEY,
  chat_id INT NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  reader_type TEXT NOT NULL,             -- user, admin
  reader_email TEXT,
  last_read_message_id INT,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, reader_type)
);
ALTER TABLE support_read_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. SUPPORT TYPING INDICATORS — real-time presence
-- ============================================================
CREATE TABLE IF NOT EXISTS support_typing (
  id BIGSERIAL PRIMARY KEY,
  chat_id INT NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_typing_chat ON support_typing(chat_id, updated_at DESC);
ALTER TABLE support_typing ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 19. SUPPORT ATTACHMENTS — files in chat
-- ============================================================
CREATE TABLE IF NOT EXISTS support_attachments (
  id BIGSERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  storage_path TEXT NOT NULL,            -- Supabase storage path
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attach_msg ON support_attachments(message_id);
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 20. DATA RETENTION POLICY — function to enforce
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_data_retention() RETURNS void AS $$
BEGIN
  -- Anonymize users inactive for 3+ years
  UPDATE users SET
    name = 'Deleted User',
    password_hash = 'REDACTED',
    email = 'deleted_' || id || '@redacted.local'
  WHERE last_login_at < NOW() - INTERVAL '3 years'
    AND email NOT LIKE 'deleted_%@redacted.local';
  -- Soft-delete closed support chats older than 1 year
  UPDATE support_chats SET deleted_at = NOW()
  WHERE status = 'closed' AND closed_at < NOW() - INTERVAL '1 year'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 21. DAILY STATS MATERIALIZED VIEW (for analytics)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
SELECT
  DATE(created_at) AS day,
  COUNT(*)::int AS new_users,
  SUM(total)::numeric AS revenue,
  COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders
FROM orders
WHERE deleted_at IS NULL
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_day ON daily_stats(day);

-- ============================================================
-- 22. RLS POLICIES — block anon/authenticated, allow service_role
-- ============================================================
-- Note: service_role bypasses RLS by default in Supabase.
-- We add explicit policies to block anon and authenticated roles.

-- Drop existing if any (in case of re-run)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- For each new table, add a policy that:
-- - Blocks anon and authenticated (no direct access)
-- - service_role bypasses RLS automatically

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'user_sessions', 'user_devices', 'user_addresses', 'user_carts',
    'user_wishlist', 'order_events', 'password_reset_tokens',
    'email_verification_tokens', 'email_notifications',
    'user_preferences', 'api_keys', 'webhooks', 'webhook_deliveries',
    'support_assignments', 'support_read_receipts', 'support_typing',
    'support_attachments'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY block_direct_access ON %I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
  END LOOP;
END$$;

-- ============================================================
-- 23. GRANT minimal permissions to anon (for any public reads)
-- ============================================================
-- Most tables: no anon access
-- products: anon can read (for the public catalog)

DO $$
BEGIN
  EXECUTE 'ALTER TABLE products ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY public_read_products ON products FOR SELECT TO anon, authenticated USING (in_stock = true AND deleted_at IS NULL)';
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- Categories, events, states, districts, pincode lookup: still public
-- (already exposed via REST API in server.js)

-- ============================================================
-- 24. MAINTENANCE VIEWS for admin dashboard
-- ============================================================
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS total_users,
  (SELECT COUNT(*)::int FROM users WHERE email_verified = true AND deleted_at IS NULL) AS verified_users,
  (SELECT COUNT(*)::int FROM orders WHERE deleted_at IS NULL) AS total_orders,
  (SELECT COALESCE(SUM(total), 0)::numeric FROM orders WHERE deleted_at IS NULL AND status != 'cancelled') AS total_revenue,
  (SELECT COUNT(*)::int FROM orders WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL) AS orders_this_week,
  (SELECT COUNT(*)::int FROM products WHERE deleted_at IS NULL) AS total_products,
  (SELECT COUNT(*)::int FROM products WHERE in_stock = true AND deleted_at IS NULL) AS in_stock_products,
  (SELECT COUNT(*)::int FROM support_chats WHERE status != 'closed' AND deleted_at IS NULL) AS open_chats,
  (SELECT COUNT(*)::int FROM support_chats WHERE status = 'closed' AND deleted_at IS NULL) AS closed_chats,
  (SELECT COUNT(*)::int FROM support_messages WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL) AS messages_today;

-- ============================================================
-- 25. SUPPORT TICKET ANALYTICS VIEW
-- ============================================================
CREATE OR REPLACE VIEW support_ticket_analytics AS
SELECT
  category,
  status,
  COUNT(*)::int AS count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at)) / 60)::numeric(10,2) AS avg_lifetime_minutes,
  AVG(EXTRACT(EPOCH FROM (last_message_at - created_at)) / 60)::numeric(10,2) AS avg_first_response_minutes
FROM support_chats
WHERE deleted_at IS NULL
GROUP BY category, status;

-- ============================================================
-- 26. SCHEMA VERSION TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO schema_migrations (version, name) VALUES
  (6, 'sql_6_hardening - constraints/indexes/triggers'),
  (7, 'sql_7_verify - verification queries'),
  (8, 'sql_8_full_system - sessions/devices/addresses/cart/wishlist/etc')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- ============================================================
-- 27. REFRESH MATERIALIZED VIEW
-- ============================================================
REFRESH MATERIALIZED VIEW daily_stats;

-- ============================================================
-- DONE
-- Verify with: SELECT * FROM schema_migrations;
-- ============================================================
