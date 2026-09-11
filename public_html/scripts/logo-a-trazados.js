'use strict';
// Convierte el logotipo de mapa de bits a TRAZADOS SVG. No adivina que fuente es:
// sigue el contorno real del dibujo, asi que el resultado es el logotipo, no uno
// parecido.
//
// Como: cada pixel «dentro» aporta sus cuatro aristas; las que separan dentro de
// fuera forman el contorno, se encadenan en bucles cerrados (los agujeros de la O
// y la P salen como bucles propios, y `fill-rule:evenodd` los recorta solos), y
// esa escalera de 1 px se aplana con Douglas-Peucker. Las esquinas sobreviven
// porque son justo los puntos de maxima desviacion que el algoritmo conserva.
//
// LA TOLERANCIA SE ELIGIO MIDIENDO, no a ojo. Con 1,15 el trazado conserva los
// escalones de las diagonales y los bordes rectos salen ONDULADOS al ampliarlos;
// con 3,0 o mas, SCOOT pierde un 1,2% de area. En 2,2 los bordes son rectas
// limpias y el error se queda en un 0,06% / 0,42%. Lo comprueba
// scripts/qa/logo-trazados.js.
//
// Este script solo hace falta si cambia el logotipo, y necesita los PNG/WEBP de
// partida en img/logo/.
// Ruta RELATIVA: la absoluta ataba este script a una carpeta concreta de un disco.
const { exigirPlaywright } = require('./qa/_playwright');
const pw = exigirPlaywright('VECTORIZA');
const fs = require('fs');
// La raiz del sitio se deduce de donde vive este fichero (scripts/ cuelga de ella).
const RAIZ = require('path').resolve(__dirname, '..') + '/';
const TOL1 = Number(process.argv[2] || 2.2);   // elegido midiendo: ver la nota de arriba
const ANG  = Number(process.argv[3] || 172);
const TOL2 = Number(process.argv[4] || 0.6);
const SUF  = process.argv[5] || '';
let ROJO_MARCA = null;

// ---------- bucles de aristas ----------
function contornos(dentro, w, h) {
  // Aristas de la reja (w+1) x (h+1). Cada arista se guarda como "x,y>x2,y2"
  // orientada de forma que el relleno quede a su izquierda: asi los bucles
  // exteriores giran en un sentido y los agujeros en el contrario.
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
      if (!val(x, y - 1)) add(x + 1, y, x, y);         // arriba
      if (!val(x + 1, y)) add(x + 1, y + 1, x + 1, y); // derecha
      if (!val(x, y + 1)) add(x, y + 1, x + 1, y + 1); // abajo
      if (!val(x - 1, y)) add(x, y, x, y + 1);         // izquierda
    }
  }

  const bucles = [];
  while (aristas.size) {
    const inicio = aristas.keys().next().value;
    const puntos = [];
    let actual = inicio.split(',').map(Number);
    while (true) {
      const k = clave(actual[0], actual[1]);
      const salidas = aristas.get(k);
      if (!salidas || !salidas.length) break;
      const sig = salidas.pop();
      if (!salidas.length) aristas.delete(k);
      puntos.push(actual);
      actual = sig;
      if (actual[0] === Number(inicio.split(',')[0]) && actual[1] === Number(inicio.split(',')[1])) break;
    }
    if (puntos.length > 7) bucles.push(puntos);
  }
  return bucles;
}

// ---------- Douglas-Peucker ----------
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const den = Math.hypot(dx, dy);
    if (den === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / den;
  };
  const rec = (ini, fin) => {
    let peor = 0, idx = -1;
    for (let i = ini + 1; i < fin; i++) {
      const d = dist(pts[i], pts[ini], pts[fin]);
      if (d > peor) { peor = d; idx = i; }
    }
    if (peor <= tol) return [pts[ini]];
    return [...rec(ini, idx), ...rec(idx, fin)];
  };
  // Cerrado: se parte por el punto mas lejano al primero para no anclar la
  // simplificacion a un vertice arbitrario.
  let lejano = 0, dmax = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > dmax) { dmax = d; lejano = i; }
  }
  return [...rec(0, lejano), ...rec(lejano, pts.length - 1), pts[pts.length - 1]];
}

// ---------- suavizado SOLO de lo que ya era curva ----------
// Un vertice casi recto (>= 168 grados) en la escalera original es parte de un
// arco; una esquina de verdad no se toca, que es lo que mantiene el logotipo
// anguloso donde debe serlo.
function suavizar(pts, umbralGrados) {
  const n = pts.length;
  if (n < 5) return pts;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const ang = Math.acos(Math.max(-1, Math.min(1,
      (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)))) * 180 / Math.PI;
    if (ang >= umbralGrados) {
      out.push([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]);
    } else {
      out.push(b);
    }
  }
  return out;
}

const aPath = (bucles, dec) => bucles.map(b =>
  'M' + b.map(p => p.map(v => Number(v.toFixed(dec))).join(' ')).join('L') + 'Z').join('');

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();

  for (const nombre of ['scoot', 'shop']) {
    const b64 = fs.readFileSync(RAIZ + 'img/logo/' + nombre + '.webp').toString('base64');
    // Se lee a 3x: mas resolucion de partida = contorno mas fino, y el coste solo
    // lo paga este script, no el visitante.
    const datos = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/webp;base64,' + b64;
      await img.decode();
      const E = 3;
      const c = document.createElement('canvas');
      c.width = img.width * E; c.height = img.height * E;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const n = c.width * c.height;
      const rojo = new Uint8Array(n), oscuro = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const p = i * 4, R = d[p], G = d[p + 1], B = d[p + 2], A = d[p + 3];
        if (A < 128) continue;
        // Rojo del logotipo frente al negro: la distancia entre canales manda.
        if (R - G > 55 && R - B > 55) rojo[i] = 1;
        else if (R < 140 && G < 140 && B < 140) oscuro[i] = 1;
      }
      // El color se toma de los pixeles del INTERIOR (opacos y con los ocho
      // vecinos dentro), y por la MEDIANA. Promediar todo el relleno mete los
      // pixeles del borde —medio transparentes— y devuelve un rojo mas claro que
      // el del logotipo.
      const colorDe = (mask) => {
        const W = c.width, H = c.height;
        const rs = [], gs = [], bs = [];
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!mask[i]) continue;
          let dentro = true;
          for (let dy = -1; dy <= 1 && dentro; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!mask[(y + dy) * W + (x + dx)] || d[((y + dy) * W + (x + dx)) * 4 + 3] < 250) { dentro = false; break; }
          }
          if (!dentro) continue;
          rs.push(d[i * 4]); gs.push(d[i * 4 + 1]); bs.push(d[i * 4 + 2]);
        }
        if (!rs.length) return null;
        const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
        return '#' + [med(rs), med(gs), med(bs)].map(v => v.toString(16).padStart(2, '0')).join('');
      };
      const hex = null;
      return {
        w: c.width, h: c.height, esc: E,
        rojo: Array.from(rojo), oscuro: Array.from(oscuro),
        colorRojo: colorDe(rojo), colorOscuro: colorDe(oscuro),
      };
    }, b64);

    // El rojo es UNO para las dos piezas: salen del mismo logotipo, y la
    // diferencia de 5 puntos que se medía entre ellas era ruido de la compresion.
    // Manda el de SCOOT, que es donde hay mas superficie que medir.
    if (nombre !== 'scoot' && ROJO_MARCA) datos.colorRojo = ROJO_MARCA;
    else if (nombre === 'scoot') ROJO_MARCA = datos.colorRojo;

    const capas = [];
    for (const [clave, color] of [['oscuro', datos.colorOscuro], ['rojo', datos.colorRojo]]) {
      const mask = Uint8Array.from(datos[clave]);
      if (!mask.some(v => v)) continue;
      let bucles = contornos(mask, datos.w, datos.h);
      bucles = bucles
        .map(b => dp(b, TOL1))            // aplana la escalera de 1 px (a 3x)
        .map(b => ANG ? suavizar(b, ANG) : b)  // redondea SOLO lo que ya era arco
        .map(b => dp(b, TOL2))            // quita los puntos que el suavizado dejo de sobra
        .filter(b => b.length > 3)
        .map(b => b.map(p => [p[0] / datos.esc, p[1] / datos.esc]));  // vuelta a la escala real
      capas.push({ color, d: aPath(bucles, 2), bucles: bucles.length, puntos: bucles.reduce((a, b) => a + b.length, 0) });
    }

    const w = (datos.w / datos.esc), h = (datos.h / datos.esc);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + nombre.toUpperCase() + '">'
      + capas.map(c => '<path fill="' + c.color + '" fill-rule="evenodd" d="' + c.d + '"/>').join('')
      + '</svg>';
    fs.writeFileSync(RAIZ + 'img/logo/' + nombre + SUF + '.svg', svg);
    console.log(nombre, JSON.stringify({
      lienzo: w + 'x' + h,
      capas: capas.map(c => ({ color: c.color, bucles: c.bucles, puntos: c.puntos })),
      bytes: svg.length,
      webpBytes: Buffer.from(b64, 'base64').length,
    }));
  }

  await browser.close();
  console.log('VECTORIZA_OK');
})().catch(e => { console.error(e); process.exit(1); });
