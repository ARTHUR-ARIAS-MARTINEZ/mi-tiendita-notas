// Service worker: hace que la app viva COMPLETA dentro del celular.
//
// Estrategia "lo guardado primero" (cache-first), igual que una app nativa:
// una vez instalada, la app NUNCA depende de internet para abrir. Todos sus
// archivos (incluidas las fuentes) se guardan en el celular y se sirven desde
// ahí, al instante, haya o no señal.
//
// ¿Y las actualizaciones? Cuando Arthur pide un cambio y se publica una
// versión nueva, cambia el número de CACHE de abajo. Al abrir la app CON
// internet, el navegador detecta el service worker nuevo, descarga todos los
// archivos de la versión nueva y la app se recarga sola ya actualizada.
// Sin internet, simplemente sigue funcionando con la versión que ya tiene.
const CACHE = "mte-notas-v21";

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "fonts.css",
  "app.js",
  "printer.js",
  "catalogo-default.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192-maskable.png",
  "icons/icon-512-maskable.png",
  "icons/cart.png",
  "icons/cart-black.png",
  // Fuentes incluidas en la app (no se bajan de Google).
  "fonts/inter-400.woff2",
  "fonts/inter-500.woff2",
  "fonts/inter-600.woff2",
  "fonts/inter-700.woff2",
  "fonts/outfit-500.woff2",
  "fonts/outfit-600.woff2",
  "fonts/outfit-700.woff2",
  "fonts/outfit-800.woff2",
];

// Guarda cada archivo por separado: si uno fallara, los demás igual quedan
// guardados (con addAll, un solo error tiraba toda la instalación).
async function precargar() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    ASSETS.map(async (ruta) => {
      try {
        const resp = await fetch(ruta, { cache: "reload" });
        if (resp && resp.ok) await cache.put(ruta, resp);
      } catch (e) {
        // Sin conexión para ese archivo: se intentará más adelante.
      }
    })
  );
}

self.addEventListener("install", (ev) => {
  ev.waitUntil(precargar().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Permite que la página le pida al service worker nuevo tomar control ya.
self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  const url = new URL(ev.request.url);
  if (url.origin !== location.origin) return; // dejar pasar dominios externos

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // 1) Lo guardado primero: respuesta instantánea, funcione o no el internet.
    const guardado = await cache.match(ev.request, { ignoreSearch: true });
    if (guardado) return guardado;

    // 2) No estaba guardado: pedirlo a la red y guardarlo para la próxima.
    try {
      const resp = await fetch(ev.request);
      if (resp && resp.ok) cache.put(ev.request, resp.clone());
      return resp;
    } catch (e) {
      // 3) Sin red: si es una navegación, abrir la app desde lo guardado.
      if (ev.request.mode === "navigate") {
        const home = (await cache.match("index.html")) || (await cache.match("./"));
        if (home) return home;
      }
      throw e;
    }
  })());
});
