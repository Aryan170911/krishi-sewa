import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { products as seedProducts, categories, events, indianStates, districtsByState, stateNameToCode } from "./data.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const PRODUCTS_FILE = path.join(__dirname, "data", "products.json");
const IS_PROD = process.env.NODE_ENV === "production";

// Email — Resend (HTTP, no SMTP, works on Render/StackHost/anywhere)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Krishi Sewa <onboarding@resend.dev>";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
if (resend) console.log("[Email] Resend ready (from: " + EMAIL_FROM + ")");
else console.log("[Email] Resend NOT configured — set RESEND_API_KEY env (or paste in next deploy)");

// Supabase (Postgres) — primary store for users + orders when configured
// Secrets stay in env; service_role must NEVER be hardcoded in source
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xypizzylruvgcglhyiyb.supabase.co";
const SUPABASE_PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let supabase = null;
if (SUPABASE_URL && SUPABASE_SECRET) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
    console.log(`[Supabase] Connected to ${SUPABASE_URL} as service_role`);
  } catch (e) { console.warn("[Supabase] init failed, falling back to JSON:", e.message); supabase = null; }
} else {
  console.log("[Supabase] Not configured — set SUPABASE_SECRET_KEY env (service_role) for database persistence");
}

// Razorpay (test keys - replace via .env for prod)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_Sv4HWH1qFfP22s";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "test_secret_for_demo";
let razorpay = null;
try {
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
} catch (e) { console.warn("Razorpay init failed (using mock):", e.message); }

// Security & Logging
app.use(helmet({
  contentSecurityPolicy: false, // allow Tailwind CDN and Google Fonts
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(IS_PROD ? "combined" : "dev"));
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({
  origin: corsOrigin === "*" ? true : corsOrigin.split(","),
  credentials: true
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" }
});
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many order attempts, please wait" }
});
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, please try again later" }
});
app.use("/api/", apiLimiter);

// Serve frontend static files
const frontendPath = path.join(__dirname, "..", "krishi-sewa-frontend");
app.use(express.static(frontendPath));

// ============ Helpers for persistence ============
function ensureDataDir() { try { fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true }); } catch {} }
function loadOrders() {
  try {
    ensureDataDir();
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load orders:", e);
    return [];
  }
}
function saveOrders(orders) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error("Failed to save orders:", e);
  }
}
function loadProducts() {
  try {
    ensureDataDir();
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seedProducts, null, 2));
      return [...seedProducts];
    }
    const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seedProducts, null, 2));
      return [...seedProducts];
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load products:", e);
    return [...seedProducts];
  }
}
function saveProducts(products) {
  try {
    ensureDataDir();
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (e) {
    console.error("Failed to save products:", e);
  }
}

let products = loadProducts();

// Audit log
const AUDIT_FILE = path.join(__dirname, "data", "audit.json");
function loadAudit() {
  try {
    ensureDataDir();
    if (!fs.existsSync(AUDIT_FILE)) { fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2)); return []; }
    return JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"));
  } catch { return []; }
}
function logAudit(action, details, ip) {
  try {
    ensureDataDir();
    const logs = loadAudit();
    logs.push({ timestamp: new Date().toISOString(), action, details, ip, user: ADMIN_USER });
    // keep last 200
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2));
  } catch (e) { console.error("Audit log failed", e); }
}

function generateOrderId() {
  return "#KS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}
function calculateCartTotal(cartItems) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 1000 ? 200 : 0;
  const shipping = subtotal > 2000 ? 0 : 60;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

// ============ API Routes ============

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Krishi Sewa API running",
    version: "1.0.0",
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    products: products.length,
    orders: loadOrders().length
  });
});
app.get("/api", (req, res) => {
  res.json({
    name: "Krishi Sewa Foundation API",
    version: "1.0.0",
    endpoints: ["/api/health","/api/products","/api/categories","/api/events","/api/orders","/api/admin/stats","/admin"]
  });
});

// Admin login - use env vars, fallback to demo
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "krishi-admin-token-2026";

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    console.log(`[ADMIN] Login success from ${req.ip} user=${username}`);
    res.json({ token: ADMIN_TOKEN, username: ADMIN_USER });
  } else {
    console.warn(`[ADMIN] Login failed from ${req.ip} user=${username}`);
    res.status(401).json({ error: "Invalid credentials. Try admin / admin123" });
  }
});

function requireAdmin(req, res, next) {
  // For demo, check header but allow if missing for ease-of-use when serving admin panel same origin
  // Uncomment to enforce:
  // const token = req.headers["x-admin-token"];
  // if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "Admin token required" });
  next();
}

app.get("/api/admin/stats", (req, res) => {
  const orders = loadOrders();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "processing").length;
  const shippedOrders = orders.filter(o => o.status === "shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  res.json({
    totalProducts: products.length,
    totalOrders,
    pendingOrders,
    shippedOrders,
    deliveredOrders,
    totalRevenue,
    inStockProducts: products.filter(p => p.inStock).length,
    outOfStockProducts: products.filter(p => !p.inStock).length
  });
});
app.get("/api/admin/audit", requireAdmin, (req, res) => {
  res.json(loadAudit().slice(-50).reverse());
});
app.get("/api/config", (req, res) => {
  res.json({
    emailEnabled: !!resend,
    emailFrom: EMAIL_FROM,
    razorpayKeyId: RAZORPAY_KEY_ID
  });
});

// ============================================
// EMAIL OTP — Resend (no Supabase, no SMTP, works on Render)
// ============================================
const otpStore = new Map(); // email -> { code, expiresAt, attempts }
const AUTH_FILE = path.join(__dirname, "data", "auth.json");
const SESSIONS = new Map(); // token -> { email, createdAt }
const SESSION_COOKIE = "krishi_session";
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_PEPPER = "krishi_sewa_pepper_v1";
function newCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function newToken() { return crypto.randomBytes(24).toString("hex"); }
// scrypt-based password hashing (no native deps)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password + PASSWORD_PEPPER, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const test = crypto.scryptSync(password + PASSWORD_PEPPER, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex"));
  } catch { return false; }
}
function loadAuth() {
  try {
    ensureDataDir();
    if (!fs.existsSync(AUTH_FILE)) { fs.writeFileSync(AUTH_FILE, JSON.stringify({ users: {} }, null, 2)); return { users: {} }; }
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch { return { users: {} }; }
}
function saveAuth(a) { try { fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true }); fs.writeFileSync(AUTH_FILE, JSON.stringify(a, null, 2)); } catch (e) { console.warn("auth save failed", e.message); } }
// User storage: Supabase if configured, else local JSON
async function findUser(email) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (error) { console.warn("[Supabase] findUser error:", error.message); return null; }
      return data;
    } catch (e) { console.warn("[Supabase] findUser exception:", e.message); return null; }
  }
  const auth = loadAuth();
  return auth.users[email] || null;
}
async function createUser(user) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").insert(user).select().single();
      if (error) { console.warn("[Supabase] createUser error:", error.message); return null; }
      return data;
    } catch (e) { console.warn("[Supabase] createUser exception:", e.message); return null; }
  }
  const auth = loadAuth();
  auth.users[user.email] = user;
  saveAuth(auth);
  return user;
}
async function updateUser(email, patch) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").update(patch).eq("email", email).select().single();
      if (error) { console.warn("[Supabase] updateUser error:", error.message); return null; }
      return data;
    } catch (e) { console.warn("[Supabase] updateUser exception:", e.message); return null; }
  }
  const auth = loadAuth();
  if (auth.users[email]) {
    auth.users[email] = { ...auth.users[email], ...patch };
    saveAuth(auth);
  }
  return auth.users[email] || null;
}
function getSession(req) {
  const token = (req.headers.cookie || "").split(";").map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+"="))?.split("=")[1];
  if (!token) return null;
  const s = SESSIONS.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) { SESSIONS.delete(token); return null; }
  return { token, ...s };
}
function issueSession(res, email, name) {
  const token = newToken();
  SESSIONS.set(token, { email, name, createdAt: Date.now() });
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: IS_PROD, maxAge: SESSION_TTL_MS });
  return token;
}
function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password needs at least 1 uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password needs at least 1 lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password needs at least 1 number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password needs at least 1 special character";
  return null;
}
async function sendOtpEmail(email, code, name) {
  if (!resend) return { error: "Email not configured on server (RESEND_API_KEY missing)" };
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: `${code} is your Krishi Sewa verification code`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f5f5f0;border-radius:12px">
        <h2 style="color:#012d1d;margin:0 0 8px">Krishi Sewa Foundation</h2>
        <p style="color:#333;margin:0 0 16px">${name ? `Hi ${name}, here` : `Here`}'s your verification code:</p>
        <div style="background:#012d1d;color:#e8f5ed;font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;border-radius:8px">${code}</div>
        <p style="color:#666;margin:16px 0 0;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
        <p style="color:#999;margin:24px 0 0;font-size:11px">Krishi Sewa Foundation — heritage seeds, pure spices, real impact.</p>
      </div>`,
      text: `Your Krishi Sewa code is ${code}. Expires in 10 min.`
    });
    if (error) return { error: "Failed to send email: " + (error.message || "unknown") };
    return { ok: true, emailId: data?.id };
  } catch (e) { return { error: e.message }; }
}

// ============================================
// AUTH: Signup (1x OTP) / Login (password) / Forgot (OTP + new password)
// ============================================
app.post("/api/auth/signup", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Valid email required" });
    if (!name) return res.status(400).json({ error: "Name required" });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const existing = await findUser(email);
    if (existing) return res.status(409).json({ error: "Account already exists with this email — try logging in" });
    const code = newCode();
    otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, name, password, purpose: "signup" });
    console.log(`[OTP signup] ${email} -> ${code} ${supabase ? '(Supabase)' : '(local JSON)'}`);
    const r = await sendOtpEmail(email, code, name);
    if (r.error) return res.status(502).json({ error: r.error });
    res.json({ ok: true, message: "Code sent to " + email, emailId: r.emailId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/auth/verify-signup", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !code) return res.status(400).json({ error: "Email and code required" });
    const rec = otpStore.get(email);
    if (!rec || rec.purpose !== "signup") return res.status(400).json({ error: "No signup in progress for this email" });
    if (Date.now() > rec.expiresAt) { otpStore.delete(email); return res.status(400).json({ error: "Code expired — restart signup" }); }
    if (rec.attempts >= 5) { otpStore.delete(email); return res.status(429).json({ error: "Too many attempts — restart signup" }); }
    if (rec.code !== code) { rec.attempts++; return res.status(400).json({ error: `Wrong code (${5-rec.attempts} attempts left)` }); }
    const existing = await findUser(email);
    if (existing) return res.status(409).json({ error: "Account already exists" });
    const user = { email, name: rec.name, password_hash: hashPassword(rec.password), created_at: new Date().toISOString() };
    await createUser(user);
    otpStore.delete(email);
    issueSession(res, email, rec.name);
    res.json({ ok: true, user: { email: user.email, name: user.name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Valid email required" });
    if (!password) return res.status(400).json({ error: "Password required" });
    const user = await findUser(email);
    if (!user) return res.status(404).json({ error: "No account with this email — sign up first" });
    if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: "Wrong password — try again or use 'Forgot password?'" });
    issueSession(res, email, user.name);
    res.json({ ok: true, user: { email: user.email, name: user.name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/auth/forgot", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Valid email required" });
    const user = await findUser(email);
    if (!user) return res.status(404).json({ error: "No account with this email — sign up first" });
    const code = newCode();
    otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, purpose: "reset" });
    console.log(`[OTP reset] ${email} -> ${code}`);
    const r = await sendOtpEmail(email, code, "");
    if (r.error) return res.status(502).json({ error: r.error });
    res.json({ ok: true, message: "Reset code sent to " + email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/auth/reset-password", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.password || "");
    if (!email || !code || !newPassword) return res.status(400).json({ error: "Email, code and new password required" });
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const rec = otpStore.get(email);
    if (!rec || rec.purpose !== "reset") return res.status(400).json({ error: "No reset in progress — request a new code" });
    if (Date.now() > rec.expiresAt) { otpStore.delete(email); return res.status(400).json({ error: "Code expired — request a new one" }); }
    if (rec.attempts >= 5) { otpStore.delete(email); return res.status(429).json({ error: "Too many attempts — request a new code" }); }
    if (rec.code !== code) { rec.attempts++; return res.status(400).json({ error: `Wrong code (${5-rec.attempts} attempts left)` }); }
    const user = await findUser(email);
    if (!user) return res.status(404).json({ error: "Account not found" });
    await updateUser(email, { password_hash: hashPassword(newPassword) });
    otpStore.delete(email);
    issueSession(res, email, user.name);
    res.json({ ok: true, user: { email: user.email, name: user.name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/auth/resend-code", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const rec = otpStore.get(email);
    if (!rec) return res.status(400).json({ error: "No signup or reset in progress" });
    const code = newCode();
    rec.code = code; rec.expiresAt = Date.now() + OTP_TTL_MS; rec.attempts = 0;
    console.log(`[OTP resend] ${email} -> ${code} (${rec.purpose})`);
    const r = await sendOtpEmail(email, code, rec.name || "");
    if (r.error) return res.status(502).json({ error: r.error });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/auth/me", (req, res) => {
  const s = getSession(req);
  if (!s) return res.status(401).json({ user: null });
  res.json({ user: { email: s.email, name: s.name } });
});
app.post("/api/auth/logout", (req, res) => {
  const s = getSession(req);
  if (s) SESSIONS.delete(s.token);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

// Payment Gateway - Razorpay (test) + config
app.get("/api/payment/config", (req, res) => {
  res.json({
    razorpayKeyId: RAZORPAY_KEY_ID,
    codEnabled: true,
    upiEnabled: true,
    methods: ["cod","upi","card","netbanking","razorpay"]
  });
});
app.post("/api/payment/razorpay/order", async (req, res) => {
  const { amount } = req.body; // amount in paise (e.g., 101000 for 1010.00)
  if (!amount || amount < 100) return res.status(400).json({ error: "Valid amount required" });
  // Mock if Razorpay not configured or test secret
  if (!razorpay || RAZORPAY_KEY_SECRET === "test_secret_for_demo") {
    const mockId = "order_mock_" + Math.random().toString(36).slice(2,10);
    return res.json({ id: mockId, amount, currency: "INR", keyId: RAZORPAY_KEY_ID, mock: true });
  }
  try {
    const order = await razorpay.orders.create({ amount: Math.round(amount), currency: "INR", receipt: "krishi_" + Date.now() });
    res.json({ ...order, keyId: RAZORPAY_KEY_ID });
  } catch (e) {
    console.error("Razorpay order failed:", e);
    res.status(500).json({ error: "Razorpay order failed: " + e.message });
  }
});
app.post("/api/payment/razorpay/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing razorpay fields" });
  }
  // Mock verification for demo keys
  if (RAZORPAY_KEY_SECRET === "test_secret_for_demo") {
    return res.json({ verified: true, mock: true, message: "Demo verification passed (set real RAZORPAY_KEY_SECRET for prod)" });
  }
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");
  if (expected === razorpay_signature) {
    logAudit("payment:razorpay_verify", { order_id: razorpay_order_id, payment_id: razorpay_payment_id }, req.ip);
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false, error: "Invalid signature" });
  }
});

// Products - with filtering (public)
app.get("/api/products", (req, res) => {
  let result = [...products];
  const { category, search, priceRange, sortBy } = req.query;
  if (category && category !== "all") result = result.filter((p) => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
  }
  if (priceRange && priceRange !== "all") {
    switch (priceRange) {
      case "under500": result = result.filter((p) => p.price < 500); break;
      case "500-1000": result = result.filter((p) => p.price >= 500 && p.price <= 1000); break;
      case "1000-2000": result = result.filter((p) => p.price >= 1000 && p.price <= 2000); break;
      case "over2000": result = result.filter((p) => p.price > 2000); break;
    }
  }
  switch (sortBy) {
    case "price-low": result.sort((a, b) => a.price - b.price); break;
    case "price-high": result.sort((a, b) => b.price - a.price); break;
    case "rating": result.sort((a, b) => b.rating - a.rating); break;
    case "newest": result.sort((a, b) => b.id - a.id); break;
  }
  res.json(result);
});

app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// Admin product CRUD
app.post("/api/products", requireAdmin, (req, res) => {
  const { name, description, shortDescription, price, originalPrice, image, category, tags, inStock, rating, reviewCount, specifications } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "name and price required" });
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const newProduct = {
    id: newId,
    name,
    description: description || "",
    shortDescription: shortDescription || "",
    price: parseFloat(price),
    originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
    image: image || "https://via.placeholder.com/400x300?text=No+Image",
    category: category || "seeds",
    tags: tags || [],
    inStock: inStock !== undefined ? !!inStock : true,
    rating: rating || 4.5,
    reviewCount: reviewCount || 0,
    specifications: specifications || {},
    reviews: []
  };
  products.push(newProduct);
  saveProducts(products);
  logAudit("product:create", { id: newId, name }, req.ip);
  res.status(201).json(newProduct);
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const updated = { ...products[idx], ...req.body, id };
  // Ensure types
  if (req.body.price != null) updated.price = parseFloat(req.body.price);
  if (req.body.originalPrice != null) updated.originalPrice = parseFloat(req.body.originalPrice);
  products[idx] = updated;
  saveProducts(products);
  logAudit("product:update", { id, name: updated.name }, req.ip);
  res.json(updated);
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const removed = products.splice(idx, 1)[0];
  saveProducts(products);
  logAudit("product:delete", { id, name: removed.name }, req.ip);
  res.json({ message: "Deleted", product: removed });
});

app.patch("/api/products/:id/stock", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.inStock = !!req.body.inStock;
  saveProducts(products);
  logAudit("product:stock", { id, inStock: product.inStock }, req.ip);
  res.json(product);
});

app.get("/api/categories", (req, res) => res.json(categories));
app.get("/api/events", (req, res) => res.json(events));
app.get("/api/states", (req, res) => res.json(indianStates));
app.get("/api/states/:code/districts", (req, res) => {
  const code = req.params.code.toUpperCase();
  const districts = districtsByState[code];
  if (!districts) return res.status(404).json({ error: "State not found" });
  res.json(districts);
});

// Pincode lookup via India Post API (free, no key, CORS-enabled)
// Returns { state, stateCode, district, city } or { error }
app.get("/api/pincode/:pin", async (req, res) => {
  const pin = String(req.params.pin || "").trim();
  if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: "Invalid 6-digit pincode" });
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await r.json();
    if (!Array.isArray(data) || data[0]?.Status !== "Success" || !data[0]?.PostOffice?.length) {
      return res.status(404).json({ error: "Pincode not found" });
    }
    const po = data[0].PostOffice[0];
    const stateName = po.State;
    const district = po.District;
    const stateCode = stateNameToCode[stateName.toLowerCase()] || "";
    return res.json({ state: stateName, stateCode, district, city: po.Block || po.Name, postOffices: data[0].PostOffice.map(p => ({ name: p.Name, district: p.District, block: p.Block })) });
  } catch (e) {
    return res.status(502).json({ error: "Pincode lookup failed: " + e.message });
  }
});

// Orders
app.get("/api/orders", async (req, res) => {
  const email = (req.query.email || "").toString().trim().toLowerCase();
  if (supabase) {
    try {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (email) q = q.eq("email", email);
      const { data, error } = await q;
      if (error) { console.warn("[Supabase] orders list error:", error.message); return res.json([]); }
      // Map snake_case columns back to camelCase for frontend compatibility
      return res.json((data || []).map(o => ({
        id: o.id, date: o.date || o.created_at, email: o.email, userName: o.user_name,
        items: o.items, subtotal: Number(o.subtotal), discount: Number(o.discount),
        shipping: Number(o.shipping), total: Number(o.total), address: o.address,
        paymentMethod: o.payment_method, status: o.status
      })));
    } catch (e) { console.warn("[Supabase] orders exception:", e.message); }
  }
  // Fallback: local JSON
  const all = loadOrders();
  if (!email) return res.json(all);
  return res.json(all.filter(o => (o.email || "").toLowerCase() === email));
});
app.get("/api/orders/:id", async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  if (supabase) {
    try {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (data) return res.json({
        id: data.id, date: data.date || data.created_at, email: data.email, userName: data.user_name,
        items: data.items, subtotal: Number(data.subtotal), discount: Number(data.discount),
        shipping: Number(data.shipping), total: Number(data.total), address: data.address,
        paymentMethod: data.payment_method, status: data.status
      });
      if (error && error.code !== "PGRST116") console.warn("[Supabase] order get error:", error.message);
    } catch (e) { console.warn("[Supabase] order get exception:", e.message); }
  }
  const orders = loadOrders();
  const order = orders.find((o) => o.id === id || o.id === "#" + id || o.id.replace("#", "") === id.replace("#", ""));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});
app.post("/api/orders", orderLimiter, async (req, res) => {
  const { items, address, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items array required" });
  if (!Array.isArray(items) || items.length > 20) return res.status(400).json({ error: "Too many items (max 20)" });
  if (!address || !address.fullName || !address.phone || !address.address || !address.state || !address.district || !address.pincode) return res.status(400).json({ error: "Complete billing address required" });
  const phone = String(address.phone).replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Phone must be 10 digits" });
  if (!/^\d{6}$/.test(String(address.pincode))) return res.status(400).json({ error: "Pincode must be 6 digits" });
  const validStates = Object.keys(districtsByState);
  if (!validStates.includes(address.state)) return res.status(400).json({ error: "Invalid state code" });
  // Soft district check: only reject if state has known districts AND given district isn't in the list
  // (pincode lookup may return a district not in our hardcoded top list — that's OK)
  if (districtsByState[address.state] && !districtsByState[address.state].includes(address.district)) {
    console.warn(`[order] District '${address.district}' not in top list for state ${address.state}, accepting anyway (pincode validated)`);
  }
  if (!["upi","card","netbanking","cod","razorpay"].includes(paymentMethod)) return res.status(400).json({ error: "Invalid paymentMethod" });
  const session = getSession(req);
  const enrichedItems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === parseInt(item.id));
    if (!product) return res.status(400).json({ error: `Product id ${item.id} not found` });
    if (!product.inStock) return res.status(400).json({ error: `Product ${product.name} is out of stock` });
    const qty = parseInt(item.quantity) || 1;
    if (qty <= 0) return res.status(400).json({ error: `Invalid quantity for product ${item.id}` });
    enrichedItems.push({ id: product.id, name: product.name, price: product.price, quantity: qty, image: product.image });
  }
  const { subtotal, discount, shipping, total } = calculateCartTotal(enrichedItems);
  const order = { id: generateOrderId(), date: new Date().toISOString(), email: session?.email || null, userName: session?.name || null, items: enrichedItems, subtotal, discount, shipping, total, address, paymentMethod, status: "processing" };
  if (supabase) {
    try {
      const { error } = await supabase.from("orders").insert({
        id: order.id, date: order.date, email: order.email, user_name: order.userName,
        items: order.items, subtotal: order.subtotal, discount: order.discount,
        shipping: order.shipping, total: order.total, address: order.address,
        payment_method: order.paymentMethod, status: order.status
      });
      if (error) { console.warn("[Supabase] order insert error:", error.message); return res.status(500).json({ error: "Failed to save order: " + error.message }); }
    } catch (e) { console.warn("[Supabase] order insert exception:", e.message); return res.status(500).json({ error: e.message }); }
  } else {
    const orders = loadOrders();
    orders.push(order);
    saveOrders(orders);
  }
  logAudit("order:create", { id: order.id, email: session?.email, total, source: supabase ? "supabase" : "json" }, req.ip);
  res.status(201).json(order);
});
app.put("/api/orders/:id/status", requireAdmin, async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const { status } = req.body;
  const valid = ["processing", "shipped", "delivered", "cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of ${valid.join(", ")}` });
  if (supabase) {
    try {
      const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
      if (!error && data) {
        logAudit("order:status", { id, status }, req.ip);
        return res.json({ id: data.id, status: data.status });
      }
      if (error && error.code !== "PGRST116") console.warn("[Supabase] order status error:", error.message);
    } catch (e) { console.warn("[Supabase] order status exception:", e.message); }
  }
  const orders = loadOrders();
  const order = orders.find(o => o.id === id || o.id === "#" + id || o.id.replace("#","") === id.replace("#",""));
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = status;
  saveOrders(orders);
  logAudit("order:status", { id, status }, req.ip);
  res.json(order);
});
app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  if (supabase) {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (!error) { logAudit("order:delete", { id }, req.ip); return res.json({ message: "Order deleted" }); }
      console.warn("[Supabase] order delete error:", error.message);
    } catch (e) { console.warn("[Supabase] order delete exception:", e.message); }
  }
  let orders = loadOrders();
  const initialLen = orders.length;
  orders = orders.filter(o => !(o.id === id || o.id === "#" + id || o.id.replace("#","") === id.replace("#","")));
  if (orders.length === initialLen) return res.status(404).json({ error: "Order not found" });
  saveOrders(orders);
  logAudit("order:delete", { id }, req.ip);
  res.json({ message: "Order deleted" });
});

// Serve admin page explicitly
app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

// Fallback SPA
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found" });
  const indexPath = path.join(frontendPath, "index.html");
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send("Frontend not found");
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  console.error(`[ERROR] ${req.method} ${req.path}`, err);
  const message = IS_PROD ? "Internal server error" : err.message;
  res.status(err.status || 500).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`🌱 Krishi Sewa server running at http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/`);
  console.log(`   Admin: http://localhost:${PORT}/admin`);
  console.log(`   API health: http://localhost:${PORT}/api/health`);
  console.log(`   Serving frontend from: ${frontendPath}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const nextPort = parseInt(PORT) + 1;
    console.warn(`Port ${PORT} in use, trying ${nextPort}...`);
    app.listen(nextPort, () => {
      console.log(`🌱 Krishi Sewa server running at http://localhost:${nextPort}`);
      console.log(`   Admin: http://localhost:${nextPort}/admin`);
    });
  } else console.error(err);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => process.exit(0));
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
