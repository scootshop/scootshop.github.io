/* scripts/qa/volver-atras.js — ¿vuelvo donde estaba?

   Recorre con un navegador de verdad los cinco caminos por los que el cliente se
   quejaba, y compara la posición al volver con la posición al salir. Existe porque
   los tres fallos que tenía el mecanismo anterior no se veían leyendo el código: se
   veían midiendo.

       node scripts/qa/volver-atras.js                      contra producción
       node scripts/qa/volver-atras.js http://127.0.0.1:8099

   Marcadores: VOLVER_OK / VOLVER_KO.

   DOS TRAMPAS AL ESCRIBIR PRUEBAS DE SCROLL, las dos pisadas de verdad:
   - `elemento.click()` de Playwright CENTRA el elemento antes de pulsarlo, así que
     mueve el scroll que se está midiendo. Aquí se pulsa desde dentro de la página.
   - La tarjeta de la home no es un enlace: es un <article> con un manejador que hace
     `location.href`. Buscar `a.card` no encuentra nada.

   El bfcache no se puede comprobar desde aquí: con el navegador instrumentado queda
   desactivado. Lo que sí se comprueba es el camino malo —recargar la página entera—,
   que es justo donde estaban los fallos. */
/* Playwright sale del helper comun. Aqui estaba la ruta absoluta de UNA maquina:
 * fuera de ese ordenador la suite reventaba con un error de require, que se lee
 * como FALLO cuando en realidad es una OMISION. Ver scripts/qa/_playwright.js. */
const { chromium, devices } = require('./_playwright').exigirPlaywright('VOLVER_OK');

const BASE = process.argv[2] || 'https://scootshop.co';
const TOLERANCIA = 40;   // px: por debajo de esto nadie nota nada

const resultados = [];
function anotar(nombre, ok, detalle) {
  resultados.push({ nombre: nombre, ok: ok });
  console.log('  ' + (ok ? '✔' : '✘') + ' ' + nombre.padEnd(46) + detalle);
}

async function nueva(br) {
  const ctx = await br.newContext({ ...devices['Pixel 5'] });
  return { ctx: ctx, p: await ctx.newPage() };
}

const y = (p) => p.evaluate(() => Math.round(window.scrollY));

/* Baja hasta donde HAY tarjetas, en vez de a una altura fija. Con un número a
   pelo, cualquier cambio de altura en la parte alta de la home dejaba la primera
   tarjeta unos píxeles por encima del borde y la prueba fallaba por no encontrar
   dónde pulsar — no por la vuelta atrás, que es lo que se quiere medir. */
async function irADondeHayTarjetas(p) {
  await p.evaluate(() => {
    const c = document.querySelector('article.card');
    if (c) window.scrollTo(0, Math.round(c.getBoundingClientRect().top + window.scrollY - 120));
    else window.scrollTo(0, 2600);
  });
}

/* Pulsa desde dentro de la página, sin que nadie recoloque nada. */
async function pulsarTarjetaVisible(p) {
  const ok = await p.evaluate(() => {
    const dentro = (e) => { const r = e.getBoundingClientRect(); return r.top > 0 && r.top < innerHeight - 60 && r.height > 60; };
    const c = [...document.querySelectorAll('article.card')].filter(dentro);
    if (!c.length) return false;
    c[0].click();
    return true;
  });
  if (!ok) throw new Error('no hay tarjeta visible a esta altura');
  await p.waitForLoadState('load');
}

async function pulsarEnlaceVisible(p, selector) {
  const ok = await p.evaluate((sel) => {
    const dentro = (e) => { const r = e.getBoundingClientRect(); return r.top > 0 && r.top < innerHeight - 20 && r.width > 0; };
    const a = [...document.querySelectorAll(sel)].filter(dentro);
    if (!a.length) return false;
    a[0].click();
    return true;
  }, selector);
  if (!ok) throw new Error('no hay enlace visible: ' + selector);
  await p.waitForLoadState('load');
}

(async () => {
  const br = await chromium.launch();
  console.log('volver atrás — ' + BASE + '\n');

  // 1) El camino de siempre: home → producto → atrás.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await irADondeHayTarjetas(p);
      await p.waitForTimeout(700);
      const salida = await y(p);
      await pulsarTarjetaVisible(p);
      await p.waitForTimeout(2000);
      await p.goBack({ waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      anotar('home → producto → atrás', Math.abs(vuelta - salida) <= TOLERANCIA,
        'salí en ' + salida + ', vuelvo a ' + vuelta);
    } catch (e) { anotar('home → producto → atrás', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 1 bis) EL CAMINO MAS FRECUENTE desde que cada categoria tiene su pagina:
  //        /patinetes → ficha → atras. Aqui la parrilla es larga (59 modelos), asi
  //        que es donde mas se nota caer en otro sitio. La portada ya solo enseña
  //        ocho tarjetas y por si sola no probaba este caso.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/patinetes/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await irADondeHayTarjetas(p);
      await p.waitForTimeout(700);
      const salida = await y(p);
      await pulsarTarjetaVisible(p);
      await p.waitForTimeout(2000);
      await p.goBack({ waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      anotar('/patinetes → ficha → atrás', Math.abs(vuelta - salida) <= TOLERANCIA,
        'salí en ' + salida + ', vuelvo a ' + vuelta);
    } catch (e) { anotar('/patinetes → ficha → atrás', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 1 ter) Y entrar en la categoria DE NUEVO no es volver: debe abrirse arriba.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/patinetes/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await irADondeHayTarjetas(p);
      await p.waitForTimeout(700);
      await pulsarTarjetaVisible(p);
      await p.waitForTimeout(2000);
      await p.goto(BASE + '/patinetes/', { waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      anotar('entrar en /patinetes abre arriba', vuelta <= TOLERANCIA, 'y=' + vuelta);
    } catch (e) { anotar('entrar en /patinetes abre arriba', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 2) Entrar por el logo NO es volver: la home debe abrirse arriba. Este era el
  //    fallo más visible del mecanismo anterior, que guardaba la posición en una
  //    marca global de la pestaña y la aplicaba viniera el cliente de donde viniera.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await irADondeHayTarjetas(p);
      await p.waitForTimeout(700);
      await pulsarTarjetaVisible(p);
      await p.waitForTimeout(2000);
      await p.goto(BASE + '/', { waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      anotar('entrar por el logo abre arriba', vuelta <= TOLERANCIA, 'y=' + vuelta);
    } catch (e) { anotar('entrar por el logo abre arriba', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 3) Leyendo una ficha, ir a un accesorio y volver. Antes devolvía SIEMPRE al tope.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/patinetes/ecoxtrem/m41-armored-dual/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      const colocado = await p.evaluate(() => {
        const a = document.querySelector('a[href^="/accesorios/"]');
        if (!a) return null;
        window.scrollTo(0, Math.max(0, a.getBoundingClientRect().top + window.scrollY - 300));
        return Math.round(window.scrollY);
      });
      if (colocado === null) throw new Error('la ficha no ofrece accesorios');
      await p.waitForTimeout(800);
      const salida = await y(p);
      await pulsarEnlaceVisible(p, 'a[href^="/accesorios/"]');
      await p.waitForTimeout(2000);
      await p.goBack({ waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      anotar('ficha → accesorio → atrás', Math.abs(vuelta - salida) <= TOLERANCIA,
        'leía en ' + salida + ', vuelvo a ' + vuelta);
    } catch (e) { anotar('ficha → accesorio → atrás', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 4) Entrar en una ficha por primera vez SIEMPRE abre arriba.
  {
    const { ctx, p } = await nueva(br);
    let mal = 0;
    const rutas = ['/patinetes/ecoxtrem/m41-armored-dual/', '/patinetes/series-k/g2-pro/', '/accesorios/manillar-uno/'];
    try {
      for (const ruta of rutas) {
        await p.goto(BASE + ruta, { waitUntil: 'load' });
        await p.waitForTimeout(3500);
        if (await y(p) > TOLERANCIA) mal++;
      }
      anotar('entrar en una ficha abre arriba', mal === 0, rutas.length - mal + '/' + rutas.length + ' fichas');
    } catch (e) { anotar('entrar en una ficha abre arriba', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  // 5) Dos saltos y dos vueltas: la posición de la home tiene que seguir ahí. Con una
  //    sola marca global esto se pisaba solo.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await irADondeHayTarjetas(p);
      await p.waitForTimeout(600);
      const salida = await y(p);
      await pulsarTarjetaVisible(p);
      await p.waitForTimeout(2000);
      try {
        await pulsarEnlaceVisible(p, 'a[href^="/accesorios/"]');
        await p.waitForTimeout(1800);
        await p.goBack({ waitUntil: 'load' });
        await p.waitForTimeout(1800);
      } catch (_) { /* esa ficha no tenía accesorios a la vista */ }
      await p.goBack({ waitUntil: 'load' });
      await p.waitForTimeout(4000);
      const vuelta = await y(p);
      const ruta = await p.evaluate(() => location.pathname);
      anotar('home → ficha → ficha → atrás → atrás', ruta === '/' && Math.abs(vuelta - salida) <= TOLERANCIA,
        'salí en ' + salida + ', vuelvo a ' + vuelta + ' (' + ruta + ')');
    } catch (e) { anotar('home → ficha → ficha → atrás → atrás', false, e.message.slice(0, 60)); }
    await ctx.close();
  }

  await br.close();
  const malos = resultados.filter((r) => !r.ok).length;
  console.log('\n' + (malos ? 'VOLVER_KO (' + malos + ' de ' + resultados.length + ')'
    : 'VOLVER_OK — ' + resultados.length + ' caminos, todos vuelven donde tocaba'));
  process.exit(malos ? 1 : 0);
})().catch((e) => { console.error('FALLO: ' + e.message); process.exit(1); });
