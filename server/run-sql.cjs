// Run SQL file against Supabase Postgres
// Usage: SUPABASE_DB_PASSWORD=xxx node run-sql.cjs [path/to/file.sql]
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const sqlPath = process.argv[2] || path.join(__dirname, "..", "sql_6_hardening.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

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
    console.log("Running:", sqlPath, "(" + sql.length + " chars)");
    await client.query(sql);
    console.log("✓ Migration applied successfully");
  } catch (e) {
    console.error("✗ Error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
