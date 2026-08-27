// Check for data overlap in Supabase
const { Client } = require("pg");
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const connStr = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.xypizzylruvgcglhyiyb.supabase.co:5432/postgres`;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log("=== ROW COUNTS ===");
    for (const t of ["users", "orders", "products", "audit_log", "admin_profiles",
                     "support_chats", "support_messages", "support_activity_log"]) {
      const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].n}`);
    }

    console.log("\n=== USERS ===");
    const u = await client.query("SELECT email, name, created_at FROM users ORDER BY created_at DESC");
    u.rows.forEach(r => console.log(`  ${r.email} | ${r.name} | ${r.created_at}`));

    console.log("\n=== ORDERS (last 10) ===");
    const o = await client.query("SELECT id, email, user_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10");
    o.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.user_name} | ₹${r.total} | ${r.status} | ${r.created_at}`));

    console.log("\n=== SUPPORT CHATS ===");
    const c = await client.query("SELECT id, user_email, user_name, subject, status, last_message_at FROM support_chats ORDER BY last_message_at DESC");
    c.rows.forEach(r => console.log(`  #${r.id} | ${r.user_email} | ${r.subject} | ${r.status} | ${r.last_message_at}`));

    console.log("\n=== ADMIN PROFILES ===");
    const a = await client.query("SELECT id, email, name, role, active FROM admin_profiles");
    a.rows.forEach(r => console.log(`  #${r.id} | ${r.email} | ${r.name} | ${r.role} | active=${r.active}`));

    console.log("\n=== CHECK FOR OVERLAPS ===");
    // Users with same name but different email
    const dupNames = await client.query(`
      SELECT name, COUNT(*)::int AS n, array_agg(email) AS emails
      FROM users GROUP BY name HAVING COUNT(*) > 1
    `);
    console.log("Duplicate names:", dupNames.rows);

    // Orders for non-existent users
    const orphanOrders = await client.query(`
      SELECT o.id, o.email FROM orders o
      LEFT JOIN users u ON u.email = o.email
      WHERE o.email IS NOT NULL AND u.email IS NULL
    `);
    console.log("Orphan orders (no user):", orphanOrders.rows);

    // Support chats for non-existent users
    const orphanChats = await client.query(`
      SELECT s.id, s.user_email FROM support_chats s
      LEFT JOIN users u ON u.email = s.user_email
      WHERE u.email IS NULL
    `);
    console.log("Orphan support chats (no user):", orphanChats.rows);

    // Duplicate orders (same id)
    const dupOrders = await client.query(`
      SELECT id, COUNT(*)::int AS n FROM orders GROUP BY id HAVING COUNT(*) > 1
    `);
    console.log("Duplicate order IDs:", dupOrders.rows);

    // Messages for non-existent chats
    const orphanMsgs = await client.query(`
      SELECT m.id, m.chat_id FROM support_messages m
      LEFT JOIN support_chats c ON c.id = m.chat_id
      WHERE c.id IS NULL
    `);
    console.log("Orphan messages (no chat):", orphanMsgs.rows);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
})();
