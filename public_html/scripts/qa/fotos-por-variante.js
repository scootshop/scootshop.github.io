/* scripts/qa/fotos-por-variante.js — cada combinación tiene que saber qué foto enseñar.

   EL FALLO QUE VIGILA
   El manillar WAKE Downhill (7 colores) y el NANLIO (5 acabados) tenían el eje
   declarado pero SIN decir qué foto le toca a cada opción. En la ficha eso se veía
   como que la foto no cambiaba nunca… y, peor, como que el rótulo se quedaba clavado
   en el primer color: la función que aplica la variante se iba de vacío al no
   encontrar imagen y con ella se perdía el rótulo. Un cliente elegía "Azul", veía
   "Negro y blanco" y una foto que no era la suya.

   El código ya no depende de eso —sin foto solo se deja de cambiar la foto—, pero un
   eje sin fotos sigue siendo un catálogo a medio escribir, y esto lo dice antes de
   que llegue a producción.

       node scripts/qa/fotos-por-variante.js        → FOTOS_VARIANTE_OK / _KO

   NO se comprueba contra el DOM ni se reimplementa nada: se ejecutan el catálogo real
   y el núcleo real en un `window` de mentira y se le pregunta al núcleo, que es quien
   sabe resolver `images`, `imagesBy` y la galería. Mismo patrón que
   scripts/build-attributes-index.js. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');

function cargarEnSandbox() {
  const sandbox = {
    window: {},
    document: {
      querySelector() { return null; },
      addEventListener() { },
      dispatchEvent() { },
      readyState: 'complete'
    },
    setTimeout: () => 0,
    clearTimeout: () => { },
    requestAnimationFrame: () => 0,
    CustomEvent: function () { },
    console
  };
  sandbox.window.document = sandbox.document;
  sandbox.window.addEventListener = () => { };
  sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;
  sandbox.window.setTimeout = sandbox.setTimeout;
  sandbox.self = sandbox.window;
  vm.createContext(sandbox);
  for (const rel of ['data/products.js', 'js/product-attributes.js']) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), sandbox, { filename: rel });
  }
  return sandbox.window;
}

/* La opción por defecto de cada eje, para dejar fijos los DEMÁS ejes mientras se
   recorre uno. Así se comprueba lo que ve el cliente: mover un selector y que la foto
   cambie. */
function porDefecto(eje) {
  for (const o of eje.options) if (o.default) return o;
  return eje.options[0];
}

function main() {
  const win = cargarEnSandbox();
  const SS = win.SS_ATTRS;
  const productos = win.SCOOTSHOP_PRODUCTS || [];
  if (!SS || !productos.length) {
    console.log('FOTOS_VARIANTE_KO — no se cargó el catálogo o el núcleo');
    return 1;
  }

  /* LA REGLA no es "que haya foto" —el núcleo siempre devuelve algo, porque cae a la
     foto de portada del producto—, sino que MOVER UN SELECTOR CAMBIE LA FOTO. Con el
     respaldo, siete colores devolvían siete veces la misma imagen: para el cliente,
     un selector que no hace nada. */
  let fallos = 0;
  let comprobados = 0;
  let conEjes = 0;

  for (const p of productos) {
    const ejes = SS.ejes(p);
    if (!ejes.length) continue;
    conEjes++;

    for (const eje of ejes) {
      if (eje.options.length < 2) continue;
      /* SOLO los ejes de tipo `swatch`. Un círculo de color promete una diferencia que
         se ve: si el cliente lo pulsa y la foto es la misma, la promesa se rompe. Un
         eje de medida (píldoras: 720 · 780) puede compartir foto con toda legitimidad
         —el manillar se ve igual— y exigirle una propia sería inventar fotos que no
         existen. El WAKE 720/780 sí las tiene y las declara con `imagesBy`, que es la
         forma de decir "esta foto depende de la combinación". */
      if (eje.type !== 'swatch') continue;
      const base = {};
      for (const otro of ejes) if (otro.key !== eje.key) base[otro.key] = porDefecto(otro);

      const vistas = new Map();
      for (const op of eje.options) {
        comprobados++;
        const seleccion = Object.assign({}, base);
        seleccion[eje.key] = op;
        const url = SS.fotoDe(p, seleccion) || '(ninguna)';
        if (!vistas.has(url)) vistas.set(url, []);
        vistas.get(url).push(op.key);
      }

      const repetidas = [...vistas.entries()].filter(([, quienes]) => quienes.length > 1);
      if (repetidas.length) {
        fallos++;
        console.log('  ✘ ' + String(p.sku).padEnd(20) + 'eje «' + eje.key + '»: mover el selector no cambia la foto');
        for (const [url, quienes] of repetidas.slice(0, 3)) {
          console.log('       ' + quienes.join(', ') + '  →  ' + String(url).split('/').slice(-1)[0]);
        }
      }
    }
  }

  console.log('\nproductos con ejes: ' + conEjes + '  ·  opciones comprobadas: ' + comprobados);
  if (fallos) {
    console.log('\nFOTOS_VARIANTE_KO (' + fallos + ' ejes)');
    console.log('   Cada opción declara su foto con `images: [n]` (índice de la galería, 1 = la');
    console.log('   primera) o con `imagesBy` cuando la foto depende de la combinación.');
    console.log('   La opción por defecto debe abrir con la foto que trae el HTML de la ficha.');
    return 1;
  }
  console.log('\nFOTOS_VARIANTE_OK — mover cualquier selector cambia la foto');
  return 0;
}

process.exit(main());
