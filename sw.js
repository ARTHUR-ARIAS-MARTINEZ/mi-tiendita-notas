// Service worker: hace que la app viva COMPLETA dentro del celular.
//
// Estrategia "lo guardado primero" (cache-first), igual que una app nativa:
// una vez instalada, la app NUNCA depende de internet para abrir. Todos sus
// archivos (incluidas las fuentes) se guardan en el celular y se sirven desde
// ahí, al instante, haya o no señal.
//
// Robustez (por qué a veces fallaba sin internet): antes, si la app se
// actualizaba con señal intermitente, podía guardar archivos "a medias" y aun
// así borrar la versión vieja que sí servía. Ahora los archivos ESENCIALES se
// guardan con addAll (todos o falla la instalación, y se queda la versión
// anterior funcionando) y solo DESPUÉS se borra la versión vieja.
const CACHE = "mte-notas-v26";

// Sin estos la app no abre: si alguno no se puede guardar (mala señal al
// instalar), la instalación falla a propósito y NO se rompe la versión previa.
const CORE = [
  "./",
  "index.html",
  "style.css",
  "fonts.css",
  "app.js",
  "printer.js",
  "catalogo-default.js",
  "manifest.json",
];

// Extras (íconos y fuentes): mejoran la app, pero si uno falla no pasa nada.
const EXTRAS = [
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192-maskable.png",
  "icons/icon-512-maskable.png",
  "icons/cart.png",
  "icons/cart-black.png",
  "fonts/inter-400.woff2",
  "fonts/inter-500.woff2",
  "fonts/inter-600.woff2",
  "fonts/inter-700.woff2",
  "fonts/outfit-500.woff2",
  "fonts/outfit-600.woff2",
  "fonts/outfit-700.woff2",
  "fonts/outfit-800.woff2",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Esenciales: TODOS o falla (así nunca queda una instalación incompleta).
    await cache.addAll(CORE);
    // Extras: mejor esfuerzo, uno por uno (un fallo no tira la instalación).
    await Promise.all(EXTRAS.map(async (ruta) => {
      try {
        const resp = await fetch(ruta, { cache: "reload" });
        if (resp && resp.ok) await cache.put(ruta, resp);
      } catch (e) { /* se intentará solo cuando se use */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil((async () => {
    // Solo llegamos aquí si la instalación (con los esenciales) tuvo éxito,
    // así que ya es seguro borrar las versiones viejas.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Permite que la página le pida al service worker nuevo tomar control ya.
self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== location.origin) return; // dejar pasar dominios externos

  // ABRIR LA APP (navegación): SIEMPRE se devuelve el index.html guardado,
  // sin importar la URL exacta ni si hay internet. Esta es la clave para que
  // la app abra siempre, aunque la señal esté intermitente o nula.
  if (req.mode === "navigate") {
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const shell = (await cache.match("index.html")) || (await cache.match("./"));
      if (shell) return shell;
      // Primera vez (aún sin caché): intentar red; si no hay, avisar sin colgar.
      try { return await fetch(req); }
      catch (e) { return new Response("<h1>Abre la app una vez con internet para instalarla.</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }); }
    })());
    return;
  }

  // Otros archivos (css, js, fuentes, íconos): lo guardado primero.
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    // No estaba: pedirlo a la red y guardarlo para la próxima.
    try {
      const resp = await fetch(req);
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    } catch (e) {
      // Sin red y sin copia: responder vacío en vez de colgar la app.
      return new Response("", { status: 503, statusText: "sin conexion" });
    }
  })());
});
