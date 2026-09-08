/* ¿SE ACTUALIZA EL PANEL, Y SIN LLEVARSE POR DELANTE LO QUE ESTÁS ESCRIBIENDO?
 *
 * Con un navegador de verdad contra el panel de verdad, y SOLO por el DOM: todo el
 * código del panel vive dentro de una IIFE, así que desde fuera no hay funciones ni
 * variables que llamar. Se pulsa y se lee lo que se ve, que además es lo que importa.
 *
 *   D. Estando quieto dentro de un pedido NO se repinta: el nodo que había sigue
 *      siendo el mismo nodo. (Es lo que hace posible todo lo demás sin pausas.)
 *   A. Un cambio que NO hace el admin —el cliente edita su dirección, entra un pago—
 *      aparece solo, sin tocar nada.
 *   B. Ese repintado NO borra lo que el admin tenía escrito en un campo.
 *   C. Y se le AVISA de que el servidor traía otra cosa, para que no guarde encima
 *      algo viejo.
 *   E. Un guardado desde el panel se ve al momento, sin esperar al reloj de 3 s.
 *
 * El cambio "externo" se simula con `admin_order_notes`: campo privado, no dispara
 * ningún correo al cliente, y se deja como estaba al terminar. NUNCA se toca el estado
 * de un pedido desde aquí — eso sí manda correos de verdad.
 *
 *   node scripts/qa/panel-refresco.js [base]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { cargarPlaywright } = require('./_playwright.js');

const BASE = (process.argv[2] || 'https://scootshop.co').replace(/\/$/, '');
const RAIZ = path.resolve(__dirname, '..', '..');

/* Las dos claves posibles, sin decidir cual: .env.local es la del entorno local y .env
   la de produccion, y cual vale depende del `base` contra el que se corra. Se prueban
   las dos contra el servidor y se usa la que conteste. */
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
    const r = await fetch(BASE + '/api/?route=admin_orders_list&limit=1&_t=' + Date.now(), {
      headers: { 'X-Admin-Key': k }, cache: 'no-store'
    });
    const d = await r.json().catch(() => ({}));
    if (d && d.ok) { KEY = k; return true; }
  }
  return false;
}

async function api(ruta, cuerpo) {
  const opciones = { headers: { 'X-Admin-Key': KEY, 'Content-Type': 'application/json' }, cache: 'no-store' };
  if (cuerpo !== undefined) { opciones.method = 'POST'; opciones.body = JSON.stringify(cuerpo); }
  const r = await fetch(BASE + '/api/?route=' + ruta + '&_t=' + Date.now(), opciones);
  return r.json().catch(() => ({}));
}

const fallos = [];
function comprobar(ok, titulo, detalle) {
  console.log((ok ? '  ✓ ' : '  ✘ ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!ok) fallos.push(titulo);
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

/* Espera a que una lectura del DOM cumpla algo, hasta agotar el plazo. */
async function hasta(pag, fn, arg, plazo) {
  const fin = Date.now() + plazo;
  while (Date.now() < fin) {
    if (await pag.evaluate(fn, arg).catch(() => false)) return Date.now();
    await esperar(200);
  }
  return 0;
}

(async () => {
  if (!(await elegirClave())) {
    console.log('✘ ninguna ADMIN_KEY de .env / .env.local vale para ' + BASE);
    process.exit(1);
  }
  const lista = await api('admin_orders_list&limit=1');
  const pedido = lista && lista.ok && Array.isArray(lista.orders) ? lista.orders[0] : null;
  if (!pedido) { console.log('✘ el panel no devuelve pedidos:', JSON.stringify(lista).slice(0, 200)); process.exit(1); }

  const ID = pedido.id;
  const det0 = await api('admin_order_detail&id=' + encodeURIComponent(ID));
  const NOTAS = (det0 && det0.order && det0.order.admin_notes) || '';
  console.log('pedido de pruebas: ' + ID + '   (sus notas se restauran al terminar)\n');

  const { chromium } = cargarPlaywright();
  const navegador = await chromium.launch();
  const pag = await (await navegador.newContext({ viewport: { width: 1440, height: 950 } })).newPage();

  try {
    await pag.goto(BASE + '/admin/pedidos', { waitUntil: 'domcontentloaded' });
    await pag.fill('#loginKey', KEY);
    await pag.click('#btnLogin');
    await pag.waitForSelector('#appView:not([hidden])', { timeout: 25000 });
    await pag.waitForSelector('#ordersList tr[data-id]', { timeout: 25000 });

    /* La pausa por interaccion a CERO durante toda la prueba. Con ella puesta, casi
       todo lo de abajo aprobaria sin refrescarse una sola vez: estaria midiendo la
       pausa, no la proteccion. Lo que se quiere saber es que el repintado NO destruye
       aunque llegue en el peor momento. */
    await pag.selectOption('#refreshPauseSecs', '0');
    await pag.selectOption('#refreshEvery', '3');
    await esperar(500);

    // Se abre como lo abre una persona: pulsando su fila.
    await pag.click('#ordersList tr[data-id="' + ID + '"]');
    await pag.waitForSelector('#detailView:not([hidden]) #adminNotes', { timeout: 25000 });
    await esperar(600);

    /* ---- D · quieto no repinta -------------------------------------------------- */
    await pag.evaluate(() => {
      const n = document.querySelector('#detail *');
      if (n) n.setAttribute('data-qa', '1');
      window.__qaNodo = n;
    });
    await esperar(7500); // más de dos vueltas del reloj de 3 s
    const quieto = await pag.evaluate(() =>
      !!window.__qaNodo && window.__qaNodo.isConnected && window.__qaNodo.getAttribute('data-qa') === '1');
    comprobar(quieto, 'D · quieto dentro de un pedido, NO se repinta', '7,5 s sin tocar nada');

    /* ---- A · un cambio de fuera aparece solo ------------------------------------ */
    const MARCA = 'QA externo ' + Date.now();
    const r1 = await api('admin_order_notes', { id: ID, notes: MARCA });
    if (!r1 || !r1.ok) comprobar(false, 'no se pudo aplicar el cambio externo', JSON.stringify(r1).slice(0, 120));
    const t = await hasta(pag, m => document.getElementById('adminNotes').value === m, MARCA, 9000);
    comprobar(!!t, 'A · un cambio de fuera aparece solo, sin tocar nada',
      t ? 'lo trajo el reloj' : 'no llegó en 9 s');

    /* ---- B y C · con un campo a medio escribir ---------------------------------- */
    const MIO = 'QA-NO-ME-BORRES-' + Date.now();
    await pag.click('#adminNotes');
    await pag.fill('#adminNotes', MIO);          // queda "sucio" y con el foco
    await pag.click('#tracking');                 // suelto el foco: solo queda "sucio"

    const MARCA2 = 'QA externo mientras editaba ' + Date.now();
    await api('admin_order_notes', { id: ID, notes: MARCA2 });
    await esperar(6000);                          // dos vueltas del reloj, de sobra

    const sigue = await pag.inputValue('#adminNotes');
    comprobar(sigue === MIO, 'B · el repintado NO borra lo que estabas escribiendo',
      sigue === MIO ? 'intacto' : 'quedó "' + String(sigue).slice(0, 40) + '"');

    const avisa = await pag.evaluate(() => {
      const a = document.getElementById('arDesfase');
      return !!(a && !a.hidden && /respetado/i.test(a.textContent || ''));
    });
    comprobar(avisa, 'C · avisa de que el servidor traía otro valor',
      avisa ? 'aviso visible con su botón' : 'sin aviso');

    /* ---- E · guardar se ve al momento ------------------------------------------- */
    const MARCA3 = 'QA guardado ' + Date.now();
    await pag.fill('#adminNotes', MARCA3);
    const t0 = Date.now();
    await pag.click('#btnSaveNotes');
    // Se comprueba contra el SERVIDOR: que el panel repinte su propio texto no prueba nada.
    let guardado = false, ms = 0;
    for (let i = 0; i < 25 && !guardado; i++) {
      await esperar(200);
      const d = await api('admin_order_detail&id=' + encodeURIComponent(ID));
      guardado = !!(d && d.order && d.order.admin_notes === MARCA3);
      ms = Date.now() - t0;
    }
    comprobar(guardado, 'E · el guardado llega al servidor', ms + ' ms');
    // Y el aviso de desfase tiene que haberse apagado: ya no hay nada que respetar.
    const limpio = await pag.evaluate(() => {
      const a = document.getElementById('arDesfase');
      return !a || a.hidden;
    });
    comprobar(limpio, 'E · tras guardar, el aviso de desfase se apaga');

    /* ---- H · marcar pedidos para borrarlos SOBREVIVE al refresco ----------------
       La seleccion vivia solo en el DOM y el repintado reconstruye la tabla, asi que
       cada refresco la borraba. No se notaba porque cualquier clic congelaba el
       refresco 6 s — la pausa tapaba el fallo. Al quitarla, marcabas dos pedidos, se
       desmarcaban solos y no habia forma de borrar nada. */
    await pag.click('#btnBack');
    await pag.waitForSelector('#ordersList tr[data-id]', { timeout: 20000 });
    await esperar(600);
    await pag.$$eval('#ordersList .row-cb', cbs => { cbs.slice(0, 2).forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }); });
    const marcadosAntes = await pag.$eval('#selDelCount', e => e.textContent.trim()).catch(() => '0');
    await esperar(8000);   // mas de dos vueltas del reloj
    const marcadosDespues = await pag.$eval('#selDelCount', e => e.textContent.trim()).catch(() => '0');
    const barra = await pag.$eval('#selBar', e => !e.hidden).catch(() => false);
    comprobar(marcadosAntes === '2' && marcadosDespues === '2' && barra,
      'H · lo que marcas para borrar sigue marcado tras 8 s',
      marcadosAntes + ' → ' + marcadosDespues + (barra ? ' · barra visible' : ' · BARRA OCULTA'));
    await pag.click('#selClear').catch(() => {});

    /* ---- G · el filtro de metodo de pago encuentra los pedidos ------------------
       El desplegable ofrecia stripe / transferencia / manual: ninguno coincidia con lo
       que se guarda de verdad (card, klarna, scalapay, bank), y Klarna, Scalapay y
       Tarjeta ni estaban. Se comprueba pulsando cada opcion y contando filas contra lo
       que dice la API: un filtro que no encuentra nada es peor que no tenerlo. */
    // (ya estamos en la lista: el bloque H volvio desde el detalle)
    const porMetodo = {};
    for (const o of (await api('admin_orders_list&limit=300')).orders || []) {
      const k = String(o.payment_method || '');
      porMetodo[k] = (porMetodo[k] || 0) + 1;
    }
    const GRUPOS = { card:['card'], klarna:['klarna'], scalapay:['scalapay'], paypal:['paypal'],
                     bizum:['bizum'], transfer:['transfer','bank','bank_transfer'],
                     stripe:['stripe'], _none:[''] };
    let vacios = [];
    for (const [op, alias] of Object.entries(GRUPOS)) {
      const esperados = alias.reduce((a, v) => a + (porMetodo[v] || 0), 0);
      if (!esperados) continue;                       // no hay pedidos de ese tipo: nada que exigir
      await pag.selectOption('#filterPayment', op);
      await esperar(400);
      const filas = await pag.$$eval('#ordersList tr[data-id]', t => t.length);
      if (!filas) vacios.push(op + ' (habia ' + esperados + ')');
    }
    await pag.selectOption('#filterPayment', '');
    comprobar(vacios.length === 0, 'G · cada metodo de pago encuentra sus pedidos',
      vacios.length ? 'sin resultados: ' + vacios.join(', ') : Object.keys(GRUPOS).length + ' opciones');

    /* ---- F · el refresco alcanza a TODAS las vistas ------------------------------
       Esto se lee del HTML servido, no se pulsa: comprobarlo de verdad exigiria
       guardar un producto o un descuento REALES en la tienda en produccion, y una
       prueba no puede dejar un patinete sin stock ni un segundo. Lo que se vigila aqui
       es que nadie vuelva a dejar fuera una pestaña, que es lo que pasaba: el refresco
       solo sabia del detalle y de la lista, y salia por la puerta de atras en las
       demas, asi que guardar en Clientes, Productos o Descuentos no repintaba nada. */
    const fuente = await (await fetch(BASE + '/admin/pedidos?_t=' + Date.now(), { cache: 'no-store' })).text();
    const cubre = ['orders', 'customers', 'products', 'discounts']
      .filter(t => fuente.indexOf("activeTab === '" + t + "'") !== -1).length;
    comprobar(cubre === 4, 'F · el refresco contempla las cuatro pestañas', cubre + '/4');
    comprobar(fuente.indexOf('notificarCambioAdmin') !== -1,
      'F · todo guardado pasa por el enganche unico de apiPost');

  } finally {
    await navegador.close();
    await api('admin_order_notes', { id: ID, notes: NOTAS });
    const fin = await api('admin_order_detail&id=' + encodeURIComponent(ID));
    const ok = ((fin && fin.order && fin.order.admin_notes) || '') === NOTAS;
    console.log('\n' + (ok ? '  ✓ notas del pedido restauradas' : '  ✘ NO se restauraron las notas de ' + ID));
    if (!ok) fallos.push('restaurar notas');
  }

  console.log('');
  if (fallos.length) { console.log('PANEL_REFRESCO_KO — ' + fallos.join(' · ')); process.exit(1); }
  console.log('PANEL_REFRESCO_OK');
})().catch(e => { console.error('✘ error:', e && e.message ? e.message : e); process.exit(1); });
