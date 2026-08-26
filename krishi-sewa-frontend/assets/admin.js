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
