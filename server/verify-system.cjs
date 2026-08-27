// Verify the full system migration
const { Client } = require("pg");
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const connStr = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.xypizzylruvgcglhyiyb.supabase.co:5432/postgres`;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log("=== ALL TABLES ===");
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("Total: " + tables.rows.length);
    tables.rows.forEach(r => console.log("  ✓ " + r.table_name));

    console.log("\n=== ALL VIEWS ===");
    const views = await client.query(`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    views.rows.forEach(r => console.log("  ✓ " + r.table_name));

    console.log("\n=== ALL INDEXES ===");
    const idx = await client.query(`
      SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname = 'public'
    `);
    console.log("Total: " + idx.rows[0].n);

    console.log("\n=== RLS-ENABLED TABLES ===");
    const rls = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
      ORDER BY tablename
    `);
    rls.rows.forEach(r => console.log("  ✓ " + r.tablename));

    console.log("\n=== ADMIN DASHBOARD STATS ===");
    const stats = await client.query("SELECT * FROM admin_dashboard_stats");
    console.log(JSON.stringify(stats.rows[0], null, 2));

    console.log("\n=== SUPPORT ANALYTICS ===");
    const sup = await client.query("SELECT * FROM support_ticket_analytics LIMIT 10");
    sup.rows.forEach(r => console.log("  " + JSON.stringify(r)));

    console.log("\n=== SCHEMA MIGRATIONS ===");
    const mig = await client.query("SELECT * FROM schema_migrations ORDER BY version");
    mig.rows.forEach(r => console.log("  v" + r.version + ": " + r.name + " (" + r.applied_at.toISOString() + ")"));

    console.log("\n=== FULL-TEXT SEARCH TEST ===");
    const search = await client.query(`
      SELECT name, category, ts_rank(search_vector, plainto_tsquery('english', 'tomato seeds')) as rank
      FROM products
      WHERE search_vector @@ plainto_tsquery('english', 'tomato seeds')
        AND deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT 5
    `);
    if (search.rows.length > 0) {
      search.rows.forEach(r => console.log("  ✓ " + r.name + " (rank " + r.rank.toFixed(3) + ")"));
    } else {
      console.log("  No matches (expected for current products)");
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
})();
