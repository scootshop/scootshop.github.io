/* scripts/qa/legacy-metrics.js
 *
 * ¿Se está BORRANDO el sistema viejo o solo añadiendo uno nuevo encima?
 *
 * Cuenta lo que queda del modelo "toda variante es un color" y lo separa en dos cosas
 * que NO son lo mismo:
 *
 *   COMPATIBILIDAD HISTORICA  algo que debe seguir existiendo porque hay pedidos y
 *                             enlaces ya escritos que no se pueden reescribir.
 *   LEGACY VIVO               algo que sigue ahí solo porque todavía no se ha migrado
 *                             a su consumidor. Esto es deuda, y debe bajar a cero.
 *
 *   node scripts/qa/legacy-metrics.js            (informe)
 *   node scripts/qa/legacy-metrics.js --json     (para comparar antes/después)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const EXT = new Set(['.js', '.html', '.css', '.php']);
const EXCLUIR = [
  path.join(RAIZ, 'scripts'),
  path.join(RAIZ, 'node_modules'),
  path.join(RAIZ, '.git'),
  path.join(RAIZ, 'admin', 'email-preview.html')
];

const MEDIDAS = [
  { id: 'colorVariants', tipo: 'legacy', re: /colorVariants/g, nota: 'modelo viejo de eje único' },
  { id: 'colorLabel', tipo: 'compat', re: /colorLabel|color_label/g, nota: 'identidad de línea en pedidos vivos' },
  { id: 'literal_Color:', tipo: 'legacy', re: /['"`]Color: /g, nota: 'rótulo escrito a mano' },
  { id: 'clases_variante_css', tipo: 'legacy', re: /\.(color|size)-variants?\b/g, nota: 'selectores del eje en CSS/JS' },
  { id: 'lectura_DOM_variantes', tipo: 'legacy', re: /querySelector(All)?\(['"][^'"]*(color|size)-variants?/g, nota: 'ejes deducidos del HTML' },
  { id: 'proyectarLegacyEn', tipo: 'legacy', re: /proyectarLegacyEn/g, nota: 'puente al modelo viejo' },
  { id: 'rescatarEjeLegacy', tipo: 'compat', re: /rescatarEjeLegacy|order_item_variant_text/g, nota: 'lectura de pedidos antiguos' },
  { id: 'evento_ss:attrs', tipo: 'legacy', re: /ss:attrs/g, nota: 'aviso previo a SS_ATTRS.ready' },
  { id: 'SS_ATTRS', tipo: 'nuevo', re: /SS_ATTRS/g, nota: 'consumo del núcleo' },
  { id: 'attributes_declarados', tipo: 'nuevo', re: /^\s*attributes:\s*\[/gm, nota: 'productos ya migrados' }
];

function recorrer(dir, out = []) {
  for (const nombre of fs.readdirSync(dir)) {
    const abs = path.join(dir, nombre);
    if (EXCLUIR.some(e => abs === e || abs.startsWith(e + path.sep))) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) recorrer(abs, out);
    else if (EXT.has(path.extname(abs))) out.push(abs);
  }
  return out;
}

function main() {
  const ficheros = recorrer(RAIZ);
  const total = {};
  const porFichero = {};
  for (const m of MEDIDAS) { total[m.id] = 0; porFichero[m.id] = {}; }

  for (const f of ficheros) {
    const txt = fs.readFileSync(f, 'utf8');
    for (const m of MEDIDAS) {
      const n = (txt.match(m.re) || []).length;
      if (!n) continue;
      total[m.id] += n;
      porFichero[m.id][path.relative(RAIZ, f).replace(/\\/g, '/')] = n;
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ficheros: ficheros.length, total, porFichero }, null, 2));
    return;
  }

  console.log('Ficheros analizados: ' + ficheros.length + '\n');
  for (const grupo of ['legacy', 'compat', 'nuevo']) {
    const titulo = grupo === 'legacy' ? 'LEGACY VIVO (debe bajar a cero)'
      : grupo === 'compat' ? 'COMPATIBILIDAD HISTORICA (se queda, con motivo)'
      : 'ARQUITECTURA NUEVA';
    console.log(titulo);
    for (const m of MEDIDAS.filter(x => x.tipo === grupo)) {
      const arriba = Object.entries(porFichero[m.id]).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([f, n]) => f + ':' + n).join('  ');
      console.log('  ' + String(total[m.id]).padStart(4) + '  ' + m.id.padEnd(24) + m.nota.padEnd(34) + arriba);
    }
    console.log('');
  }
}

main();
