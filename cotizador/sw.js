// Service worker del Cotizador. Vive en su propia carpeta, así que solo se
// hace cargo de /cotizador/ (la app de Notas tiene el suyo aparte).
// Misma estrategia que la app: lo guardado primero, para que abra sin internet.
const CACHE = "mte-cotizador-v1";

const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192-maskable.png",
  "icons/icon-512-maskable.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(["./", "index.html"]);        // sin esto no abre
    await Promise.all(ARCHIVOS.slice(2).map(async (r) => {
      try { const resp = await fetch(r, { cache: "reload" }); if (resp && resp.ok) await cache.put(r, resp); }
      catch (e) { /* se guardará solo la primera vez que se use */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("mte-cotizador-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const shell = (await cache.match("index.html")) || (await cache.match("./"));
      if (shell) return shell;
      try { return await fetch(req); }
      catch (e) { return new Response("<h1>Abre el Cotizador una vez con internet para instalarlo.</h1>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }); }
    })());
    return;
  }

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    } catch (e) { return new Response("", { status: 503, statusText: "sin conexion" }); }
  })());
});
