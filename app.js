// ===================================================================
// Notas de Venta — Mi Tiendita Express
// App 100% local: todos los datos (clientes, tickets, catálogo) se
// guardan únicamente en este celular (localStorage). Nada se envía
// a ningún servidor — por eso no hay nada que "hackear" en línea.
// ===================================================================

// Versión visible de la app (para confirmar que llegó la última actualización).
// Súbela cada vez que se despliega un cambio, junto con CACHE en sw.js.
const APP_VERSION = "v8 · 19 jul 2026";

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

if (!State.catalogo) {
  State.catalogo = CATALOGO_DEFAULT.map(p => ({ id: uid(), nombre: p.nombre, precio: p.precio }));
  saveJSON(STORE_KEYS.catalogo, State.catalogo);
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
  const n = nombre.toUpperCase();
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
  else State.cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });
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
    items: State.cart.map(it => ({ nombre: it.nombre, precio: it.precio, cantidad: it.cantidad })),
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
  cont.innerHTML = State.catalogo.map(p => `
    <div class="prod-admin-row">
      <input type="text" value="${escapeHtml(p.nombre)}" onchange="editarProducto('${p.id}','nombre',this.value)">
      <input type="number" min="0" step="0.01" value="${p.precio}" onchange="editarProducto('${p.id}','precio',this.value)">
      <button class="carrito-row-del" onclick="borrarProducto('${p.id}')">✕</button>
    </div>
  `).join("");
}

function editarProducto(id, campo, valor) {
  const p = State.catalogo.find(x => x.id === id);
  if (!p) return;
  p[campo] = campo === "precio" ? (parseFloat(valor) || 0) : valor;
  persistCatalogo();
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
  if (!nombre) return;
  State.catalogo.push({ id: uid(), nombre, precio });
  persistCatalogo();
  document.getElementById("np-nombre").value = "";
  document.getElementById("np-precio").value = "";
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
      if (!confirm("Esto reemplazará tus clientes, catálogo e historial actuales en este celular por los del archivo. ¿Continuar?")) return;
      if (data.negocio) { State.negocio = data.negocio; persistNegocio(); }
      if (data.catalogo) { State.catalogo = data.catalogo; persistCatalogo(); }
      if (data.clientes) { State.clientes = data.clientes; persistClientes(); }
      if (data.tickets) { State.tickets = data.tickets; persistTickets(); }
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
