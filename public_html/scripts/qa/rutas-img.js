#!/usr/bin/env node
/**
 * Toda ruta /img/... que el sitio escribe tiene que existir en disco, y todo
 * fichero de img/ tiene que tener quien lo pida.
 *
 * Existe porque img/ se reorganizo en carpetas (portada, pago, marcas, deco) el
 * 25 de agosto de 2026: mover una foto son dos cosas, moverla y reescribir a
 * quien la nombra, y la segunda no avisa cuando falta — la imagen simplemente
 * sale rota en produccion. Aqui no hay compilador que lo cace, asi que lo caza
 * esto.
 *
 * Lo que NO se comprueba, y por que:
 *  - las galerias de cada producto (patinetes/x/img/1.webp, img/thumbs/3.webp):
 *    son rutas RELATIVAS a la carpeta del producto y varias se construyen
 *    concatenando ($itemUrl . '/img/1.webp'), asi que un nombre que empieza por
 *    numero nunca es del img/ raiz. Se saltan por eso.
 *  - img/cart-collage/: es cache que escribe el backend en caliente.
 *  - img/mail/: lo vigila build-mail-track-icons.js --check, que ademas sabe que
 *    hitos hacen falta.
 *
 *   node scripts/qa/rutas-img.js      ->  RUTAS_IMG_OK / RUTAS_IMG_KO
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SALTAR = new Set(['.git', 'tmp', 'node_modules', 'scratchpad', '__pycache__', '_cleanup_quarantine']);
const EXT = ['.html', '.css', '.js', '.php', '.ps1', '.py'];
const YO = 'scripts/qa/rutas-img.js';

/* Carpetas de img/ cuyo contenido no se nombra literalmente en el codigo. */
const GENERADAS = ['cart-collage/', 'mail/'];

/* Ficheros que ninguna pagina pide y aun asi tienen que estar:
   - 0.jpg: la foto de relleno que copia new-series-product.ps1 al crear un
     producto. La regla de "nombre numerico = galeria de producto" no puede
     distinguirlo, asi que se nombra aqui.
   - logo/letras-perfectas.png: el ORIGINAL del logotipo, de donde se recortan
     scoot-foto.webp y shop-foto.webp. No se enlaza desde ninguna pagina y no se
     despliega; esta aqui para poder volver a recortar las piezas sin depender de
     que alguien conserve el archivo.
   - categorias/patinetes-original.png: la foto de ambiente tal y como llego, de
     donde sale el recorte que si viaja (patinetes.webp, 48 KB frente a 1,9 MB).
     Tampoco se despliega. */
const SIN_CONSUMIDOR = new Set([
  '0.jpg',
  'logo/letras-perfectas.png',
  'categorias/patinetes-original.png',
  'categorias/accesorios-original.png',
  'categorias/repuestos-original.png',
]);

/* El (^|[^A-Za-z0-9._-]) de delante es lo que separa "/img/1.webp" de
   "/patinetes/series-n/n7/img/1.webp": sin el, la segunda casa por el final y
   las 44 fichas salen todas rotas. */
const RE = /(^|[^A-Za-z0-9._-])(\/?img\/[A-Za-z0-9._/-]+\.(?:webp|png|jpe?g|svg|ico|gif))/g;

const absolutas = new Map();   // '/img/x.webp' -> [quien la pide]
const nombradas = new Set();   // 'x.webp' relativo a img/, con o sin barra delante

function rel(p) {
  return path.relative(RAIZ, p).split(path.sep).join('/');
}

function recorrer(dir, visita) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SALTAR.has(entrada.name)) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) recorrer(p, visita);
    else visita(p);
  }
}

recorrer(RAIZ, (p) => {
  if (!EXT.includes(path.extname(p))) return;
  const quien = rel(p);
  if (quien === YO) return;
  let texto;
  try { texto = fs.readFileSync(p, 'utf8'); } catch (_) { return; }

  /* Las barras se normalizan porque el scaffolding de PowerShell las escribe al
     reves (Join-Path). */
  const plano = texto.split('\\').join('/');
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(plano)) !== null) {
    const ruta = m[2];
    const dentro = ruta.replace(/^\/?img\//, '');
    /* Galeria de producto: nombre puramente numerico (1.webp, 7-800.webp,
       thumbs/12.webp). Ojo, tiene que ser el nombre ENTERO — 0-removebg-preview
       empieza por digito y si es del img/ raiz. */
    if (/^(?:thumbs\/)?\d+(?:-\d+)?\.[a-z]+$/i.test(dentro)) continue;
    nombradas.add(dentro);
    if (ruta.charAt(0) !== '/') continue;            // relativa: no se puede resolver
    if (!absolutas.has(ruta)) absolutas.set(ruta, []);
    if (!absolutas.get(ruta).includes(quien)) absolutas.get(ruta).push(quien);
  }
});

const rotas = [];
for (const [ruta, quienes] of absolutas) {
  if (!fs.existsSync(path.join(RAIZ, ruta.slice(1)))) rotas.push([ruta, quienes]);
}

const enDisco = [];
(function listar(dir, prefijo) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = prefijo + entrada.name + (entrada.isDirectory() ? '/' : '');
    if (entrada.isDirectory()) listar(path.join(dir, entrada.name), r);
    else enDisco.push(r);
  }
})(path.join(RAIZ, 'img'), '');

const huerfanos = enDisco.filter((r) =>
  !GENERADAS.some((g) => r.startsWith(g)) && !SIN_CONSUMIDOR.has(r) && !nombradas.has(r));

console.log(absolutas.size + ' rutas /img/ absolutas nombradas, ' + enDisco.length + ' ficheros en img/');

if (rotas.length) {
  console.log('\nROTAS (se piden y no existen):');
  for (const [ruta, quienes] of rotas) console.log('  ' + ruta + '   <- ' + quienes.join(', '));
}
if (huerfanos.length) {
  console.log('\nHUERFANOS (existen y no los pide nadie):');
  for (const r of huerfanos) console.log('  img/' + r);
}

if (rotas.length || huerfanos.length) {
  console.log('RUTAS_IMG_KO');
  process.exit(1);
}
console.log('RUTAS_IMG_OK');
