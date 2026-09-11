/* Chips de variantes en el RESUMEN: /checkout y /pago, en carrito y en compra directa,
   con catálogo normal y con catálogo retrasado 2,5 s. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('CHIPS_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';

const LINEAS = [
  {key:'M41|Negro',sku:'M41TANK',name:'A legacy',price:530,url:'/patinetes/ecoxtrem/m41-tank-ultimate-1000w/',color:'Negro',colorLabel:'Negro',qty:1,stock:'in_stock'},
  {key:'G2|vmp',sku:'G2PRO',name:'B modelo',price:515,url:'/patinetes/series-k/g2-pro/',color:'vmp',colorLabel:'G2 PRO DGT',attrs:{model:'vmp'},qty:2,stock:'in_stock'},
  {key:'W|n720',sku:'ACC-BAR-WAKE',name:'C dos ejes',price:39.99,url:'/accesorios/manillar-wake/',color:'negro-720',colorLabel:'Negro · 720 mm',attrs:{size:'720',color:'negro'},qty:1,stock:'in_stock'},
  {key:'S|',sku:'SOPMOV',name:'E sin variantes',price:12.99,url:'/accesorios/soporte-movil/',color:'',colorLabel:'',qty:1,stock:'in_stock'}
];
const ENVIO = { fullName:'Test Uno', phone:'600000000', addressLine1:'Calle Falsa 1', postalCode:'28001',
  city:'Madrid', province:'Madrid', country:'España', email:'t@t.es' };
const Q = '?name=KUKIRIN%20G2%20PRO&sku=G2PRO&price=515&url=%2Fpatinetes%2Fseries-k%2Fg2-pro%2F&color=vmp&colorLabel=G2%20PRO%20VMP';

const leer = () => Array.from(document.querySelectorAll(
  '#ckCartItemsList .order-summary__product-meta--color, #sumCartItemsList .order-summary__product-meta--color, #ckColor, #sumColor'
)).map(e => e.textContent.trim()).filter(Boolean);

async function correr(nombre, retrasar) {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport:{width:1440,height:1200} })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type()==='error' && !/404|401|ERR_CONN|Permissions/.test(m.text())) errs.push(m.text().slice(0,70)); });
  if (retrasar) await p.route('**/data/products.js*', async r => { await new Promise(s=>setTimeout(s,2500)); await r.continue(); });

  await p.goto(B + '/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(retrasar ? 1500 : 2500);
  await p.evaluate(([l, e]) => {
    localStorage.setItem(window.SS_CART.key, JSON.stringify(l));
    localStorage.setItem('ss_checkout_shipping', JSON.stringify(e));
  }, [LINEAS, ENVIO]);

  const out = {};
  for (const [etiqueta, ruta] of [
    ['checkout carrito', '/checkout/?cart=1'],
    ['pago     carrito', '/pago?cart=1'],
    ['checkout directa', '/checkout/' + Q],
    ['pago     directa', '/pago' + Q]
  ]) {
    await p.goto(B + ruta, { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(retrasar ? 6000 : 2500);
    const r = await p.evaluate(l => ({ url: location.pathname, chips: eval('(' + l + ')()') }), leer.toString());
    out[etiqueta] = r;
    console.log('   ' + etiqueta + '  [' + r.url + ']  ' + JSON.stringify(r.chips));
  }
  console.log('   errores: ' + (errs.length ? errs.join(' | ') : 'ninguno'));
  await br.close();
  return out;
}

(async () => {
  console.log('\nNORMAL');
  const a = await correr('normal', false);
  console.log('\nCATÁLOGO RETRASADO 2,5 s');
  const b = await correr('retrasado', true);
  const igual = JSON.stringify(a) === JSON.stringify(b);
  console.log('\nmismo resultado con y sin retraso: ' + (igual ? '✔' : '✘ difieren'));
  const esperado = ['Color: Negro','Versión: G2 PRO DGT','Medida: 720 mm · Color: Negro','Único'];
  let fallos = 0;
  for (const k of Object.keys(a)) {
    const chips = a[k].chips;
    const ok = k.indexOf('carrito') > -1
      ? JSON.stringify(chips) === JSON.stringify(esperado)
      : JSON.stringify(chips) === JSON.stringify(['Versión: G2 PRO DGT']);
    if (!ok) { fallos++; console.log('✘ ' + k + ' → ' + JSON.stringify(chips)); }
  }
  console.log(fallos || !igual ? '\n✘ CHIPS_KO' : '\n✔ CHIPS_OK — 4 vistas correctas con y sin retraso');
  /* SALIR CON 1 AL FALLAR. Esto imprimia CHIPS_KO y se caia por el final del IIFE, o
     sea salia con 0 — y variantes.ps1 solo mira el codigo de salida, asi que lo
     contaba como aprobado y el resumen decia «11 pasan, 0 fallan» con un KO impreso
     justo encima. Es el mismo fallo que se arreglo en _playwright.js, en otro sitio. */
  process.exit(fallos || !igual ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
