// ===================================================================
// Fotos de los productos para la VITRINA
// ===================================================================
// Las fotos viven en la carpeta "productos/" (copiadas de Mi Tiendita
// Expres, versión .webp para que pesen poco y carguen al instante en el
// celular, incluso sin internet).
//
// Un producto encuentra su foto de tres maneras, en este orden:
//
//   1) Foto propia   -> la que TÚ le tomaste o subiste desde Ajustes.
//                       Se guarda en el celular, manda sobre todo lo demás.
//   2) Por CÓDIGO    -> CAB237, GAR063, BOC060... Así, aunque le cambies
//                       el nombre al producto, la foto lo sigue.
//   3) Por PALABRAS  -> para los productos que no traen código en el
//                       nombre (Earpods, HDMI, Tira Led...).
//
// Si no aparece por ninguna vía, la Vitrina muestra un recuadro con el
// nombre del producto (nunca se rompe) y desde Ajustes le puedes poner foto.

const FOTOS_POR_CODIGO = {
  // --- Los 4 principales (los que dejas a consignación) ---
  "CAB237": "cab237.webp",     // Cable Tipo C
  "CAB238": "cab238.webp",     // Cable iPhone
  "EZ-165": "ez165.webp",      // Audífono Buytiti
  "GAR063": "gar063.webp",     // Cargador de Carga Media 2 Amp

  // --- Cables ---
  "CAB236": "cab236.webp",     // Cable V8
  "CAB258": "cab258.webp",     // Cable T.C - iPhone
  "CAB252": "cab252.webp",     // Cable T.C - T.C

  // --- Cargadores ---
  "GAR128": "gar128.webp",     // Cargador Carro Doble USB
  "GAR161": "gar161.webp",     // Cargador Doble T.C y USB
  "GAR153": "gar153.webp",     // Cargador con cable T.C. a T.C.
  "GAR154": "gar154.webp",     // Cargador con cable T.C. a iPhone

  // --- Power Banks ---
  "GAR261": "gar261.webp",     // Power Bank 5,000 mAh
  "GAR148": "gar148.webp",     // Power Bank 10,000 mAh

  // --- Audífonos ---
  "AUT205": "aut205.webp",     // TWS 1 Hora
  "AUT210": "aut210.webp",     // Clip 1 Hora
  "AUT125": "aut125.webp",     // Para Tipo C
  "INPODS12": "inpods12.webp", // Inalámbricos de colores
  "AC01": "ac01.webp",         // Deportivos

  // --- Bocinas ---
  "BOC060": "boc060.webp",
  "BOC062": "boc062.webp",
  "BOC241": "boc241.webp",
  "BOC242": "boc242.webp",
  "BOC243": "boc243.webp",
  "BOC244": "boc244.webp",
  "BOC250": "boc250.webp",

  // --- Cables (los que faltaban) ---
  "CAB251": "cab251.webp",     // Cable T.C Carga Rápida 3 Amp
  "CAB259": "cab259.webp",     // Cable Pulpo (3 puntas)

  // --- Cargadores (los que faltaban) ---
  // Los que vienen en negro y blanco llevan de foto general la negra.
  "GAR151": "gar151.webp",         // Inalámbrico 1 Hora
  "GAR152": "gar152-negro.webp",   // Carga Rápida 20W
  "GAR164": "gar164-negro.webp",   // Carga Rápida 30W
  "GAR171": "gar171-negro.webp",   // Carga Rápida 45W (dos puertos)
  "GAR172": "gar172-negro.webp",   // T.C. 45W (un puerto)

  // --- Otros ---
  "XO8127": "xo8127.webp",     // Receptor Bluetooth
  "TB6323": "tb6323.webp",     // Reloj inteligente (foto del T-500)
  "PJ097": "pj097.webp",       // Soporte magnético
  "RAT001": "rat001.webp",     // Mouse inalámbrico
};

// Para los productos cuyo nombre NO trae código. Se toma la primera regla
// cuyas palabras aparezcan TODAS en el nombre del producto.
const FOTOS_POR_PALABRAS = [
  { palabras: ["reloj"],              archivo: "tb6323.webp" },  // Reloj Inteligente T-500
  { palabras: ["gtide"],              archivo: "gtide.webp" },   // Audífonos Clip On (G-TIDE)
  { palabras: ["earpods"],            archivo: "earpods.webp" },
  { palabras: ["hdmi"],               archivo: "hdmi3m.webp" },
  { palabras: ["tira", "led"],        archivo: "tiraled.webp" },
  { palabras: ["bocina", "bicicleta"], archivo: "sv01.webp" },
  // El "L22" no lo agarra el buscador de códigos (pide 2 letras y este trae
  // una sola), por eso va por palabra. De foto general lleva la negra.
  { palabras: ["l22"],                archivo: "l22-negro.webp" },
  { palabras: ["plug"],               archivo: "cableplug.webp" },
  { palabras: ["giratoria"],          archivo: "soporte-giratorio.webp" },
];


// Foto de cada COLOR. La llave es el código del producto (o una palabra de
// su nombre, para los que no traen código). Si un color no tiene su foto,
// se usa la foto normal del producto.
// OJO: el Buytiti EZ-165 NO lleva foto por color a proposito. Su foto de
// siempre muestra los cuatro colores juntos y asi la quiere Arthur.
const FOTOS_POR_COLOR = {
  "BOC060": {
    "Negro": "boc060-negro.webp",
    "Rojo": "boc060-rojo.webp"
  },
  "BOC062": {
    "Negro": "boc062-negro.webp",
    "Rojo": "boc062-rojo.webp"
  },
  "BOC242": {
    "Negro": "boc242-negro.webp",
    "Rojo": "boc242-rojo.webp"
  },
  "BOC243": {
    "Negro": "boc243-negro.webp",
    "Rojo": "boc243-rojo.webp"
  },
  "BOC244": {
    "Negro": "boc244-negro.webp",
    "Rojo": "boc244-rojo.webp"
  },
  "AC01": {
    "Negro": "ac01-negro.webp",
    "Blanco": "ac01-blanco.webp",
    "Morado": "ac01-morado.webp"
  },
  "AUT205": {
    "Negro": "aut205-negro.webp",
    "Blanco": "aut205-blanco.webp"
  },
  "gtide": {
    "Negro": "gtide-negro.webp",
    "Blanco": "gtide-blanco.webp",
    "Verde": "gtide-verde.webp",
    "Azul": "gtide-azul.webp",
    "Morado": "gtide-morado.webp"
  },
  "bicicleta": {
    "Negro": "sv01-negro.webp",
    "Blanco": "sv01-blanco.webp",
    "Rojo": "sv01-rojo.webp",
    "Azul": "sv01-azul.webp"
  },
  "GAR152": {
    "Negro": "gar152-negro.webp",
    "Blanco": "gar152-blanco.webp"
  },
  "GAR164": {
    "Negro": "gar164-negro.webp",
    "Blanco": "gar164-blanco.webp"
  },
  "GAR171": {
    "Negro": "gar171-negro.webp",
    "Blanco": "gar171-blanco.webp"
  },
  "GAR172": {
    "Negro": "gar172-negro.webp",
    "Blanco": "gar172-blanco.webp"
  },
  "l22": {
    "Negro": "l22-negro.webp",
    "Blanco": "l22-blanco.webp",
    "Lila": "l22-lila.webp",
    "Rosa": "l22-rosa.webp"
  },
  // El T-500 no trae código que el buscador reconozca, va por palabra.
  "reloj": {
    "Negro": "t500-negro.webp",
    "Naranja": "t500-naranja.webp",
    "Blanco": "t500-blanco.webp",
    "Azul": "t500-azul.webp"
  },
  "INPODS12": {
    "Negro": "inpods12-negro.webp",
    "Blanco": "inpods12-blanco.webp",
    "Gris": "inpods12-gris.webp",
    "Rosa": "inpods12-rosa.webp",
    "Azul": "inpods12-azul.webp",
    "Azul marino": "inpods12-azulmarino.webp",
    "Verde": "inpods12-verde.webp",
    "Amarillo": "inpods12-amarillo.webp"
  }
};

const CARPETA_FOTOS = "productos/";
