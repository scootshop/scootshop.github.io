/* AL ELEGIR UN MÉTODO DE PAGO, ¿SE ENTERA EL PEDIDO?
 *
 * El cliente abre /pago y va probando pestañas. Cada una debe dejar el pedido pendiente
 * con SU método y SU importe: el recargo de Klarna y el de tarjeta no se parecen en
 * nada, y el panel de administración enseña lo que hay guardado.
 *
 * Tarjeta (checkout embebido) y bizum/transferencia siempre lo hicieron. Klarna,
 * Scalapay y PayPal NO: su botón lleva a una pasarela alojada y no hablaba con el
 * servidor hasta que el cliente lo pulsaba, así que el pedido se quedaba con el método
 * anterior. En el panel parecía que elegirlos no hacía nada.
 *
 * Se comprueba lo GUARDADO, preguntando al backend por el pedido — que la pantalla
 * pinte "Klarna" no prueba que el pedido lo sepa.
 *
 * No completa ningún pago: la navegación a Stripe se bloquea. El pedido de prueba que
 * queda pendiente se borra al terminar.
 *
 *   node scripts/qa/pago-metodo.js [base]
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

const ENVIO = {
  fullName: 'QA Metodo Pago', email: 'qa-metodo@example.com', phone: '+34600000000',
  addressLine1: 'Calle Prueba 1', addressLine2: '', postalCode: '28001',
  city: 'Madrid', province: 'Madrid', country: 'España', notes: ''
};
const URL = BASE + '/pago?checkout=1&sku=G2PRO&name=' + encodeURIComponent('KUKIRIN G2 PRO') +
  '&price=515.00&currency=EUR&url=' + encodeURIComponent('/patinetes/series-k/g2-pro/');

const fallos = [];
const esperar = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!(await elegirClave())) { console.log('✘ ninguna ADMIN_KEY vale para ' + BASE); process.exit(1); }

  const { chromium } = cargarPlaywright();
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1380, height: 1000 } });
  const pag = await ctx.newPage();
  await pag.route('**://*.stripe.com/**', r => r.abort());
  await pag.addInitScript(e => { try { sessionStorage.setItem('ss_checkout_shipping', JSON.stringify(e)); } catch (_) {} }, ENVIO);

  let pedidoId = '';
  try {
    await pag.goto(URL, { waitUntil: 'domcontentloaded' });
    await pag.waitForSelector('#tab-card', { timeout: 25000 });
    await esperar(2500);

    // Un pedido pendiente sobre el que ir cambiando de opinion, como hace un cliente.
    for (const modo of ['bizum', 'klarna', 'scalapay', 'paypal', 'bank']) {
      await pag.click('#tab-' + modo);
      // El alta/actualizacion va sola tras elegir; se le da margen de sobra.
      let guardado = '', total = '';
      for (let i = 0; i < 30; i++) {
        await esperar(400);
        // El id del pedido vive en `ss_active_order`, como {orderId, fingerprint}.
        const id = await pag.evaluate(() => {
          try {
            const raw = sessionStorage.getItem('ss_active_order') || localStorage.getItem('ss_active_order') || '';
            return raw ? (JSON.parse(raw).orderId || '') : '';
          } catch (_) { return ''; }
        });
        if (!id) continue;
        pedidoId = id;
        const d = await admin('admin_order_detail&id=' + encodeURIComponent(id));
        guardado = (d && d.order && d.order.payment_method) || '';
        total = (d && d.order && (d.order.total_amount || d.order.amount)) || '';
        if (guardado === modo) break;
      }
      const ok = guardado === modo;
      console.log((ok ? '  ✓ ' : '  ✘ ') + modo.padEnd(9) + ' → el pedido guarda "' + (guardado || '(nada)') + '"' +
        (total ? '  ·  ' + total + ' €' : ''));
      if (!ok) fallos.push(modo + ' guardo "' + (guardado || 'nada') + '"');
    }
  } finally {
    await nav.close();
    if (pedidoId) {
      const del = await admin('admin_order_delete', { id: pedidoId });
      console.log('\n  ' + ((del && del.ok) ? '✓ pedido de prueba ' + pedidoId + ' borrado'
                                            : '✘ NO se pudo borrar el pedido de prueba ' + pedidoId));
      if (!del || !del.ok) fallos.push('borrar el pedido de prueba');
    }
  }

  console.log('');
  if (fallos.length) { console.log('PAGO_METODO_KO — ' + fallos.join(' · ')); process.exit(1); }
  console.log('PAGO_METODO_OK');
})().catch(e => { console.error('✘ error:', e && e.message ? e.message : e); process.exit(1); });
