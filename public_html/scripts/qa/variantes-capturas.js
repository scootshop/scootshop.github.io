/* Capturas de referencia del selector de variantes, para comprobar que la
   globalización de CSS/nombres NO cambia el diseño (punto 29). */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('CAPTURAS_OK');
const fs = require('fs');
const B = process.argv[2] || 'http://127.0.0.1:8000';
const ETIQUETA = process.argv[3] || 'antes';
const DIR = process.env.SS_SHOTS || require('path').join(require('os').tmpdir(), 'ss-capturas');

const VISTAS = [
  { id: 'ficha-swatch', ruta: '/patinetes/ecoxtrem/m41-armored-dual/', sel: '.variant-axis' },
  { id: 'ficha-pill', ruta: '/patinetes/series-k/g2-pro/', sel: '.variant-axis' },
  { id: 'ficha-2ejes', ruta: '/accesorios/manillar-wake/', sel: '.panel-inner' },
  { id: 'ficha-modelo-medida', ruta: '/accesorios/manillar-uno/', sel: '.panel-inner' }
];

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const br = await chromium.launch();
  for (const ancho of [1440, 390]) {
    const p = await (await br.newContext({ viewport: { width: ancho, height: 1200 }, deviceScaleFactor: 1 })).newPage();
    for (const v of VISTAS) {
      await p.goto(B + v.ruta, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3200);
      const el = await p.$(v.sel.split(',')[0].trim()) || await p.$(v.sel.split(',')[1] ? v.sel.split(',')[1].trim() : 'body');
      const destino = DIR + '/' + v.id + '-' + ancho + '-' + ETIQUETA + '.png';
      if (el) await el.screenshot({ path: destino });
      else await p.screenshot({ path: destino });
      console.log('  ' + v.id + ' @' + ancho + ' -> ' + (el ? 'ok' : 'pagina entera'));
    }
    // La burbuja: se abre por su API, sin depender de que la tarjeta esté visible.
    await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await p.evaluate(() => {
      const b = document.createElement('button');
      b.setAttribute('data-open-variants', '/accesorios/manillar-wake/');
      b.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9';
      document.body.appendChild(b);
      b.click();
    }).catch(() => {});
    await p.waitForTimeout(1600);
    const pop = await p.$('.acc-pop');
    if (pop) await pop.screenshot({ path: DIR + '/burbuja-' + ancho + '-' + ETIQUETA + '.png' });
    console.log('  burbuja @' + ancho + ' -> ' + (pop ? 'ok' : 'no abrio'));

    await p.close();
  }
  await br.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
