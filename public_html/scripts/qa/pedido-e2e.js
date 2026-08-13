/* PEDIDO DE VERDAD contra producción: crea uno con atributos nombrados, lo lee de
   vuelta por la API y comprueba que la semántica sobrevive al viaje completo.
   Usa la ruta de creación normal (orders_create) en modo carrito. */
const B = process.argv[2] || 'https://scootshop.co';

const cuerpo = {
  name: 'Carrito SCOOT SHOP (prueba atributos)',
  sku: 'G2PRO',
  amount: '624.98',
  price: '624.98',
  currency: 'EUR',
  ref: 'QA-ATTRS-' + Date.now(),
  productUrl: '/patinetes/series-k/g2-pro/',
  paymentMethod: 'transfer',
  productAttrs: { model: 'vmp' },
  productVariantText: 'Modelo: G2 PRO VMP',
  cart_items: [
    { sku: 'G2PRO', name: 'KUKIRIN G2 PRO', qty: 1, price: 515, url: '/patinetes/series-k/g2-pro/',
      color: 'vmp', colorLabel: 'G2 PRO VMP', attrs: { model: 'vmp' }, variant_text: 'Modelo: G2 PRO VMP' },
    { sku: 'ACC-BAR-WAKE', name: 'Manillar WAKE', qty: 2, price: 39.99, url: '/accesorios/manillar-wake/',
      color: 'negro-780', colorLabel: 'Negro · 780 mm', attrs: { color: 'negro', size: '780' }, variant_text: '' },
    { sku: 'M41TANK', name: 'M41 Tank (linea antigua)', qty: 1, price: 530, url: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/',
      color: 'negro', colorLabel: 'Negro' }
  ],
  shipping: { fullName: 'QA Atributos', email: 'qa-attrs@example.com', phone: '600000000',
    addressLine1: 'Calle Prueba 1', postalCode: '28001', city: 'Madrid', province: 'Madrid', country: 'España' }
};

(async () => {
  const crear = await fetch(B + '/api/orders/manual-create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': B, 'Referer': B + '/pago' }, body: JSON.stringify(cuerpo)
  });
  const datos = await crear.json().catch(() => ({}));
  if (!datos || !datos.ok || !datos.orderId) {
    console.log('✘ no se pudo crear el pedido:', crear.status, JSON.stringify(datos).slice(0, 300));
    process.exit(1);
  }
  console.log('pedido creado:', datos.orderId, 'token:', String(datos.token || '').slice(0, 8) + '…');

  /* Se lee por la MISMA ruta que usa la página /pedido del cliente. */
  const url = B + '/api/index.php?route=account_order_detail&id=' + encodeURIComponent(datos.orderId) +
    (datos.token ? '&token=' + encodeURIComponent(datos.token) : '');
  const leido = await (await fetch(url)).json().catch(() => ({}));
  const items = (leido && leido.order && (leido.order.order_items || leido.order.items)) || [];
  if (!items.length) console.log('respuesta cruda:', JSON.stringify(leido).slice(0, 600));
  let fallos = 0;
  const esperado = ['Modelo: G2 PRO VMP', 'Medida: 780 mm · Color: Negro', 'Color: Negro'];
  items.forEach((it, i) => {
    const t = String(it.variant_text || '');
    const ok = t === esperado[i];
    if (!ok) fallos++;
    console.log((ok ? '✔ ' : '✘ ') + ('linea ' + (i + 1) + ' ' + (it.sku || '')).padEnd(28) +
      'variant_text="' + t + '"' + (ok ? '' : '  (esperado "' + esperado[i] + '")') +
      '  attrs=' + JSON.stringify(it.attrs || null));
  });
  if (items.length !== 3) { fallos++; console.log('✘ lineas devueltas: ' + items.length); }
  console.log(fallos ? '\n✘ PEDIDO_E2E_KO' : '\n✔ PEDIDO_E2E_OK — la semántica sobrevive al backend');
  console.log('(pedido de prueba: ' + datos.orderId + ' — queda en estado pendiente de pago)');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
