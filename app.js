// ===================================================================
// Notas de Venta — Mi Tiendita Express
// App 100% local: todos los datos (clientes, tickets, catálogo) se
// guardan únicamente en este celular (localStorage). Nada se envía
// a ningún servidor — por eso no hay nada que "hackear" en línea.
// ===================================================================

// Versión visible de la app (para confirmar que llegó la última actualización).
// Súbela cada vez que se despliega un cambio, junto con CACHE en sw.js.
const APP_VERSION = "v19 · 21 jul 2026";

const STORE_KEYS = {
  negocio: "mte_negocio",
  catalogo: "mte_catalogo",
  clientes: "mte_clientes",
  tickets: "mte_tickets",
  folioSeq: "mte_folio_seq",
  pinHash: "mte_pin_hash",
  pinEnabled: "mte_pin_enabled",
};

const DEFAULT_NEGOCIO = {
  nombre: "Mi Tiendita Expres",
  whatsapp: "449 185 5081",
  slogan: "Compra Directo, Paga Menos",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fmtMoney(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }

// ---------- Estado de la app ----------

const State = {
  negocio: loadJSON(STORE_KEYS.negocio, DEFAULT_NEGOCIO),
  catalogo: loadJSON(STORE_KEYS.catalogo, null),
  clientes: loadJSON(STORE_KEYS.clientes, []),
  tickets: loadJSON(STORE_KEYS.tickets, []),
  cart: [], // { id, nombre, precio, cantidad }
  clienteSeleccionado: null, // id de cliente o null
  clienteNombreLibre: "",
};

// ---------- Blindaje de los datos guardados ----------
// Si un respaldo importado o un dato corrupto dejaba el catálogo en mal estado
// (un producto sin nombre, o algo que no es una lista), la app se quedaba SIN
// productos y no se podía vender, sin manera de arreglarlo desde la app.
// Aquí se REPARA en vez de fallar: nunca se descarta información utilizable.

function catalogoDeFabrica() {
  return CATALOGO_DEFAULT.map(p => ({
    id: uid(), nombre: p.nombre, precio: p.precio,
    costo: p.costo ?? null, precioUsuario: p.precioUsuario ?? null,
  }));
}

// El costo puede no estar capturado todavía: en ese caso vale null (no 0, para
// no inflar la utilidad en los reportes).
function normalizarCosto(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// Devuelve { lista, reparado } o null si el valor ni siquiera es una lista.
function sanearCatalogo(valor) {
  if (!Array.isArray(valor)) return null;
  let reparado = false;
  const lista = valor.map(p => {
    const item = (p && typeof p === "object") ? p : {};
    const nombre = (typeof item.nombre === "string" && item.nombre.trim())
      ? item.nombre : "Producto sin nombre";
    const precioNum = Number(item.precio);
    const precio = Number.isFinite(precioNum) ? precioNum : 0;
    const id = (typeof item.id === "string" && item.id) ? item.id : uid();
    const costo = normalizarCosto(item.costo);
    const precioUsuario = normalizarCosto(item.precioUsuario);
    if (nombre !== item.nombre || precio !== item.precio || id !== item.id
        || costo !== (item.costo ?? null) || precioUsuario !== (item.precioUsuario ?? null)) reparado = true;
    return { ...item, id, nombre, precio, costo, precioUsuario };
  });
  return { lista, reparado };
}

if (!State.catalogo) {
  State.catalogo = catalogoDeFabrica();
  saveJSON(STORE_KEYS.catalogo, State.catalogo);
} else {
  const saneado = sanearCatalogo(State.catalogo);
  if (!saneado) {
    // Lo guardado no es una lista de productos: usar el catálogo de fábrica
    // en memoria para que la app siga sirviendo. No se sobrescribe lo guardado,
    // por si se pudiera recuperar a mano desde un respaldo.
    State.catalogo = catalogoDeFabrica();
  } else {
    State.catalogo = saneado.lista;
    // Solo se guarda si de verdad hubo algo que reparar, para que el arreglo
    // quede fijo y el producto se pueda corregir desde Ajustes.
    if (saneado.reparado) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
}

// Clientes y notas deben ser listas. Si no lo son, se usa una lista vacía en
// memoria (no se guarda) para que las pantallas no truenen.
if (!Array.isArray(State.clientes)) State.clientes = [];
if (!Array.isArray(State.tickets)) State.tickets = [];

// Los datos del negocio deben ser un objeto (los usa el ticket impreso).
if (!State.negocio || typeof State.negocio !== "object" || Array.isArray(State.negocio)) {
  State.negocio = { ...DEFAULT_NEGOCIO };
}

// Migración: corregir ortografía anterior en datos ya guardados en el celular,
// sin tocar nada más que el usuario haya personalizado.
(function migrarNegocio() {
  let cambió = false;
  if (State.negocio.nombre === "Mi Tiendita Express") { State.negocio.nombre = "Mi Tiendita Expres"; cambió = true; }
  if (State.negocio.slogan === "Compra Directo y Paga Menos") { State.negocio.slogan = "Compra Directo, Paga Menos"; cambió = true; }
  if (cambió) saveJSON(STORE_KEYS.negocio, State.negocio);
})();

// Migración: corrige el código del Audífono Buytiti (ST-216 -> EZ-165) y el
// precio del Audífonos Clip On G-TIDE ($220 -> $250) en catálogos ya
// guardados en el celular. Se ejecuta una sola vez.
// (Debe correr ANTES de "agregarProductosFaltantes": si un celular nunca
// abrió la app desde antes de este cambio, renombra primero para que esa
// migración no piense que "Audífono Buytiti EZ-165" es un producto nuevo
// y lo duplique.)
(function corregirBuytitiYGTide() {
  const FLAG = "mte_migr_catalogo_2026_07b";
  if (localStorage.getItem(FLAG)) return;
  if (State.catalogo) {
    let cambió = false;
    for (const p of State.catalogo) {
      if (p.nombre.trim().toLowerCase() === "audífono buytiti st-216") {
        p.nombre = "Audífono Buytiti EZ-165";
        cambió = true;
      } else if (p.nombre.trim().toLowerCase() === "audífonos clip on (g-tide)" && p.precio === 220) {
        p.precio = 250;
        cambió = true;
      }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: renombra "Cargador Carga Lenta 1 Amp GAR063" a
// "Cargador de Carga Media 2 Amp GAR063" en catálogos ya guardados en el
// celular. Se ejecuta una sola vez. (También debe correr antes de
// "agregarProductosFaltantes", por la misma razón que la de arriba.)
(function renombrarCargadorGAR063() {
  const FLAG = "mte_migr_catalogo_2026_07c";
  if (localStorage.getItem(FLAG)) return;
  if (State.catalogo) {
    let cambió = false;
    for (const p of State.catalogo) {
      if (p.nombre.trim().toLowerCase() === "cargador carga lenta 1 amp gar063") {
        p.nombre = "Cargador de Carga Media 2 Amp GAR063";
        cambió = true;
      }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: agrega al catálogo ya guardado en el celular los productos nuevos
// del catálogo por defecto que aún no existan (comparando por nombre), sin
// modificar ni duplicar los que ya estén. Se ejecuta una sola vez.
(function agregarProductosFaltantes() {
  const FLAG = "mte_migr_catalogo_2026_07";
  if (localStorage.getItem(FLAG)) return;
  if (State.catalogo) {
    const existentes = new Set(State.catalogo.map(p => p.nombre.trim().toLowerCase()));
    let cambió = false;
    for (const p of CATALOGO_DEFAULT) {
      if (!existentes.has(p.nombre.trim().toLowerCase())) {
        State.catalogo.push({ id: uid(), nombre: p.nombre, precio: p.precio });
        cambió = true;
      }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: quita del catálogo guardado los productos con NOMBRE repetido,
// dejando solo el primero. Corrige el caso en que una versión anterior de la
// app duplicó "Audífono Buytiti EZ-165" (por haber renombrado y agregado
// productos en el orden equivocado). Corre AL FINAL, después de los renombres,
// para que los nombres ya normalizados se comparen bien. Se ejecuta una sola vez.
(function quitarProductosDuplicados() {
  const FLAG = "mte_migr_catalogo_2026_07d";
  if (localStorage.getItem(FLAG)) return;
  if (State.catalogo) {
    const vistos = new Set();
    const sinDuplicados = [];
    for (const p of State.catalogo) {
      const clave = p.nombre.trim().toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      sinDuplicados.push(p);
    }
    if (sinDuplicados.length !== State.catalogo.length) {
      State.catalogo = sinDuplicados;
      saveJSON(STORE_KEYS.catalogo, State.catalogo);
    }
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: agrega el COSTO a los productos del catálogo guardado, tomándolo
// del catálogo de fábrica (que a su vez viene de tu Bitácora de Ventas).
// Solo rellena los que aún no tienen costo capturado: nunca pisa un costo que
// tú ya hayas escrito, ni toca los precios. Se ejecuta una sola vez.
(function agregarCostosAlCatalogo() {
  const FLAG = "mte_migr_catalogo_2026_07e";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    const costosPorNombre = new Map(
      CATALOGO_DEFAULT
        .filter(p => p.costo !== null && p.costo !== undefined)
        .map(p => [p.nombre.trim().toLowerCase(), p.costo])
    );
    let cambió = false;
    for (const p of State.catalogo) {
      if (normalizarCosto(p.costo) !== null) continue; // ya tiene costo: respetarlo
      const costo = costosPorNombre.get(String(p.nombre || "").trim().toLowerCase());
      if (costo !== undefined) { p.costo = costo; cambió = true; }
      else if (p.costo === undefined) { p.costo = null; cambió = true; }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: corrige costos que se habían cargado con un valor viejo y captura
// los dos que faltaban, según la lista de costos actualizada.
// Solo cambia el costo si sigue teniendo el valor viejo (o está vacío): si tú
// ya lo editaste a mano, se respeta tu valor. Se ejecuta una sola vez.
(function corregirCostos() {
  const FLAG = "mte_migr_catalogo_2026_07f";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    // nombre -> [costo viejo que se puede pisar, costo correcto]
    const correcciones = new Map([
      ["audífono buytiti ez-165", [6, 7]],
      ["cargador de carga media 2 amp gar063", [13, 15]],
      ["audífonos clip on (g-tide)", [122, 118]],
      ["bocina inalámbrica para bicicleta (min. 5 pz)", [null, 122]],
      ["audífonos deportivos (min. 5 pz) ac01", [null, 99]],
    ]);
    let cambió = false;
    for (const p of State.catalogo) {
      const corr = correcciones.get(String(p.nombre || "").trim().toLowerCase());
      if (!corr) continue;
      const [viejo, nuevo] = corr;
      const actual = normalizarCosto(p.costo);
      if (actual === null || actual === viejo) { p.costo = nuevo; cambió = true; }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: carga el "Precio Usuario" (precio de etiqueta para el consumidor
// final) en los productos ya guardados, y agrega los productos nuevos del
// catálogo de fábrica que aún no existan. Respeta lo que tú hayas capturado:
// solo rellena el precio de usuario si está vacío. Se ejecuta una sola vez.
(function agregarPrecioUsuarioYProductosNuevos() {
  const FLAG = "mte_migr_catalogo_2026_07g";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    const porNombre = new Map(
      CATALOGO_DEFAULT.map(p => [p.nombre.trim().toLowerCase(), p])
    );
    let cambió = false;

    // 1) Precio de usuario en los que ya están.
    for (const p of State.catalogo) {
      if (normalizarCosto(p.precioUsuario) !== null) continue; // ya capturado: respetar
      const ref = porNombre.get(String(p.nombre || "").trim().toLowerCase());
      const nuevo = ref ? (ref.precioUsuario ?? null) : null;
      if (nuevo !== null) { p.precioUsuario = nuevo; cambió = true; }
      else if (p.precioUsuario === undefined) { p.precioUsuario = null; cambió = true; }
    }

    // 2) Productos nuevos que aún no estén en el catálogo del celular.
    const existentes = new Set(State.catalogo.map(p => String(p.nombre || "").trim().toLowerCase()));
    for (const p of CATALOGO_DEFAULT) {
      if (existentes.has(p.nombre.trim().toLowerCase())) continue;
      State.catalogo.push({
        id: uid(), nombre: p.nombre, precio: p.precio,
        costo: p.costo ?? null, precioUsuario: p.precioUsuario ?? null,
      });
      cambió = true;
    }

    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: sube el Cargador de Carga Media 2 Amp GAR063 de $35 a $40
// (precio usuario $50 -> $55). El producto pasó de 1 Amp a 2 Amp y su costo
// subió a $15, así que a $35 era el de menor utilidad de su gama.
// Solo cambia si sigue en el precio viejo: si tú ya lo ajustaste, se respeta.
(function subirPrecioGAR063() {
  const FLAG = "mte_migr_catalogo_2026_07h";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    let cambió = false;
    for (const p of State.catalogo) {
      if (String(p.nombre || "").trim().toLowerCase() !== "cargador de carga media 2 amp gar063") continue;
      if (Number(p.precio) === 35) { p.precio = 40; cambió = true; }
      if (normalizarCosto(p.precioUsuario) === 50) { p.precioUsuario = 55; cambió = true; }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: aplica la lista de precios revisada (julio 2026) tras el análisis
// de márgenes y el cotejo con los precios de mercado.
// Cada renglón es [nombre, precio viejo, precio nuevo, usuario viejo, usuario nuevo].
// Solo cambia si el producto sigue EXACTAMENTE en el precio viejo: si tú ya lo
// ajustaste a otra cosa, se respeta tu valor. Se ejecuta una sola vez.
(function aplicarPreciosRevisados() {
  const FLAG = "mte_migr_precios_2026_07i";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    const tabla = new Map([
      ["power bank con cables 5000 mah gar261", [160, 190, 195, 245]],
      ["mouse inalámbrico rat001", [96, 105, 120, 135]],
      ["tira led de 5 mts", [105, 125, 130, 160]],
      ["bocina boc060", [250, 255, 300, 310]],
      ["bocina boc062", [180, 210, 216, 275]],
      ["bocina boc241", [350, 400, 420, 510]],
      ["bocina boc242", [260, 300, 312, 390]],
      ["bocina boc243", [210, 215, 252, 260]],
      ["bocina boc244", [220, 260, 264, 340]],
      ["bocina boc250", [520, 600, 624, 780]],
      ["audífonos earpods (para iphone)", [60, 70, 80, 90]],
      ["audífonos (para t.c.) aut125", [60, 70, 80, 90]],
    ]);
    let cambió = false;
    for (const p of State.catalogo) {
      const fila = tabla.get(String(p.nombre || "").trim().toLowerCase());
      if (!fila) continue;
      const [precioViejo, precioNuevo, usuarioViejo, usuarioNuevo] = fila;
      if (Number(p.precio) === precioViejo) { p.precio = precioNuevo; cambió = true; }
      if (normalizarCosto(p.precioUsuario) === usuarioViejo) { p.precioUsuario = usuarioNuevo; cambió = true; }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Migración: baja TEMPORALMENTE el Cargador de Carga Media 2 Amp GAR063 de
// $40 a $35 (precio usuario $55 -> $50), mientras se agota el inventario
// viejo. Cuando llegue el cargador nuevo, Arthur lo volverá a subir a $40 a
// mano en Ajustes > Catálogo (esta migración no se repetirá, solo corre una
// vez, y solo cambia el precio si sigue en $40: si ya lo ajustaste, se respeta).
(function bajarPrecioGAR063Temporal() {
  const FLAG = "mte_migr_precios_2026_07j";
  if (localStorage.getItem(FLAG)) return;
  if (Array.isArray(State.catalogo)) {
    let cambió = false;
    for (const p of State.catalogo) {
      if (String(p.nombre || "").trim().toLowerCase() !== "cargador de carga media 2 amp gar063") continue;
      if (Number(p.precio) === 40) { p.precio = 35; cambió = true; }
      if (normalizarCosto(p.precioUsuario) === 55) { p.precioUsuario = 50; cambió = true; }
    }
    if (cambió) saveJSON(STORE_KEYS.catalogo, State.catalogo);
  }
  localStorage.setItem(FLAG, "1");
})();

// Corrección única: el 20 de julio de 2026 se vendió el Cargador de Carga
// Media 2 Amp GAR063 a $40 (precio que Arthur ya decidió revertir a $35 para
// esos días). Se corrigen SOLO las notas de ESE día, SOLO las líneas de ese
// producto que sigan en $40, y se recalcula el total de cada nota afectada.
// No toca ningún otro día ni ningún otro producto. Se ejecuta una sola vez.
(function corregirPrecioGAR063EnNotasDelDia() {
  const FLAG = "mte_migr_notas_2026_07_20_gar063";
  if (localStorage.getItem(FLAG)) return;
  const DIA_A_CORREGIR = "2026-07-20";
  const PRECIO_VIEJO = 40, PRECIO_NUEVO = 35;
  if (Array.isArray(State.tickets)) {
    let notasCorregidas = 0, ajusteTotal = 0;
    for (const t of State.tickets) {
      if (dayKeyFromDate(new Date(t.fecha)) !== DIA_A_CORREGIR) continue;
      let tocada = false;
      for (const it of t.items) {
        if (codigoDeProducto(it.nombre) !== "GAR063") continue;
        if (Number(it.precio) !== PRECIO_VIEJO) continue;
        it.precio = PRECIO_NUEVO;
        tocada = true;
      }
      if (tocada) {
        const totalViejo = t.total;
        t.total = t.items.reduce((acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
        ajusteTotal += totalViejo - t.total;
        notasCorregidas++;
      }
    }
    if (notasCorregidas > 0) {
      persistTickets();
      console.log(`Corrección GAR063: ${notasCorregidas} nota(s) del ${DIA_A_CORREGIR} ajustadas, $${ajusteTotal.toFixed(2)} menos en total.`);
    }
  }
  localStorage.setItem(FLAG, "1");
})();

function persistNegocio() { saveJSON(STORE_KEYS.negocio, State.negocio); }
function persistCatalogo() { saveJSON(STORE_KEYS.catalogo, State.catalogo); }
function persistClientes() { saveJSON(STORE_KEYS.clientes, State.clientes); }
function persistTickets() { saveJSON(STORE_KEYS.tickets, State.tickets); }

function nextFolio() {
  const n = loadJSON(STORE_KEYS.folioSeq, 0) + 1;
  saveJSON(STORE_KEYS.folioSeq, n);
  return n;
}

// ---------- Navegación entre pantallas ----------

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
  if (name === "clientes") renderClientes();
  if (name === "historial") renderHistorial();
  if (name === "rotacion") { renderRotacion(); renderResurtido(); }
  if (name === "ajustes") renderAjustes();
  if (name === "nota") renderNota();
}

// ===================================================================
// PANTALLA: Nueva Nota
// ===================================================================

function renderNota() {
  renderClienteBox();
  renderCatalogoPicker();
  renderCarrito();
}

function renderClienteBox() {
  const box = document.getElementById("cliente-box");
  const sel = State.clienteSeleccionado ? State.clientes.find(c => c.id === State.clienteSeleccionado) : null;
  if (sel) {
    box.innerHTML = `
      <div class="cliente-chip">
        <div>
          <div class="cliente-chip-nombre">${escapeHtml(sel.nombre)}</div>
          ${sel.telefono ? `<div class="cliente-chip-sub">${escapeHtml(sel.telefono)}</div>` : ""}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="quitarCliente()">Quitar</button>
      </div>`;
  } else {
    box.innerHTML = `
      <input type="text" id="cliente-input" placeholder="Nombre del cliente / tiendita (opcional)"
        value="${escapeHtml(State.clienteNombreLibre)}" list="clientes-datalist"
        oninput="onClienteInput(this.value)">
      <datalist id="clientes-datalist">
        ${State.clientes.map(c => `<option value="${escapeHtml(c.nombre)}">`).join("")}
      </datalist>
      <div class="form-hint">Déjalo vacío para "Público en general", o escribe/selecciona una tiendita guardada.</div>`;
  }
}

function onClienteInput(value) {
  State.clienteNombreLibre = value;
  const match = State.clientes.find(c => c.nombre.toLowerCase() === value.trim().toLowerCase());
  // Si el texto ya no coincide con ninguna tiendita guardada, soltar la selección
  // para que la nota no se quede pegada al cliente anterior.
  State.clienteSeleccionado = match ? match.id : null;
}
function quitarCliente() {
  State.clienteSeleccionado = null;
  State.clienteNombreLibre = "";
  renderClienteBox();
}

// Códigos de los productos que se destacan como "principales" arriba del
// catálogo en la pantalla de Nota (los de mayor venta).
const CODIGOS_PRODUCTOS_PRINCIPALES = ["CAB237", "CAB238", "EZ-165", "GAR063"];
function esProductoPrincipal(nombre) {
  const n = String(nombre || "").toUpperCase();
  return CODIGOS_PRODUCTOS_PRINCIPALES.some(cod => n.includes(cod));
}

function renderCatalogoPicker(filter) {
  const cont = document.getElementById("catalogo-picker");
  const f = (filter || document.getElementById("producto-buscar")?.value || "").trim();
  const productos = buscarEnLista(State.catalogo, f, p => p.nombre);
  if (productos.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Sin productos que coincidan.</div>`;
    return;
  }
  const principales = productos.filter(p => esProductoPrincipal(p.nombre));
  const resto = productos.filter(p => !esProductoPrincipal(p.nombre));
  const tarjeta = (p, principal) => `
    <div class="prod-pick${principal ? " prod-pick-principal" : ""}" onclick="agregarAlCarrito('${p.id}')">
      ${principal ? `<div class="prod-pick-badge">⭐ Principal</div>` : ""}
      <div class="prod-pick-nombre">${escapeHtml(p.nombre)}</div>
      <div class="prod-pick-precio">${fmtMoney(p.precio)}</div>
    </div>
  `;
  cont.innerHTML =
    (principales.length ? `<div class="picker-section-label">⭐ Principales</div>` : "") +
    principales.map(p => tarjeta(p, true)).join("") +
    (principales.length && resto.length ? `<div class="picker-section-label">Todos los productos</div>` : "") +
    resto.map(p => tarjeta(p, false)).join("");
}

function agregarAlCarrito(prodId) {
  const p = State.catalogo.find(x => x.id === prodId);
  if (!p) return;
  const existing = State.cart.find(x => x.id === prodId);
  if (existing) existing.cantidad += 1;
  // Se guarda el costo del momento para que el reporte de utilidad sea exacto
  // aunque el costo del producto cambie después.
  else State.cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, costo: normalizarCosto(p.costo), cantidad: 1 });
  renderCarrito();
}

function cambiarCantidad(prodId, delta) {
  const item = State.cart.find(x => x.id === prodId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) State.cart = State.cart.filter(x => x.id !== prodId);
  renderCarrito();
}

function quitarDelCarrito(prodId) {
  State.cart = State.cart.filter(x => x.id !== prodId);
  renderCarrito();
}

function carritoTotal() {
  return State.cart.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
}

function renderCarrito() {
  const cont = document.getElementById("carrito-list");
  if (State.cart.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Agrega productos de la lista de arriba.</div>`;
  } else {
    cont.innerHTML = State.cart.map(it => `
      <div class="carrito-row">
        <div class="carrito-row-info">
          <div class="carrito-row-nombre">${escapeHtml(it.nombre)}</div>
          <div class="carrito-row-precio">${fmtMoney(it.precio)} c/u</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="cambiarCantidad('${it.id}',-1)">−</button>
          <span class="qty-val">${it.cantidad}</span>
          <button class="qty-btn" onclick="cambiarCantidad('${it.id}',1)">+</button>
        </div>
        <div class="carrito-row-importe">${fmtMoney(it.precio * it.cantidad)}</div>
        <button class="carrito-row-del" onclick="quitarDelCarrito('${it.id}')">✕</button>
      </div>
    `).join("");
  }
  document.getElementById("carrito-total").textContent = fmtMoney(carritoTotal());
  const btn = document.getElementById("btn-generar-ticket");
  btn.disabled = State.cart.length === 0;
}

function limpiarNota() {
  State.cart = [];
  State.clienteSeleccionado = null;
  State.clienteNombreLibre = "";
  renderNota();
  document.getElementById("print-status").textContent = "";
}

async function generarEImprimir() {
  if (State.cart.length === 0) return;

  let clienteNombre = "";
  let clienteId = null;
  if (State.clienteSeleccionado) {
    const c = State.clientes.find(x => x.id === State.clienteSeleccionado);
    clienteNombre = c ? c.nombre : "";
    clienteId = c ? c.id : null;
  } else if (State.clienteNombreLibre.trim()) {
    clienteNombre = State.clienteNombreLibre.trim();
  }

  const ticket = {
    id: uid(),
    folio: nextFolio(),
    fecha: new Date().toISOString(),
    clienteId,
    cliente: clienteNombre,
    items: State.cart.map(it => ({ nombre: it.nombre, precio: it.precio, costo: normalizarCosto(it.costo), cantidad: it.cantidad })),
    total: carritoTotal(),
  };

  State.tickets.unshift(ticket);
  persistTickets();

  document.getElementById("post-print-actions").classList.add("hidden");
  window.__ultimoTicket = ticket;
  await imprimirTicket(ticket, "print-status");

  document.getElementById("post-print-actions").classList.remove("hidden");
}

async function imprimirTicket(ticket, statusElId) {
  const statusEl = document.getElementById(statusElId);
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
  try {
    await Printer.printTicket(ticket, State.negocio, setStatus);
  } catch (err) {
    console.error(err);
    setStatus("⚠️ " + (err.message || "No se pudo imprimir."));
  }
}

function reimprimirUltimo() {
  if (window.__ultimoTicket) imprimirTicket(window.__ultimoTicket, "print-status");
}

function compartirUltimo() {
  const t = window.__ultimoTicket;
  if (!t) return;
  const texto = Printer.ticketToText(t, State.negocio);
  if (navigator.share) {
    navigator.share({ text: texto, title: "Nota #" + t.folio }).catch(() => {});
  } else {
    copiarTexto(texto);
  }
}

function copiarTexto(texto) {
  navigator.clipboard?.writeText(texto).then(() => {
    toast("Ticket copiado como texto.");
  }).catch(() => {
    toast("No se pudo copiar.");
  });
}

// ===================================================================
// PANTALLA: Clientes
// ===================================================================

function renderClientes() {
  const cont = document.getElementById("clientes-list");
  const f = (document.getElementById("clientes-buscar")?.value || "").trim();
  const list = buscarEnLista(State.clientes, f, c => c.nombre);
  if (list.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Aún no tienes tienditas guardadas. Agrega una con el botón de abajo.</div>`;
    return;
  }
  cont.innerHTML = list.map(c => {
    const ventas = State.tickets.filter(t => t.clienteId === c.id);
    const totalVendido = ventas.reduce((a, t) => a + t.total, 0);
    return `
    <div class="card cliente-card">
      <div class="cliente-card-top">
        <div>
          <div class="cliente-card-nombre">${escapeHtml(c.nombre)}</div>
          ${c.telefono ? `<div class="cliente-card-sub">📱 ${escapeHtml(c.telefono)}</div>` : ""}
          ${c.direccion ? `<div class="cliente-card-sub">📍 ${escapeHtml(c.direccion)}</div>` : ""}
          <div class="cliente-card-sub">${ventas.length} nota(s) · ${fmtMoney(totalVendido)} vendido</div>
        </div>
        <div class="cliente-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="editarCliente('${c.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="borrarCliente('${c.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

function abrirModalCliente(cliente) {
  const modal = document.getElementById("modal-cliente");
  document.getElementById("mc-id").value = cliente?.id || "";
  document.getElementById("mc-nombre").value = cliente?.nombre || "";
  document.getElementById("mc-telefono").value = cliente?.telefono || "";
  document.getElementById("mc-direccion").value = cliente?.direccion || "";
  document.getElementById("mc-notas").value = cliente?.notas || "";
  document.getElementById("mc-titulo").textContent = cliente ? "Editar tiendita" : "Nueva tiendita";
  modal.classList.remove("hidden");
}
function cerrarModalCliente() { document.getElementById("modal-cliente").classList.add("hidden"); }

function editarCliente(id) {
  abrirModalCliente(State.clientes.find(c => c.id === id));
}
function nuevoCliente() { abrirModalCliente(null); }

function guardarCliente(ev) {
  ev.preventDefault();
  const id = document.getElementById("mc-id").value;
  const nombre = document.getElementById("mc-nombre").value.trim();
  if (!nombre) return;
  const data = {
    nombre,
    telefono: document.getElementById("mc-telefono").value.trim(),
    direccion: document.getElementById("mc-direccion").value.trim(),
    notas: document.getElementById("mc-notas").value.trim(),
  };
  if (id) {
    const c = State.clientes.find(x => x.id === id);
    Object.assign(c, data);
  } else {
    State.clientes.push({ id: uid(), creado: new Date().toISOString(), ...data });
  }
  persistClientes();
  cerrarModalCliente();
  renderClientes();
}

function borrarCliente(id) {
  if (!confirm("¿Borrar esta tiendita? Su historial de notas no se borra, solo el contacto guardado.")) return;
  State.clientes = State.clientes.filter(c => c.id !== id);
  persistClientes();
  renderClientes();
}

// ===================================================================
// PANTALLA: Historial
// ===================================================================

// Días (por su clave "YYYY-MM-DD") actualmente desplegados en el historial.
const historialExpandido = new Set();

function dayKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Lunes (00:00 hora local) de la semana que contiene la fecha dada.
function lunesDeSemana(d) {
  const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = nd.getDay(); // 0=domingo ... 6=sábado
  const diff = dow === 0 ? -6 : 1 - dow;
  nd.setDate(nd.getDate() + diff);
  return nd;
}

function formatDiaLabel(d) {
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  let base = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  base = base.charAt(0).toUpperCase() + base.slice(1);
  if (dayKeyFromDate(d) === dayKeyFromDate(hoy)) return `Hoy · ${base}`;
  if (dayKeyFromDate(d) === dayKeyFromDate(ayer)) return `Ayer · ${base}`;
  return base;
}

function formatSemanaLabel(lunes) {
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  const opts = { day: "numeric", month: "short" };
  return `Semana del ${lunes.toLocaleDateString("es-MX", opts)} al ${domingo.toLocaleDateString("es-MX", opts)}`;
}

function toggleDiaHistorial(dayKey) {
  if (historialExpandido.has(dayKey)) historialExpandido.delete(dayKey);
  else historialExpandido.add(dayKey);
  renderHistorial();
}

function renderHistorial() {
  const cont = document.getElementById("historial-list");
  const f = (document.getElementById("historial-buscar")?.value || "").trim();
  // Se busca por cliente y por folio; el orden final lo da la fecha, no la relevancia.
  const list = State.tickets.filter(t => coincideBusqueda(`${t.cliente || ""} ${t.folio}`, f));
  if (list.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Todavía no hay notas generadas.</div>`;
    return;
  }

  // Agrupar ventas por día.
  const porDia = new Map(); // dayKey -> { fecha: Date, tickets: [] }
  for (const t of list) {
    const d = new Date(t.fecha);
    const key = dayKeyFromDate(d);
    if (!porDia.has(key)) porDia.set(key, { fecha: d, tickets: [] });
    porDia.get(key).tickets.push(t);
  }

  // Agrupar los días por semana (lunes a domingo).
  const porSemana = new Map(); // weekKey -> { lunes: Date, dias: [] }
  for (const [dayKey, grupo] of porDia) {
    const lunes = lunesDeSemana(grupo.fecha);
    const weekKey = dayKeyFromDate(lunes);
    if (!porSemana.has(weekKey)) porSemana.set(weekKey, { lunes, dias: [] });
    porSemana.get(weekKey).dias.push({ key: dayKey, fecha: grupo.fecha, tickets: grupo.tickets });
  }

  const semanas = [...porSemana.values()].sort((a, b) => b.lunes - a.lunes);

  cont.innerHTML = semanas.map(sem => {
    const dias = sem.dias.sort((a, b) => b.fecha - a.fecha);
    const totalSemana = dias.reduce((acc, dia) => acc + dia.tickets.reduce((s, t) => s + t.total, 0), 0);
    return `
      <div class="semana-grupo">
        <div class="semana-header">
          <span>${formatSemanaLabel(sem.lunes)}</span>
          <span class="semana-total">${fmtMoney(totalSemana)}</span>
        </div>
        ${dias.map(dia => renderDiaGrupoHistorial(dia)).join("")}
      </div>
    `;
  }).join("");
}

function renderDiaGrupoHistorial(dia) {
  const totalDia = dia.tickets.reduce((a, t) => a + t.total, 0);
  const abierto = historialExpandido.has(dia.key);
  return `
    <div class="card dia-grupo">
      <button type="button" class="dia-grupo-btn" onclick="toggleDiaHistorial('${dia.key}')">
        <div>
          <div class="dia-grupo-fecha">${formatDiaLabel(dia.fecha)}</div>
          <div class="dia-grupo-sub">${dia.tickets.length} venta(s)</div>
        </div>
        <div class="dia-grupo-right">
          <span class="dia-grupo-total">${fmtMoney(totalDia)}</span>
          <span class="dia-grupo-caret">${abierto ? "▲" : "▼"}</span>
        </div>
      </button>
      ${abierto ? `
        <div class="dia-grupo-detalle">
          <div class="total-line"><span>Total del día</span><span>${fmtMoney(totalDia)}</span></div>
          ${dia.tickets.map(t => `
            <div class="card historial-row" onclick="verTicket('${t.id}')">
              <div>
                <div class="historial-row-top">#${t.folio} · ${escapeHtml(t.cliente || "Público en general")}</div>
                <div class="historial-row-sub">${new Date(t.fecha).toLocaleString("es-MX")} · ${t.items.length} producto(s)</div>
              </div>
              <div class="historial-row-total">${fmtMoney(t.total)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function verTicket(id) {
  const t = State.tickets.find(x => x.id === id);
  if (!t) return;
  window.__ultimoTicket = t;
  const detalle = document.getElementById("modal-ticket-detalle");
  detalle.innerHTML = `
    <h3>Nota #${t.folio}</h3>
    <div class="form-hint">${new Date(t.fecha).toLocaleString("es-MX")}</div>
    <div class="form-hint">Cliente: ${escapeHtml(t.cliente || "Público en general")}</div>
    <div class="table-wrap" style="margin-top:10px">
      <table>
        <thead><tr><th>Cant</th><th>Producto</th><th>Precio</th><th>Importe</th></tr></thead>
        <tbody>
          ${t.items.map(it => `<tr><td>${it.cantidad}</td><td>${escapeHtml(it.nombre)}</td><td>${fmtMoney(it.precio)}</td><td>${fmtMoney(it.precio * it.cantidad)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="total-line">TOTAL: ${fmtMoney(t.total)}</div>
    <div class="modal-actions">
      <button class="btn btn-accent" onclick="imprimirTicket(window.__ultimoTicket,'modal-print-status')">🖨️ Reimprimir</button>
      <button class="btn btn-secondary" onclick="compartirUltimo()">📤 Compartir texto</button>
      <button class="btn btn-danger" onclick="borrarTicket('${t.id}')">🗑️ Borrar nota</button>
    </div>
    <div id="modal-print-status" class="print-status"></div>
  `;
  document.getElementById("modal-ticket").classList.remove("hidden");
}
function cerrarModalTicket() { document.getElementById("modal-ticket").classList.add("hidden"); }

function borrarTicket(id) {
  if (!confirm("¿Borrar esta nota del historial?")) return;
  State.tickets = State.tickets.filter(t => t.id !== id);
  persistTickets();
  cerrarModalTicket();
  renderHistorial();
}

// ===================================================================
// PANTALLA: Ajustes
// ===================================================================

function renderAjustes() {
  document.getElementById("aj-nombre").value = State.negocio.nombre;
  document.getElementById("aj-whatsapp").value = State.negocio.whatsapp;
  document.getElementById("aj-slogan").value = State.negocio.slogan;
  renderProductosAjustes();
  document.getElementById("printer-name").textContent = Printer.isConnected()
    ? "Conectada"
    : (Printer.getLastDeviceName() ? "Última usada: " + Printer.getLastDeviceName() + " (desconectada)" : "Sin conectar");
  document.getElementById("pin-toggle").checked = !!loadJSON(STORE_KEYS.pinEnabled, false);
}

function guardarNegocio(ev) {
  ev.preventDefault();
  State.negocio.nombre = document.getElementById("aj-nombre").value.trim() || DEFAULT_NEGOCIO.nombre;
  State.negocio.whatsapp = document.getElementById("aj-whatsapp").value.trim();
  State.negocio.slogan = document.getElementById("aj-slogan").value.trim();
  persistNegocio();
  toast("Datos del negocio guardados.");
}

function renderProductosAjustes() {
  const cont = document.getElementById("productos-admin-list");
  cont.innerHTML = State.catalogo.map(p => {
    const costo = normalizarCosto(p.costo);
    const utilidad = costo === null ? null : (Number(p.precio) || 0) - costo;
    return `
    <div class="prod-admin-item">
      <div class="prod-admin-linea1">
        <input type="text" value="${escapeHtml(p.nombre)}" onchange="editarProducto('${p.id}','nombre',this.value)">
        <button class="carrito-row-del" onclick="borrarProducto('${p.id}')">✕</button>
      </div>
      <div class="prod-admin-linea2">
        <label>Costo mío<input type="number" min="0" step="0.01" placeholder="—" value="${p.costo ?? ""}" onchange="editarProducto('${p.id}','costo',this.value)"></label>
        <label>Precio cliente<input type="number" min="0" step="0.01" value="${p.precio}" onchange="editarProducto('${p.id}','precio',this.value)"></label>
        <label>Precio usuario<input type="number" min="0" step="0.01" placeholder="—" value="${p.precioUsuario ?? ""}" onchange="editarProducto('${p.id}','precioUsuario',this.value)"></label>
      </div>
      <div class="prod-admin-util">${utilidad === null ? "Falta capturar tu costo" : "Tu utilidad: " + fmtMoney(utilidad)}</div>
    </div>`;
  }).join("");
}

function editarProducto(id, campo, valor) {
  const p = State.catalogo.find(x => x.id === id);
  if (!p) return;
  if (campo === "precio") p.precio = parseFloat(valor) || 0;
  else if (campo === "costo") p.costo = normalizarCosto(valor);
  else if (campo === "precioUsuario") p.precioUsuario = normalizarCosto(valor);
  else p[campo] = valor;
  persistCatalogo();
  if (campo === "costo" || campo === "precio") renderProductosAjustes();
}

function borrarProducto(id) {
  if (!confirm("¿Quitar este producto del catálogo?")) return;
  State.catalogo = State.catalogo.filter(p => p.id !== id);
  persistCatalogo();
  renderProductosAjustes();
}

function agregarProducto(ev) {
  ev.preventDefault();
  const nombre = document.getElementById("np-nombre").value.trim();
  const precio = parseFloat(document.getElementById("np-precio").value) || 0;
  const costo = normalizarCosto(document.getElementById("np-costo")?.value);
  const precioUsuario = normalizarCosto(document.getElementById("np-usuario")?.value);
  if (!nombre) return;
  State.catalogo.push({ id: uid(), nombre, precio, costo, precioUsuario });
  persistCatalogo();
  document.getElementById("np-nombre").value = "";
  document.getElementById("np-precio").value = "";
  if (document.getElementById("np-costo")) document.getElementById("np-costo").value = "";
  if (document.getElementById("np-usuario")) document.getElementById("np-usuario").value = "";
  renderProductosAjustes();
}

async function conectarImpresora() {
  const statusEl = document.getElementById("printer-status");
  try {
    const name = await Printer.connect((msg) => statusEl.textContent = msg);
    document.getElementById("printer-name").textContent = "Conectada: " + name;
    toast("Impresora conectada.");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "⚠️ " + (err.message || "No se pudo conectar.");
  }
}

async function pruebaImpresion() {
  const statusEl = document.getElementById("printer-status");
  try {
    await Printer.printTest((msg) => statusEl.textContent = msg);
  } catch (err) {
    statusEl.textContent = "⚠️ " + (err.message || "No se pudo imprimir.");
  }
}

function desconectarImpresora() {
  Printer.disconnect();
  document.getElementById("printer-name").textContent = "Sin conectar";
  toast("Impresora desconectada.");
}

function exportarDatos() {
  const data = {
    negocio: State.negocio,
    catalogo: State.catalogo,
    clientes: State.clientes,
    tickets: State.tickets,
    exportado: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "respaldo-mi-tiendita-express-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

// Exporta la base de clientes como CSV (para vaciarla a la Bitácora de Ventas
// Tienditas o abrirla en Excel). Universal: separado por comas, con encabezados.
function exportarClientesCSV() {
  if (State.clientes.length === 0) { toast("Aún no tienes tienditas guardadas."); return; }
  const esc = (v) => {
    const s = (v == null ? "" : String(v)).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const headers = ["Nombre", "WhatsApp", "Direccion", "Notas", "NumVentas", "TotalVendido", "FechaAlta"];
  const rows = State.clientes.map(c => {
    const ventas = State.tickets.filter(t => t.clienteId === c.id);
    const total = ventas.reduce((a, t) => a + t.total, 0);
    return [
      c.nombre, c.telefono || "", c.direccion || "", c.notas || "",
      ventas.length, total.toFixed(2),
      c.creado ? new Date(c.creado).toLocaleDateString("es-MX") : "",
    ].map(esc).join(",");
  });
  // BOM para que Excel respete los acentos
  const csv = "﻿" + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes-mi-tiendita-expres-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  toast(State.clientes.length + " cliente(s) exportado(s).");
}

function importarDatos(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        alert("El archivo no es un respaldo válido.");
        return;
      }
      // Revisar la forma de los datos ANTES de guardar nada: un respaldo
      // malformado dejaba la app sin productos y sin manera de arreglarla.
      const listasMal = ["catalogo", "clientes", "tickets"]
        .filter(k => data[k] !== undefined && !Array.isArray(data[k]));
      if (listasMal.length) {
        alert("El respaldo está dañado (" + listasMal.join(", ") + "). No se importó nada.");
        return;
      }
      if (data.catalogo !== undefined && !sanearCatalogo(data.catalogo)) {
        alert("El catálogo del respaldo está dañado. No se importó nada.");
        return;
      }
      if (!confirm("Esto reemplazará tus clientes, catálogo e historial actuales en este celular por los del archivo. ¿Continuar?")) return;
      if (data.negocio && typeof data.negocio === "object" && !Array.isArray(data.negocio)) {
        State.negocio = data.negocio; persistNegocio();
      }
      if (data.catalogo !== undefined) { State.catalogo = sanearCatalogo(data.catalogo).lista; persistCatalogo(); }
      if (data.clientes !== undefined) { State.clientes = data.clientes; persistClientes(); }
      if (data.tickets !== undefined) { State.tickets = data.tickets; persistTickets(); }
      toast("Datos importados correctamente.");
      renderAjustes();
    } catch (e) {
      alert("El archivo no es un respaldo válido.");
    }
  };
  reader.readAsText(file);
  ev.target.value = "";
}

// ---------- PIN local ----------

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function togglePin(ev) {
  const enabled = ev.target.checked;
  if (enabled) {
    const pin = prompt("Crea un PIN de 4 a 6 dígitos para proteger la app:");
    if (!pin || pin.length < 4) { ev.target.checked = false; return; }
    saveJSON(STORE_KEYS.pinHash, await sha256Hex(pin));
    saveJSON(STORE_KEYS.pinEnabled, true);
    toast("PIN activado.");
  } else {
    saveJSON(STORE_KEYS.pinEnabled, false);
    toast("PIN desactivado.");
  }
}

async function checkPinLock() {
  const enabled = loadJSON(STORE_KEYS.pinEnabled, false);
  if (!enabled) return true;
  const hash = loadJSON(STORE_KEYS.pinHash, null);
  if (!hash) return true;
  const overlay = document.getElementById("pin-lock");
  overlay.classList.remove("hidden");
  return new Promise((resolve) => {
    const input = document.getElementById("pin-input");
    const err = document.getElementById("pin-error");
    document.getElementById("pin-form").onsubmit = async (ev) => {
      ev.preventDefault();
      const val = input.value.trim();
      const h = await sha256Hex(val);
      if (h === hash) {
        overlay.classList.add("hidden");
        resolve(true);
      } else {
        err.textContent = "PIN incorrecto.";
        input.value = "";
      }
    };
    input.focus();
  });
}

// ===================================================================
// PANTALLA: Rotación de productos
// ===================================================================
//
// Responde tres preguntas con tus ventas reales:
//   1. ¿Qué se mueve y cuánto me deja de verdad? (no cuál vendí más piezas,
//      sino cuál me dio más dinero)
//   2. ¿Qué lleva mucho sin venderse y tiene dinero mío detenido?
//   3. ¿Qué nunca se ha vendido?

function diasEntre(a, b) {
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

// Identifica un producto para agrupar ventas: se usa el código si lo tiene
// (así un producto renombrado no se cuenta dos veces) y si no, el nombre.
function claveDeProducto(nombre) {
  return codigoDeProducto(nombre) || String(nombre || "").trim().toLowerCase();
}

function analizarRotacion(dias) {
  const ahora = new Date();
  const desde = dias > 0 ? new Date(ahora.getTime() - dias * 86400000) : null;
  const ventas = State.tickets.filter(t => !desde || new Date(t.fecha) >= desde);

  // Acumulado por producto. Se agrupa por código para que un cambio de nombre
  // no parta el historial en dos productos distintos.
  const porProducto = new Map();
  for (const t of ventas) {
    const fecha = new Date(t.fecha);
    for (const it of t.items) {
      const clave = claveDeProducto(it.nombre);
      if (!porProducto.has(clave)) {
        porProducto.set(clave, { nombre: it.nombre, piezas: 0, vendido: 0, utilidad: 0, ultima: null, sinCosto: false });
      }
      const acc = porProducto.get(clave);
      const cant = Number(it.cantidad) || 0;
      const importe = (Number(it.precio) || 0) * cant;
      acc.piezas += cant;
      acc.vendido += importe;
      const { costo } = costoDeItem(it);
      if (costo === null) acc.sinCosto = true;
      else acc.utilidad += importe - costo * cant;
      if (!acc.ultima || fecha > acc.ultima) acc.ultima = fecha;
    }
  }

  // Última venta de cada producto en TODO el historial (para los dormidos:
  // importa cuándo se vendió por última vez, no solo dentro del periodo).
  const ultimaVentaGlobal = new Map();
  for (const t of State.tickets) {
    const fecha = new Date(t.fecha);
    for (const it of t.items) {
      const clave = claveDeProducto(it.nombre);
      const prev = ultimaVentaGlobal.get(clave);
      if (!prev || fecha > prev) ultimaVentaGlobal.set(clave, fecha);
    }
  }

  const seMueven = [...porProducto.values()].sort((a, b) => b.utilidad - a.utilidad);

  // Dormidos y nunca vendidos se sacan del CATÁLOGO: son productos que tienes
  // (o podrías tener) y no se están moviendo.
  const dormidos = [];
  const nuncaVendidos = [];
  for (const p of State.catalogo) {
    const clave = claveDeProducto(p.nombre);
    const ultima = ultimaVentaGlobal.get(clave);
    if (!ultima) { nuncaVendidos.push(p); continue; }
    const diasSin = diasEntre(ahora, ultima);
    if (diasSin >= 21) dormidos.push({ ...p, ultima, diasSin });
  }
  dormidos.sort((a, b) => b.diasSin - a.diasSin);

  const totVendido = seMueven.reduce((s, p) => s + p.vendido, 0);
  const totUtilidad = seMueven.reduce((s, p) => s + p.utilidad, 0);

  return { ventas, seMueven, dormidos, nuncaVendidos, totVendido, totUtilidad, dias };
}

function textoDesdeUltima(diasSin) {
  if (diasSin <= 0) return "hoy";
  if (diasSin === 1) return "ayer";
  return "hace " + diasSin + " días";
}

function renderRotacion() {
  const cont = document.getElementById("rotacion-contenido");
  const dias = Number(document.getElementById("rotacion-periodo")?.value ?? 30);
  const r = analizarRotacion(dias);

  if (State.tickets.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Todavía no hay ventas registradas. En cuanto generes notas, aquí verás qué se mueve y qué no.</div>`;
    return;
  }

  const etiqueta = dias > 0 ? `últimos ${dias} días` : "todo el historial";

  // --- Resumen ---
  let html = `
    <div class="card rot-resumen">
      <div><span>Ventas</span><b>${r.ventas.length}</b></div>
      <div><span>Vendido</span><b>${fmtMoney(r.totVendido)}</b></div>
      <div><span>Utilidad</span><b class="rot-verde">${fmtMoney(r.totUtilidad)}</b></div>
    </div>`;

  // --- Se mueven (ranking por utilidad) ---
  if (r.seMueven.length === 0) {
    html += `<div class="empty-hint">Sin ventas en los ${etiqueta}.</div>`;
  } else {
    const maxUtil = Math.max(...r.seMueven.map(p => p.utilidad), 1);
    html += `<h3 class="rot-titulo">🔥 Lo que te deja dinero <span>(${etiqueta})</span></h3>`;
    html += r.seMueven.slice(0, 12).map((p, i) => {
      const porDia = dias > 0 ? (p.piezas / dias) : 0;
      const ritmo = dias > 0 && p.piezas > 0
        ? ` · ~${(porDia * 7).toFixed(1)} pz/semana` : "";
      return `
      <div class="card rot-item">
        <div class="rot-item-top">
          <span class="rot-pos">${i + 1}</span>
          <span class="rot-nombre">${escapeHtml(p.nombre)}</span>
          <span class="rot-util">${p.sinCosto ? "—" : fmtMoney(p.utilidad)}</span>
        </div>
        <div class="rot-barra"><span style="width:${Math.max(2, (p.utilidad / maxUtil) * 100)}%"></span></div>
        <div class="rot-sub">${p.piezas} pz · ${fmtMoney(p.vendido)} vendido${ritmo} · última venta ${textoDesdeUltima(diasEntre(new Date(), p.ultima))}</div>
      </div>`;
    }).join("");
  }

  // --- Dormidos ---
  if (r.dormidos.length) {
    const capitalDetenido = r.dormidos.reduce((s, p) => s + (normalizarCosto(p.costo) || 0), 0);
    html += `<h3 class="rot-titulo">😴 Dormidos <span>(21 días o más sin venderse)</span></h3>`;
    html += `<div class="rot-aviso">Si tienes una pieza de cada uno, son <b>${fmtMoney(capitalDetenido)}</b> de tu dinero detenido.</div>`;
    html += r.dormidos.slice(0, 10).map(p => `
      <div class="card rot-item rot-item-frio">
        <div class="rot-item-top">
          <span class="rot-nombre">${escapeHtml(p.nombre)}</span>
          <span class="rot-dias">${p.diasSin} días</span>
        </div>
        <div class="rot-sub">Última venta ${textoDesdeUltima(p.diasSin)}${normalizarCosto(p.costo) !== null ? ` · te cuesta ${fmtMoney(p.costo)} c/u` : ""}</div>
      </div>`).join("");
  }

  // --- Nunca vendidos ---
  if (r.nuncaVendidos.length) {
    html += `<h3 class="rot-titulo">⚪ Nunca se han vendido <span>(${r.nuncaVendidos.length})</span></h3>`;
    html += `<div class="card rot-nunca">${
      r.nuncaVendidos.map(p => `<div>${escapeHtml(p.nombre)}</div>`).join("")
    }</div>`;
  }

  cont.innerHTML = html;
}

// ===================================================================
// Qué resurtir (alerta de faltantes)
// ===================================================================
//
// Con las ventas ya registradas calcula tres cosas:
//   1. Lo que vendías seguido y de pronto se dejó de vender (probable faltante).
//   2. Lo que está acelerando (comparando la mitad vieja del periodo con la
//      mitad reciente), para surtir más antes de quedarte corto.
//   3. Una lista de compra: cuántas piezas cubren las próximas semanas al
//      ritmo actual, con la inversión y la utilidad que deja.

function analizarResurtido(dias, semanasCubrir) {
  const ahora = new Date();
  const diasReales = dias > 0 ? dias : 90; // "todo el historial" se acota a 90 días para el ritmo
  const desde = new Date(ahora.getTime() - diasReales * 86400000);
  const mitad = new Date(ahora.getTime() - (diasReales / 2) * 86400000);

  const acc = new Map(); // clave -> datos del producto
  for (const t of State.tickets) {
    const fecha = new Date(t.fecha);
    if (fecha < desde) continue;
    for (const it of t.items) {
      const clave = claveDeProducto(it.nombre);
      if (!acc.has(clave)) {
        acc.set(clave, { nombre: it.nombre, piezas: 0, viejas: 0, recientes: 0, ultima: null });
      }
      const a = acc.get(clave);
      const cant = Number(it.cantidad) || 0;
      a.piezas += cant;
      if (fecha >= mitad) a.recientes += cant; else a.viejas += cant;
      if (!a.ultima || fecha > a.ultima) a.ultima = fecha;
    }
  }

  const semanas = diasReales / 7;
  const lista = [];
  const posiblesFaltantes = [];
  const acelerando = [];

  for (const [clave, a] of acc) {
    const enCatalogo = State.catalogo.find(p => claveDeProducto(p.nombre) === clave);
    const costo = enCatalogo ? normalizarCosto(enCatalogo.costo) : null;
    const precio = enCatalogo ? Number(enCatalogo.precio) || 0 : 0;
    const ritmoSemanal = a.piezas / semanas;
    const diasSinVender = diasEntre(ahora, a.ultima);

    // Lista de compra: solo lo que de verdad se mueve.
    if (ritmoSemanal > 0) {
      const sugerido = Math.max(1, Math.ceil(ritmoSemanal * semanasCubrir));
      lista.push({
        nombre: enCatalogo ? enCatalogo.nombre : a.nombre,
        piezas: a.piezas, ritmoSemanal, sugerido,
        inversion: costo !== null ? costo * sugerido : null,
        utilidad: costo !== null ? (precio - costo) * sugerido : null,
      });
    }

    // Probable faltante: vendía seguido y lleva más de 2 semanas parado.
    if (a.piezas >= 3 && diasSinVender >= 14) {
      posiblesFaltantes.push({ nombre: a.nombre, piezas: a.piezas, diasSinVender, ritmoSemanal });
    }

    // Acelerando: la mitad reciente vendió bastante más que la mitad vieja.
    if (a.recientes >= 3 && a.recientes > a.viejas * 1.5) {
      const crecimiento = a.viejas > 0 ? ((a.recientes - a.viejas) / a.viejas) * 100 : 100;
      acelerando.push({ nombre: a.nombre, viejas: a.viejas, recientes: a.recientes, crecimiento });
    }
  }

  lista.sort((a, b) => (b.utilidad ?? 0) - (a.utilidad ?? 0));
  acelerando.sort((a, b) => b.crecimiento - a.crecimiento);
  posiblesFaltantes.sort((a, b) => b.ritmoSemanal - a.ritmoSemanal);

  return { lista, posiblesFaltantes, acelerando, semanasCubrir, diasReales };
}

function renderResurtido() {
  const cont = document.getElementById("resurtir-contenido");
  const dias = Number(document.getElementById("rotacion-periodo")?.value ?? 30);
  const semanas = Number(document.getElementById("resurtir-semanas")?.value ?? 4);
  const r = analizarResurtido(dias, semanas);

  if (State.tickets.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Aún no hay ventas. Cuando registres algunas, aquí te digo qué comprar y cuánto.</div>`;
    return;
  }

  let html = `
    <label class="form-label">Quiero surtido para las próximas</label>
    <select id="resurtir-semanas" class="select-campo">
      ${[1, 2, 4, 8].map(s => `<option value="${s}"${s === semanas ? " selected" : ""}>${s} semana${s > 1 ? "s" : ""}</option>`).join("")}
    </select>`;

  if (r.posiblesFaltantes.length) {
    html += `<h3 class="rot-titulo">🔴 Puede que se te haya acabado</h3>`;
    html += r.posiblesFaltantes.slice(0, 6).map(p => `
      <div class="card rot-item rot-item-alerta">
        <div class="rot-item-top">
          <span class="rot-nombre">${escapeHtml(p.nombre)}</span>
          <span class="rot-dias">${p.diasSinVender} días</span>
        </div>
        <div class="rot-sub">Vendiste ${p.piezas} pz y lleva ${p.diasSinVender} días sin venderse. Normalmente sale ~${p.ritmoSemanal.toFixed(1)} pz/semana. ¿Se te acabó?</div>
      </div>`).join("");
  }

  if (r.acelerando.length) {
    html += `<h3 class="rot-titulo">📈 Está despegando</h3>`;
    html += r.acelerando.slice(0, 6).map(p => `
      <div class="card rot-item rot-item-sube">
        <div class="rot-item-top">
          <span class="rot-nombre">${escapeHtml(p.nombre)}</span>
          <span class="rot-sube">${p.viejas === 0 ? "NUEVO" : "+" + p.crecimiento.toFixed(0) + "%"}</span>
        </div>
        <div class="rot-sub">${
          p.viejas === 0
            ? `Empezó a venderse: ${p.recientes} pz en la segunda mitad del periodo. Considera surtir más.`
            : `Antes ${p.viejas} pz · ahora ${p.recientes} pz. Considera surtir más.`
        }</div>
      </div>`).join("");
  }

  if (r.lista.length === 0) {
    html += `<div class="empty-hint">Sin ventas en el periodo elegido.</div>`;
  } else {
    const totInv = r.lista.reduce((s, p) => s + (p.inversion ?? 0), 0);
    const totUtil = r.lista.reduce((s, p) => s + (p.utilidad ?? 0), 0);
    html += `<h3 class="rot-titulo">🛒 Lista de compra <span>(para ${semanas} semana${semanas > 1 ? "s" : ""})</span></h3>`;
    html += `<div class="card rot-resumen">
        <div><span>Invertirías</span><b>${fmtMoney(totInv)}</b></div>
        <div><span>Te dejaría</span><b class="rot-verde">${fmtMoney(totUtil)}</b></div>
      </div>`;
    html += r.lista.map(p => `
      <div class="card rot-item">
        <div class="rot-item-top">
          <span class="rot-nombre">${escapeHtml(p.nombre)}</span>
          <span class="rot-comprar">${p.sugerido} pz</span>
        </div>
        <div class="rot-sub">Vendes ~${p.ritmoSemanal.toFixed(1)} pz/semana${
          p.inversion !== null ? ` · inviertes ${fmtMoney(p.inversion)} · te deja ${fmtMoney(p.utilidad)}` : " · falta capturar su costo"
        }</div>
      </div>`).join("");
  }

  cont.innerHTML = html;
  const sel = document.getElementById("resurtir-semanas");
  if (sel) sel.addEventListener("change", renderResurtido);
}

// ===================================================================
// Calculadora de paquetes (para vender en línea)
// ===================================================================
//
// El envío cuesta casi lo mismo mandes 1 pieza o 5 (las paqueterías cobran
// mínimo 1 kg). Por eso, cada pieza extra en la misma caja es casi pura
// ganancia. Esta calculadora muestra a cuánto vender cada paquete.

function calcularPaquetes() {
  const costo = Number(document.getElementById("calc-costo")?.value) || 0;
  const envio = Number(document.getElementById("calc-envio")?.value) || 0;
  const base = Number(document.getElementById("calc-precio")?.value) || 0;
  const cont = document.getElementById("calc-resultado");
  if (!cont) return;

  if (costo <= 0 || base <= 0) {
    cont.innerHTML = `<div class="form-hint">Captura el costo y el precio de 1 pieza para ver los paquetes.</div>`;
    return;
  }

  // Descuento por volumen: entre más piezas, mejor precio por pieza.
  const descuentos = [0, 0.08, 0.15, 0.18, 0.22];
  const filas = descuentos.map((desc, i) => {
    const n = i + 1;
    const porPieza = base * (1 - desc);
    const precio = Math.round((porPieza * n) / 10) * 10;
    const utilidad = precio - costo * n - envio;
    return { n, precio, porPieza: precio / n, utilidad, porPza: utilidad / n };
  });

  cont.innerHTML = `
    <div class="table-wrap" style="margin-top:10px">
      <table>
        <thead><tr><th>Pzas</th><th>Vende en</th><th>C/u</th><th>Ganas</th></tr></thead>
        <tbody>
          ${filas.map(f => `
            <tr${f.utilidad <= 0 ? ' class="calc-perdida"' : ""}>
              <td><b>${f.n}</b></td>
              <td>${fmtMoney(f.precio)}</td>
              <td>${fmtMoney(f.porPieza)}</td>
              <td class="${f.utilidad > 0 ? "calc-gana" : "calc-pierde"}">${fmtMoney(f.utilidad)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="form-hint" style="margin-top:8px">
      El envío (${fmtMoney(envio)}) se paga <b>una sola vez por paquete</b>, así que cada pieza extra casi no te cuesta más.
    </div>`;
}

// ---------- Reporte de ventas en PDF ----------
//
// Arma una hoja imprimible con el detalle de cada venta (producto por producto),
// tu costo, el precio al cliente y la utilidad bruta (precio - costo).
// Se genera con la función de imprimir del navegador: en el celular se elige
// "Guardar como PDF". Así no hace falta ninguna librería externa.

// Saca el código del producto del nombre (CAB237, GAR063, EZ-165, BOC060...).
// Sirve para reconocer un producto aunque se le haya cambiado el nombre:
// "Cargador Carga Lenta 1 Amp GAR063" y "Cargador de Carga Media 2 Amp GAR063"
// son el mismo GAR063. Pide 2+ letras y 2+ dígitos para no confundirse con
// textos como "3 M", "20W", "2 Amp" o "10,000 mAh".
function codigoDeProducto(nombre) {
  const encontrados = String(nombre || "").match(/\b[A-Z]{2,}-?\d{2,}\b/g);
  return encontrados ? encontrados[encontrados.length - 1] : null;
}

// Si una venta vieja no guardó el costo, se busca el costo actual del producto:
// primero por nombre exacto y, si no aparece, por su código (así una venta
// hecha antes de renombrar un producto sigue mostrando costo y utilidad, en
// vez de salir con "—" en el reporte). Se marca como estimado.
function costoDeItem(item) {
  const propio = normalizarCosto(item.costo);
  if (propio !== null) return { costo: propio, estimado: false };

  const nombreItem = String(item.nombre || "").trim().toLowerCase();
  let enCatalogo = State.catalogo.find(
    p => String(p.nombre || "").trim().toLowerCase() === nombreItem
  );

  if (!enCatalogo) {
    const codigo = codigoDeProducto(item.nombre);
    if (codigo) {
      enCatalogo = State.catalogo.find(p => codigoDeProducto(p.nombre) === codigo);
    }
  }

  const costoCat = enCatalogo ? normalizarCosto(enCatalogo.costo) : null;
  if (costoCat !== null) return { costo: costoCat, estimado: true };
  return { costo: null, estimado: false };
}

function ventasDelPeriodo(periodo) {
  if (periodo === "dia") {
    const valor = document.getElementById("reporte-fecha")?.value; // "YYYY-MM-DD"
    if (!valor) return [];
    const lista = State.tickets.filter(t => dayKeyFromDate(new Date(t.fecha)) === valor);
    return lista.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }
  const ahora = new Date();
  let desde = null;
  if (periodo === "semana") {
    desde = lunesDeSemana(ahora);
  } else if (periodo === "mes") {
    desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  }
  const lista = State.tickets.filter(t => {
    if (!desde) return true;
    return new Date(t.fecha) >= desde;
  });
  // De la más antigua a la más nueva, para leer el reporte en orden.
  return lista.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// Etiqueta legible para un valor de <input type="date"> ("YYYY-MM-DD"),
// construida en hora local para que no se recorra un día por huso horario.
function etiquetaDiaEspecifico(valorFecha) {
  const [y, m, d] = valorFecha.split("-").map(Number);
  let base = new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function generarReportePDF() {
  const periodo = document.getElementById("reporte-periodo")?.value || "todo";
  const fechaEspecifica = document.getElementById("reporte-fecha")?.value || "";

  if (periodo === "dia" && !fechaEspecifica) {
    toast("Elige primero el día del reporte.");
    return;
  }

  const ventas = ventasDelPeriodo(periodo);
  if (ventas.length === 0) {
    toast("No hay ventas en ese periodo.");
    return;
  }

  const etiquetaPeriodo = periodo === "dia"
    ? etiquetaDiaEspecifico(fechaEspecifica)
    : { todo: "Todas las ventas", semana: "Esta semana (lunes a domingo)", mes: "Este mes" }[periodo];

  let totVenta = 0, totCosto = 0, totUtilidad = 0, totVentaConCosto = 0;
  let hayEstimados = false, haySinCosto = false;
  // Filas para la descarga en Excel (CSV), con los mismos números del PDF.
  const filasCSV = [["Venta", "Nota", "Fecha", "Cliente", "Cantidad", "Producto",
                     "Costo Arthur", "Precio Cliente", "Total", "Utilidad"]];

  const bloques = ventas.map((t, idx) => {
    // "ConCosto" acumula solo las líneas cuyo costo se conoce. La utilidad se
    // calcula SOLO con esas: si se restara el costo conocido al total vendido,
    // un producto sin costo capturado contaría como ganancia del 100% e
    // inflaría la utilidad.
    let subVenta = 0, subCosto = 0, subVentaConCosto = 0;
    let algunSinCosto = false;

    const filas = t.items.map(it => {
      const cant = Number(it.cantidad) || 0;
      const precio = Number(it.precio) || 0;
      const importe = precio * cant;
      const { costo, estimado } = costoDeItem(it);
      if (estimado) hayEstimados = true;

      subVenta += importe;
      let costoTotal = null, utilidad = null;
      if (costo !== null) {
        costoTotal = costo * cant;
        utilidad = importe - costoTotal;
        subCosto += costoTotal;
        subVentaConCosto += importe;
      } else {
        algunSinCosto = true;
        haySinCosto = true;
      }

      filasCSV.push([
        idx + 1, t.folio, new Date(t.fecha).toLocaleString("es-MX"),
        t.cliente || "Público en general", cant, it.nombre,
        costo === null ? "" : costo, precio, importe,
        utilidad === null ? "" : utilidad,
      ]);

      return `<tr>
        <td>${cant}</td>
        <td>${escapeHtml(it.nombre)}${estimado ? ' <span class="rp-nota">*</span>' : ""}</td>
        <td class="rp-num">${costo === null ? "—" : fmtMoney(costo)}</td>
        <td class="rp-num">${fmtMoney(precio)}</td>
        <td class="rp-num">${fmtMoney(importe)}</td>
        <td class="rp-num rp-util">${utilidad === null ? "—" : fmtMoney(utilidad)}</td>
      </tr>`;
    }).join("");

    const subUtilidad = subVentaConCosto - subCosto;
    totVenta += subVenta;
    totCosto += subCosto;
    totUtilidad += subUtilidad;
    totVentaConCosto += subVentaConCosto;

    const fecha = new Date(t.fecha).toLocaleString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    return `
      <div class="rp-venta">
        <div class="rp-venta-head">
          <span><b>Venta ${idx + 1}</b> · Nota #${t.folio}</span>
          <span>${escapeHtml(t.cliente || "Público en general")}</span>
        </div>
        <div class="rp-fecha">${fecha}</div>
        <table>
          <thead>
            <tr>
              <th>Cant</th><th>Producto</th><th class="rp-num">Costo Arthur</th>
              <th class="rp-num">Precio Cliente</th><th class="rp-num">Total</th><th class="rp-num">Utilidad</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
          <tfoot>
            <tr>
              <td colspan="4"><b>Subtotal venta ${idx + 1}</b>${algunSinCosto ? ' <span class="rp-nota">*</span>' : ""}</td>
              <td class="rp-num"><b>${fmtMoney(subVenta)}</b></td>
              <td class="rp-num rp-util"><b>${fmtMoney(subUtilidad)}</b></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }).join("");

  // El margen se calcula sobre lo vendido que SÍ tiene costo conocido.
  const margen = totVentaConCosto > 0 ? (totUtilidad / totVentaConCosto) * 100 : 0;
  const generado = new Date().toLocaleString("es-MX");

  const cuerpoReporte = `
    <div class="rp-titulo">
      <h1>${escapeHtml(State.negocio.nombre || "Mi Tiendita Expres")}</h1>
      <div>Reporte de ventas · ${escapeHtml(etiquetaPeriodo)}</div>
      <div class="rp-fecha">Generado el ${generado}</div>
    </div>

    <div class="rp-resumen">
      <div><span>Ventas</span><b>${ventas.length}</b></div>
      <div><span>Total vendido</span><b>${fmtMoney(totVenta)}</b></div>
      <div><span>Costo total</span><b>${fmtMoney(totCosto)}</b></div>
      <div><span>Utilidad bruta</span><b class="rp-util">${fmtMoney(totUtilidad)}</b></div>
      <div><span>Margen</span><b>${margen.toFixed(1)}%</b></div>
    </div>

    ${bloques}

    ${(hayEstimados || haySinCosto) ? `
      <div class="rp-avisos">
        ${hayEstimados ? `<div>* Costo tomado del catálogo actual (esa venta se registró antes de guardar el costo), puede diferir del costo real de ese día.</div>` : ""}
        ${haySinCosto ? `<div><b>Hay productos sin costo capturado</b> (aparecen con "—"). Sí cuentan en el total vendido, pero NO en el costo ni en la utilidad, para no inflar tu ganancia. Tu utilidad real es <b>menor</b> que la mostrada. Captura sus costos en "Ajustes &gt; Catálogo de productos" y vuelve a generar el reporte.</div>` : ""}
      </div>` : ""}
  `;

  // Totales al final del CSV, para que el archivo se explique solo.
  filasCSV.push([]);
  filasCSV.push(["TOTALES", "", "", "", "", "", "", "Vendido", totVenta, ""]);
  filasCSV.push(["", "", "", "", "", "", "", "Costo", totCosto, ""]);
  filasCSV.push(["", "", "", "", "", "", "", "Utilidad bruta", totUtilidad, ""]);

  const fechaArchivo = periodo === "dia" ? fechaEspecifica : new Date().toISOString().slice(0, 10);
  abrirVentanaDeReporte(
    "Reporte de ventas · " + etiquetaPeriodo,
    cuerpoReporte,
    aCSV(filasCSV),
    "reporte-ventas-" + periodo + "-" + fechaArchivo + ".csv"
  );
}

// Convierte una tabla (arreglo de arreglos) a texto CSV para Excel.
function aCSV(filas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return filas.map(f => f.map(esc).join(",")).join("\n");
}

// Abre el reporte en una PESTAÑA NUEVA e independiente de la app, con su
// propio botón de "Imprimir / Guardar como PDF".
//
// Antes se armaba el reporte escondiendo la pantalla actual con CSS
// (@media print) y llamando a window.print() automáticamente. En el celular
// eso a veces imprimía lo que había en pantalla en ese momento (p. ej.
// Ajustes) en vez del reporte, porque el navegador no siempre alcanza a
// "voltear la página" a tiempo antes de que el script pida imprimir.
//
// Al abrir una pestaña nueva y dejar que el USUARIO toque el botón de
// imprimir, ese problema de tiempos desaparece por completo: el botón solo
// existe cuando el reporte ya está completo y pintado en pantalla.
function abrirVentanaDeReporte(titulo, cuerpoHtml, csv, nombreArchivoCSV) {
  const estilos = `
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#000;background:#fff;margin:0;padding:16px 16px 40px}
    h1{font-size:18px;margin:0 0 2px}
    .rp-titulo{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px}
    .rp-fecha{font-size:10px;color:#555}
    .rp-resumen{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;border:1px solid #000;padding:8px 10px;margin-bottom:16px}
    .rp-resumen div{display:flex;flex-direction:column}
    .rp-resumen span{font-size:9px;text-transform:uppercase;color:#555}
    .rp-resumen b{font-size:13px}
    .rp-util{color:#0a7a28}
    .rp-venta{margin-bottom:16px;page-break-inside:avoid;break-inside:avoid}
    .rp-venta-head{display:flex;justify-content:space-between;gap:10px;background:#eee;padding:5px 7px;font-size:11px}
    .rp-venta .rp-fecha{padding:2px 7px 6px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#f4f4f4;font-size:9px;padding:4px 6px;border:1px solid #bbb;text-align:left;font-weight:600}
    td{padding:4px 6px;border:1px solid #ddd}
    tfoot td{border-top:2px solid #888;background:#fafafa}
    .rp-num{text-align:right;white-space:nowrap}
    .rp-nota{color:#a00;font-weight:700}
    .rp-avisos{margin-top:14px;border-top:1px solid #bbb;padding-top:8px;font-size:9px;color:#444}
    .rp-barra{position:sticky;top:0;background:#fff;padding:8px 0 12px;margin-bottom:4px;border-bottom:1px dashed #ccc;display:flex;gap:8px;flex-wrap:wrap}
    .rp-btn{flex:1 1 45%;min-width:150px;padding:13px 10px;font-size:14px;font-weight:600;border-radius:8px;border:none;cursor:pointer}
    .rp-btn-print{background:#111;color:#fff}
    .rp-btn-csv{background:#0a7a28;color:#fff}
    .rp-ayuda{flex:1 1 100%;font-size:10px;color:#666;margin-top:2px}
    @media print{.rp-barra{display:none}}
    @page{margin:12mm}
  `;

  // El CSV se incrusta como texto y se descarga desde la misma ventana, para
  // que funcione sin internet y sin depender de la app principal.
  const script = `
    var CSV = ${JSON.stringify(csv || "")};
    var NOMBRE = ${JSON.stringify(nombreArchivoCSV || "reporte.csv")};
    function descargarCSV(){
      // El BOM hace que Excel respete los acentos.
      var blob = new Blob(["\\ufeff" + CSV], {type:"text/csv;charset=utf-8;"});
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = NOMBRE;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    }
  `;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(titulo)}</title>
    <style>${estilos}</style>
    </head><body>
      <div class="rp-barra">
        <button class="rp-btn rp-btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        <button class="rp-btn rp-btn-csv" onclick="descargarCSV()">⬇️ Descargar (Excel)</button>
        <div class="rp-ayuda">Para guardarlo como PDF: toca "Imprimir" y en <b>Destino</b> elige <b>"Guardar como PDF"</b>.</div>
      </div>
      ${cuerpoHtml}
      <script>${script}<\/script>
    </body></html>`;

  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert("El navegador bloqueó la ventana del reporte. Permite ventanas emergentes para esta app e inténtalo de nuevo.");
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

// ---------- Búsqueda ----------
//
// Busca "como uno esperaría" en el celular:
//  - Sin importar mayúsculas ni acentos: "audifono" encuentra "Audífono".
//  - Por pedazo de palabra: "car" encuentra "Cargador" (y también encontraría
//    "multiplicar", porque lo trae al final).
//  - Varias palabras en cualquier orden: "bocina 241" encuentra "Bocina BOC241".
//  - Ignorando signos: "ez165" encuentra "EZ-165" y "tc" encuentra "T.C".

function normalizarTexto(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos (í -> i, ñ -> n)
    .toLowerCase();
}

function soloAlfanumerico(s) {
  return s.replace(/[^a-z0-9]/g, "");
}

// Coincide si CADA palabra escrita aparece en el texto (en cualquier orden
// y en cualquier parte de la palabra).
function coincideBusqueda(texto, filtro) {
  const f = normalizarTexto(filtro).trim();
  if (!f) return true;
  const n = normalizarTexto(texto);
  const nCompacto = soloAlfanumerico(n);
  return f.split(/\s+/).filter(Boolean).every(term => {
    if (n.includes(term)) return true;
    const t = soloAlfanumerico(term);
    return t.length > 0 && nCompacto.includes(t);
  });
}

// Ordena los resultados por qué tan "directa" es la coincidencia:
// 3 = el nombre empieza igual, 2 = alguna palabra empieza igual, 1 = lo contiene.
function puntajeBusqueda(texto, filtro) {
  const f = normalizarTexto(filtro).trim();
  if (!f) return 0;
  const n = normalizarTexto(texto);
  if (n.startsWith(f)) return 3;
  if (n.split(/[^a-z0-9]+/).some(palabra => palabra && palabra.startsWith(f))) return 2;
  return 1;
}

// Filtra y ordena una lista por relevancia, conservando el orden original
// entre los que empatan.
function buscarEnLista(lista, filtro, obtenerTexto) {
  const f = String(filtro || "").trim();
  const coincidencias = lista.filter(item => coincideBusqueda(obtenerTexto(item), f));
  if (!f) return coincidencias;
  return coincidencias
    .map((item, i) => ({ item, i, score: puntajeBusqueda(obtenerTexto(item), f) }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map(x => x.item);
}

// ---------- Utilidades UI ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// Busca manualmente una versión nueva. Si la encuentra, la aplica y la app
// se recarga sola (por el "controllerchange"). Si no, avisa que ya está al día.
function buscarActualizacion() {
  if (!("serviceWorker" in navigator)) {
    toast("Actualización no disponible en este navegador.");
    return;
  }
  toast("Buscando actualización…");
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) { toast("Ya tienes la última versión."); return; }
    return reg.update().then(() => {
      const nuevo = reg.installing || reg.waiting;
      if (nuevo) {
        // Hay una versión nueva descargándose o lista: activarla.
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        nuevo.addEventListener?.("statechange", () => {
          if (nuevo.state === "installed") nuevo.postMessage({ type: "SKIP_WAITING" });
        });
        toast("Actualizando…");
      } else {
        toast("Ya tienes la última versión (" + APP_VERSION + ").");
      }
    });
  }).catch(() => toast("No se pudo buscar actualización."));
}

// ---------- Arranque ----------

async function initApp() {
  await checkPinLock();
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => showScreen(b.dataset.screen)));
  document.getElementById("producto-buscar").addEventListener("input", () => renderCatalogoPicker());
  document.getElementById("clientes-buscar").addEventListener("input", renderClientes);
  document.getElementById("historial-buscar").addEventListener("input", renderHistorial);
  document.getElementById("btn-generar-ticket").addEventListener("click", generarEImprimir);
  document.getElementById("btn-nueva-nota").addEventListener("click", limpiarNota);
  document.getElementById("btn-reimprimir").addEventListener("click", reimprimirUltimo);
  document.getElementById("btn-compartir").addEventListener("click", compartirUltimo);
  document.getElementById("form-cliente").addEventListener("submit", guardarCliente);
  document.getElementById("btn-nuevo-cliente").addEventListener("click", nuevoCliente);
  document.getElementById("form-negocio").addEventListener("submit", guardarNegocio);
  document.getElementById("form-nuevo-producto").addEventListener("submit", agregarProducto);
  document.getElementById("btn-conectar-impresora").addEventListener("click", conectarImpresora);
  document.getElementById("btn-prueba-impresion").addEventListener("click", pruebaImpresion);
  document.getElementById("btn-desconectar-impresora").addEventListener("click", desconectarImpresora);
  document.getElementById("btn-exportar").addEventListener("click", exportarDatos);
  document.getElementById("btn-exportar-clientes").addEventListener("click", exportarClientesCSV);
  document.getElementById("input-importar").addEventListener("change", importarDatos);
  document.getElementById("pin-toggle").addEventListener("change", togglePin);

  if (!Printer.bluetoothSupported()) {
    document.getElementById("bt-warning").classList.remove("hidden");
  }

  const versionEl = document.getElementById("app-version");
  if (versionEl) versionEl.textContent = "Versión " + APP_VERSION;
  const btnActualizar = document.getElementById("btn-buscar-actualizacion");
  if (btnActualizar) btnActualizar.addEventListener("click", buscarActualizacion);
  const btnReporte = document.getElementById("btn-reporte-pdf");
  if (btnReporte) btnReporte.addEventListener("click", generarReportePDF);
  const selReportePeriodo = document.getElementById("reporte-periodo");
  const inputReporteFecha = document.getElementById("reporte-fecha");
  if (selReportePeriodo && inputReporteFecha) {
    if (!inputReporteFecha.value) inputReporteFecha.value = dayKeyFromDate(new Date());
    selReportePeriodo.addEventListener("change", () => {
      inputReporteFecha.classList.toggle("hidden", selReportePeriodo.value !== "dia");
    });
  }
  const selRotacion = document.getElementById("rotacion-periodo");
  if (selRotacion) selRotacion.addEventListener("change", () => {
    renderRotacion();
    renderResurtido();
  });

  // Pestañas de la pantalla de Rotación
  document.querySelectorAll("#screen-rotacion .tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll("#screen-rotacion .tab").forEach(b => b.classList.toggle("activo", b === btn));
      document.getElementById("rotacion-contenido").classList.toggle("hidden", tab !== "mueve");
      document.getElementById("resurtir-contenido").classList.toggle("hidden", tab !== "resurtir");
    });
  });

  ["calc-costo", "calc-envio", "calc-precio"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calcularPaquetes);
  });

  showScreen("nota");

  if ("serviceWorker" in navigator) {
    // Cuando el service worker nuevo toma el control, recargar UNA vez para
    // que se vea de inmediato la versión más reciente de la app.
    let yaRecargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (yaRecargado) return;
      yaRecargado = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("sw.js").then((reg) => {
      // Buscar actualizaciones cada vez que se abre la app.
      reg.update();
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          // Hay una versión nueva lista y ya hay una controlando: activarla.
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            nuevo.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", initApp);
