-- Add search_products RPC function
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_products(query_text TEXT, max_results INT DEFAULT 30)
RETURNS SETOF products AS $$
  SELECT *
  FROM products
  WHERE deleted_at IS NULL
    AND in_stock = true
    AND search_vector @@ plainto_tsquery('english', query_text)
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', query_text)) DESC
  LIMIT max_results;
$$ LANGUAGE sql STABLE;
