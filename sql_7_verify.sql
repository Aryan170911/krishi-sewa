-- Verify hardening migration applied correctly
-- Run in Supabase SQL Editor after sql_6_hardening.sql

-- 1. Check all tables have updated_at
SELECT table_name,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'updated_at'
  AND table_name IN ('users', 'products', 'orders', 'audit_log',
                     'support_chats', 'support_messages', 'support_activity_log',
                     'rate_limit_log', 'admin_profiles')
ORDER BY table_name;

-- 2. Check all CHECK constraints
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN (
    'users', 'products', 'orders', 'audit_log',
    'support_chats', 'support_messages', 'support_activity_log',
    'admin_profiles'
  )
ORDER BY conrelid::regclass, conname;

-- 3. Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('users', 'products', 'orders', 'audit_log',
                              'support_chats', 'support_messages',
                              'rate_limit_log')
ORDER BY event_object_table, trigger_name;

-- 4. Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'products', 'orders', 'audit_log',
                    'support_chats', 'support_messages', 'support_activity_log',
                    'rate_limit_log')
ORDER BY tablename, indexname;

-- 5. Test: try to UPDATE audit_log (should fail)
-- UPDATE audit_log SET action = 'test' WHERE id = 1;
-- Expected: ERROR: audit_log is append-only

-- 6. Test: try to DELETE audit_log (should fail)
-- DELETE FROM audit_log WHERE id = 1;
-- Expected: ERROR: audit_log is append-only
