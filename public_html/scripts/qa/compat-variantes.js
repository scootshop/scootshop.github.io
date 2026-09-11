/* scripts/qa/compat-variantes.js — nadie con algo que elegir se añade de un clic.

   EL FALLO QUE VIGILA
   En "Añade algo más" (la caja de accesorios compatibles de cada ficha) un accesorio
   con ejes —color, medida, modelo— debe llevar al cliente a su ficha para que elija.
   El botón «+» de añadir directo es solo para los que no tienen nada que elegir: si un
   accesorio con siete colores se añade de un clic, el pedido llega SIN saber cuál hay
   que enviar, y eso no se ve hasta que alguien va a empaquetarlo.

   Pasó de verdad con el manillar WAKE Downhill (agosto 2026). La caja preguntaba por
   los ejes a `window.SS_ATTRS` antes de que el núcleo existiera —se carga unos 200 ms
   más tarde—, recibía cero ejes y concluía "no tiene variantes". Los demás accesorios
   se libraban por casualidad, porque declaran `variantHint`, que es texto plano del
   catálogo. Un fallo que solo afectaba al ÚNICO accesorio sin esa muleta.

       node scripts/qa/compat-variantes.js [base]      → COMPAT_OK / COMPAT_KO

   Se comprueba contra el DOM ya pintado, que es donde se ve la verdad: da igual por qué
   ruta se decida, lo que no puede pasar es que el botón sea el equivocado. */
/* Playwright sale del helper comun. Aqui estaba la ruta absoluta de UNA maquina:
 * fuera de ese ordenador la suite reventaba con un error de require, que se lee
 * como FALLO cuando en realidad es una OMISION. Ver scripts/qa/_playwright.js. */
const { chromium, devices } = require('./_playwright').exigirPlaywright('COMPAT_OK');

const BASE = process.argv[2] || 'https://scootshop.co';

/* Fichas con caja de compatibles. No hace falta recorrer las 44: los accesorios son
   los mismos, y con estas se cubren todas las familias que hay. */
const FICHAS = [
  '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/',
  '/patinetes/ecoxtrem/m41-armored-dual/',
  '/patinetes/ecoxtrem/m41-armored-one/',
  '/patinetes/ecoxtrem/m41-tank-dual/'
];

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ ...devices['Pixel 5'] })).newPage();
  let fallos = 0;
  let revisados = 0;

  for (const ruta of FICHAS) {
    await p.goto(BASE + ruta, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(5500);

    const filas = await p.evaluate(() => {
      const prods = (window.SCOOTSHOP_get_products ? window.SCOOTSHOP_get_products() : window.SCOOTSHOP_PRODUCTS) || [];
      const porHref = {};
      const porSku = {};
      prods.forEach(function (x) {
        if (x && x.href) porHref[x.href] = x;
        if (x && x.sku) porSku[x.sku] = x;
      });
      // Cuántas cosas hay que elegir, según el catálogo y el núcleo (ya cargado aquí).
      const opciones = (prod) => {
        if (!prod) return -1;
        const ejes = window.SS_ATTRS ? window.SS_ATTRS.ejes(prod) : [];
        let n = 0;
        ejes.forEach(function (e) { n += (e.options || []).length; });
        return ejes.length > 1 ? Math.max(n, 2) : n;
      };
      return [...document.querySelectorAll('.compat-add')].map((b) => {
        const href = b.getAttribute('data-open-variants');
        const sku = b.getAttribute('data-sku') || '';
        const prod = href ? porHref[href] : porSku[sku];
        return {
          quien: (prod && prod.name) || href || sku || '?',
          aLaFicha: !!href,
          opciones: opciones(prod),
          hint: !!(prod && prod.variantHint)
        };
      });
    });

    for (const f of filas) {
      revisados++;
      const debeElegir = f.opciones > 1 || f.hint;
      if (debeElegir && !f.aLaFicha) {
        fallos++;
        console.log('  ✘ ' + ruta + '\n      «' + f.quien + '» tiene ' + f.opciones +
          ' opciones y se añade de un clic: el pedido llegaría sin saber cuál');
      } else if (!debeElegir && f.aLaFicha) {
        fallos++;
        console.log('  ✘ ' + ruta + '\n      «' + f.quien + '» no tiene nada que elegir y aun así manda a la ficha');
      }
    }
    console.log('  ' + (filas.length ? '✔' : '–') + ' ' + ruta.padEnd(46) + filas.length + ' accesorios');
  }

  await br.close();
  console.log('\n' + (fallos
    ? 'COMPAT_KO (' + fallos + ' de ' + revisados + ')'
    : 'COMPAT_OK — ' + revisados + ' accesorios, cada uno con el botón que le toca'));
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('FALLO: ' + e.message); process.exit(1); });
