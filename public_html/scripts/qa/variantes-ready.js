/* ¿Se cumple `ready` en TODAS las páginas, incluso donde no hay catálogo?
   Si alguna se quedara sin cumplirla, el cajón del carrito no repintaría nunca. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('READY_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';
const RUTAS = ['/', '/cuenta', '/checkout/?cart=1', '/pago', '/patinetes/series-k/g2-pro/', '/contacto', '/carrito'];
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport:{width:1280,height:900} })).newPage();
  await p.addInitScript(() => {
    const t0 = Date.now();
    window.__ready = null;
    let v0;
    Object.defineProperty(window, 'SS_ATTRS', {
      configurable: true,
      set(v) {
        v0 = v;
        Object.defineProperty(window, 'SS_ATTRS', { value: v, configurable: true, writable: true });
        if (v && v.ready && v.ready.then) v.ready.then(() => {
          window.__ready = { ms: Date.now() - t0, prods: (window.SCOOTSHOP_PRODUCTS || []).length };
        });
      },
      get() { return v0; }
    });
  });
  let fallos = 0;
  for (const ruta of RUTAS) {
    const res = await p.goto(B + ruta, { waitUntil:'domcontentloaded' }).catch(() => null);
    if (!res || res.status() >= 400) { console.log('–  ' + ruta.padEnd(28) + ' (no existe, ' + (res ? res.status() : 'sin respuesta') + ')'); continue; }
    await p.waitForTimeout(4000);
    const r = await p.evaluate(() => ({
      ready: window.__ready,
      tag: !!document.querySelector('script[src*="/data/products.js"]'),
      prods: (window.SCOOTSHOP_PRODUCTS || []).length
    }));
    const ok = !!r.ready;
    if (!ok) fallos++;
    console.log((ok ? '✔' : '✘') + '  ' + ruta.padEnd(28) +
      ' ready=' + (r.ready ? r.ready.ms + 'ms con ' + r.ready.prods + ' productos' : 'NO SE CUMPLE') +
      '  tag=' + r.tag + ' catalogo=' + r.prods);
  }
  console.log(fallos ? '\n✘ READY_KO' : '\n✔ READY_OK');
  await br.close();
  // Mismo caso que variantes-chips.js: imprimia READY_KO y se caia por el final del
  // IIFE, o sea salia con 0, y el orquestador lo contaba como aprobado.
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
