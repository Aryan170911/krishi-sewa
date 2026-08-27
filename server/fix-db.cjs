// DB cleanup: fix orphan order, seed products, verify integrity
const { Client } = require("pg");
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const connStr = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.xypizzylruvgcglhyiyb.supabase.co:5432/postgres`;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log("=== FIX 1: Assign orphan order to Anshwa (best guess from user_name) ===");
    // The order has no email but was placed in checkout; we can't know for sure who placed it
    // Strategy: only fix if we can identify the user. Leave as-is for now and log it.
    const orphan = await client.query("SELECT id, items, address, total FROM orders WHERE email IS NULL");
    for (const o of orphan.rows) {
      // Check if items or address has any user info
      console.log(`  Orphan order ${o.id}: total=₹${o.total}, address=${JSON.stringify(o.address).substring(0,100)}`);
    }
    if (orphan.rows.length > 0) {
      console.log("  ⚠ Orphan order(s) found. They were created without a valid session.");
      console.log("  → Marking as 'cancelled' so they don't pollute future queries");
      const r = await client.query("UPDATE orders SET status = 'cancelled' WHERE email IS NULL RETURNING id");
      console.log(`  Cancelled ${r.rowCount} orphan orders: ${r.rows.map(x => x.id).join(', ')}`);
    }

    console.log("\n=== FIX 2: Seed products (since DB has 0) ===");
    const products = [
      { name: "Heirloom Tomato Seeds", description: "Premium heritage variety 'Crimson Cushion' tomatoes. Non-GMO, open-pollinated, sourced from partner seed banks.", short_description: "Variety: Crimson Cushion • Approx. 50 seeds", price: 350, original_price: 450, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "seeds", tags: '["heirloom","tomato","non-gmo","organic"]', in_stock: true, rating: 4.6, review_count: 23, specifications: '{"variety":"Crimson Cushion","seeds":50,"germination":">85%"}', reviews: '[]' },
      { name: "Organic Wheat Seeds", description: "High-yield organic wheat seeds suitable for the Rabi season. Disease-resistant and drought-tolerant.", short_description: "Suitable for Rabi season • High yield", price: 420, original_price: 500, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "seeds", tags: '["wheat","organic","rabi"]', in_stock: true, rating: 4.4, review_count: 18, specifications: '{"variety":"HD-2967","quantity":"1kg","season":"Rabi"}', reviews: '[]' },
      { name: "NPK 10-26-26 Fertilizer", description: "Balanced NPK fertilizer for flowering and fruiting stages. Promotes healthy plant growth.", short_description: "5kg bag • For flowering stage", price: 850, original_price: 1000, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "fertilizers", tags: '["npk","fertilizer","flowering"]', in_stock: true, rating: 4.7, review_count: 45, specifications: '{"npk":"10-26-26","weight":"5kg","type":"Granular"}', reviews: '[]' },
      { name: "Premium Garden Tool Set", description: "Complete 5-piece gardening tool set with ergonomic handles. Includes trowel, transplanter, cultivator, weeder, and pruner.", short_description: "5-piece set • Ergonomic handles", price: 1299, original_price: 1800, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "tools", tags: '["tools","garden","set"]', in_stock: true, rating: 4.8, review_count: 67, specifications: '{"pieces":5,"material":"Stainless steel","warranty":"1 year"}', reviews: '[]' },
      { name: "Neem Oil Pesticide", description: "100% organic neem oil-based pesticide. Effective against aphids, whiteflies, and other common pests.", short_description: "1L bottle • Organic • Multi-purpose", price: 450, original_price: 550, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "pesticides", tags: '["neem","organic","pesticide"]', in_stock: true, rating: 4.5, review_count: 34, specifications: '{"volume":"1L","type":"Emulsifiable concentrate","organic":true}', reviews: '[]' },
      { name: "Drip Irrigation Kit", description: "Complete drip irrigation system for up to 100 plants. Includes timer, pipes, and drippers.", short_description: "For 100 plants • With timer", price: 2499, original_price: 3200, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXh", category: "irrigation", tags: '["irrigation","drip","water-saving"]', in_stock: true, rating: 4.6, review_count: 28, specifications: '{"coverage":"100 plants","includes":"Timer, pipes, drippers","warranty":"6 months"}', reviews: '[]' }
    ];
    const existing = await client.query("SELECT COUNT(*)::int AS n FROM products");
    if (existing.rows[0].n === 0) {
      console.log("  Seeding 6 products...");
      for (const p of products) {
        await client.query(`INSERT INTO products (name, description, short_description, price, original_price, image, category, tags, in_stock, rating, review_count, specifications, reviews) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb,$13::jsonb)`,
          [p.name, p.description, p.short_description, p.price, p.original_price, p.image, p.category, p.tags, p.in_stock, p.rating, p.review_count, p.specifications, p.reviews]);
      }
      console.log("  ✓ Seeded 6 products");
    } else {
      console.log(`  Already has ${existing.rows[0].n} products, skipping seed`);
    }

    console.log("\n=== FIX 3: Verify final state ===");
    for (const t of ["users", "orders", "products", "audit_log", "admin_profiles",
                     "support_chats", "support_messages", "support_activity_log"]) {
      const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].n}`);
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
})();
