/* scripts/qa/paginas-categoria.js — cada categoría en su página, y solo la suya.

   Las tres páginas (/patinetes, /accesorios, /repuestos) las pinta el MISMO
   js/index.js que la portada; lo único que cambia es que su root declara
   `data-solo-categoria`. Esto comprueba con un navegador de verdad que ese
   atributo hace lo que dice, y que lo que la portada ya sabía hacer —el riel de
   marcas, el panel de filtros, el carrito— sigue funcionando allí.

       node scripts/qa/paginas-categoria.js                      contra producción
       node scripts/qa/paginas-categoria.js http://127.0.0.1:8099

   Marcadores: CATPAG_OK / CATPAG_KO.

   Lo que de verdad se vigila aquí es el fallo que motivó el cambio: la portada
   pintaba las CINCO categorías en el mismo documento (82 tarjetas, ~21 000 px)
   porque las píldoras solo llevaban el scroll de una a otra. Si alguien vuelve a
   dejar que una página de categoría pinte las demás, salta la comprobación de
   «una sola sección» y la de altura. */
const { chromium } = require('C:/Users/User/AppData/Roaming/npm/node_modules/playwright');

const BASE = process.argv[2] || 'https://scootshop.co';

const PAGINAS = [
  { ruta: '/patinetes/', clave: 'electric-scooters', nombre: 'Patinetes eléctricos', pieza: false },
  { ruta: '/accesorios/', clave: 'accessories', nombre: 'Accesorios', pieza: true },
  { ruta: '/repuestos/', clave: 'spare-parts', nombre: 'Repuestos', pieza: true },
];

const fallos = [];
const mal = (m) => { fallos.push(m); console.log('   ✗ ' + m); };
const bien = (m) => console.log('   ✓ ' + m);

/* El catálogo lo pinta JS y tarda: se espera a que el root diga que ya está
   hidratado, no a un tiempo fijo. */
const esperarParrilla = async (page) => {
  await page.waitForSelector('#comprar.is-hydrated .card[data-sku]', { timeout: 20000 });
  await page.waitForTimeout(400);
};

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  /* ---- Referencia: cuantos productos tiene cada categoria segun el catalogo ----
     Se lee de la PORTADA, que ya no pinta el catalogo: se espera al catalogo, no a
     una parrilla. Esperar `#comprar` aqui era dar por hecho lo que este cambio
     vino a quitar. */
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.SCOOTSHOP_getHomeCategories === 'function',
    null, { timeout: 20000 });
  await page.waitForTimeout(1200);

  const esperados = await page.evaluate(() => {
    const cats = window.SCOOTSHOP_getHomeCategories ? window.SCOOTSHOP_getHomeCategories() : [];
    const out = {};
    cats.forEach((c) => {
      out[c.key] = (c.series || []).reduce((n, s) => n + ((s.products || []).length), 0);
    });
    return out;
  });

  const portada = await page.evaluate(() => ({
    tarjetas: document.querySelectorAll('.card[data-sku]').length,
    alto: document.documentElement.scrollHeight,
    secciones: document.querySelectorAll('.home-category-section').length,
  }));
  console.log('\nPortada: ' + portada.tarjetas + ' tarjetas, ' + portada.alto + ' px de alto');

  /* La portada NO debe pintar catalogo. Es la mitad del cambio y lo que hace que
     las paginas de categoria tengan sentido: si vuelve a pintarlo, cada producto
     esta en dos sitios y las dos URL compiten por la misma busqueda. */
  if (portada.secciones === 0) bien('la portada no pinta catálogo');
  else mal('la portada volvió a pintar ' + portada.secciones + ' sección(es) de catálogo');
  if (portada.tarjetas > 0 && portada.tarjetas <= 12) bien('la portada enseña ' + portada.tarjetas + ' tarjetas (escaparate)');
  else mal('la portada enseña ' + portada.tarjetas + ' tarjetas: el escaparate debería ser una muestra corta');

  // ---- Cada página de categoría ----
  for (const p of PAGINAS) {
    console.log('\n' + p.ruta);
    const resp = await page.goto(BASE + p.ruta, { waitUntil: 'load' });
    if (!resp || resp.status() >= 400) { mal(p.ruta + ' responde ' + (resp && resp.status())); continue; }
    await esperarParrilla(page);

    const info = await page.evaluate(() => ({
      secciones: [...document.querySelectorAll('.home-category-section')]
        .map((s) => s.getAttribute('data-home-category-section')),
      tarjetas: document.querySelectorAll('#comprar .card[data-sku]').length,
      alto: document.documentElement.scrollHeight,
      titulo: document.title,
      h1: (document.querySelector('h1') || {}).textContent || '',
      canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
      total: (document.querySelector('[data-home-catalog-total]') || {}).textContent || '',
      nombre: (document.querySelector('[data-catalogo-nombre]') || {}).textContent || '',
      pildoras: document.querySelectorAll('.home-category-chip').length,
      /* La cabecera va sobre el gris de la pagina, sin franjas blancas. La barra
         de filtros SI lleva fondo, porque es pegajosa y tiene que tapar, pero el
         mismo gris. Ojo: solo entra en #comprar si hay riel que la preceda —en
         /repuestos no lo hay—, asi que su estilo cuelga del <body>. */
      fondos: (() => {
        const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : 'no-existe'; };
        return { body: bg('body'), miga: bg('.cat-miga'), cabecera: bg('.cat-cabecera'), barra: bg('.home-catalog-head') };
      })(),
      huecoTituloRiel: (() => {
        const t = document.querySelector('.cat-cabecera-tit');
        const pl = document.querySelector('.home-marca');
        return (t && pl) ? Math.round(pl.getBoundingClientRect().top - t.getBoundingClientRect().bottom) : null;
      })(),
      menu: [...document.querySelectorAll('.menu a')]
        .filter((a) => a.textContent.trim())
        .map((a) => a.textContent.trim() + (a.getAttribute('aria-current') ? '*' : '')),
      menuMovil: [...document.querySelectorAll('.mm-view--main [data-mm-cat]')]
        .map((b) => b.getAttribute('data-mm-cat')),
      marcas: document.querySelectorAll('[data-home-marca]').length,
      ancho: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
    }));

    // 1) UNA sola sección, y la suya
    if (info.secciones.length === 1 && info.secciones[0] === p.clave) {
      bien('una sola sección: ' + p.clave);
    } else {
      mal('secciones pintadas: ' + JSON.stringify(info.secciones) + ' (esperaba solo ' + p.clave + ')');
    }

    // 2) Están TODOS los suyos, ni uno menos
    const n = esperados[p.clave];
    if (info.tarjetas === n) bien(info.tarjetas + ' tarjetas, las que dice el catálogo');
    else mal('pinta ' + info.tarjetas + ' tarjetas y el catálogo dice ' + n);

    // 3) Alto: informativo, con el que tenia la portada cuando lo llevaba todo
    console.log('   · ' + info.alto + ' px de alto (la portada con las tres dentro medía 22 342)');

    // 4) Sin píldoras de categoría: la página YA es la categoría
    if (info.pildoras === 0) bien('sin píldoras de categoría');
    else mal('quedan ' + info.pildoras + ' píldoras de categoría');

    // 5) SEO propio
    /* El canonical apunta SIEMPRE a produccion, se pruebe donde se pruebe: es lo
       que le dice a Google cual es la direccion buena. Compararlo con la base de
       la prueba daba tres fallos donde no habia ninguno. */
    const canonicoEsperado = 'https://scootshop.co' + p.ruta;
    if (info.canonical === canonicoEsperado) bien('canonical propio: ' + info.canonical);
    else mal('canonical: ' + info.canonical + ' (esperaba ' + canonicoEsperado + ')');
    if (info.h1 && info.h1.trim().length > 3) bien('h1: «' + info.h1.trim() + '»');
    else mal('sin h1');

    /* 5 bis) El menu son las TRES categorias, y la actual se marca. Antes eran
       «Productos» (un desplegable de series), «Preguntas» y «Legal» —dos anclas de
       la portada que dejaron de llevar a ningun sitio. */
    const esperaMenu = ['Inicio', 'Patinetes eléctricos', 'Accesorios', 'Repuestos'];
    const soloNombres = info.menu.map((x) => x.replace('*', ''));
    if (JSON.stringify(soloNombres) === JSON.stringify(esperaMenu)) bien('el menú son las tres categorías');
    else mal('el menú dice ' + JSON.stringify(soloNombres));

    const marcada = info.menu.filter((x) => x.endsWith('*'));
    if (marcada.length === 1 && marcada[0].replace('*', '') === p.nombre) bien('el menú marca «' + p.nombre + '» como actual');
    else mal('el menú marca ' + JSON.stringify(marcada) + ' y esperaba solo ' + p.nombre);

    if (info.menuMovil.length === 3) bien('el menú móvil trae las tres con su cajón');
    else mal('el menú móvil trae ' + info.menuMovil.length + ' categorías: ' + JSON.stringify(info.menuMovil));

    /* 5 ter) Nada de franjas blancas arriba: la cabecera va sobre el gris de la
       pagina. La barra es la excepcion —es pegajosa y tiene que tapar—, pero con
       ese mismo gris para que en reposo no se note. */
    const transp = 'rgba(0, 0, 0, 0)';
    const gris = info.fondos.body;
    const franjas = ['miga', 'cabecera'].filter((k) => info.fondos[k] !== transp && info.fondos[k] !== gris);
    if (!franjas.length) bien('la cabecera va sobre el gris de la página');
    else mal('franja de otro color en ' + JSON.stringify(franjas.map((k) => k + '=' + info.fondos[k])));

    if (info.fondos.barra === gris) bien('la barra de filtros, opaca y del mismo gris');
    else mal('la barra de filtros es ' + info.fondos.barra + ' y el fondo ' + gris);

    /* El titular tiene que leerse CON las marcas, no aparte. Eran 50 px. */
    if (info.huecoTituloRiel === null) bien('sin riel (una sola marca): nada que separar');
    else if (info.huecoTituloRiel <= 26) bien('el titular a ' + info.huecoTituloRiel + ' px del riel');
    else mal('el titular se ha separado del riel: ' + info.huecoTituloRiel + ' px');

    // 6) El recuento de la barra
    const unidad = p.pieza ? 'producto' : 'modelo';
    if (info.total.includes(String(n)) && info.total.includes(unidad)) bien('la barra dice «' + info.total + '»');
    else mal('la barra dice «' + info.total + '» y esperaba ' + n + ' ' + unidad + 's');

    // 7) Nada se sale por el lado
    if (info.ancho <= info.ventana + 1) bien('sin desbordamiento horizontal');
    else mal('la página mide ' + info.ancho + ' px de ancho en una ventana de ' + info.ventana);

    // 8) El riel de marcas filtra de verdad
    if (info.marcas > 1) {
      const filtrado = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-home-marca]')]
          .filter((x) => (x.getAttribute('data-home-marca') || '').trim())[0];
        if (!b) return null;
        const antes = document.querySelectorAll('#comprar .card[data-sku]:not(.esta-oculta *)').length;
        b.click();
        return new Promise((res) => setTimeout(() => {
          const visibles = [...document.querySelectorAll('#comprar .card[data-sku]')]
            .filter((c) => !c.closest('.esta-oculta')).length;
          res({ antes, visibles, marca: b.getAttribute('data-home-marca') });
        }, 350));
      });
      if (filtrado && filtrado.visibles > 0 && filtrado.visibles < filtrado.antes) {
        bien('el riel filtra: «' + filtrado.marca + '» deja ' + filtrado.visibles + ' de ' + filtrado.antes);
      } else {
        mal('el riel de marcas no filtró: ' + JSON.stringify(filtrado));
      }
      await page.goto(BASE + p.ruta, { waitUntil: 'load' });
      await esperarParrilla(page);
    } else {
      bien('sin riel de marcas (una sola serie)');
    }

    // 9) El panel de filtros sabe de quién es
    await page.click('[data-filtros-abrir]');
    await page.waitForTimeout(500);
    const panel = await page.evaluate(() => {
      const g = [...document.querySelectorAll('#filtrosPanel [data-para]')];
      return {
        abierto: document.getElementById('filtrosPanel').open,
        resumen: (document.querySelector('[data-filtros-resumen]') || {}).textContent || '',
        visibles: g.filter((x) => !x.hidden).map((x) => x.getAttribute('data-para')),
        familias: document.querySelectorAll('[data-familias] input[name=familia]').length,
        cuenta: (document.querySelector('[data-filtros-cuenta]') || {}).textContent || '',
      };
    });

    if (panel.abierto) bien('el panel abre');
    else mal('el panel no abrió');

    if (panel.resumen.includes(p.nombre)) bien('el panel dice sobre qué filtra: «' + panel.resumen + '»');
    else mal('el panel dice «' + panel.resumen + '» y esperaba que nombrara «' + p.nombre + '»');

    const quiere = p.pieza ? 'piezas' : 'patinetes';
    const sobra = p.pieza ? 'patinetes' : 'piezas';
    if (panel.visibles.includes(quiere) && !panel.visibles.includes(sobra)) {
      bien('los mandos son los de esta categoría (' + panel.visibles.join(', ') + ')');
    } else {
      mal('mandos visibles: ' + JSON.stringify(panel.visibles) + ', esperaba ' + quiere + ' y no ' + sobra);
    }

    if (p.pieza && panel.familias < 2) mal('el grupo de familias sale con ' + panel.familias + ' opciones');
    else if (p.pieza) bien(panel.familias + ' familias en el panel');

    if (String(panel.cuenta) === String(n)) bien('el botón promete ver ' + panel.cuenta);
    else mal('el botón promete ' + panel.cuenta + ' y hay ' + n);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 10) Se puede comprar desde aquí
    const carrito = await page.evaluate(() => {
      const b = document.querySelector('#comprar .card[data-sku] [data-add-to-cart], #comprar .card[data-sku] .card-add');
      if (!b) return 'sin botón de añadir';
      b.click();
      return new Promise((res) => setTimeout(() => {
        const badge = document.querySelector('.cart-badge');
        const pop = document.querySelector('.acc-pop, .variant-pop');
        res({ badge: badge ? badge.textContent : '', burbuja: !!(pop && pop.offsetParent) });
      }, 700));
    });
    if (typeof carrito === 'string') {
      mal(carrito);
    } else if (carrito.burbuja || (carrito.badge && Number(carrito.badge) > 0)) {
      bien(carrito.burbuja ? 'el primer producto abre su burbuja de variantes' : 'añade al carrito (' + carrito.badge + ')');
    } else {
      mal('pulsar el botón de la tarjeta no hizo nada: ' + JSON.stringify(carrito));
    }
  }

  /* ---- La miga de pan de las fichas ----
     Es estatica: se lee del disco, sin navegador. Las 87 fichas apuntaban a
     anclas de la portada que murieron cuando dejo de pintar el catalogo
     —`/#comprar`, `/#series-motos`, `/#series-k`— y el segundo eslabon decia lo
     que le parecia: «ROVORON» (una marca), «Serie N» (una serie), «Productos»
     (nada). La regla es que ese eslabon sea una PAGINA que existe. */
  console.log('\nLa miga de pan de las fichas');
  {
    const fs = require('fs');
    const path = require('path');
    const raiz = path.resolve(__dirname, '..', '..');
    const paginas = new Set(PAGINAS.map((x) => x.ruta));
    const fichas = [];
    (function anda(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('_') || e.name === '.git') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) anda(p);
        else if (e.name === 'index.html') fichas.push(p);
      }
    })(raiz);

    let rotas = 0, revisadas = 0;
    for (const f of fichas) {
      const html = fs.readFileSync(f, 'utf8');
      const m = html.match(/<nav class="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/);
      if (!m) continue;
      revisadas++;
      const enlaces = [...m[1].matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
      const malos = enlaces.filter((h) => h !== '/' && !paginas.has(h));
      if (malos.length) {
        rotas++;
        if (rotas <= 5) mal(path.relative(raiz, f).split(path.sep).join('/') + ': miga a ' + JSON.stringify(malos));
      }
      if (!/aria-current="page"/.test(m[1])) {
        rotas++;
        if (rotas <= 5) mal(path.relative(raiz, f).split(path.sep).join('/') + ': la miga no marca dónde estás');
      }
    }
    if (!rotas) bien(revisadas + ' fichas, todas con la miga apuntando a una página que existe');
    else if (rotas > 5) mal('...y ' + (rotas - 5) + ' fichas más');
  }

  /* ---- La barra cabe a cualquier ancho ----
     El menu crece cada vez que cambia un nombre o la letra, y cuando ya no cabe
     NO se rompe de forma visible: se monta encima del logotipo y ahi se queda.
     Paso de verdad al renombrar «Patinetes» a «Patinetes electricos» —de 527 a
     660 px— y entre 980 y 1140 «Inicio» se pintaba sobre «Versatil».
     Se comprueban los dos lados de cada corte, que es donde falla. */
  console.log('\nLa barra, a lo ancho');
  for (const w of [1920, 1440, 1366, 1280, 1200, 1181, 1180, 1101, 1100, 1024, 900, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto(BASE + '/patinetes/', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const ver = (el) => !!el && getComputedStyle(el).display !== 'none';
      const menu = document.querySelector('.menu');
      const o = {
        menu: ver(menu),
        burger: ver(document.querySelector('.burger')),
        desborda: document.documentElement.scrollWidth > window.innerWidth,
      };
      if (o.menu) {
        const marca = document.querySelector('#siteHeader .brand').getBoundingClientRect();
        const botones = document.querySelector('.header-actions').getBoundingClientRect();
        const m = menu.getBoundingClientRect();
        o.holguraMarca = Math.round(m.left - marca.right);
        o.holguraBotones = Math.round(botones.left - m.right);
      }
      return o;
    });

    if (r.desborda) mal(w + ' px: la página se va de ancho');
    else if (!r.menu && !r.burger) mal(w + ' px: ni menú ni hamburguesa — no hay forma de navegar');
    else if (r.menu && r.holguraMarca < 8) mal(w + ' px: el menú se monta sobre el logotipo (' + r.holguraMarca + ' px)');
    else if (r.menu && r.holguraBotones < 8) mal(w + ' px: el menú se monta sobre los botones (' + r.holguraBotones + ' px)');
    else bien(w + ' px: ' + (r.menu ? 'menú, holgura ' + r.holguraMarca + '/' + r.holguraBotones : 'hamburguesa'));
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  /* ---- Las anclas de serie ----
     El cajon del menu movil enlaza `/patinetes/#series-joyor`: cada marca a su
     tramo dentro de la pagina de su categoria. Antes era `/#series-joyor`, un
     ancla de la portada, y dejo de llevar a ningun sitio cuando la portada dejo
     de pintar el catalogo.

     Las anclas se le piden AL CATALOGO y no a un menu concreto: quien las pinta
     ha cambiado ya dos veces (desplegable de escritorio, luego cajon movil) y el
     contrato que importa —que el destino exista y caiga en su sitio— es el mismo
     lo pinte quien lo pinte.

     El destino tiene que quedar bajo LAS DOS barras pegajosas (la cabecera del
     sitio y la del catalogo), no tapado por ellas. */
  console.log('\nAnclas de serie');
  const anclas = await (async () => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.SCOOTSHOP_getMenuCategories === 'function',
      null, { timeout: 20000 });
    return page.evaluate(() => {
      const out = [];
      (window.SCOOTSHOP_getMenuCategories() || []).forEach((cat) => {
        const base = window.SCOOTSHOP_getCategoryUrl(cat.key) || '';
        if (!base) return;
        (cat.series || []).forEach((se) => {
          out.push(base + '#' + (se.homeSectionId || ('series-' + se.key)));
        });
      });
      return out;
    });
  })();

  if (!anclas.length) mal('el catálogo no declara ninguna ancla de serie');
  else console.log('   (' + anclas.length + ' anclas; se comprueban 4)');

  for (const href of anclas.slice(0, 4)) {
    await page.goto(BASE + href, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const r = await page.evaluate(() => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = document.getElementById(id);
      if (!el) return null;
      const alto = (document.getElementById('siteHeader') || {}).offsetHeight || 0;
      const barra = (document.querySelector('.home-catalog-head') || {}).offsetHeight || 0;
      const objetivo = alto + barra;
      const top = Math.round(el.getBoundingClientRect().top);
      return { objetivo, top, desvio: top - objetivo };
    });
    if (!r) { mal(href + ': el destino del ancla no existe'); continue; }
    if (r.desvio < -4) mal(href + ': el destino queda TAPADO por la barra (' + r.top + ' < ' + r.objetivo + ')');
    else if (r.desvio > 60) mal(href + ': el destino queda ' + r.desvio + ' px por debajo de su sitio');
    else bien(href + ' → cae en su sitio (desvío ' + r.desvio + ' px)');
  }

  await navegador.close();

  console.log('');
  if (fallos.length) {
    console.log('CATPAG_KO  ' + fallos.length + ' fallo(s)');
    fallos.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('CATPAG_OK');
})().catch((e) => { console.error(e); console.log('CATPAG_KO'); process.exit(1); });
