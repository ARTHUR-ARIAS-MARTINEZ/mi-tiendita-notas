// ===================================================================
// Módulo de impresión para la Easytime MP210 (térmica, 58mm / 384 puntos)
// - Dibuja el ticket completo (logo + texto) en un <canvas>
// - Lo convierte a imagen monocroma (blanco/negro)
// - Lo manda por Bluetooth (Web Bluetooth) usando el comando ESC/POS
//   de imagen rasterizada GS v 0, que es el más compatible entre
//   impresoras térmicas clon como esta.
// ===================================================================

const PRINTER_DOTS_WIDE = 384; // ancho de impresión de la MP210 en puntos (58mm / 203dpi)

// UUIDs de servicio Bluetooth BLE más comunes en impresoras térmicas clon
// (GOOJPRT / Zjiang / Cashino y similares, que es la familia a la que
// pertenece la MP210). Probamos varios porque no todas usan el mismo chip.
const PRINTER_SERVICE_UUIDS = [
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // UART transparente (muy común)
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

const Printer = (() => {
  let device = null;
  let writeChar = null;

  function log(...args) { console.log("[Printer]", ...args); }

  // ---------- Dibujo del ticket en canvas ----------

  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Construye el canvas completo del ticket a partir de los datos de la venta
  async function buildTicketCanvas(ticket, negocio) {
    const W = PRINTER_DOTS_WIDE;
    const pad = 8;
    const innerW = W - pad * 2;

    // Medimos primero en un canvas temporal para saber el alto total
    const measure = document.createElement("canvas").getContext("2d");

    const fontLine = "22px monospace";
    const fontSmall = "18px monospace";
    const fontBold = "bold 24px monospace";
    const fontName = "bold 30px monospace";  // nombre del negocio (encabezado)
    const fontTotal = "bold 30px monospace";
    const lineH = 26;
    const smallLineH = 22;

    // Logo: SOLO el carrito, en negro para máximo contraste en papel térmico.
    // El nombre del negocio va como texto (así respeta la ortografía y sale nítido).
    let logoImg = null;
    try { logoImg = await loadImage("icons/cart-black.png"); } catch (e) { log("sin logo", e); }
    let logoH = 0, logoW = 0;
    if (logoImg) {
      logoW = Math.min(innerW, 100); // reducido 33% (antes 150px)
      logoH = Math.round(logoImg.height * (logoW / logoImg.width));
    }

    const lineas = ticket.items.map(it => ({
      nombre: it.nombre, cant: it.cantidad, precio: it.precio, importe: it.cantidad * it.precio,
    }));

    // Cliente: nombre completo, con salto de línea si es largo (para que NO se corte)
    const clienteTxt = "Cliente: " + (ticket.cliente || "Público en general");
    measure.font = fontBold;
    const clienteLines = wrapText(measure, clienteTxt, innerW);

    // Filas que ocupan los productos (wrap del nombre)
    measure.font = fontLine;
    let itemRows = 0;
    for (const it of lineas) {
      const nombreLines = wrapText(measure, it.nombre, innerW - 40);
      itemRows += nombreLines.length + 1; // +1 fila de precio/importe
    }

    // --- Alto total (se calcula sumando cada bloque que sí se dibuja) ---
    let y = pad;
    if (logoImg) y += logoH + 10;
    y += 34;                                    // nombre del negocio
    if (negocio.slogan) y += smallLineH;        // slogan
    y += 8;
    y += smallLineH;                            // fecha
    y += clienteLines.length * (smallLineH + 2);// cliente (1 o más líneas)
    y += 8;
    y += lineH;                                 // separador
    y += lineH + 6;                             // encabezado tabla
    y += itemRows * lineH;                      // productos
    y += lineH;                                 // separador
    y += 36;                                    // total
    y += lineH;                                 // separador
    y += 30;                                    // sitio web (footer, en lugar del nombre)
    if (negocio.whatsapp) y += smallLineH;      // whatsapp
    y += smallLineH;                            // gracias
    y += 16;                                    // margen final para poder cortar el papel

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = Math.ceil(y);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.textBaseline = "top";

    let cy = pad;

    // --- Encabezado: carrito + nombre + slogan (centrados) ---
    if (logoImg) {
      ctx.drawImage(logoImg, (W - logoW) / 2, cy, logoW, logoH);
      cy += logoH + 10;
    }
    ctx.textAlign = "center";
    ctx.font = fontName;
    ctx.fillText(negocio.nombre, W / 2, cy); cy += 34;
    if (negocio.slogan) {
      ctx.font = fontSmall;
      ctx.fillText(negocio.slogan, W / 2, cy); cy += smallLineH;
    }
    cy += 8;

    // --- Fecha y cliente (a la izquierda) ---
    ctx.textAlign = "left";
    ctx.font = fontSmall;
    const fecha = new Date(ticket.fecha);
    const fechaStr = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      "  " + fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    ctx.fillText("Fecha: " + fechaStr, pad, cy); cy += smallLineH;
    ctx.font = fontBold;
    for (const ln of clienteLines) { ctx.fillText(ln, pad, cy); cy += smallLineH + 2; }
    cy += 8;

    // separador
    ctx.font = fontLine;
    ctx.fillText("-".repeat(32), pad, cy); cy += lineH;

    // encabezado tabla
    ctx.font = fontSmall;
    ctx.fillText("CANT  PRODUCTO", pad, cy);
    ctx.textAlign = "right";
    ctx.fillText("IMPORTE", W - pad, cy);
    ctx.textAlign = "left";
    cy += lineH + 6;

    ctx.font = fontLine;
    for (const it of lineas) {
      // Nombre a todo lo ancho (no comparte renglón con el importe)
      const nombreLines = wrapText(ctx, it.nombre, innerW - 40);
      ctx.font = fontLine;
      ctx.fillText(String(it.cant) + "x", pad, cy);
      ctx.fillText(nombreLines[0] || "", pad + 40, cy);
      cy += lineH;
      for (let i = 1; i < nombreLines.length; i++) {
        ctx.fillText(nombreLines[i], pad + 40, cy);
        cy += lineH;
      }
      // Precio unitario a la izquierda, importe (negrita) a la derecha
      ctx.font = fontSmall;
      ctx.fillText("  $" + it.precio.toFixed(2) + " c/u", pad + 40, cy);
      ctx.textAlign = "right";
      ctx.font = fontBold;
      ctx.fillText("$" + it.importe.toFixed(2), W - pad, cy);
      ctx.textAlign = "left";
      ctx.font = fontLine;
      cy += lineH;
    }

    ctx.fillText("-".repeat(32), pad, cy); cy += lineH;

    ctx.font = fontTotal;
    ctx.fillText("TOTAL", pad, cy);
    ctx.textAlign = "right";
    ctx.fillText("$" + ticket.total.toFixed(2), W - pad, cy);
    ctx.textAlign = "left";
    cy += 36;

    ctx.font = fontLine;
    ctx.fillText("-".repeat(32), pad, cy); cy += lineH;

    // --- Pie: sitio web (mismo formato bold que antes tenía el nombre) + WhatsApp + gracias ---
    ctx.textAlign = "center";
    ctx.font = fontBold;
    ctx.fillText("mitienditaexpres.com", W / 2, cy); cy += 30;
    ctx.font = fontSmall;
    if (negocio.whatsapp) { ctx.fillText("WhatsApp: " + negocio.whatsapp, W / 2, cy); cy += smallLineH; }
    ctx.fillText("¡Gracias por su compra!", W / 2, cy); cy += smallLineH;
    ctx.textAlign = "left";

    return canvas;
  }

  // ---------- Conversión a imagen monocroma para ESC/POS ----------

  function canvasToMono(canvas) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const widthBytes = Math.ceil(width / 8);
    const raster = new Uint8Array(widthBytes * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], a = img.data[i + 3];
        const lum = a === 0 ? 255 : (0.299 * r + 0.587 * g + 0.114 * b);
        const black = lum < 170 ? 1 : 0;
        if (black) {
          const byteIndex = y * widthBytes + (x >> 3);
          raster[byteIndex] |= (0x80 >> (x & 7));
        }
      }
    }
    return { widthBytes, height, raster };
  }

  // ---------- Comandos ESC/POS ----------

  function buildEscPosBuffer(mono) {
    const chunks = [];
    chunks.push(new Uint8Array([0x1b, 0x40])); // ESC @ inicializa

    const { widthBytes, height, raster } = mono;
    const xL = widthBytes & 0xff, xH = (widthBytes >> 8) & 0xff;
    // Mandamos la imagen en bandas para no saturar el buffer de la impresora
    const bandRows = 48;
    for (let start = 0; start < height; start += bandRows) {
      const rows = Math.min(bandRows, height - start);
      const yL = rows & 0xff, yH = (rows >> 8) & 0xff;
      const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
      const slice = raster.subarray(start * widthBytes, (start + rows) * widthBytes);
      chunks.push(header, slice);
    }

    chunks.push(new Uint8Array([0x1b, 0x64, 0x02])); // ESC d 2 -> avanza lo mínimo para poder cortar a mano (menos papel)

    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }

  function buildTestBuffer() {
    const enc = (s) => new TextEncoder().encode(s);
    const parts = [
      new Uint8Array([0x1b, 0x40]),
      new Uint8Array([0x1b, 0x61, 0x01]), // centrado
      enc("PRUEBA DE IMPRESION\n"),
      enc("Mi Tiendita Express\n"),
      enc(new Date().toLocaleString("es-MX") + "\n"),
      new Uint8Array([0x1b, 0x64, 0x04]),
    ];
    let total = 0; for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  // ---------- Web Bluetooth ----------

  function bluetoothSupported() {
    return !!(navigator.bluetooth);
  }

  async function findWritableCharacteristic(server) {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      let chars;
      try { chars = await service.getCharacteristics(); } catch (e) { continue; }
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return c;
        }
      }
    }
    return null;
  }

  async function connect(onStatus) {
    if (!bluetoothSupported()) {
      throw new Error("Este navegador no soporta Bluetooth (Web Bluetooth). Abre la app con Chrome en Android.");
    }
    onStatus && onStatus("Buscando impresora…");
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS,
    });
    device.addEventListener("gattserverdisconnected", () => { writeChar = null; });
    onStatus && onStatus("Conectando con " + (device.name || "impresora") + "…");
    const server = await device.gatt.connect();
    const char = await findWritableCharacteristic(server);
    if (!char) throw new Error("Se conectó pero no se encontró un canal de escritura. Puede que esta impresora no sea compatible con Bluetooth directo desde el navegador.");
    writeChar = char;
    onStatus && onStatus("Conectada: " + (device.name || "impresora"));
    saveLastDeviceName(device.name || "");
    return device.name || "Impresora";
  }

  function saveLastDeviceName(name) {
    try { localStorage.setItem("mte_printer_name", name); } catch (e) {}
  }
  function getLastDeviceName() {
    try { return localStorage.getItem("mte_printer_name") || ""; } catch (e) { return ""; }
  }

  function isConnected() {
    return !!(device && device.gatt && device.gatt.connected && writeChar);
  }

  async function ensureConnected(onStatus) {
    if (isConnected()) return;
    await connect(onStatus);
  }

  async function writeBuffer(bytes, onProgress) {
    if (!writeChar) throw new Error("No hay impresora conectada.");
    const CHUNK = 180;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(slice);
      } else {
        await writeChar.writeValue(slice);
      }
      onProgress && onProgress(Math.min(1, (i + CHUNK) / bytes.length));
      await new Promise(r => setTimeout(r, 25));
    }
  }

  async function printTicket(ticket, negocio, onStatus) {
    await ensureConnected(onStatus);
    onStatus && onStatus("Preparando ticket…");
    const canvas = await buildTicketCanvas(ticket, negocio);
    const mono = canvasToMono(canvas);
    const buffer = buildEscPosBuffer(mono);
    onStatus && onStatus("Imprimiendo…");
    await writeBuffer(buffer, (p) => onStatus && onStatus("Imprimiendo… " + Math.round(p * 100) + "%"));
    onStatus && onStatus("Listo ✅");
  }

  async function printTest(onStatus) {
    await ensureConnected(onStatus);
    onStatus && onStatus("Imprimiendo prueba…");
    await writeBuffer(buildTestBuffer());
    onStatus && onStatus("Listo ✅");
  }

  function disconnect() {
    if (device && device.gatt && device.gatt.connected) device.gatt.disconnect();
    writeChar = null;
  }

  // ---------- Texto plano (respaldo: copiar / compartir) ----------

  function ticketToText(ticket, negocio) {
    const L = [];
    L.push(negocio.nombre);
    L.push(negocio.slogan);
    L.push("-".repeat(32));
    const fecha = new Date(ticket.fecha);
    L.push("Fecha: " + fecha.toLocaleDateString("es-MX") + " " + fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    L.push("Cliente: " + (ticket.cliente || "Público en general"));
    L.push("-".repeat(32));
    for (const it of ticket.items) {
      L.push(it.cantidad + "x " + it.nombre);
      L.push("  $" + it.precio.toFixed(2) + " c/u = $" + (it.cantidad * it.precio).toFixed(2));
    }
    L.push("-".repeat(32));
    L.push("TOTAL: $" + ticket.total.toFixed(2));
    L.push("-".repeat(32));
    if (negocio.whatsapp) L.push("WhatsApp: " + negocio.whatsapp);
    L.push("mitienditaexpres.com");
    L.push("¡Gracias por su compra!");
    return L.join("\n");
  }

  return {
    bluetoothSupported, connect, disconnect, isConnected, ensureConnected,
    printTicket, printTest, ticketToText, getLastDeviceName,
    // Devuelve el <canvas> del ticket tal como se imprimirá (para vista previa en pantalla)
    renderTicketCanvas: buildTicketCanvas,
  };
})();
