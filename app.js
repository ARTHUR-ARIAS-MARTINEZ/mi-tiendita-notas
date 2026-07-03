// ===================================================================
// Notas de Venta — Mi Tiendita Express
// App 100% local: todos los datos (clientes, tickets, catálogo) se
// guardan únicamente en este celular (localStorage). Nada se envía
// a ningún servidor — por eso no hay nada que "hackear" en línea.
// ===================================================================

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
  nombre: "Mi Tiendita Express",
  whatsapp: "449 185 5081",
  slogan: "Compra Directo y Paga Menos",
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
  if (match) State.clienteSeleccionado = match.id;
}
function quitarCliente() {
  State.clienteSeleccionado = null;
  State.clienteNombreLibre = "";
  renderClienteBox();
}

function renderCatalogoPicker(filter) {
  const cont = document.getElementById("catalogo-picker");
  const f = (filter || document.getElementById("producto-buscar")?.value || "").trim().toLowerCase();
  const productos = State.catalogo.filter(p => !f || p.nombre.toLowerCase().includes(f));
  cont.innerHTML = productos.map(p => `
    <div class="prod-pick" onclick="agregarAlCarrito('${p.id}')">
      <div class="prod-pick-nombre">${escapeHtml(p.nombre)}</div>
      <div class="prod-pick-precio">${fmtMoney(p.precio)}</div>
    </div>
  `).join("") || `<div class="empty-hint">Sin productos que coincidan.</div>`;
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
  const f = (document.getElementById("clientes-buscar")?.value || "").trim().toLowerCase();
  const list = State.clientes.filter(c => !f || c.nombre.toLowerCase().includes(f));
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

function renderHistorial() {
  const cont = document.getElementById("historial-list");
  const f = (document.getElementById("historial-buscar")?.value || "").trim().toLowerCase();
  const list = State.tickets.filter(t => !f || (t.cliente || "").toLowerCase().includes(f) || String(t.folio).includes(f));
  if (list.length === 0) {
    cont.innerHTML = `<div class="empty-hint">Todavía no hay notas generadas.</div>`;
    return;
  }
  cont.innerHTML = list.map(t => `
    <div class="card historial-row" onclick="verTicket('${t.id}')">
      <div>
        <div class="historial-row-top">#${t.folio} · ${escapeHtml(t.cliente || "Público en general")}</div>
        <div class="historial-row-sub">${new Date(t.fecha).toLocaleString("es-MX")} · ${t.items.length} producto(s)</div>
      </div>
      <div class="historial-row-total">${fmtMoney(t.total)}</div>
    </div>
  `).join("");
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
  document.getElementById("input-importar").addEventListener("change", importarDatos);
  document.getElementById("pin-toggle").addEventListener("change", togglePin);

  if (!Printer.bluetoothSupported()) {
    document.getElementById("bt-warning").classList.remove("hidden");
  }

  showScreen("nota");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", initApp);
