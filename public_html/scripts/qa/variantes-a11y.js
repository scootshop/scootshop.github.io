/* Puntos 22, 23 y 24: accesibilidad, responsive y rendimiento del selector. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('A11Y_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';
const RUTAS = ['/patinetes/ecoxtrem/m41-armored-dual/', '/patinetes/series-k/g2-pro/', '/accesorios/manillar-wake/'];

(async () => {
  const br = await chromium.launch();
  let fallos = 0;
  const check = (id, ok, det) => { if (!ok) fallos++; console.log((ok ? '✔ ' : '✘ ') + id.padEnd(48) + det); };

  for (const ancho of [1440, 768, 390]) {
    const p = await (await br.newContext({ viewport: { width: ancho, height: 1000 } })).newPage();
    for (const ruta of RUTAS) {
      await p.goto(B + ruta, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      const r = await p.evaluate(() => {
        const ops = Array.from(document.querySelectorAll('.variant-option'));
        /* UNA opción activa POR EJE: una ficha de dos ejes tiene dos activas, y eso
           es lo correcto. Contarlas en total daba un falso fallo. */
        const rejillas = Array.from(document.querySelectorAll('.variant-axis-grid'))
          .filter(g => g.querySelector('.variant-option'));
        const activosPorEje = rejillas.map(g => g.querySelectorAll('.is-active').length);
        const ejesOk = rejillas.length > 0 && activosPorEje.every(n => n === 1);
        const sinNombre = ops.filter(o => !(o.getAttribute('aria-label') || o.textContent.trim()));
        const sinPressed = ops.filter(o => !o.hasAttribute('aria-pressed'));
        const noBoton = ops.filter(o => o.tagName !== 'BUTTON');
        const desbordan = ops.filter(o => o.getBoundingClientRect().right > document.documentElement.clientWidth + 1);
        const pequenos = ops.filter(o => { const r = o.getBoundingClientRect(); return r.height < 32 || r.width < 32; });
        const scrollH = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        return { n: ops.length, ejes: rejillas.length, activosPorEje: activosPorEje, ejesOk: ejesOk,
                 sinNombre: sinNombre.length, sinPressed: sinPressed.length,
                 noBoton: noBoton.length, desbordan: desbordan.length, pequenos: pequenos.length, scrollH: scrollH };
      });
      const id = ruta.split('/').filter(Boolean).pop() + ' @' + ancho;
      check('a11y ' + id, r.sinNombre === 0 && r.sinPressed === 0 && r.noBoton === 0 && r.ejesOk,
        r.n + ' opciones en ' + r.ejes + ' eje(s) · sin nombre:' + r.sinNombre + ' · sin aria-pressed:' + r.sinPressed + ' · activa por eje:' + r.activosPorEje.join('/'));
      check('responsive ' + id, !r.scrollH && r.desbordan === 0 && r.pequenos === 0,
        'scroll horizontal:' + r.scrollH + ' · fuera de pantalla:' + r.desbordan + ' · bajo 32px:' + r.pequenos);
    }

    // Teclado: se llega a las opciones con TAB y se elige con Enter.
    if (ancho === 1440) {
      await p.goto(B + RUTAS[1], { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2500);
      const teclado = await p.evaluate(async () => {
        const ops = Array.from(document.querySelectorAll('.variant-option'));
        const segunda = ops[1];
        segunda.focus();
        const enfocada = document.activeElement === segunda;
        const foco = getComputedStyle(segunda, ':focus-visible');
        segunda.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 700));
        return { enfocada: enfocada, activaTrasEnter: segunda.classList.contains('is-active'), sombra: foco.boxShadow !== 'none' };
      });
      check('teclado: foco y activación', teclado.enfocada && teclado.activaTrasEnter, 'foco=' + teclado.enfocada + ' activa=' + teclado.activaTrasEnter);
    }
    await p.close();
  }

  // Rendimiento: listeners y repintados al cambiar de variante en el HOME (muchas cards).
  const p2 = await (await br.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
  await p2.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(3500);
  const home = await p2.evaluate(() => ({
    tarjetas: document.querySelectorAll('.card, .product-card, [data-add-to-cart], [data-open-variants]').length,
    disparadores: document.querySelectorAll('[data-open-variants]').length,
    scripts: document.querySelectorAll('script[src*="variant-pop"]').length
  }));
  check('perf home: una sola copia de la burbuja', home.scripts <= 1, home.tarjetas + ' elementos de tarjeta · ' + home.disparadores + ' disparadores · ' + home.scripts + ' scripts variant-pop');

  console.log(fallos ? '\n✘ A11Y_KO (' + fallos + ')' : '\n✔ A11Y_OK');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
