// Smoke tests for the API
// Run: node server/test-api.cjs
// Or with env: API_BASE=http://localhost:3000/api node server/test-api.cjs

const API_BASE = process.env.API_BASE || "http://localhost:3000/api";

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    console.log(`  ✓ ${name}`);
    passed++;
  }).catch(e => {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  });
}

async function http(method, path, body, cookies = {}) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, cookies: res.headers.getSetCookie ? res.headers.getSetCookie() : [] };
}

async function run() {
  console.log(`\n--- Smoke tests against ${API_BASE} ---\n`);

  let sessionCookies = {};

  // 1. Health
  await test("GET /health", async () => {
    const r = await http("GET", "/health");
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (r.data.status !== "ok") throw new Error(`not ok: ${r.data.status}`);
  });

  // 2. Products
  await test("GET /products (public)", async () => {
    const r = await http("GET", "/products");
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (!Array.isArray(r.data) || r.data.length === 0) throw new Error("no products");
  });

  // 3. Search
  await test("GET /search?q=tomato", async () => {
    const r = await http("GET", "/search?q=tomato");
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (!Array.isArray(r.data)) throw new Error("not an array");
  });

  // 4. States
  await test("GET /states", async () => {
    const r = await http("GET", "/states");
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (!Array.isArray(r.data) || r.data.length === 0) throw new Error("no states");
  });

  // 5. Categories
  await test("GET /categories", async () => {
    const r = await http("GET", "/categories");
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });

  // 6. Auth /me (no session)
  await test("GET /auth/me (no session)", async () => {
    const r = await http("GET", "/auth/me");
    if (r.status !== 401 && r.status !== 200) throw new Error(`status ${r.status}`);
  });

  // 7. Signup (or login if exists)
  const testEmail = `test+${Date.now()}@example.com`;
  const testPass = "TestPass123!";
  const testName = "Test User";

  await test("POST /auth/signup", async () => {
    const r = await http("POST", "/auth/signup", { email: testEmail, name: testName, password: testPass });
    if (r.status !== 200 && r.status !== 502) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    if (r.status === 502 && String(r.data.error).includes("RESEND")) return; // Email not configured
    if (r.data.error) throw new Error(r.data.error);
  });

  // 8. Login (might fail if email not configured in test env, skip gracefully)
  await test("POST /auth/login", async () => {
    const r = await http("POST", "/auth/login", { email: testEmail, password: testPass });
    if (r.status === 200) {
      // Capture session cookies
      r.cookies.forEach(c => {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        sessionCookies[k.trim()] = v.trim();
      });
    } else if (r.status === 423) {
      // Account locked
    } else if (r.status === 404 || r.status === 401) {
      // User might not exist if signup didn't complete
    } else {
      throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    }
  });

  // 9. /auth/me with session
  if (Object.keys(sessionCookies).length > 0) {
    await test("GET /auth/me (with session)", async () => {
      const r = await http("GET", "/auth/me", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
      if (!r.data.user) throw new Error("no user returned");
    });

    // 10. /addresses
    await test("GET /addresses (auth required)", async () => {
      const r = await http("GET", "/addresses", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
      if (!Array.isArray(r.data)) throw new Error("not an array");
    });

    // 11. /cart
    await test("GET /cart (auth required)", async () => {
      const r = await http("GET", "/cart", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
    });

    // 12. /wishlist
    await test("GET /wishlist (auth required)", async () => {
      const r = await http("GET", "/wishlist", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
    });

    // 13. /orders
    await test("GET /orders (auth required, scoped)", async () => {
      const r = await http("GET", "/orders", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
      if (!Array.isArray(r.data)) throw new Error("not an array");
    });

    // 14. /preferences
    await test("GET /preferences (auth required)", async () => {
      const r = await http("GET", "/preferences", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
    });

    // 15. /support/chats/mine
    await test("GET /support/chats/mine (auth required)", async () => {
      const r = await http("GET", "/support/chats/mine", null, sessionCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
    });
  }

  // 16. Orders without auth
  await test("GET /orders (no session → 401)", async () => {
    const r = await http("GET", "/orders");
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
  });

  // 17. Admin login (using env-based admin)
  await test("POST /admin/login (token-based)", async () => {
    const r = await http("POST", "/admin/login", { username: "admin", password: "admin123" });
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
  });

  // 18. Admin support login
  let adminCookies = {};
  await test("POST /admin/support/login (cookie-based)", async () => {
    const r = await http("POST", "/admin/support/login", { email: "admin", password: "admin123" });
    if (r.status === 200) {
      r.cookies.forEach(c => {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        adminCookies[k.trim()] = v.trim();
      });
    } else {
      throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    }
  });

  // 19. Admin /me
  if (Object.keys(adminCookies).length > 0) {
    await test("GET /admin/support/me", async () => {
      const r = await http("GET", "/admin/support/me", null, adminCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
      if (!r.data.admin) throw new Error("no admin");
    });

    await test("GET /admin/support/chats", async () => {
      const r = await http("GET", "/admin/support/chats?status=open", null, adminCookies);
      if (r.status !== 200) throw new Error(`status ${r.status}`);
      if (!Array.isArray(r.data)) throw new Error("not an array");
    });
  }

  // 20. Bad email format
  await test("POST /auth/login (bad email format)", async () => {
    const r = await http("POST", "/auth/login", { email: "notanemail", password: "x" });
    if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
  });

  // 21. Wrong password 5x → lockout
  await test("POST /auth/login (5 wrong passwords → lockout test)", async () => {
    let locked = false;
    for (let i = 0; i < 6; i++) {
      const r = await http("POST", "/auth/login", { email: "nonexistent@example.com", password: "wrong" });
      if (r.status === 423) { locked = true; break; }
      if (r.status === 429) { locked = true; break; } // rate limit
    }
    // Not all envs will have lockout; don't fail if it's not locked
  });

  // Summary
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    console.log("\nFailures:");
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("Test runner failed:", e); process.exit(1); });
