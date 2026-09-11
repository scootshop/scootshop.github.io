'use strict';
// Guardian de la foto pequeña.
//
// `SCOOTSHOP_miniatura()` (data/products.js) cambia la portada de un producto por
// su medida de 400 alli donde la foto se ve pequeña: la caja de accesorios
// compatibles de la ficha (56x56), el cajon del carrito (70x70) y los resumenes de
// /checkout y /pago. La sustitucion es una regla de nombres —`1.webp` ->
// `1-400.webp`— y no puede preguntar al disco desde el navegador.
//
// Asi que se comprueba aqui: TODA portada del catalogo tiene que tener su `-400`.
// Si alguien da de alta un producto y se olvida de generar las medidas, la foto
// pequeña apuntaria a un fichero que no esta y la fila saldria sin imagen.
//
//   node scripts/qa/fotos-mini.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');

global.window = {};
require(path.join(RAIZ, 'data', 'products.js'));

const productos = global.window.SCOOTSHOP_PRODUCTS || [];
const mini = global.window.SCOOTSHOP_miniatura;

if (!productos.length) {
  console.log(' KO el catalogo no expone SCOOTSHOP_PRODUCTS');
  console.log('FOTOS_MINI_KO');
  process.exit(1);
}
if (typeof mini !== 'function') {
  console.log(' KO data/products.js no expone SCOOTSHOP_miniatura()');
  console.log('FOTOS_MINI_KO');
  process.exit(1);
}

const fallos = [];
const vistas = new Set();
let cambiadas = 0;
let intactas = 0;

for (const p of productos) {
  const portada = p.image || (p.gallery && p.gallery[0] && p.gallery[0].src) || '';
  if (!portada || vistas.has(portada)) continue;
  vistas.add(portada);

  const pequena = mini(portada);
  if (pequena === portada) {
    // No es una portada de producto (o ya trae medida): no se toca, y eso vale.
    intactas++;
    continue;
  }
  cambiadas++;
  if (!fs.existsSync(path.join(RAIZ, pequena.replace(/^\//, '')))) {
    fallos.push((p.sku || p.id || '?') + ': falta ' + pequena);
  }
  // Y la grande tiene que seguir existiendo: es el respaldo si el catalogo tarda.
  if (!fs.existsSync(path.join(RAIZ, portada.replace(/^\//, '')))) {
    fallos.push((p.sku || p.id || '?') + ': falta la portada ' + portada);
  }
}

console.log(' portadas ' + vistas.size + '  ·  con medida pequeña ' + cambiadas +
            '  ·  sin tocar ' + intactas);

if (fallos.length) {
  fallos.slice(0, 20).forEach((f) => console.log(' KO ' + f));
  if (fallos.length > 20) console.log(' KO ... y ' + (fallos.length - 20) + ' mas');
  console.log(' generalas con: python scripts/completar-fotos.py');
  console.log('FOTOS_MINI_KO');
  process.exit(1);
}

console.log('FOTOS_MINI_OK');
