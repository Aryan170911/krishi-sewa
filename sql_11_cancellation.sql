-- Order cancellation request flow
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_resolved_by TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_cancel_pending ON orders(cancellation_requested) WHERE cancellation_requested = true AND status NOT IN ('cancelled', 'refunded');

INSERT INTO schema_migrations (version, name) VALUES
  (11, 'sql_11_cancellation - order cancellation request flow')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
