// Catálogo inicial de productos, tomado de tu Bitácora de Ventas Tienditas.
//
//   costo         = lo que TÚ PAGAS por el producto
//   precio        = "Precio Cliente": lo que te paga la tiendita (es el que usa la app)
//   precioUsuario = "Precio Usuario": el precio de etiqueta, al que la tiendita
//                   se lo vende al consumidor final. Es informativo/sugerido:
//                   NO se usa para cobrar ni para calcular tu utilidad.
//
//   utilidad bruta de Arthur = precio - costo
//   ganancia de la tiendita  = precioUsuario - precio
//
// Esto solo se usa la PRIMERA vez que abres la app en un celular nuevo.
// Después, tú puedes agregar / editar / borrar productos desde "Ajustes > Productos"
// y tus cambios se guardan en tu celular (no aquí).
const CATALOGO_DEFAULT = [
  { nombre: "Cable Tipo C CAB237", precio: 35, costo: 8.8, precioUsuario: 50 },
  { nombre: "Cable iPhone CAB238", precio: 35, costo: 8.8, precioUsuario: 50 },
  { nombre: "Cable V8 CAB236", precio: 50, costo: 9.5, precioUsuario: 65 },
  { nombre: "Audífono Buytiti EZ-165", precio: 35, costo: 7, precioUsuario: 50 },
  { nombre: "Cargador de Carga Media 2 Amp GAR063", precio: 35, costo: 15, precioUsuario: 50 },
  { nombre: "Reloj Inteligente TB6323", precio: 210, costo: 120, precioUsuario: 260 },
  { nombre: "Audífonos Inalámbricos TWS 1 Hora AUT205", precio: 220, costo: 130.5, precioUsuario: 270 },
  { nombre: "Audífonos Clip 1 Hora AUT210", precio: 250, costo: 155, precioUsuario: 300 },
  { nombre: "Power Bank con Cables 5000 mAh GAR261", precio: 190, costo: 104, precioUsuario: 245 },
  { nombre: "Power Bank con Cables 10,000 mAh GAR148", precio: 220, costo: 134, precioUsuario: 270 },
  { nombre: "Cable T.C Carga Rápida 3 Amp CAB251", precio: 50, costo: 11, precioUsuario: 65 },
  { nombre: "Cargador Carro Doble USB 2 Amp GAR128", precio: 50, costo: 16, precioUsuario: 65 },
  { nombre: "Soporte Magnético para Celular PJ097", precio: 50, costo: 16, precioUsuario: 65 },
  { nombre: "Cable T.C - iPhone CAB258", precio: 50, costo: 18.5, precioUsuario: 65 },
  { nombre: "Cable T.C - T.C CAB252", precio: 50, costo: 13.5, precioUsuario: 65 },
  { nombre: "Cable Pulpo CAB259", precio: 80, costo: 27.5, precioUsuario: 120 },
  { nombre: "Cargador Doble T.C y USB GAR161", precio: 80, costo: 46, precioUsuario: 100 },
  { nombre: "Mouse Inalámbrico RAT001", precio: 105, costo: 58.5, precioUsuario: 135 },
  { nombre: "Audífonos Inalámbricos de Colores INPODS12", precio: 120, costo: 45, precioUsuario: 150 },
  { nombre: "Audífonos Clip On (G-TIDE)", precio: 250, costo: 118, precioUsuario: 300 },
  { nombre: "Cable HDMI 3 M", precio: 50, costo: 24, precioUsuario: 65 },
  { nombre: "Tira Led de 5 Mts", precio: 125, costo: 69, precioUsuario: 160 },
  { nombre: "Bocina BOC060", precio: 255, costo: 165, precioUsuario: 310 },
  { nombre: "Bocina BOC062", precio: 210, costo: 113.5, precioUsuario: 275 },
  { nombre: "Bocina BOC241", precio: 400, costo: 232, precioUsuario: 510 },
  { nombre: "Bocina BOC242", precio: 300, costo: 171, precioUsuario: 390 },
  { nombre: "Bocina BOC243", precio: 215, costo: 135.5, precioUsuario: 260 },
  { nombre: "Bocina BOC244", precio: 260, costo: 140.5, precioUsuario: 340 },
  { nombre: "Bocina BOC250", precio: 600, costo: 335.5, precioUsuario: 780 },
  { nombre: "Audífonos Earpods (para iPhone)", precio: 70, costo: 39.5, precioUsuario: 90 },
  { nombre: "Audífonos (para T.C.) AUT125", precio: 70, costo: 37, precioUsuario: 90 },
  { nombre: "Cargador Con Cable T.C. a T.C. GAR153", precio: 80, costo: 43, precioUsuario: 100 },
  { nombre: "Cargador Con Cable T.C. a iPhone GAR154", precio: 80, costo: 46, precioUsuario: 100 },
  { nombre: "Cargador Carga Rápida 20W GAR152", precio: 80, costo: 32.5, precioUsuario: 120 },
  { nombre: "Cargador Carga Rápida 30W GAR164", precio: 130, costo: 55.5, precioUsuario: 180 },
  { nombre: "Cargador Carga Rápida 45W GAR171", precio: 210, costo: 101.5, precioUsuario: 250 },
  { nombre: "Receptor Bluetooth XO8127", precio: 65, costo: 32, precioUsuario: 85 },
  { nombre: "Soporte Universal Con Base Giratoria (Base Metal)", precio: 45, costo: 21.5, precioUsuario: 60 },
  { nombre: "Bocina Inalámbrica para Bicicleta (Min. 5 pz)", precio: 210, costo: 122, precioUsuario: 260 },
  { nombre: "Audífonos Deportivos (Min. 5 pz) AC01", precio: 210, costo: 99, precioUsuario: 260 },
  { nombre: "Audífonos Chicos Colores L22 (5 pz)", precio: 160, costo: 89, precioUsuario: 190 },
];
