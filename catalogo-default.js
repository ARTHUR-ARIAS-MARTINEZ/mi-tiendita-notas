// Catálogo inicial de productos, tomado de tu Bitácora de Ventas Tienditas.
//
//   precio = lo que TE PAGA la tiendita (tu "Precio Cliente")
//   costo  = lo que TÚ PAGASTE por el producto
//   utilidad bruta = precio - costo
//
// Los costos vienen de "Respaldo_Bitacora_completo.json" (campo "costo").
// Los productos con costo null son los que NO tenían costo registrado ahí:
// puedes capturarlos desde "Ajustes > Catálogo de productos".
//
// Esto solo se usa la PRIMERA vez que abres la app en un celular nuevo.
// Después, tú puedes agregar / editar / borrar productos desde "Ajustes > Productos"
// y tus cambios se guardan en tu celular (no aquí).
const CATALOGO_DEFAULT = [
  { nombre: "Cable Tipo C CAB237", precio: 35, costo: 8.8 },
  { nombre: "Cable iPhone CAB238", precio: 35, costo: 8.8 },
  { nombre: "Cable V8 CAB236", precio: 50, costo: 9.5 },
  { nombre: "Audífono Buytiti EZ-165", precio: 35, costo: 6 },
  { nombre: "Cargador de Carga Media 2 Amp GAR063", precio: 35, costo: 13 },
  { nombre: "Reloj Inteligente TB6323", precio: 210, costo: 120 },
  { nombre: "Audífonos Inalámbricos TWS 1 Hora AUT205", precio: 220, costo: 130.5 },
  { nombre: "Audífonos Clip 1 Hora AUT210", precio: 250, costo: 155 },
  { nombre: "Power Bank con Cables 5000 mAh GAR261", precio: 160, costo: 104 },
  { nombre: "Power Bank con Cables 10,000 mAh GAR148", precio: 220, costo: 134 },
  { nombre: "Cable T.C Carga Rápida 3 Amp CAB251", precio: 50, costo: 11 },
  { nombre: "Cargador Carro Doble USB 2 Amp GAR128", precio: 50, costo: 16 },
  { nombre: "Soporte Magnético para Celular PJ097", precio: 50, costo: 16 },
  { nombre: "Cable T.C - iPhone CAB258", precio: 50, costo: 18.5 },
  { nombre: "Cable T.C - T.C CAB252", precio: 50, costo: 13.5 },
  { nombre: "Cargador Doble T.C y USB GAR161", precio: 80, costo: 46 },
  { nombre: "Mouse Inalámbrico RAT001", precio: 96, costo: 58.5 },
  { nombre: "Audífonos Inalámbricos de Colores INPODS12", precio: 120, costo: 45 },
  { nombre: "Audífonos Clip On (G-TIDE)", precio: 250, costo: 122 },
  { nombre: "Cable HDMI 3 M", precio: 50, costo: 24 },
  { nombre: "Tira Led de 5 Mts", precio: 105, costo: 69 },
  { nombre: "Bocina BOC060", precio: 250, costo: 165 },
  { nombre: "Bocina BOC062", precio: 180, costo: 113.5 },
  { nombre: "Bocina BOC241", precio: 350, costo: 232 },
  { nombre: "Bocina BOC242", precio: 260, costo: 171 },
  { nombre: "Bocina BOC243", precio: 210, costo: 135.5 },
  { nombre: "Bocina BOC244", precio: 220, costo: 140.5 },
  { nombre: "Bocina BOC250", precio: 520, costo: 335.5 },
  { nombre: "Audífonos Earpods (para iPhone)", precio: 60, costo: 39.5 },
  { nombre: "Audífonos (para T.C.) AUT125", precio: 60, costo: 37 },
  { nombre: "Cargador Con Cable T.C. a T.C. GAR153", precio: 80, costo: 43 },
  { nombre: "Cargador Con Cable T.C. a iPhone GAR154", precio: 80, costo: 46 },
  { nombre: "Bocina Inalámbrica para Bicicleta (Min. 5 pz)", precio: 210, costo: null },
  { nombre: "Audífonos Deportivos (Min. 5 pz) AC01", precio: 210, costo: null },
];
