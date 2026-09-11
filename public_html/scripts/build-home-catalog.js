/* scripts/build-home-catalog.js — hornea la parrilla de la home dentro de index.html.

   ⚠ ESTÁ DESACTIVADO A PROPÓSITO. Funciona, está probado y se activa con un comando,
   pero MEDIDO sale perdiendo. A/B con servidores concurrentes, 4 tomas por lado:

       sin hornear   score 72/71/69/69   FCP 2418   LCP 10704   SI 2959
       horneada      score 69/66/67/67   FCP 2865   LCP 12613   SI 4393

   Cuesta 4 puntos, 450 ms de primer pintado y 1 430 ms de Speed Index, y el motivo es
   evidente en cuanto se mira la red: 84 KB más de HTML que analizar, 44 subárboles más
   que maquetar, y una decena de fotos de tarjeta que el navegador descubre de golpe a
   los 220 ms y que le disputan el ancho de banda a la portada, que es el LCP.

   Lo que compraba —el velo de la vuelta atrás baja de 670 a 340 ms, y los 44 productos
   pasan a estar en el HTML para quien no ejecute JavaScript— no vale ese precio hoy: la
   vuelta atrás YA acierta al píxel sin esto (`scripts/qa/volver-atras.js`).

   Se conserva porque la decisión puede cambiar: si algún día el SEO de la home pesa más
   que cuatro puntos, es `node scripts/build-home-catalog.js` y desplegar index.html.

   EL PROBLEMA QUE RESOLVERÍA
   `index.html` traía `<div data-home-catalog-root></div>` VACÍO: los 44 productos —unos
   12 600 px de página— los pintaba `js/index.js` después de cargar. De ahí venían dos
   cosas: que al volver atrás el navegador no pudiera restaurar la posición por sí mismo
   (cuando lo intenta, el documento aún mide una pantalla), lo que obligaba a tapar la
   página mientras se recolocaba; y que el catálogo no exista en el HTML para quien no
   ejecute JavaScript.

   LO QUE HACE
   Abre la home en un navegador de verdad, le pide el marcado al MISMO código que lo
   pinta (`SCOOTSHOP_HOME_CARD_API.catalogoHorneable`) y lo guarda dentro de index.html
   junto a su firma. No hay un segundo generador que pueda separarse del primero: esto
   es una caché de la salida del único que hay, igual que `data/attributes-index.json`.

       node scripts/build-home-catalog.js            hornea
       node scripts/build-home-catalog.js --check    falla si lo horneado está viejo

   POR QUÉ SE AÑADE `reveal-ready` A CADA TARJETA
   Las tarjetas entran con una animación (opacidad 0 → 1) que monta `initCardReveal()`.
   Si se hornean visibles, se ven pintadas desde el primer momento y luego, cuando el JS
   arranca, se apagan y vuelven a entrar: un parpadeo de 600 ms que antes no existía.
   Horneadas ya con la clase, lo que se ve es exactamente lo de siempre.
   La contrapartida está resuelta en el otro extremo: al VOLVER atrás no se reproduce la
   animación (nadie quiere que le vuelvan a presentar lo que ya había visto), así que el
   arranque en línea marca `html.ss-sin-entrada` y el CSS las enseña sin transición.
*/
const fs = require('fs');
const http = require('http');
const path = require('path');
// Playwright desde el helper comun, no desde la ruta de UNA maquina.
const { chromium } = require('./qa/_playwright').exigirPlaywright('HOME_CATALOG_OK');

const RAIZ = path.resolve(__dirname, '..');
const INDEX = path.join(RAIZ, 'index.html');
const COMPROBAR = process.argv.indexOf('--check') !== -1;

const ABRE = '<!-- CATALOGO HORNEADO: lo genera scripts/build-home-catalog.js — no editar a mano -->';
const CIERRA = '<!-- FIN CATALOGO HORNEADO -->';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

function servidor() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      let f = path.join(RAIZ, p);
      try {
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
        if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        res.end(fs.readFileSync(f));
      } catch (e) { res.writeHead(500); res.end(); }
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, puerto: s.address().port }));
  });
}

/* El marcado se hornea con la clase de la animación de entrada; ver la cabecera.
   El patrón es estricto a propósito: `class="card-media"` empieza igual que
   `class="card"` y una sustitución perezosa lo rompería. */
function conAnimacionDeEntrada(html) {
  return html.replace(/class="(card(?: has-dgt)?)"/g, 'class="$1 reveal-ready"');
}

function envolver(htmlCatalogo, firma) {
  return '<div id="comprar" data-home-catalog-root class="is-hydrated" data-home-catalog-firma="' + firma + '">\n'
    + '    ' + ABRE + '\n'
    + conAnimacionDeEntrada(htmlCatalogo) + '\n'
    + '    ' + CIERRA + '\n'
    + '    </div>';
}

const RAIZ_EN_HTML = /[ \t]*<div id="comprar" data-home-catalog-root[^>]*>[\s\S]*?<\/div>(?=\s*\r?\n\s*<section class="features)/;

(async () => {
  const { s, puerto } = await servidor();
  const br = await chromium.launch();
  let salida = 0;
  try {
    const p = await br.newPage();
    const fallos = [];
    p.on('pageerror', (e) => fallos.push(e.message));
    await p.goto('http://127.0.0.1:' + puerto + '/', { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => window.SCOOTSHOP_HOME_CARD_API
      && typeof window.SCOOTSHOP_HOME_CARD_API.catalogoHorneable === 'function', { timeout: 30000 });
    const r = await p.evaluate(() => window.SCOOTSHOP_HOME_CARD_API.catalogoHorneable());
    if (fallos.length) throw new Error('la home lanzó errores: ' + fallos[0].slice(0, 120));
    if (!r || !r.html || r.html.length < 10000) throw new Error('marcado sospechosamente corto');

    const tarjetas = (r.html.match(/<article class="card/g) || []).length;
    const html = fs.readFileSync(INDEX, 'utf8');
    if (!RAIZ_EN_HTML.test(html)) throw new Error('no encuentro el hueco del catálogo en index.html');

    const nuevo = html.replace(RAIZ_EN_HTML, '    ' + envolver(r.html, r.firma));

    if (COMPROBAR) {
      /* Hornear es OPCIONAL y ahora mismo está DESACTIVADO a propósito (ver cabecera).
         Comprobar solo tiene sentido si alguien lo activó: si el hueco está vacío, esto
         no es un fallo, es la configuración elegida. */
      if (html.indexOf(ABRE) === -1) {
        console.log('HOME_HORNEADA_NO — la parrilla no está horneada (opción desactivada, es lo esperado)');
      } else if (nuevo !== html) {
        console.log('HOME_HORNEADA_KO — index.html tiene la parrilla horneada pero VIEJA.');
        console.log('   Regenera con: node scripts/build-home-catalog.js');
        salida = 1;
      } else {
        console.log('HOME_HORNEADA_OK — ' + tarjetas + ' tarjetas, firma ' + r.firma);
      }
    } else {
      fs.writeFileSync(INDEX, nuevo, 'utf8');
      console.log('parrilla horneada en index.html');
      console.log('   categoría : ' + r.clave);
      console.log('   tarjetas  : ' + tarjetas);
      console.log('   firma     : ' + r.firma);
      console.log('   index.html: ' + Math.round(html.length / 1024) + ' KB → ' + Math.round(nuevo.length / 1024) + ' KB');
    }
  } catch (e) {
    console.error('FALLO: ' + e.message);
    salida = 1;
  } finally {
    await br.close();
    s.close();
  }
  process.exit(salida);
})();
