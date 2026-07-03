# Notas de Venta — Mi Tiendita Express

App web (PWA) para capturar las ventas de la ruta de consignación e imprimir
un ticket en la impresora térmica **Easytime MP210** (Bluetooth).

## Características
- Genera notas/tickets con logo del negocio arriba y datos de contacto abajo.
- Imprime por **Bluetooth directo** a la MP210 (formato ESC/POS, 58 mm).
- Guarda **clientes/tienditas** (nombre, WhatsApp, dirección) y su historial de ventas.
- Catálogo de productos editable con precios.
- Bloqueo con **PIN** opcional y **respaldo** exportable (JSON).
- Instalable en el celular (Android/Chrome) como app de pantalla de inicio.

## Privacidad
No hay servidor ni base de datos en línea. **Todos los datos se guardan solo en
el celular** (localStorage del navegador). Este código es público pero **no
contiene ningún dato de clientes ni contraseñas** — no hay nada que filtrar.

## Cómo se usa
1. Abre la app en Chrome (Android).
2. En **Ajustes → Impresora**, toca "Conectar" y elige la MP210.
3. En **Nota**, agrega productos, pon el cliente y toca "Generar e Imprimir".

## Tecnología
HTML + CSS + JavaScript puro (sin frameworks). Web Bluetooth para imprimir.
Service Worker para funcionar sin internet.
