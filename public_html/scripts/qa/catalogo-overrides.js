/* scripts/qa/catalogo-overrides.js
 *
 * LA CAPA OPERATIVA, EN UN NAVEGADOR DE VERDAD.
 *
 * `data/products.js` es la estructura del catálogo y la escribe una persona;
 * `data/product-overrides.js` lo escribe el panel y lleva precio, precio tachado,
 * stock, altas y bajas. Esta comprobación pone un cambio en la capa operativa,
 * carga la web y mira que el cliente lo vea — y, sobre todo, que el catálogo siga
 * intacto, que es justo lo que antes no se podía garantizar.
 *
 *   node scripts/qa/catalogo-overrides.js [base]
 *
 * Marcador: OVERRIDES_WEB_OK / OVERRIDES_WEB_KO.
 */
'use strict';

const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('OVERRIDES_WEB_OK');

const B = process.argv[2] || 'http://127.0.0.1:8000';

/* El cambio se inyecta interceptando la respuesta del fichero de overrides, no
   escribiéndolo: así la prueba no depende de tener el panel a mano y no deja rastro
   en el repositorio ni en producción. */
const OVERRIDES = {
  generado: 'qa',
  porId: { 'k-g2-pro': { priceText: '1.234 €', stock: 'out_of_stock' } },
  ocultos: ['acc-storage-bag'],
  extras: [{
    id: 'qa-extra', sku: 'QA-EXTRA', name: 'Producto creado en el panel',
    menuLabel: 'QA extra', brand: 'SCOOT SHOP', series: 'acc',
    productType: 'accessory', catalogType: 'accessory', categoryKey: 'accessories',
    accessoryCategory: 'mounts', priceText: '19,99 €', compareAtPriceText: '', stock: 'in_stock',
    href: '/accesorios/qa-extra/', image: '/accesorios/soporte-movil/img/1.webp',
    alt: 'QA', specs: [], homeOrder: 99, gallery: []
  }]
};

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.route('**/data/product-overrides.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.SCOOTSHOP_OVERRIDES = ' + JSON.stringify(OVERRIDES) + ';'
  }));

  let fallos = 0;
  const check = (id, ok, det) => { if (!ok) fallos++; console.log((ok ? '✔ ' : '✘ ') + id.padEnd(46) + det); };

  await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);

  const r = await p.evaluate(() => {
    const lista = window.SCOOTSHOP_PRODUCTS || [];
    const g2 = lista.find(x => x.id === 'k-g2-pro');
    return {
      total: lista.length,
      precio: g2 ? g2.priceText : '(sin producto)',
      stock: g2 ? g2.stock : '',
      bolsa: lista.some(x => x.id === 'acc-storage-bag'),
      extra: lista.some(x => x.id === 'qa-extra'),
      overrides: !!window.SCOOTSHOP_OVERRIDES
    };
  });

  check('la capa operativa llega antes que el catálogo', r.overrides, 'SCOOTSHOP_OVERRIDES=' + r.overrides);
  check('un precio del panel se ve en la web', r.precio === '1.234 €', r.precio);
  check('un stock del panel se ve en la web', r.stock === 'out_of_stock', r.stock);
  check('un producto oculto desaparece', !r.bolsa, r.bolsa ? 'sigue visible' : 'retirado');
  check('un producto creado en el panel aparece', r.extra, r.extra ? 'presente' : 'no aparece');

  /* Y sin la capa: la web sigue funcionando con los precios del catálogo. Es la
     garantía de que un fichero de overrides ausente o roto no tumba la tienda. */
  const p2 = await (await br.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p2.route('**/data/product-overrides.js*', route => route.abort());
  await p2.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(3500);
  const sin = await p2.evaluate(() => {
    const lista = window.SCOOTSHOP_PRODUCTS || [];
    const g2 = lista.find(x => x.id === 'k-g2-pro');
    return { total: lista.length, precio: g2 ? g2.priceText : '' };
  });
  check('sin capa operativa, la web sigue en pie', sin.total >= 40 && /€/.test(sin.precio),
    sin.total + ' productos · ' + sin.precio);

  console.log(fallos ? '\n✘ OVERRIDES_WEB_KO (' + fallos + ')' : '\n✔ OVERRIDES_WEB_OK');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
