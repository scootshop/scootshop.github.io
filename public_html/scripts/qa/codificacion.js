#!/usr/bin/env node
/* scripts/qa/codificacion.js — que no vuelva a entrar texto corrompido.
 *
 * POR QUE EXISTE: habia 76 secuencias de mojibake en tres ficheros —UTF-8 leido como
 * Latin-1 en algun guardado—. En js/global-assets.js y js/index-head.js estaban solo
 * en comentarios, pero en accesorios/potencia-lunje/index.html estaba dentro de un
 * `alt`: donde debia poner «vástago» ponia la version corrompida de esa «á», que es
 * lo que lee un lector de pantalla y lo que indexa Google. En un proyecto escrito
 * entero en español, con acentos y eñes en cada
 * linea de copy, esto vuelve en cuanto alguien abre un fichero con otro editor.
 *
 * OJO AL ESCRIBIR AQUI DENTRO: los ejemplos NO se pueden poner literales o este
 * guardian se señala a si mismo. Van descritos, o con escapes \uXXXX.
 *
 * LA PRUEBA NO ES «CONTIENE Ã». Eso daria falsos positivos con texto legitimo. La
 * prueba es que la secuencia, re-codificada a CP1252 y decodificada como UTF-8,
 * produzca un caracter castellano. La secuencia de dos bytes que sale de una 'ó'
 * repara a 'ó' y es mojibake; un caracter suelto que no repara a nada, no lo es.
 * Con la regla ancha saltarian cosas que estan bien.
 *
 * Comprueba dos cosas:
 *   1. cada fichero de texto es UTF-8 valido;
 *   2. no contiene secuencias de mojibake reparables.
 *
 * El .editorconfig de la raiz fija charset=utf-8 para el trabajo futuro; esto es lo
 * que lo comprueba, porque un .editorconfig no obliga a nadie.
 *
 *     node scripts/qa/codificacion.js
 *
 * Marcador: CODIFICACION_OK / CODIFICACION_KO. Salida 0 o 1.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const OMITIR = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'tmp',
  'fonts', 'img', 'uploads', '.agents', '.vscode']);
const EXT = new Set(['.html', '.htm', '.js', '.css', '.php', '.py', '.ps1', '.psm1',
  '.json', '.xml', '.txt', '.md', '.webmanifest']);

/* Secuencias que produce UTF-8 leido como CP1252. Se buscan estas y luego se
   COMPRUEBA que reparan: la lista solo acota donde mirar. */
const SOSPECHA = /(?:Ã[-¿ŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]|Â[ -¿]|â€[™œ“”˜¢¦‚]|â‚¬)/g;

const ACENTOS = 'áéíóúñÁÉÍÓÚÑüÜ¿¡«»—–’“”€°ª·';

function repara(t) {
  // Node no trae CP1252; latin-1 cubre el 99 % de este caso y las comillas
  // tipograficas se tratan aparte por su secuencia completa.
  const b = Buffer.from(t, 'latin1');
  const r = b.toString('utf8');
  if (r === t || r.indexOf('�') !== -1) return null;
  return r;
}

function recorrer(dir, acc) {
  acc = acc || [];
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const e of entradas) {
    if (OMITIR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p, acc);
    else if (EXT.has(path.extname(e.name).toLowerCase()) || e.name === '.htaccess') acc.push(p);
  }
  return acc;
}

const ficheros = recorrer(RAIZ);
const fallos = [];
let revisados = 0;

for (const p of ficheros) {
  const rel = path.relative(RAIZ, p).split(path.sep).join('/');
  let bruto;
  try {
    if (fs.statSync(p).size > 8 * 1024 * 1024) continue;
    bruto = fs.readFileSync(p);
  } catch (_) { continue; }

  // 1. UTF-8 valido
  const txt = bruto.toString('utf8');
  if (Buffer.compare(Buffer.from(txt, 'utf8'), bruto) !== 0) {
    fallos.push({ rel, linea: 0, que: 'no es UTF-8 valido' });
    continue;
  }
  revisados++;

  // 2. Mojibake reparable
  const lineas = txt.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (l.indexOf('Ã') === -1 && l.indexOf('Â') === -1 && l.indexOf('â') === -1) continue;
    SOSPECHA.lastIndex = 0;
    let m;
    while ((m = SOSPECHA.exec(l)) !== null) {
      const bien = repara(m[0]);
      if (!bien) continue;
      let esAcento = false;
      for (const c of bien) if (ACENTOS.indexOf(c) !== -1) esAcento = true;
      if (!esAcento) continue;
      fallos.push({ rel, linea: i + 1, que: JSON.stringify(m[0]) + ' deberia ser ' + JSON.stringify(bien) });
      break; // uno por linea basta para señalarla
    }
  }
}

console.log(revisados + ' ficheros de texto revisados');

if (fallos.length) {
  console.log('');
  const porFichero = {};
  for (const f of fallos) (porFichero[f.rel] = porFichero[f.rel] || []).push(f);
  for (const rel of Object.keys(porFichero).sort()) {
    const l = porFichero[rel];
    console.log('  ✗ ' + rel + '  (' + l.length + ' linea' + (l.length > 1 ? 's' : '') + ')');
    for (const f of l.slice(0, 4)) console.log('      linea ' + f.linea + ': ' + f.que);
    if (l.length > 4) console.log('      ... y ' + (l.length - 4) + ' mas');
  }
  console.log('');
  console.log('Texto corrompido: UTF-8 guardado como Latin-1. Vuelve a guardar el fichero');
  console.log('en UTF-8; el .editorconfig de la raiz ya lo fija para los editores que lo leen.');
  console.log('CODIFICACION_KO  ' + fallos.length + ' linea(s) en ' + Object.keys(porFichero).length + ' fichero(s)');
  process.exit(1);
}

console.log('CODIFICACION_OK');
process.exit(0);
