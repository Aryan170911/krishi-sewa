-- Run this SECOND
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
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
