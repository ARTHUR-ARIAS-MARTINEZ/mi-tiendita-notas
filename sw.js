// Service worker: cachea los archivos de la app para que abra sin internet
// (los datos de clientes/tickets viven en localStorage, no aquí).
const CACHE = "mte-notas-v4";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "printer.js",
  "catalogo-default.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/cart.png",
  "icons/cart-black.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request).then((cached) => {
      const network = fetch(ev.request).then((resp) => {
        if (resp.ok) caches.open(CACHE).then((c) => c.put(ev.request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
