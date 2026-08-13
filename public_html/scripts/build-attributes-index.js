/* scripts/build-attributes-index.js
 *
 * DERIVACION, NO SEGUNDO NUCLEO.
 *
 * El servidor (api/index.php) tambien tiene que poder escribir "Modelo: G2 PRO VMP"
 * cuando le toca pintar un pedido antiguo. La tentacion es escribir en PHP las mismas
 * reglas que ya estan en js/product-attributes.js; eso serian DOS nucleos evolucionando
 * por separado, que es justo el problema que esta refactorizacion elimina.
 *
 * En vez de eso, este script EJECUTA el catalogo real (data/products.js, que es la
 * unica fuente de verdad) junto con el nucleo real (js/product-attributes.js) en un
 * `window` de mentira, y vuelca lo que el nucleo resuelve:
 *
 *   data/attributes-index.json
 *   { "labels": { "color": "Color", ... },
 *     "products": { "<SKU>": { "href": "...", "axes": [ { key, label, options:{k:label} } ] } },
 *     "byHref":   { "/patinetes/...": "<SKU>" } }
 *
 * Nadie escribe a mano ese JSON. Si cambia el catalogo, se regenera:
 *
 *   node scripts/build-attributes-index.js            (escribe)
 *   node scripts/build-attributes-index.js --check    (falla si esta desincronizado)
 *
 * El --check es el guardian: un catalogo tocado sin regenerar el indice deja al
 * servidor con etiquetas viejas, y eso se ve en un email meses despues.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.join(RAIZ, 'data', 'attributes-index.json');

function cargarEnSandbox() {
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
  sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;
  sandbox.window.setTimeout = sandbox.setTimeout;
  sandbox.self = sandbox.window;
  vm.createContext(sandbox);

  for (const rel of ['data/products.js', 'js/product-attributes.js']) {
    const codigo = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    vm.runInContext(codigo, sandbox, { filename: rel });
  }
  return sandbox.window;
}

function construir() {
  const win = cargarEnSandbox();
  const SS = win.SS_ATTRS;
  const productos = win.SCOOTSHOP_PRODUCTS || [];
  if (!SS || !productos.length) {
    throw new Error('el catalogo o el nucleo no se cargaron (productos=' + productos.length + ')');
  }

  const salida = { labels: SS.ETIQUETAS || {}, products: {}, byHref: {} };
  const ordenados = productos.slice().sort((a, b) => String(a.sku || '').localeCompare(String(b.sku || '')));

  for (const p of ordenados) {
    const sku = String(p.sku || '').trim();
    if (!sku) continue;
    const ejes = SS.ejes(p).map(e => {
      const options = {};
      e.options.forEach(o => { options[o.key] = o.label || o.key; });
      return { key: e.key, label: e.label, type: e.type, options };
    });
    const href = String(p.href || '').trim();
    // La foto va aquí para que el servidor no necesite un segundo catálogo: era lo
    // único que le quedaba por resolver de data/products-server.js.
    const image = String(p.image || '').trim();
    salida.products[sku] = { href, image, axes: ejes };
    if (href) salida.byHref[href.replace(/\/+$/, '')] = sku;
  }
  return salida;
}

function serializar(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function main() {
  const comprobar = process.argv.includes('--check');
  let generado;
  try {
    generado = serializar(construir());
  } catch (err) {
    console.error('ATTRS_INDEX_KO  ' + err.message);
    process.exit(1);
  }

  if (comprobar) {
    const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
    if (actual !== generado) {
      console.error('ATTRS_INDEX_KO  data/attributes-index.json esta desincronizado con data/products.js.');
      console.error('                Ejecuta: node scripts/build-attributes-index.js');
      process.exit(1);
    }
    const n = Object.keys(JSON.parse(generado).products).length;
    console.log('ATTRS_INDEX_OK  ' + n + ' productos, indice sincronizado.');
    return;
  }

  fs.writeFileSync(SALIDA, generado, 'utf8');
  const datos = JSON.parse(generado);
  const conEjes = Object.values(datos.products).filter(p => p.axes.length).length;
  console.log('ATTRS_INDEX_OK  escrito data/attributes-index.json — ' +
    Object.keys(datos.products).length + ' productos, ' + conEjes + ' con ejes.');
}

main();
