#!/usr/bin/env node
/* scripts/qa/revisiones.js — el refresco localizado, sin huecos.
 *
 * EL PROBLEMA. El .htaccess sirve los .js como `immutable, max-age=1yr`, salvo unos
 * pocos que van `no-store`. Para refrescar uno inmutable sin un bump global se le
 * cuelga un sufijo `&r=<rev>` puesto A MANO desde un fichero no-store. Eso funciona,
 * pero el sufijo vive repetido en cada sitio que carga ese fichero, y basta con
 * olvidarlo en uno para que esa pagina se quede con la copia vieja SIN dar ningun
 * error: la pagina funciona, con el codigo de la semana pasada.
 *
 * Paso de verdad, dos veces:
 *   - cart-runtime.js se carga desde global-assets.js Y desde una etiqueta estatica
 *     de la portada. Se subio una y no la otra.
 *   - product-attributes.js llevaba `&r=` en global-assets.js (fichas, checkout) y NO
 *     en index-head.js (portada y las tres categorias). Un arreglo del nucleo llegaba
 *     a la ficha al instante y a la portada nunca, hasta el siguiente bump global.
 *
 * QUE COMPRUEBA. No hay una tabla con los numeros —seria un segundo sitio donde
 * olvidarse—. La verdad son los propios consumidores, y de ellos se exige:
 *
 *   1. todo consumidor de un fichero inmutable lleva su `&r=`;
 *   2. todos los consumidores del MISMO fichero llevan el MISMO valor;
 *   3. un consumidor nuevo entra solo en la comprobacion, porque se descubre
 *      escaneando, no leyendo una lista.
 *
 * Lo que es inmutable se deduce del .htaccess, no se escribe aqui: si mañana se mete
 * otro fichero en el grupo no-store, esto se entera.
 *
 *     node scripts/qa/revisiones.js            (o --check, es lo mismo)
 *
 * Marcador: REVISIONES_OK / REVISIONES_KO. Salida 0 o 1.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const OMITIR = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'tmp', 'img',
  'fonts', 'uploads', '.agents', '.vscode', 'previews']);

/* ── 1. Que se sirve no-store, segun el .htaccess ───────────────────────────── */
function sinCache() {
  const ht = fs.readFileSync(path.join(RAIZ, '.htaccess'), 'utf8');
  const fuera = new Set();
  // <FilesMatch "^(a\.js|b\.json)$"> ... no-store|no-cache
  const re = /<FilesMatch\s+"([^"]+)"\s*>([\s\S]*?)<\/FilesMatch>/g;
  let m;
  while ((m = re.exec(ht)) !== null) {
    if (!/no-store|no-cache/i.test(m[2])) continue;
    const patron = m[1];
    /* OJO AL ORDEN de la alternancia: con `js` delante, «asset-version\.json» casaba
       como «asset-version.js» y dejaba el «on» suelto. Las extensiones largas van
       primero. */
    const nombres = patron.match(/[A-Za-z0-9_-]+\\?\.(?:webmanifest|json|xml|js)/g) || [];
    for (const n of nombres) fuera.add(n.replace(/\\/g, ''));
  }
  return fuera;
}

/* ── 2. Donde se carga cada .js, y con que sufijo ───────────────────────────── */
function recorrer(dir, acc) {
  acc = acc || [];
  let e;
  try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const x of e) {
    if (OMITIR.has(x.name)) continue;
    const p = path.join(dir, x.name);
    if (x.isDirectory()) recorrer(p, acc);
    else if (/\.(html|js)$/i.test(x.name)) acc.push(p);
  }
  return acc;
}

const noStore = sinCache();
const ficheros = recorrer(RAIZ);

/* Dos formas de cargar, y hay que reconocer las dos:
   a) etiqueta estatica     <script src="/js/x.js?r=REV&v=VER">
   b) construida en JS      el.src = '/js/x.js?v=' + ver + '&r=' + rev;
   En (b) el valor esta en una variable; se busca hacia atras en la misma linea o en
   las 6 anteriores la constante que la define. */
const usos = {};   // fichero.js -> [{ donde, rev|null, linea }]
const RE_RUTA = /['"]\/js\/([a-z0-9-]+\.js)((?:\?|\\?')[^'"`\n]*)?['"]/gi;

for (const p of ficheros) {
  const rel = path.relative(RAIZ, p).split(path.sep).join('/');
  if (rel.startsWith('scripts/')) continue;          // el QA no es consumidor
  const txt = fs.readFileSync(p, 'utf8');
  const lineas = txt.split('\n');

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.indexOf('/js/') === -1) continue;
    /* Una BUSQUEDA no es una carga. `querySelector('script[src*="/js/index.js"]')`
       mira si el script ya esta puesto; exigirle un `&r=` no tiene sentido y ademas
       seria contraproducente, porque el selector tiene que encontrar la etiqueta
       lleve el sufijo que lleve. Se salta tambien lo comentado. */
    if (/querySelector|matches\(|indexOf\(|includes\(/.test(l)) continue;
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
    RE_RUTA.lastIndex = 0;
    let m;
    while ((m = RE_RUTA.exec(l)) !== null) {
      const fichero = m[1];
      const cola = m[2] || '';
      let rev = null;

      // (a) sufijo literal en la propia cadena
      const lit = /[?&]r=([A-Za-z0-9._-]+)/.exec(cola);
      if (lit) rev = lit[1];

      /* (b) tercer argumento de un cargador:  cargar('/js/x.js', ver, '20260909-2')
         Es la forma que usa appendDeferredScript() en js/index-head.js, y sin esto
         el guardian decia «ninguna» de un fichero que si llevaba su revision. */
      if (!rev) {
        const escapado = fichero.replace(/[.]/g, '[.]');
        const arg = new RegExp('/js/' + escapado +
          '[\'"]\\s*,\\s*[A-Za-z_$][\\w$]*\\s*,\\s*[\'"]([A-Za-z0-9._-]+)[\'"]').exec(l);
        if (arg) rev = arg[1];
      }

      /* (c) concatenado como literal:  '/js/x.js?v=' + ver + '&r=20260909-2'
         El sufijo cae FUERA de la cadena de la ruta, asi que no lo ve el caso (a). */
      if (!rev) {
        const pegado = /[+]\s*['"]&r=([A-Za-z0-9._-]+)['"]/.exec(l);
        if (pegado) rev = pegado[1];
      }

      // (d) construido: '&r=' + variable, en esta linea o en las 6 siguientes
      if (!rev) {
        const ventana = lineas.slice(i, i + 7).join('\n');
        const cons = /['"]&r=['"]\s*\+\s*(?:encodeURIComponent\()?\s*([A-Za-z_$][\w$]*)/.exec(ventana);
        if (cons) {
          const nombre = cons[1];
          const atras = lineas.slice(Math.max(0, i - 12), i + 7).join('\n');
          const def = new RegExp('\\b' + nombre + "\\s*=\\s*['\"]([A-Za-z0-9._-]+)['\"]").exec(atras);
          rev = def ? def[1] : '(construido: ' + nombre + ')';
        }
      }
      (usos[fichero] = usos[fichero] || []).push({ donde: rel, rev, linea: i + 1 });
    }
  }
}

/* ── 3. Juicio ──────────────────────────────────────────────────────────────── */
const fallos = [];
const nombres = Object.keys(usos).sort();

console.log('no-store segun .htaccess: ' + Array.from(noStore).sort().join(', '));
console.log('');
console.log('fichero'.padEnd(26) + 'inmutable'.padEnd(11) + 'consumidores'.padEnd(14) + 'revision');
console.log('-'.repeat(92));

for (const f of nombres) {
  const inmutable = !noStore.has(f);
  const lista = usos[f];
  const revs = Array.from(new Set(lista.map((u) => u.rev).filter(Boolean)));
  const sinRev = lista.filter((u) => !u.rev);

  let estado;
  if (!inmutable) estado = '—';
  else if (revs.length === 0) estado = 'ninguna';
  else if (revs.length === 1 && sinRev.length === 0) estado = revs[0];
  else estado = revs.join(' / ') + (sinRev.length ? '  + ' + sinRev.length + ' SIN' : '');

  console.log(f.padEnd(26) + (inmutable ? 'si' : 'no (no-store)').padEnd(11) +
    String(lista.length).padEnd(14) + estado);

  if (!inmutable) continue;
  // Solo se exige revision a lo que YA la usa en algun sitio: es la señal de que ese
  // fichero se refresca a mano. Los demas viajan con el bump global y esta bien.
  if (revs.length === 0) continue;

  for (const u of sinRev) {
    fallos.push({ f, que: 'se carga SIN `&r=` desde ' + u.donde + ':' + u.linea +
      ', pero en otro sitio si lleva (' + revs.join(', ') + ')' });
  }
  if (revs.length > 1) {
    fallos.push({ f, que: 'tiene ' + revs.length + ' revisiones distintas a la vez: ' + revs.join(', ') +
      '\n      ' + lista.map((u) => u.donde + ':' + u.linea + ' -> ' + (u.rev || 'SIN')).join('\n      ') });
  }
}

console.log('-'.repeat(92));

if (fallos.length) {
  console.log('');
  for (const f of fallos) console.log('  ✗ ' + f.f + '\n      ' + f.que);
  console.log('');
  console.log('Un fichero inmutable cargado sin su `&r=` se queda con la copia vieja en esa');
  console.log('pagina, SIN dar ningun error. Sube la revision en TODOS sus consumidores a la vez.');
  console.log('REVISIONES_KO  ' + fallos.length + ' hueco(s)');
  process.exit(1);
}

console.log('REVISIONES_OK');
process.exit(0);
