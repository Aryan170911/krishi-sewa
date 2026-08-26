-- Krishi Sewa — Supabase (Postgres) Schema
-- Run in Supabase Dashboard → SQL Editor → Paste → Run
-- Then set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / hosting env

-- Products
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

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, -- #KS-XXXXXX
  date TIMESTAMPTZ DEFAULT NOW(),
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

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT,
  details JSONB,
  ip TEXT,
  username TEXT
);

-- Enable RLS (disable for service_role, or add policies)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- Seed products (run once)
-- INSERT INTO products (name, description, short_description, price, original_price, image, category, tags, in_stock, rating, review_count, specifications, reviews)
-- VALUES (...) -- will be auto-seeded by backend if empty
