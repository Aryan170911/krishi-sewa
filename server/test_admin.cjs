// Quick smoke test for the support admin endpoints.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node test_admin.cjs
// Loads .env from the project root automatically if present.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}
const sb = createClient(url, key);
(async () => {
  const r = await sb.from('admin_profiles').select('*').limit(5);
  console.log('admin_profiles:', JSON.stringify(r, null, 2));
})();
