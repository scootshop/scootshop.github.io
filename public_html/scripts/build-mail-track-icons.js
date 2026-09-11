/**
 * Los hitos de la linea de tiempo del correo, rasterizados.
 *
 * En /pedido la linea de tiempo son SVG en linea, y en un correo eso no vale: Gmail
 * borra el SVG. Asi que cada hito se hornea aqui como PNG —y se hornea ENTERO: circulo,
 * borde e icono— porque Outlook de escritorio tampoco entiende `border-radius` y nos
 * cuadraria los circulos. Un PNG por hito y estado, y el correo solo tiene que colocarlo.
 *
 *   node scripts/build-mail-track-icons.js          genera img/mail/track/*.png
 *   node scripts/build-mail-track-icons.js --check  falla si estan desactualizados
 *
 * Los SVG NO se copian aqui: se leen de pedido/index.html, que es donde viven. Si
 * alguien cambia un icono en la pagina, --check avisa de que el correo se quedo atras.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'img', 'mail', 'track');
const PAGINA = path.join(RAIZ, 'pedido', 'index.html');

// Mismos valores que .track-ico en pedido/index.html. Se pinta a 2x y se sirve a 29 px.
const LADO = 29;
const ESCALA = 2;
const APAGADO = '#64748b';
const SUELTO = 26; // el icono del titular, sin circulo

// Que hito puede salir encendido con que color: un pedido enviado (azul) tiene hechos
// el pago, la preparacion y el envio, y ninguno mas. Generar solo eso evita 40 PNG.
const ACENTOS = {
  paid: '#15803d',
  preparing: '#7c3aed',
  shipped: '#2563eb',
  delivered: '#16a34a',
  incidencia: '#991b1b',
};
// Y el icono suelto del titular: en /pedido la palabra va SIEMPRE en negro y solo el
// icono toma el color del estado. Ese va sin circulo ni borde.
const RECETA_SUELTA = [
  { icono: 'hourglass', color: '#9a3412' },
  { icono: 'check', color: ACENTOS.paid },
  { icono: 'box', color: ACENTOS.preparing },
  { icono: 'truck', color: ACENTOS.shipped },
  { icono: 'house', color: ACENTOS.delivered },
  { icono: 'alert', color: ACENTOS.incidencia },
];
const RECETA = [
  { icono: 'hourglass', color: APAGADO },
  { icono: 'box', color: APAGADO },
  { icono: 'truck', color: APAGADO },
  { icono: 'house', color: APAGADO },
  { icono: 'check', color: ACENTOS.paid },
  { icono: 'check', color: ACENTOS.preparing },
  { icono: 'check', color: ACENTOS.shipped },
  { icono: 'check', color: ACENTOS.delivered },
  { icono: 'box', color: ACENTOS.preparing },
  { icono: 'box', color: ACENTOS.shipped },
  { icono: 'box', color: ACENTOS.delivered },
  { icono: 'truck', color: ACENTOS.shipped },
  { icono: 'truck', color: ACENTOS.delivered },
  { icono: 'house', color: ACENTOS.delivered },
  { icono: 'alert', color: ACENTOS.incidencia },
];

function nombre(icono, color, suelto) {
  return (suelto ? 'ico-' : 'track-') + icono + '-' + color.replace('#', '').toLowerCase() + '.png';
}

// Los SVG viven en pedido/index.html, dentro de TRACK_ICON. De ahi se leen.
function iconosDeLaPagina() {
  const html = fs.readFileSync(PAGINA, 'utf8');
  const bloque = html.match(/const TRACK_ICON = \{([\s\S]*?)\n      \};/);
  if (!bloque) throw new Error('no encuentro TRACK_ICON en pedido/index.html');
  const iconos = {};
  const re = /(\w+):\s*'(<svg[\s\S]*?<\/svg>)'/g;
  let m;
  while ((m = re.exec(bloque[1]))) iconos[m[1]] = m[2];
  return iconos;
}

function pagina(svg, color, suelto) {
  const caja = suelto
    ? `width:${SUELTO}px;height:${SUELTO}px;color:${color};`
    : `width:${LADO}px;height:${LADO}px;border-radius:999px;background:#ffffff;color:${color};` +
      `border:${color === APAGADO ? '1px solid #ecebeb' : '2px solid ' + color};`;
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    .ico{ display:grid;place-items:center;box-sizing:border-box; ${caja} }
    .ico svg{width:${suelto ? '100%' : '58%'};height:${suelto ? '100%' : '58%'};display:block}
  </style><div class="ico">${svg}</div>`;
}

(async () => {
  const comprobar = process.argv.includes('--check');
  const { chromium } = require(path.join(process.env.APPDATA || os.homedir(), 'npm', 'node_modules', 'playwright'));
  const iconos = iconosDeLaPagina();
  fs.mkdirSync(DESTINO, { recursive: true });

  const navegador = await chromium.launch();
  const pagina2x = await navegador.newPage({ viewport: { width: 80, height: 80 }, deviceScaleFactor: ESCALA });
  const desfasados = [];
  let escritos = 0;

  const todo = RECETA.map((r) => ({ ...r, suelto: false })).concat(RECETA_SUELTA.map((r) => ({ ...r, suelto: true })));
  for (const { icono, color, suelto } of todo) {
    if (!iconos[icono]) throw new Error('falta el icono ' + icono + ' en pedido/index.html');
    await pagina2x.setContent(pagina(iconos[icono], color, suelto));
    const nodo = await pagina2x.$('.ico');
    const png = await nodo.screenshot({ omitBackground: true });
    const destino = path.join(DESTINO, nombre(icono, color, suelto));
    const previo = fs.existsSync(destino) ? fs.readFileSync(destino) : null;
    if (previo && previo.equals(png)) continue;
    if (comprobar) { desfasados.push(nombre(icono, color, suelto)); continue; }
    fs.writeFileSync(destino, png);
    escritos++;
  }
  await navegador.close();

  if (comprobar) {
    if (desfasados.length) {
      desfasados.forEach((f) => console.error('  desfasado: ' + f));
      console.log('ICONOS_CORREO_KO');
      process.exit(1);
    }
    console.log(todo.length + ' iconos al dia');
    console.log('ICONOS_CORREO_OK');
    return;
  }
  console.log(escritos + ' iconos escritos de ' + todo.length + ' en img/mail/track/');
  console.log('ICONOS_CORREO_OK');
})();
