import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { products as seedProducts, categories, events, indianStates, districtsByState } from "./data.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const PRODUCTS_FILE = path.join(__dirname, "data", "products.json");
const IS_PROD = process.env.NODE_ENV === "production";

// Supabase (public anon key is safe to ship; service role stays env-only)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xypizzylruvgcglhyiyb.supabase.co";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_h4JTK-FhACGp3JDCvHMHPg_R50Q7G2PIq9wBpkMn_50Q";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Use service role server-side if set, else anon (anon is enough for Auth + read, RLS enforced)
const SUPABASE_KEY = SUPABASE_SERVICE || SUPABASE_ANON;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(`[Supabase] Connected to ${SUPABASE_URL} as ${SUPABASE_SERVICE ? "service" : "anon"}`);
  } catch (e) { console.warn("[Supabase] init failed, falling back to JSON:", e.message); }
} else {
  console.log("[Supabase] Not configured — using JSON files (data/*.json)");
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
function loadOrders() {
  try {
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
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error("Failed to save orders:", e);
  }
}
function loadProducts() {
  try {
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
    if (!fs.existsSync(AUDIT_FILE)) { fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2)); return []; }
    return JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"));
  } catch { return []; }
}
function logAudit(action, details, ip) {
  try {
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
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON,
    razorpayKeyId: RAZORPAY_KEY_ID
  });
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

// Orders
app.get("/api/orders", (req, res) => res.json(loadOrders()));
app.get("/api/orders/:id", (req, res) => {
  const orders = loadOrders();
  const id = decodeURIComponent(req.params.id);
  const order = orders.find((o) => o.id === id || o.id === "#" + id || o.id.replace("#", "") === id.replace("#", ""));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});
app.post("/api/orders", orderLimiter, (req, res) => {
  const { items, address, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items array required" });
  if (!Array.isArray(items) || items.length > 20) return res.status(400).json({ error: "Too many items (max 20)" });
  if (!address || !address.fullName || !address.phone || !address.address || !address.state || !address.district || !address.pincode) return res.status(400).json({ error: "Complete billing address required" });
  // Validate phone (10 digits) and pincode (6 digits)
  const phone = String(address.phone).replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Phone must be 10 digits" });
  if (!/^\d{6}$/.test(String(address.pincode))) return res.status(400).json({ error: "Pincode must be 6 digits" });
  const validStates = Object.keys(districtsByState);
  if (!validStates.includes(address.state)) return res.status(400).json({ error: "Invalid state code" });
  if (!districtsByState[address.state]?.includes(address.district)) return res.status(400).json({ error: "Invalid district for state" });
  if (!["upi","card","netbanking","cod","razorpay"].includes(paymentMethod)) return res.status(400).json({ error: "Invalid paymentMethod" });
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
  const order = { id: generateOrderId(), date: new Date().toISOString(), items: enrichedItems, subtotal, discount, shipping, total, address, paymentMethod, status: "processing" };
  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);
  res.status(201).json(order);
});
app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
  const orders = loadOrders();
  const id = decodeURIComponent(req.params.id);
  const order = orders.find(o => o.id === id || o.id === "#" + id || o.id.replace("#","") === id.replace("#",""));
  if (!order) return res.status(404).json({ error: "Order not found" });
  const { status } = req.body;
  const valid = ["processing", "shipped", "delivered", "cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of ${valid.join(", ")}` });
  order.status = status;
  saveOrders(orders);
  logAudit("order:status", { id, status }, req.ip);
  res.json(order);
});
app.delete("/api/orders/:id", requireAdmin, (req, res) => {
  let orders = loadOrders();
  const id = decodeURIComponent(req.params.id);
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
