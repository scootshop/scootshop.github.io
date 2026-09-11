'use strict';
// REGULARIZA el trazado del logotipo: convierte un contorno que sigue la escalera
// de los pixeles en uno de rectas de verdad.
//
// El problema que resuelve, y que se ve al ampliar: `logo-a-trazados.js` aplana la
// escalera con Douglas-Peucker, que CONSERVA puntos del contorno original. Los
// puntos que conserva siguen estando en la escalera, asi que un borde recto queda
// como una linea quebrada de amplitud media pixel — a tamaño de titular se lee
// como un pulso tembloroso.
//
// Aqui no se conserva ningun punto: cada tramo recto se sustituye por la RECTA que
// mejor lo ajusta (minimos cuadrados totales, que es el ajuste correcto cuando el
// error esta en los dos ejes y no solo en la Y), y cada esquina se recalcula como
// la INTERSECCION de sus dos rectas. Un borde deja de ser cien puntos ruidosos y
// pasa a ser dos: principio y fin.
//
// Encima, los angulos se acoplan. Una tipografia asi solo tiene un puñado de
// direcciones (la vertical italica, la horizontal, un par de diagonales); midiendo
// cuales son las dominantes y llevando a ellas las rectas que se quedan cerca, los
// verticales salen EXACTAMENTE paralelos entre si, que es lo que separa un trazado
// profesional de uno calcado a mano.
//
//   node scripts/logo-regulariza.js [escala] [sufijo]
//
// Lee img/logo/*.svg, rasteriza a `escala` (por defecto x10, que da ~3600 px de
// ancho) y reescribe esos mismos SVG. Con sufijo escribe copias, para comparar.
const { exigirPlaywright } = require('./qa/_playwright.js');
const pw = exigirPlaywright('REGULARIZA');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DIR = path.join(RAIZ, 'img', 'logo');
const ESCALA = Number(process.argv[2] || 10);
const SUF = process.argv[3] || '';

// A escala x10, un pixel del dibujo original son 10 px aqui. Los umbrales van en
// unidades del RASTER y por eso se escalan con el: asi cambiar la escala no
// cambia el resultado.
const ARG = (i, d) => (process.argv[i] === undefined || process.argv[i] === '' ? d : Number(process.argv[i]));
const U = {
  ventana:    Math.max(6, Math.round(ARG(4, 1.6) * ESCALA)),  // brazo para medir direccion
  esquina:    ARG(5, 12),                                     // grados: a partir de aqui es esquina
  errorRecta: ARG(6, 0.3) * ESCALA,                           // desviacion maxima para llamarlo recta
  tramoMin:   1.2 * ESCALA,                                   // tramos mas cortos no mandan angulo
  acople:     ARG(7, 2.6),                                    // grados: se acopla si esta a menos
};

// ---------- contornos de la rejilla de pixeles ----------
function contornos(dentro, w, h) {
  const aristas = new Map();
  const clave = (x, y) => x + ',' + y;
  const add = (x1, y1, x2, y2) => {
    const k = clave(x1, y1);
    if (!aristas.has(k)) aristas.set(k, []);
    aristas.get(k).push([x2, y2]);
  };
  const val = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : dentro[y * w + x];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!val(x, y)) continue;
      if (!val(x, y - 1)) add(x + 1, y, x, y);
      if (!val(x + 1, y)) add(x + 1, y + 1, x + 1, y);
      if (!val(x, y + 1)) add(x, y + 1, x + 1, y + 1);
      if (!val(x - 1, y)) add(x, y, x, y + 1);
    }
  }

  const bucles = [];
  while (aristas.size) {
    const inicio = aristas.keys().next().value;
    const [ix, iy] = inicio.split(',').map(Number);
    const puntos = [];
    let actual = [ix, iy];
    for (;;) {
      const k = clave(actual[0], actual[1]);
      const salidas = aristas.get(k);
      if (!salidas || !salidas.length) break;
      const sig = salidas.pop();
      if (!salidas.length) aristas.delete(k);
      puntos.push(actual);
      actual = sig;
      if (actual[0] === ix && actual[1] === iy) break;
    }
    if (puntos.length > 7 * ESCALA) bucles.push(puntos);
  }
  return bucles;
}

// ---------- utilidades ----------
const norm = (a) => { let x = a % 180; if (x < 0) x += 180; return x; };
const difAng = (a, b) => { let d = Math.abs(norm(a) - norm(b)); return d > 90 ? 180 - d : d; };

// Media movil corta: quita el ruido de un pixel sin mover las esquinas de sitio,
// porque el ajuste posterior ya no usa estos puntos como vertices.
function suave(pts, r) {
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, c = 0;
    for (let d = -r; d <= r; d++) {
      const p = pts[(i + d + n * 2) % n];
      sx += p[0]; sy += p[1]; c++;
    }
    out[i] = [sx / c, sy / c];
  }
  return out;
}

// Ajuste por minimos cuadrados TOTALES: devuelve un punto de la recta, su
// direccion unitaria y la desviacion maxima de los puntos.
function ajustarRecta(pts) {
  const n = pts.length;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p[0]; my += p[1]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    const dx = p[0] - mx, dy = p[1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  // Direccion = autovector mayor de la covarianza.
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const dir = [Math.cos(th), Math.sin(th)];
  let err = 0;
  for (const p of pts) {
    const d = Math.abs((p[0] - mx) * -dir[1] + (p[1] - my) * dir[0]);
    if (d > err) err = d;
  }
  return { p: [mx, my], dir, err, grados: Math.atan2(dir[1], dir[0]) * 180 / Math.PI };
}

function interseccion(r1, r2) {
  const det = r1.dir[0] * -r2.dir[1] - (-r1.dir[1]) * r2.dir[0];
  if (Math.abs(det) < 1e-9) return null;         // paralelas: no hay esquina
  const bx = r2.p[0] - r1.p[0], by = r2.p[1] - r1.p[1];
  const t = (bx * -r2.dir[1] - by * -r2.dir[0]) / det;
  return [r1.p[0] + r1.dir[0] * t, r1.p[1] + r1.dir[1] * t];
}

// ---------- esquinas ----------
// Se mira el giro entre el brazo que llega y el que sale. Una escalera de pixeles
// da giros de 90 grados en cada peldaño, por eso el brazo es largo: promedia el
// peldaño y solo sobresalen los giros de verdad.
function esquinas(pts) {
  const n = pts.length;
  const k = Math.min(U.ventana, Math.floor(n / 6));
  if (k < 2) return [0];
  const giro = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - k + n) % n], b = pts[i], c = pts[(i + k) % n];
    const v1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const v2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = (v2 - v1) * 180 / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    giro[i] = Math.abs(d);
  }
  // Maximos locales por encima del umbral, uno por ventana.
  const idx = [];
  for (let i = 0; i < n; i++) {
    if (giro[i] < U.esquina) continue;
    let esMax = true;
    for (let d = -k; d <= k; d++) {
      const j = (i + d + n) % n;
      if (giro[j] > giro[i] || (giro[j] === giro[i] && j < i)) { esMax = false; break; }
    }
    if (esMax) idx.push(i);
  }
  return idx.length >= 2 ? idx : [0, Math.floor(n / 2)];
}

// ---------- regularizacion de un bucle ----------
function regulariza(bucle, dominantes) {
  const pts = suave(bucle, Math.round(ESCALA * 0.6));
  const n = pts.length;
  const esq = esquinas(pts);
  const m = esq.length;

  // Cada tramo va de una esquina a la siguiente. Se recortan los extremos: junto a
  // una esquina los puntos estan redondeados por el suavizado y torcerian la recta.
  const margen = Math.min(U.ventana, Math.floor(n / (m * 4)) || 1);
  const tramos = [];
  for (let i = 0; i < m; i++) {
    const a = esq[i], b = esq[(i + 1) % m];
    const largo = (b - a + n) % n;
    if (largo < 3) { tramos.push(null); continue; }
    const rec = Math.min(margen, Math.floor(largo / 3));
    const trozo = [];
    for (let d = rec; d <= largo - rec; d++) trozo.push(pts[(a + d) % n]);
    if (trozo.length < 3) { tramos.push(null); continue; }
    const r = ajustarRecta(trozo);
    r.largo = Math.hypot(pts[b % n][0] - pts[a][0], pts[b % n][1] - pts[a][1]);
    r.recto = r.err <= U.errorRecta;
    r.pts = trozo;
    tramos.push(r);
  }

  // Acople de angulos: una recta que se queda a menos de U.acople de una direccion
  // dominante se lleva a ella. Asi todos los verticales salen paralelos de verdad.
  for (const t of tramos) {
    if (!t || !t.recto) continue;
    let mejor = null, dmin = U.acople;
    for (const g of dominantes) {
      const d = difAng(t.grados, g);
      if (d < dmin) { dmin = d; mejor = g; }
    }
    if (mejor === null) continue;
    const rad = mejor * Math.PI / 180;
    t.dir = [Math.cos(rad), Math.sin(rad)];
    t.grados = mejor;
    t.acoplado = true;
  }

  // Salida: recta+recta se cortan en su interseccion; si hay una curva por medio,
  // se conservan sus puntos (ya suavizados) simplificados con tolerancia fina.
  const salida = [];
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    const s = tramos[(i + 1) % tramos.length];
    if (!t) continue;
    if (t.recto) {
      if (s && s.recto) {
        const x = interseccion(t, s);
        // Paralelas o corte disparatado: se cae al extremo medido, que siempre es
        // mejor que un pico de mil pixeles.
        const fin = t.pts[t.pts.length - 1];
        if (x && Math.hypot(x[0] - fin[0], x[1] - fin[1]) < 6 * ESCALA) salida.push(x);
        else salida.push(fin);
      } else {
        salida.push(t.pts[t.pts.length - 1]);
      }
    } else {
      // Curva: un punto de cada pocos, que ya vienen suavizados.
      const paso = Math.max(1, Math.round(ESCALA * 0.9));
      for (let j = 0; j < t.pts.length; j += paso) salida.push(t.pts[j]);
      salida.push(t.pts[t.pts.length - 1]);
    }
  }
  return salida;
}

// Direcciones que MANDAN en el dibujo: histograma de angulos ponderado por lo
// largo que es cada tramo, que es lo mismo que decir «por cuanto se ve».
function direccionesDominantes(bucles) {
  const cubos = new Map();   // grado entero -> longitud acumulada
  for (const b of bucles) {
    const pts = suave(b, Math.round(ESCALA * 0.6));
    const n = pts.length;
    const esq = esquinas(pts);
    for (let i = 0; i < esq.length; i++) {
      const a = esq[i], c = esq[(i + 1) % esq.length];
      const largo = (c - a + n) % n;
      if (largo < 4) continue;
      const trozo = [];
      for (let d = 0; d <= largo; d++) trozo.push(pts[(a + d) % n]);
      const r = ajustarRecta(trozo);
      if (r.err > U.errorRecta) continue;
      const l = Math.hypot(pts[c % n][0] - pts[a][0], pts[c % n][1] - pts[a][1]);
      if (l < U.tramoMin) continue;
      const g = Math.round(norm(r.grados));
      cubos.set(g, (cubos.get(g) || 0) + l);
    }
  }
  // Se agrupan los grados vecinos y se queda la media pesada de cada grupo.
  const orden = [...cubos.entries()].sort((a, b) => b[1] - a[1]);
  const dom = [];
  for (const [g, peso] of orden) {
    if (dom.some((d) => difAng(d.g, g) < 4)) continue;
    let sw = 0, sg = 0;
    for (const [g2, w2] of cubos) {
      if (difAng(g2, g) >= 4) continue;
      // Media circular corta: basta con acercar g2 a g antes de promediar.
      let x = norm(g2);
      if (x - g > 90) x -= 180; else if (g - x > 90) x += 180;
      sg += x * w2; sw += w2;
    }
    dom.push({ g: norm(sg / sw), peso });
    if (dom.length >= 8) break;
  }
  return dom.filter((d) => d.peso > 0).map((d) => d.g);
}

// ---------- SVG ----------
function aPath(bucles, escala) {
  const f = (v) => {
    const r = Math.round(v / escala * 100) / 100;
    return Object.is(r, -0) ? 0 : r;
  };
  return bucles.map((b) => {
    let d = 'M' + f(b[0][0]) + ' ' + f(b[0][1]);
    for (let i = 1; i < b.length; i++) d += 'L' + f(b[i][0]) + ' ' + f(b[i][1]);
    return d + 'Z';
  }).join('');
}

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const informe = [];

  for (const nombre of ['scoot', 'shop']) {
    const ruta = path.join(DIR, nombre + '.svg');
    const svg = fs.readFileSync(ruta, 'utf8');
    const mVB = svg.match(/viewBox="([\d.\-\s]+)"/);
    if (!mVB) throw new Error('sin viewBox: ' + ruta);
    const [, , vw, vh] = mVB[1].trim().split(/\s+/).map(Number);
    // TODOS los colores del original, no solo el primero: SHOP lleva las letras en
    // negro y la barra en rojo, y quedarse con uno se comia la barra roja.
    const colores = [...new Set((svg.match(/fill="#[0-9a-fA-F]{3,8}"/g) || [])
      .map((f) => f.slice(6, -1).toLowerCase()))];
    if (!colores.length) colores.push('#111315');

    const W = Math.round(vw * ESCALA), H = Math.round(vh * ESCALA);
    // Una mascara POR TINTA: cada pixel opaco se asigna al color del original al
    // que mas se parece, y cada tinta se traza y se regulariza por su cuenta.
    const datos = await page.evaluate(async ({ svg, W, H, colores }) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data;
      const rgb = colores.map((h) => {
        const v = h.replace('#', '');
        const t = v.length === 3 ? v.split('').map((k) => k + k).join('') : v.slice(0, 6);
        return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)];
      });
      const masc = rgb.map(() => new Uint8Array(W * H));
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        if (d[i + 3] <= 127) continue;
        let mejor = 0, dmin = Infinity;
        for (let k = 0; k < rgb.length; k++) {
          const dr = d[i] - rgb[k][0], dg = d[i + 1] - rgb[k][1], db = d[i + 2] - rgb[k][2];
          const q = dr * dr + dg * dg + db * db;
          if (q < dmin) { dmin = q; mejor = k; }
        }
        masc[mejor][j] = 1;
      }
      return masc.map((m) => Array.from(m));
    }, { svg, W, H, colores });

    let antesPts = 0, ahoraPts = 0;
    const trozos = [];
    for (let k = 0; k < colores.length; k++) {
      const dentro = Uint8Array.from(datos[k]);
      const bucles = contornos(dentro, W, H);
      if (!bucles.length) continue;
      const dominantes = direccionesDominantes(bucles);
      const limpios = bucles.map((b) => regulariza(b, dominantes));
      antesPts += bucles.reduce((a, b) => a + b.length, 0);
      ahoraPts += limpios.reduce((a, b) => a + b.length, 0);
      trozos.push({ color: colores[k], d: aPath(limpios, ESCALA), bucles: bucles.length, dominantes });
    }
    if (!trozos.length) throw new Error('sin trazado: ' + nombre);

    const salida =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vw + ' ' + vh + '" ' +
      'width="' + vw + '" height="' + vh + '" fill-rule="evenodd" ' +
      'role="img" aria-label="' + nombre.toUpperCase() + '">' +
      trozos.map((t) => '<path fill="' + t.color + '" d="' + t.d + '"/>').join('') +
      '</svg>\n';

    fs.writeFileSync(path.join(DIR, nombre + SUF + '.svg'), salida);
    informe.push({
      nombre,
      bucles: trozos.reduce((a, t) => a + t.bucles, 0),
      tintas: trozos.map((t) => t.color).join(' '),
      dominantes: trozos[0].dominantes.slice(0, 4).map((g) => Math.round(g * 10) / 10),
      puntos: antesPts + ' -> ' + ahoraPts, bytes: Buffer.byteLength(salida),
    });
  }

  await browser.close();
  informe.forEach((i) => console.log(
    i.nombre.padEnd(6),
    'bucles=' + i.bucles,
    'puntos=' + i.puntos.padEnd(16),
    'bytes=' + String(i.bytes).padEnd(6),
    'tintas=' + i.tintas.padEnd(18),
    'angulos=' + JSON.stringify(i.dominantes)));
  console.log('REGULARIZA_OK');
})().catch((e) => { console.error(e); process.exit(1); });
