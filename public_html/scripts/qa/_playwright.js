/* scripts/qa/_playwright.js
 *
 * De dónde sale Playwright. Estaba escrito con la ruta absoluta de UNA máquina en
 * cada suite: fuera de ese ordenador no arrancaba ninguna, y ese es el motivo por el
 * que las comprobaciones acababan viviendo en carpetas temporales en vez de en el
 * repositorio.
 *
 * Orden de búsqueda: la variable PLAYWRIGHT si se pasa, la instalación local del
 * proyecto, y por último la global de npm en Windows (que es donde está hoy).
 */
'use strict';

const path = require('path');

function cargarPlaywright() {
  const intentos = [];
  if (process.env.PLAYWRIGHT) intentos.push(process.env.PLAYWRIGHT);
  intentos.push('playwright');
  if (process.env.APPDATA) intentos.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'playwright'));
  // Aqui habia ademas la ruta literal de esta maquina. Es REDUNDANTE: la linea de
  // arriba resuelve exactamente lo mismo desde %APPDATA%, y ademas funciona en
  // cualquier ordenador. Con package.json en el repo, la instalacion local
  // ('playwright', el primer intento tras PLAYWRIGHT) es el camino normal.

  for (const via of intentos) {
    try { return require(via); } catch (_) { /* siguiente */ }
  }
  return null;
}

/* TRES RESULTADOS, NO DOS. Antes esto salia con 0 cuando faltaba Playwright, y 0
 * significa «pasa» para cualquiera que mire el codigo de salida: el orquestador
 * imprimia VARIANTES_OK habiendose saltado ocho de once comprobaciones. Un guardian
 * que no puede correr no falla, pero TAMPOCO da por buena la web.
 *
 *   0  PASS      se ejecuto y paso
 *   1  FAIL      se ejecuto y fallo
 *   2  OMITIDA   no se pudo ejecutar (falta Playwright o el entorno)
 *
 * El 2 lo eligio la auditoria y encaja con el resto: ninguna suite lo usaba, asi que
 * no se confunde con ningun fallo existente. Quien orqueste comprobaciones tiene que
 * distinguir los tres; ver scripts/qa/variantes.ps1. */
const OMITIDA = 2;

/** Igual que cargarPlaywright(), pero con el aviso y la salida ya resueltos. */
function exigirPlaywright(marcador) {
  const pw = cargarPlaywright();
  if (!pw) {
    console.log('Playwright no está instalado: no se puede comprobar en un navegador real.');
    console.log('  npm i -g playwright && npx playwright install chromium');
    /* Se le QUITA el _OK al marcador antes de marcar la omision. Las suites llaman
     * con 'A11Y_OK', 'CHIPS_OK'...; concatenar daria 'A11Y_OK_OMITIDO', que SIGUE
     * conteniendo 'A11Y_OK' y cualquiera que haga grep del marcador de exito lo
     * daria por bueno. Es el mismo fallo que se viene a arreglar, disfrazado. */
    console.log(String(marcador).replace(/_OK$/, '') + '_OMITIDO');
    process.exit(OMITIDA);
  }
  return pw;
}

module.exports = { cargarPlaywright, exigirPlaywright, OMITIDA };
