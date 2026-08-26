import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { products as seedProducts, categories, events, indianStates, districtsByState } from "./data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const PRODUCTS_FILE = path.join(__dirname, "data", "products.json");

// Middleware
app.use(cors());
app.use(express.json());

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
  res.json({ status: "ok", message: "Krishi Sewa API running", timestamp: new Date().toISOString() });
});

// Admin login (simple demo - no JWT, just token check)
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const ADMIN_TOKEN = "krishi-admin-token-2026";

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ token: ADMIN_TOKEN, username: ADMIN_USER });
  } else {
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
  res.json(updated);
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const removed = products.splice(idx, 1)[0];
  saveProducts(products);
  res.json({ message: "Deleted", product: removed });
});

app.patch("/api/products/:id/stock", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.inStock = !!req.body.inStock;
  saveProducts(products);
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
app.post("/api/orders", (req, res) => {
  const { items, address, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Items array required" });
  if (!address || !address.fullName || !address.phone || !address.address || !address.state || !address.district || !address.pincode) return res.status(400).json({ error: "Complete billing address required" });
  if (!paymentMethod) return res.status(400).json({ error: "paymentMethod required" });
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
  res.json(order);
});
app.delete("/api/orders/:id", requireAdmin, (req, res) => {
  let orders = loadOrders();
  const id = decodeURIComponent(req.params.id);
  const initialLen = orders.length;
  orders = orders.filter(o => !(o.id === id || o.id === "#" + id || o.id.replace("#","") === id.replace("#","")));
  if (orders.length === initialLen) return res.status(404).json({ error: "Order not found" });
  saveOrders(orders);
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
