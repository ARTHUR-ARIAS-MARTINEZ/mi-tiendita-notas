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

  // --- Otros ---
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
];

const CARPETA_FOTOS = "productos/";
