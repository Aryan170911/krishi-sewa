-- Run this in Supabase SQL Editor after the 4 main tables
-- Creates support system tables

-- ============================================
-- ADMIN PROFILES (separate from regular users)
-- Used for support staff login
-- ============================================
CREATE TABLE IF NOT EXISTS admin_profiles (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',  -- admin | superadmin
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ============================================
-- SUPPORT CHATS (one per conversation)
-- ============================================
CREATE TABLE IF NOT EXISTS support_chats (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT,
  category TEXT DEFAULT 'general',  -- order | account | general
  status TEXT DEFAULT 'open',  -- open | assigned | closed
  assigned_admin_email TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_for_admin INT DEFAULT 0,
  unread_for_user INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chats_user_email ON support_chats(user_email);
CREATE INDEX IF NOT EXISTS idx_chats_status ON support_chats(status);

-- ============================================
-- SUPPORT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  chat_id INT NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,  -- user | admin | system
  sender_email TEXT,
  sender_name TEXT,
  message TEXT NOT NULL,
  metadata JSONB,  -- quick reply payload, order context, etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON support_messages(chat_id);

-- ============================================
-- SUPPORT ACTIVITY LOG (audit trail)
-- Every admin action on user data is logged here
-- ============================================
CREATE TABLE IF NOT EXISTS support_activity_log (
  id SERIAL PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,  -- email_change | password_reset | order_view | chat_close | chat_assign
  target_user_email TEXT,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_admin ON support_activity_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_activity_target ON support_activity_log(target_user_email);

ALTER TABLE admin_profiles         DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_chats          DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_activity_log   DISABLE ROW LEVEL SECURITY;

-- Seed default superadmin (password: admin123, hashed with scrypt)
-- Will be inserted on first server start if table is empty
