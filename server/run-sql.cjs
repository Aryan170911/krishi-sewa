// Run sql_6_hardening.sql against Supabase Postgres
// Usage: SUPABASE_DB_PASSWORD=xxx node run-sql.cjs [path/to/file.sql]
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const sqlPath = process.argv[2] || path.join(__dirname, "..", "sql_6_hardening.sql");
let sql = fs.readFileSync(sqlPath, "utf8");

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error("✗ Set SUPABASE_DB_PASSWORD env var first");
  console.error("  Get it from: https://supabase.com/dashboard/project/xypizzylruvgcglhyiyb/settings/database");
  process.exit(1);
}

const connStr = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.xypizzylruvgcglhyiyb.supabase.co:5432/postgres`;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log("✓ Connected to Supabase Postgres");

    // Pre-fix any data that violates the new constraints
    console.log("Pre-fixing data...");
    const fixAdmins = await client.query("UPDATE admin_profiles SET email = 'admin@krishi-sewa.local' WHERE email NOT LIKE '%@%.%' RETURNING id, email");
    console.log("Fixed admins:", fixAdmins.rows);

    // Check user emails
    const badUsers = await client.query("SELECT email FROM users WHERE email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'");
    console.log("Bad user emails:", badUsers.rows);

    // Check audit log actions
    const badActions = await client.query("SELECT action FROM audit_log WHERE length(trim(action)) < 1 OR length(action) > 200");
    console.log("Bad audit actions:", badActions.rows.length);

    // Check support_messages
    const badMsgs = await client.query("SELECT id, length(message) as len FROM support_messages WHERE length(trim(message)) < 1 OR length(message) > 5000");
    console.log("Bad messages:", badMsgs.rows);

    console.log("Running:", sqlPath, "(" + sql.length + " chars)");
    await client.query(sql);
    console.log("✓ Migration applied successfully");

    // Run verification
    console.log("\n=== VERIFICATION ===");
    const updatedAt = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'updated_at'
        AND table_name IN ('users', 'products', 'orders', 'audit_log',
                           'support_chats', 'support_messages', 'support_activity_log',
                           'rate_limit_log', 'admin_profiles')
      ORDER BY table_name
    `);
    console.log("\nupdated_at columns (" + updatedAt.rows.length + "):");
    updatedAt.rows.forEach(r => console.log("  ✓ " + r.table_name));

    const constraints = await client.query(`
      SELECT conname, conrelid::regclass::text AS table_name
      FROM pg_constraint
      WHERE contype = 'c' AND connamespace = 'public'::regnamespace
        AND conrelid::regclass::text IN ('users', 'products', 'orders', 'audit_log',
                                          'support_chats', 'support_messages', 'support_activity_log', 'admin_profiles')
      ORDER BY conrelid::regclass, conname
    `);
    console.log("\nCHECK constraints (" + constraints.rows.length + "):");
    constraints.rows.forEach(r => console.log("  ✓ " + r.table_name + " -> " + r.conname));

    const triggers = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    console.log("\nTriggers (" + triggers.rows.length + "):");
    triggers.rows.forEach(r => console.log("  ✓ " + r.event_object_table + " -> " + r.trigger_name));

    const indexes = await client.query(`
      SELECT tablename, indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'products', 'orders', 'audit_log',
                          'support_chats', 'support_messages', 'support_activity_log', 'rate_limit_log')
      ORDER BY tablename, indexname
    `);
    console.log("\nIndexes (" + indexes.rows.length + "):");
    indexes.rows.forEach(r => console.log("  ✓ " + r.tablename + " -> " + r.indexname));

    // Test append-only audit_log (try a fresh test row)
    console.log("\n=== Testing append-only audit_log ===");
    try {
      const ins = await client.query("INSERT INTO audit_log (action, details) VALUES ('test_trigger', '{}'::jsonb) RETURNING id");
      const testId = ins.rows[0].id;
      console.log("  Inserted test row id=" + testId);
      try {
        await client.query("UPDATE audit_log SET action = 'test' WHERE id = $1", [testId]);
        console.log("  ✗ FAILED: UPDATE was allowed on new row");
        await client.query("DELETE FROM audit_log WHERE id = $1", [testId]);
      } catch (e) {
        console.log("  ✓ UPDATE blocked: " + e.message);
        await client.query("DELETE FROM audit_log WHERE id = $1", [testId]);
        console.log("  ✗ DELETE also blocked (should be allowed for cleanup): " + e.message);
      }
    } catch (e) {
      console.log("  Could not test: " + e.message);
    }
  } catch (e) {
    console.error("✗ Error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
