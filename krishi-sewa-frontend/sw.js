// Krishi Sewa Service Worker - basic cache-first for static assets
const CACHE = "krishi-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/assets/app.js",
  "/assets/admin.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Don't cache API requests - always go to network
  if (url.pathname.startsWith("/api/")) return;
  // Cache-first for static assets
  if (e.request.method === "GET" && (url.origin === self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return (
          cached ||
          fetch(e.request)
            .then((res) => {
              if (res.ok && (url.pathname.startsWith("/assets/") || url.pathname === "/" || url.pathname.endsWith(".html"))) {
                const clone = res.clone();
                caches.open(CACHE).then((cache) => cache.put(e.request, clone));
              }
              return res;
            })
            .catch(() => cached)
        );
      })
    );
  }
});
