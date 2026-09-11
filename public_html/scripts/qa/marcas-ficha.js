#!/usr/bin/env node
/* scripts/qa/marcas-ficha.js — la marca que enseña una ficha es la que declara el catalogo.
 *
 * POR QUE EXISTE: 21 fichas de JOYOR, KUKIRIN, Ecoxtrem y ETRIC decian «ROVORON ·
 * ficha tecnica» debajo de su titular, y ademas declaraban `"brand":"ROVORON"` en el
 * JSON-LD, que es lo que leen Google y las fichas de producto de los buscadores.
 * Venian de las altas en lote, que copiaron una ficha ROVORON existente. Nadie lo
 * comprobaba, asi que cada alta nueva podia repetirlo.
 *
 * LA MARCA SE AFIRMA EN DOS SITIOS y los dos tienen que decir lo mismo:
 *   1. el subtitulo visible   <div class="subtitle">JOYOR · ficha tecnica</div>
 *   2. el JSON-LD             "brand":{"@type":"Brand","name":"JOYOR"}
 *
 * LA REGLA ES ESTRECHA A PROPOSITO. El subtitulo NO siempre nombra una marca: en 49 de
 * las 79 fichas lleva la serie o texto comercial —«Serie N · 800W · 48V 13Ah», «Ruedas
 * 12" · Suspension · Frenos de disco», «11 pulgadas · tubeless»—, y eso es correcto.
 * Solo se exige que coincida cuando el primer tramo ES el nombre de una marca del
 * catalogo. Con la regla ancha («el primer tramo debe ser la marca») saltaban 70 de 79
 * fichas, casi todas bien: un guardian que grita siempre no lo mira nadie.
 *
 * El JSON-LD si se exige SIEMPRE que exista, porque ahi `brand` significa una sola cosa.
 *
 * La fuente es `brand` en data/products.js, que lo declaran los 79 productos. Este
 * guardian NO reescribe nada: solo compara y falla.
 *
 *     node scripts/qa/marcas-ficha.js
 *
 * Marcador: MARCAS_FICHA_OK / MARCAS_FICHA_KO. Salida 0 o 1.
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const ZONAS = ['patinetes', 'accesorios', 'motos', 'bicicletas', 'repuestos'];

/* El catalogo se lee corriendolo de verdad en un sandbox, igual que hace
   scripts/build-attributes-index.js: es un IIFE que publica en `window`, y leerlo con
   expresiones regulares seria tener un segundo interprete del mismo fichero. */
function leerCatalogo() {
  const ctx = {
    window: {},
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
  };
  ctx.self = ctx.globalThis = ctx.window;
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  // La capa operativa va antes que el catalogo, como en el navegador.
  try { vm.runInContext(fs.readFileSync(path.join(RAIZ, 'data/product-overrides.js'), 'utf8'), ctx); } catch (_) {}
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'data/products.js'), 'utf8'), ctx);
  return ctx.window.SCOOTSHOP_PRODUCTS || [];
}

function fichasDe(dir, acc) {
  acc = acc || [];
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const e of entradas) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fichasDe(p, acc);
    else if (e.name === 'index.html') acc.push(p);
  }
  return acc;
}

const productos = leerCatalogo();
if (!productos.length) {
  console.log('No se ha podido leer el catalogo.');
  console.log('MARCAS_FICHA_KO');
  process.exit(1);
}

const porRuta = Object.create(null);
const MARCAS = new Set();
for (const p of productos) {
  if (p.href) porRuta[String(p.href).replace(/\/+$/, '') + '/'] = p;
  if (p.brand) MARCAS.add(String(p.brand).trim().toUpperCase());
}

let fichas = [];
for (const z of ZONAS) fichas = fichas.concat(fichasDe(path.join(RAIZ, z)));
// Una ficha cuelga de zona/carpeta/: zona/index.html es la pagina de categoria.
fichas = fichas
  .map((f) => path.relative(RAIZ, f).split(path.sep).join('/'))
  .filter((f) => f.split('/').length > 2)
  .sort();

const fallos = [];
let conSubtitulo = 0;
let afirmanMarca = 0;
let conJsonLd = 0;
let sinCatalogo = 0;

for (const rel of fichas) {
  const html = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const producto = porRuta['/' + path.dirname(rel) + '/'];
  if (!producto) { sinCatalogo++; continue; }
  const marca = String(producto.brand || '').trim();
  if (!marca) {
    fallos.push({ rel, que: 'el catalogo no declara brand para este producto' });
    continue;
  }

  const mSub = html.match(/<div class="subtitle">([^<]*)<\/div>/);
  if (mSub) {
    conSubtitulo++;
    const primero = mSub[1].split('·')[0].trim();
    if (MARCAS.has(primero.toUpperCase())) {
      afirmanMarca++;
      if (primero.toUpperCase() !== marca.toUpperCase()) {
        fallos.push({ rel, que: 'el subtitulo dice «' + primero + '» y el catalogo dice «' + marca + '»' });
      }
    }
  }

  /* EL BLOQUE TIENE QUE SER JSON VALIDO, y se comprueba ANTES que la marca.
     Si no parsea, Google descarta el bloque ENTERO en silencio: ni marca, ni precio,
     ni disponibilidad. Y aqui la marca se busca con una expresion regular, que
     encuentra el valor igual en un JSON roto — o sea que sin esta comprobacion el
     guardian daba por buena una ficha invisible para el buscador. Paso de verdad:
     a patinetes/series-gt/gt9 le faltaba una coma antes de "offers". */
  const bloques = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  for (const b of bloques) {
    const txt = b.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    try {
      JSON.parse(txt);
    } catch (e) {
      fallos.push({ rel, que: 'el JSON-LD no es JSON valido: ' + String(e.message).slice(0, 70) });
    }
  }

  const mLd = html.match(/"brand"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]*)"/);
  if (mLd) {
    conJsonLd++;
    const enLd = mLd[1].trim();
    if (enLd.toUpperCase() !== marca.toUpperCase()) {
      fallos.push({ rel, que: 'el JSON-LD dice «' + enLd + '» y el catalogo dice «' + marca + '»' });
    }
  }
}

console.log(fichas.length + ' fichas · ' + conSubtitulo + ' con subtitulo (' + afirmanMarca + ' afirman marca) · ' + conJsonLd + ' con JSON-LD');
if (sinCatalogo) console.log(sinCatalogo + ' ficha(s) sin producto en el catalogo: no se comprueban.');

if (fallos.length) {
  console.log('');
  for (const f of fallos) console.log('  ✗ ' + f.rel + '\n      ' + f.que);
  console.log('');
  console.log('La marca sale de `brand` en data/products.js. Si la buena es la de la ficha,');
  console.log('se cambia el catalogo; si no, se cambia la ficha. Pero tienen que coincidir.');
  console.log('MARCAS_FICHA_KO  ' + fallos.length + ' desacuerdo(s)');
  process.exit(1);
}

console.log('MARCAS_FICHA_OK');
process.exit(0);
