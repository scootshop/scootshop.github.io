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
  intentos.push('C:/Users/User/AppData/Roaming/npm/node_modules/playwright');

  for (const via of intentos) {
    try { return require(via); } catch (_) { /* siguiente */ }
  }
  return null;
}

/** Igual que cargarPlaywright(), pero con el aviso y la salida limpia ya resueltos:
 *  una suite que no puede correr NO debe dar por buena la web ni fallar el pipeline. */
function exigirPlaywright(marcador) {
  const pw = cargarPlaywright();
  if (!pw) {
    console.log('Playwright no está instalado: no se puede comprobar en un navegador real.');
    console.log('  npm i -g playwright && npx playwright install chromium');
    console.log(marcador + ' (omitido)');
    process.exit(0);
  }
  return pw;
}

module.exports = { cargarPlaywright, exigirPlaywright };
