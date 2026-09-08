/* CORREGIR LA DIRECCIÓN NO PUEDE CREAR UN PEDIDO NUEVO
 *
 * El cliente llega a /pago, ve que se equivocó en la ciudad, vuelve a /checkout, lo
 * corrige y sigue. Eso es una ACTUALIZACIÓN del mismo pedido pendiente, no otra compra.
 * Pasaba lo contrario: `checkoutSessionFingerprint()` metía la dirección en la huella
 * que decide si se reutiliza el pedido, así que cada corrección tiraba el id guardado y
 * nacía un pedido nuevo — tres del mismo cliente en quince minutos, ninguno pagado.
 *
 * Se comprueba lo único que zanja la duda: el ID del pedido antes y después, y que el
 * dato editado llegó de verdad al pedido. Además, que borrar un campo OPCIONAL (el piso)
 * lo deje borrado: al proteger la dirección de los borrados accidentales se llegó a
 * ignorar también los borrados a propósito.
 *
 * Y al final, que cambiar de PRODUCTO sí abra un pedido distinto: si la huella se
 * quedara sin nada, dos compras distintas se pisarían entre ellas.
 *
 *   node scripts/qa/pedido-unico.js [base]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { cargarPlaywright } = require('./_playwright.js');

const BASE = (process.argv[2] || 'https://scootshop.co').replace(/\/$/, '');
const RAIZ = path.resolve(__dirname, '..', '..');

function clavesCandidatas() {
  const out = [];
  for (const f of ['.env', '.env.local']) {
    const ruta = path.join(RAIZ, f);
    if (!fs.existsSync(ruta)) continue;
    const m = fs.readFileSync(ruta, 'utf8').match(/^ADMIN_KEY=(.*)$/m);
    const v = m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
    if (v && out.indexOf(v) === -1) out.push(v);
  }
  return out;
}
let KEY = '';
async function elegirClave() {
  for (const k of clavesCandidatas()) {
    const r = await fetch(BASE + '/api/?route=admin_orders_list&limit=1&_t=' + Date.now(), { headers: { 'X-Admin-Key': k }, cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (d && d.ok) { KEY = k; return true; }
  }
  return false;
}
async function admin(ruta, cuerpo) {
  const o = { headers: { 'X-Admin-Key': KEY, 'Content-Type': 'application/json' }, cache: 'no-store' };
  if (cuerpo !== undefined) { o.method = 'POST'; o.body = JSON.stringify(cuerpo); }
  const r = await fetch(BASE + '/api/?route=' + ruta + '&_t=' + Date.now(), o);
  return r.json().catch(() => ({}));
}

const fallos = [];
function comprobar(ok, titulo, detalle) {
  console.log((ok ? '  ✓ ' : '  ✘ ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!ok) fallos.push(titulo);
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

const ENVIO_BASE = {
  fullName: 'QA Pedido Unico', email: 'qa-unico@example.com', phone: '+34600000000',
  addressLine1: 'Calle Primera 1', addressLine2: 'Piso 3', postalCode: '28001',
  city: 'Madrid', province: 'Madrid', country: 'España', notes: ''
};

function urlDe(skuP, nombre, precio) {
  return BASE + '/pago?checkout=1&sku=' + skuP + '&name=' + encodeURIComponent(nombre) +
    '&price=' + precio + '&currency=EUR&url=' + encodeURIComponent('/patinetes/series-k/g2-pro/');
}

/* Elegir Bizum deja el pedido apuntado en el servidor sin ir a ninguna pasarela: es la
   forma más barata de materializar el pedido pendiente y poder mirarlo. */
async function registrarPedido(pag, envio, url) {
  /* sessionStorage es POR ORIGEN: hay que estar ya en el sitio para escribirlo. Puesto
     antes de la primera navegacion se escribe en about:blank y se pierde — y entonces
     /pago rebota al formulario, que es lo que debe hacer. */
  if (!/scootshop|localhost|127\.0\.0\.1/.test(pag.url())) {
    await pag.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  }
  await pag.evaluate(e => { try { sessionStorage.setItem('ss_checkout_shipping', JSON.stringify(e)); } catch (_) {} }, envio);
  await pag.goto(url, { waitUntil: 'domcontentloaded' });
  await pag.waitForSelector('#tab-bizum', { timeout: 25000 });
  await esperar(1500);
  await pag.click('#tab-bizum');
  for (let i = 0; i < 30; i++) {
    await esperar(400);
    const id = await pag.evaluate(() => {
      try {
        const raw = sessionStorage.getItem('ss_active_order') || localStorage.getItem('ss_active_order') || '';
        return raw ? (JSON.parse(raw).orderId || '') : '';
      } catch (_) { return ''; }
    });
    if (id) return id;
  }
  return '';
}

(async () => {
  if (!(await elegirClave())) { console.log('✘ ninguna ADMIN_KEY vale para ' + BASE); process.exit(1); }

  const { chromium } = cargarPlaywright();
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1380, height: 1000 } });
  const pag = await ctx.newPage();
  await pag.route('**://*.stripe.com/**', r => r.abort());

  const creados = new Set();
  try {
    const URL_A = urlDe('G2PRO', 'KUKIRIN G2 PRO', '515.00');

    const id1 = await registrarPedido(pag, ENVIO_BASE, URL_A);
    if (!id1) { console.log('✘ no se llegó a crear el pedido de partida'); process.exit(1); }
    creados.add(id1);
    console.log('  pedido de partida: ' + id1 + '\n');

    // 1. El cliente vuelve a /checkout y corrige ciudad, nombre y dirección.
    const CORREGIDO = Object.assign({}, ENVIO_BASE, {
      fullName: 'QA Pedido Unico CORREGIDO',
      city: 'Valencia', postalCode: '46460', province: 'Valencia',
      addressLine1: 'Calle Segunda 22'
    });
    const id2 = await registrarPedido(pag, CORREGIDO, URL_A);
    creados.add(id2);
    comprobar(id2 === id1, 'corregir nombre, ciudad y dirección NO crea otro pedido',
      id2 === id1 ? 'sigue siendo ' + id1 : id1 + '  →  ' + id2);

    const d2 = await admin('admin_order_detail&id=' + encodeURIComponent(id2));
    const s2 = (d2 && d2.order && d2.order.shipping) || {};
    comprobar(s2.city === 'Valencia' && s2.name === CORREGIDO.fullName,
      'y la corrección llega al pedido', (s2.name || '?') + ' · ' + (s2.city || '?'));

    // 2. Borrar un campo OPCIONAL tiene que dejarlo borrado.
    const SIN_PISO = Object.assign({}, CORREGIDO, { addressLine2: '' });
    const id3 = await registrarPedido(pag, SIN_PISO, URL_A);
    creados.add(id3);
    const d3 = await admin('admin_order_detail&id=' + encodeURIComponent(id3));
    const s3 = (d3 && d3.order && d3.order.shipping) || {};
    comprobar(id3 === id1, 'borrar el piso tampoco crea otro pedido', id3);
    comprobar(!String(s3.address2 || '').trim(), 'y el piso queda BORRADO de verdad',
      String(s3.address2 || '') ? 'seguía diciendo "' + s3.address2 + '"' : 'vacío');

    // 3. Otro producto SÍ es otro pedido: la huella no puede quedarse sin nada.
    const URL_B = urlDe('M41TANK', 'M41 Tank Ultimate', '530.00');
    const id4 = await registrarPedido(pag, SIN_PISO, URL_B);
    creados.add(id4);
    comprobar(id4 && id4 !== id1, 'cambiar de PRODUCTO sí abre un pedido distinto',
      id4 === id1 ? 'reutilizó el anterior y habría pisado la compra' : id1 + '  →  ' + id4);

  } finally {
    await nav.close();
    console.log('');
    for (const id of creados) {
      if (!id) continue;
      const del = await admin('admin_order_delete', { id });
      console.log('  ' + ((del && del.ok) ? '✓ borrado ' + id : '✘ NO se pudo borrar ' + id));
      if (!del || !del.ok) fallos.push('borrar ' + id);
    }
  }

  console.log('');
  if (fallos.length) { console.log('PEDIDO_UNICO_KO — ' + fallos.join(' · ')); process.exit(1); }
  console.log('PEDIDO_UNICO_OK');
})().catch(e => { console.error('✘ error:', e && e.message ? e.message : e); process.exit(1); });
