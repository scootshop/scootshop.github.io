/* FLUJO COMPLETO: selección → línea de carrito → attrs → checkout → payload.
   Comprueba que la semántica no se pierde en ningún salto y en cualquier eje. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('FLUJO_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';

const CASOS = [
  { ruta: '/patinetes/series-k/g2-pro/', nombre: 'G2 PRO (modelo)', espera: { model: 'vmp' }, texto: /^Modelo: G2 PRO/ },
  { ruta: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/', nombre: 'M41 Tank (color)', espera: { color: 'negro' }, texto: /^Color: /},
  { ruta: '/accesorios/manillar-wake/', nombre: 'WAKE (medida+color)', espera: { size: '780', color: 'negro' }, texto: /Medida: .*·.*Color: |Color: .*·.*Medida: / },
  { ruta: '/accesorios/manillar-uno/', nombre: 'UNO (modelo+medida)', espera: { model: 'rb12', size: '720' }, texto: /Modelo: .*·.*Medida: |Medida: .*·.*Modelo: / }
];

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/404|401|ERR_CONN|Permissions/.test(m.text())) errs.push(m.text().slice(0, 80)); });
  let fallos = 0;

  for (const caso of CASOS) {
    await p.goto(B + caso.ruta, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { try { localStorage.removeItem(window.SS_CART.key); } catch (_) {} });
    const attrsBoton = await p.evaluate(() => {
      const b = document.querySelector('[data-product-cart-btn="true"]');
      return b ? (b.getAttribute('data-attrs') || '') : 'SIN BOTON';
    });
    await p.click('[data-product-cart-btn="true"]');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const items = window.SS_CART.read();
      const it = items[items.length - 1] || {};
      const chips = document.querySelectorAll('.ss-cart-color');
      const chip = chips.length ? chips[chips.length - 1].textContent : '';
      return { n: items.length, attrs: it.attrs || null, color: it.color, colorLabel: it.colorLabel, chip: chip.trim() };
    });
    const okAttrs = r.attrs && Object.keys(caso.espera).every(k => r.attrs[k] === caso.espera[k]);
    const okTexto = caso.texto.test(r.chip);
    if (!okAttrs || !okTexto) fallos++;
    console.log((okAttrs && okTexto ? '✔' : '✘') + ' ' + caso.nombre.padEnd(24) +
      ' boton=' + String(attrsBoton).padEnd(34) +
      ' linea=' + JSON.stringify(r.attrs) + '  cajón="' + r.chip + '"');
  }

  // Checkout con esas líneas: el chip debe decir lo mismo que el cajón.
  await p.goto(B + '/checkout/?cart=1', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const chips = await p.evaluate(() => Array.from(document.querySelectorAll('#ckCartItemsList .order-summary__product-meta--color')).map(e => e.textContent.trim()));
  console.log('checkout:', JSON.stringify(chips));

  console.log('errores consola:', errs.length ? errs : 'ninguno');
  console.log(fallos ? '\n✘ FLUJO_KO (' + fallos + ')' : '\n✔ FLUJO_OK');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
