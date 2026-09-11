/* CASOS A–J del encargo (punto 27), sobre el catálogo REAL o inyectando productos
   en la respuesta de data/products.js — que es la única forma honesta de comprobar
   que basta con declarar datos. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('CASOS_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';

const BASE = { series: 'accesorios', productType: 'accessory', catalogType: 'accessory',
  categoryKey: 'accessories', stock: 'in_stock', priceText: '99,00 €',
  image: '/accesorios/soporte-movil/img/1.webp',
  gallery: [ { src: '/accesorios/soporte-movil/img/1.webp', alt: '1' },
             { src: '/accesorios/soporte-movil/img/2.webp', alt: '2' },
             { src: '/accesorios/soporte-movil/img/3.webp', alt: '3' } ] };

const NUEVOS = [
  Object.assign({}, BASE, { id: 'qa-c', sku: 'QA-C', name: 'QA solo color', href: '/qa/c/',
    attributes: [ { key: 'color', label: 'Color', type: 'swatch', options: [
      { key: 'negro', label: 'Negro', swatch: '#111', default: true, images: [1] },
      { key: 'rojo', label: 'Rojo', swatch: '#c00', images: [2] } ] } ] }),
  Object.assign({}, BASE, { id: 'qa-mc', sku: 'QA-MC', name: 'QA modelo+color', href: '/qa/mc/',
    attributes: [
      { key: 'model', label: 'Modelo', type: 'pill', options: [
        { key: 'std', label: 'Standard', default: true }, { key: 'pro', label: 'Pro' } ] },
      { key: 'color', label: 'Color', type: 'swatch', options: [
        { key: 'negro', label: 'Negro', swatch: '#111', default: true, images: [1] },
        { key: 'verde', label: 'Verde', swatch: '#0a0', images: [2] } ] } ] }),
  Object.assign({}, BASE, { id: 'qa-mcs', sku: 'QA-MCS', name: 'QA modelo+color+medida', href: '/qa/mcs/',
    attributes: [
      { key: 'model', label: 'Modelo', type: 'pill', options: [
        { key: 'std', label: 'Standard', default: true },
        { key: 'pro', label: 'Pro', allows: { size: ['11'] } } ] },
      { key: 'color', label: 'Color', type: 'swatch', options: [
        { key: 'negro', label: 'Negro', swatch: '#111', default: true, imagesBy: { '10': 1, '11': 2 } },
        { key: 'verde', label: 'Verde', swatch: '#0a0', images: [3] } ] },
      { key: 'size', label: 'Medida', type: 'pill', options: [
        { key: '10', label: '10"', default: true }, { key: '11', label: '11"' } ] } ] }),
  Object.assign({}, BASE, { id: 'qa-nada', sku: 'QA-NADA', name: 'QA sin variantes', href: '/qa/nada/' }),
  Object.assign({}, BASE, { id: 'qa-off', sku: 'QA-OFF', name: 'QA con opción agotada', href: '/qa/off/',
    attributes: [ { key: 'color', label: 'Color', type: 'swatch', options: [
      { key: 'negro', label: 'Negro', swatch: '#111', default: true, images: [1] },
      { key: 'blanco', label: 'Blanco', swatch: '#fff', images: [2], available: false } ] } ] }),
  Object.assign({}, BASE, { id: 'qa-sku', sku: 'QA-SKU', name: 'QA precio y sku por opción', href: '/qa/sku/',
    attributes: [ { key: 'version', label: 'Versión', type: 'pill', options: [
      { key: 'base', label: 'Base', default: true, images: [1] },
      { key: 'plus', label: 'Plus', images: [2], sku: 'QA-SKU-PLUS', priceText: '129,00 €' } ] } ] })
];

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
  await p.route('**/data/products.js*', async (route) => {
    const res = await route.fetch();
    const cuerpo = await res.text();
    const iny = '\n;(function(){var L=' + JSON.stringify(NUEVOS) + ';' +
      'function m(l){if(!Array.isArray(l))return;L.forEach(function(n){if(!l.some(function(x){return x&&x.sku===n.sku;}))l.push(n);});}' +
      'm(window.SCOOTSHOP_PRODUCTS);if(window.SCOOTSHOP_CATALOG)m(window.SCOOTSHOP_CATALOG.products);})();';
    await route.fulfill({ response: res, body: cuerpo + iny });
  });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/404|401|ERR_CONN|Permissions/.test(m.text())) errs.push(m.text().slice(0, 70)); });
  await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  let fallos = 0;
  const check = (id, ok, detalle) => { if (!ok) fallos++; console.log((ok ? '✔ ' : '✘ ') + id.padEnd(52) + detalle); };

  const r = await p.evaluate(() => {
    const P = (sku) => window.SCOOTSHOP_PRODUCTS.find(x => x.sku === sku);
    const A = window.SS_ATTRS;
    const desc = (sku, attrs) => A.describirTexto({ sku: sku, attrs: attrs }, P(sku));
    const ejes = (sku) => A.ejes(P(sku)).map(e => e.label + '/' + e.type);
    return {
      // A: solo color   B: solo modelo (G2 PRO, catálogo real)   C: modelo+color   D: 3 ejes
      A: { ejes: ejes('QA-C'), texto: desc('QA-C', { color: 'rojo' }) },
      B: { ejes: ejes('G2PRO'), texto: desc('G2PRO', { model: 'vmp' }) },
      C: { ejes: ejes('QA-MC'), texto: desc('QA-MC', { model: 'pro', color: 'verde' }) },
      D: { ejes: ejes('QA-MCS'), texto: desc('QA-MCS', { model: 'pro', color: 'negro', size: '11' }) },
      E: { ejes: ejes('QA-NADA'), texto: desc('QA-NADA', null) },
      F: (function () {
        const eje = A.ejes(P('QA-OFF'))[0];
        const off = eje.options.find(o => o.key === 'blanco');
        return { disabled: off.disabled, porDefecto: (A.porDefecto(eje) || {}).key };
      })(),
      G: (function () {
        const prod = P('QA-MCS'), es = A.ejes(prod);
        const negro = es[1].options[0], m10 = es[2].options[0], m11 = es[2].options[1];
        return {
          conMedida10: A.fotoDe(prod, { color: negro, size: m10 }),
          conMedida11: A.fotoDe(prod, { color: negro, size: m11 }),
          verde: A.fotoDe(prod, { color: es[1].options[1] })
        };
      })(),
      H: (function () {
        const eje = A.ejes(P('QA-SKU'))[0];
        const plus = eje.options.find(o => o.key === 'plus');
        return { sku: plus.sku, precio: plus.priceText };
      })(),
      cruce: (function () {
        const prod = P('QA-MCS'), es = A.ejes(prod);
        const pro = es[0].options.find(o => o.key === 'pro');
        const m10 = es[2].options[0], m11 = es[2].options[1];
        return {
          proCon10: A.disponible(es[2], m10, { model: pro }),
          proCon11: A.disponible(es[2], m11, { model: pro })
        };
      })()
    };
  });

  check('CASO A — solo Color', r.A.ejes.join() === 'Color/swatch' && r.A.texto === 'Color: Rojo', r.A.ejes + '  "' + r.A.texto + '"');
  // El eje pasó a llamarse «Versión» y sus opciones a «G2 PRO DGT / G2 PRO NORMAL»
  // el 27 ago 2026: VMP no distingue nada (homologados o no, todos son VMP).
  check('CASO B — solo Versión (KUKIRIN G2 PRO)', r.B.ejes.join() === 'Versión/pill' && r.B.texto === 'Versión: G2 PRO DGT', r.B.ejes + '  "' + r.B.texto + '"');
  check('CASO C — Modelo + Color', r.C.ejes.join() === 'Modelo/pill,Color/swatch' && r.C.texto === 'Modelo: Pro · Color: Verde', r.C.ejes + '  "' + r.C.texto + '"');
  check('CASO D — Modelo + Color + Medida', r.D.ejes.length === 3 && r.D.texto === 'Modelo: Pro · Color: Negro · Medida: 11"', '"' + r.D.texto + '"');
  check('CASO E — sin variantes: ni eje ni texto', r.E.ejes.length === 0 && r.E.texto === '', 'ejes=' + r.E.ejes.length + ' texto="' + r.E.texto + '"');
  check('CASO F — opción agotada: disabled y no por defecto', r.F.disabled === true && r.F.porDefecto === 'negro', 'disabled=' + r.F.disabled + ' defecto=' + r.F.porDefecto);
  check('CASO G — la foto sigue a la combinación', r.G.conMedida10.endsWith('1.webp') && r.G.conMedida11.endsWith('2.webp') && r.G.verde.endsWith('3.webp'),
    r.G.conMedida10.split('/').pop() + ' / ' + r.G.conMedida11.split('/').pop() + ' / ' + r.G.verde.split('/').pop());
  check('CASO H — SKU y precio por opción llegan al consumidor', r.H.sku === 'QA-SKU-PLUS' && r.H.precio === '129,00 €', r.H.sku + ' ' + r.H.precio);
  check('cruce — `allows` en los dos sentidos', r.cruce.proCon10 === false && r.cruce.proCon11 === true, 'pro+10=' + r.cruce.proCon10 + ' pro+11=' + r.cruce.proCon11);

  // CASO I / J: la burbuja (ACC POP, la misma del home y de las fichas).
  const burbuja = await p.evaluate(async () => {
    const b = document.createElement('button');
    b.setAttribute('data-open-variants', '/qa/mcs/');
    document.body.appendChild(b);
    b.click();
    await new Promise(r => setTimeout(r, 1500));
    const pop = document.querySelector('.acc-pop');
    return { texto: pop ? pop.textContent.replace(/\s+/g, ' ') : '', filas: document.querySelectorAll('.acc-pop-fila, .acc-pop-eje, .acc-pop-rail').length };
  });
  check('CASO I/J — ACC POP lee los mismos ejes que la ficha',
    /Modelo/.test(burbuja.texto) && /Color/.test(burbuja.texto) && /Medida/.test(burbuja.texto),
    burbuja.texto.slice(0, 80));

  console.log('\nerrores consola: ' + (errs.length ? errs.join(' | ') : 'ninguno'));
  console.log(fallos ? '✘ CASOS_KO (' + fallos + ')' : '✔ CASOS_OK — A–J en verde');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
