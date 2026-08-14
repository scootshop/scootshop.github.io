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
const { chromium, devices } = require('C:/Users/User/AppData/Roaming/npm/node_modules/playwright');

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
      await p.evaluate(() => window.scrollTo(0, 2600));
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

  // 2) Entrar por el logo NO es volver: la home debe abrirse arriba. Este era el
  //    fallo más visible del mecanismo anterior, que guardaba la posición en una
  //    marca global de la pestaña y la aplicaba viniera el cliente de donde viniera.
  {
    const { ctx, p } = await nueva(br);
    try {
      await p.goto(BASE + '/', { waitUntil: 'load' });
      await p.waitForTimeout(3500);
      await p.evaluate(() => window.scrollTo(0, 2600));
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
      await p.evaluate(() => window.scrollTo(0, 2000));
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
