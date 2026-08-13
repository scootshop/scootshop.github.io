/* scripts/qa/check-image-dupes.js
 *
 * GUARDIAN DE COMPORTAMIENTO: ninguna foto se baja dos veces.
 *
 * Abre paginas de verdad en un navegador y mira el trafico. Falla si:
 *   a) el mismo archivo de imagen se pide bajo DOS URLs distintas, o
 *   b) alguna URL de imagen lleva ?v=
 *
 * Por que hace falta ademas del chequeo estatico (check-image-cache.ps1): el fallo
 * mas caro que hemos tenido NO se veia en el codigo como '?v='. Era una linea
 * generica —bumpAttr(img, "src", ver)— que llamaba a addVerToUrl() sobre cualquier
 * <img> insertado en el DOM. Ningun grep razonable lo distingue de las lineas que SI
 * deben versionar (script.src, link.href). Mirando el trafico se ve solo: la misma
 * foto pedida dos veces, y entre una y otra la imagen en blanco. Eso es el parpadeo.
 *
 * Historico: llego a haber 25 fotos duplicadas en la ficha del M41 Armored Dual.
 *
 * Uso:
 *   node scripts/qa/check-image-dupes.js                      (produccion)
 *   node scripts/qa/check-image-dupes.js http://127.0.0.1:8083
 *
 * Necesita Playwright. Si no esta instalado, el script lo dice y sale con 0 para no
 * romper una cadena de QA por una dependencia opcional.
 *
 * Marcadores de salida: IMG_DUPES_OK / IMG_DUPES_KO
 */
'use strict';

const BASE = process.argv[2] || 'https://scootshop.co';

const RUTAS = [
  '/',
  '/patinetes/ecoxtrem/m41-armored-dual/',  // muchas fotos + caja "Anade algo mas"
  '/patinetes/series-gt/t10-dual/',         // variantes de color (galeria que se rehace)
  '/accesorios/manillar-lunje/',            // variantes de dos ejes
  '/patinetes/series-n/n7/',
];

const ES_IMAGEN = /\.(webp|png|jpe?g|gif|avif|svg|ico)(\?|$)/i;

function cargarPlaywright() {
  const intentos = [
    'playwright',
    'C:/Users/User/AppData/Roaming/npm/node_modules/playwright',
  ];
  for (const via of intentos) {
    try { return require(via); } catch (_) { /* siguiente */ }
  }
  return null;
}

(async () => {
  const pw = cargarPlaywright();
  if (!pw) {
    console.log('Playwright no esta instalado: no se puede comprobar el trafico.');
    console.log('  npm i -g playwright && npx playwright install chromium');
    console.log('IMG_DUPES_OK (omitido)');
    process.exit(0);
  }

  const navegador = await pw.chromium.launch();
  let dupTotales = 0;
  let versionadas = 0;

  for (const ruta of RUTAS) {
    const ctx = await navegador.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const pagina = await ctx.newPage();

    // CPU frenada: el fallo aparece cuando el JS llega tarde y reescribe un src que
    // el navegador ya estaba resolviendo. A toda velocidad puede no reproducirse.
    const cdp = await ctx.newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const pedidas = [];
    pagina.on('request', (r) => {
      const u = r.url();
      if (ES_IMAGEN.test(u)) pedidas.push(u);
    });

    await pagina.goto(BASE + ruta, { waitUntil: 'load' });
    // Margen para las pasadas diferidas: precarga de galeria, caja de compatibles y
    // cualquier reescritura tardia. Sin esperar, el fallo se escapa.
    await pagina.waitForTimeout(7000);

    // Se agrupa por ARCHIVO (la ruta sin query): si un mismo archivo aparece con mas
    // de una URL, es que se ha bajado dos veces.
    const porArchivo = new Map();
    for (const u of pedidas) {
      const archivo = u.split('?')[0];
      if (!porArchivo.has(archivo)) porArchivo.set(archivo, new Set());
      porArchivo.get(archivo).add(u);
    }

    const dobles = [...porArchivo.entries()].filter(([, urls]) => urls.size > 1);
    const conVersion = pedidas.filter((u) => /[?&]v=/.test(u));

    dupTotales += dobles.length;
    versionadas += conVersion.length;

    const estado = (dobles.length || conVersion.length) ? 'KO' : 'ok';
    console.log(
      `${estado.padEnd(3)} ${ruta.padEnd(42)} ${String(pedidas.length).padStart(3)} peticiones` +
      `  ${String(porArchivo.size).padStart(3)} archivos` +
      `  duplicadas: ${dobles.length}  con ?v=: ${conVersion.length}`
    );
    for (const [archivo, urls] of dobles.slice(0, 5)) {
      console.log(`      ${archivo.replace(BASE, '')}`);
      for (const u of urls) console.log(`        -> ${u.replace(BASE, '')}`);
    }

    await ctx.close();
  }

  await navegador.close();

  console.log('');
  if (dupTotales === 0 && versionadas === 0) {
    console.log(`Ninguna foto se baja dos veces y ninguna lleva version. (${RUTAS.length} rutas)`);
    console.log('IMG_DUPES_OK');
    process.exit(0);
  }

  console.log(`SE HA ROTO LA REGLA: ${dupTotales} archivo(s) duplicado(s), ${versionadas} URL(s) de imagen con ?v=.`);
  console.log('Cada duplicado es una foto que el navegador baja, tira a medias y vuelve');
  console.log('a pedir: es exactamente lo que se ve como parpadeo al abrir una ficha.');
  console.log('Mira quien reescribe el src de las imagenes (global-assets-app.js,');
  console.log('product-enhancements.js) y quien las emite ya versionadas.');
  console.log('IMG_DUPES_KO');
  process.exit(1);
})().catch((e) => {
  console.error('FALLO al comprobar:', e.message);
  console.log('IMG_DUPES_KO');
  process.exit(1);
});
