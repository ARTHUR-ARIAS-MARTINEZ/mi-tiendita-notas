// ===================================================================
// PDF del reporte de ventas — Mi Tiendita Express
// Arma el archivo PDF directo en el celular, sin internet y sin librerías
// externas (nada de CDN: así funciona en la tiendita sin señal y no hay
// código ajeno corriendo junto a tus datos).
//
// Usa las letras Helvetica y Helvetica-Bold, que todo lector de PDF trae
// incluidas. Solo hay que conocer cuánto mide cada letra para alinear las
// cifras y partir los renglones largos; esas medidas son las oficiales de
// Adobe (por cada 1000 unidades de tamaño de letra).
// ===================================================================

// Caracteres 32 a 126 (del espacio a la tilde).
const PDF_ANCHO_NORMAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const PDF_ANCHO_NEGRITA = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Los pocos signos fuera del abecedario que el reporte puede traer. El valor
// es [código en el PDF, ancho normal, ancho negrita].
const PDF_SIGNOS = {
  "—": [0x97, 1000, 1000],
  "–": [0x96, 556, 556],
  "•": [0x95, 350, 350],
  "…": [0x85, 1000, 1000],
  "€": [0x80, 556, 556],
};

// Deja el texto con solo lo que el PDF sabe escribir: acentos y ñ sí; emojis y
// símbolos raros se quitan; los espacios raros (como el que pone el celular
// antes de "p. m.") se vuelven espacios normales.
function pdfLimpiar(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF—–•…€]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

function pdfAnchoLetra(letra, negrita) {
  const codigo = letra.charCodeAt(0);
  const tabla = negrita ? PDF_ANCHO_NEGRITA : PDF_ANCHO_NORMAL;
  if (codigo >= 32 && codigo <= 126) return tabla[codigo - 32];
  if (PDF_SIGNOS[letra]) return PDF_SIGNOS[letra][negrita ? 2 : 1];
  if (letra === "¿") return 611;
  if (letra === "¡") return 333;
  if (letra === "·" || codigo === 0xA0) return 278;
  if (codigo >= 0xC0) {
    // Letra con acento: mide lo mismo que su letra sin acento.
    const base = letra.normalize("NFD")[0];
    const c = base.charCodeAt(0);
    if (c >= 32 && c <= 126) return tabla[c - 32];
  }
  return 556;
}

// Ancho en puntos de un texto ya limpio.
function pdfAnchoTexto(texto, tam, negrita) {
  let suma = 0;
  for (const letra of texto) suma += pdfAnchoLetra(letra, negrita);
  return (suma * tam) / 1000;
}

// Parte un texto en renglones que quepan en "ancho" puntos.
function pdfRenglones(texto, ancho, tam, negrita) {
  const palabras = texto.split(" ");
  const renglones = [];
  let actual = "";
  const meter = (palabra) => {
    const prueba = actual ? actual + " " + palabra : palabra;
    if (pdfAnchoTexto(prueba, tam, negrita) <= ancho) { actual = prueba; return; }
    if (actual) renglones.push(actual);
    actual = palabra;
  };
  for (const palabra of palabras) {
    if (pdfAnchoTexto(palabra, tam, negrita) <= ancho) { meter(palabra); continue; }
    // Una palabra más ancha que la columna se corta por letras.
    if (actual) { renglones.push(actual); actual = ""; }
    for (const letra of palabra) {
      if (pdfAnchoTexto(actual + letra, tam, negrita) > ancho && actual) {
        renglones.push(actual);
        actual = "";
      }
      actual += letra;
    }
  }
  renglones.push(actual);
  return renglones;
}

// Recorta con "..." un texto que no cabe en una sola línea.
function pdfRecortar(texto, ancho, tam, negrita) {
  if (pdfAnchoTexto(texto, tam, negrita) <= ancho) return texto;
  let corto = texto;
  while (corto.length > 1 && pdfAnchoTexto(corto + "...", tam, negrita) > ancho) {
    corto = corto.slice(0, -1);
  }
  return corto.trimEnd() + "...";
}

// Texto listo para ir entre paréntesis dentro del PDF. Todo lo que no es ASCII
// simple se escribe como código octal, así el archivo queda en ASCII puro.
function pdfTextoSeguro(texto) {
  let salida = "";
  for (const letra of texto) {
    const codigo = PDF_SIGNOS[letra] ? PDF_SIGNOS[letra][0] : letra.charCodeAt(0);
    if (letra === "\\" || letra === "(" || letra === ")") salida += "\\" + letra;
    else if (codigo < 32 || codigo > 126) salida += "\\" + codigo.toString(8).padStart(3, "0");
    else salida += letra;
  }
  return salida;
}

const PDF_NEGRO = [0, 0, 0];
const PDF_GRIS = [0.33, 0.33, 0.33];
const PDF_VERDE = [0.039, 0.478, 0.157];
const PDF_ROJO = [0.67, 0, 0];

// datos = {
//   titulo, negocio, periodo, generado,
//   resumen: [[etiqueta, valor, enVerde], ...],
//   ventas: [{ titulo, cliente, fecha, filas: [{ cant, nombre, estimado, costo, precio, importe, utilidad }],
//              subtotalTexto, algunSinCosto, subVenta, subUtilidad }],
//   avisos: [ "texto", ... ]
// }
// Las cifras de dinero se escriben con fmtMoney (de app.js), igual que en la
// hoja impresa. Devuelve el PDF ya convertido a base64.
function construirReportePDF(datos) {
  const W = 612, H = 792, M = 40;          // hoja carta, márgenes de 40 puntos
  const ANCHO = W - 2 * M;
  const LIMITE = H - M - 14;               // hasta aquí se escribe; abajo va el número de página
  const COL_CANT = 32, COL_NUM = 62;
  const COL_PROD = ANCHO - COL_CANT - 4 * COL_NUM;
  const TAM = 8, INTERLINEA = 10.5, RELLENO = 3.5;

  const paginas = [];
  let ops = null;
  let y = M;                               // posición actual, medida desde arriba

  const nuevaPagina = () => { ops = []; paginas.push(ops); y = M; };
  const color = (c) => c.map(n => n.toFixed(3)).join(" ");

  // x en puntos desde la izquierda; yBase es la línea de escritura medida desde arriba.
  const texto = (x, yBase, s, tam, negrita, c) => {
    ops.push(`BT /${negrita ? "F2" : "F1"} ${tam} Tf ${color(c || PDF_NEGRO)} rg ${x.toFixed(2)} ${(H - yBase).toFixed(2)} Td (${pdfTextoSeguro(s)}) Tj ET`);
  };
  const textoDer = (xDer, yBase, s, tam, negrita, c) =>
    texto(xDer - pdfAnchoTexto(s, tam, negrita), yBase, s, tam, negrita, c);
  const textoCentro = (xCentro, yBase, s, tam, negrita, c) =>
    texto(xCentro - pdfAnchoTexto(s, tam, negrita) / 2, yBase, s, tam, negrita, c);
  const caja = (x, yArriba, ancho, alto, relleno, borde) => {
    if (relleno) ops.push(`${color(relleno)} rg ${x.toFixed(2)} ${(H - yArriba - alto).toFixed(2)} ${ancho.toFixed(2)} ${alto.toFixed(2)} re f`);
    if (borde) ops.push(`${color(borde)} RG 0.5 w ${x.toFixed(2)} ${(H - yArriba - alto).toFixed(2)} ${ancho.toFixed(2)} ${alto.toFixed(2)} re S`);
  };
  const linea = (x1, y1, x2, grosor, c) =>
    ops.push(`${color(c)} RG ${grosor} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y1).toFixed(2)} l S`);

  // Si lo que sigue no cabe en esta hoja, pasa a la siguiente.
  const asegurar = (alto) => {
    if (y + alto <= LIMITE) return false;
    nuevaPagina();
    return true;
  };

  // ---- Encabezado de la primera hoja ----
  nuevaPagina();
  textoCentro(W / 2, y + 14, pdfLimpiar(datos.negocio), 16, true);
  y += 22;
  textoCentro(W / 2, y + 8, pdfLimpiar("Reporte de ventas · " + datos.periodo), 10, false);
  y += 14;
  textoCentro(W / 2, y + 7, pdfLimpiar("Generado el " + datos.generado), 8, false, PDF_GRIS);
  y += 12;
  linea(M, y, W - M, 1.5, PDF_NEGRO);
  y += 12;

  // ---- Resumen ----
  const celda = ANCHO / datos.resumen.length;
  caja(M, y, ANCHO, 34, null, PDF_NEGRO);
  datos.resumen.forEach(([etiqueta, valor, verde], i) => {
    const x = M + i * celda + 8;
    texto(x, y + 13, pdfLimpiar(etiqueta).toUpperCase(), 6.5, false, PDF_GRIS);
    texto(x, y + 27, pdfLimpiar(valor), 11, true, verde ? PDF_VERDE : PDF_NEGRO);
  });
  y += 34 + 16;

  // ---- Una caja por venta ----
  const xCol = [M, M + COL_CANT, M + COL_CANT + COL_PROD];
  for (let i = 0; i < 4; i++) xCol.push(M + COL_CANT + COL_PROD + i * COL_NUM);
  // xCol: 0 cant, 1 producto, 2.. cuatro columnas de cifras

  const encabezadoTabla = () => {
    caja(M, y, ANCHO, 15, [0.957, 0.957, 0.957], [0.73, 0.73, 0.73]);
    texto(M + 5, y + 10.5, "Cant", 7, true);
    texto(xCol[1] + 5, y + 10.5, "Producto", 7, true);
    ["Costo Arthur", "Precio Cliente", "Total", "Utilidad"].forEach((t, i) => {
      textoDer(xCol[2] + (i + 1) * COL_NUM - 5, y + 10.5, t, 7, true);
    });
    y += 15;
  };

  for (const v of datos.ventas) {
    const filas = v.filas.map(f => {
      const nombre = pdfLimpiar(f.nombre) + (f.estimado ? " *" : "");
      const renglones = pdfRenglones(nombre, COL_PROD - 10, TAM, false);
      return { f, renglones, alto: renglones.length * INTERLINEA + 2 * RELLENO };
    });
    const altoTotal = 16 + 14 + 15 + filas.reduce((s, r) => s + r.alto, 0) + 18;

    // Una venta que cabe en una hoja no se parte: se pasa entera a la siguiente.
    if (altoTotal <= LIMITE - M && y + altoTotal > LIMITE) nuevaPagina();
    asegurar(16 + 14 + 15 + (filas[0] ? filas[0].alto : 0));

    caja(M, y, ANCHO, 16, [0.933, 0.933, 0.933]);
    const cliente = pdfRecortar(pdfLimpiar(v.cliente), ANCHO / 2 - 10, 9, false);
    texto(M + 7, y + 11.5, pdfLimpiar(v.titulo), 9, true);
    textoDer(W - M - 7, y + 11.5, cliente, 9, false);
    y += 16;
    texto(M + 7, y + 10, pdfLimpiar(v.fecha), 7.5, false, PDF_GRIS);
    y += 14;
    encabezadoTabla();

    for (const { f, renglones, alto } of filas) {
      if (asegurar(alto)) encabezadoTabla();
      caja(M, y, ANCHO, alto, null, [0.867, 0.867, 0.867]);
      const base = y + RELLENO + 7.5;
      texto(M + 5, base, String(f.cant), TAM, false);
      renglones.forEach((r, i) => {
        // El asterisco de "costo estimado" se pinta en rojo, como en la hoja impresa.
        const marca = f.estimado && i === renglones.length - 1 && r.endsWith(" *");
        const cuerpo = marca ? r.slice(0, -2) : r;
        texto(xCol[1] + 5, base + i * INTERLINEA, cuerpo, TAM, false);
        if (marca) texto(xCol[1] + 5 + pdfAnchoTexto(cuerpo + " ", TAM, false), base + i * INTERLINEA, "*", TAM, true, PDF_ROJO);
      });
      const sinCosto = f.costo === null;
      textoDer(xCol[2] + COL_NUM - 5, base, sinCosto ? "—" : fmtMoney(f.costo), TAM, false);
      textoDer(xCol[2] + 2 * COL_NUM - 5, base, fmtMoney(f.precio), TAM, false);
      textoDer(xCol[2] + 3 * COL_NUM - 5, base, fmtMoney(f.importe), TAM, false);
      textoDer(xCol[2] + 4 * COL_NUM - 5, base, f.utilidad === null ? "—" : fmtMoney(f.utilidad), TAM, false, PDF_VERDE);
      y += alto;
    }

    // Subtotal de la venta
    if (asegurar(18)) encabezadoTabla();
    caja(M, y, ANCHO, 18, [0.98, 0.98, 0.98], [0.867, 0.867, 0.867]);
    linea(M, y, W - M, 1, [0.53, 0.53, 0.53]);
    texto(M + 5, y + 12, pdfLimpiar(v.subtotalTexto), TAM, true);
    if (v.algunSinCosto) texto(M + 5 + pdfAnchoTexto(pdfLimpiar(v.subtotalTexto) + " ", TAM, true), y + 12, "*", TAM, true, PDF_ROJO);
    textoDer(xCol[2] + 3 * COL_NUM - 5, y + 12, fmtMoney(v.subVenta), TAM, true);
    textoDer(xCol[2] + 4 * COL_NUM - 5, y + 12, fmtMoney(v.subUtilidad), TAM, true, PDF_VERDE);
    y += 18 + 14;
  }

  // ---- Avisos al final ----
  if (datos.avisos.length) {
    const renglonesAviso = datos.avisos.map(a => pdfRenglones(pdfLimpiar(a), ANCHO, 8, false));
    const alto = 10 + renglonesAviso.reduce((s, r) => s + r.length * 10.5 + 4, 0);
    asegurar(Math.min(alto, LIMITE - M));
    linea(M, y, W - M, 0.7, [0.73, 0.73, 0.73]);
    y += 10;
    for (const renglones of renglonesAviso) {
      for (const r of renglones) {
        asegurar(10.5);
        texto(M, y + 7, r, 8, false, [0.27, 0.27, 0.27]);
        y += 10.5;
      }
      y += 4;
    }
  }

  // ---- Número de página en todas las hojas ----
  paginas.forEach((hoja, i) => {
    ops = hoja;
    textoCentro(W / 2, H - 24, `Página ${i + 1} de ${paginas.length}`, 8, false, PDF_GRIS);
  });

  // ---- Armado del archivo ----
  // Objetos fijos: 1 catálogo, 2 páginas, 3 y 4 las letras, 5 datos del documento.
  // Después, por cada hoja: un objeto de página y otro con su contenido.
  const objetos = [];
  objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objetos[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => `${6 + 2 * i} 0 R`).join(" ")}] /Count ${paginas.length} >>`;
  objetos[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objetos[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objetos[5] = `<< /Title (${pdfTextoSeguro(pdfLimpiar(datos.titulo))}) >>`;
  paginas.forEach((hoja, i) => {
    const contenido = hoja.join("\n");
    objetos[6 + 2 * i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`;
    objetos[7 + 2 * i] = `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`;
  });

  let archivo = "%PDF-1.4\n";
  const posiciones = [];
  for (let n = 1; n < objetos.length; n++) {
    posiciones[n] = archivo.length;
    archivo += `${n} 0 obj\n${objetos[n]}\nendobj\n`;
  }
  const inicioTabla = archivo.length;
  archivo += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objetos.length; n++) {
    archivo += String(posiciones[n]).padStart(10, "0") + " 00000 n \n";
  }
  archivo += `trailer\n<< /Size ${objetos.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${inicioTabla}\n%%EOF\n`;

  return btoa(archivo);
}
