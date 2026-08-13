/* PRUEBA DE GLOBALIZACION
 *
 * "¿Puedo crear mañana un producto con tres atributos que ningún otro producto ha
 *  tenido y funciona toda la web solo declarando datos?"
 *
 * Se inyecta en el catálogo VIVO del navegador un amortiguador de dirección con ejes
 * `length`, `hardness` y `mount` —ninguno existe hoy en el catálogo ni en el código— y
 * se comprueba que lo entienden, sin tocar un solo consumidor:
 *   núcleo · burbuja del home · carrito · checkout · /pago · texto del pedido
 */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('GLOBALIZACION_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';

const NUEVO = {
  id: 'acc-steering-damper-x',
  sku: 'ACC-DAMPER-X',
  name: 'Amortiguador de dirección X',
  menuLabel: 'Amortiguador X',
  brand: 'SCOOT SHOP',
  series: 'accesorios',
  productType: 'accessory',
  catalogType: 'accessory',
  categoryKey: 'accessories',
  accessoryCategory: 'steering-dampers',
  priceText: '59,99 €',
  stock: 'in_stock',
  href: '/accesorios/amortiguador-x/',
  image: '/accesorios/soporte-movil/img/1.webp',
  gallery: [
    { src: '/accesorios/soporte-movil/img/1.webp', alt: 'uno' },
    { src: '/accesorios/soporte-movil/img/2.webp', alt: 'dos' }
  ],
  attributes: [
    { key: 'length', label: 'Longitud', type: 'pill', options: [
      { key: '90mm', label: '90 mm', default: true }, { key: '110mm', label: '110 mm' } ] },
    { key: 'hardness', label: 'Dureza', type: 'pill', options: [
      { key: 'blanda', label: 'Blanda' }, { key: 'dura', label: 'Dura', default: true } ] },
    { key: 'mount', label: 'Anclaje', type: 'swatch', options: [
      { key: 'plata', label: 'Plata', swatch: '#c0c4cc', default: true, images: [1] },
      { key: 'negro', label: 'Negro', swatch: '#111111', images: [2] } ] }
  ]
};

const inyectar = (prod) => {
  const meter = (lista) => { if (Array.isArray(lista) && !lista.some(p => p && p.sku === prod.sku)) lista.push(prod); };
  meter(window.SCOOTSHOP_PRODUCTS);
  if (window.SCOOTSHOP_CATALOG) meter(window.SCOOTSHOP_CATALOG.products);
};

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();

  /* El producto se mete en el CATALOGO DE VERDAD, interceptando data/products.js: es
     la unica forma honesta de comprobar que la web funciona "solo declarando datos". */
  await p.route('**/data/products.js*', async (route) => {
    const res = await route.fetch();
    const cuerpo = await res.text();
    const inyeccion = '\n;(function(){var n=' + JSON.stringify(NUEVO) + ';' +
      'function m(l){if(Array.isArray(l)&&!l.some(function(x){return x&&x.sku===n.sku;}))l.push(n);}' +
      'm(window.SCOOTSHOP_PRODUCTS);if(window.SCOOTSHOP_CATALOG)m(window.SCOOTSHOP_CATALOG.products);})();';
    await route.fulfill({ response: res, body: cuerpo + inyeccion });
  });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/404|401|ERR_CONN|Permissions/.test(m.text())) errs.push(m.text().slice(0, 80)); });
  let fallos = 0;
  const check = (nombre, ok, detalle) => { if (!ok) fallos++; console.log((ok ? '✔ ' : '✘ ') + nombre.padEnd(46) + detalle); };

  await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  // 1) El núcleo lo entiende sin conocer ninguno de sus ejes.
  const nucleo = await p.evaluate((prod) => {
    const ejes = window.SS_ATTRS.ejes(prod);
    const linea = { sku: prod.sku, url: prod.href, attrs: { length: '110mm', hardness: 'blanda', mount: 'negro' } };
    return {
      ejes: ejes.map(e => e.key + '=' + e.label + '/' + e.type),
      texto: window.SS_ATTRS.describirTexto(linea, prod),
      porDefecto: ejes.map(e => (window.SS_ATTRS.porDefecto(e) || {}).key).join(','),
      imagenes: JSON.stringify(window.SS_ATTRS.imagenesDe(prod, { mount: ejes[2].options[1] }))
    };
  }, NUEVO);
  check('núcleo: rótulos y tipos desde los datos', nucleo.ejes.join(' | ') === 'length=Longitud/pill | hardness=Dureza/pill | mount=Anclaje/swatch', nucleo.ejes.join(' | '));
  check('núcleo: describe una línea de 3 ejes', nucleo.texto === 'Longitud: 110 mm · Dureza: Blanda · Anclaje: Negro', '"' + nucleo.texto + '"');
  check('núcleo: opción por defecto de cada eje', nucleo.porDefecto === '90mm,dura,plata', nucleo.porDefecto);
  check('núcleo: imágenes por opción', nucleo.imagenes === '[2]', nucleo.imagenes);

  // 2) La burbuja del home pinta los 3 ejes y añade con sus 3 claves.
  const burbuja = await p.evaluate(async (prod) => {
    const meter = (lista) => { if (Array.isArray(lista) && !lista.some(x => x && x.sku === prod.sku)) lista.push(prod); };
    meter(window.SCOOTSHOP_PRODUCTS);
    if (window.SCOOTSHOP_CATALOG) meter(window.SCOOTSHOP_CATALOG.products);
    const b = document.createElement('button');
    b.setAttribute('data-open-variants', prod.href);
    document.body.appendChild(b);
    b.click();
    await new Promise(r => setTimeout(r, 1200));
    const pop = document.querySelector('.acc-pop');
    const rotulos = Array.from(document.querySelectorAll('.acc-pop .acc-pop-eje-label, .acc-pop .acc-pop-label'))
      .map(e => e.textContent.trim()).filter(Boolean);
    return { existe: !!pop, rotulos: rotulos, html: pop ? pop.textContent.replace(/\s+/g, ' ').slice(0, 160) : '' };
  }, NUEVO);
  check('burbuja: abre con los ejes declarados', burbuja.existe && /Longitud/i.test(burbuja.html) && /Dureza/i.test(burbuja.html) && /Anclaje/i.test(burbuja.html), burbuja.html.slice(0, 90));

  // 3) Carrito: la línea entra con los 3 atributos y el cajón los describe.
  const carrito = await p.evaluate(async (prod) => {
    localStorage.removeItem(window.SS_CART.key);
    const b = document.createElement('button');
    b.setAttribute('data-add-to-cart', '');
    b.setAttribute('data-sku', prod.sku);
    b.setAttribute('data-name', prod.name);
    b.setAttribute('data-price', prod.priceText);
    b.setAttribute('data-url', prod.href);
    b.setAttribute('data-image', prod.image);
    b.setAttribute('data-stock', 'in_stock');
    b.setAttribute('data-color', '110mm-blanda-negro');
    b.setAttribute('data-color-label', '110 mm · Blanda · Negro');
    document.body.appendChild(b);
    window.SS_ATTRS.marcarSeleccion(b, { length: '110mm', hardness: 'blanda', mount: 'negro' });
    b.click();
    await new Promise(r => setTimeout(r, 900));
    window.SS_CART.open();
    await new Promise(r => setTimeout(r, 900));
    const items = window.SS_CART.read();
    const chips = Array.from(document.querySelectorAll('.ss-cart-color')).map(e => e.textContent.trim());
    return { attrs: (items[items.length - 1] || {}).attrs, chip: chips[chips.length - 1] || '' };
  }, NUEVO);
  check('carrito: la línea guarda los 3 atributos', JSON.stringify(carrito.attrs) === '{"length":"110mm","hardness":"blanda","mount":"negro"}', JSON.stringify(carrito.attrs));
  check('carrito: el cajón los describe', carrito.chip === 'Longitud: 110 mm · Dureza: Blanda · Anclaje: Negro', '"' + carrito.chip + '"');

  // 4) Checkout: mismo texto, sin tocar la página.
  await p.goto(B + '/checkout/?cart=1', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.waitForTimeout(2500);
  const chipCheckout = await p.evaluate(() => {
    const c = document.querySelectorAll('#ckCartItemsList .order-summary__product-meta--color');
    return c.length ? c[c.length - 1].textContent.trim() : '(sin chip)';
  });
  check('checkout: describe los 3 ejes', chipCheckout === 'Longitud: 110 mm · Dureza: Blanda · Anclaje: Negro', '"' + chipCheckout + '"');

  console.log('\nerrores consola:', errs.length ? errs : 'ninguno');
  console.log(fallos ? '✘ GLOBALIZACION_KO (' + fallos + ')' : '✔ GLOBALIZACION_OK — producto nuevo de 3 ejes, cero consumidores tocados');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
