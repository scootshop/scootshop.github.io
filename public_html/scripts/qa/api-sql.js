/* scripts/qa/api-sql.js
 *
 * LOS PLACEHOLDERS DE CADA SQL, CONTRA SUS BINDINGS.
 *
 * `api/index.php` escribe el INSERT y el UPDATE de un pedido CUATRO veces —creación
 * manual, Stripe, y sus dos variantes de reanudación— con la lista de bindings copiada
 * a mano en cada uno. Es la duplicación más cara del proyecto: añadir una columna
 * significa acordarse de tocar los cuatro sitios, y olvidarse de uno no rompe nada
 * hasta que un cliente paga y PDO revienta con "Invalid parameter number".
 *
 * Reescribir esas cuatro sentencias a mano, sin poder ejecutar un pago de verdad, es
 * más peligroso que la duplicación. Así que en vez de tocarlas se comprueba lo único
 * que de verdad importa: que cada sentencia y su ejecución digan lo mismo.
 *
 *   node scripts/qa/api-sql.js
 *
 * Marcador: API_SQL_OK / API_SQL_KO.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FICHERO = path.resolve(__dirname, '..', '..', 'api', 'index.php');
const php = fs.readFileSync(FICHERO, 'utf8');
const lineas = php.split('\n');

/* Se recorre el fichero buscando `prepare(` y, a partir de ahí, la sentencia y el
   `execute([...])` que le sigue. No es un parser de PHP: es exactamente el trozo de
   estructura que hace falta, y si algún día deja de casar, este guardián lo dice en
   vez de callarse. */
function bloques() {
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    if (!/->prepare\(/.test(lineas[i])) continue;
    const trozo = lineas.slice(i, Math.min(i + 120, lineas.length)).join('\n');
    const fin = trozo.indexOf('->execute(');
    if (fin === -1) continue;
    const hasta = trozo.slice(0, fin);
    /* Cada `prepare` con SU `execute`: si entre medias empieza otra sentencia, esta no
       es la que se ejecuta ahí y emparejarlas daba fallos que no existían. */
    if (hasta.indexOf('->prepare(') !== hasta.lastIndexOf('->prepare(')) continue;
    /* Y la SQL es SOLO lo que hay dentro del `prepare(...)`. Cogiendo todo lo que había
       hasta el `execute` se colaba el PHP de en medio: un `gmdate('Y-m-d H:i:s')`
       aportaba los "placeholders" :i y :s y la sentencia salía descuadrada. */
    const desdePrepare = hasta.slice(hasta.indexOf('->prepare('));
    const finPrepare = desdePrepare.indexOf(');');
    const sql = finPrepare === -1 ? desdePrepare : desdePrepare.slice(0, finPrepare);
    const resto = trozo.slice(fin);
    /* Y el final del `execute` es el PRIMER cierre que aparezca: quedarse con el
       multilínea cuando había uno de una sola línea antes arrastraba los bindings de
       la sentencia siguiente. */
    const cierres = [resto.indexOf(']);'), resto.indexOf('\n    ]);')].filter(x => x !== -1);
    const cierre = cierres.length ? Math.min.apply(null, cierres) : resto.length;
    out.push({ linea: i + 1, sql: sql, exec: resto.slice(0, cierre) });
  }
  return out;
}

let revisados = 0;
let saltadas = 0;
let fallos = 0;

for (const b of bloques()) {
  // Solo interesan las que usan placeholders con nombre y una lista literal.
  const usados = new Set((b.sql.match(/:[a-z_][a-z0-9_]*/gi) || []).map(x => x.slice(1)));
  const dados = new Set((b.exec.match(/'\s*:([a-z_][a-z0-9_]*)\s*'/gi) || [])
    .map(x => x.replace(/^'\s*:|\s*'$/g, '')));
  if (!usados.size || !dados.size) continue;
  /* Hay ejecuciones cuyos bindings NO son una lista literal: se componen con
     `array_merge`, vienen en una variable o se generan en un bucle (`:i0`, `:s1`).
     Ahí no hay nada que comparar y decir que están mal sería mentir. */
  if (/array_merge|->execute\(\s*\$/.test(b.exec)) { saltadas++; continue; }
  revisados++;

  const faltan = [...usados].filter(p => !dados.has(p));
  const sobran = [...dados].filter(p => !usados.has(p));
  if (faltan.length || sobran.length) {
    fallos++;
    console.log('✘ api/index.php:' + b.linea);
    if (faltan.length) console.log('    la SQL pide y nadie da: ' + faltan.join(', '));
    if (sobran.length) console.log('    se pasan y la SQL no usa: ' + sobran.join(', '));
  }
}

/* Y la otra mitad del mismo problema: una columna que se escribe en unas rutas de
   creación y en otras no. Se avisa —no se falla— porque hay rutas que legítimamente
   guardan menos campos. */
const listasInsert = [];
for (const b of bloques()) {
  if (!/INSERT INTO orders/i.test(b.sql)) continue;
  const m = b.sql.match(/INSERT INTO orders\s*\(([^)]*)\)/i);
  if (!m) continue;
  listasInsert.push(m[1].split(',').map(c => c.trim()).filter(Boolean));
}
/* Solo se comparan entre sí los INSERT COMPLETOS. `orders_create` es una ruta antigua
   que guarda cuatro campos a propósito: meterla en la comparación marcaba treinta
   columnas como "olvidadas" y el aviso dejaba de significar nada. */
const mayor = listasInsert.reduce((n, l) => Math.max(n, l.length), 0);
const completos = listasInsert.filter(l => l.length >= mayor * 0.8);
const columnasPedido = {};
completos.forEach(l => l.forEach(c => { columnasPedido[c] = (columnasPedido[c] || 0) + 1; }));
const inserts = completos.length;
/* Solo interesa la firma del despiste: una columna que está en TODOS los INSERT menos
   en uno. Que una ruta guarde menos campos que otra es legítimo y no se avisa. */
const desiguales = Object.keys(columnasPedido).filter(c => columnasPedido[c] === inserts - 1);

console.log('sentencias con placeholders revisadas: ' + revisados + '  ·  no analizables (bindings compuestos): ' + saltadas);
if (inserts > 1) {
  console.log('INSERT INTO orders completos: ' + inserts + ' de ' + listasInsert.length);
  if (desiguales.length) {
    console.log('  aviso — columnas que no están en todos: ' + desiguales.join(', '));
  }
}

if (fallos) {
  console.log('API_SQL_KO  ' + fallos + ' sentencias descuadradas');
  process.exit(1);
}
console.log('API_SQL_OK');
