-- Product reviews table (user-submitted)
CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL CHECK (length(trim(body)) >= 5 AND length(body) <= 2000),
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Each user can only review a product once
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON product_reviews(user_email, product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(rating) WHERE deleted_at IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpful votes (who voted on what review)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id BIGINT NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_email)
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Insert into schema_migrations
INSERT INTO schema_migrations (version, name) VALUES
  (9, 'sql_9_reviews - product_reviews + review_helpful_votes')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
