// Service worker: cachea los archivos de la app para que abra sin internet
// (los datos de clientes/tickets viven en localStorage, no aquí).
//
// Estrategia "red primero": cuando hay internet, siempre se trae la versión
// más nueva de cada archivo (así los cambios se ven de inmediato); si no hay
// internet o la señal está muy lenta, usa la copia guardada en caché.
const CACHE = "mte-notas-v10";
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

// Permite que la página le pida al SW nuevo que tome control de inmediato.
self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "SKIP_WAITING") self.skipWaiting();
});

function fetchConTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then(
      (r) => { clearTimeout(t); resolve(r); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  const url = new URL(ev.request.url);
  // Dejar pasar peticiones a otros dominios (p. ej. las fuentes de Google).
  if (url.origin !== location.origin) return;

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Red primero (con límite de tiempo para no colgarse con mala señal).
      const resp = await fetchConTimeout(ev.request, 4000);
      if (resp && resp.ok) cache.put(ev.request, resp.clone());
      return resp;
    } catch (e) {
      // Sin red (o muy lenta): usar lo guardado.
      const cached = await cache.match(ev.request);
      if (cached) return cached;
      if (ev.request.mode === "navigate") {
        const home = (await cache.match("index.html")) || (await cache.match("./"));
        if (home) return home;
      }
      throw e;
    }
  })());
});
