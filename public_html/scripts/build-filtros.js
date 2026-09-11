'use strict';
// Escribe en data/products.js el bloque `filtros` de cada patinete: los cinco
// numeros con los que el visitante puede filtrar el catalogo.
//
//   filtros: { dgt: true, motores: 1, w: 1000, km: 50, kmh: 25 }
//
// POR QUE UN CAMPO Y NO CALCULARLO EN EL NAVEGADOR: los datos estan en dos sitios
// y en texto libre. La potencia y la autonomia viven en `specs` («2 x 1000 W»,
// «40-50 km»), y la VELOCIDAD no esta en el catalogo — solo en la ficha, que la
// home no carga. Dejar que el navegador adivine todo eso en cada visita seria
// pagar un parseo fragil por cliente; asi se hace una vez, aqui, y se revisa.
//
//   node scripts/build-filtros.js            escribe
//   node scripts/build-filtros.js --check    falla si el catalogo no esta al dia
//
// Al añadir o cambiar un patinete hay que volver a pasarlo.
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const CATALOGO = path.join(RAIZ, 'data', 'products.js');
const COMPROBAR = process.argv.includes('--check');

function leerCatalogo() {
  const win = {};
  new Function('window', fs.readFileSync(CATALOGO, 'utf8'))(win);
  return win.SCOOTSHOP_PRODUCTS || [];
}

/* De «2 x 1000 W» salen dos datos: cuantos motores y cuanta potencia TOTAL. La
   potencia que se anuncia es la suma, que es como la compara quien mira.

   Si el fabricante anuncia la potencia YA SUMADA («6000 W») no hay forma de
   saber del texto cuantos motores la dan: para esos, el catalogo lo declara a
   mano con `motores: 2` junto a los specs, y aqui se respeta. */
function potencia(specs, declarado) {
  let motores = null;
  let w = null;

  const m = specs.match(/(\d)\s*x\s*(\d{3,4})\s*W/i);
  if (m) {
    motores = Number(m[1]);
    w = Number(m[2]) * Number(m[1]);
  } else {
    const s = specs.match(/(\d{3,4})\s*W/i);
    w = s ? Number(s[1]) : null;
    /* Lo que el propio producto diga de si mismo. «dual» a secas no vale: hay
       fichas que lo usan para la suspension. */
    if (/dual\s*motor|motor\s*dual|doble\s*motor|bimotor|dos\s*motores/i.test(specs)) motores = 2;
  }

  /* Lo declarado a mano MANDA sobre lo deducido: es un dato que alguien ha
     comprobado, y el texto libre solo se lee cuando no lo hay. */
  if (declarado === 1 || declarado === 2) motores = declarado;

  return { motores: motores || 1, w };
}

/* «40-50 km» se queda con 50: es la autonomia que anuncia el fabricante y la que
   el visitante espera ver cuando filtra por «60 km o mas». */
function autonomia(specs) {
  const m = specs.match(/(\d{2,3})\s*(?:-\s*(\d{2,3}))?\s*km(?!\/)/i);
  return m ? Number(m[2] || m[1]) : null;
}

/* La velocidad SOLO esta en la ficha, y ahi conviven dos cifras: «25 km/h
   homologado - 86 km/h uso privado». Se guarda la MAYOR, que es de la que habla
   el filtro de velocidad; la homologacion se mira aparte. */
function deLaFicha(href) {
  const rel = String(href || '').replace(/^\//, '').replace(/\/$/, '');
  const f = path.join(RAIZ, rel, 'index.html');
  if (!rel || !fs.existsSync(f)) return { kmh: null, dgt: null };
  const html = fs.readFileSync(f, 'utf8');
  const v = html.match(/Velocidad[^<]*<\/div><div class="spec-value">([^<]*)/i);
  if (!v) return { kmh: null, dgt: null };
  const cifras = [...v[1].matchAll(/(\d{2,3})\s*km\/h/g)].map((x) => Number(x[1]));
  return {
    kmh: cifras.length ? Math.max(...cifras) : null,
    dgt: /homologad/i.test(v[1]) || cifras.includes(25),
  };
}

/* EL TIPO DE FRENO, de la fila «Frenos» de la tabla de la ficha.

   Se lee de ahi y no de `specs` porque el catalogo no lo declara en ningun sitio,
   y la prosa de la ficha es inconsistente: «de disco» a secas no dice si es
   hidraulico o mecanico. La fila de la tabla si suele decirlo.

   Devuelve null cuando no se puede saber, y un patinete con null NO pasa ningun
   filtro de frenos — la misma regla que la autonomia o la velocidad. En
   septiembre de 2026 eran 16 de 50; el recuento del final de este script lo dice
   en cada pasada para que no se olvide. */
function frenos(rutaFicha, specs) {
  const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let texto = '';
  const f = rutaFicha && path.join(RAIZ, rutaFicha.replace(/^\//, ''), 'index.html');
  if (f && fs.existsSync(f)) {
    const html = fs.readFileSync(f, 'utf8');
    const fila = html.match(/>\s*Frenos?\s*<[^>]*>\s*(?:<[^>]+>\s*)*([^<]{2,80})/i);
    if (fila) texto = fila[1];
    if (!texto) {
      const suelto = html.match(/[Ff]renos?[^<.;]{0,60}/);
      if (suelto) texto = suelto[0];
    }
  }
  const t = sinTildes(texto + ' ' + (specs || ''));
  if (/hidraulic/.test(t)) return 'hidraulicos';
  if (/disco|tambor|mecanic|e-abs|electronic/.test(t)) return 'mecanicos';
  return null;
}

function calcular(p) {
  const specs = (p.specs || []).join(' | ');
  const { motores, w } = potencia(specs, p.motores);
  const ficha = deLaFicha(p.href);
  return {
    dgt: /homologad/i.test(specs) || !!ficha.dgt,
    motores,
    w,
    km: autonomia(specs),
    kmh: ficha.kmh,
    frenos: frenos(p.href, specs),
  };
}

const productos = leerCatalogo();
const patinetes = productos.filter((p) => p.categoryKey === 'electric-scooters');

let src = fs.readFileSync(CATALOGO, 'utf8');
let escritos = 0;
let desfasados = [];

for (const p of patinetes) {
  const f = calcular(p);
  const linea = "      filtros: { dgt: " + f.dgt + ", motores: " + f.motores +
    ", w: " + f.w + ", km: " + f.km + ", kmh: " + f.kmh +
    ", frenos: " + (f.frenos ? "'" + f.frenos + "'" : "null") + " },";

  // El bloque del producto, localizado por su id (unico).
  const mId = new RegExp("(\\n\\s*id: '" + p.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "',)");
  const mm = src.match(mId);
  if (!mm) { console.log(' KO no se encuentra ' + p.id); continue; }

  // ¿Ya tiene su linea de filtros? Se busca dentro de su bloque, hasta el
  // siguiente `id:` o el final.
  const desde = src.indexOf(mm[1]);
  const sigId = src.indexOf("\n      id: '", desde + 10);
  const hasta = sigId > 0 ? sigId : src.length;
  const bloque = src.slice(desde, hasta);
  const yaTiene = bloque.match(/\n\s*filtros: \{[^}]*\},/);

  if (yaTiene) {
    if (yaTiene[0].trim() === linea.trim()) continue;      // al dia
    desfasados.push(p.sku);
    if (!COMPROBAR) {
      src = src.slice(0, desde) + bloque.replace(yaTiene[0], '\n' + linea) + src.slice(hasta);
      escritos++;
    }
  } else {
    desfasados.push(p.sku);
    if (!COMPROBAR) {
      src = src.slice(0, desde) + mm[1] + '\n' + linea + src.slice(desde + mm[1].length);
      escritos++;
    }
  }
}

if (COMPROBAR) {
  if (desfasados.length) {
    console.log('FILTROS_KO  ' + desfasados.length + ' patinetes sin su bloque `filtros` al dia:');
    console.log('  ' + desfasados.slice(0, 12).join(', '));
    console.log('  → node scripts/build-filtros.js');
    process.exit(1);
  }
  console.log('FILTROS_OK  ' + patinetes.length + ' patinetes, filtros al dia.');
  process.exit(0);
}

fs.writeFileSync(CATALOGO, src);

// Resumen de lo que se podra filtrar
const todos = patinetes.map(calcular);
const sin = (k) => todos.filter((f) => f[k] === null).length;
console.log('FILTROS_OK  escritos ' + escritos + ' de ' + patinetes.length + ' patinetes.');
console.log('  homologados ' + todos.filter((f) => f.dgt).length + ' · sin homologar ' + todos.filter((f) => !f.dgt).length);
console.log('  dos motores ' + todos.filter((f) => f.motores === 2).length);
console.log('  sin dato → potencia ' + sin('w') + ', autonomia ' + sin('km') +
  ', velocidad ' + sin('kmh') + ', frenos ' + sin('frenos'));
