/* scripts/qa/portada-click.js — ¿la portada del carrusel se puede pulsar?

   En escritorio, hacer clic sobre la portada no hacía NADA. La causa no se veía
   leyendo el código, porque nadie llamaba a `preventDefault` ni había un manejador
   que se comiese el clic: el carrusel llamaba a `setPointerCapture()` en el
   `pointerdown`, y con la captura puesta el navegador entrega el `click` al
   elemento capturador —`DIV.hero-viewport`— en lugar de al <a> de la diapositiva.
   El enlace simplemente no se enteraba. Por eso el arreglo es capturar TARDE: solo
   cuando el puntero se ha movido más de 8 px, que es cuando ya hay un arrastre.

       node scripts/qa/portada-click.js                      contra producción
       node scripts/qa/portada-click.js http://127.0.0.1:8099

   Marcadores: PORTADA_CLICK_OK / PORTADA_CLICK_KO.

   Las dos cosas se comprueban juntas a propósito, porque arreglar una rompe la otra:
   un clic limpio tiene que abrir la ficha, y un arrastre tiene que cambiar de
   portada SIN navegar.

   TRAMPA, pisada de verdad: en un contexto táctil, `pag.mouse` no produce la
   secuencia de `pointermove` que escucha el carrusel, así que el deslizamiento
   parece no funcionar aunque en un móvil real funcione. En móvil hay que mandar
   eventos táctiles desde dentro de la página. */
/* Playwright sale del helper comun. Aqui estaba la ruta absoluta de UNA maquina:
 * fuera de ese ordenador la suite reventaba con un error de require, que se lee
 * como FALLO cuando en realidad es una OMISION. Ver scripts/qa/_playwright.js. */
const { chromium } = require('./_playwright').exigirPlaywright('PORTADA_CLICK_OK');

const base = (process.argv[2] || 'https://scootshop.co').replace(/\/$/, '');
let fallos = 0;
const ok = (b, t, x) => {
  console.log((b ? '  \u2714 ' : '  \u2718 ') + t + (x ? '   ' + x : ''));
  if (!b) fallos++;
};

const abrirHome = async (pag) => {
  await pag.goto(base + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await pag.waitForTimeout(3000);
};

(async () => {
  const nav = await chromium.launch();

  for (const [w, h, movil, etq] of [[1440, 900, false, 'ESCRITORIO'], [390, 844, true, 'MÓVIL']]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, isMobile: movil, hasTouch: movil });
    const pag = await ctx.newPage();
    console.log('\n' + etq);

    // 1) un clic limpio abre la ficha de la diapositiva activa
    await abrirHome(pag);
    const destino = await pag.evaluate(() => document.querySelector('.hero-slide.is-active').getAttribute('href'));
    await pag.click('.hero-slide.is-active');
    await pag.waitForTimeout(2200);
    ok(pag.url().includes(destino), 'un clic limpio abre la ficha', destino + ' -> ' + pag.url().replace(base, ''));

    // 2) arrastrar cambia de portada y NO navega
    await abrirHome(pag);
    const antes = await pag.evaluate(() => document.querySelector('.hero-slide.is-active img').src.split('/').pop());
    const caja = await (await pag.$('.hero-viewport')).boundingBox();
    const cy = caja.y + caja.height / 2;
    if (movil) {
      await pag.evaluate(([x0, x1, y]) => {
        const el = document.querySelector('.hero-viewport');
        const dedo = (x) => [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })];
        el.dispatchEvent(new TouchEvent('touchstart', { touches: dedo(x0), changedTouches: dedo(x0), bubbles: true }));
        for (let i = 1; i <= 8; i++) {
          const x = x0 + (x1 - x0) * i / 8;
          el.dispatchEvent(new TouchEvent('touchmove', { touches: dedo(x), changedTouches: dedo(x), bubbles: true }));
        }
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: dedo(x1), bubbles: true }));
      }, [caja.x + caja.width * 0.8, caja.x + caja.width * 0.2, cy]);
    } else {
      await pag.mouse.move(caja.x + caja.width * 0.72, cy);
      await pag.mouse.down();
      for (let i = 1; i <= 8; i++) await pag.mouse.move(caja.x + caja.width * (0.72 - 0.05 * i), cy);
      await pag.mouse.up();
    }
    await pag.waitForTimeout(1600);
    const despues = await pag.evaluate(() => document.querySelector('.hero-slide.is-active img').src.split('/').pop());
    ok(pag.url().replace(/\/$/, '') === base, 'arrastrar NO navega', pag.url().replace(base, '') || '/');
    ok(antes !== despues, 'y sí cambia de portada', antes + ' -> ' + despues);

    await ctx.close();
  }

  await nav.close();
  console.log('\n' + (fallos ? 'PORTADA_CLICK_KO (' + fallos + ')' : 'PORTADA_CLICK_OK'));
  process.exit(fallos ? 1 : 0);
})();
