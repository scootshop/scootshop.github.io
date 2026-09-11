'use strict';
// Recorta del original (img/logo/letras-perfectas.png) la marca ENTERA en NEGRO,
// que es la que firma el pie de pagina: img/logo/marca-pie.webp
//
//   node scripts/build-logo-pie.js            escribe la pieza
//   node scripts/build-logo-pie.js --check    falla si esta desfasada o no esta
//
// Por que un script y no un recorte a mano, como ya explica CLAUDE.md para las
// otras dos piezas: el fondo del original NO es transparente (es #f6f7f8), asi
// que cada pixel del borde de una letra es una MEZCLA de tinta y fondo. Borrar
// un color deja una orla gris alrededor de todas las letras. Aqui se resuelve al
// reves: se sabe que cada pixel es `px = a*tinta + (1-a)*fondo` con la tinta
// siendo una de las dos del logotipo (el rojo o el negro), asi que se despeja la
// OPACIDAD y se vuelve a pintar en negro puro. El borde queda limpio.
//
// El original se queda como material de partida y NO se despliega (esta en
// SIN_CONSUMIDOR de scripts/qa/rutas-img.js).
const fs = require('fs');
const path = require('path');
const { exigirPlaywright } = require('./qa/_playwright.js');
const pw = exigirPlaywright('LOGO_PIE');

const RAIZ = path.resolve(__dirname, '..');
const DIR = path.join(RAIZ, 'img', 'logo');
const ORIGEN = path.join(DIR, 'letras-perfectas.png');
const DESTINO = path.join(DIR, 'marca-pie.webp');

// Se sirve al doble de lo que se ve (148px en el pie), con margen para pantallas
// de mas densidad. Guardar los 1122px del original seria pagar peso por pixeles
// que nadie llega a ver.
const ANCHO = 420;

(async () => {
  const comprobar = process.argv.includes('--check');

  if (!fs.existsSync(ORIGEN)) {
    console.log(' KO falta img/logo/letras-perfectas.png');
    console.log('LOGO_PIE_KO');
    process.exit(1);
  }

  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const b64 = fs.readFileSync(ORIGEN).toString('base64');

  const salida = await page.evaluate(async ({ b64, ancho }) => {
    const im = new Image();
    im.src = 'data:image/png;base64,' + b64;
    await im.decode();

    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const px = (i) => [d[i], d[i + 1], d[i + 2]];

    // 1) El fondo: la mediana de las cuatro esquinas, que es lo unico que se
    //    sabe seguro que no es tinta.
    const esquinas = [
      0,
      (c.width - 1) * 4,
      (c.height - 1) * c.width * 4,
      ((c.height - 1) * c.width + c.width - 1) * 4,
    ].map(px);
    const fondo = [0, 1, 2].map((k) => {
      const v = esquinas.map((e) => e[k]).sort((a, b) => a - b);
      return Math.round((v[1] + v[2]) / 2);
    });

    // 2) Las dos tintas: el pixel mas saturado de rojo y el mas oscuro.
    let rojo = [255, 0, 0];
    let negro = [0, 0, 0];
    let mejorRojo = -1e9;
    let masOscuro = 1e9;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = px(i);
      const sat = r - (g + b) / 2;
      if (sat > mejorRojo) { mejorRojo = sat; rojo = [r, g, b]; }
      const lum = r + g + b;
      if (lum < masOscuro) { masOscuro = lum; negro = [r, g, b]; }
    }

    // 3) La opacidad de cada pixel: se despeja `a` para cada tinta candidata y
    //    se queda la que mejor reconstruye el pixel original.
    const opacidadPara = (p, tinta) => {
      let suma = 0;
      let peso = 0;
      for (let k = 0; k < 3; k++) {
        const delta = fondo[k] - tinta[k];
        if (Math.abs(delta) < 24) continue;   // canal sin informacion
        suma += ((fondo[k] - p[k]) / delta) * Math.abs(delta);
        peso += Math.abs(delta);
      }
      if (!peso) return 0;
      return Math.min(1, Math.max(0, suma / peso));
    };
    const error = (p, tinta, a) => {
      let e = 0;
      for (let k = 0; k < 3; k++) {
        const rec = a * tinta[k] + (1 - a) * fondo[k];
        e += (rec - p[k]) * (rec - p[k]);
      }
      return e;
    };

    const alfa = new Float32Array(c.width * c.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const p = px(i);
      const aR = opacidadPara(p, rojo);
      const aN = opacidadPara(p, negro);
      alfa[j] = error(p, rojo, aR) <= error(p, negro, aN) ? aR : aN;
    }

    // 4) El encuadre justo de la tinta. El umbral es alto a proposito: por
    //    debajo de 0,04 lo que hay es el ruido de compresion del PNG, y con un
    //    umbral de 0 el recorte sale del tamaño entero del lienzo.
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let yy = 0; yy < c.height; yy++) {
      for (let xx = 0; xx < c.width; xx++) {
        if (alfa[yy * c.width + xx] > 0.04) {
          if (xx < x0) x0 = xx;
          if (xx > x1) x1 = xx;
          if (yy < y0) y0 = yy;
          if (yy > y1) y1 = yy;
        }
      }
    }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    // 5) Se vuelve a pintar en NEGRO, conservando la opacidad. El color no se
    //    toma del original: la marca del pie es de una sola tinta.
    const recorte = document.createElement('canvas');
    recorte.width = w;
    recorte.height = h;
    const rx = recorte.getContext('2d');
    const salida = rx.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const a = alfa[(yy + y0) * c.width + (xx + x0)];
        const o = (yy * w + xx) * 4;
        salida.data[o] = 11;        // #0b0c0f, la tinta del sitio
        salida.data[o + 1] = 12;
        salida.data[o + 2] = 15;
        salida.data[o + 3] = Math.round(a * 255);
      }
    }
    rx.putImageData(salida, 0, 0);

    // 6) Al tamaño de servicio.
    const fin = document.createElement('canvas');
    fin.width = ancho;
    fin.height = Math.round((h / w) * ancho);
    const fx = fin.getContext('2d');
    fx.imageSmoothingQuality = 'high';
    fx.drawImage(recorte, 0, 0, fin.width, fin.height);

    return {
      fondo, rojo, negro,
      origen: [c.width, c.height],
      encuadre: [x0, y0, w, h],
      medida: [fin.width, fin.height],
      datos: fin.toDataURL('image/webp', 0.94).split(',')[1],
    };
  }, { b64, ancho: ANCHO });

  await browser.close();

  const bytes = Buffer.from(salida.datos, 'base64');
  const hex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('');

  console.log(' original ' + salida.origen.join('x') +
              '  fondo ' + hex(salida.fondo) +
              '  tintas ' + hex(salida.rojo) + ' / ' + hex(salida.negro));
  console.log(' encuadre ' + salida.encuadre.join(',') +
              '  ->  ' + salida.medida.join('x') + '  ' + bytes.length + ' B');

  const viejo = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO) : null;
  if (viejo && viejo.equals(bytes)) {
    console.log(' = img/logo/marca-pie.webp');
  } else if (comprobar) {
    console.log(' KO img/logo/marca-pie.webp ' + (viejo ? 'esta desfasada' : 'no existe'));
    console.log(' arreglalo con: node scripts/build-logo-pie.js');
    console.log('LOGO_PIE_KO');
    process.exit(1);
  } else {
    fs.writeFileSync(DESTINO, bytes);
    console.log(' + img/logo/marca-pie.webp');
  }

  console.log('LOGO_PIE_OK');
})();
