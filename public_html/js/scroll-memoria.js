/* js/scroll-memoria.js — EL ÚNICO que mueve el scroll entre páginas.

   EL PROBLEMA QUE SUSTITUYE
   Antes había cinco trozos de código tocando la posición, cada uno colgado de un
   evento distinto y sin nadie que arbitrase: un script en línea que escondía la home
   entera, otro en `index.js` que saltaba a un píxel guardado y lo re-aplicaba diez
   frames, el de cada ficha que forzaba el tope cuatro veces, y `global-assets.js`
   forzándolo otra vez en `pageshow`. Quien ganaba dependía de qué tardase más ese
   día, y por eso el cliente aparecía unas veces donde estaba, otras arriba y otras
   en un sitio cualquiera.

   LAS TRES DECISIONES QUE LO ARREGLAN

   1. La posición vive en la ENTRADA DEL HISTORIAL (`history.state`), no en una marca
      global de la pestaña. Antes era `sessionStorage.ss_scrollY`: se escribía al
      salir de la home y se leía al ENTRAR en la home, viniera el usuario de donde
      viniera — pulsar el logo te devolvía a mitad del catálogo (medido). El estado
      del historial viaja con SU entrada: al pulsar "atrás" está, en una visita nueva
      no está. La distinción deja de ser una suposición y pasa a ser un hecho.

   2. Se guarda UN ELEMENTO, no un píxel. `2600` no significa nada: si el catálogo
      cambia de altura —una foto que tarda, la fuente que entra, otro producto, otra
      pestaña de categoría— ese píxel es otro sitio. Y si el documento aún es corto
      cuando se salta, el navegador RECORTA el salto sin avisar (medido: 3 476 px de
      alto a los 176 ms, 11 902 px a los 956 ms). Guardando "la tarjeta p-s3 estaba a
      210 px del borde superior" la vuelta es correcta aunque todo lo demás cambie.

   3. Se re-ancla mientras la maquetación se mueve, no un número fijo de frames. Se
      vigila la altura del documento y se recoloca hasta que deja de cambiar, con un
      tope de tiempo y abortando en cuanto el usuario toca la pantalla: nunca hay que
      pelearse con quien ya está leyendo.

   NO SE PELEA CON EL NAVEGADOR: si la página vuelve del bfcache (`pageshow` con
   `persisted`), este módulo ni siquiera se ejecuta —es el mismo documento— y la
   restauración nativa, que es perfecta, se queda como está.

   El velo (`html.ss-volviendo`) lo pone el script en línea del <head>, porque para
   evitar ver el salto hay que decidirlo ANTES del primer pintado. Este módulo es
   quien lo quita, en cuanto la posición es correcta. */
(function () {
  'use strict';

  /* Qué se considera "un sitio" de la página. Las tarjetas de la home ya traen
     identidad estable (`id="p-s3"`), y las secciones de las fichas también. No hace
     falta inventar marcadores: se usa lo que el HTML ya declara.

     Se busca en DOS pasadas y no en una sola porque `querySelectorAll` devuelve en
     orden de documento, no en orden de selector: una <section> que envuelve medio
     catálogo aparecería antes que la tarjeta concreta que el cliente está mirando, y
     anclar a ella es mucho menos preciso (su altura cambia al añadir productos). */
  var ANCLAS_FINAS = 'article.card[id], [data-scroll-anchor][id]';
  var ANCLAS_GRUESAS = 'section[id]';

  var PLAZO_ANCLA = 2000;   // ms esperando a que el JS pinte el elemento guardado
  var PLAZO_TOTAL = 3000;   // ms: tope duro de todo el proceso
  var PLAZO_VELO = 1500;    // ms: la página nunca está escondida más que esto
  var VELO = 'ss-volviendo';

  var doc = document;
  var de = doc.documentElement;

  /* El <head> ya dejó dicho si esta carga es una vuelta. Si el módulo llegara antes
     de tiempo o el inline fallara, se recalcula igual desde el historial. */
  var API = window.SS_SCROLL || (window.SS_SCROLL = {});

  /* RECARGAR NO ES VOLVER ATRAS. Una recarga reutiliza la MISMA entrada del
     historial, asi que el estado guardado sigue ahi y sin esta comprobacion el
     sitio daba por hecho que el visitante venia de atras: recargar la portada te
     dejaba a media pagina en vez de arriba. El tipo de navegacion lo distingue. */
  function esRecarga() {
    try {
      var e = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (e) return e.type === 'reload';
      return !!(performance.navigation && performance.navigation.type === 1);
    } catch (e) { return false; }
  }

  function estadoDelHistorial() {
    try {
      if (esRecarga()) return null;
      var s = history.state;
      if (!s || typeof s !== 'object' || !s.ss || typeof s.ss !== 'object') return null;
      var ss = s.ss;
      if (!ss.id && !(ss.y > 0)) return null;
      return ss;
    } catch (e) { return null; }
  }

  function quitarVelo() {
    if (de.classList.contains(VELO)) de.classList.remove(VELO);
  }

  // ─── GUARDAR ────────────────────────────────────────────────────────────────

  /* El primer elemento anclable que aún se ve (o que empieza por encima pero sigue
     asomando). Es el que el usuario tiene delante, y por tanto el que quiere volver
     a ver. Se guarda su desplazamiento respecto al borde superior, que puede ser
     negativo: "la tarjeta empezaba 80 px por encima del borde". */
  /* Hay zonas cuyo contenido cambia en cada carga —"También te puede interesar" se
     baraja— y ahí un `id` no es una posición: al volver, esa tarjeta puede no existir.
     La zona se declara con `data-scroll-volatil` y aquí se salta. */
  function primeraALaVista(selector) {
    var nodos = doc.querySelectorAll(selector);
    for (var i = 0; i < nodos.length; i++) {
      var r = nodos[i].getBoundingClientRect();
      if (r.height <= 0 || r.bottom <= 0) continue;
      if (nodos[i].closest && nodos[i].closest('[data-scroll-volatil]')) continue;
      return { id: nodos[i].id, dy: Math.round(r.top) };
    }
    return null;
  }

  function anclaActual() {
    return primeraALaVista(ANCLAS_FINAS) || primeraALaVista(ANCLAS_GRUESAS);
  }

  var ultimoGuardado = 0;

  function guardar() {
    // Safari limita `replaceState` (unas 100 llamadas por medio minuto), así que se
    // guarda al SALIR, no mientras se hace scroll, y nunca dos veces seguidas.
    var ahora = Date.now();
    if (ahora - ultimoGuardado < 250) return;
    ultimoGuardado = ahora;

    var y = Math.round(window.scrollY || window.pageYOffset || 0);
    var base = {};
    try {
      if (history.state && typeof history.state === 'object') {
        for (var k in history.state) if (k !== 'ss') base[k] = history.state[k];
      }
    } catch (e) { }

    // Salir desde arriba no es una posición que restaurar: es la posición natural.
    // Guardarla haría que la vuelta pusiera el velo para nada.
    if (y < 4) {
      try { history.replaceState(base, ''); } catch (e) { }
      return;
    }

    var ss = { y: y };
    var a = anclaActual();
    if (a) { ss.id = a.id; ss.dy = a.dy; }
    base.ss = ss;
    try { history.replaceState(base, ''); } catch (e) { }
  }

  /* `pagehide` cubre todas las salidas —enlace, `location.href`, congelación para el
     bfcache—. `visibilitychange` es el refuerzo de iOS, donde el sistema puede
     descartar la pestaña sin pasar por `pagehide`. Y el clic en captura es el
     tercero: si un manejador navega de inmediato, la posición ya está escrita. */
  window.addEventListener('pagehide', guardar);
  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') guardar();
  });
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('a[href], article.card, [data-link]')) guardar();
  }, true);

  // ─── RESTAURAR ──────────────────────────────────────────────────────────────

  var ss = estadoDelHistorial();
  API.volviendo = !!ss;

  if (!ss) {
    // Visita nueva: no hay nada que restaurar y el velo no debería ni estar puesto.
    quitarVelo();
    return;
  }

  var abortado = false;
  function abortar() { abortado = true; quitarVelo(); }
  var opciones = { passive: true, once: true };
  window.addEventListener('wheel', abortar, opciones);
  window.addEventListener('touchstart', abortar, opciones);
  window.addEventListener('keydown', abortar, { once: true });

  var arranque = Date.now();
  var porAncla = false;      // ¿ya se ha colocado usando el elemento guardado?
  var altoPrevio = -1;
  var quietoDesde = 0;

  function irA(y) {
    y = Math.max(0, Math.round(y));
    if (Math.abs((window.scrollY || 0) - y) <= 1) return;
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  }

  /* Colocar tiene DOS niveles, y ese es el truco:

     - el píxel guardado se aplica YA, aunque el documento todavía sea corto y el
       navegador recorte el salto. Es una aproximación instantánea y gratis.
     - el elemento guardado es la verdad, y manda en cuanto existe. En la home lo
       pinta el JS del catálogo, así que llega tarde; hasta entonces vale el píxel.

     Intentar solo lo segundo era el error de la primera versión: la ficha esperaba a
     unas tarjetas que se pintan al final y se quedaba en el tope. */
  function colocar() {
    if (abortado) return;
    if (ss.id) {
      var el = doc.getElementById(ss.id);
      if (el) {
        var r = el.getBoundingClientRect();
        irA((window.scrollY || 0) + r.top - (ss.dy || 0));
        porAncla = true;
        return;
      }
      // El elemento no ha aparecido y se acabó la paciencia: nos quedamos con el píxel.
      if (Date.now() - arranque > PLAZO_ANCLA) ss = { y: ss.y || 0 };
    }
    if (ss.y > 0) irA(ss.y);
  }

  /* El bucle recoloca hasta agotar el plazo, no hasta que la altura parezca quieta.

     Parecía razonable parar en cuanto la altura llevaba tres frames igual, y estaba
     mal: la altura se queda quieta un instante mientras las fotos siguen cargando, y
     al reanudarse el elemento se va hacia abajo con la página ya "terminada". Medido
     en la ficha: paraba a 853 px del sitio. Corregir en silencio hasta el plazo no le
     cuesta nada a nadie —y en cuanto el usuario toca la pantalla, se abandona—.

     Lo que sí depende de que la altura esté quieta es QUITAR EL VELO: enseñar la
     página en cuanto la posición ya es creíble, y seguir afinando por debajo. */
  function vigilar() {
    if (abortado) return;
    var transcurrido = Date.now() - arranque;
    colocar();

    var alto = de.scrollHeight;
    if (alto === altoPrevio) quietoDesde++;
    else { quietoDesde = 0; altoPrevio = alto; }

    if ((quietoDesde >= 3 && (porAncla || !ss.id)) || transcurrido > PLAZO_VELO) quitarVelo();
    if (transcurrido > PLAZO_TOTAL) { quitarVelo(); return; }
    requestAnimationFrame(vigilar);
  }

  colocar();          // el píxel, antes incluso del primer frame
  requestAnimationFrame(vigilar);

  /* Última red: las fuentes entran después del primer pintado y recolocan el texto.
     Si el usuario no ha tocado nada, se confirma la posición una vez más. */
  if (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
    doc.fonts.ready.then(function () {
      if (!abortado) colocar();
      quitarVelo();
    }).catch(quitarVelo);
  }

  // Por si todo lo anterior fallara, la página nunca se queda escondida.
  setTimeout(quitarVelo, PLAZO_VELO + 500);
})();
