// Catálogo inicial de productos, tomado de tu Bitácora de Ventas Tienditas
// y sincronizado con el Cotizador de Compras (que es donde llevas los costos
// y los precios al día).
//
//   costo         = lo que TÚ PAGAS por el producto
//   precio        = "Precio Cliente": lo que te paga la tiendita (es el que usa la app)
//   precioUsuario = "Precio Usuario": el precio de etiqueta, al que la tiendita
//                   se lo vende al consumidor final. Es informativo/sugerido:
//                   NO se usa para cobrar ni para calcular tu utilidad.
//   colores       = si el producto viene en varios colores, aquí van. Cada
//                   color lleva su PROPIA cuenta de piezas.
//   proveedor     = a quién se lo compras (Chinos, Buytiti, GDL, G Tide).
//                   Sirve para que "Rotación › Qué resurtir" te arme el pedido
//                   separado por proveedor.
//
//   utilidad bruta de Arthur = precio - costo
//   ganancia de la tiendita  = precioUsuario - precio
//
// Esto solo se usa la PRIMERA vez que abres la app en un celular nuevo.
// Después, tú puedes agregar / editar / borrar productos desde "Ajustes > Productos"
// y tus cambios se guardan en tu celular (no aquí).
//
// Para actualizar precios sin capturarlos dos veces: en el Cotizador de Compras
// usa "📲 Enviar precios a la app" y aquí en Ajustes "🔗 Traer precios del Cotizador".
const CATALOGO_DEFAULT = [
  // ----- Chinos (2) -----
  { nombre: "Cable Tipo C CAB237", precio: 35, costo: 8.8, precioUsuario: 50, proveedor: "Chinos" },
  { nombre: "Cable iPhone CAB238", precio: 35, costo: 8.8, precioUsuario: 50, proveedor: "Chinos" },
  // ----- Buytiti (1) -----
  { nombre: "Audífono Buytiti EZ-165", precio: 35, costo: 7, precioUsuario: 50, proveedor: "Buytiti", colores: ["Negro", "Rojo", "Blanco", "Verde", "Azul"] },
  // ----- GDL (35) -----
  { nombre: "Cable V8 CAB236", precio: 50, costo: 9.5, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Cargador de Carga Media 2 Amp GAR063", precio: 35, costo: 15, precioUsuario: 50, proveedor: "GDL" },
  { nombre: "Reloj Inteligente T-500", precio: 210, costo: 120, precioUsuario: 260, proveedor: "GDL", colores: ["Negro", "Naranja", "Blanco", "Azul"] },
  { nombre: "Audífonos Inalámbricos TWS 1 Hora AUT205", precio: 220, costo: 130.5, precioUsuario: 270, proveedor: "GDL", colores: ["Negro", "Blanco"] },
  { nombre: "Audífonos Clip 1 Hora AUT210", precio: 250, costo: 155, precioUsuario: 300, proveedor: "GDL" },
  { nombre: "Power Bank con Cables 5000 mAh GAR261", precio: 190, costo: 104, precioUsuario: 245, proveedor: "GDL" },
  { nombre: "Power Bank con Cables 10,000 mAh GAR148", precio: 220, costo: 134, precioUsuario: 270, proveedor: "GDL" },
  { nombre: "Cable T.C Carga Rápida 3 Amp CAB251", precio: 50, costo: 11, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Cargador Carro Doble USB 2 Amp GAR128", precio: 50, costo: 16, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Soporte Magnético para Celular PJ097", precio: 50, costo: 16, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Cable T.C - iPhone CAB258", precio: 50, costo: 18.5, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Cable T.C - T.C CAB252", precio: 50, costo: 13.5, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Cable Pulpo CAB259", precio: 80, costo: 27.5, precioUsuario: 120, proveedor: "GDL" },
  { nombre: "Cargador Doble T.C y USB GAR161", precio: 80, costo: 40.5, precioUsuario: 100, proveedor: "GDL" },
  { nombre: "Mouse Inalámbrico RAT001", precio: 105, costo: 58.5, precioUsuario: 135, proveedor: "GDL" },
  { nombre: "Audífonos Inalámbricos de Colores INPODS12", precio: 120, costo: 45, precioUsuario: 150, proveedor: "GDL", colores: ["Negro", "Blanco", "Gris", "Rosa", "Azul", "Azul marino", "Verde", "Amarillo"] },
  { nombre: "Cable HDMI 3 M", precio: 50, costo: 24, precioUsuario: 65, proveedor: "GDL" },
  { nombre: "Tira Led de 5 Mts", precio: 125, costo: 69, precioUsuario: 160, proveedor: "GDL" },
  { nombre: "Bocina BOC060", precio: 255, costo: 165, precioUsuario: 310, proveedor: "GDL", colores: ["Negro", "Rojo"] },
  { nombre: "Bocina BOC062", precio: 210, costo: 113.5, precioUsuario: 275, proveedor: "GDL", colores: ["Negro", "Rojo"] },
  { nombre: "Bocina BOC241", precio: 400, costo: 232, precioUsuario: 510, proveedor: "GDL" },
  { nombre: "Bocina BOC242", precio: 300, costo: 171, precioUsuario: 390, proveedor: "GDL", colores: ["Negro", "Rojo"] },
  { nombre: "Bocina BOC243", precio: 215, costo: 135.5, precioUsuario: 260, proveedor: "GDL", colores: ["Negro", "Rojo"] },
  { nombre: "Bocina BOC244", precio: 260, costo: 140.5, precioUsuario: 340, proveedor: "GDL", colores: ["Negro", "Rojo"] },
  { nombre: "Bocina BOC250", precio: 600, costo: 335.5, precioUsuario: 780, proveedor: "GDL" },
  { nombre: "Audífonos Earpods (para iPhone)", precio: 70, costo: 39.5, precioUsuario: 90, proveedor: "GDL" },
  { nombre: "Audífonos (para T.C.) AUT125", precio: 70, costo: 37, precioUsuario: 90, proveedor: "GDL" },
  { nombre: "Cargador Con Cable T.C. a T.C. GAR153", precio: 80, costo: 43, precioUsuario: 100, proveedor: "GDL" },
  { nombre: "Cargador Con Cable T.C. a iPhone GAR154", precio: 80, costo: 46, precioUsuario: 100, proveedor: "GDL" },
  { nombre: "Cargador Carga Rápida 20W GAR152", precio: 80, costo: 32.5, precioUsuario: 120, proveedor: "GDL" },
  { nombre: "Cargador Carga Rápida 30W GAR164", precio: 130, costo: 55.5, precioUsuario: 160, proveedor: "GDL" },
  { nombre: "Cargador T.C. 45W GAR172", precio: 150, costo: 66, precioUsuario: 180, proveedor: "GDL" },
  { nombre: "Cargador Carga Rápida 45W GAR171", precio: 210, costo: 101.5, precioUsuario: 250, proveedor: "GDL" },
  { nombre: "Receptor Bluetooth XO8127", precio: 65, costo: 32, precioUsuario: 85, proveedor: "GDL" },
  { nombre: "Soporte Universal Con Base Giratoria (Base Metal)", precio: 45, costo: 21.5, precioUsuario: 60, proveedor: "GDL" },
  { nombre: "Cargador Inalámbrico 1 Hora GAR151", precio: 180, costo: 85.5, precioUsuario: 220, proveedor: "GDL" },
  // ----- G Tide (4) -----
  { nombre: "Audífonos Clip On (G-TIDE)", precio: 250, costo: 118, precioUsuario: 300, proveedor: "G Tide", colores: ["Negro", "Blanco", "Verde", "Azul", "Morado"] },
  { nombre: "Bocina Inalámbrica para Bicicleta (Min. 5 pz)", precio: 210, costo: 122, precioUsuario: 260, proveedor: "G Tide", colores: ["Negro", "Blanco", "Rojo", "Azul"] },
  { nombre: "Audífonos Deportivos (Min. 5 pz) AC01", precio: 210, costo: 99, precioUsuario: 260, proveedor: "G Tide", colores: ["Negro", "Blanco", "Morado"] },
  { nombre: "Audífonos Chicos Colores L22 (5 pz)", precio: 160, costo: 89, precioUsuario: 190, proveedor: "G Tide" },
];
