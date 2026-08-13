/* Fichas de DOS EJES sin script propio: comportamiento completo desde el catálogo. */
const { exigirPlaywright } = require('./_playwright');
const { chromium } = exigirPlaywright('MULTIEJE_OK');
const B = process.argv[2] || 'http://127.0.0.1:8000';

const foto = () => {
  const i = document.querySelector('#mainImage');
  return (i ? (i.getAttribute('src') || '') : '').split('?')[0].split('/').pop();
};
const estado = () => {
  const b = document.querySelector('[data-product-cart-btn="true"]');
  const link = document.querySelector('.btn-main');
  const etiquetas = Array.from(document.querySelectorAll('.variant-axis-label')).map(e => e.textContent.trim());
  const valores = Array.from(document.querySelectorAll('.variant-axis-value')).map(e => e.textContent.trim());
  return {
    foto: (document.querySelector('#mainImage') || {}).src ? document.querySelector('#mainImage').getAttribute('src').split('?')[0].split('/').pop() : '',
    key: b ? b.getAttribute('data-color-key') : '',
    label: b ? b.getAttribute('data-color-label') : '',
    attrs: b ? b.getAttribute('data-attrs') : '',
    href: link ? link.getAttribute('href') : '',
    etiquetas: etiquetas,
    valores: valores,
    deshabilitados: Array.from(document.querySelectorAll('.variant-option[disabled]')).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim())
  };
};

(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/404|401|ERR_CONN|Permissions/.test(m.text())) errs.push(m.text().slice(0, 70)); });
  let fallos = 0;
  const check = (id, ok, det) => { if (!ok) fallos++; console.log((ok ? '✔ ' : '✘ ') + id.padEnd(50) + det); };

  // ── WAKE: medida + color, con foto por combinación ───────────────────────────
  await p.goto(B + '/accesorios/manillar-wake/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3200);
  let e = await p.evaluate(estado);
  check('WAKE inicial: rótulos del catálogo', e.etiquetas.join('|') === 'MEDIDA:|COLOR:', e.etiquetas.join(' '));
  check('WAKE inicial: clave e imagen', e.key === 'negro-780' && e.foto === '6.webp', e.key + '  ' + e.foto);

  await p.click('.variant-axis-grid button:nth-child(1)');   // 720 mm
  await p.waitForTimeout(900);
  e = await p.evaluate(estado);
  check('WAKE al cambiar de MEDIDA: clave, etiqueta y foto', e.key === 'negro-720' && /720 mm/.test(e.label) && e.foto === '12.webp',
    e.key + ' · "' + e.label + '" · ' + e.foto);
  check('WAKE: atributos con nombre completos', /"size":"720"/.test(e.attrs) && /"color":"negro"/.test(e.attrs), e.attrs);
  check('WAKE: valor activo de cada eje', e.valores[0] === '720 mm' && /720 mm/.test(e.valores[1]), e.valores.join(' | '));

  await p.click('.variant-axis-grid button:nth-child(3)');  // Azul
  await p.waitForTimeout(900);
  e = await p.evaluate(estado);
  check('WAKE al cambiar de COLOR con 720 puesta', e.key === 'azul-720' && e.foto === '14.webp', e.key + '  ' + e.foto);
  check('WAKE: el enlace de compra sigue la combinación', /color=azul-720/.test(decodeURIComponent(e.href)), decodeURIComponent(e.href).split('&').filter(x => /color/.test(x)).join(' '));

  // ── UNO: modelo + medida, sin eje de círculos, con `allows` ──────────────────
  await p.goto(B + '/accesorios/manillar-uno/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3200);
  e = await p.evaluate(estado);
  check('UNO inicial: dos ejes rotulados desde el catálogo', e.etiquetas.length === 2 && /MODELO/.test(e.etiquetas[0]) && /MEDIDA/.test(e.etiquetas[1]), e.etiquetas.join(' '));
  check('UNO inicial: clave combinada', e.key === 'rb12-720', e.key);

  const modelos = await p.$$('.size-variants:nth-of-type(1) .variant-axis-grid button, .size-variants .variant-axis-grid button');
  await p.evaluate(() => {
    const secciones = document.querySelectorAll('.variant-axis');
    const b = secciones[0].querySelectorAll('button')[1];   // FB12
    b.click();
  });
  await p.waitForTimeout(900);
  e = await p.evaluate(estado);
  check('UNO: al elegir otro MODELO se apagan las medidas que no admite', e.deshabilitados.length > 0, e.deshabilitados.join(', ') || 'ninguna');
  check('UNO: la clave sigue al modelo', /^fb12-/.test(e.key), e.key);

  console.log('\nerrores consola: ' + (errs.length ? errs.join(' | ') : 'ninguno'));
  console.log(fallos ? '✘ MULTIEJE_KO (' + fallos + ')' : '✔ MULTIEJE_OK');
  await br.close();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
