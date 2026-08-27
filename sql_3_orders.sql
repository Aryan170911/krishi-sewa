-- Run this THIRD
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
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
