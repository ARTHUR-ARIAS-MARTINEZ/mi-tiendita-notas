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
const CACHE = "mte-notas-v38";

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
  "productos-imagenes.js",
  "recuperacion.js",
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
  // Fotos de los productos para la Vitrina (~1.3 MB en total). Van en EXTRAS
  // para que se guarden de una vez y el cliente vea las fotos al instante,
  // aunque estés en una tiendita sin señal. Si alguna falla al bajar, se
  // guarda sola la primera vez que se vea con internet.
  "productos/cab236.webp",
  "productos/cab237.webp",
  "productos/cab238.webp",
  "productos/cab252.webp",
  "productos/cab258.webp",
  "productos/ez165.webp",
  "productos/gar063.webp",
  "productos/gar128.webp",
  "productos/gar148.webp",
  "productos/gar153.webp",
  "productos/gar154.webp",
  "productos/gar161.webp",
  "productos/gar261.webp",
  "productos/aut125.webp",
  "productos/aut205.webp",
  "productos/aut210.webp",
  "productos/ac01.webp",
  "productos/inpods12.webp",
  "productos/earpods.webp",
  "productos/gtide.webp",
  "productos/boc060.webp",
  "productos/boc062.webp",
  "productos/boc241.webp",
  "productos/boc242.webp",
  "productos/boc243.webp",
  "productos/boc244.webp",
  "productos/boc250.webp",
  "productos/sv01.webp",
  "productos/rat001.webp",
  "productos/pj097.webp",
  "productos/tb6323.webp",
  "productos/hdmi3m.webp",
  "productos/tiraled.webp",
  // Fotos de cada color
  "productos/ac01-blanco.webp",
  "productos/ac01-morado.webp",
  "productos/ac01-negro.webp",
  "productos/aut205-blanco.webp",
  "productos/aut205-negro.webp",
  "productos/boc060-negro.webp",
  "productos/boc060-rojo.webp",
  "productos/boc062-negro.webp",
  "productos/boc062-rojo.webp",
  "productos/boc242-negro.webp",
  "productos/boc242-rojo.webp",
  "productos/boc243-negro.webp",
  "productos/boc243-rojo.webp",
  "productos/boc244-negro.webp",
  "productos/boc244-rojo.webp",
  "productos/gtide-azul.webp",
  "productos/gtide-blanco.webp",
  "productos/gtide-morado.webp",
  "productos/gtide-negro.webp",
  "productos/gtide-verde.webp",
  "productos/sv01-azul.webp",
  "productos/sv01-blanco.webp",
  "productos/sv01-negro.webp",
  "productos/sv01-rojo.webp",
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

  // La app pide guardar TODO de una vez, para poder usarse sin internet.
  // Se van guardando uno por uno y se reporta cuántos quedaron y cuáles no.
  if (ev.data && ev.data.type === "GUARDAR_TODO") {
    ev.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const todos = CORE.concat(EXTRAS);
      let guardados = 0;
      const fallaron = [];
      for (const ruta of todos) {
        try {
          const resp = await fetch(ruta, { cache: "reload" });
          if (resp && resp.ok) { await cache.put(ruta, resp); guardados++; }
          else fallaron.push(ruta);
        } catch (e) { fallaron.push(ruta); }
      }
      const enCaja = (await cache.keys()).length;
      const avisar = (c) => c.postMessage({
        type: "GUARDADO", guardados, total: todos.length, enCaja,
        fallaron: fallaron.slice(0, 4), cuantosFallaron: fallaron.length,
      });
      if (ev.source) avisar(ev.source);
      else (await self.clients.matchAll()).forEach(avisar);
    })());
  }
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== location.origin) return; // dejar pasar dominios externos

  // El Cotizador vive en su propia carpeta y trae su propio service worker.
  // Sin esto, cualquier intento de abrirlo devolvería la app de Notas.
  if (url.pathname.includes("/cotizador/")) return;

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
