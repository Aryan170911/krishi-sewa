/**
 * Krishi Sewa Foundation - Frontend
 * Auth: secure email-based login (no passwords, single-use code to inbox)
 */
let authConfig = null;
let authConfigError = null;
async function initAuth() {
  try {
    const cfg = await apiGet("/config");
    if (!cfg) {
      authConfigError = "Could not reach backend /api/config (network or CORS)";
    } else {
      authConfig = cfg;
      console.log(cfg.emailEnabled ? "[Auth] Email OTP ready" : "[Auth] OTP not configured on server (RESEND_API_KEY missing)");
      // check existing session
      try {
        const me = await apiPost("/auth/me", {}, true);
        if (me?.user) { state.authUser = me.user; localStorage.setItem("krishi_user", JSON.stringify(me.user)); syncServerCartOnLogin(); }
        else { state.authUser = null; localStorage.removeItem("krishi_user"); }
      } catch {}
    }
  } catch (e) { authConfigError = String(e?.message || e); console.warn("Auth init failed:", e); }
}

function getApiBase() {
  const host = window.location.hostname;
  const port = window.location.port;
  // If frontend is served by backend itself (port 3000/3001), use relative /api (same origin)
  if ((host === "localhost" || host === "127.0.0.1") && (port === "3000" || port === "3001")) {
    return "/api";
  }
  // If opened via file:// or other dev server (e.g. 5500), try localhost:3000 then fallback
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://${host}:3000/api`;
  }
  // Production or file://
  if (!host) return "http://localhost:3000/api";
  return "/api";
}
const API_BASE = getApiBase();

// Toast notification (defined here so app.js works standalone without admin.js)
function toast(msg, type = "default") {
  let host = document.getElementById("krishi-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "krishi-toast-host";
    host.className = "fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none items-center";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const colors = {
    default: "bg-on-surface text-surface",
    success: "bg-primary text-on-primary",
    error: "bg-error text-on-error",
    warning: "bg-secondary-container text-on-secondary-container"
  };
  const icons = {
    default: "info",
    success: "check_circle",
    error: "error",
    warning: "warning"
  };
  el.className = `${colors[type] || colors.default} px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold opacity-0 translate-y-2 transition-all duration-300 max-w-sm flex items-center gap-2`;
  el.innerHTML = `<span class="material-symbols-outlined text-[18px]" aria-hidden="true">${icons[type] || icons.default}</span><span>${msg}</span>`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  host.appendChild(el);
  requestAnimationFrame(() => { el.classList.remove("opacity-0", "translate-y-2"); el.classList.add("opacity-100", "translate-y-0"); });
  setTimeout(() => { el.classList.add("opacity-0", "translate-y-2"); setTimeout(() => el.remove(), 350); }, 3500);
}

// API helpers with graceful fallback + auto retry on 3001 if 3000 fails
async function apiGet(path) {
  const bases = [API_BASE];
  if (API_BASE.includes(":3000")) bases.push(API_BASE.replace(":3000", ":3001"));
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, { credentials: "include" });
      // Only clear local auth on 401 from /auth/me itself (not from other endpoints)
      if (res.status === 401 && path === "/auth/me") { state.authUser = null; localStorage.removeItem("krishi_user"); }
      if (!res.ok) throw new Error(`API ${res.status}`);
      if (base !== API_BASE) window.__krishi_api_base = base;
      return await res.json();
    } catch (e) {
      console.warn(`API GET ${base}${path} failed:`, e.message);
      continue;
    }
  }
  console.warn(`API GET ${path} failed on all bases, using mock fallback`);
  return null;
}
async function apiPost(path, body, silent = false) {
  const effectiveBase = window.__krishi_api_base || API_BASE;
  const res = await fetch(`${effectiveBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (silent) return { error: err.error || `API ${res.status}` };
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

// ============================================
// MOCK DATA
// ============================================

const mockProducts = [
  {
    id: 1,
    name: "Heirloom Tomato Seeds",
    description: "Premium heritage variety 'Crimson Cushion' tomatoes. These seeds produce large, flavorful fruits perfect for fresh eating, canning, and sauces. Non-GMO, open-pollinated, and sourced from our partner seed banks.",
    shortDescription: "Variety: Crimson Cushion • Approx. 50 seeds",
    price: 350,
    originalPrice: 450,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    category: "seeds",
    tags: ["heirloom", "organic", "non-gmo"],
    inStock: true,
    rating: 4.8,
    reviewCount: 124,
    specifications: {
      "Seed Count": "Approx. 50 seeds",
      "Variety": "Crimson Cushion",
      "Type": "Indeterminate",
      "Days to Maturity": "80-85 days",
      "Sun Requirement": "Full sun (6-8 hours)",
      "Planting Depth": "1/4 inch",
      "Spacing": "24-36 inches",
      "Certification": "Non-GMO, Open Pollinated"
    },
    reviews: [
      { id: 1, author: "Ramesh K.", rating: 5, date: "2024-10-15", text: "Excellent germination rate! Nearly 95% of seeds sprouted within a week. The tomatoes are delicious." },
      { id: 2, author: "Priya S.", rating: 4, date: "2024-09-28", text: "Good quality seeds. Plants are healthy and producing well. Fast delivery too." },
      { id: 3, author: "Arjun P.", rating: 5, date: "2024-09-10", text: "Best heirloom tomatoes I've grown. Rich flavor, beautiful color. Will order again." }
    ]
  },
  {
    id: 2,
    name: "Heritage Marigold Seeds",
    description: "Vibrant heritage marigold variety that acts as a natural pest repellent in your garden. These bright orange and gold flowers not only beautify your space but also protect neighboring plants from nematodes and other pests.",
    shortDescription: "Natural Pest Repellent • Approx. 100 seeds",
    price: 150,
    originalPrice: 180,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQ5qFyHT9ioibx5ZQTpCloDXxm2Tv6khFIhk-FDlai6JTZ1fGojf5QPsYWVKP8NXlBaeZ3D3bS_OeWTBkW3uocwWkX8rcPDYTbPSBPI9iOgUvifemOUg",
    category: "seeds",
    tags: ["companion planting", "pest control", "pollinator friendly"],
    inStock: true,
    rating: 4.6,
    reviewCount: 89,
    specifications: {
      "Seed Count": "Approx. 100 seeds",
      "Variety": "African Marigold (Tagetes erecta)",
      "Flower Color": "Orange & Gold",
      "Height": "24-36 inches",
      "Bloom Time": "Summer to Frost",
      "Sun Requirement": "Full sun",
      "Spacing": "10-12 inches",
      "Special Feature": "Natural nematode repellent"
    },
    reviews: [
      { id: 1, author: "Sunita M.", rating: 5, date: "2024-10-05", text: "Planted these around my vegetable garden - noticeably fewer pests this season!" },
      { id: 2, author: "Vikram R.", rating: 4, date: "2024-08-20", text: "Beautiful flowers, great germination. Attracts lots of bees and butterflies." }
    ]
  },
  {
    id: 3,
    name: "Premium Wheat Seeds (10kg)",
    description: "High-yield wheat variety developed for Indian climatic conditions. Excellent disease resistance and adaptability. Each 10kg bag covers approximately 0.4 hectares.",
    shortDescription: "High Yield • Disease Resistant • 10kg Bag",
    price: 600,
    originalPrice: 720,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuWfjWr0p5XkK1rHLLnTdxUDbYf9ayByiYPyjBZSVjMOrBETL5wVjPWTeraHHQq3KI7QOLZBfFAsfhcT0gPrEVSEhehtC8frutSK3EDnUjBnay621C29bEQjr8loouTvCKmhDcB2Hf3ARHy2QR2UYWq8OdX9HMF-DKN2OhTKpYVlwob-A8MH_P-2_1vk4EUTTMsGJJbUczKUMg-lUXBU87mQ4mml0IVjYZoDUKFVhRJfU6ZJcnrchh7Q",
    category: "seeds",
    tags: ["staple crop", "high yield", "disease resistant"],
    inStock: true,
    rating: 4.7,
    reviewCount: 203,
    specifications: {
      "Weight": "10 kg",
      "Coverage": "~0.4 hectares",
      "Variety": "HD-3086 (High Yield)",
      "Sowing Season": "Rabi (Oct-Dec)",
      "Yield Potential": "55-65 quintals/hectare",
      "Disease Resistance": "Rust, Blight, Smut",
      "Protein Content": "12-13%",
      "Certification": "ICAR Certified"
    },
    reviews: [
      { id: 1, author: "Harpreet S.", rating: 5, date: "2024-11-02", text: "Best wheat seeds I've used in 15 years of farming. Uniform germination, excellent tillering." },
      { id: 2, author: "Gurpreet K.", rating: 5, date: "2024-10-28", text: "Got 62 quintals per hectare this season. Highly recommended for Punjab region." }
    ]
  },
  {
    id: 4,
    name: "Organic Fertilizer Mix (5kg)",
    description: "Balanced organic fertilizer blend enriched with neem cake, vermicompost, and rock phosphate. Improves soil health naturally without chemical buildup. Safe for all crops including vegetables, fruits, and grains.",
    shortDescription: "Neem Cake + Vermicompost + Rock Phosphate • 5kg",
    price: 450,
    originalPrice: 520,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    category: "fertilizers",
    tags: ["organic", "soil health", "neem cake"],
    inStock: true,
    rating: 4.9,
    reviewCount: 156,
    specifications: {
      "Weight": "5 kg",
      "Composition": "Neem Cake (40%), Vermicompost (35%), Rock Phosphate (25%)",
      "NPK Ratio": "4-2-3 (approx.)",
      "Application": "2-3 kg per 100 sq ft",
      "Suitable For": "All crops - vegetables, fruits, grains, flowers",
      "Certification": "NPOP Organic Certified",
      "Shelf Life": "12 months from manufacture",
      "Packaging": "Moisture-proof recyclable bag"
    },
    reviews: [
      { id: 1, author: "Meera D.", rating: 5, date: "2024-10-18", text: "Soil texture improved dramatically. My vegetable yield increased by 30% this season." },
      { id: 2, author: "Rajesh K.", rating: 5, date: "2024-09-25", text: "No chemical smell, earthy fragrance. Plants look healthier within 2 weeks of application." }
    ]
  },
  {
    id: 5,
    name: "Stainless Steel Hand Trowel",
    description: "Ergonomic stainless steel hand trowel with comfortable wooden handle. Rust-resistant, durable, and designed for precision work in tight spaces. Perfect for transplanting, weeding, and soil preparation.",
    shortDescription: "Ergonomic Wooden Handle • Rust-Resistant • Lifetime Warranty",
    price: 380,
    originalPrice: 450,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQ5qFyHT9ioibx5ZQTpCloDXxm2Tv6khFIhk-FDlai6JTZ1fGojf5QPsYWVKP8NXlBaeZ3D3bS_OeWTBkW3uocwWkX8rcPDYTbPSBPI9iOgUvifemOUg",
    category: "tools",
    tags: ["hand tool", "stainless steel", "ergonomic"],
    inStock: true,
    rating: 4.8,
    reviewCount: 67,
    specifications: {
      "Material": "304 Stainless Steel Blade, Sustainable Hardwood Handle",
      "Blade Length": "6 inches",
      "Total Length": "11.5 inches",
      "Weight": "280g",
      "Handle Type": "Ergonomic D-grip",
      "Warranty": "Lifetime against manufacturing defects",
      "Care": "Wipe clean after use, oil wooden handle annually"
    },
    reviews: [
      { id: 1, author: "Kavya N.", rating: 5, date: "2024-10-10", text: "Perfect balance and weight. The wooden handle feels great even after hours of use." },
      { id: 2, author: "Amit P.", rating: 4, date: "2024-09-15", text: "High quality steel, no rust after months of use. Slightly pricey but worth it." }
    ]
  },
  {
    id: 6,
    name: "Drip Irrigation Kit (100m)",
    description: "Complete drip irrigation system for up to 100 sq meters. Includes main line, drippers, connectors, stakes, and timer. Saves up to 70% water compared to flood irrigation. Easy DIY installation.",
    shortDescription: "Water Saving 70% • 100m Coverage • Includes Timer",
    price: 2200,
    originalPrice: 2800,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    category: "tools",
    tags: ["irrigation", "water saving", "diy kit"],
    inStock: true,
    rating: 4.5,
    reviewCount: 92,
    specifications: {
      "Coverage Area": "Up to 100 sq meters",
      "Main Pipe": "16mm LDPE, 50m",
      "Drippers": "20pcs (4 L/h pressure compensating)",
      "Connectors": "Tees, elbows, end caps, joiners",
      "Stakes": "20pcs plastic stakes",
      "Timer": "Battery-operated digital timer included",
      "Filter": "120 mesh screen filter",
      "Pressure Range": "1-3 bar",
      "Water Saving": "Up to 70% vs flood irrigation"
    },
    reviews: [
      { id: 1, author: "Suresh R.", rating: 5, date: "2024-10-22", text: "Installed in 2 hours. Water bill dropped 60%. Timer works perfectly. Great value." },
      { id: 2, author: "Lakshmi T.", rating: 4, date: "2024-09-30", text: "Good kit for small farm. Instructions clear. Need better quality stakes though." }
    ]
  }
];

const mockCategories = [
  { id: "all", name: "All Products", icon: "grid_view" },
  { id: "seeds", name: "Seeds", icon: "grass", count: 3 },
  { id: "fertilizers", name: "Fertilizers", icon: "eco", count: 1 },
  { id: "tools", name: "Tools & Equipment", icon: "build", count: 2 }
];

const mockEvents = [
  {
    id: 1,
    title: "Organic Farming Workshop",
    date: "November 15, 2024",
    time: "9:00 AM - 4:00 PM",
    location: "Krishi Vigyan Kendra, Pune",
    description: "Learn sustainable organic farming techniques from experts. Hands-on training in composting, natural pest management, and soil health improvement.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    registered: 45,
    capacity: 60,
    type: "workshop"
  },
  {
    id: 2,
    title: "Seed Festival & Exchange",
    date: "December 8, 2024",
    time: "10:00 AM - 6:00 PM",
    location: "Agrinagar Community Ground, Maharashtra",
    description: "Annual celebration of seed diversity. Exchange heirloom varieties, attend talks by seed savers, and discover rare indigenous crops.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQ5qFyHT9ioibx5ZQTpCloDXxm2Tv6khFIhk-FDlai6JTZ1fGojf5QPsYWVKP8NXlBaeZ3D3bS_OeWTBkW3uocwWkX8rcPDYTbPSBPI9iOgUvifemOUg",
    registered: 120,
    capacity: 200,
    type: "festival"
  }
];

const indianStates = []; // loaded from /api/states on init
const districtsByState = {}; // loaded from /api/states/:code/districts on demand

// ============================================
// BACKEND-SYNCED DATA (populated from API)
// ============================================
let activeProducts = mockProducts; // will be replaced by API data when available
let activeCategories = mockCategories;
let activeEvents = mockEvents;
let apiAvailable = false;

async function syncFromBackend() {
  const ordersPath = "/orders";
  const wishlistPath = state.authUser ? "/wishlist" : null;
  const [productsData, categoriesData, eventsData, ordersData, statesData, wishlistData] = await Promise.all([
    apiGet("/products"),
    apiGet("/categories"),
    apiGet("/events"),
    apiGet(ordersPath),
    apiGet("/states"),
    wishlistPath ? apiGet(wishlistPath) : Promise.resolve(null)
  ]);
  if (productsData) {
    activeProducts = productsData;
    apiAvailable = true;
  }
  if (categoriesData) activeCategories = categoriesData;
  if (eventsData) activeEvents = eventsData;
  if (ordersData) {
    // Merge backend orders with local orders (backend is source of truth when available)
    if (ordersData.length > 0 || state.authUser) {
      state.orders = ordersData;
      saveOrders();
      if (!state.lastOrder && ordersData.length > 0) {
        state.lastOrder = ordersData[ordersData.length - 1];
      }
    }
  }
  if (Array.isArray(statesData) && statesData.length) {
    indianStates.length = 0;
    indianStates.push(...statesData);
  }
  if (Array.isArray(wishlistData)) {
    state.wishlistCount = wishlistData.length;
  } else {
    state.wishlistCount = 0;
  }
  if (apiAvailable) {
    console.log(`✅ Backend connected: ${activeProducts.length} products loaded from API`);
  } else {
    console.log("⚠️ Backend unavailable — using mock data");
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
  currentPage: "home",
  currentProduct: null,
  cart: [],
  selectedCategory: "all",
  searchQuery: "",
  sortBy: "featured",
  checkoutStep: 1,
  billingAddress: {},
  paymentMethod: "upi",
  lastOrder: null,
  orders: [],
  isMobileMenuOpen: false,
  isCartSidebarOpen: false,
  priceRange: "all",
  authUser: JSON.parse(localStorage.getItem("krishi_user") || "null"),
  authMode: "login", // login | signup | verify | forgot | reset
  authPendingEmail: "",
  authPendingPurpose: "" // signup | reset
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartTotal() {
  const subtotal = getCartSubtotal();
  const discount = subtotal > 1000 ? 200 : 0;
  const shipping = subtotal > 2000 ? 0 : 60;
  return subtotal - discount + shipping;
}

// ============================================
// LOCAL STORAGE — minimal cache only
// Cart and orders are SERVER-SOURCE-OF-TRUTH.
// LocalStorage is only used for: auth user, last viewed product, UI prefs.
// On login: pull fresh from server. On any action: push to server immediately.
// ============================================
function saveCart() {
  // Cart lives on the server (POST/PUT /api/cart). We keep an in-memory copy only.
  // The server is hit on every cart change. No offline persistence.
  if (state.authUser?.email && apiAvailable) {
    // Fire and forget — server is source of truth
    fetch(`${API_BASE}/cart`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items: state.cart })
    }).catch(e => console.warn("saveCart sync failed:", e.message));
  }
}

function loadCart() {
  // Cart is fetched from /api/cart on login (see syncServerCartOnLogin).
  // No localStorage fallback — empty cart if not logged in.
  if (!state.authUser?.email) {
    state.cart = [];
  }
}

function saveOrders() {
  // Orders live on the server. We cache in-memory only.
  // No localStorage writes — server is source of truth.
}

function loadOrders() {
  // Orders are fetched from /api/orders. No localStorage fallback.
  if (!state.authUser?.email) {
    state.orders = [];
  }
}

function generateOrderId() {
  return "#KS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getProductById(id) {
  return activeProducts.find(p => p.id === parseInt(id));
}

function filterProducts() {
  let products = [...activeProducts];

  if (state.selectedCategory !== "all") {
    products = products.filter(p => p.category === state.selectedCategory);
  }

  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  if (state.priceRange && state.priceRange !== "all") {
    switch (state.priceRange) {
      case "under500":
        products = products.filter(p => p.price < 500);
        break;
      case "500-1000":
        products = products.filter(p => p.price >= 500 && p.price <= 1000);
        break;
      case "1000-2000":
        products = products.filter(p => p.price >= 1000 && p.price <= 2000);
        break;
      case "over2000":
        products = products.filter(p => p.price > 2000);
        break;
    }
  }

  switch (state.sortBy) {
    case "price-low":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      products.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      products.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      products.sort((a, b) => b.id - a.id);
      break;
    default:
      // featured - keep original order
      break;
  }

  return products;
}

// ============================================
// COMPONENT RENDERERS
// ============================================

function renderNav() {
  const cartCount = getCartCount();
  const authUser = state.authUser;
  const wishlistCount = state.wishlistCount || 0;
  const navLinks = [
    { page: "home", label: "Home" },
    { page: "shop", label: "Shop" },
    { page: "home", label: "Impact", action: "scrollToEvents()" },
    { page: "about", label: "About" }
  ];

  return `
    <header class="bg-surface sticky top-0 z-50 w-full border-b border-outline-variant">
      <div class="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-16 md:h-20">
        <button class="md:hidden p-2 -ml-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="${state.isMobileMenuOpen ? "Close menu" : "Open menu"}" onclick="toggleMobileMenu()">
          <span class="material-symbols-outlined" aria-hidden="true">${state.isMobileMenuOpen ? "close" : "menu"}</span>
        </button>
        <a class="text-headline-md md:text-headline-lg font-headline-md text-primary tracking-tight flex items-center gap-2" href="#home" onclick="navigateTo('home')" aria-label="Krishi Sewa - home">
          <img alt="" class="hidden md:block h-10 w-10 object-contain rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE" aria-hidden="true">
          <span>Krishi Sewa</span>
        </a>
        <nav class="hidden md:flex gap-gutter items-center flex-1 justify-center" aria-label="Main navigation">
          ${navLinks.map(link => `
            <a class="font-label-md text-label-md transition-colors duration-200 ${state.currentPage === link.page && !link.action ? 'text-primary border-b-2 border-primary pb-1 font-bold' : 'text-on-surface-variant hover:text-primary'}" href="#${link.page}" onclick="navigateTo('${link.page}')${link.action ? '; ' + link.action : ''}; return false;">${link.label}</a>
          `).join("")}
        </nav>
        <div class="flex items-center gap-1 md:gap-stack-md">
          <button class="hidden md:flex p-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-full transition-colors min-w-[48px] min-h-[48px] items-center justify-center" aria-label="Search products" onclick="openSearchDialog()">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
          </button>
          <button class="relative p-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-full transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" onclick="navigateTo('wishlist')" aria-label="Wishlist (${wishlistCount} items)">
            <span class="material-symbols-outlined text-[24px]" aria-hidden="true" style="font-variation-settings: 'FILL' 1;">favorite</span>
            ${wishlistCount > 0 ? `<span class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error border border-surface">${wishlistCount > 99 ? "99+" : wishlistCount}</span>` : ""}
          </button>
          <button class="relative p-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-full transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" onclick="navigateTo('cart')" aria-label="Cart (${cartCount} items)">
            <span class="material-symbols-outlined text-[24px]" aria-hidden="true" style="font-variation-settings: 'FILL' 1;">shopping_cart</span>
            ${cartCount > 0 ? `<span class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-ochre text-[10px] font-bold text-on-tertiary-fixed border border-surface">${cartCount > 99 ? "99+" : cartCount}</span>` : ""}
          </button>
          ${authUser ? `
            <button onclick="navigateTo('profile')" class="hidden md:flex items-center gap-2 bg-secondary-container rounded-full pl-1 pr-3 py-1 border border-outline-variant hover:border-primary transition-colors min-h-[40px]" aria-label="My profile">
              <div class="h-8 w-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">${(authUser.name || authUser.email || "U")[0].toUpperCase()}</div>
              <span class="text-xs font-semibold text-on-secondary-container max-w-[120px] truncate hidden lg:inline">${(authUser.name || authUser.email || "User")}</span>
              <span class="material-symbols-outlined text-on-surface-variant text-base" aria-hidden="true">expand_more</span>
            </button>
          ` : `
            <button class="hidden md:flex items-center gap-1 bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:opacity-90 transition-opacity min-h-[40px]" onclick="navigateTo('auth')">
              <span class="material-symbols-outlined text-lg" aria-hidden="true">login</span> Login
            </button>
          `}
        </div>
      </div>
    </header>
    ${renderMobileDrawer()}
  `;
}

function renderMobileDrawer() {
  if (!state.isMobileMenuOpen) return "";

  const drawerLinks = [
    { page: "home", icon: "home", label: "Home" },
    { page: "shop", icon: "storefront", label: "Shop" },
    { page: "orders", icon: "package_2", label: "My Orders" },
    { page: "home", icon: "eco", label: "Impact", action: "scrollToEvents()" },
    { page: "about", icon: "groups", label: "About Us" }
  ];
  if (state.authUser) {
    drawerLinks.push({ page: "profile", icon: "account_circle", label: state.authUser.name || "My Profile" });
  } else {
    drawerLinks.push({ page: "auth", icon: "login", label: "Login / Sign Up" });
  }

  return `
    <div class="md:hidden fixed inset-0 z-[55]" onclick="closeMobileMenu()">
      <div class="absolute inset-0 bg-inverse-surface/40"></div>
      <nav class="absolute left-0 top-0 h-full w-[280px] bg-surface border-r border-outline-variant shadow-xl flex flex-col py-6 drawer-slide-in" onclick="event.stopPropagation()">
        <div class="px-6 mb-8">
          <h2 class="font-headline-lg text-headline-lg text-primary">Krishi Sewa Foundation</h2>
        </div>
        <div class="flex flex-col gap-1 px-2 flex-1">
          ${drawerLinks.map(link => `
            <button class="flex items-center gap-4 w-full px-4 py-3 min-h-[48px] rounded-full transition-colors ${state.currentPage === link.page && !link.action ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container-high"}" onclick="navigateTo('${link.page}')${link.action ? "; " + link.action : ""}">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${state.currentPage === link.page && !link.action ? 1 : 0};">${link.icon}</span>
              <span class="font-body-md text-body-md ${state.currentPage === link.page && !link.action ? "font-semibold" : ""}">${link.label}</span>
            </button>
          `).join("")}
        </div>
        <div class="px-6 pt-4 border-t border-outline-variant mt-4 space-y-2">
          ${state.authUser ? `
            <div class="text-xs text-on-surface-variant text-center">Signed in as <b class="text-primary">${state.authUser.email}</b></div>
            <button class="w-full border border-outline-variant text-error font-label-md text-label-md min-h-[48px] rounded-xl hover:bg-error-container transition-colors flex items-center justify-center gap-2" onclick="handleLogout()">
              <span class="material-symbols-outlined">logout</span> Logout
            </button>
          ` : `
            <button class="w-full bg-primary text-on-primary font-label-md text-label-md min-h-[48px] rounded-xl hover:bg-primary-container transition-colors flex items-center justify-center gap-2" onclick="navigateTo('auth'); closeMobileMenu()">
              <span class="material-symbols-outlined">login</span> Login / Sign Up
            </button>
          `}
        </div>
      </nav>
    </div>
  `;
}

function renderMobileBottomNav() {
  const navItems = [
    { page: "home", icon: "home", label: "Home" },
    { page: "shop", icon: "storefront", label: "Shop" },
    { page: "wishlist", icon: "favorite", label: "Saved" },
    { page: "cart", icon: "shopping_cart", label: "Cart" },
    { page: "profile", icon: "account_circle", label: "Profile" }
  ];

  const hideOnPages = ["checkout", "confirmation", "auth", "coming-soon"];
  if (hideOnPages.includes(state.currentPage)) return "";

  return `
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-outline-variant safe-area-bottom shadow-[0_-4px_12px_rgba(1,45,29,0.06)]" role="navigation" aria-label="Main navigation">
      <div class="flex justify-around items-center h-16 px-1 max-w-container-max mx-auto">
        ${navItems.map(item => {
          const isActive = state.currentPage === item.page || (item.page === "cart" && state.currentPage === "checkout");
          const badge = item.page === "cart" && state.cart.length > 0
            ? `<span class="absolute top-1 right-1 bg-error text-on-error text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">${state.cart.length}</span>`
            : (item.page === "wishlist" && (state.wishlistCount || 0) > 0
              ? `<span class="absolute top-1 right-1 bg-error text-on-error text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">${state.wishlistCount}</span>`
              : "");
          return `
            <button class="relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-xl transition-colors ${isActive ? "text-primary" : "text-on-surface-variant"}" onclick="navigateTo('${item.page}')" aria-label="${item.label}" aria-current="${isActive ? 'page' : 'false'}">
              <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' ${isActive ? 1 : 0};" aria-hidden="true">${item.icon}</span>
              <span class="text-[10px] font-semibold">${item.label}</span>
              ${badge}
            </button>
          `;
        }).join("")}
      </div>
    </nav>
  `;
}

function renderFooter() {
  return `
    <footer class="bg-secondary-container w-full mt-auto">
      <div class="w-full py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-3 gap-stack-lg border-t border-outline-variant/20">
        <div class="flex flex-col gap-stack-sm">
          <span class="text-headline-sm font-headline-sm text-primary">Krishi Sewa Foundation</span>
          <p class="text-body-sm font-body-sm text-on-secondary-container max-w-md">
            © 2026 Krishi Sewa Foundation. Preserving heritage, nurturing growth.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <h3 class="font-label-md text-label-md text-primary">Get harvest updates</h3>
          <form onsubmit="event.preventDefault(); handleNewsletter(this);" class="flex gap-2 max-w-sm">
            <label class="sr-only" for="newsletter-email">Email address</label>
            <input id="newsletter-email" type="email" required placeholder="your@email.com" class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm focus:border-primary focus:outline-none" autocomplete="email">
            <button type="submit" class="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors min-h-[40px]">Subscribe</button>
          </form>
          <p class="text-xs text-on-secondary-container/70">Monthly tips, seed availability, event invites.</p>
        </div>
        <div class="flex flex-col md:items-end gap-stack-sm">
          <div class="flex flex-wrap md:justify-end gap-x-gutter gap-y-stack-sm text-label-sm font-label-sm">
            <a class="text-on-secondary-container hover:underline decoration-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[32px] flex items-center" href="#about" onclick="navigateTo('about')">Our Mission</a>
            <a class="text-on-secondary-container hover:underline decoration-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[32px] flex items-center" href="#home" onclick="navigateTo('home'); scrollToEvents()">Events</a>
            <a class="text-on-secondary-container hover:underline decoration-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[32px] flex items-center" href="#about" onclick="navigateTo('about')">Contact</a>
            <a class="text-on-secondary-container hover:underline decoration-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[32px] flex items-center" href="#home" onclick="navigateTo('home')">FAQ</a>
          </div>
          <div class="flex gap-2 md:justify-end">
            <a href="https://wa.me/919999999999" class="h-9 w-9 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-110 transition-transform" aria-label="WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c0-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.875 2.909 4.366 2.909 7.021-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/></svg>
            </a>
            <a href="https://instagram.com" class="h-9 w-9 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-110 transition-transform" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
            <a href="https://facebook.com" class="h-9 w-9 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-110 transition-transform" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

function handleNewsletter(form) {
  const email = form.querySelector("input[type=email]").value.trim();
  if (!email) return;
  // In a real app this would call an API. For now, save to localStorage as a subscriber.
  try {
    const subs = JSON.parse(localStorage.getItem("krishi_newsletter") || "[]");
    if (!subs.includes(email)) subs.push(email);
    localStorage.setItem("krishi_newsletter", JSON.stringify(subs));
    toast("Thanks! We'll send you harvest updates 🌾", "success");
    form.reset();
  } catch {
    toast("Subscription failed", "error");
  }
}

// ============================================
// SKELETON LOADERS — shown while data loads
// ============================================
function renderProductCardSkeleton() {
  return `
    <div class="bg-surface flex flex-col rounded-2xl border border-outline-variant overflow-hidden p-3 gap-3 h-full">
      <div class="w-full aspect-[4/3] rounded-xl bg-surface-variant animate-pulse"></div>
      <div class="space-y-2 px-1">
        <div class="h-3 w-12 bg-surface-variant rounded animate-pulse"></div>
        <div class="h-4 w-full bg-surface-variant rounded animate-pulse"></div>
        <div class="h-4 w-3/4 bg-surface-variant rounded animate-pulse"></div>
        <div class="h-5 w-1/2 bg-surface-variant rounded animate-pulse mt-2"></div>
      </div>
    </div>
  `;
}

function renderProductGridSkeleton(count = 8) {
  return Array(count).fill(0).map(() => renderProductCardSkeleton()).join("");
}

function renderSkeletonBar(w = "w-full", h = "h-4") {
  return `<div class="${h} ${w} bg-surface-variant rounded animate-pulse"></div>`;
}

function renderProductCard(product, compact = false) {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  if (compact) {
    return `
      <div class="relative">
        <button class="bg-surface flex flex-col rounded-2xl border border-outline-variant overflow-hidden p-3 gap-3 text-left hover:border-primary transition-colors duration-300 h-full w-full" onclick="navigateTo('product', { productId: ${product.id} })">
          <div class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-low">
            <img alt="${product.name}" class="w-full h-full object-cover" src="${product.image}">
            ${discount > 0 ? `<span class="absolute top-2 left-2 bg-error-container text-on-error-container text-label-sm font-bold px-2 py-1 rounded-md">-${discount}%</span>` : ""}
          </div>
          <div class="flex flex-col flex-grow justify-between gap-2 px-1 pb-1">
            <div>
              <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">${product.category}</p>
              <h3 class="font-body-md text-body-md font-semibold text-on-surface line-clamp-2 leading-snug">${product.name}</h3>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="font-headline-sm text-headline-sm text-primary">${formatPrice(product.price)}</span>
              ${product.originalPrice && product.originalPrice > product.price ? `<span class="text-body-sm text-outline line-through">${formatPrice(product.originalPrice)}</span>` : ""}
            </div>
          </div>
        </button>
        <button onclick="event.stopPropagation(); toggleWishlist(${product.id})" class="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center hover:scale-110 transition-transform z-10" title="Add to wishlist">
          <span class="material-symbols-outlined text-error text-[18px]">favorite</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="flex flex-col bg-surface p-4 sm:p-6 rounded-xl border border-outline-variant group hover:border-primary transition-colors duration-300 h-full">
      <div class="w-full aspect-[4/3] rounded-lg overflow-hidden mb-4 border border-outline-variant/30">
        <img alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${product.image}">
      </div>
      <h3 class="text-headline-sm font-headline-sm text-on-surface mb-1 line-clamp-1">${product.name}</h3>
      <p class="text-body-sm font-body-sm text-on-surface-variant mb-3 line-clamp-1">${product.shortDescription}</p>
      <div class="flex items-center gap-2 mb-4">
        <span class="flex items-center gap-1 text-body-sm font-body-sm text-warning bg-warning-container px-2 py-1 rounded-full">
          <span class="material-symbols-outlined text-[14px]">star</span>
          ${product.rating} (${product.reviewCount})
        </span>
        ${discount > 0 ? `<span class="text-label-sm font-label-sm text-primary bg-primary-container px-2 py-1 rounded-full">${discount}% OFF</span>` : ''}
      </div>
      <div class="flex justify-between items-center mt-auto pt-4 border-t border-outline-variant/30">
        <div>
          ${product.originalPrice && product.originalPrice > product.price
    ? `<p class="text-body-sm font-body-sm text-on-surface-variant line-through decoration-outline">${formatPrice(product.originalPrice)}</p>`
    : ''}
          <p class="text-headline-sm font-headline-sm text-primary">${formatPrice(product.price)}</p>
        </div>
        <button class="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-2" onclick="addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
          ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  `;
}

// ============================================
// PAGE RENDERERS
// ============================================

function renderHomePage() {
  const featuredProducts = activeProducts.slice(0, 4);
  const isLoading = !apiAvailable && activeProducts.length === 0;

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap flex flex-col pb-20 md:pb-0">
      <!-- Hero Section - Mobile (Stitch) -->
      <section class="md:hidden mb-section-gap-mobile">
        <div class="relative bg-surface-container rounded-2xl overflow-hidden min-h-[400px] flex flex-col justify-end shadow-sm">
          <div class="absolute inset-0 z-0">
            <img alt="Krishi Sewa Foundation" class="w-full h-full object-cover opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPWeiIvkd0ynpUO4ZPgLuC2eS72yMTDWBKpQE4fkdqZf32KYpKfZvyB8rOlNmkQmiAOXMfPW4b94EZnGSpiJInPNMD_vDO1NabFTV0Ve30oOSSfcmdnsJfrT7NlGVW1kyBx3GrRYrHRwIKp_PvAPXW5s2XALZCOXFJMvfh4WSW-6fw-i1H9tLQ4kYcy0gQK29ng_Bfd5CWhkTkjokiE4qPeyEwoTJ6KSE4xziC3ff6xeffozhGGXyhBQ">
            <div class="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-transparent"></div>
          </div>
          <div class="relative z-10 flex flex-col gap-3 p-5">
            <span class="bg-accent-ochre text-on-tertiary-fixed text-label-sm font-label-sm px-3 py-1 rounded-full w-max uppercase tracking-wider">Spring Harvest</span>
            <h1 class="font-headline-lg text-headline-lg text-surface-bright leading-tight">Empowering local farmers with organic seeds.</h1>
            <p class="font-body-md text-body-md text-surface-container-low opacity-90">Join our cooperative to access premium supplies and expert guidance.</p>
            <div class="flex flex-col gap-3 w-full mt-2">
              <button class="w-full bg-primary-container text-surface-container-lowest font-label-md text-label-md min-h-[48px] rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform" onclick="navigateTo('shop')">
                Shop Now
              </button>
              <button class="w-full border-2 border-surface-container-low text-surface-container-lowest font-label-md text-label-md min-h-[48px] rounded-xl active:scale-95 hover:bg-surface-container-low/10 transition-colors" onclick="navigateTo('coming-soon')">
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Hero Section - Desktop -->
      <section class="hidden md:block relative mb-section-gap">
        <div class="absolute inset-0 rounded-2xl overflow-hidden">
          <img alt="Krishi Sewa Foundation - Empowering Farmers" class="w-full h-full object-cover opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ">
          <div class="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50"></div>
        </div>
        <div class="relative max-w-3xl px-gutter py-section-gap md:py-[120px]">
          <span class="inline-flex items-center gap-2 bg-primary-fixed/90 text-on-primary-fixed px-4 py-2 rounded-full text-label-md font-label-md mb-6 backdrop-blur-sm">
            <span class="material-symbols-outlined text-[18px]">eco</span>
            Non-Profit Foundation • Empowering Farmers Since 2010
          </span>
          <h1 class="font-headline-xl text-headline-xl md:text-headline-xl text-headline-lg-mobile text-on-primary mb-stack-md leading-tight">
            Cultivating Change, <br class="hidden md:block">Harvesting Hope
          </h1>
          <p class="font-body-lg text-body-lg text-primary-fixed mb-stack-lg max-w-2xl">
            We empower rural farming communities through sustainable agriculture, heritage seed preservation, and fair market access. Every purchase directly supports our mission.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button class="bg-secondary text-on-secondary px-8 py-4 rounded-lg font-label-md text-label-md hover:bg-secondary-container transition-colors flex items-center justify-center gap-2" onclick="navigateTo('shop')">
              <span class="material-symbols-outlined">storefront</span> Shop & Support
            </button>
            <button class="bg-transparent border-2 border-on-secondary/30 text-on-secondary px-8 py-4 rounded-lg font-label-md text-label-md hover:bg-on-secondary/10 transition-colors flex items-center justify-center gap-2" onclick="scrollToEvents()">
              <span class="material-symbols-outlined">event</span> Join Our Events
            </button>
          </div>
        </div>
      </section>

      <!-- Impact Stats -->
      <section class="mb-section-gap">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">50,000+</div>
            <div class="text-body-md font-body-md text-on-surface-variant">Farmers Empowered</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">1,200+</div>
            <div class="text-body-md font-body-md text-on-surface-variant">Heritage Seeds Preserved</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">15</div>
            <div class="text-body-md font-body-md text-on-surface-variant">States Across India</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">98%</div>
            <div class="text-body-md font-body-md text-on-surface-variant">Farmer Satisfaction</div>
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      <section class="mb-section-gap-mobile md:mb-section-gap">
        <div class="flex justify-between items-end mb-5 md:mb-stack-lg">
          <div>
            <h2 class="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg text-primary">Featured Supplies</h2>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1 hidden md:block">Handpicked selections supporting our farmers</p>
          </div>
          <button class="text-accent-ochre font-label-md text-label-md flex items-center hover:underline min-h-[48px]" onclick="navigateTo('shop')">
            View All <span class="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
          </button>
        </div>
        <div class="grid grid-cols-2 md:hidden gap-4">
          ${isLoading ? renderProductGridSkeleton(4) : featuredProducts.map(p => renderProductCard(p, true)).join("")}
        </div>
        <div class="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          ${isLoading ? renderProductGridSkeleton(4) : featuredProducts.map(p => renderProductCard(p)).join("")}
        </div>
      </section>

      <!-- Upcoming Events -->
      <section id="events" class="mb-section-gap">
        <div class="flex justify-between items-end mb-stack-lg">
          <div>
            <h2 class="font-headline-lg text-headline-lg text-primary">Upcoming Events</h2>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">Join our community gatherings</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          ${activeEvents.map(event => `
            <div class="flex flex-col md:flex-row bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden group hover:border-primary transition-colors duration-300">
              <div class="w-full md:w-1/2 h-48 md:h-auto min-h-[200px]">
                <img alt="${event.title}" class="w-full h-full object-cover" src="${event.image}">
              </div>
              <div class="flex flex-col p-6 justify-between flex-1">
                <div>
                  <div class="flex items-center gap-2 text-label-sm font-label-md text-primary mb-2">
                    <span class="material-symbols-outlined text-[16px]">${event.type === 'workshop' ? 'school' : 'celebration'}</span>
                    ${event.type === 'workshop' ? 'Workshop' : 'Festival'}
                  </div>
                  <h3 class="font-headline-md text-headline-md text-on-surface mb-2">${event.title}</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-3">${event.description}</p>
                  <div class="flex flex-wrap gap-4 text-body-sm font-body-sm text-on-surface-variant">
                    <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">calendar_today</span> ${event.date}</div>
                    <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">schedule</span> ${event.time}</div>
                    <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">location_on</span> ${event.location}</div>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between">
                  <div class="text-label-sm font-label-sm text-on-surface-variant">
                    ${event.registered}/${event.capacity} registered
                  </div>
                  <button class="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" onclick="navigateTo('coming-soon')">
                    Register
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- CTA Section -->
      <section class="bg-primary-container rounded-2xl p-8 md:p-16 text-center">
        <div class="max-w-2xl mx-auto">
          <span class="material-symbols-outlined text-primary text-5xl mb-4 block">volunteer_activism</span>
          <h2 class="font-headline-lg text-headline-lg text-on-primary-container mb-3">Join the Movement</h2>
          <p class="font-body-lg text-body-lg text-on-primary-container/80 mb-6">Your support helps us reach more farmers, preserve more heritage seeds, and build a more sustainable future for Indian agriculture.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors" onclick="navigateTo('shop')">
              Shop & Support Farmers
            </button>
            <button class="bg-transparent border-2 border-on-primary-container text-on-primary-container px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-on-primary-container/10 transition-colors" onclick="navigateTo('about')">
              Learn More About Us
            </button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderSearchPage() {
  const q = state.searchQuery || "";
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-24 md:pb-0">
      <h1 class="text-2xl font-bold text-primary mb-2">Search Results</h1>
      <p class="text-on-surface-variant mb-6">${q ? `Results for "<b>${escapeHtml(q)}</b>"` : "Type a search query"}</p>
      <div class="mb-4">
        <form onsubmit="event.preventDefault(); state.searchQuery=this.q.value.trim(); navigateTo('search');">
          <input name="q" value="${escapeHtml(q)}" placeholder="Search seeds, fertilizers, tools..." class="w-full border border-outline-variant rounded-full px-5 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
        </form>
      </div>
      <div id="searchResults" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <div class="col-span-full text-center text-on-surface-variant py-8">Loading…</div>
      </div>
    </main>
  `;
}

async function loadSearchResults() {
  const wrap = document.getElementById("searchResults");
  if (!wrap) return;
  const q = (state.searchQuery || "").trim();
  if (!q) { wrap.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">Enter a search query above</div>`; return; }
  wrap.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">Searching…</div>`;
  try {
    const results = await apiGet(`/search?q=${encodeURIComponent(q)}`);
    if (!results || results.length === 0) {
      wrap.innerHTML = `<div class="col-span-full text-center py-8">
        <span class="material-symbols-outlined text-outline text-5xl">search_off</span>
        <p class="text-on-surface-variant mt-2">No results for "${escapeHtml(q)}"</p>
      </div>`;
      return;
    }
    // Map Supabase results to local product format for renderProductCard
    const mapped = results.map(r => ({
      id: r.id, name: r.name, description: r.description, shortDescription: r.short_description,
      price: Number(r.price), originalPrice: Number(r.original_price), image: r.image,
      category: r.category, tags: r.tags, inStock: r.in_stock, rating: Number(r.rating),
      reviewCount: r.review_count
    }));
    wrap.innerHTML = mapped.map(p => renderProductCard(p, true)).join("");
  } catch (e) {
    wrap.innerHTML = `<div class="col-span-full text-center text-error py-8">Search failed: ${escapeHtml(e.message)}</div>`;
  }
}

function renderWishlistPage() {
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-24 md:pb-0">
      <h1 class="text-2xl font-bold text-primary mb-2">My Wishlist</h1>
      <p class="text-on-surface-variant mb-6">Products you've saved for later</p>
      <div id="wishlistGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <div class="col-span-full text-center text-on-surface-variant py-8">Loading…</div>
      </div>
    </main>
  `;
}

async function loadWishlistPage() {
  const wrap = document.getElementById("wishlistGrid");
  if (!wrap) return;
  if (!state.authUser) { wrap.innerHTML = `<div class="col-span-full text-center py-8"><a onclick="navigateTo('auth')" class="text-primary font-semibold cursor-pointer">Log in to see your wishlist</a></div>`; return; }
  try {
    const items = await apiGet("/wishlist") || [];
    if (items.length === 0) { wrap.innerHTML = `<div class="col-span-full text-center py-8"><span class="material-symbols-outlined text-outline text-5xl">favorite</span><p class="text-on-surface-variant mt-2">No saved products yet</p><button onclick="navigateTo('shop')" class="mt-3 text-primary font-semibold">Browse products →</button></div>`; return; }
    const products = [];
    for (const it of items) {
      const p = await apiGet(`/products/${it.product_id}`);
      if (p) products.push(p);
    }
    wrap.innerHTML = products.map(p => renderProductCard(p, true)).join("");
  } catch (e) {
    wrap.innerHTML = `<div class="col-span-full text-center text-error py-8">Failed to load: ${escapeHtml(e.message)}</div>`;
  }
}

function renderShopPage() {
  const products = filterProducts();
  const categories = activeCategories;

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-20 md:pb-0">
      <header class="mb-stack-lg border-b border-outline-variant pb-stack-sm">
        <h1 class="text-headline-lg md:text-headline-xl font-headline-lg md:font-headline-xl text-primary">Our Harvest</h1>
        <p class="text-body-md font-body-md text-on-surface-variant mt-1">Every purchase supports farmer livelihoods</p>
      </header>

      <!-- Mobile Category Chips -->
      <div class="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-1 px-1">
        ${categories.map(cat => `
          <button class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border transition-colors min-h-[44px] ${state.selectedCategory === cat.id ? "bg-primary text-on-primary border-primary" : "bg-surface border-outline-variant text-on-surface-variant"}" onclick="setCategory('${cat.id}')">
            <span class="material-symbols-outlined text-[18px]">${cat.icon}</span>
            <span class="font-label-md text-label-md whitespace-nowrap">${cat.name}</span>
          </button>
        `).join("")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <!-- Sidebar Filters (Desktop) -->
        <aside class="hidden lg:block lg:col-span-3 lg:sticky lg:top-28 space-y-6">
          <!-- Category Filter -->
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">Categories</h3>
            <div class="flex flex-col gap-2">
              ${categories.map(cat => `
                <button class="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors ${state.selectedCategory === cat.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}" onclick="setCategory('${cat.id}')">
                  <span class="material-symbols-outlined text-[20px]">${cat.icon}</span>
                  <span class="font-label-md text-label-md">${cat.name}</span>
                  ${cat.count !== undefined ? `<span class="ml-auto bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-label-sm font-label-sm">${cat.count}</span>` : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Price Range Filter -->
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">Price Range</h3>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="priceRange" class="text-primary focus:ring-primary h-4 w-4 border-outline-variant" ${!state.priceRange || state.priceRange === 'all' ? 'checked' : ''} onchange="setPriceRange('all')">
                <span class="text-body-md font-body-md text-on-surface">All Prices</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="priceRange" class="text-primary focus:ring-primary h-4 w-4 border-outline-variant" ${state.priceRange === 'under500' ? 'checked' : ''} onchange="setPriceRange('under500')">
                <span class="text-body-md font-body-md text-on-surface">Under ${formatPrice(500)}</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="priceRange" class="text-primary focus:ring-primary h-4 w-4 border-outline-variant" ${state.priceRange === '500-1000' ? 'checked' : ''} onchange="setPriceRange('500-1000')">
                <span class="text-body-md font-body-md text-on-surface">${formatPrice(500)} - ${formatPrice(1000)}</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="priceRange" class="text-primary focus:ring-primary h-4 w-4 border-outline-variant" ${state.priceRange === '1000-2000' ? 'checked' : ''} onchange="setPriceRange('1000-2000')">
                <span class="text-body-md font-body-md text-on-surface">${formatPrice(1000)} - ${formatPrice(2000)}</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="priceRange" class="text-primary focus:ring-primary h-4 w-4 border-outline-variant" ${state.priceRange === 'over2000' ? 'checked' : ''} onchange="setPriceRange('over2000')">
                <span class="text-body-md font-body-md text-on-surface">Above ${formatPrice(2000)}</span>
              </label>
            </div>
          </div>

          <!-- Sort By -->
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">Sort By</h3>
            <select class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors appearance-none" onchange="setSortBy(this.value)" value="${state.sortBy}">
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </aside>

        <!-- Product Grid -->
        <section class="lg:col-span-9">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">filter_list</span>
              <span class="text-body-md font-body-md text-on-surface">${products.length} products found</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-body-sm font-body-sm text-on-surface-variant">Search:</label>
              <input type="text" class="bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-3 py-2 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors w-48" placeholder="Search products..." value="${state.searchQuery}" oninput="setSearchQuery(this.value)">
            </div>
          </div>

          ${products.length === 0 && apiAvailable ? `
            <div class="text-center py-16">
              <span class="material-symbols-outlined text-outline text-6xl mb-4 block">search_off</span>
              <h3 class="font-headline-md text-headline-md text-on-surface-variant mb-2">No products found</h3>
              <p class="font-body-md text-body-md text-on-surface-variant">Try adjusting your filters or search terms</p>
              <button class="mt-4 bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" onclick="clearFilters()">Clear All Filters</button>
            </div>
          ` : products.length === 0 ? `
            <div class="grid grid-cols-2 lg:hidden gap-4">
              ${renderProductGridSkeleton(6)}
            </div>
            <div class="hidden lg:grid lg:grid-cols-3 gap-gutter">
              ${renderProductGridSkeleton(6)}
            </div>
          ` : `
            <div class="grid grid-cols-2 lg:hidden gap-4">
              ${products.map(p => renderProductCard(p, true)).join("")}
            </div>
            <div class="hidden lg:grid lg:grid-cols-3 gap-gutter">
              ${products.map(p => renderProductCard(p)).join("")}
            </div>
          `}
        </section>
      </div>
    </main>
  `;
}

function renderProductPage() {
  const product = state.currentProduct;
  if (!product) return render404Page();

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const inCart = state.cart.find(item => item.id === product.id);
  const cartQty = inCart ? inCart.quantity : 0;

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-20 md:pb-0">
      <nav class="mb-6 flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant" aria-label="Breadcrumb">
        <a href="#home" onclick="navigateTo('home')" class="hover:text-primary transition-colors">Home</a>
        <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        <a href="#shop" onclick="navigateTo('shop')" class="hover:text-primary transition-colors">Shop</a>
        <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        <span class="text-on-surface truncate max-w-[200px]">${product.name}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-gutter mb-section-gap">
        <!-- Product Image -->
        <div class="relative">
          <div class="aspect-[4/3] rounded-xl overflow-hidden border border-outline-variant">
            <img alt="${product.name}" class="w-full h-full object-cover" src="${product.image}" id="mainProductImage">
          </div>
          ${discount > 0 ? `
            <div class="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 rounded-lg font-label-md text-label-md shadow-md">
              ${discount}% OFF
            </div>
          ` : ''}
        </div>

        <!-- Product Details -->
        <div class="flex flex-col gap-6">
          <div>
            <span class="inline-flex items-center gap-1 bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-label-sm font-label-sm mb-3">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
            <h1 class="font-headline-xl text-headline-xl md:text-headline-xl text-headline-lg-mobile text-primary mb-3">${product.name}</h1>
            <div class="flex items-center gap-4 mb-4">
              <div class="flex items-center gap-1 text-body-md font-body-md text-warning">
                ${Array.from({length: 5}, (_, i) => `
                  <span class="material-symbols-outlined text-[20px] ${i < Math.floor(product.rating) ? 'fill' : ''}">${i < product.rating ? 'star' : 'star_border'}</span>
                `).join('')}
                <span class="text-on-surface-variant ml-2">(${product.reviewCount} reviews)</span>
              </div>
            </div>
            <p class="font-body-lg text-body-lg text-on-surface-variant mb-4">${product.description}</p>
            <div class="flex items-end gap-4 mb-4">
              ${product.originalPrice && product.originalPrice > product.price
    ? `<p class="text-body-lg font-body-lg text-on-surface-variant line-through decoration-outline">${formatPrice(product.originalPrice)}</p>`
    : ''}
              <p class="text-headline-lg font-headline-lg text-primary">${formatPrice(product.price)}</p>
            </div>
            <p class="text-body-sm font-body-sm text-primary">${product.inStock ? 'In Stock' : 'Out of Stock'}</p>
          </div>

          <!-- Quantity Selector & Add to Cart -->
          <div class="border-t border-outline-variant pt-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div class="flex items-center gap-2">
                <label class="text-label-md font-label-md text-on-surface">Quantity:</label>
                <div class="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest h-12">
                  <button class="px-4 text-on-surface-variant hover:text-primary transition-colors h-full flex items-center justify-center" onclick="updateProductQty(${product.id}, ${Math.max(1, cartQty - 1)})" ${cartQty <= 1 ? 'disabled' : ''}>
                    <span class="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <span class="text-label-md font-label-md w-12 text-center border-x border-outline-variant/30 h-full flex items-center justify-center" id="productQtyDisplay">${Math.max(1, cartQty)}</span>
                  <button class="px-4 text-on-surface-variant hover:text-primary transition-colors h-full flex items-center justify-center" onclick="updateProductQty(${product.id}, ${cartQty + 1})" ${!product.inStock ? 'disabled' : ''}>
                    <span class="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>
            </div>
            <button class="w-full bg-primary text-on-primary py-4 px-6 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors duration-300 flex items-center justify-center gap-2" onclick="addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
              ${cartQty > 0 ? `Update Cart (${cartQty} in cart)` : 'Add to Cart'}
            </button>
          </div>

          <!-- Trust Badges -->
          <div class="border-t border-outline-variant pt-6 flex flex-wrap gap-4">
            <div class="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-primary">verified_user</span> Quality Guaranteed
            </div>
            <div class="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-primary">local_shipping</span> Free Shipping on ₹2000+
            </div>
            <div class="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-primary">undo</span> Easy Returns
            </div>
            <div class="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-primary">support_agent</span> Farmer Support
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Section -->
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div class="flex border-b border-outline-variant" id="productTabs">
          <button class="flex-1 py-4 px-6 font-label-md text-label-md text-primary border-b-2 border-primary" onclick="showProductTab('description')" id="tab-description">Description</button>
          <button class="flex-1 py-4 px-6 font-label-md text-label-md text-on-surface-variant hover:text-on-surface" onclick="showProductTab('specifications')" id="tab-specifications">Specifications</button>
          <button class="flex-1 py-4 px-6 font-label-md text-label-md text-on-surface-variant hover:text-on-surface" onclick="showProductTab('reviews')" id="tab-reviews">Reviews (${product.reviewCount})</button>
        </div>
        <div class="p-6" id="productTabContent">
          ${renderProductDescriptionTab(product)}
        </div>
      </div>
    </main>
  `;
}

function renderProductDescriptionTab(product) {
  return `
    <div class="prose max-w-none text-on-surface">
      <h3 class="font-headline-md text-headline-md text-primary mb-4">About This Product</h3>
      <p class="font-body-md text-body-md text-on-surface-variant mb-6">${product.description}</p>
      <h3 class="font-headline-md text-headline-md text-primary mb-4">Key Features</h3>
      <ul class="list-disc list-inside space-y-2 text-body-md font-body-md text-on-surface-variant">
        ${product.tags.map(tag => `<li>${tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderProductSpecificationsTab(product) {
  return `
    <div class="space-y-4">
      ${Object.entries(product.specifications).map(([key, value]) => `
        <div class="flex flex-col sm:flex-row py-3 border-b border-outline-variant/30 last:border-0">
          <dt class="font-label-md text-label-md text-on-surface-variant sm:w-2/5">${key}</dt>
          <dd class="font-body-md text-body-md text-on-surface mt-1 sm:mt-0">${value}</dd>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProductReviewsTab(product) {
  return `
    <div class="space-y-6">
      ${product.reviews.map(review => `
        <div class="border-b border-outline-variant/30 pb-6 last:border-0 last:pb-0">
          <div class="flex justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <span class="material-symbols-outlined text-on-secondary-container text-[18px]">person</span>
              </div>
              <div>
                <p class="font-label-md text-label-md text-on-surface">${review.author}</p>
                <p class="font-body-sm text-body-sm text-on-surface-variant">${review.date}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 text-warning">
              ${Array.from({length: 5}, (_, i) => `
                <span class="material-symbols-outlined text-[18px] ${i < review.rating ? 'fill' : ''}">${i < review.rating ? 'star' : 'star_border'}</span>
              `).join('')}
            </div>
          </div>
          <p class="font-body-md text-body-md text-on-surface">${review.text}</p>
        </div>
      `).join('')}
      <button class="w-full bg-transparent border border-outline-variant text-on-surface-variant py-3 px-6 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">
        View All Reviews
      </button>
    </div>
  `;
}

function showProductTab(tabName) {
  const product = state.currentProduct;
  if (!product) return;

  document.querySelectorAll('#productTabs button').forEach(btn => {
    btn.classList.remove('text-primary', 'border-b-2', 'border-primary');
    btn.classList.add('text-on-surface-variant');
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.remove('text-on-surface-variant');
    activeTab.classList.add('text-primary', 'border-b-2', 'border-primary');
  }

  const content = document.getElementById('productTabContent');
  if (content) {
    switch (tabName) {
      case 'description':
        content.innerHTML = renderProductDescriptionTab(product);
        break;
      case 'specifications':
        content.innerHTML = renderProductSpecificationsTab(product);
        break;
      case 'reviews':
        content.innerHTML = renderProductReviewsTab(product);
        break;
    }
  }
}

// ============================================
// CART PAGE
// ============================================

function renderCartPage() {
  if (state.cart.length === 0) {
    return `
      <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col items-center text-center min-h-[60vh]">
        <div class="mb-6">
          <span class="material-symbols-outlined text-primary/30 text-9xl">shopping_cart</span>
        </div>
        <h1 class="font-headline-xl text-headline-xl text-primary mb-3">Your Cart is Empty</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-md">Looks like you haven't added any seeds or tools yet. Start cultivating your garden!</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors min-h-[48px] flex items-center justify-center gap-2" onclick="navigateTo('shop')">
            <span class="material-symbols-outlined">storefront</span> Browse Products
          </button>
          <button class="border border-outline-variant px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors min-h-[48px] flex items-center justify-center gap-2" onclick="openSearchDialog()">
            <span class="material-symbols-outlined">search</span> Search
          </button>
        </div>
        <div class="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
          <a onclick="navigateTo('shop'); setCategory('seeds')" class="cursor-pointer p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary text-left">
            <span class="material-symbols-outlined text-primary text-2xl">grass</span>
            <p class="font-semibold mt-1 text-sm">Seeds</p>
          </a>
          <a onclick="navigateTo('shop'); setCategory('fertilizers')" class="cursor-pointer p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary text-left">
            <span class="material-symbols-outlined text-primary text-2xl">science</span>
            <p class="font-semibold mt-1 text-sm">Fertilizers</p>
          </a>
          <a onclick="navigateTo('shop'); setCategory('tools')" class="cursor-pointer p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary text-left">
            <span class="material-symbols-outlined text-primary text-2xl">handyman</span>
            <p class="font-semibold mt-1 text-sm">Tools</p>
          </a>
        </div>
      </main>
    `;
  }

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-20 md:pb-0">
      <header class="mb-stack-lg border-b border-outline-variant pb-stack-sm">
        <h1 class="text-headline-xl font-headline-xl text-primary">Your Harvest Cart</h1>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <!-- Cart Items -->
        <section class="lg:col-span-8 flex flex-col gap-stack-md">
          ${state.cart.map(item => {
    const product = getProductById(item.id);
    if (!product) return '';
    const itemTotal = product.price * item.quantity;
    return `
            <div class="flex flex-col sm:flex-row gap-stack-md bg-surface p-gutter rounded-xl border border-outline-variant group hover:border-primary transition-colors duration-300" data-cart-item="${item.id}">
              <div class="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant/30">
                <img alt="${product.name}" class="w-full h-full object-cover" src="${product.image}">
              </div>
              <div class="flex-grow flex flex-col justify-between">
                <div class="flex justify-between items-start gap-4">
                  <div>
                    <h3 class="text-headline-sm font-headline-sm text-on-surface mb-1">${product.name}</h3>
                    <p class="text-body-sm font-body-sm text-on-surface-variant">${product.shortDescription}</p>
                  </div>
                  <button aria-label="Remove item" class="text-outline hover:text-error transition-colors p-1" onclick="removeFromCart(${item.id})">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div class="flex justify-between items-end mt-stack-md sm:mt-0">
                  <div class="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest h-10">
                    <button class="px-3 text-on-surface-variant hover:text-primary transition-colors h-full flex items-center justify-center" onclick="updateCartQty(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
                      <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span class="text-label-md font-label-md w-8 text-center border-x border-outline-variant/30 h-full flex items-center justify-center">${item.quantity}</span>
                    <button class="px-3 text-on-surface-variant hover:text-primary transition-colors h-full flex items-center justify-center" onclick="updateCartQty(${item.id}, ${item.quantity + 1})">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                  <div class="text-right">
                    <p class="text-headline-sm font-headline-sm text-primary">${formatPrice(itemTotal)}</p>
                  </div>
                </div>
              </div>
            </div>
          `;
  }).join('')}
        </section>

        <!-- Order Summary -->
        <aside class="lg:col-span-4 w-full lg:sticky lg:top-28">
          <div class="bg-secondary-container/30 border border-outline-variant rounded-xl p-gutter flex flex-col gap-stack-md">
            <h2 class="text-headline-sm font-headline-sm text-on-surface border-b border-outline-variant/50 pb-3">Order Summary</h2>
            <div class="flex flex-col gap-3 text-body-md font-body-md">
              <div class="flex justify-between items-center text-on-surface-variant">
                <span>Subtotal (${getCartCount()} items)</span>
                <span class="text-on-surface">${formatPrice(getCartSubtotal())}</span>
              </div>
              ${getCartSubtotal() > 1000 ? `
                <div class="flex justify-between items-center text-on-surface-variant">
                  <span>Heritage Discount</span>
                  <span class="text-primary">- ${formatPrice(200)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between items-center text-on-surface-variant border-b border-outline-variant/50 pb-3">
                <span>Standard Shipping</span>
                <span class="text-on-surface">${getCartSubtotal() > 2000 ? 'FREE' : formatPrice(60)}</span>
              </div>
              <div class="flex justify-between items-end pt-2">
                <span class="text-headline-sm font-headline-sm text-on-surface">Total</span>
                <span class="text-headline-md font-headline-md text-primary">${formatPrice(getCartTotal())}</span>
              </div>
              <p class="text-label-sm font-label-sm text-on-surface-variant text-right">Including all applicable taxes</p>
            </div>
            <button class="mt-stack-sm w-full bg-primary text-on-primary py-4 px-6 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors duration-300 flex items-center justify-center gap-2" onclick="navigateTo('checkout')">
              Proceed to Checkout
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <div class="flex items-start gap-2 mt-2 text-on-surface-variant bg-surface-container-lowest p-3 rounded border border-outline-variant/30">
              <span class="material-symbols-outlined text-primary text-[20px] shrink-0">verified_user</span>
              <p class="text-label-sm font-label-sm leading-tight">Every purchase directly supports rural farming communities through the Krishi Sewa foundation.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  `;
}

// ============================================
// CHECKOUT PAGE
// ============================================

function renderCheckoutPage() {
  if (state.cart.length === 0) {
    return renderCartPage();
  }

  return `
    <main class="flex-grow flex flex-col px-margin-mobile md:px-margin-desktop py-section-gap max-w-container-max mx-auto w-full">
      <header class="mb-stack-lg flex items-center justify-between">
        <button class="text-primary hover:opacity-80 transition-opacity focus:outline-none mr-4 md:hidden" aria-label="Back" onclick="navigateTo('cart')"><span class="material-symbols-outlined text-headline-md">arrow_back</span></button>
        <h1 class="text-headline-xl font-headline-xl text-primary tracking-tight">Checkout</h1>
        <a class="text-primary font-label-md flex items-center hover:underline decoration-primary transition-all hidden md:block" href="#cart" onclick="navigateTo('cart')">
          <span class="material-symbols-outlined mr-unit">arrow_back</span> Return to Cart
        </a>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <!-- Left Column: Forms -->
        <div class="lg:col-span-8 flex flex-col gap-stack-lg">
          <!-- Progress Steps -->
          <div class="hidden lg:flex items-center justify-between mb-6">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">1</div>
              <div class="w-24 h-0.5 bg-primary ml-2 mr-4"></div>
              <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">2</div>
              <div class="w-24 h-0.5 bg-outline-variant ml-2 mr-4"></div>
              <div class="w-8 h-8 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center font-bold border border-outline-variant">3</div>
            </div>
            <div class="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[18px]">verified_user</span> Secure checkout
            </div>
          </div>

          <!-- Billing Address -->
          <section class="bg-surface-container-lowest border border-secondary-container rounded-xl p-gutter">
            <h2 class="text-headline-md font-headline-md text-primary mb-stack-md flex items-center gap-2">
              <span class="material-symbols-outlined">location_on</span> Billing Address
            </h2>
            <div id="savedAddressesBlock"></div>
            <form class="grid grid-cols-1 md:grid-cols-2 gap-stack md" id="billingForm">
              <div class="md:col-span-2">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="fullName">Full Name</label>
                <input class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors" id="fullName" placeholder="e.g. Ramesh Kumar" type="text" value="${state.billingAddress.fullName || ''}" required>
              </div>
              <div class="md:col-span-2">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="phone">Phone Number</label>
                <input class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors" id="phone" placeholder="10-digit phone (e.g. 9876543210)" type="tel" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" minlength="10" value="${(state.billingAddress.phone || '').replace(/\D/g,'').slice(0,10)}" required oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)">
              </div>
              <div class="md:col-span-2">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="address">Address</label>
                <input class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors" id="address" placeholder="Street address, village or PO Box" type="text" value="${state.billingAddress.address || ''}" required>
              </div>
              <div class="md:col-span-2">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="address2">Address Line 2 (Optional)</label>
                <input class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors" id="address2" placeholder="Apartment, suite, floor, etc." type="text" value="${state.billingAddress.address2 || ''}">
              </div>
              <div class="md:col-span-1">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="stateSelect">State</label>
                <select class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors appearance-none" id="stateSelect" onchange="updateDistricts(this.value)">
                  <option value="">Select State</option>
                  ${indianStates.map(s => `<option value="${s.code}" ${state.billingAddress.state === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="md:col-span-1">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="districtSelect">District</label>
                <div class="relative group">
                  <select class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors appearance-none" id="districtSelect" ${!state.billingAddress.state ? 'disabled' : ''}>
                    <option value="" selected disabled>Select District</option>
                    ${state.billingAddress.state && districtsByState[state.billingAddress.state] ? districtsByState[state.billingAddress.state].map(d => `<option value="${d}" ${state.billingAddress.district === d ? 'selected' : ''}>${d}</option>`).join('') : ''}
                  </select>
                  <span class="material-symbols-outlined absolute right-4 top-3 pointer-events-none text-on-surface-variant">expand_more</span>
                </div>
              </div>
              <div class="md:col-span-2">
                <label class="block text-label-md font-label-md text-on-surface-variant mb-unit" for="pincode">Pincode <span class="text-on-surface-variant/60 text-xs font-normal" id="pincodeHint">— auto-fills state &amp; district</span></label>
                <input class="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary focus:ring-0 px-4 py-3 text-body-md text-on-surface rounded-t-DEFAULT outline-none transition-colors" id="pincode" placeholder="6-digit code" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${state.billingAddress.pincode || ''}" required oninput="onPincodeChange(this.value)">
              </div>
            </form>
            <label class="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" id="saveAddressCheckbox" class="accent-primary">
              Save this address to my account for future orders
            </label>
            <button class="mt-6 w-full md:w-auto bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center justify-center gap-2" onclick="proceedToPayment()">
              Continue to Payment <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </section>

          <!-- Payment Method (Step 2) -->
          <section class="bg-surface-container-lowest border border-secondary-container rounded-xl p-gutter" id="paymentSection" style="display: none;">
            <h2 class="text-headline-md font-headline-md text-primary mb-stack-md flex items-center gap-2">
              <span class="material-symbols-outlined">payment</span> Payment Method
            </h2>
            <div class="flex flex-col gap-stack-sm">
              <label class="flex items-center p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors relative group">
                <input class="text-primary focus:ring-primary h-5 w-5 border-outline-variant" name="paymentMethod" type="radio" value="upi" ${state.paymentMethod === 'upi' ? 'checked' : ''} onchange="setPaymentMethod('upi')">
                <span class="ml-3 flex flex-col">
                  <span class="text-body-lg font-body-lg text-on-surface">UPI</span>
                  <span class="text-body-sm font-body-sm text-on-surface-variant">Google Pay, PhonePe, Paytm, BHIM</span>
                </span>
                <span class="material-symbols-outlined ml-auto text-primary">qr_code</span>
              </label>
              <label class="flex items-center p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors relative group">
                <input class="text-primary focus:ring-primary h-5 w-5 border-outline-variant" name="paymentMethod" type="radio" value="card" ${state.paymentMethod === 'card' ? 'checked' : ''} onchange="setPaymentMethod('card')">
                <span class="ml-3 flex flex-col">
                  <span class="text-body-lg font-body-lg text-on-surface">Credit / Debit Card</span>
                  <span class="text-body-sm font-body-sm text-on-surface-variant">Visa, Mastercard, RuPay</span>
                </span>
                <span class="material-symbols-outlined ml-auto text-primary">credit_card</span>
              </label>
              <label class="flex items-center p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors relative group">
                <input class="text-primary focus:ring-primary h-5 w-5 border-outline-variant" name="paymentMethod" type="radio" value="netbanking" ${state.paymentMethod === 'netbanking' ? 'checked' : ''} onchange="setPaymentMethod('netbanking')">
                <span class="ml-3 flex flex-col">
                  <span class="text-body-lg font-body-lg text-on-surface">Net Banking</span>
                  <span class="text-body-sm font-body-sm text-on-surface-variant">All major Indian banks supported</span>
                </span>
                <span class="material-symbols-outlined ml-auto text-primary">account_balance</span>
              </label>
              <label class="flex items-center p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors relative group">
                <input class="text-primary focus:ring-primary h-5 w-5 border-outline-variant" name="paymentMethod" type="radio" value="cod" ${state.paymentMethod === 'cod' ? 'checked' : ''} onchange="setPaymentMethod('cod')">
                <span class="ml-3 flex flex-col">
                  <span class="text-body-lg font-body-lg text-on-surface">Cash on Delivery</span>
                  <span class="text-body-sm font-body-sm text-on-surface-variant">Pay when you receive your order</span>
                </span>
                <span class="material-symbols-outlined ml-auto text-primary">local_shipping</span>
              </label>
            </div>
            <div class="mt-6 flex gap-4">
              <button class="bg-transparent border border-outline-variant text-on-surface px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors" onclick="backToAddress()">Back</button>
              <button class="flex-1 bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center justify-center gap-2" onclick="placeOrder()">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">lock</span> Place Order
              </button>
            </div>
          </section>
        </div>

        <!-- Right Column: Order Summary -->
        <div class="lg:col-span-4 sticky top-stack-lg">
          <section class="bg-secondary-container rounded-xl p-gutter shadow-sm border border-secondary-fixed">
            <h3 class="text-headline-sm font-headline-sm text-on-secondary-container mb-stack-md border-b border-outline-variant pb-unit">Order Summary</h3>
            <div class="flex flex-col gap-stack-sm mb-stack-md max-h-64 overflow-y-auto pr-2">
              ${state.cart.map(item => {
    const product = getProductById(item.id);
    if (!product) return '';
    return `
                <div class="flex justify-between items-start">
                  <div class="flex-1 min-w-0">
                    <p class="text-body-md font-body-md text-on-secondary-container font-medium truncate">${product.name}</p>
                    <p class="text-label-sm font-label-sm text-on-surface-variant">Qty: ${item.quantity}</p>
                  </div>
                  <span class="text-body-md font-body-md text-on-secondary-container whitespace-nowrap">${formatPrice(product.price * item.quantity)}</span>
                </div>
              `;
  }).join('')}
            </div>
            <div class="border-t border-outline-variant pt-stack-sm flex flex-col gap-unit mb-stack-lg">
              <div class="flex justify-between">
                <span class="text-body-sm font-body-sm text-on-surface-variant">Subtotal</span>
                <span class="text-body-sm font-body-sm text-on-surface-variant">${formatPrice(getCartSubtotal())}</span>
              </div>
              ${getCartSubtotal() > 1000 ? `
                <div class="flex justify-between">
                  <span class="text-body-sm font-body-sm text-on-surface-variant">Heritage Discount</span>
                  <span class="text-body-sm font-body-sm text-primary">- ${formatPrice(200)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between">
                <span class="text-body-sm font-body-sm text-on-surface-variant">Shipping</span>
                <span class="text-body-sm font-body-sm text-on-surface-variant">${getCartSubtotal() > 2000 ? 'FREE' : formatPrice(60)}</span>
              </div>
              <div class="flex justify-between items-center mt-unit">
                <span class="text-headline-sm font-headline-sm text-on-secondary-container">Total</span>
                <span class="text-headline-sm font-headline-sm text-primary font-bold">${formatPrice(getCartTotal())}</span>
              </div>
            </div>
            <p class="text-center text-label-sm font-label-sm text-on-surface-variant mt-unit flex items-center justify-center">
              <span class="material-symbols-outlined text-[16px] mr-1">verified_user</span> Secure checkout
            </p>
          </section>
        </div>
      </div>
    </main>
  `;
}

// ============================================
// ORDER CONFIRMATION PAGE
// ============================================

function renderConfirmationPage() {
  const order = state.lastOrder;
  if (!order) {
    return `
      <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col items-center text-center">
        <span class="material-symbols-outlined text-outline text-8xl mb-6">error</span>
        <h1 class="font-headline-xl text-headline-xl text-primary mb-3">No Order Found</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mb-8">Please complete a purchase to see order confirmation.</p>
        <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" onclick="navigateTo('shop')">
          Start Shopping
        </button>
      </main>
    `;
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const expectedDelivery = new Date(order.date);
  expectedDelivery.setDate(expectedDelivery.getDate() + 4);
  const expectedDeliveryEnd = new Date(order.date);
  expectedDeliveryEnd.setDate(expectedDeliveryEnd.getDate() + 6);

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col items-center">
      <!-- Top Navigation -->
      <header class="flex justify-between items-center w-full px-margin-desktop md:px-margin-desktop px-margin-mobile h-20 max-w-container-max mx-auto border-b border-outline-variant bg-background w-full mb-8">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <img alt="Krishi Sewa Logo" class="w-10 h-10 object-contain rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE">
            <span class="font-headline-md text-headline-md text-primary hidden sm:block">Krishi Sewa</span>
          </div>
        </div>
        <div>
          <span class="material-symbols-outlined text-primary text-3xl">check_circle</span>
        </div>
      </header>

      <!-- Hero Success Banner -->
      <div class="text-center max-w-2xl mb-section-gap">
        <div class="mb-stack-md flex justify-center"><span class="material-symbols-outlined text-primary text-6xl md:text-[80px] leading-none">check_circle</span></div>
        <h1 class="font-headline-xl text-headline-xl md:text-headline-xl text-headline-lg-mobile text-primary mb-stack-sm">Your Harvest is Confirmed</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant">Thank you for cultivating change. Your purchase directly supports our foundation's mission to empower local farmers and promote sustainable agriculture.</p>
      </div>

      <div class="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-gutter mb-section-gap">
        <!-- Order Details Card -->
        <div class="bg-surface-container-lowest border border-secondary-container rounded-xl p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 p-4 opacity-10">
            <span class="material-symbols-outlined text-6xl text-primary">receipt_long</span>
          </div>
          <h2 class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">
            <span class="material-symbols-outlined">info</span> Order Summary
          </h2>
          <div class="space-y-4 font-body-md text-on-surface">
            <div class="flex justify-between border-b border-surface-variant pb-2">
              <span class="text-on-surface-variant">Order Number</span>
              <span class="font-label-md text-label-md">${order.id}</span>
            </div>
            <div class="flex justify-between border-b border-surface-variant pb-2">
              <span class="text-on-surface-variant">Date</span>
              <span class="">${formatDate(order.date)}</span>
            </div>
            <div class="flex justify-between border-b border-surface-variant pb-2">
              <span class="text-on-surface-variant">Payment Method</span>
              <span class="font-label-md text-label-md text-primary">${order.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="flex justify-between font-label-md text-label-md pt-2 text-primary">
              <span>Total Amount</span>
              <span>${formatPrice(order.total)}</span>
            </div>
          </div>
          <button class="mt-4 w-full bg-transparent border border-primary text-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">picture_as_pdf</span> Download Invoice (PDF)
          </button>
        </div>

        <!-- Delivery Details Card -->
        <div class="bg-surface-container-lowest border border-secondary-container rounded-xl p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 p-4 opacity-10">
            <span class="material-symbols-outlined text-6xl text-primary">local_shipping</span>
          </div>
          <h2 class="font-headline-sm text-headline-sm text-primary mb-stack-md flex items-center gap-2">
            <span class="material-symbols-outlined">pin_drop</span> Delivery Details
          </h2>
          <div class="space-y-2 font-body-md text-on-surface">
            <p class="font-label-md text-label-md">${order.address.fullName}</p>
            <p class="text-on-surface-variant">${order.address.address}${order.address.address2 ? '<br>' + order.address.address2 : ''}<br>${order.address.district}, ${order.address.state}<br>${order.address.pincode}</p>
            <p class="text-on-surface-variant mt-2 text-sm">Expected Delivery: ${expectedDelivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${expectedDeliveryEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </div>

      <!-- What's Next Timeline -->
      <div class="w-full max-w-4xl bg-surface-container-low rounded-xl p-8 mb-section-gap">
        <h2 class="font-headline-md text-headline-md text-primary mb-stack-lg text-center">What's Next?</h2>
        <div class="relative flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-4">
          <div class="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-outline-variant z-0"></div>
          <div class="md:hidden absolute left-6 top-8 bottom-8 w-0.5 bg-outline-variant z-0"></div>

          <div class="flex flex-row md:flex-col items-center gap-4 md:w-1/4 relative z-10 w-full">
            <div class="w-12 h-12 rounded-full ${order.status !== 'pending' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'} flex items-center justify-center shadow-sm">
              <span class="material-symbols-outlined">shopping_bag</span>
            </div>
            <div class="text-left md:text-center">
              <h3 class="font-label-md text-label-md ${order.status !== 'pending' ? 'text-primary' : 'text-on-surface'}">Order Placed</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 hidden md:block">We've received your request.</p>
            </div>
          </div>

          <div class="flex flex-row md:flex-col items-center gap-4 md:w-1/4 relative z-10 w-full">
            <div class="w-12 h-12 rounded-full ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'} flex items-center justify-center border-2 border-surface-container-low shadow-sm">
              <span class="material-symbols-outlined">grass</span>
            </div>
            <div class="text-left md:text-center">
              <h3 class="font-label-md text-label-md ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? 'text-on-surface' : 'text-on-surface-variant'}">Seeds Selected</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 hidden md:block">Preparing your items.</p>
            </div>
          </div>

          <div class="flex flex-row md:flex-col items-center gap-4 md:w-1/4 relative z-10 w-full">
            <div class="w-12 h-12 rounded-full ${order.status === 'shipped' || order.status === 'delivered' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-outline'} flex items-center justify-center border-2 border-${order.status === 'shipped' || order.status === 'delivered' ? 'primary' : 'outline-variant'} shadow-sm">
              <span class="material-symbols-outlined">fact_check</span>
            </div>
            <div class="text-left md:text-center">
              <h3 class="font-label-md text-label-md ${order.status === 'shipped' || order.status === 'delivered' ? 'text-on-surface' : 'text-on-surface-variant'}">Quality Check</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 hidden md:block">Ensuring best standards.</p>
            </div>
          </div>

          <div class="flex flex-row md:flex-col items-center gap-4 md:w-1/4 relative z-10 w-full">
            <div class="w-12 h-12 rounded-full ${order.status === 'delivered' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-outline'} flex items-center justify-center border-2 border-${order.status === 'delivered' ? 'primary' : 'outline-variant'} shadow-sm">
              <span class="material-symbols-outlined">local_shipping</span>
            </div>
            <div class="text-left md:text-center">
              <h3 class="font-label-md text-label-md ${order.status === 'delivered' ? 'text-on-surface' : 'text-on-surface-variant'}">Dispatched</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 hidden md:block">On its way to you.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time status history from server -->
      <div class="w-full max-w-3xl mb-section-gap">
        <div id="orderEventsTimeline" class="bg-surface-container-low border border-outline-variant rounded-xl p-6">
          <p class="text-sm text-on-surface-variant text-center">Loading order status…</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-section-gap">
        <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center justify-center gap-2" onclick="navigateTo('shop')">
          <span class="material-symbols-outlined">storefront</span> Continue Shopping
        </button>
        <button class="bg-transparent border border-primary text-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2" onclick="navigateTo('orders')">
          <span class="material-symbols-outlined">volunteer_activism</span> View My Orders
        </button>
      </div>
    </main>
  `;
}

// ============================================
// ORDERS PAGE
// ============================================

function renderOrdersPage() {
  if (state.orders.length === 0) {
    return `
      <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col items-center text-center">
        <span class="material-symbols-outlined text-outline text-8xl mb-6">history</span>
        <h1 class="font-headline-xl text-headline-xl text-primary mb-3">No Orders Yet</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-md">Your order history will appear here once you make a purchase.</p>
        <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" onclick="navigateTo('shop')">
          <span class="material-symbols-outlined mr-2">storefront</span> Start Shopping
        </button>
      </main>
    `;
  }

  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-20 md:pb-0">
      <header class="mb-stack-lg border-b border-outline-variant pb-stack-sm">
        <h1 class="text-headline-xl font-headline-xl text-primary">My Orders</h1>
      </header>
      <div class="space-y-6">
        ${state.orders.slice().reverse().map(order => `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-lg overflow-hidden border border-outline-variant/30 flex-shrink-0">
                  <img alt="${order.items[0] ? getProductById(order.items[0].id)?.name || 'Product' : 'Order'}" class="w-full h-full object-cover" src="${order.items[0] ? getProductById(order.items[0].id)?.image || '' : ''}">
                </div>
                <div>
                  <h3 class="font-headline-md text-headline-md text-on-surface">${order.items.length} item${order.items.length > 1 ? 's' : ''}</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Order ${order.id} • ${new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <span class="px-3 py-1 rounded-full text-label-sm font-label-md ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                  ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <span class="text-headline-sm font-headline-sm text-primary">${formatPrice(order.total)}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" onclick="viewOrderDetails('${order.id}')">
                <span class="material-symbols-outlined mr-1">visibility</span> View Details
              </button>
              ${order.status !== 'delivered' ? `
                <button class="bg-transparent border border-outline-variant text-on-surface-variant px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors" onclick="trackOrder('${order.id}')">
                  <span class="material-symbols-outlined mr-1">local_shipping</span> Track Order
                </button>
              ` : ''}
              <button class="bg-transparent border border-outline-variant text-on-surface-variant px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors" onclick="reorderItems('${order.id}')">
                <span class="material-symbols-outlined mr-1">replay</span> Buy Again
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </main>
  `;
}

// ============================================
// ABOUT PAGE
// ============================================

function renderAboutPage() {
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-20 md:pb-0">
      <header class="mb-section-gap text-center">
        <h1 class="font-headline-xl text-headline-xl md:text-headline-xl text-headline-lg-mobile text-primary mb-stack-md">About Krishi Sewa Foundation</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto">Preserving heritage, nurturing growth, and empowering farming communities across India since 2010.</p>
      </header>

      <section class="mb-section-gap">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
          <div>
            <h2 class="font-headline-lg text-headline-lg text-primary mb-4">Our Mission</h2>
            <div class="space-y-4 text-body-md font-body-md text-on-surface-variant">
              <p>Krishi Sewa Foundation was born from a simple belief: that every farmer deserves access to quality seeds, fair prices, and sustainable farming knowledge. We work directly with farming communities to preserve heritage seed varieties, promote organic practices, and create direct market linkages.</p>
              <p>Since our founding in 2010, we've expanded from a small seed bank in Maharashtra to a nationwide network supporting over 50,000 farmers across 15 states. Every purchase from our shop directly funds our programs.</p>
            </div>
          </div>
          <div class="aspect-[4/3] rounded-xl overflow-hidden border border-outline-variant">
            <img alt="Farmers working in fields" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ">
          </div>
        </div>
      </section>

      <section class="mb-section-gap">
        <h2 class="font-headline-lg text-headline-lg text-primary mb-stack-lg text-center">Our Impact</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">50,000+</div>
            <div class="text-body-md font-body-md text-on-surface-variant">Farming Families Supported</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">1,200+</div>
            <div class="text-body-md font-body-md text-on-surface-variant">Heritage Varieties Preserved</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
            <div class="text-headline-xl font-headline-xl text-primary mb-2">15</div>
            <div class="text-body-md font-body-md text-on-surface-variant">States Across India</div>
          </div>
        </div>
      </section>

      <section class="mb-section-gap">
        <h2 class="font-headline-lg text-headline-lg text-primary mb-stack-lg text-center">What We Do</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">grass</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Seed Conservation</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">We maintain community seed banks preserving indigenous varieties that are drought-resistant, pest-tolerant, and adapted to local conditions.</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">school</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Farmer Education</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">Regular workshops on organic farming, soil health, water conservation, and climate-resilient agriculture practices.</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">storefront</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Fair Market Access</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">Direct procurement at fair prices, eliminating middlemen. Farmers get 20-30% higher income through our platform.</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">eco</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Organic Certification</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">Supporting farmers through the organic certification process, opening premium markets for their produce.</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">water_drop</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Water Conservation</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">Promoting drip irrigation, rainwater harvesting, and drought-resistant cropping patterns in water-scarce regions.</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div class="w-12 h-12 rounded-lg bg-primary-container text-primary flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-3xl">groups</span>
            </div>
            <h3 class="font-headline-md text-headline-md text-primary mb-2">Community Building</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">Farmer producer organizations (FPOs), seed festivals, and knowledge-sharing networks strengthening rural communities.</p>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-section-gap">
        <h3 class="font-headline-md text-headline-md text-primary mb-2 flex items-center gap-2"><span class="material-symbols-outlined">mail</span> Stay Updated</h3>
        <p class="text-body-md text-on-surface-variant mb-3">Create a free account for order tracking, exclusive offers, and seed festival invites. Your email is safe with us.</p>
        <button onclick="navigateTo('auth')" class="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-semibold">Create Free Account</button>
      </section>

      <section class="bg-primary-container rounded-2xl p-8 md:p-16 text-center">
        <div class="max-w-2xl mx-auto">
          <span class="material-symbols-outlined text-primary text-5xl mb-4 block">volunteer_activism</span>
          <h2 class="font-headline-lg text-headline-lg text-on-primary-container mb-3">Join Our Movement</h2>
          <p class="font-body-lg text-body-lg text-on-primary-container/80 mb-6">Whether you're a farmer, a conscious consumer, or an organization looking to create impact - there's a place for you in the Krishi Sewa family.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors" onclick="navigateTo('shop')">
              Support by Shopping
            </button>
            <button class="bg-transparent border-2 border-on-primary-container text-on-primary-container px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-on-primary-container/10 transition-colors" onclick="navigateTo('home'); scrollToEvents()">
              Attend an Event
            </button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderAuthPage() {
  const user = state.authUser;
  if (user) {
    return `
    <main class="flex-grow w-full max-w-md mx-auto px-4 py-12 text-center">
      <div class="bg-white border border-outline-variant rounded-2xl p-8">
        <span class="material-symbols-outlined text-primary text-5xl">verified_user</span>
        <h1 class="text-2xl font-bold text-primary mt-3">Welcome, ${user.name || user.email}</h1>
        <p class="text-on-surface-variant mt-2">You're signed in securely. Your orders will be linked to <b>${user.email}</b>.</p>
        <button onclick="navigateTo('profile')" class="mt-6 w-full bg-primary text-on-primary py-3 rounded-lg font-semibold flex items-center justify-center gap-2"><span class="material-symbols-outlined">person</span> View My Profile</button>
        <button onclick="navigateTo('shop')" class="mt-3 w-full border border-outline-variant py-3 rounded-lg font-semibold">Continue Shopping</button>
        <button onclick="handleLogout()" class="mt-3 w-full text-sm text-on-surface-variant hover:text-error">Logout</button>
      </div>
    </main>`;
  }
  const mode = state.authMode;
  return `
  <main class="flex-grow w-full max-w-md mx-auto px-4 py-4 md:py-8 pb-24 md:pb-8">
    <div class="bg-white border border-outline-variant rounded-2xl p-5 md:p-6 shadow-sm">
      <h1 class="text-xl md:text-2xl font-bold text-primary text-center">${mode==="signup" ? "Create Account" : mode==="verify" ? "Verify Your Email" : mode==="forgot" ? "Reset Password" : mode==="reset" ? "Set New Password" : "Welcome back"}</h1>
      <p class="text-center text-on-surface-variant text-sm mb-6">${mode==="signup" ? "Sign up once — secure password + email verification" : mode==="verify" ? `Enter the 6-digit code we sent to <b>${state.authPendingEmail}</b>` : mode==="forgot" ? "We'll email a code to reset your password" : mode==="reset" ? "Choose a strong new password" : "Log in with email + password"}</p>
      ${(mode==="login" || mode==="signup") ? `
        <div class="flex gap-2 mb-6">
          <button onclick="state.authMode='login'; state.authPendingEmail=''; renderApp()" class="flex-1 py-2.5 rounded-lg text-sm font-bold ${mode==='login'?'bg-primary text-on-primary':'bg-surface-variant text-on-surface-variant'}">Log In</button>
          <button onclick="state.authMode='signup'; state.authPendingEmail=''; renderApp()" class="flex-1 py-2.5 rounded-lg text-sm font-bold ${mode==='signup'?'bg-primary text-on-primary':'bg-surface-variant text-on-surface-variant'}">Sign Up</button>
        </div>` : ""}
      ${mode==="signup" ? `
        <form onsubmit="handleSignup(event)" class="space-y-3">
          <input id="authName" placeholder="Full name" required class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <input id="authEmail" type="email" required placeholder="Your email" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <div>
            <input id="authPassword" type="password" required minlength="8" placeholder="Password (8+ chars)" oninput="updatePwStrength(this.value)" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            <div class="mt-2 space-y-1 text-xs">
              <div class="flex gap-1 h-1.5">
                <div id="pwBar1" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar2" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar3" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar4" class="flex-1 rounded bg-surface-variant"></div>
              </div>
              <div id="pwLabel" class="text-on-surface-variant">Enter a password</div>
              <ul class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-on-surface-variant">
                <li id="pwRule_len" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 8+ chars</li>
                <li id="pwRule_cap" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 uppercase</li>
                <li id="pwRule_low" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 lowercase</li>
                <li id="pwRule_num" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 number</li>
                <li id="pwRule_sym" class="flex items-center gap-1 col-span-2"><span class="material-symbols-outlined text-sm">circle</span> 1 special character (!@#$%...)</li>
              </ul>
            </div>
          </div>
          <button id="authSignupBtn" type="submit" disabled class="w-full bg-primary text-on-primary py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed">Create Account</button>
          <p id="authMsg" class="text-center text-sm"></p>
        </form>
      ` : mode==="verify" ? `
        <div class="space-y-3">
          <input id="authCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="000000" class="w-full text-center text-2xl md:text-3xl tracking-[0.4em] md:tracking-[0.5em] font-bold border-2 border-primary rounded-lg px-2 py-4 focus:outline-none focus:ring-2 focus:ring-primary">
          <button onclick="handleVerifyCode()" class="w-full bg-primary text-on-primary py-3 rounded-lg font-bold">Verify & Create Account</button>
          <button onclick="handleResendCode()" type="button" class="w-full border border-outline-variant py-2.5 rounded-lg font-semibold">Resend Code</button>
          <p id="authMsg" class="text-center text-sm"></p>
          <button type="button" onclick="state.authMode='${state.authPendingPurpose==='reset'?'forgot':'signup'}'; renderApp()" class="w-full text-sm text-on-surface-variant hover:text-primary">← Back</button>
        </div>
      ` : mode==="forgot" ? `
        <form onsubmit="handleForgot(event)" class="space-y-3">
          <p class="text-sm text-on-surface-variant text-center">Enter your account email — we'll send a 6-digit code to reset your password.</p>
          <input id="authEmail" type="email" required placeholder="Your email" value="${state.authPendingEmail||''}" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <button type="submit" class="w-full bg-accent-ochre text-white py-3 rounded-lg font-bold">Send Reset Code</button>
          <p id="authMsg" class="text-center text-sm"></p>
          <button type="button" onclick="state.authMode='login'; renderApp()" class="w-full text-sm text-on-surface-variant hover:text-primary">← Back to login</button>
        </form>
      ` : mode==="reset" ? `
        <form onsubmit="handleResetPassword(event)" class="space-y-3">
          <input id="authCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="6-digit code" class="w-full text-center text-xl md:text-2xl tracking-[0.4em] md:tracking-[0.5em] font-bold border-2 border-primary rounded-lg px-2 py-4 focus:outline-none focus:ring-2 focus:ring-primary">
          <div>
            <input id="authPassword" type="password" required minlength="8" placeholder="New password" oninput="updatePwStrength(this.value)" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            <div class="mt-2 space-y-1 text-xs">
              <div class="flex gap-1 h-1.5">
                <div id="pwBar1" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar2" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar3" class="flex-1 rounded bg-surface-variant"></div>
                <div id="pwBar4" class="flex-1 rounded bg-surface-variant"></div>
              </div>
              <div id="pwLabel" class="text-on-surface-variant">Enter a password</div>
              <ul class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-on-surface-variant">
                <li id="pwRule_len" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 8+ chars</li>
                <li id="pwRule_cap" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 uppercase</li>
                <li id="pwRule_low" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 lowercase</li>
                <li id="pwRule_num" class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">circle</span> 1 number</li>
                <li id="pwRule_sym" class="flex items-center gap-1 col-span-2"><span class="material-symbols-outlined text-sm">circle</span> 1 special character (!@#$%...)</li>
              </ul>
            </div>
          </div>
          <button id="authSignupBtn" type="submit" disabled class="w-full bg-primary text-on-primary py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed">Set New Password</button>
          <p id="authMsg" class="text-center text-sm"></p>
        </form>
      ` : `
        <form onsubmit="handleLogin(event)" class="space-y-3">
          <input id="authEmail" type="email" required placeholder="Your email" value="${state.authPendingEmail||''}" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <input id="authPassword" type="password" required placeholder="Your password" class="w-full text-base border border-outline-variant rounded-lg px-3 py-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <button type="submit" class="w-full bg-primary text-on-primary py-3 rounded-lg font-bold">Log In</button>
          <p id="authMsg" class="text-center text-sm"></p>
          <div class="text-center">
            <button type="button" onclick="state.authMode='forgot'; state.authPendingEmail=document.getElementById('authEmail')?.value||''; renderApp()" class="text-sm text-primary hover:underline font-semibold">Forgot password?</button>
          </div>
        </form>
      `}
      ${authConfigError ? `
        <div class="mt-4 p-3 bg-error-container text-on-error-container rounded-lg text-xs">
          <b>Setup pending.</b> Please try again in a moment.
          <button onclick="(async()=>{authConfigError=null;await initAuth();renderApp();})()" class="ml-2 underline font-bold">Retry</button>
        </div>` : (authConfig && !authConfig.emailEnabled) ? `
        <div class="mt-4 p-3 bg-error-container text-on-error-container rounded-lg text-xs">
          <b>Email service is being set up.</b> Please try again shortly.
        </div>` : ""}
    </div>
  </main>`;
}

// Password strength checker (live, client-side)
function checkPasswordStrength(pw) {
  const rules = { len: pw.length >= 8, cap: /[A-Z]/.test(pw), low: /[a-z]/.test(pw), num: /[0-9]/.test(pw), sym: /[^A-Za-z0-9]/.test(pw) };
  const passed = Object.values(rules).filter(Boolean).length;
  return { rules, score: passed, valid: passed === 5 };
}
function updatePwStrength(pw) {
  const { rules, score, valid } = checkPasswordStrength(pw);
  const colors = ["bg-error", "bg-error", "bg-accent-ochre", "bg-tertiary", "bg-primary"];
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById("pwBar" + i);
    if (!bar) continue;
    bar.className = "flex-1 rounded " + (i <= score ? colors[score] : "bg-surface-variant");
  }
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const label = document.getElementById("pwLabel");
  if (label) { label.textContent = pw ? labels[score] : "Enter a password"; label.className = score <= 2 ? "text-error" : score === 3 ? "text-accent-ochre" : "text-primary"; }
  const map = { pwRule_len: rules.len, pwRule_cap: rules.cap, pwRule_low: rules.low, pwRule_num: rules.num, pwRule_sym: rules.sym };
  Object.entries(map).forEach(([id, ok]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "flex items-center gap-1 " + (ok ? "text-primary" : "text-on-surface-variant");
    const icon = el.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = ok ? "check_circle" : "circle";
  });
  const btn = document.getElementById("authSignupBtn");
  if (btn) btn.disabled = !valid;
}

async function handleSignup(e){
  e.preventDefault();
  const email=document.getElementById("authEmail").value.trim();
  const name=document.getElementById("authName").value.trim();
  const password=document.getElementById("authPassword").value;
  const { valid } = checkPasswordStrength(password);
  if (!valid) { toast("Password too weak — check requirements"); return; }
  const msg=document.getElementById("authMsg");
  msg.textContent="Sending code to "+email+"..."; msg.className="text-center text-sm text-on-surface-variant";
  try {
    const r = await apiPost("/auth/signup", { email, name, password });
    if (r.error) { msg.textContent = r.error; msg.className="text-center text-sm text-error"; return; }
    state.authPendingEmail = email; state.authPendingPurpose = "signup"; state.authMode = "verify"; renderApp();
    toast("Code sent to "+email);
  } catch (e) { msg.textContent=e.message; msg.className="text-center text-sm text-error"; }
}

async function handleVerifyCode(){
  const email = state.authPendingEmail;
  const code = document.getElementById("authCode")?.value?.trim();
  const msg=document.getElementById("authMsg");
  if(!email||!code){ msg.textContent="Enter the 6-digit code"; return; }
  msg.textContent="Verifying..."; msg.className="text-center text-sm text-on-surface-variant";
  try {
    const r = await apiPost("/auth/verify-signup", { email, code });
    if (r.error) { msg.textContent = r.error; msg.className="text-center text-sm text-error"; return; }
    state.authUser = r.user;
    localStorage.setItem("krishi_user", JSON.stringify(r.user));
    await syncServerCartOnLogin();
    msg.textContent="✅ Welcome "+r.user.name+"!"; msg.className="text-center text-sm text-green-700";
    toast("Welcome "+r.user.name);
    setTimeout(()=>navigateTo("shop"), 800);
  } catch (e) { msg.textContent=e.message; msg.className="text-center text-sm text-error"; }
}

async function handleResendCode(){
  const email = state.authPendingEmail;
  if (!email) return;
  try { await apiPost("/auth/resend-code", { email }); toast("Code resent to "+email); }
  catch (e) { toast(e.message); }
}

async function handleLogin(e){
  e.preventDefault();
  const email=document.getElementById("authEmail").value.trim();
  const password=document.getElementById("authPassword").value;
  const msg=document.getElementById("authMsg");
  msg.textContent="Logging in..."; msg.className="text-center text-sm text-on-surface-variant";
  try {
    const r = await apiPost("/auth/login", { email, password });
    if (r.error) { msg.textContent = r.error; msg.className="text-center text-sm text-error"; return; }
    state.authUser = r.user;
    localStorage.setItem("krishi_user", JSON.stringify(r.user));
    await syncServerCartOnLogin();
    msg.textContent="✅ Welcome back, "+r.user.name; msg.className="text-center text-sm text-green-700";
    toast("Welcome "+r.user.name);
    setTimeout(()=>navigateTo("shop"), 500);
  } catch (e) { msg.textContent=e.message; msg.className="text-center text-sm text-error"; }
}

async function handleForgot(e){
  e.preventDefault();
  const email=document.getElementById("authEmail").value.trim();
  const msg=document.getElementById("authMsg");
  msg.textContent="Sending code..."; msg.className="text-center text-sm text-on-surface-variant";
  try {
    const r = await apiPost("/auth/forgot", { email });
    if (r.error) { msg.textContent = r.error; msg.className="text-center text-sm text-error"; return; }
    state.authPendingEmail = email; state.authPendingPurpose = "reset"; state.authMode = "reset"; renderApp();
    toast("Reset code sent to "+email);
  } catch (e) { msg.textContent=e.message; msg.className="text-center text-sm text-error"; }
}

async function handleResetPassword(e){
  e.preventDefault();
  const code = document.getElementById("authCode").value.trim();
  const password = document.getElementById("authPassword").value;
  const { valid } = checkPasswordStrength(password);
  if (!valid) { toast("Password too weak — check requirements"); return; }
  const msg=document.getElementById("authMsg");
  msg.textContent="Resetting..."; msg.className="text-center text-sm text-on-surface-variant";
  try {
    const r = await apiPost("/auth/reset-password", { email: state.authPendingEmail, code, password });
    if (r.error) { msg.textContent = r.error; msg.className="text-center text-sm text-error"; return; }
    state.authUser = r.user;
    localStorage.setItem("krishi_user", JSON.stringify(r.user));
    msg.textContent="✅ Password reset! Welcome back, "+r.user.name; msg.className="text-center text-sm text-green-700";
    toast("Password reset");
    setTimeout(()=>navigateTo("shop"), 800);
  } catch (e) { msg.textContent=e.message; msg.className="text-center text-sm text-error"; }
}
async function handleLogout(){
  try { await apiPost("/auth/logout", {}); } catch {}
  // Clear ALL local data on logout to prevent data leaks between users
  state.authUser = null;
  state.authMode = "login";
  state.authPendingEmail = "";
  state.authPendingPurpose = "";
  state.cart = [];
  state.orders = [];
  state.lastOrder = null;
  state.billingAddress = {};
  state.searchQuery = "";
  state.wishlistCount = 0;
  state.checkoutStep = 1;
  state.isMobileMenuOpen = false;
  state.isCartSidebarOpen = false;
  try {
    localStorage.removeItem("krishi_user");
    localStorage.removeItem("krishi_sewa_cart");
    localStorage.removeItem("krishi_sewa_orders");
  } catch {}
  toast("Logged out — all local data cleared");
  navigateTo("auth");
  // Force a re-render
  setTimeout(() => renderApp(), 50);
}

// ============================================
// ROUTING & NAVIGATION
// ============================================

function navigateTo(page, params = {}) {
  // Update state
  state.currentPage = page;

  if (params.productId) {
    state.currentProduct = getProductById(params.productId);
  }

  // Update URL hash
  if (page === 'product' && params.productId) {
    window.location.hash = `#product/${params.productId}`;
  } else if (page === 'home' && params.scrollTo === 'events') {
    window.location.hash = '#home/events';
  } else {
    window.location.hash = '#' + page;
  }

  // Render page
  renderApp();

  // Scroll to top
  window.scrollTo(0, 0);

  // Close mobile menu
  closeMobileMenu();
}

function scrollToEvents() {
  setTimeout(() => {
    const eventsSection = document.getElementById('events');
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

function handleHashChange() {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash) {
    navigateTo('home');
    return;
  }

  const parts = hash.split('/');
  const page = parts[0];

  switch (page) {
    case 'home':
      if (parts[1] === 'events') {
        navigateTo('home', { scrollTo: 'events' });
      } else {
        navigateTo('home');
      }
      break;
    case 'shop':
      navigateTo('shop');
      break;
    case 'product':
      if (parts[1]) {
        navigateTo('product', { productId: parts[1] });
      } else {
        navigateTo('shop');
      }
      break;
    case 'cart':
      navigateTo('cart');
      break;
    case 'checkout':
      navigateTo('checkout');
      break;
    case 'confirmation':
      navigateTo('confirmation');
      break;
    case 'orders':
      navigateTo('orders');
      break;
    case 'about':
      navigateTo('about');
      break;
    case 'auth':
      state.currentPage = 'auth';
      renderApp();
      break;
    case 'profile':
      state.currentPage = 'profile';
      renderApp();
      break;
    case 'coming-soon':
      state.currentPage = 'coming-soon';
      renderApp();
      break;
    case '404':
      state.currentPage = '404';
      renderApp();
      break;
    default:
      state.currentPage = '404';
      window.location.hash = '#404';
      renderApp();
  }
}

function toggleMobileMenu() {
  state.isMobileMenuOpen = !state.isMobileMenuOpen;
  renderApp();
}

function closeMobileMenu() {
  if (state.isMobileMenuOpen) {
    state.isMobileMenuOpen = false;
    renderApp();
  }
}

// ============================================
// CART ACTIONS
// ============================================

function addToCart(productId, quantity = 1) {
  const product = getProductById(productId);
  if (!product || !product.inStock) return;
  // Require login for cart
  if (!state.authUser?.email) {
    showToast("Please log in to add to cart");
    navigateTo("auth");
    return;
  }

  const existingItem = state.cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      id: productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: quantity,
      addedAt: new Date().toISOString()
    });
  }

  saveCart();  // pushes to server
  renderApp();

  // Show feedback
  showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  saveCart();
  renderApp();
  showToast('Item removed from cart');
}

function updateCartQty(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  const item = state.cart.find(item => item.id === productId);
  if (item) {
    item.quantity = quantity;
    saveCart();
    renderApp();
  }
}

function updateProductQty(productId, quantity) {
  updateCartQty(productId, quantity);
  // Update the product page qty display
  const display = document.getElementById('productQtyDisplay');
  if (display) {
    display.textContent = quantity;
  }
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderApp();
}

// ============================================
// CHECKOUT ACTIONS
// ============================================

function setCategory(categoryId) {
  state.selectedCategory = categoryId;
  if (state.currentPage === 'shop') {
    renderApp();
  } else {
    navigateTo('shop');
  }
}

function setPriceRange(range) {
  state.priceRange = range;
  if (state.currentPage === 'shop') {
    renderApp();
  }
}

function setSortBy(sortValue) {
  state.sortBy = sortValue;
  if (state.currentPage === 'shop') {
    renderApp();
  }
}

function setSearchQuery(query) {
  state.searchQuery = query;
  if (state.currentPage === 'shop') {
    renderApp();
  }
}

function clearFilters() {
  state.selectedCategory = 'all';
  state.priceRange = null;
  state.sortBy = 'featured';
  state.searchQuery = '';
  if (state.currentPage === 'shop') {
    renderApp();
  }
}

async function updateDistricts(stateCode) {
  const districtSelect = document.getElementById('districtSelect');
  if (!districtSelect) return;
  state.billingAddress.state = stateCode;
  if (!stateCode) {
    districtSelect.disabled = true;
    districtSelect.innerHTML = '<option value="" selected disabled>Select District</option>';
    return;
  }
  // Use cached list if we have it
  if (districtsByState[stateCode] && districtsByState[stateCode].length) {
    districtSelect.disabled = false;
    districtSelect.innerHTML = '<option value="" selected disabled>Select District</option>' +
      districtsByState[stateCode].map(d => `<option value="${d}">${d}</option>`).join('');
    return;
  }
  // Fetch from backend
  districtSelect.disabled = true;
  districtSelect.innerHTML = '<option value="" selected disabled>Loading…</option>';
  try {
    const list = await apiGet(`/states/${encodeURIComponent(stateCode)}/districts`);
    districtsByState[stateCode] = list || [];
    districtSelect.disabled = false;
    districtSelect.innerHTML = '<option value="" selected disabled>Select District</option>' +
      (list || []).map(d => `<option value="${d}">${d}</option>`).join('');
  } catch (e) {
    districtSelect.innerHTML = '<option value="" selected disabled>Could not load districts</option>';
  }
}

// Auto-fill state and district from pincode via /api/pincode/:pin
let _pincodeTimer = null;
async function onPincodeChange(value) {
  const pin = String(value || "").replace(/\D/g, "").slice(0, 6);
  const hint = document.getElementById("pincodeHint");
  if (hint) hint.textContent = pin.length === 6 ? "— looking up..." : "— auto-fills state & district";
  if (pin.length !== 6) return;
  clearTimeout(_pincodeTimer);
  _pincodeTimer = setTimeout(async () => {
    try {
      const data = await apiGet(`/pincode/${pin}`);
      if (!data || data.error) { if (hint) hint.textContent = "— pincode not found"; return; }
      // Set state
      if (data.stateCode) {
        const sel = document.getElementById("stateSelect");
        if (sel) {
          sel.value = data.stateCode;
          state.billingAddress.state = data.stateCode;
          await updateDistricts(data.stateCode);
          // Now set district (might not be in our list, that's OK — we set raw value)
          const dsel = document.getElementById("districtSelect");
          if (dsel) {
            // Add the option if not in the list
            if (![...dsel.options].some(o => o.value === data.district)) {
              const opt = document.createElement("option");
              opt.value = data.district; opt.textContent = data.district + " (from pincode)"; opt.selected = true;
              dsel.insertBefore(opt, dsel.firstChild);
            } else {
              dsel.value = data.district;
            }
            state.billingAddress.district = data.district;
          }
        }
        if (hint) hint.innerHTML = `<span class="text-primary font-semibold">✓ ${data.district}, ${data.state}</span>`;
        toast("Auto-filled: " + data.district + ", " + data.state);
      }
    } catch (e) {
      if (hint) hint.textContent = "— lookup failed, pick manually";
    }
  }, 400);
}

function proceedToPayment() {
  // Validate billing form
  const form = document.getElementById('billingForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Save billing address
  state.billingAddress = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    address2: document.getElementById('address2').value,
    state: document.getElementById('stateSelect').value,
    district: document.getElementById('districtSelect').value,
    pincode: document.getElementById('pincode').value
  };

  // Show payment section
  const paymentSection = document.getElementById('paymentSection');
  if (paymentSection) {
    paymentSection.style.display = 'block';
    paymentSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function backToAddress() {
  const paymentSection = document.getElementById('paymentSection');
  if (paymentSection) {
    paymentSection.style.display = 'none';
    window.scrollTo(0, 0);
  }
}

async function loadSavedAddressesForCheckout() {
  if (!state.authUser) return;
  const block = document.getElementById('savedAddressesBlock');
  if (!block) return;
  try {
    const addrs = await apiGet('/addresses') || [];
    if (addrs.length === 0) { block.innerHTML = ''; return; }
    block.innerHTML = `
      <div class="mb-4 p-3 bg-primary-container/20 border border-primary rounded-lg">
        <p class="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
          <span class="material-symbols-outlined text-[18px]">bookmark</span> Use a saved address
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${addrs.map(a => `
            <button type="button" onclick="fillBillingFromSaved('${a.id}')" class="text-left p-2 bg-white border border-outline-variant rounded-lg hover:border-primary text-sm">
              <p class="font-semibold">${escapeHtml(a.label || 'Home')} ${a.is_default ? '<span class="text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full">DEFAULT</span>' : ''}</p>
              <p class="text-xs text-on-surface-variant truncate">${escapeHtml(a.address_line1)}, ${escapeHtml(a.district)}</p>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) { console.warn('loadSavedAddressesForCheckout:', e.message); }
}

function fillBillingFromSaved(addressId) {
  fetch(`${API_BASE}/addresses`, { credentials: 'include' })
    .then(r => r.json())
    .then(addrs => {
      const a = addrs.find(x => x.id === addressId);
      if (!a) return;
      document.getElementById('fullName').value = a.full_name || '';
      document.getElementById('phone').value = a.phone || '';
      document.getElementById('address').value = a.address_line1 || '';
      document.getElementById('address2').value = a.address_line2 || '';
      document.getElementById('stateSelect').value = a.state || '';
      updateDistricts(a.state);
      setTimeout(() => {
        const dsel = document.getElementById('districtSelect');
        if (dsel) dsel.value = a.district || '';
      }, 100);
      document.getElementById('pincode').value = a.pincode || '';
      showToast?.(`Loaded: ${a.label || 'saved address'}`);
    });
}

async function saveAddressFromCheckout() {
  if (!state.authUser) return;
  const cb = document.getElementById('saveAddressCheckbox');
  if (!cb || !cb.checked) return;
  const body = {
    label: 'Home',
    fullName: state.billingAddress.fullName,
    phone: state.billingAddress.phone,
    addressLine1: state.billingAddress.address,
    addressLine2: state.billingAddress.address2,
    district: state.billingAddress.district,
    state: state.billingAddress.state,
    pincode: state.billingAddress.pincode,
    isDefault: false
  };
  try {
    await apiPost('/addresses', body, true);
  } catch (e) { console.warn('saveAddressFromCheckout:', e.message); }
}

function setPaymentMethod(method) {
  state.paymentMethod = method;
}

async function placeOrder() {
  // Validate cart
  if (state.cart.length === 0) {
    showToast("Cart is empty");
    return;
  }
  // Require login before checkout
  if (!state.authUser?.email) {
    showToast("Please log in to place an order");
    navigateTo("auth");
    return;
  }
  // Prepare payload for backend
  const payload = {
    items: state.cart.map(item => ({ id: item.id, quantity: item.quantity })),
    address: state.billingAddress,
    paymentMethod: state.paymentMethod
  };

  // Save address if user checked the box
  await saveAddressFromCheckout();

  // Disable button feedback
  const btn = document.querySelector('button[onclick="placeOrder()"]');
  const originalText = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Placing order...`; }

  try {
    if (!apiAvailable) {
      throw new Error("Server unavailable. Please check your connection and try again.");
    }
    // Force-final sync of cart to server before placing order
    try {
      await fetch(`${API_BASE}/cart`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: state.cart })
      });
    } catch {}
    const order = await apiPost("/orders", payload);
    if (!order || order.error) throw new Error(order?.error || "Failed to place order");
    state.lastOrder = order;
    // Pull fresh orders from server (authoritative)
    const latest = await apiGet("/orders");
    if (Array.isArray(latest)) state.orders = latest;
    showToast(`Order ${order.id} placed!`);
    // Clear local + server cart
    state.cart = [];
    try { await fetch(`${API_BASE}/cart`, { method: "DELETE", credentials: "include" }); } catch {}
    renderApp();
    navigateTo('confirmation');
  } catch (e) {
    console.error("placeOrder failed:", e);
    const msg = String(e.message || "Failed to place order");
    toast(`❌ ${msg}`);
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
  }
}

function viewOrderDetails(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (order) {
    state.lastOrder = order;
    navigateTo('confirmation');
  }
}

function trackOrder(orderId) {
  showToast('Tracking feature coming soon!');
}

function reorderItems(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (order) {
    order.items.forEach(item => {
      addToCart(item.id, item.quantity);
    });
    navigateTo('cart');
  }
}

// ============================================
// UI HELPERS
// ============================================

function showToast(message) {
  // Remove existing toast
  const existingToast = document.querySelector('.krishi-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'krishi-toast fixed bottom-6 right-6 md:left-1/2 md:-translate-x-1/2 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up font-label-md text-label-md flex items-center gap-2';
  toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span>${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function render404Page() {
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col items-center text-center min-h-[60vh]">
      <div class="mb-6">
        <span class="material-symbols-outlined text-primary/30 text-9xl md:text-[160px] leading-none">compass_off</span>
      </div>
      <h1 class="font-headline-xl text-headline-xl text-primary mb-3">Page Not Found</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-md">The page you're looking for doesn't exist or the product may have been removed. Let's get you back to the harvest.</p>
      <div class="flex flex-col sm:flex-row gap-3">
        <button class="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary-container transition-colors min-h-[48px] flex items-center justify-center gap-2" onclick="navigateTo('home')">
          <span class="material-symbols-outlined">home</span> Go Home
        </button>
        <button class="border border-outline-variant px-6 py-3 rounded-lg font-semibold hover:bg-surface-variant transition-colors min-h-[48px] flex items-center justify-center gap-2" onclick="navigateTo('shop')">
          <span class="material-symbols-outlined">storefront</span> Browse Shop
        </button>
        <button class="border border-outline-variant px-6 py-3 rounded-lg font-semibold hover:bg-surface-variant transition-colors min-h-[48px] flex items-center justify-center gap-2" onclick="openSearchDialog()">
          <span class="material-symbols-outlined">search</span> Search
        </button>
      </div>
    </main>
  `;
}

function openSearchDialog() {
  if (document.getElementById("krishi-search-dialog")) return;
  const overlay = document.createElement("div");
  overlay.id = "krishi-search-dialog";
  overlay.className = "fixed inset-0 z-[200] bg-inverse-surface/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4";
  overlay.onclick = (e) => { if (e.target === overlay) closeSearchDialog(); };
  overlay.innerHTML = `
    <div class="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden" onclick="event.stopPropagation()">
      <form onsubmit="event.preventDefault(); state.searchQuery=this.q.value.trim(); navigateTo('search'); closeSearchDialog();" class="flex items-center gap-3 p-4 border-b border-outline-variant">
        <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">search</span>
        <input name="q" type="search" placeholder="Search seeds, fertilizers, tools..." autofocus class="flex-1 bg-transparent outline-none text-lg" autocomplete="off">
        <button type="button" onclick="closeSearchDialog()" class="text-on-surface-variant hover:text-on-surface p-1" aria-label="Close search">
          <span class="material-symbols-outlined">close</span>
        </button>
      </form>
      <div class="p-3 text-xs text-on-surface-variant">
        <p class="mb-2">Quick links</p>
        <div class="flex flex-wrap gap-2">
          <button onclick="state.searchQuery='tomato'; navigateTo('search'); closeSearchDialog();" class="px-3 py-1.5 bg-surface-container-low rounded-full hover:bg-primary-container hover:text-on-primary-container text-sm">tomato</button>
          <button onclick="state.searchQuery='fertilizer'; navigateTo('search'); closeSearchDialog();" class="px-3 py-1.5 bg-surface-container-low rounded-full hover:bg-primary-container hover:text-on-primary-container text-sm">fertilizer</button>
          <button onclick="state.searchQuery='tools'; navigateTo('search'); closeSearchDialog();" class="px-3 py-1.5 bg-surface-container-low rounded-full hover:bg-primary-container hover:text-on-primary-container text-sm">tools</button>
          <button onclick="state.searchQuery='seeds'; navigateTo('search'); closeSearchDialog();" class="px-3 py-1.5 bg-surface-container-low rounded-full hover:bg-primary-container hover:text-on-primary-container text-sm">seeds</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.querySelector("input")?.focus(), 50);
  document.addEventListener("keydown", searchEscHandler);
}

function closeSearchDialog() {
  const el = document.getElementById("krishi-search-dialog");
  if (el) el.remove();
  document.removeEventListener("keydown", searchEscHandler);
}

function searchEscHandler(e) { if (e.key === "Escape") closeSearchDialog(); }

function renderProfilePage() {
  const user = state.authUser;
  if (!user) {
    return `
      <main class="flex-grow w-full max-w-md mx-auto px-4 py-16 text-center">
        <span class="material-symbols-outlined text-outline text-7xl mb-4">account_circle</span>
        <h1 class="text-2xl font-bold text-primary mb-2">Sign in to view your profile</h1>
        <p class="text-on-surface-variant mb-6">Track orders, see stats, and manage your account.</p>
        <button onclick="navigateTo('auth')" class="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold">Login / Sign Up</button>
      </main>`;
  }
  const orders = state.orders || [];
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const memberSince = (() => {
    try {
      const oldest = orders.length ? orders.map(o => new Date(o.date || o.created_at)).sort((a, b) => a - b)[0] : new Date();
      return oldest.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch { return "Today"; }
  })();
  const statusBadge = (s) => {
    const colors = { processing: "bg-yellow-100 text-yellow-800", shipped: "bg-blue-100 text-blue-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
    return `<span class="px-2 py-0.5 rounded-full text-xs font-bold ${colors[s] || colors.processing}">${(s || "processing").toUpperCase()}</span>`;
  };
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap pb-24 md:pb-0">
      <div class="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 md:p-8 text-surface-bright mb-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div class="h-20 w-20 rounded-full bg-surface text-primary flex items-center justify-center text-3xl font-bold border-4 border-surface/30 shrink-0">${(user.name || user.email || "U")[0].toUpperCase()}</div>
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold">${user.name || "User"}</h1>
          <p class="text-surface/80 text-sm md:text-base truncate">${user.email}</p>
          <p class="text-surface/70 text-xs mt-1">Member since ${memberSince}</p>
        </div>
        <div class="flex gap-2 w-full md:w-auto">
          <button onclick="navigateTo('shop')" class="flex-1 md:flex-none bg-surface text-primary px-4 py-2 rounded-lg font-semibold text-sm">Shop</button>
          <button onclick="handleLogout(); navigateTo('home')" class="flex-1 md:flex-none bg-surface/20 text-surface border border-surface/30 px-4 py-2 rounded-lg font-semibold text-sm">Logout</button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
          <span class="material-symbols-outlined text-primary text-3xl">package_2</span>
          <p class="text-2xl font-bold text-primary mt-1">${totalOrders}</p>
          <p class="text-xs text-on-surface-variant">Total Orders</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
          <span class="material-symbols-outlined text-primary text-3xl">payments</span>
          <p class="text-2xl font-bold text-primary mt-1">${"₹" + totalSpent.toLocaleString("en-IN")}</p>
          <p class="text-xs text-on-surface-variant">Total Spent</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
          <span class="material-symbols-outlined text-primary text-3xl">check_circle</span>
          <p class="text-2xl font-bold text-primary mt-1">${orders.filter(o => o.status === "delivered").length}</p>
          <p class="text-xs text-on-surface-variant">Delivered</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
          <span class="material-symbols-outlined text-primary text-3xl">local_shipping</span>
          <p class="text-2xl font-bold text-primary mt-1">${orders.filter(o => o.status === "shipped" || o.status === "processing").length}</p>
          <p class="text-xs text-on-surface-variant">In Transit</p>
        </div>
      </div>

      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg md:text-xl font-bold text-primary">Your Orders</h2>
          <button onclick="navigateTo('orders')" class="text-sm text-primary hover:underline font-semibold">View all →</button>
        </div>
        ${orders.length === 0 ? `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <span class="material-symbols-outlined text-outline text-5xl">shopping_bag</span>
            <p class="text-on-surface-variant mt-2">No orders yet</p>
            <button onclick="navigateTo('shop')" class="mt-3 bg-primary text-on-primary px-5 py-2 rounded-lg font-semibold text-sm">Start Shopping</button>
          </div>
        ` : `
          <div class="space-y-3">
            ${orders.slice().reverse().slice(0, 10).map(o => `
              <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 hover:border-primary transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="h-12 w-12 rounded-lg bg-primary-container text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">package_2</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-bold text-on-surface">${o.id || "Order"}</p>
                      ${statusBadge(o.status)}
                    </div>
                    <p class="text-xs text-on-surface-variant">${(o.items || []).length} item(s) • ${new Date(o.date || o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-bold text-primary">₹${Number(o.total || 0).toLocaleString("en-IN")}</p>
                  <p class="text-xs text-on-surface-variant">${(o.paymentMethod || "cod").toUpperCase()}</p>
                </div>
                <button onclick="viewOrderDetails('${o.id}')" class="shrink-0 border border-outline-variant px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-surface-variant">Details</button>
              </div>
            `).join("")}
          </div>
        `}
      </section>

      <!-- Tabs for other profile sections -->
      <section class="mt-8">
        <div class="border-b border-outline-variant flex gap-1 overflow-x-auto mb-4" id="profileTabs">
          <button data-profile-tab="addresses" class="profile-tab px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary">Addresses</button>
          <button data-profile-tab="wishlist" class="profile-tab px-4 py-2 text-sm font-semibold text-on-surface-variant border-b-2 border-transparent">Wishlist</button>
          <button data-profile-tab="sessions" class="profile-tab px-4 py-2 text-sm font-semibold text-on-surface-variant border-b-2 border-transparent">Active Sessions</button>
          <button data-profile-tab="preferences" class="profile-tab px-4 py-2 text-sm font-semibold text-on-surface-variant border-b-2 border-transparent">Preferences</button>
          <button data-profile-tab="danger" class="profile-tab px-4 py-2 text-sm font-semibold text-on-surface-variant border-b-2 border-transparent">Danger Zone</button>
        </div>
        <div id="profileTabContent">
          <div class="text-sm text-on-surface-variant py-4">Loading…</div>
        </div>
      </section>
    </main>`;
}

function renderComingSoonPage() {
  return `
    <main class="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap-mobile md:py-section-gap flex flex-col items-center text-center pb-24 md:pb-0">
      <div class="bg-primary-container rounded-full p-5 md:p-6 mb-6 mt-4">
        <span class="material-symbols-outlined text-primary text-5xl md:text-6xl">hourglass_top</span>
      </div>
      <h1 class="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary mb-3">Coming Soon</h1>
      <p class="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant mb-2 max-w-md">
        Our farmer registration and event RSVP system is being prepared with care.
      </p>
      <p class="font-body-md text-body-md text-on-surface-variant mb-8 max-w-md">
        Sign up to our shop and we'll let you know the moment it opens.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button class="flex-1 bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors min-h-[48px]" onclick="navigateTo('shop')">
          <span class="material-symbols-outlined align-middle mr-1">storefront</span> Browse Shop
        </button>
        <button class="flex-1 border border-outline-variant px-6 py-3 rounded-lg font-semibold hover:bg-surface-variant transition-colors min-h-[48px]" onclick="navigateTo('home')">
          Go Home
        </button>
      </div>
      <div class="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-left">
          <span class="material-symbols-outlined text-primary text-3xl mb-2 block">groups</span>
          <h3 class="font-headline-sm text-headline-sm text-primary mb-1">Farmer Network</h3>
          <p class="text-body-sm text-body-sm text-on-surface-variant">Connect with 50,000+ farmers across India.</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-left">
          <span class="material-symbols-outlined text-primary text-3xl mb-2 block">school</span>
          <h3 class="font-headline-sm text-headline-sm text-primary mb-1">Training</h3>
          <p class="text-body-sm text-body-sm text-on-surface-variant">Heritage seed workshops &amp; field events.</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-left">
          <span class="material-symbols-outlined text-primary text-3xl mb-2 block">savings</span>
          <h3 class="font-headline-sm text-headline-sm text-primary mb-1">Direct Trade</h3>
          <p class="text-body-sm text-body-sm text-on-surface-variant">Better prices, no middlemen.</p>
        </div>
      </div>
    </main>
  `;
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  let pageContent = '';
  try {
    switch (state.currentPage) {
      case 'home':
        pageContent = renderHomePage();
        break;
    case 'shop':
      pageContent = renderShopPage();
      break;
    case 'product':
      pageContent = renderProductPage();
      break;
    case 'cart':
      pageContent = renderCartPage();
      break;
    case 'checkout':
      pageContent = renderCheckoutPage();
      break;
    case 'confirmation':
      pageContent = renderConfirmationPage();
      break;
    case 'orders':
      pageContent = renderOrdersPage();
      break;
    case 'about':
      pageContent = renderAboutPage();
      break;
    case 'auth':
      pageContent = renderAuthPage();
      break;
    case 'profile':
      pageContent = renderProfilePage();
      break;
    case 'search':
      pageContent = renderSearchPage();
      break;
    case 'wishlist':
      pageContent = renderWishlistPage();
      break;
    case 'coming-soon':
      pageContent = renderComingSoonPage();
      break;
    case '404':
      pageContent = render404Page();
      break;
    default:
      pageContent = render404Page();
  }
  } catch (e) {
    console.error("Render error:", e);
    pageContent = `
      <main class="flex-grow w-full max-w-md mx-auto px-4 py-12 text-center">
        <div class="bg-white border border-error rounded-2xl p-8">
          <span class="material-symbols-outlined text-error text-5xl">error</span>
          <h1 class="text-xl font-bold text-error mt-3">Couldn't load this page</h1>
          <p class="text-on-surface-variant mt-2 text-sm">${escapeHtml(e.message || 'Unknown error')}</p>
          <button onclick="location.reload()" class="mt-4 w-full bg-primary text-on-primary py-2 rounded-lg font-semibold">Reload</button>
          <button onclick="navigateTo('home')" class="mt-2 w-full border border-outline-variant py-2 rounded-lg font-semibold">Go Home</button>
        </div>
      </main>`;
  }

  try {
    // Skip link for screen readers and keyboard users
    const skipLink = '<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg">Skip to main content</a>';
    app.innerHTML = skipLink + renderNav() + pageContent + renderFooter() + renderMobileBottomNav() + renderSupportWidget() + renderBackToTop();
    setupBackToTop();
    // Add id="main-content" to the first <main> in pageContent for skip link target
    const firstMain = app.querySelector('main');
    if (firstMain && !firstMain.id) firstMain.id = 'main-content';
  } catch (e) {
    console.error("Render injection error:", e);
    app.innerHTML = `<main class="p-8 text-center"><p class="text-error">Failed to render: ${escapeHtml(e.message)}</p></main>`;
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  // Set up global error boundary
  setupErrorBoundary();

  // Load persisted data
  loadCart();
  loadOrders();

  // Set up hash change listener
  window.addEventListener('hashchange', handleHashChange);

  // Initial render (with mock fallback immediately)
  handleHashChange();

  // Init Auth + backend sync
  try {
    await initAuth();
  } catch (e) {
    console.warn("Auth init failed:", e);
  }
  try {
    await syncFromBackend();
  } catch (e) {
    console.warn("Backend sync failed:", e);
  }
  // Re-render to show backend data
  renderApp();

  // Add toast animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .animate-slide-up { animation: slideUp 0.3s ease-out; }
    .animate-fade-out { animation: fadeOut 0.3s ease-in forwards; }
    .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  `;
  document.head.appendChild(style);

  console.log('Krishi Sewa Foundation - Frontend Demo Initialized');
  console.log('Design System: Google Stitch / Material 3');
  console.log('Colors: Primary #012d1d, Secondary #645e49');
  console.log('Fonts: Source Serif 4 (headlines), Plus Jakarta Sans (body)');
}

// Global error boundary — catch uncaught errors and show a friendly message
function setupErrorBoundary() {
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    showFatalError(event.error?.message || 'Something went wrong');
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show for network errors that we already handle gracefully
    if (event.reason && !String(event.reason.message).includes('fetch')) {
      showFatalError(event.reason.message || 'Network error');
    }
  });

  // Online/offline detection
  window.addEventListener('online', () => {
    document.getElementById('offlineBanner')?.remove();
    toast('Back online');
    // Re-sync on reconnect
    if (state.authUser) syncFromBackend();
  });
  window.addEventListener('offline', () => {
    showOfflineBanner();
  });
  // Check on startup
  if (!navigator.onLine) showOfflineBanner();
}

function showOfflineBanner() {
  if (document.getElementById('offlineBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.className = 'fixed top-0 left-0 right-0 z-[100] bg-error text-on-error py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2';
  banner.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">wifi_off</span>
    <span>You're offline. Some features may not work until you reconnect.</span>
  `;
  document.body.prepend(banner);
}

function showFatalError(message) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <main class="flex-grow w-full max-w-md mx-auto px-4 py-12 text-center">
      <div class="bg-white border border-error rounded-2xl p-8">
        <span class="material-symbols-outlined text-error text-5xl">error</span>
        <h1 class="text-2xl font-bold text-error mt-3">Something went wrong</h1>
        <p class="text-on-surface-variant mt-2 text-sm">${escapeHtml(message)}</p>
        <button onclick="location.reload()" class="mt-6 w-full bg-primary text-on-primary py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">refresh</span> Reload page
        </button>
        <button onclick="localStorage.clear(); location.reload();" class="mt-2 w-full text-sm text-on-surface-variant hover:text-error">Clear local data and reload</button>
      </div>
    </main>`;
}

// Start the app when DOM is ready
// ============================================
// SUPPORT WIDGET — floating help ball + chat window
// ============================================
const supportState = {
  open: false,
  chats: [],         // all user's chats (open + closed)
  chat: null,        // currently selected chat
  messages: [],
  loading: false,
  pollTimer: null,
  unread: 0,
  view: "list"       // "list" | "chat"
};

function renderSupportWidget() {
  // Hide on admin/auth/coming-soon
  const hide = ["auth", "coming-soon"].includes(state.currentPage);
  if (hide) return "";
  return `
    <!-- Floating help ball -->
    <button id="supportBall" onclick="toggleSupportWidget()" class="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[85] h-14 w-14 rounded-full bg-primary text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ${supportState.open ? "scale-0" : "scale-100"}" aria-label="Get help" title="Get help">
      <span class="material-symbols-outlined text-2xl">support_agent</span>
      <span class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-ochre animate-ping"></span>
      <span class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-ochre"></span>
      ${supportState.unread > 0 ? `<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">${supportState.unread}</span>` : ""}
    </button>
    <!-- Chat window -->
    <div id="supportPanel" class="fixed inset-x-0 bottom-16 top-0 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:h-[600px] md:max-h-[80vh] z-[95] bg-white md:rounded-2xl shadow-2xl border border-outline-variant flex flex-col ${supportState.open ? "flex" : "hidden"}" style="font-size: 16px;">
      <div class="flex items-center gap-3 p-4 bg-primary text-on-primary md:rounded-t-2xl shrink-0">
        <div class="h-10 w-10 rounded-full bg-on-primary/20 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined">support_agent</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm">Krishi Sewa Support</p>
          <p class="text-xs opacity-80 flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-green-400"></span>
            <span>Online • replies in minutes</span>
          </p>
        </div>
        ${supportState.view === "chat" ? `<button onclick="supportBackToList()" class="text-on-primary/80 hover:text-on-primary" aria-label="Back to chats" title="All chats"><span class="material-symbols-outlined">arrow_back</span></button>` : `<button onclick="loadAllSupportChats(); renderSupportPanel();" class="text-on-primary/80 hover:text-on-primary" aria-label="Refresh" title="Refresh"><span class="material-symbols-outlined text-xl">refresh</span></button>`}
        <button onclick="toggleSupportWidget()" class="text-on-primary/80 hover:text-on-primary" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div id="supportBody" class="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
        ${renderSupportBody()}
      </div>
      <div id="typingIndicator" class="hidden px-4 py-1 text-xs text-on-surface-variant italic bg-surface-container-lowest border-t border-outline-variant">Support is typing<span class="animate-pulse">…</span></div>
      <div id="supportInput" class="p-3 border-t border-outline-variant bg-white md:rounded-b-2xl shrink-0">
        ${renderSupportInput()}
      </div>
    </div>
  `;
}

function renderSupportBody() {
  if (supportState.loading) {
    return `<div class="text-center text-sm text-on-surface-variant py-8"><span class="material-symbols-outlined animate-spin inline">progress_activity</span> Loading…</div>`;
  }
  if (supportState.view === "list" || !supportState.chat) {
    return renderSupportChatList();
  }
  // We're in a chat view with a selected chat — show messages
  if (supportState.messages.length === 0) {
    return `
      <div class="text-center py-6">
        <p class="text-sm text-on-surface-variant mb-2">No messages yet — say hi!</p>
        <p class="text-xs text-on-surface-variant">${escapeHtml(supportState.chat.subject || "")}</p>
      </div>`;
  }
  return supportState.messages.map(m => {
    const isUser = m.sender_type === "user";
    const isSystem = m.sender_type === "system";
    if (isSystem) {
      return `<div class="text-center text-xs text-on-surface-variant italic py-2 px-3 bg-surface-container-low rounded-lg">${escapeHtml(m.message)}</div>`;
    }
    return `
      <div class="flex ${isUser ? "justify-end" : "justify-start"}">
        <div class="max-w-[80%] ${isUser ? "bg-primary text-on-primary" : "bg-white border border-outline-variant"} rounded-2xl px-3 py-2 ${isUser ? "rounded-br-sm" : "rounded-bl-sm"}">
          <p class="text-sm whitespace-pre-wrap break-words">${escapeHtml(m.message)}</p>
          <p class="text-[10px] mt-1 ${isUser ? "text-on-primary/70" : "text-on-surface-variant"}">${new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
        </div>
      </div>
    `;
  }).join("");
}

function renderSupportChatList() {
  if (!state.authUser) {
    return `
      <div class="text-center py-8">
        <div class="inline-block h-16 w-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-2">
          <span class="material-symbols-outlined text-3xl">support_agent</span>
        </div>
        <p class="font-bold text-on-surface">Need help?</p>
        <p class="text-sm text-on-surface-variant mt-1">Log in to chat with our support team</p>
        <button onclick="navigateTo('auth')" class="mt-4 px-6 py-2 bg-primary text-on-primary rounded-full font-semibold">Log in</button>
      </div>`;
  }
  const openChats = supportState.chats.filter(c => c.status !== "closed");
  const closedChats = supportState.chats.filter(c => c.status === "closed");
  return `
    <div class="text-center mb-4">
      <div class="inline-block h-16 w-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-2">
        <span class="material-symbols-outlined text-3xl">waving_hand</span>
      </div>
      <p class="font-bold text-on-surface">Hi ${escapeHtml(state.authUser.name || "there")} 👋</p>
      <p class="text-sm text-on-surface-variant mt-1">How can we help today?</p>
    </div>
    <button onclick="supportShowNewChatMenu()" class="w-full mb-4 p-3 bg-primary text-on-primary rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90">
      <span class="material-symbols-outlined">add_comment</span>
      Start a new conversation
    </button>
    <div id="newChatMenu" class="hidden mb-4 space-y-2">
      <button onclick="supportStartWith('order','📦 I have an order issue')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">package_2</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">I have an order issue</p>
          <p class="text-xs text-on-surface-variant">Wrong item, not received, refund, etc.</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('account','🔑 Change email or password')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">manage_accounts</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Change email or password</p>
          <p class="text-xs text-on-surface-variant">Our team can help you update details</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('product','🌱 Product question')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">eco</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Product question</p>
          <p class="text-xs text-on-surface-variant">Seeds, fertilizers, tools, usage</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('general','💬 Something else')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">chat</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Something else</p>
          <p class="text-xs text-on-surface-variant">General feedback or other questions</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
    </div>
    ${openChats.length > 0 ? `
      <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 px-1">Active conversations (${openChats.length})</p>
      <div class="space-y-2 mb-3">
        ${openChats.map(c => renderSupportChatItem(c, false)).join("")}
      </div>
    ` : ""}
    ${closedChats.length > 0 ? `
      <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 px-1">Closed</p>
      <div class="space-y-2">
        ${closedChats.slice(0, 5).map(c => renderSupportChatItem(c, true)).join("")}
      </div>
    ` : ""}
    <p class="text-[10px] text-on-surface-variant text-center mt-4">We typically reply in under 5 minutes during business hours</p>
  `;
}

function renderSupportChatItem(c, isClosed) {
  const last = c.last_message || c.subject || "No messages yet";
  const time = c.last_message_at ? new Date(c.last_message_at) : new Date(c.created_at);
  const ago = timeAgo(time);
  const unread = c.unread_for_user || 0;
  const catIcons = { order: "package_2", account: "manage_accounts", product: "eco", general: "chat" };
  const icon = catIcons[c.category] || "chat";
  return `
    <button onclick="supportOpenChat(${c.id})" class="w-full text-left p-3 ${isClosed ? "bg-surface-container-low" : "bg-white border border-outline-variant"} rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3 ${isClosed ? "opacity-70" : ""}">
      <div class="h-10 w-10 rounded-full ${isClosed ? "bg-surface-container" : "bg-primary-container"} text-primary flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="font-semibold text-sm text-on-surface truncate flex-1">${escapeHtml(c.subject || "Chat")}</p>
          ${unread > 0 ? `<span class="bg-error text-on-error text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">${unread}</span>` : ""}
        </div>
        <p class="text-xs text-on-surface-variant truncate">${escapeHtml(last)}</p>
        <p class="text-[10px] text-on-surface-variant mt-0.5">${ago} ${isClosed ? "• Closed" : ""}</p>
      </div>
    </button>
  `;
}

function renderSupportQuickReplies() {
  return `
    <div class="text-center mb-4">
      <div class="inline-block h-16 w-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-2">
        <span class="material-symbols-outlined text-3xl">waving_hand</span>
      </div>
      <p class="font-bold text-on-surface">Pick a topic</p>
      <p class="text-sm text-on-surface-variant mt-1">What do you need help with?</p>
    </div>
    <div class="space-y-2">
      <button onclick="supportStartWith('order','📦 I have an order issue')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">package_2</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">I have an order issue</p>
          <p class="text-xs text-on-surface-variant">Wrong item, not received, refund, etc.</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('account','🔑 Change email or password')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">manage_accounts</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Change email or password</p>
          <p class="text-xs text-on-surface-variant">Our team can help you update details</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('product','🌱 Product question')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">eco</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Product question</p>
          <p class="text-xs text-on-surface-variant">Seeds, fertilizers, tools, usage</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
      <button onclick="supportStartWith('general','💬 Something else')" class="w-full text-left p-3 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary-container/30 transition-colors flex items-start gap-3">
        <span class="material-symbols-outlined text-primary mt-0.5">chat</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-on-surface">Something else</p>
          <p class="text-xs text-on-surface-variant">General feedback or other questions</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>
    </div>
  `;
}

function timeAgo(date) {
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff/60) + "m ago";
  if (diff < 86400) return Math.floor(diff/3600) + "h ago";
  if (diff < 604800) return Math.floor(diff/86400) + "d ago";
  return date.toLocaleDateString();
}

function renderSupportInput() {
  if (!supportState.chat) {
    return `<p class="text-xs text-on-surface-variant text-center py-2">Pick a topic or open an existing chat above to start messaging</p>`;
  }
  return `
    <form onsubmit="sendSupportMessage(event)" class="flex gap-2 items-end">
      <textarea id="supportMsgInput" rows="1" placeholder="Type your message…" oninput="autoGrowSupportInput(this); onUserTyping();" onblur="onUserTyping(false)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendSupportMessage(event);}" class="flex-1 resize-none max-h-32 border border-outline-variant rounded-2xl px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" style="min-height: 40px;"></textarea>
      <button type="submit" class="h-10 w-10 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 disabled:opacity-40" id="supportSendBtn">
        <span class="material-symbols-outlined">send</span>
      </button>
    </form>
    <p class="text-[10px] text-on-surface-variant mt-1 text-center">Press Enter to send • Shift+Enter for new line</p>
  `;
}

function autoGrowSupportInput(el) {
  el.style.height = "40px";
  el.style.height = Math.min(el.scrollHeight, 128) + "px";
}

// ============================================
// BACK TO TOP button
// ============================================
function renderBackToTop() {
  return `<button id="backToTopBtn" class="hidden fixed bottom-36 md:bottom-24 left-4 md:left-6 z-[80] h-12 w-12 rounded-full bg-surface text-primary border border-outline-variant shadow-lg hover:scale-110 transition-transform flex items-center justify-center" aria-label="Back to top" onclick="window.scrollTo({top:0,behavior:'smooth'})">
    <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
  </button>`;
}

function setupBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;
  const onScroll = () => {
    if (window.scrollY > 600) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // Clean up on next render to avoid duplicates
  btn.dataset.bound = "1";
}

let userTypingTimer = null;
function onUserTyping(isTyping = true) {
  if (!supportState.chat) return;
  if (userTypingTimer) clearTimeout(userTypingTimer);
  if (isTyping) {
    fetch(`${API_BASE}/support/chat/${supportState.chat.id}/typing`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ isTyping: true })
    }).catch(() => {});
    userTypingTimer = setTimeout(() => onUserTyping(false), 5000);
  } else {
    fetch(`${API_BASE}/support/chat/${supportState.chat.id}/typing`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ isTyping: false })
    }).catch(() => {});
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

function toggleSupportWidget() {
  supportState.open = !supportState.open;
  if (supportState.open) {
    supportState.unread = 0;
    if (state.authUser) loadOrCreateSupportChat();
  }
  renderApp();
  if (supportState.open) {
    setTimeout(() => {
      const el = document.getElementById("supportBody");
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
    startSupportPolling();
  } else {
    stopSupportPolling();
  }
}

async function supportStartWith(category, subject) {
  if (!state.authUser) {
    toast("Please log in first to chat with support");
    navigateTo("auth");
    return;
  }
  supportState.loading = true;
  document.getElementById("supportBody").innerHTML = renderSupportBody();
  try {
    const r = await apiPost("/support/chat/start", { category, subject });
    if (r.error) { toast(r.error); supportState.loading = false; document.getElementById("supportBody").innerHTML = renderSupportBody(); return; }
    supportState.chat = r.chat;
    await loadSupportMessages();
    supportState.loading = false;
    // Refresh the chat list in background
    loadAllSupportChats();
    supportState.view = "chat";
    renderSupportPanel();
    startSupportPolling();
  } catch (e) {
    toast("Failed to start chat: " + e.message);
    supportState.loading = false;
    document.getElementById("supportBody").innerHTML = renderSupportBody();
  }
}

async function supportOpenChat(chatId) {
  const c = supportState.chats.find(x => x.id === chatId);
  if (!c) return;
  supportState.chat = c;
  supportState.view = "chat";
  supportState.loading = true;
  renderSupportPanel();
  await loadSupportMessages();
  supportState.loading = false;
  // Mark this chat as read in the list
  c.unread_for_user = 0;
  renderSupportPanel();
  startSupportPolling();
}

function supportBackToList() {
  stopSupportPolling();
  supportState.view = "list";
  supportState.chat = null;
  supportState.messages = [];
  loadAllSupportChats();
  renderSupportPanel();
}

function supportShowNewChatMenu() {
  const m = document.getElementById("newChatMenu");
  if (m) m.classList.toggle("hidden");
}

async function loadAllSupportChats() {
  if (!state.authUser) return;
  try {
    const chats = await apiGet("/support/chats/mine");
    supportState.chats = chats || [];
    // Recompute total unread
    supportState.unread = supportState.chats.reduce((sum, c) => sum + (c.unread_for_user || 0), 0);
    // Re-render the floating ball badge
    const ball = document.getElementById("supportBall");
    if (ball) {
      let badge = ball.querySelector(".unread-badge");
      if (supportState.unread > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "unread-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center";
          ball.appendChild(badge);
        }
        badge.textContent = supportState.unread;
      } else if (badge) {
        badge.remove();
      }
    }
  } catch (e) { console.warn("loadAllSupportChats:", e.message); }
}

function renderSupportPanel() {
  const panel = document.getElementById("supportPanel");
  if (!panel) {
    renderApp();
    return;
  }
  // Re-render the whole app to keep header buttons (back/refresh) in sync
  renderApp();
  setTimeout(() => {
    const el = document.getElementById("supportBody");
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

async function loadOrCreateSupportChat() {
  if (!state.authUser) return;
  supportState.loading = true;
  document.getElementById("supportBody").innerHTML = renderSupportBody();
  try {
    await loadAllSupportChats();
  } catch (e) { console.warn("loadOrCreateSupportChat:", e.message); }
  supportState.loading = false;
  document.getElementById("supportBody").innerHTML = renderSupportBody();
}

async function loadSupportMessages() {
  if (!supportState.chat) return;
  try {
    const msgs = await apiGet(`/support/chat/${supportState.chat.id}/messages`);
    supportState.messages = msgs || [];
  } catch (e) { console.warn("loadSupportMessages:", e.message); }
}

async function sendSupportMessage(e) {
  e.preventDefault();
  const input = document.getElementById("supportMsgInput");
  const msg = input.value.trim();
  if (!msg || !supportState.chat) return;
  // Optimistic add
  const tempMsg = { id: "temp-" + Date.now(), sender_type: "user", sender_name: state.authUser.name, message: msg, created_at: new Date().toISOString() };
  supportState.messages.push(tempMsg);
  input.value = "";
  input.style.height = "40px";
  document.getElementById("supportBody").innerHTML = renderSupportBody();
  document.getElementById("supportBody").scrollTop = 999999;
  try {
    const r = await apiPost(`/support/chat/${supportState.chat.id}/message`, { message: msg });
    if (r.error) { toast(r.error); return; }
    // Replace temp with real
    const idx = supportState.messages.findIndex(m => m.id === tempMsg.id);
    if (idx !== -1) supportState.messages[idx] = r.message;
    document.getElementById("supportBody").innerHTML = renderSupportBody();
  } catch (e) { toast("Failed to send: " + e.message); }
}

function startSupportPolling() {
  stopSupportPolling();
  supportState.pollTimer = setInterval(async () => {
    if (!supportState.open) return;
    try {
      // Always refresh the chat list to keep unread badges up to date
      await loadAllSupportChats();
      if (supportState.view === "chat" && supportState.chat) {
        const before = supportState.messages.length;
        await loadSupportMessages();
        const after = supportState.messages.length;
        if (after !== before) {
          const newMsgs = supportState.messages.slice(before);
          const newAdmin = newMsgs.filter(m => m.sender_type === "admin").length;
          if (newAdmin > 0) {
            toast(`New message from support`);
          }
          const body = document.getElementById("supportBody");
          if (body) {
            body.innerHTML = renderSupportBody();
            body.scrollTop = 999999;
          }
        }
        // Check if admin is typing
        try {
          const t = await apiGet(`/admin/support/chat/${supportState.chat.id}/typing`);
          if (t && t.typing && t.typing.length > 0) {
            const ind = document.getElementById("typingIndicator");
            if (ind) ind.classList.remove("hidden");
          } else {
            const ind = document.getElementById("typingIndicator");
            if (ind) ind.classList.add("hidden");
          }
        } catch {}
      } else if (supportState.view === "list") {
        // Refresh the list display (for unread badges)
        const body = document.getElementById("supportBody");
        if (body && !body.querySelector(".text-center.text-sm.text-on-surface-variant.py-8")) {
          body.innerHTML = renderSupportBody();
        }
      }
    } catch {}
  }, 3000);
}
function stopSupportPolling() {
  if (supportState.pollTimer) { clearInterval(supportState.pollTimer); supportState.pollTimer = null; }
}

// Stop polling when widget is closed and we navigate
const _origNavigateTo = navigateTo;
navigateTo = function(page, params) {
  stopSupportPolling();
  return _origNavigateTo(page, params);
};

// ============================================
// PROFILE TABS — Addresses, Wishlist, Sessions, Preferences
// ============================================
const profileState = { tab: "addresses" };

async function loadProfileTab(tab) {
  profileState.tab = tab;
  // Update tab styling
  document.querySelectorAll(".profile-tab").forEach(b => {
    const active = b.dataset.profileTab === tab;
    b.classList.toggle("border-primary", active);
    b.classList.toggle("text-primary", active);
    b.classList.toggle("text-on-surface-variant", !active);
    b.classList.toggle("border-transparent", !active);
  });
  const content = document.getElementById("profileTabContent");
  if (!content) return;
  content.innerHTML = `<div class="text-sm text-on-surface-variant py-4">Loading…</div>`;
  try {
    if (tab === "addresses") return await loadAddressesTab(content);
    if (tab === "wishlist") return await loadWishlistTab(content);
    if (tab === "sessions") return await loadSessionsTab(content);
    if (tab === "preferences") return await loadPreferencesTab(content);
    if (tab === "danger") return await loadDangerTab(content);
  } catch (e) {
    content.innerHTML = `<div class="text-error text-sm">${escapeHtml(e.message)}</div>`;
  }
}

async function loadAddressesTab(content) {
  const addrs = await apiGet("/addresses") || [];
  content.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-primary">Saved Addresses</h3>
      <button onclick="openAddressForm()" class="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1">
        <span class="material-symbols-outlined text-[18px]">add</span> Add new
      </button>
    </div>
    ${addrs.length === 0 ? `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
        <span class="material-symbols-outlined text-outline text-4xl">home</span>
        <p class="text-on-surface-variant mt-2 text-sm">No saved addresses</p>
      </div>
    ` : `
      <div class="space-y-3">
        ${addrs.map(a => `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="font-bold text-on-surface">${escapeHtml(a.label || "Home")}</p>
                  ${a.is_default ? '<span class="text-[10px] font-bold bg-primary text-on-primary px-2 py-0.5 rounded-full">DEFAULT</span>' : ""}
                </div>
                <p class="text-sm text-on-surface">${escapeHtml(a.full_name)} • ${escapeHtml(a.phone)}</p>
                <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(a.address_line1)}${a.address_line2 ? ', ' + escapeHtml(a.address_line2) : ''}${a.landmark ? ', ' + escapeHtml(a.landmark) : ''}</p>
                <p class="text-sm text-on-surface-variant">${escapeHtml(a.district)}, ${escapeHtml(a.state)} - ${escapeHtml(a.pincode)}</p>
              </div>
              <button onclick="deleteAddress('${a.id}')" class="text-error hover:bg-error-container p-1 rounded" title="Delete">
                <span class="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}
  `;
}

async function loadWishlistTab(content) {
  const items = await apiGet("/wishlist") || [];
  content.innerHTML = `
    <h3 class="font-bold text-primary mb-3">Your Wishlist (${items.length})</h3>
    ${items.length === 0 ? `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
        <span class="material-symbols-outlined text-outline text-4xl">favorite</span>
        <p class="text-on-surface-variant mt-2 text-sm">No saved items yet</p>
        <button onclick="navigateTo('shop')" class="mt-3 text-primary font-semibold text-sm">Browse products →</button>
      </div>
    ` : `
      <p class="text-sm text-on-surface-variant">Loading products…</p>
      <div id="wishlistItems" class="space-y-2 mt-3"></div>
    `}
  `;
  if (items.length > 0) {
    // Fetch product details for each wishlist item
    const wrap = document.getElementById("wishlistItems");
    for (const it of items) {
      try {
        const p = await apiGet(`/products/${it.product_id}`);
        if (p) {
          const el = document.createElement("div");
          el.className = "bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3";
          el.innerHTML = `
            <img src="${escapeHtml(p.image)}" alt="" class="h-14 w-14 rounded-lg object-cover">
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm truncate">${escapeHtml(p.name)}</p>
              <p class="text-primary font-bold text-sm">₹${p.price}</p>
            </div>
            <button onclick="removeFromWishlist(${p.id})" class="text-error p-2 hover:bg-error-container rounded" title="Remove">
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
            <button onclick="addWishlistToCart(${p.id})" class="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold">Add to cart</button>
          `;
          wrap.appendChild(el);
        }
      } catch {}
    }
  }
}

async function loadSessionsTab(content) {
  const sessions = await apiGet("/sessions") || [];
  content.innerHTML = `
    <h3 class="font-bold text-primary mb-3">Active Sessions (${sessions.length})</h3>
    <p class="text-xs text-on-surface-variant mb-3">Devices where you're currently logged in. Revoke any you don't recognize.</p>
    ${sessions.length === 0 ? `<p class="text-sm text-on-surface-variant">No active sessions</p>` : `
      <div class="space-y-2">
        ${sessions.map(s => `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-2xl">${/mobile/i.test(s.device_info || "") ? "phone_iphone" : "computer"}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">${escapeHtml((s.device_info || "Unknown device").substring(0, 60))}</p>
              <p class="text-xs text-on-surface-variant">${s.ip_address || "—"} • Last active ${new Date(s.last_active_at).toLocaleString()}</p>
            </div>
            <button onclick="revokeSession('${s.id}')" class="text-error text-xs font-semibold hover:underline">Revoke</button>
          </div>
        `).join("")}
      </div>
    `}
  `;
}

async function loadDangerTab(content) {
  content.innerHTML = `
    <h3 class="font-bold text-error mb-3 flex items-center gap-2"><span class="material-symbols-outlined">warning</span> Danger Zone</h3>
    <div class="bg-error-container/30 border-2 border-error rounded-xl p-5 space-y-4">
      <div>
        <p class="font-semibold text-on-error-container">Delete your account</p>
        <p class="text-sm text-on-error-container/80 mt-1">This will permanently remove your profile, addresses, cart, wishlist, and anonymize your orders. Support chats will be closed. This action cannot be undone.</p>
      </div>
      <div>
        <label class="block text-xs font-semibold text-on-error-container mb-1">Type <code class="bg-error/20 px-1 rounded">DELETE</code> to confirm:</label>
        <input id="deleteConfirm" placeholder="DELETE" class="w-full border border-error rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-error">
      </div>
      <button id="deleteAccountBtn" onclick="confirmDeleteAccount()" class="w-full bg-error text-on-error py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-error/90 transition-colors" disabled>Delete my account permanently</button>
    </div>
  `;
  const input = document.getElementById("deleteConfirm");
  if (input) {
    input.addEventListener("input", () => {
      const btn = document.getElementById("deleteAccountBtn");
      if (btn) btn.disabled = input.value.trim() !== "DELETE";
    });
  }
}

async function confirmDeleteAccount() {
  const input = document.getElementById("deleteConfirm");
  if (!input || input.value.trim() !== "DELETE") {
    toast('Type "DELETE" to confirm');
    return;
  }
  if (!confirm("Are you absolutely sure? This action cannot be undone.")) return;
  try {
    const r = await fetch(`${API_BASE}/auth/account`, {
      method: "DELETE",
      credentials: "include"
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Delete failed");
    toast("Account deleted");
    // Clear all local data
    state.authUser = null;
    state.authMode = "login";
    state.authPendingEmail = "";
    state.authPendingPurpose = "";
    state.cart = [];
    state.orders = [];
    state.lastOrder = null;
    state.billingAddress = {};
    state.wishlistCount = 0;
    try {
      localStorage.removeItem("krishi_user");
      localStorage.removeItem("krishi_sewa_cart");
      localStorage.removeItem("krishi_sewa_orders");
    } catch {}
    navigateTo("home");
    setTimeout(() => renderApp(), 100);
  } catch (e) {
    toast("Delete failed: " + e.message);
  }
}

async function loadPreferencesTab(content) {
  const prefs = await apiGet("/preferences") || {};
  content.innerHTML = `
    <h3 class="font-bold text-primary mb-3">Notification Preferences</h3>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
      ${[
        { key: "email_order_updates", label: "Order updates via email", icon: "email" },
        { key: "email_promotions", label: "Promotional offers", icon: "campaign" },
        { key: "email_support_replies", label: "Support replies", icon: "forum" },
        { key: "sms_order_updates", label: "Order updates via SMS", icon: "sms" }
      ].map(item => `
        <label class="flex items-center gap-3 cursor-pointer">
          <span class="material-symbols-outlined text-primary">${item.icon}</span>
          <span class="flex-1 text-sm">${item.label}</span>
          <input type="checkbox" data-pref="${item.key}" ${prefs[item.key] !== false ? "checked" : ""} class="w-5 h-5 accent-primary">
        </label>
      `).join("")}
      <hr class="border-outline-variant">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold mb-1">Language</label>
          <select data-pref="language" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white">
            <option value="en" ${prefs.language === "en" || !prefs.language ? "selected" : ""}>English</option>
            <option value="hi" ${prefs.language === "hi" ? "selected" : ""}>हिंदी</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1">Currency</label>
          <select data-pref="currency" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white">
            <option value="INR" ${!prefs.currency || prefs.currency === "INR" ? "selected" : ""}>₹ INR</option>
            <option value="USD" ${prefs.currency === "USD" ? "selected" : ""}>$ USD</option>
          </select>
        </div>
      </div>
      <button onclick="savePreferences()" class="w-full bg-primary text-on-primary py-2 rounded-lg font-semibold text-sm">Save preferences</button>
    </div>
  `;
}

async function savePreferences() {
  const patch = {};
  document.querySelectorAll("[data-pref]").forEach(el => {
    const k = el.dataset.pref;
    if (el.type === "checkbox") patch[k] = el.checked;
    else patch[k] = el.value;
  });
  try {
    await apiPost("/preferences", patch, true);
    showToast("Preferences saved");
  } catch (e) { showToast("Failed: " + e.message); }
}

async function deleteAddress(id) {
  if (!confirm("Delete this address?")) return;
  try { await fetch(`${API_BASE}/addresses/${id}`, { method: "DELETE", credentials: "include" }); loadProfileTab("addresses"); showToast("Address deleted"); }
  catch (e) { showToast("Failed: " + e.message); }
}

async function removeFromWishlist(productId) {
  try { await fetch(`${API_BASE}/wishlist/${productId}`, { method: "DELETE", credentials: "include" }); loadProfileTab("wishlist"); showToast("Removed"); }
  catch (e) { showToast("Failed: " + e.message); }
}

async function addWishlistToCart(productId) {
  try {
    const p = await apiGet(`/products/${productId}`);
    if (!p) return;
    const existing = state.cart.find(c => c.id === productId);
    if (existing) existing.quantity++;
    else state.cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
    saveCart();
    // Sync to server
    fetch(`${API_BASE}/cart`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ items: state.cart.map(c => ({ id: c.id, quantity: c.quantity, price: c.price, name: c.name, image: c.image })) }) }).catch(() => {});
    showToast("Added to cart");
  } catch (e) { showToast("Failed: " + e.message); }
}

async function revokeSession(id) {
  if (!confirm("Revoke this session? The device will be logged out.")) return;
  try { await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE", credentials: "include" }); loadProfileTab("sessions"); showToast("Session revoked"); }
  catch (e) { showToast("Failed: " + e.message); }
}

function openAddressForm() {
  const states = window.__krishi_states || [];
  showModal("Add Address", `
    <form onsubmit="submitNewAddress(event)" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <input name="label" placeholder="Label (Home/Work)" class="border border-outline-variant rounded-lg px-3 py-2 text-sm" value="Home">
        <input name="phone" placeholder="10-digit phone" required pattern="[0-9]{10}" class="border border-outline-variant rounded-lg px-3 py-2 text-sm">
      </div>
      <input name="fullName" placeholder="Full name" required class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
      <input name="addressLine1" placeholder="Address line 1" required class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
      <input name="addressLine2" placeholder="Address line 2 (optional)" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
      <input name="landmark" placeholder="Landmark (optional)" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <input name="pincode" placeholder="6-digit pincode" required pattern="[0-9]{6}" class="border border-outline-variant rounded-lg px-3 py-2 text-sm">
        <input name="city" placeholder="City" class="border border-outline-variant rounded-lg px-3 py-2 text-sm">
      </div>
      <select name="state" required class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">Select state</option>
        ${states.map(s => `<option value="${s.code}">${s.name}</option>`).join("")}
      </select>
      <input name="district" placeholder="District" required class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault"> Set as default</label>
      <div class="flex gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="flex-1 border border-outline-variant py-2 rounded-lg font-semibold">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary py-2 rounded-lg font-semibold">Save</button>
      </div>
    </form>
  `);
}

async function submitNewAddress(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = Object.fromEntries(f.entries());
  body.isDefault = f.get("isDefault") === "on";
  try {
    await apiPost("/addresses", body, true);
    closeModal();
    loadProfileTab("addresses");
    showToast("Address saved");
  } catch (err) { showToast("Failed: " + err.message); }
}

// Wire up tab buttons (called on every render)
document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-profile-tab]");
  if (tab) loadProfileTab(tab.dataset.profileTab);
});

// Load default tab on first profile render
setTimeout(() => {
  if (state.currentPage === "profile" && document.getElementById("profileTabContent")) {
    loadProfileTab("addresses");
  }
  if (state.currentPage === "search") loadSearchResults();
  if (state.currentPage === "wishlist") loadWishlistPage();
  if (state.currentPage === "checkout") loadSavedAddressesForCheckout();
  if (state.currentPage === "confirmation") loadOrderEventsTimeline();
}, 200);

async function syncServerCartOnLogin() {
  try {
    const serverCart = await apiGet('/cart');
    if (serverCart && Array.isArray(serverCart.items) && serverCart.items.length > 0) {
      // Server has items — merge (sum quantities for duplicates)
      const map = new Map();
      // Add local cart first
      state.cart.forEach(c => map.set(c.id, { ...c }));
      // Add server items
      serverCart.items.forEach(c => {
        if (map.has(c.id)) {
          map.get(c.id).quantity = (map.get(c.id).quantity || 0) + (c.quantity || 0);
        } else {
          map.set(c.id, { id: c.id, name: c.name, price: c.price, image: c.image, quantity: c.quantity || 1 });
        }
      });
      state.cart = Array.from(map.values());
      saveCart();
      toast(`Synced ${state.cart.length} item(s) from your saved cart`);
    }
  } catch (e) { console.warn('syncServerCartOnLogin:', e.message); }
}

async function loadOrderEventsTimeline() {
  if (!state.lastOrder) return;
  const wrap = document.getElementById('orderEventsTimeline');
  if (!wrap) return;
  try {
    const events = await apiGet(`/orders/${encodeURIComponent(state.lastOrder.id)}/events`) || [];
    if (events.length === 0) {
      wrap.innerHTML = `<p class="text-sm text-on-surface-variant text-center">No status updates yet</p>`;
      return;
    }
    wrap.innerHTML = `
      <h3 class="font-bold text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined">timeline</span> Order Status History</h3>
      <div class="space-y-3">
        ${events.map((e, i) => `
          <div class="flex gap-3">
            <div class="flex flex-col items-center">
              <div class="h-8 w-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                ${i + 1}
              </div>
              ${i < events.length - 1 ? '<div class="w-0.5 flex-1 bg-outline-variant mt-1"></div>' : ''}
            </div>
            <div class="flex-1 pb-3">
              <p class="font-semibold text-sm text-on-surface capitalize">${escapeHtml((e.event_type || '').replace(/_/g, ' '))}</p>
              <p class="text-xs text-on-surface-variant">${new Date(e.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              ${e.actor_email ? `<p class="text-xs text-on-surface-variant">by ${escapeHtml(e.actor_email)}</p>` : ''}
              ${e.details && Object.keys(e.details).length > 0 ? `<p class="text-xs text-on-surface-variant mt-1">${escapeHtml(JSON.stringify(e.details))}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<p class="text-sm text-on-surface-variant text-center">Status unavailable</p>`;
  }
}

// ============================================
// WISHLIST BUTTON on product cards
// ============================================
async function toggleWishlist(productId) {
  if (!state.authUser) { showToast("Please log in to use wishlist"); navigateTo("auth"); return; }
  try {
    const list = await apiGet("/wishlist") || [];
    const has = list.find(x => x.product_id === productId);
    if (has) {
      await fetch(`${API_BASE}/wishlist/${productId}`, { method: "DELETE", credentials: "include" });
      showToast("Removed from wishlist");
    } else {
      await apiPost(`/wishlist/${productId}`, {}, true);
      showToast("Added to wishlist ❤️");
    }
    // Update count and re-render to show updated badges
    state.wishlistCount = (list.length || 0) + (has ? -1 : 1);
    renderApp();
  } catch (e) { showToast("Failed: " + e.message); }
}

// Global Escape key handler for modals/drawers
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.isMobileMenuOpen) closeMobileMenu();
    closeSearchDialog();
    const userModal = document.getElementById("userContextModal");
    if (userModal) userModal.remove();
  }
});

// Global image fallback: replace broken images with a styled placeholder
document.addEventListener("error", (e) => {
  if (e.target.tagName === "IMG" && !e.target.dataset.fallback) {
    e.target.dataset.fallback = "1";
    e.target.classList.add("img-fallback");
    e.target.style.minHeight = "120px";
    e.target.alt = e.target.alt || "Image";
  }
}, true);

// Global error boundary: catch uncaught errors and show a friendly message
window.addEventListener("error", (e) => {
  console.error("[krishi] uncaught error:", e.error);
  if (e.error && /network|fetch|api/i.test(String(e.error.message || ""))) {
    showToast("Network error — check your connection");
  }
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[krishi] unhandled rejection:", e.reason);
  if (e.reason && /network|fetch|api/i.test(String(e.reason.message || e.reason))) {
    showToast("Network error — please try again");
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}