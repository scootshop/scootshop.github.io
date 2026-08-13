/* scripts/qa/catalogo.js
 *
 * EL CATÁLOGO, VALIDADO SIN NAVEGADOR.
 *
 * `data/products.js` se edita a mano y, además, el panel de administración lo parchea
 * con expresiones regulares (precio, stock, alta y baja de productos). Es la pieza más
 * frágil del sistema: un paréntesis de más, una clave duplicada o un `compatibleSkus`
 * apuntando a un SKU que ya no existe rompen la web entera y no se nota hasta que
 * alguien abre una ficha.
 *
 * Esto lo ejecuta de verdad —en un `window` de mentira— y aplica el validador que el
 * propio catálogo trae: ejes con clave única, imágenes que existen en la galería, una
 * sola opción por defecto, accesorios con familia declarada y compatibilidades que
 * apuntan a algo real.
 *
 *   node scripts/qa/catalogo.js
 *
 * Marcador: CATALOGO_OK / CATALOGO_KO.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');

function cargar() {
  const sandbox = {
    window: {},
    document: {
      querySelector() { return null; },
      addEventListener() {},
      dispatchEvent() {},
      readyState: 'complete'
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    CustomEvent: function () {},
    console
  };
  sandbox.window.document = sandbox.document;
  sandbox.window.addEventListener = () => {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'data', 'products.js'), 'utf8'), sandbox, { filename: 'data/products.js' });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'product-attributes.js'), 'utf8'), sandbox, { filename: 'js/product-attributes.js' });
  return sandbox.window;
}

let win;
try {
  win = cargar();
} catch (err) {
  console.error('CATALOGO_KO  el catálogo no se puede ni ejecutar: ' + err.message);
  process.exit(1);
}

const productos = win.SCOOTSHOP_PRODUCTS || [];
if (!productos.length) {
  console.error('CATALOGO_KO  el catálogo se ejecuta pero no expone productos.');
  process.exit(1);
}

const informe = win.SCOOTSHOP_validateCatalogColors();
const conEjes = productos.filter(p => win.SS_ATTRS.ejes(p).length).length;
const accesorios = productos.filter(p => p.catalogType === 'accessory').length;

console.log('productos: ' + productos.length + '  ·  con ejes: ' + conEjes + '  ·  accesorios: ' + accesorios);

/* Comprobación que el validador del catálogo no puede hacer por sí solo: que las rutas
   de las fichas existan en el disco. Un `href` mal escrito pasa todos los tests de
   datos y se manifiesta como un 404 en el menú. */
const sinFicha = [];
for (const p of productos) {
  const href = String(p.href || '').trim();
  if (!href || !href.startsWith('/')) continue;
  const carpeta = path.join(RAIZ, href.replace(/^\/+/, '').replace(/\/+$/, ''));
  if (!fs.existsSync(path.join(carpeta, 'index.html'))) sinFicha.push(p.sku + ' -> ' + href);
}

for (const w of informe.warnings) console.log('  aviso: ' + w);
for (const e of informe.errors) console.log('  ERROR: ' + e);
for (const f of sinFicha) console.log('  ERROR: ficha inexistente ' + f);

if (informe.errors.length || sinFicha.length) {
  console.log('CATALOGO_KO  ' + (informe.errors.length + sinFicha.length) + ' problemas');
  process.exit(1);
}
console.log('CATALOGO_OK');
