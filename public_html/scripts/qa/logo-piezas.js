'use strict';
// Guardian de las dos piezas del logotipo (img/logo/*-foto.webp), que son las que
// escriben «SCOOT SHOP» en el titular de la bienvenida.
//
// Se recortan del original (img/logo/letras-perfectas.png) y el CSS las coloca con
// DOS FRACCIONES medidas sobre ese recorte: la imagen de SHOP mide 192/132 veces
// la altura de sus letras y sobresale 60/132 por debajo, porque su barra roja
// cuelga bajo la linea base. Si alguien vuelve a recortar las piezas con otro
// encuadre, esas fracciones dejan de valer y SHOP se descoloca respecto a SCOOT.
// Por eso aqui no se miran solo las imagenes: se comprueba que lo que el CSS
// DECLARA es lo que las imagenes MIDEN.
//
//   node scripts/qa/logo-piezas.js
const { exigirPlaywright } = require('./_playwright.js');
const pw = exigirPlaywright('LOGO_PIEZAS');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'img', 'logo');
const CSS = path.join(RAIZ, 'css', 'index.css');
const TOLERANCIA = 0.005;          // 0,5% entre lo declarado y lo medido

(async () => {
  const fallos = [];

  // 1) Estan las piezas y el original del que salen
  for (const f of ['scoot-foto.webp', 'shop-foto.webp', 'letras-perfectas.png']) {
    if (!fs.existsSync(path.join(DIR, f))) fallos.push('falta img/logo/' + f);
  }
  if (fallos.length) { fallos.forEach((f) => console.log(' KO ' + f)); console.log('LOGO_PIEZAS_KO'); process.exit(1); }

  // 2) Lo que el CSS declara
  const css = fs.readFileSync(CSS, 'utf8');
  const mAlto = css.match(/\.bienve-marca--shop img\{\s*height:\s*calc\(var\(--marca-h\)\s*\*\s*(\d+)\s*\/\s*(\d+)\)/);
  const mBaja = css.match(/\.bienve-marca--shop\{[^}]*margin-bottom:\s*calc\(var\(--marca-h\)\s*\*\s*-(\d+)\s*\/\s*(\d+)\)/);
  if (!mAlto || !mBaja) {
    console.log(' KO no se encuentran las fracciones de SHOP en css/index.css');
    console.log('LOGO_PIEZAS_KO');
    process.exit(1);
  }
  const declAlto = Number(mAlto[1]) / Number(mAlto[2]);
  const declBaja = Number(mBaja[1]) / Number(mBaja[2]);

  // 3) Lo que las imagenes miden
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const medir = async (fichero) => {
    const b64 = fs.readFileSync(path.join(DIR, fichero)).toString('base64');
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/webp;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let oscY0 = 1e9, oscY1 = -1, rojos = 0, negros = 0, opacos = 0, grisones = 0;
      for (let y = 0; y < c.height; y++) {
        let osc = 0;
        for (let px = 0; px < c.width; px++) {
          const i = (y * c.width + px) * 4;
          const a = d[i + 3];
          if (a < 128) continue;
          opacos++;
          const R = d[i], G = d[i + 1], B = d[i + 2];
          if (R - Math.min(G, B) > 60) rojos++;
          else if (R < 110 && G < 110 && B < 110) { negros++; osc++; }
          // Un pixel opaco de color de fondo es la ORLA que deja un recorte a
          // secas: ni tinta ni transparente, gris pegado al borde.
          if (a > 200 && R > 150 && G > 150 && B > 150) grisones++;
        }
        if (osc > 4) { if (y < oscY0) oscY0 = y; if (y > oscY1) oscY1 = y; }
      }
      const altoLetras = oscY1 >= 0 ? (oscY1 - oscY0 + 1) : c.height;
      return { w: c.width, h: c.height, altoLetras, rojos, negros, opacos, grisones };
    }, b64);
  };

  const scoot = await medir('scoot-foto.webp');
  const shop = await medir('shop-foto.webp');
  await browser.close();

  // SCOOT: todo el dibujo son letras, no cuelga nada por debajo
  if (scoot.altoLetras !== scoot.h) {
    fallos.push('scoot: el dibujo deberia ser solo letras (alto ' + scoot.h + ', letras ' + scoot.altoLetras + ')');
  }
  if (scoot.rojos < scoot.opacos * 0.8) fallos.push('scoot: deberia ser rojo casi entero (rojos=' + scoot.rojos + '/' + scoot.opacos + ')');

  // SHOP: sus dos tintas, y las fracciones que el CSS da por buenas
  if (shop.negros < 100) fallos.push('shop: sin letras negras');
  if (shop.rojos < 100) fallos.push('shop: sin barra roja');
  const medAlto = shop.h / shop.altoLetras;
  const medBaja = (shop.h - shop.altoLetras) / shop.altoLetras;
  const dif = (a, b) => Math.abs(a - b) / b;
  if (dif(declAlto, medAlto) > TOLERANCIA) {
    fallos.push('shop: el CSS declara alto ' + declAlto.toFixed(4) + ' y la imagen mide ' + medAlto.toFixed(4));
  }
  if (dif(declBaja, medBaja) > TOLERANCIA) {
    fallos.push('shop: el CSS declara caida ' + declBaja.toFixed(4) + ' y la imagen mide ' + medBaja.toFixed(4));
  }

  // Ninguna puede traer la orla gris del fondo del original
  for (const [n, m] of [['scoot', scoot], ['shop', shop]]) {
    if (m.grisones > m.opacos * 0.01) {
      fallos.push(n + ': ' + m.grisones + ' pixeles opacos con color de fondo (orla gris del recorte)');
    }
  }

  console.log(' scoot ' + scoot.w + 'x' + scoot.h + '  letras=' + scoot.altoLetras + '  rojo=' + scoot.rojos + '  orla=' + scoot.grisones);
  console.log(' shop  ' + shop.w + 'x' + shop.h + '  letras=' + shop.altoLetras +
    '  alto=' + medAlto.toFixed(4) + ' (css ' + declAlto.toFixed(4) + ')' +
    '  caida=' + medBaja.toFixed(4) + ' (css ' + declBaja.toFixed(4) + ')' +
    '  orla=' + shop.grisones);

  if (fallos.length) {
    fallos.forEach((f) => console.log(' KO ' + f));
    console.log('LOGO_PIEZAS_KO');
    process.exit(1);
  }
  console.log('LOGO_PIEZAS_OK');
})().catch((e) => { console.error(e); process.exit(1); });
