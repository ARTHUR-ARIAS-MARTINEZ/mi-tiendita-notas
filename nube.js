// ===================================================================
// LA NUBE - el catalogo vive en un solo lugar y llega a todos lados
// ===================================================================
// El catalogo (productos, precios, proveedores, colores) y las existencias
// se guardan en un archivo dentro del propio GitHub de Arthur:
// mi-tiendita-notas/datos-nube.json
//
// Como funciona, en palabras normales:
//   - Sin internet la app trabaja igual que siempre, con lo del celular.
//   - En cuanto hay internet, la app BAJA lo de la nube y lo junta con lo
//     de aqui. Nunca pisa a ciegas: de cada producto se queda el cambio MAS
//     RECIENTE, comparando la hora en que se modifico.
//   - Lo que cambiaste aqui SUBE a la nube, para que se vea en la compu y
//     para que se pueda revisar y corregir desde la computadora.
//
// Para SUBIR hace falta una llave de GitHub, que se pega una sola vez en
// Ajustes. Esa llave se queda guardada NADA MAS en este aparato: nunca va
// dentro del programa publicado, porque entonces cualquiera podria borrar
// los datos (y GitHub la cancelaria al detectarla).
// Para BAJAR no hace falta ninguna llave.

const NUBE = {
  duenio: "ARTHUR-ARIAS-MARTINEZ",
  repo: "mi-tiendita-notas",
  archivo: "datos-nube.json",
  llaveToken: "mte_token_nube",
  llaveEstado: "mte_nube_estado",
};

function nubeToken() {
  try { return (localStorage.getItem(NUBE.llaveToken) || "").trim(); } catch (e) { return ""; }
}
function nubeGuardarToken(t) {
  try { localStorage.setItem(NUBE.llaveToken, String(t || "").trim()); } catch (e) {}
}
function nubeEstado() {
  try { return JSON.parse(localStorage.getItem(NUBE.llaveEstado)) || {}; } catch (e) { return {}; }
}
function nubeGuardarEstado(e) {
  try { localStorage.setItem(NUBE.llaveEstado, JSON.stringify(e)); } catch (er) {}
}

// Reconoce el mismo producto aunque le hayan cambiado el nombre.
function nubeLlave(nombre) {
  const n = String(nombre || "");
  const p = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const claves = ["hdmi", "tiraled", "earpods", "soporteuniversal", "gtide", "l22",
                  "bicicleta", "reloj", "plug35"];
  for (const k of claves) if (p.indexOf(k) !== -1) return k;
  const m = n.toUpperCase().match(/\b[A-Z]{2,}-?\d{2,}\b/g);
  const c = m ? m[m.length - 1] : null;
  const equivalentes = { "CA252": "CAB252", "ST-216": "EZ-165" };
  return c ? (equivalentes[c] || c) : p;
}

const NUBE_API = "https://api.github.com/repos/" + NUBE.duenio + "/" + NUBE.repo +
                 "/contents/" + NUBE.archivo;

async function nubeBajar() {
  const cab = { "Accept": "application/vnd.github+json" };
  const t = nubeToken();
  if (t) cab["Authorization"] = "Bearer " + t;
  const r = await fetch(NUBE_API + "?t=" + Date.now(), { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error("no se pudo leer la nube (" + r.status + ")");
  const j = await r.json();
  const texto = decodeURIComponent(escape(atob(String(j.content).replace(/\n/g, ""))));
  return { datos: JSON.parse(texto), sha: j.sha };
}

async function nubeSubir(datos, sha) {
  const t = nubeToken();
  if (!t) throw new Error("falta la llave para subir");
  const contenido = btoa(unescape(encodeURIComponent(JSON.stringify(datos, null, 1))));
  const r = await fetch(NUBE_API, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + t, "Accept": "application/vnd.github+json",
               "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Cambios desde la app", content: contenido, sha: sha }),
  });
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error("la llave no sirve o caduco");
    if (r.status === 409) throw new Error("alguien mas subio cambios, se reintenta");
    throw new Error("no se pudo subir (" + r.status + ")");
  }
  return true;
}

// Junta lo de la nube con lo de aqui. De cada producto se queda el cambio
// mas reciente. NUNCA se borra nada.
function nubeFusionar(deLaNube) {
  let cambioLocal = false, cambioNube = false;
  const productosNube = Array.isArray(deLaNube.productos) ? deLaNube.productos : [];
  const porLlave = new Map();
  for (const p of productosNube) porLlave.set(nubeLlave(p.nombre), p);

  for (const local of State.catalogo) {
    const k = nubeLlave(local.nombre);
    const remoto = porLlave.get(k);
    if (!remoto) { cambioNube = true; continue; }
    const tLocal = Number(local.mod) || 0, tRemoto = Number(remoto.mod) || 0;
    if (tRemoto > tLocal) {
      local.nombre = remoto.nombre;
      local.precio = remoto.precio;
      local.costo = remoto.costo;
      local.precioUsuario = remoto.precioUsuario;
      local.proveedor = remoto.proveedor || "";
      if (Array.isArray(remoto.colores)) local.colores = remoto.colores.slice();
      local.mod = tRemoto;
      cambioLocal = true;
    } else if (tLocal > tRemoto) cambioNube = true;
    porLlave.delete(k);
  }
  porLlave.forEach(function (remoto) {
    State.catalogo.push({
      id: uid(), nombre: remoto.nombre, precio: remoto.precio, costo: remoto.costo,
      precioUsuario: remoto.precioUsuario, proveedor: remoto.proveedor || "",
      colores: Array.isArray(remoto.colores) ? remoto.colores.slice() : [],
      mod: Number(remoto.mod) || 0,
    });
    cambioLocal = true;
  });

  const exNube = deLaNube.existencias || {};
  const est = nubeEstado();
  const modLocal = est.stockMod || {};
  for (const clave of Object.keys(exNube)) {
    const info = exNube[clave];
    const corte = clave.lastIndexOf("|");
    const kProd = corte === -1 ? clave : clave.slice(0, corte);
    const color = corte === -1 ? "" : clave.slice(corte + 1);
    const p = State.catalogo.find(function (x) { return nubeLlave(x.nombre) === kProd; });
    if (!p) continue;
    const claveLocal = color ? p.id + "|" + color : p.id;
    const tRemoto = Number(info.mod) || 0, tLocal = Number(modLocal[claveLocal]) || 0;
    if (tRemoto > tLocal) {
      State.stock[claveLocal] = Number(info.piezas) || 0;
      modLocal[claveLocal] = tRemoto;
      cambioLocal = true;
    } else if (tLocal > tRemoto) cambioNube = true;
  }
  est.stockMod = modLocal;
  nubeGuardarEstado(est);
  return { cambioLocal: cambioLocal, cambioNube: cambioNube };
}

// Arma lo que se va a subir, con la hora de cada cambio.
function nubeArmarPaquete() {
  const modLocal = nubeEstado().stockMod || {};
  const productos = State.catalogo.map(function (p) {
    const o = { nombre: p.nombre, precio: p.precio, costo: p.costo,
                precioUsuario: p.precioUsuario, proveedor: p.proveedor || "",
                mod: Number(p.mod) || 0 };
    if (Array.isArray(p.colores) && p.colores.length) o.colores = p.colores;
    return o;
  });
  const existencias = {};
  for (const clave of Object.keys(State.stock || {})) {
    const corte = clave.lastIndexOf("|");
    const id = corte === -1 ? clave : clave.slice(0, corte);
    const color = corte === -1 ? "" : clave.slice(corte + 1);
    const p = State.catalogo.find(function (x) { return x.id === id; });
    if (!p) continue;
    const k = nubeLlave(p.nombre) + (color ? "|" + color : "");
    existencias[k] = { piezas: Number(State.stock[clave]) || 0,
                       mod: Number(modLocal[clave]) || 0 };
  }
  return { version: 1, actualizado: new Date().toISOString(),
           quien: "app de Notas de Venta", productos: productos, existencias: existencias };
}

// Se llama cada vez que cambias algo, para saber que es lo mas nuevo.
function nubeMarcarProducto(p) { if (p) p.mod = Date.now(); }
function nubeMarcarStock(clave) {
  const est = nubeEstado();
  est.stockMod = est.stockMod || {};
  est.stockMod[clave] = Date.now();
  est.pendiente = true;
  nubeGuardarEstado(est);
}

let nubeTrabajando = false;
async function nubeSincronizar(silencioso) {
  if (nubeTrabajando) return;
  if (!navigator.onLine) { nubePintarEstado(); return; }
  nubeTrabajando = true;
  nubePintarEstado("sincronizando");
  try {
    const bajado = await nubeBajar();
    const r = nubeFusionar(bajado.datos);
    if (r.cambioLocal) {
      persistCatalogo();
      persistStock();
      if (typeof renderNota === "function") renderNota();
      if (typeof renderVitrina === "function") renderVitrina();
      const aj = document.getElementById("screen-ajustes");
      if (aj && aj.classList.contains("active") && typeof renderAjustes === "function") renderAjustes();
    }
    let subido = false;
    if (r.cambioNube && nubeToken()) {
      await nubeSubir(nubeArmarPaquete(), bajado.sha);
      subido = true;
    }
    const est = nubeEstado();
    est.ultima = Date.now();
    est.pendiente = r.cambioNube && !subido;
    est.error = "";
    nubeGuardarEstado(est);
    if (!silencioso && typeof toast === "function") {
      const partes = [];
      if (r.cambioLocal) partes.push("bajaron cambios");
      if (subido) partes.push("subieron cambios");
      toast(partes.length ? "Nube al dia: " + partes.join(" y ") : "Ya estaba todo al dia.");
    }
  } catch (e) {
    const est = nubeEstado();
    est.error = e.message;
    nubeGuardarEstado(est);
    if (!silencioso && typeof toast === "function") toast("Nube: " + e.message);
  }
  nubeTrabajando = false;
  nubePintarEstado();
}

function nubePintarEstado(trabajando) {
  const caja = document.getElementById("estado-nube");
  if (!caja) return;
  caja.classList.remove("listo", "falta");
  if (trabajando === "sincronizando") { caja.textContent = "Sincronizando..."; return; }
  const est = nubeEstado();
  const partes = [];
  if (!navigator.onLine) {
    partes.push("Sin internet. La app funciona igual; en cuanto haya senal se sincroniza sola.");
    caja.classList.add("falta");
  } else if (est.error) {
    partes.push("No se pudo sincronizar: " + est.error);
    caja.classList.add("falta");
  } else if (est.ultima) {
    const min = Math.round((Date.now() - est.ultima) / 60000);
    partes.push("Al dia" + (min < 1 ? " (hace unos segundos)" : " (hace " + min + " min)") + ".");
    caja.classList.add("listo");
  } else {
    partes.push("Todavia no se ha sincronizado.");
  }
  if (!nubeToken()) partes.push("Falta la llave: puede BAJAR cambios, pero no subirlos.");
  else if (est.pendiente) partes.push("Hay cambios de aqui esperando a subir.");
  caja.textContent = partes.join(" ");
}

// Se sincroniza sola: al abrir, al recuperar internet y cada 10 minutos.
function nubeArrancar() {
  nubePintarEstado();
  if (navigator.onLine) setTimeout(function () { nubeSincronizar(true); }, 2500);
  window.addEventListener("online", function () {
    nubePintarEstado();
    setTimeout(function () { nubeSincronizar(true); }, 1500);
  });
  window.addEventListener("offline", function () { nubePintarEstado(); });
  setInterval(function () { if (navigator.onLine) nubeSincronizar(true); }, 600000);
}
