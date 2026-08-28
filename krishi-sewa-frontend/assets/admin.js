/**
 * Krishi Sewa Admin Panel
 */
const API = (() => {
  const host = window.location.hostname;
  const port = window.location.port;
  if ((host === "localhost" || host === "127.0.0.1") && (port === "3000" || port === "3001" || port === "4000")) return "/api";
  if (host === "localhost" || host === "127.0.0.1") return `http://${host}:3000/api`;
  if (!host) return "http://localhost:3000/api";
  return "/api";
})();

const TOKEN_KEY = "krishi_admin_token";
let productsCache = [];
let ordersCache = [];

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {})
  };
}

function toast(msg) {
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

// Auth
function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}
function showLogin(show) {
  document.getElementById("loginScreen").classList.toggle("hidden", !show);
  document.getElementById("adminApp").classList.toggle("hidden", show);
}
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.classList.add("hidden");
  try {
    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem(TOKEN_KEY, data.token);
    showLogin(false);
    initAdmin();
    toast("Logged in as admin");
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}
function handleLogout() {
  localStorage.removeItem(TOKEN_KEY);
  showLogin(true);
}

// Tabs
function switchTab(tab) {
  document.querySelectorAll(".admin-tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
    b.classList.toggle("bg-primary", b.dataset.tab === tab);
    b.classList.toggle("text-on-primary", b.dataset.tab === tab);
    b.classList.toggle("text-on-surface-variant", b.dataset.tab !== tab);
  });
  document.querySelectorAll(".admin-tab-mobile").forEach(b => {
    b.classList.toggle("text-primary", b.dataset.tab === tab);
    b.classList.toggle("text-on-surface-variant", b.dataset.tab !== tab);
  });
  document.querySelectorAll(".admin-section").forEach(s => s.classList.add("hidden"));
  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.remove("hidden");
  if (tab === "dashboard") loadStats();
  if (tab === "products") loadProducts();
  if (tab === "orders") loadOrders();
  if (tab === "integrations") { loadWebhooks(); loadApiKeys(); }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  if (isLoggedIn()) {
    showLogin(false);
    initAdmin();
  } else {
    showLogin(true);
  }
});

async function initAdmin() {
  await Promise.all([loadStats(), loadProducts(), loadOrders()]);
  switchTab("dashboard");
  // api status
  try {
    const res = await fetch(`${API}/health`);
    document.getElementById("apiStatus").textContent = res.ok ? "● Connected" : "● Error";
    document.getElementById("apiStatus").className = res.ok ? "text-green-600 font-semibold" : "text-error font-semibold";
  } catch {
    document.getElementById("apiStatus").textContent = "● Offline";
  }
  // Check pending cancellation requests
  renderPendingCancellationsBadge();
  // Poll for new requests every 30s
  setInterval(renderPendingCancellationsBadge, 30000);
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, { headers: getHeaders() });
    const s = await res.json();
    document.getElementById("statsGrid").innerHTML = `
      <div class="bg-white border border-outline-variant rounded-xl p-5">
        <div class="flex items-center justify-between mb-2"><span class="text-on-surface-variant text-sm font-semibold">Products</span><span class="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-primary text-[20px]">inventory_2</span></span></div>
        <p class="text-3xl font-bold text-primary">${s.totalProducts}</p>
        <p class="text-xs text-on-surface-variant">${s.inStockProducts} in stock • ${s.outOfStockProducts} out</p>
      </div>
      <div class="bg-white border border-outline-variant rounded-xl p-5">
        <div class="flex items-center justify-between mb-2"><span class="text-on-surface-variant text-sm font-semibold">Orders</span><span class="w-8 h-8 bg-secondary-container rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span></span></div>
        <p class="text-3xl font-bold text-primary">${s.totalOrders}</p>
        <p class="text-xs text-on-surface-variant">${s.pendingOrders} pending • ${s.shippedOrders} shipped • ${s.deliveredOrders} delivered</p>
      </div>
      <div class="bg-white border border-outline-variant rounded-xl p-5">
        <div class="flex items-center justify-between mb-2"><span class="text-on-surface-variant text-sm font-semibold">Revenue</span><span class="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-primary text-[20px]">payments</span></span></div>
        <p class="text-3xl font-bold text-primary">₹${s.totalRevenue.toLocaleString("en-IN")}</p>
        <p class="text-xs text-on-surface-variant">Total from delivered + processing</p>
      </div>
      <div class="bg-white border border-outline-variant rounded-xl p-5">
        <div class="flex items-center justify-between mb-2"><span class="text-on-surface-variant text-sm font-semibold">Fulfillment</span><span class="w-8 h-8 bg-accent-ochre/20 rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-primary text-[20px]">local_shipping</span></span></div>
        <p class="text-3xl font-bold text-primary">${s.totalOrders ? Math.round((s.deliveredOrders/s.totalOrders)*100) : 0}%</p>
        <p class="text-xs text-on-surface-variant">${s.deliveredOrders}/${s.totalOrders} delivered</p>
      </div>
    `;
  } catch (e) {
    document.getElementById("statsGrid").innerHTML = `<p class="text-error">Failed to load stats: ${e.message}</p>`;
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    productsCache = await res.json();
    renderProducts();
  } catch (e) {
    document.getElementById("productsTableWrap").innerHTML = `<p class="p-6 text-error">Failed: ${e.message}</p>`;
  }
}

function renderProducts() {
  if (productsCache.length === 0) {
    document.getElementById("productsTableWrap").innerHTML = `<div class="p-12 text-center"><p class="text-on-surface-variant">No products yet</p><button onclick="openProductModal()" class="mt-3 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold">Add first product</button></div>`;
    return;
  }
  const rows = productsCache.map(p => `
    <tr class="border-t border-outline-variant hover:bg-surface-variant/30">
      <td class="p-3">
        <div class="flex items-center gap-3">
          <img src="${p.image}" alt="" class="w-10 h-10 rounded-lg object-cover border border-outline-variant">
          <div>
            <p class="font-semibold text-sm leading-none">${p.name}</p>
            <p class="text-xs text-on-surface-variant">${p.category} • #${p.id}</p>
          </div>
        </div>
      </td>
      <td class="p-3 text-sm font-semibold text-primary">₹${p.price}</td>
      <td class="p-3 text-xs text-on-surface-variant line-through">₹${p.originalPrice || p.price}</td>
      <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${p.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${p.inStock ? 'In Stock' : 'Out'}</span></td>
      <td class="p-3 text-sm">${p.rating || '-'} ★</td>
      <td class="p-3">
        <div class="flex items-center gap-1">
          <button onclick="editProduct(${p.id})" class="w-8 h-8 rounded-lg hover:bg-surface-variant flex items-center justify-center" title="Edit"><span class="material-symbols-outlined text-[18px]">edit</span></button>
          <button onclick="toggleStock(${p.id}, ${!p.inStock})" class="w-8 h-8 rounded-lg hover:bg-surface-variant flex items-center justify-center" title="Toggle stock"><span class="material-symbols-outlined text-[18px]">${p.inStock ? 'visibility_off' : 'visibility'}</span></button>
          <button onclick="deleteProduct(${p.id})" class="w-8 h-8 rounded-lg hover:bg-red-50 text-error flex items-center justify-center" title="Delete"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </td>
    </tr>
  `).join("");
  document.getElementById("productsTableWrap").innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left min-w-[640px]">
        <thead class="bg-surface-variant/50 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          <tr><th class="p-3">Product</th><th class="p-3">Price</th><th class="p-3">MRP</th><th class="p-3">Stock</th><th class="p-3">Rating</th><th class="p-3">Actions</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function openProductModal(product = null) {
  const modal = document.getElementById("productModal");
  const isEdit = !!product;
  document.getElementById("productModalTitle").textContent = isEdit ? "Edit Product" : "Add Product";
  document.getElementById("productId").value = product?.id || "";
  document.getElementById("productName").value = product?.name || "";
  document.getElementById("productPrice").value = product?.price || "";
  document.getElementById("productOriginalPrice").value = product?.originalPrice || "";
  document.getElementById("productCategory").value = product?.category || "seeds";
  document.getElementById("productInStock").value = product ? String(product.inStock) : "true";
  document.getElementById("productImage").value = product?.image || "";
  document.getElementById("productShortDesc").value = product?.shortDescription || "";
  document.getElementById("productDesc").value = product?.description || "";
  document.getElementById("productTags").value = product?.tags?.join(", ") || "";
  document.getElementById("productFormError").classList.add("hidden");
  modal.classList.remove("hidden");
}
function closeProductModal() {
  document.getElementById("productModal").classList.add("hidden");
}
function editProduct(id) {
  const p = productsCache.find(x => x.id === id);
  if (p) openProductModal(p);
}
async function deleteProduct(id) {
  if (!confirm("Delete product #" + id + "?")) return;
  const res = await fetch(`${API}/products/${id}`, { method: "DELETE", headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:"Failed"}));
    toast(err.error || "Delete failed");
    return;
  }
  toast("Product deleted");
  loadProducts();
  loadStats();
}
async function toggleStock(id, newVal) {
  const res = await fetch(`${API}/products/${id}/stock`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ inStock: newVal })
  });
  if (!res.ok) { toast("Toggle failed"); return; }
  toast(newVal ? "Marked in stock" : "Marked out of stock");
  loadProducts();
}
async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("productName").value.trim(),
    price: parseFloat(document.getElementById("productPrice").value),
    originalPrice: parseFloat(document.getElementById("productOriginalPrice").value) || undefined,
    category: document.getElementById("productCategory").value,
    inStock: document.getElementById("productInStock").value === "true",
    image: document.getElementById("productImage").value.trim(),
    shortDescription: document.getElementById("productShortDesc").value.trim(),
    description: document.getElementById("productDesc").value.trim(),
    tags: document.getElementById("productTags").value.split(",").map(s=>s.trim()).filter(Boolean)
  };
  const errEl = document.getElementById("productFormError");
  errEl.classList.add("hidden");
  try {
    const url = id ? `${API}/products/${id}` : `${API}/products`;
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    closeProductModal();
    toast(id ? "Product updated" : "Product added");
    loadProducts();
    loadStats();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

// Orders
// ============================================
// INTEGRATIONS — Webhooks + API Keys
// ============================================
async function loadWebhooks() {
  const wrap = document.getElementById("webhooksList");
  if (!wrap) return;
  wrap.innerHTML = `<p class="text-center text-on-surface-variant py-4">Loading...</p>`;
  try {
    const r = await fetch(`${API}/admin/webhooks`, { credentials: "include" });
    if (!r.ok) { wrap.innerHTML = `<p class="text-error text-sm py-4">Failed (${r.status})</p>`; return; }
    const hooks = await r.json();
    if (hooks.length === 0) {
      wrap.innerHTML = `<p class="text-sm text-on-surface-variant text-center py-4">No webhooks registered. Click "Add Webhook" to create one.</p>`;
      return;
    }
    wrap.innerHTML = hooks.map(h => `
      <div class="border border-outline-variant rounded-lg p-3 ${h.active ? '' : 'opacity-60'}">
        <div class="flex items-center justify-between mb-1">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-mono truncate">${escapeHtml(h.url)}</p>
            <p class="text-xs text-on-surface-variant">Events: ${h.events.map(e => `<span class="px-1.5 py-0.5 bg-primary-container/30 rounded mr-1">${e}</span>`).join("")}</p>
          </div>
          <div class="flex items-center gap-1 ml-2">
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${h.active ? 'bg-primary text-on-primary' : 'bg-outline-variant text-on-surface'}">${h.active ? "Active" : "Disabled"}</span>
            <button onclick="deleteWebhook('${h.id}')" class="text-error p-1 hover:bg-error-container rounded" title="Delete">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
        <p class="text-[10px] text-on-surface-variant mt-1">${h.last_triggered_at ? "Last fired: " + timeAgo(new Date(h.last_triggered_at)) : "Never fired"} ${h.failure_count > 0 ? `• ${h.failure_count} failures` : ""}</p>
      </div>
    `).join("");
  } catch (e) { wrap.innerHTML = `<p class="text-error text-sm py-4">Failed: ${escapeHtml(e.message)}</p>`; }
}

async function deleteWebhook(id) {
  if (!confirm("Delete this webhook?")) return;
  try {
    await fetch(`${API}/admin/webhooks/${id}`, { method: "DELETE", credentials: "include" });
    toast("Webhook deleted");
    loadWebhooks();
  } catch (e) { toast("Failed: " + e.message); }
}

function showAddWebhookModal() {
  const html = `
    <div class="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal('addWebhookModal')">
      <div class="bg-white rounded-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
        <h3 class="font-bold text-lg text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined">webhook</span> Add Webhook</h3>
        <form onsubmit="submitWebhook(event)" class="space-y-3">
          <div>
            <label class="block text-sm font-semibold mb-1">URL</label>
            <input id="webhookUrl" type="url" required placeholder="https://your-app.com/webhook" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Events</label>
            <div class="grid grid-cols-2 gap-1 text-sm">
              ${["order.created", "order.shipped", "order.delivered", "order.cancelled"].map(ev => `
                <label class="flex items-center gap-1 p-1 border border-outline-variant rounded">
                  <input type="checkbox" name="webhookEvent" value="${ev}" class="accent-primary">
                  ${ev}
                </label>
              `).join("")}
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" onclick="closeModal('addWebhookModal')" class="flex-1 border border-outline-variant py-2 rounded-lg font-semibold">Cancel</button>
            <button type="submit" class="flex-1 bg-primary text-on-primary py-2 rounded-lg font-semibold">Add</button>
          </div>
        </form>
      </div>
    </div>
  `;
  showModal("addWebhookModal", html);
}

async function submitWebhook(e) {
  e.preventDefault();
  const url = document.getElementById("webhookUrl")?.value;
  const events = Array.from(document.querySelectorAll('[name="webhookEvent"]:checked')).map(cb => cb.value);
  if (!url || events.length === 0) { toast("URL and at least 1 event required"); return; }
  try {
    const r = await fetch(`${API}/admin/webhooks`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...getHeaders() },
      credentials: "include", body: JSON.stringify({ url, events })
    });
    if (!r.ok) throw new Error("Failed");
    toast("Webhook created");
    closeModal("addWebhookModal");
    loadWebhooks();
  } catch (e) { toast("Failed: " + e.message); }
}

async function loadApiKeys() {
  const wrap = document.getElementById("apiKeysList");
  if (!wrap) return;
  wrap.innerHTML = `<p class="text-center text-on-surface-variant py-4">Loading...</p>`;
  try {
    const r = await fetch(`${API}/admin/api-keys`, { credentials: "include" });
    if (!r.ok) { wrap.innerHTML = `<p class="text-error text-sm py-4">Failed (${r.status})</p>`; return; }
    const keys = await r.json();
    if (keys.length === 0) {
      wrap.innerHTML = `<p class="text-sm text-on-surface-variant text-center py-4">No API keys. Click "Generate Key" to create one.</p>`;
      return;
    }
    wrap.innerHTML = keys.map(k => `
      <div class="border border-outline-variant rounded-lg p-3 ${k.revoked_at ? 'opacity-60' : ''}">
        <div class="flex items-center justify-between mb-1">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">${escapeHtml(k.name)}</p>
            <p class="text-xs font-mono text-on-surface-variant">${escapeHtml(k.key_prefix)}...</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${k.revoked_at ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}">${k.revoked_at ? "Revoked" : (k.scope || "read")}</span>
            ${!k.revoked_at ? `<button onclick="deleteApiKey('${k.id}')" class="text-error p-1 hover:bg-error-container rounded" title="Revoke">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>` : ""}
          </div>
        </div>
        <p class="text-[10px] text-on-surface-variant">Last used: ${k.last_used_at ? timeAgo(new Date(k.last_used_at)) : "Never"} ${k.expires_at ? "• Expires " + new Date(k.expires_at).toLocaleDateString() : ""}</p>
      </div>
    `).join("");
  } catch (e) { wrap.innerHTML = `<p class="text-error text-sm py-4">Failed: ${escapeHtml(e.message)}</p>`; }
}

async function deleteApiKey(id) {
  if (!confirm("Revoke this API key? Apps using it will stop working.")) return;
  try {
    await fetch(`${API}/admin/api-keys/${id}`, { method: "DELETE", credentials: "include" });
    toast("API key revoked");
    loadApiKeys();
  } catch (e) { toast("Failed: " + e.message); }
}

function showAddApiKeyModal() {
  const html = `
    <div class="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal('addApiKeyModal')">
      <div class="bg-white rounded-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
        <h3 class="font-bold text-lg text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined">vpn_key</span> Generate API Key</h3>
        <form onsubmit="submitApiKey(event)" class="space-y-3">
          <div>
            <label class="block text-sm font-semibold mb-1">Name</label>
            <input id="apiKeyName" required placeholder="e.g. Mobile app" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Scope</label>
            <select id="apiKeyScope" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white">
              <option value="read">Read only</option>
              <option value="write">Read + Write</option>
              <option value="admin">Full admin</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Expires in (days, blank = never)</label>
            <input id="apiKeyExpiry" type="number" min="1" placeholder="365" class="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
          <div class="flex gap-2">
            <button type="button" onclick="closeModal('addApiKeyModal')" class="flex-1 border border-outline-variant py-2 rounded-lg font-semibold">Cancel</button>
            <button type="submit" class="flex-1 bg-primary text-on-primary py-2 rounded-lg font-semibold">Generate</button>
          </div>
        </form>
      </div>
    </div>
  `;
  showModal("addApiKeyModal", html);
}

async function submitApiKey(e) {
  e.preventDefault();
  const name = document.getElementById("apiKeyName")?.value;
  const scope = document.getElementById("apiKeyScope")?.value;
  const expiryInDays = parseInt(document.getElementById("apiKeyExpiry")?.value) || null;
  try {
    const r = await fetch(`${API}/admin/api-keys`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...getHeaders() },
      credentials: "include", body: JSON.stringify({ name, scope, expiresInDays })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Failed");
    closeModal("addApiKeyModal");
    // Show key in alert (only chance to copy!)
    prompt("API Key generated. SAVE IT NOW (won't be shown again):\n\n" + d.key, d.key);
    loadApiKeys();
  } catch (e) { toast("Failed: " + e.message); }
}

async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders`, { headers: getHeaders() });
    ordersCache = await res.json();
    // show newest first
    ordersCache.sort((a,b) => new Date(b.date) - new Date(a.date));
    renderOrders();
  } catch (e) {
    document.getElementById("ordersTableWrap").innerHTML = `<p class="text-error p-4">Failed: ${e.message}</p>`;
  }
}
function renderOrders() {
  const wrap = document.getElementById("ordersTableWrap");
  if (ordersCache.length === 0) {
    wrap.innerHTML = `<div class="bg-white border border-outline-variant rounded-xl p-12 text-center"><span class="material-symbols-outlined text-4xl text-outline">receipt_long</span><p class="mt-2 font-semibold">No orders yet</p><p class="text-sm text-on-surface-variant">Orders from checkout will appear here</p></div>`;
    return;
  }
  wrap.innerHTML = ordersCache.map(o => {
    const date = new Date(o.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const statusColor = o.status === "delivered" ? "bg-green-100 text-green-800" : o.status === "shipped" ? "bg-blue-100 text-blue-800" : o.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
    const itemsHtml = o.items.map(it => `
      <div class="flex items-center gap-2 text-sm">
        <img src="${it.image}" class="w-8 h-8 rounded object-cover border border-outline-variant">
        <span class="font-medium">${it.name}</span>
        <span class="text-on-surface-variant">×${it.quantity}</span>
        <span class="ml-auto font-semibold">₹${it.price * it.quantity}</span>
      </div>
    `).join("");
    return `
      <div class="bg-white border border-outline-variant rounded-xl p-4">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <p class="font-bold text-primary">${o.id} <span class="font-normal text-on-surface-variant text-sm">• ${date}</span></p>
            <p class="text-sm text-on-surface-variant">${o.address.fullName} • ${o.address.phone} • ${o.address.district}, ${o.address.state} ${o.address.pincode}</p>
            <p class="text-xs text-on-surface-variant">${o.paymentMethod.toUpperCase()} • ${o.items.length} item(s)</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColor}">${o.status}</span>
            <select onchange="updateOrderStatus('${o.id}', this.value)" class="border border-outline-variant rounded-lg px-2 py-1 text-xs font-semibold bg-white">
              <option value="">Change status</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onclick="deleteOrder('${o.id}')" class="w-8 h-8 rounded-lg hover:bg-red-50 text-error flex items-center justify-center" title="Delete"><span class="material-symbols-outlined text-[18px]">delete</span></button>
          </div>
        </div>
        <div class="bg-surface rounded-lg p-3 space-y-2 mb-3">${itemsHtml}</div>
        <div class="flex justify-between text-sm font-semibold border-t border-outline-variant pt-3">
          <span>Total paid</span><span class="text-primary text-base">₹${o.total} <span class="text-xs font-normal text-on-surface-variant">(${o.subtotal} - ${o.discount} discount + ${o.shipping} ship)</span></span>
        </div>
      </div>
    `;
  }).join("");
}
async function updateOrderStatus(id, status) {
  if (!status) return;
  const res = await fetch(`${API}/orders/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:"Failed"}));
    toast(err.error || "Update failed");
    return;
  }
  toast(`Order ${id} → ${status}`);
  loadOrders();
  loadStats();
}
async function deleteOrder(id) {
  if (!confirm(`Delete order ${id}?`)) return;
  const res = await fetch(`${API}/orders/${encodeURIComponent(id)}`, { method: "DELETE", headers: getHeaders() });
  if (!res.ok) { toast("Delete failed"); return; }
  toast("Order deleted");
  loadOrders();
  loadStats();
}

// close modal on outside click
document.getElementById("productModal").addEventListener("click", (e) => {
  if (e.target.id === "productModal") closeProductModal();
});

// ============================================
// SUPPORT TAB (uses /api/admin/support/* with cookie auth)
// ============================================
const supportAdminState = {
  loggedIn: false,
  me: null,
  chats: [],
  activeChat: null,
  messages: [],
  pollTimer: null
};

async function supportAdminMe() {
  try {
    const r = await fetch(`${API}/admin/support/me`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      supportAdminState.loggedIn = true;
      supportAdminState.me = d.admin;
      return true;
    }
  } catch {}
  supportAdminState.loggedIn = false;
  supportAdminState.me = null;
  return false;
}

function showSupportLogin(show) {
  document.getElementById("supportLoginPanel").classList.toggle("hidden", !show);
  document.getElementById("supportPanel").classList.toggle("hidden", show);
}

async function supportLogin(e) {
  e.preventDefault();
  const user = document.getElementById("supportLoginUser").value.trim();
  const pass = document.getElementById("supportLoginPass").value;
  const errEl = document.getElementById("supportLoginError");
  errEl.classList.add("hidden");
  try {
    const r = await fetch(`${API}/admin/support/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: user, password: pass })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Login failed");
    supportAdminState.loggedIn = true;
    supportAdminState.me = d.admin;
    showSupportLogin(false);
    await loadSupportChats();
    startSupportAdminPolling();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

async function supportLogout() {
  try { await fetch(`${API}/admin/support/logout`, { method: "POST", credentials: "include" }); } catch {}
  stopSupportAdminPolling();
  supportAdminState.loggedIn = false;
  supportAdminState.me = null;
  supportAdminState.chats = [];
  supportAdminState.activeChat = null;
  showSupportLogin(true);
}

async function loadSupportChats() {
  if (!supportAdminState.loggedIn) return;
  const filter = document.getElementById("supportStatusFilter")?.value || "open";
  const list = document.getElementById("supportChatList");
  try {
    const r = await fetch(`${API}/admin/support/chats?status=${filter}`, { credentials: "include" });
    if (!r.ok) {
      if (r.status === 401) { showSupportLogin(true); return; }
      throw new Error("Failed to load chats");
    }
    supportAdminState.chats = await r.json();
    renderSupportChatList();
    updateSupportBadge();
  } catch (e) {
    list.innerHTML = `<div class="p-4 text-center text-error text-sm">${escapeHtml(e.message)}</div>`;
  }
}

function renderSupportChatList() {
  const list = document.getElementById("supportChatList");
  const chats = supportAdminState.chats;
  if (chats.length === 0) {
    list.innerHTML = `<div class="p-4 text-center text-on-surface-variant text-sm">No conversations</div>`;
    return;
  }
  list.innerHTML = chats.map(c => {
    const isActive = supportAdminState.activeChat?.id === c.id;
    const time = c.last_message_at ? new Date(c.last_message_at) : new Date(c.created_at);
    const ago = timeAgo(time);
    const unread = c.unread_for_admin || 0;
    const statusColor = c.status === "closed" ? "text-on-surface-variant" : "text-primary";
    return `
      <button onclick="openSupportChat(${c.id})" class="w-full text-left p-3 border-b border-outline-variant hover:bg-surface-variant transition-colors flex items-start gap-3 ${isActive ? "bg-primary-container/30" : ""}">
        <div class="h-10 w-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined">account_circle</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-sm ${statusColor} truncate flex-1">${escapeHtml(c.user_name || c.user_email)}</p>
            ${unread > 0 ? `<span class="bg-error text-on-error text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">${unread}</span>` : ""}
          </div>
          <p class="text-xs text-on-surface-variant truncate">${escapeHtml(c.last_message_preview || c.subject || "")}</p>
          <p class="text-[10px] text-on-surface-variant mt-0.5">${ago} • ${c.status}</p>
        </div>
      </button>
    `;
  }).join("");
}

async function openSupportChat(chatId) {
  const c = supportAdminState.chats.find(x => x.id === chatId);
  if (!c) return;
  supportAdminState.activeChat = c;
  c.unread_for_admin = 0;
  renderSupportChatList();
  updateSupportBadge();
  await loadSupportMessages(chatId);
  renderSupportChatDetail();
  // Start polling this chat
  startSupportAdminPolling();
}

async function loadSupportMessages(chatId) {
  try {
    const r = await fetch(`${API}/admin/support/chat/${chatId}/messages`, { credentials: "include" });
    if (!r.ok) throw new Error("Failed to load messages");
    supportAdminState.messages = await r.json();
  } catch (e) {
    supportAdminState.messages = [];
    console.warn("loadSupportMessages:", e.message);
  }
}

// Admin: load pending cancellation requests
async function loadPendingCancellations() {
  try {
    const r = await fetch(`${API}/admin/cancellations`, { credentials: "include" });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function renderPendingCancellationsBadge() {
  const c = await loadPendingCancellations();
  const btn = document.getElementById("cancelBadgeBtn");
  if (btn) {
    btn.textContent = c.length;
    btn.classList.toggle("hidden", c.length === 0);
  }
}

function showPendingCancellationsModal() {
  const existing = document.getElementById("cancelRequestsModal");
  if (existing) { existing.remove(); return; }
  const div = document.createElement("div");
  div.id = "cancelRequestsModal";
  div.className = "fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4";
  div.onclick = (e) => { if (e.target === div) div.remove(); };
  div.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-error flex items-center gap-2">
          <span class="material-symbols-outlined">pending_actions</span>
          Pending Cancellation Requests
        </h3>
        <button onclick="document.getElementById('cancelRequestsModal').remove()" class="text-on-surface-variant hover:text-on-surface">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div id="cancelRequestsList"><p class="text-on-surface-variant text-center py-4">Loading...</p></div>
    </div>
  `;
  document.body.appendChild(div);
  loadPendingCancellationsIntoModal();
}

async function loadPendingCancellationsIntoModal() {
  const wrap = document.getElementById("cancelRequestsList");
  if (!wrap) return;
  const items = await loadPendingCancellations();
  if (items.length === 0) {
    wrap.innerHTML = `<p class="text-on-surface-variant text-center py-4">No pending requests</p>`;
    return;
  }
  wrap.innerHTML = items.map(o => `
    <div class="border border-outline-variant rounded-lg p-4 mb-3">
      <div class="flex items-center justify-between mb-2">
        <div>
          <p class="font-mono text-sm font-bold">${escapeHtml(o.id)}</p>
          <p class="text-xs text-on-surface-variant">${escapeHtml(o.user_name || o.email)} • ₹${o.total}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning font-semibold">${escapeHtml(o.status)}</span>
      </div>
      <p class="text-sm bg-surface-container-low p-2 rounded mb-2 italic">"${escapeHtml(o.cancellation_reason || "")}"</p>
      <p class="text-xs text-on-surface-variant mb-3">Requested ${timeAgo(new Date(o.cancellation_requested_at))}</p>
      <div class="flex gap-2">
        <button onclick="resolveCancel('${escapeHtml(o.id)}', true)" class="flex-1 bg-error text-on-error py-2 rounded-lg font-semibold text-sm hover:opacity-90">Approve Cancellation</button>
        <button onclick="resolveCancel('${escapeHtml(o.id)}', false)" class="flex-1 border border-outline-variant text-on-surface-variant py-2 rounded-lg font-semibold text-sm hover:bg-surface-variant">Reject</button>
      </div>
    </div>
  `).join("");
}

async function resolveCancel(orderId, approve) {
  try {
    const r = await fetch(`${API}/admin/orders/${encodeURIComponent(orderId)}/resolve-cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getHeaders() },
      credentials: "include",
      body: JSON.stringify({ approve })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Failed");
    toast(approve ? "Order cancelled" : "Cancellation rejected");
    await loadPendingCancellationsIntoModal();
    renderPendingCancellationsBadge();
  } catch (e) { toast("Failed: " + e.message); }
}

function renderSupportChatDetail() {
  const detail = document.getElementById("supportChatDetail");
  const c = supportAdminState.activeChat;
  if (!c) {
    detail.innerHTML = `<div class="flex-1 flex items-center justify-center text-on-surface-variant">
      <div class="text-center">
        <span class="material-symbols-outlined text-5xl mb-2">forum</span>
        <p>Select a conversation to start replying</p>
      </div>
    </div>`;
    return;
  }
  const status = c.status === "closed" ? "Closed" : "Open";
  const statusClass = c.status === "closed" ? "bg-surface-container text-on-surface-variant" : "bg-primary text-on-primary";
  detail.innerHTML = `
    <div class="p-3 border-b border-outline-variant flex items-center gap-3 shrink-0">
      <div class="h-9 w-9 rounded-full bg-primary-container text-primary flex items-center justify-center">
        <span class="material-symbols-outlined">account_circle</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate">${escapeHtml(c.user_name || c.user_email)}</p>
        <p class="text-xs text-on-surface-variant truncate">${escapeHtml(c.user_email)} • ${escapeHtml(c.subject || "")}</p>
      </div>
      <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${statusClass}">${status}</span>
      <button onclick="openUserContext('${c.user_email.replace(/'/g, "\\'")}')" class="text-on-surface-variant hover:text-primary p-2 rounded-lg hover:bg-surface-variant" title="View user context">
        <span class="material-symbols-outlined text-[20px]">person_search</span>
      </button>
      ${c.status !== "closed" ? `<button onclick="closeSupportChat(${c.id})" class="text-error hover:bg-error-container p-2 rounded-lg" title="Close chat">
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>` : ""}
    </div>
    <div id="supportMessagesList" class="flex-1 overflow-y-auto p-4 space-y-2 bg-surface-container-lowest">
      ${renderSupportMessages()}
    </div>
    ${c.status !== "closed" ? `
    <form onsubmit="sendSupportAdminMessage(event)" class="p-3 border-t border-outline-variant flex gap-2 items-end shrink-0">
      <textarea id="supportAdminInput" rows="1" placeholder="Type your reply..." oninput="autoGrowSupportInput(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendSupportAdminMessage(event);}" class="flex-1 resize-none max-h-32 border border-outline-variant rounded-2xl px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" style="min-height: 40px;"></textarea>
      <button type="submit" class="h-10 w-10 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90">
        <span class="material-symbols-outlined">send</span>
      </button>
    </form>` : `<div class="p-3 border-t border-outline-variant text-center text-sm text-on-surface-variant bg-surface-container">This conversation is closed.</div>`}
  `;
  setTimeout(() => {
    const el = document.getElementById("supportMessagesList");
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

function renderSupportMessages() {
  if (supportAdminState.messages.length === 0) {
    return `<div class="text-center text-sm text-on-surface-variant py-4">No messages yet</div>`;
  }
  return supportAdminState.messages.map(m => {
    const isAdmin = m.sender_type === "admin";
    const isSystem = m.sender_type === "system";
    if (isSystem) {
      return `<div class="text-center text-xs text-on-surface-variant italic py-2 px-3 bg-surface-container rounded-lg">${escapeHtml(m.message)}</div>`;
    }
    return `
      <div class="flex ${isAdmin ? "justify-end" : "justify-start"}">
        <div class="max-w-[80%] ${isAdmin ? "bg-primary text-on-primary" : "bg-white border border-outline-variant"} rounded-2xl px-3 py-2 ${isAdmin ? "rounded-br-sm" : "rounded-bl-sm"}">
          <p class="text-[10px] font-semibold mb-0.5 ${isAdmin ? "text-on-primary/70" : "text-on-surface-variant"}">${escapeHtml(m.sender_name || m.sender_type)}</p>
          <p class="text-sm whitespace-pre-wrap break-words">${escapeHtml(m.message)}</p>
          <p class="text-[10px] mt-1 ${isAdmin ? "text-on-primary/70" : "text-on-surface-variant"}">${new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
        </div>
      </div>
    `;
  }).join("");
}

async function sendSupportAdminMessage(e) {
  e.preventDefault();
  if (!supportAdminState.activeChat) return;
  const input = document.getElementById("supportAdminInput");
  const msg = input.value.trim();
  if (!msg) return;
  // Optimistic
  const tempMsg = { id: "temp-" + Date.now(), sender_type: "admin", sender_name: supportAdminState.me?.name || "Admin", message: msg, created_at: new Date().toISOString() };
  supportAdminState.messages.push(tempMsg);
  input.value = "";
  input.style.height = "40px";
  const list = document.getElementById("supportMessagesList");
  if (list) { list.innerHTML = renderSupportMessages(); list.scrollTop = 999999; }
  try {
    const r = await fetch(`${API}/admin/support/chat/${supportAdminState.activeChat.id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: msg })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Send failed");
    // Replace temp
    const idx = supportAdminState.messages.findIndex(m => m.id === tempMsg.id);
    if (idx !== -1) supportAdminState.messages[idx] = d.message;
    if (list) { list.innerHTML = renderSupportMessages(); list.scrollTop = 999999; }
  } catch (e) {
    toast(`Send failed: ${e.message}`);
  }
}

async function closeSupportChat(chatId) {
  if (!confirm("Close this conversation?")) return;
  try {
    const r = await fetch(`${API}/admin/support/chat/${chatId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    if (!r.ok) throw new Error("Failed to close");
    toast("Conversation closed");
    await loadSupportChats();
    supportAdminState.activeChat = null;
    renderSupportChatDetail();
  } catch (e) {
    toast(e.message);
  }
}

async function openUserContext(email) {
  // Simple modal: fetch user info + recent orders
  try {
    const [u, orders] = await Promise.all([
      fetch(`${API}/admin/support/user/${encodeURIComponent(email)}`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/orders`, { credentials: "include" }).then(r => r.json()).catch(() => [])
    ]);
    const myOrders = (orders || []).filter(o => (o.email || "").toLowerCase() === email.toLowerCase());
    const html = `
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this) closeUserContext()">
        <div class="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-lg text-primary">User Context</h3>
            <button onclick="closeUserContext()" class="text-on-surface-variant hover:text-on-surface">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="space-y-3">
            <div class="bg-surface-container-low rounded-lg p-3">
              <p class="text-xs text-on-surface-variant">Name</p>
              <p class="font-semibold">${escapeHtml(u.user?.name || "—")}</p>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <p class="text-xs text-on-surface-variant">Email</p>
              <p class="font-mono text-sm">${escapeHtml(u.user?.email || email)}</p>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <p class="text-xs text-on-surface-variant">Joined</p>
              <p>${u.user?.created_at ? new Date(u.user.created_at).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p class="text-sm font-semibold mb-2">Recent orders (${myOrders.length})</p>
              ${myOrders.length === 0 ? `<p class="text-sm text-on-surface-variant">No orders found via your admin session</p>` : myOrders.slice(0, 5).map(o => `
                <div class="border border-outline-variant rounded-lg p-2 mb-2 text-sm">
                  <p class="font-mono text-xs">${escapeHtml(o.id)}</p>
                  <p class="text-xs">${new Date(o.date || o.created_at).toLocaleDateString()} • ₹${o.total} • ${o.status}</p>
                </div>
              `).join("")}
            </div>
            <div class="border-t border-outline-variant pt-3 space-y-2">
              <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Admin Actions</p>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="adminChangeEmailPrompt('${escapeHtml(email).replace(/'/g, "&#39;")}')" class="text-sm border border-outline-variant px-3 py-2 rounded-lg hover:border-primary flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">mark_email_read</span> Change Email
                </button>
                <button onclick="adminResetPasswordPrompt('${escapeHtml(email).replace(/'/g, "&#39;")}')" class="text-sm border border-outline-variant px-3 py-2 rounded-lg hover:border-error flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">lock_reset</span> Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement("div");
    div.id = "userContextModal";
    div.innerHTML = html;
    document.body.appendChild(div);
  } catch (e) {
    toast("Failed to load user context: " + e.message);
  }
}

async function adminChangeEmailPrompt(oldEmail) {
  const newEmail = prompt(`Change email for ${oldEmail}\n\nNew email:`, oldEmail);
  if (!newEmail || newEmail === oldEmail) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    toast("Invalid email format");
    return;
  }
  if (!confirm(`Change email from ${oldEmail} to ${newEmail}?`)) return;
  try {
    const r = await fetch(`${API}/admin/support/user/${encodeURIComponent(oldEmail)}/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getHeaders() },
      credentials: "include",
      body: JSON.stringify({ newEmail: newEmail.toLowerCase() })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Failed");
    toast("Email changed to " + newEmail);
    closeUserContext();
  } catch (e) { toast("Error: " + e.message); }
}

async function adminResetPasswordPrompt(email) {
  const newPw = prompt(`Reset password for ${email}\n\nNew password (min 8 chars):`, "");
  if (!newPw || newPw.length < 8) { toast("Password too short"); return; }
  if (!confirm(`Reset password for ${email}? They will be logged out.`)) return;
  try {
    const r = await fetch(`${API}/admin/support/user/${encodeURIComponent(email)}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getHeaders() },
      credentials: "include",
      body: JSON.stringify({ newPassword: newPw })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Failed");
    toast("Password reset. User will need to log in again.");
  } catch (e) { toast("Error: " + e.message); }
}

function closeUserContext() {
  const m = document.getElementById("userContextModal");
  if (m) m.remove();
}

function startSupportAdminPolling() {
  stopSupportAdminPolling();
  supportAdminState.pollTimer = setInterval(async () => {
    if (!supportAdminState.loggedIn) return;
    // Refresh chat list (for unread counts)
    const filter = document.getElementById("supportStatusFilter")?.value || "open";
    try {
      const r = await fetch(`${API}/admin/support/chats?status=${filter}`, { credentials: "include" });
      if (r.ok) {
        const newChats = await r.json();
        const oldTotalUnread = supportAdminState.chats.reduce((s, c) => s + (c.unread_for_admin || 0), 0);
        supportAdminState.chats = newChats;
        const newTotalUnread = newChats.reduce((s, c) => s + (c.unread_for_admin || 0), 0);
        if (newTotalUnread > oldTotalUnread) toast(`${newTotalUnread - oldTotalUnread} new message(s)`);
        renderSupportChatList();
        updateSupportBadge();
      }
    } catch {}
    // Refresh active chat messages
    if (supportAdminState.activeChat) {
      const before = supportAdminState.messages.length;
      await loadSupportMessages(supportAdminState.activeChat.id);
      const after = supportAdminState.messages.length;
      if (after !== before) {
        const list = document.getElementById("supportMessagesList");
        if (list) { list.innerHTML = renderSupportMessages(); list.scrollTop = 999999; }
      }
    }
  }, 4000);
}
function stopSupportAdminPolling() {
  if (supportAdminState.pollTimer) { clearInterval(supportAdminState.pollTimer); supportAdminState.pollTimer = null; }
}

function updateSupportBadge() {
  const badge = document.getElementById("supportUnreadBadge");
  if (!badge) return;
  const total = supportAdminState.chats.reduce((s, c) => s + (c.unread_for_admin || 0), 0);
  if (total > 0) { badge.textContent = total; badge.classList.remove("hidden"); }
  else { badge.classList.add("hidden"); }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
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

function autoGrowSupportInput(el) {
  el.style.height = "40px";
  el.style.height = Math.min(el.scrollHeight, 128) + "px";
}

// Override switchTab to handle Support tab
const _origSwitchTab = switchTab;
window.switchTab = function(tab) {
  _origSwitchTab(tab);
  if (tab === "support") {
    supportAdminMe().then(ok => {
      if (ok) {
        showSupportLogin(false);
        loadSupportChats();
        startSupportAdminPolling();
      } else {
        showSupportLogin(true);
        stopSupportAdminPolling();
      }
    });
  } else {
    stopSupportAdminPolling();
  }
};
