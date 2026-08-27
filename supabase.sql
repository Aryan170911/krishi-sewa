-- Krishi Sewa - Supabase (Postgres) Schema
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Paste -> Run
-- Then set SUPABASE_SECRET_KEY (service_role) and SUPABASE_PUBLISHABLE_KEY in env

-- ============================================
-- USERS (auth) - stores email, name, scrypt password hash
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  image TEXT,
  category TEXT DEFAULT 'seeds',
  tags JSONB DEFAULT '[]'::jsonb,
  in_stock BOOLEAN DEFAULT true,
  rating NUMERIC DEFAULT 4.5,
  review_count INT DEFAULT 0,
  specifications JSONB DEFAULT '{}'::jsonb,
  reviews JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS (linked to user by email)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  user_name TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC,
  discount NUMERIC,
  shipping NUMERIC,
  total NUMERIC,
  address JSONB,
  payment_method TEXT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT,
  details JSONB,
  ip TEXT,
  username TEXT
);

-- ============================================
-- RLS - service_role bypasses; anon gets nothing
-- ============================================
ALTER TABLE users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE products  DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders    DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED products: backend auto-seeds if table empty on first GET
-- ============================================
