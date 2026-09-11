/* /js/products-menu.js — ÚNICO dueño del panel de Productos.
 *
 * El cajón móvil y el desplegable de escritorio son LA MISMA COSA: el mismo
 * markup (.mm-sub-shell) con las mismas clases y el mismo CSS de
 * partials.mobile-menu.css. Solo cambia el envoltorio — un drawer o un
 * dropdown — y unas pocas medidas del contenedor en main.css.
 *
 * Antes esto vivía copiado CUATRO veces: escritorio y móvil, en js/index.js
 * (que es lo que carga la portada) y en js/global-assets-app.js (que es lo que
 * carga el resto del sitio). Divergían en cuanto se tocaba uno. Ahora los dos
 * ficheros delegan aquí, así que un cambio en este panel sale en las dos
 * superficies y en todas las páginas a la vez.
 *
 * Se carga desde js/index-head.js (portada) y js/global-assets.js (resto),
 * SIEMPRE antes que index.js / global-assets-app.js.
 */
(function () {
  'use strict';

  if (window.SS_PRODUCT_MENUS) return;

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getMenuCategories() {
    if (typeof window.SCOOTSHOP_getMenuCategories !== 'function') return [];
    try {
      var cats = window.SCOOTSHOP_getMenuCategories();
      return Array.isArray(cats) ? cats : [];
    } catch (_) {
      return [];
    }
  }

  /* El panel corta en la serie: NO lista modelos. Cada serie enlaza a su tramo
     DENTRO DE LA PAGINA DE SU CATEGORIA (`/patinetes/#series-joyor`), donde ya
     hay foto, precio y stock. Así el panel se queda en un número fijo de filas
     por muchos productos que se añadan al catálogo.

     Antes era `/#series-joyor`, un ancla de la portada: valia mientras la portada
     pintaba las tres categorias enteras, y dejo de llevar a ningun sitio cuando
     cada una se mudo a su pagina. La ruta NO se deduce aqui —se le pregunta al
     catalogo, que es donde esta escrita una sola vez. */
  function buildPanel(categories, opciones) {
    var cats = categories || getMenuCategories();
    if (!cats.length) return '';
    var op = opciones || {};

    var groups = cats.map(function (category) {
      /* Si la categoria no tiene pagina (motos y bicicletas, apagadas), se cae a
         la portada: mejor llevar a algo que a un ancla muerta. */
      var base = '/';
      try {
        if (typeof window.SCOOTSHOP_getCategoryUrl === 'function') {
          base = window.SCOOTSHOP_getCategoryUrl(category.key) || '/';
        }
      } catch (_) {}

      var rows = (category.series || []).map(function (series) {
        var count = (series.items || []).length;
        var sectionId = series.homeSectionId || ('series-' + series.key);
        return '' +
          '<a class="mm-link" href="' + escapeHtml(base) + '#' + escapeHtml(sectionId) + '">' +
            '<span class="mm-link-content">' + escapeHtml(series.label) + '</span>' +
            '<span class="mm-link-aside">' +
              '<span class="mm-count">' + count + '</span>' +
              '<i class="fa-solid fa-chevron-right mm-arrow" aria-hidden="true"></i>' +
            '</span>' +
          '</a>';
      }).join('');

      /* En el cajon de UNA categoria el nombre no se repite —lo dice la cabecera
         del cajon— y la primera fila es la salida a la pagina entera, que es lo
         que la mayoria viene buscando: el cajon esta para afinar, no para tener
         que afinar. */
      var titulo = op.sinTitulo
        ? ''
        : '<div class="mm-sub-title">' + escapeHtml(category.label) + '</div>';

      var todos = '';
      if (op.conTodos && base !== '/') {
        var total = (category.series || []).reduce(function (n, se) {
          return n + ((se.items || []).length);
        }, 0);
        todos = '' +
          '<a class="mm-link mm-link--todos" href="' + escapeHtml(base) + '">' +
            '<span class="mm-link-content">Ver todos</span>' +
            '<span class="mm-link-aside">' +
              '<span class="mm-count">' + total + '</span>' +
              '<i class="fa-solid fa-chevron-right mm-arrow" aria-hidden="true"></i>' +
            '</span>' +
          '</a>';
      }

      return '' +
        '<section class="mm-sub-group" aria-label="' + escapeHtml(category.label) + '">' +
          titulo +
          '<div class="mm-nav">' + todos + rows + '</div>' +
        '</section>';
    }).join('');

    return '<div class="mm-sub-shell">' + groups + '</div>';
  }

  /* El cajon de UNA categoria (movil). Devuelve '' si la categoria no existe o no
     tiene series: quien llama decide entonces navegar en vez de abrir un cajon
     vacio. */
  function panelDeCategoria(clave) {
    var cats = getMenuCategories().filter(function (c) { return c && c.key === clave; });
    if (!cats.length) return '';
    if (!(cats[0].series || []).length) return '';
    return buildPanel(cats, { sinTitulo: true, conTodos: true });
  }

  /* Cuantos productos tiene una categoria, para el numerito de su fila. */
  function cuentaDeCategoria(clave) {
    var cats = getMenuCategories().filter(function (c) { return c && c.key === clave; });
    if (!cats.length) return 0;
    return (cats[0].series || []).reduce(function (n, se) {
      return n + ((se.items || []).length);
    }, 0);
  }

  function renderMobile(root, panelHtml) {
    if (!root || !panelHtml) return;
    root.innerHTML = panelHtml;
  }

  function renderDesktop(host, panelHtml) {
    if (!host || !panelHtml) return;

    // Enlace estático de reserva del <div data-products-desktop-root>: es a donde
    // apunta Productos si el JS no llega a montar el desplegable.
    var fallbackLink = host.querySelector('a[href]');
    var fallbackHref = fallbackLink ? (fallbackLink.getAttribute('href') || '/patinetes/') : '/patinetes/';

    host.innerHTML = '' +
      '<button class="pc-products-trigger" type="button" aria-expanded="false" aria-controls="pcProductsPanel">' +
        '<i class="fa-solid fa-cart-shopping nav-icon" aria-hidden="true"></i>Productos' +
        '<i class="fa-solid fa-chevron-down pc-products-caret" aria-hidden="true"></i>' +
      '</button>' +
      // Sin role="menu"/"menuitem": esto es navegación, no un menú de
      // aplicación, y además el mismo markup se reutiliza en el cajón móvil,
      // donde no hay contenedor con role="menu" que los sostenga. Cada grupo ya
      // va en un <section aria-label="<categoría>">.
      '<div class="pc-products-panel" id="pcProductsPanel" hidden>' +
        panelHtml +
      '</div>';

    host.dataset.productsHref = fallbackHref;
  }

  function render(root) {
    var scope = root || document;

    // Si el catálogo aún no está, NO se pinta: el host conserva su enlace
    // estático a /patinetes en vez de quedarse con un desplegable vacío. Quien
    // carga el catálogo vuelve a llamar aquí cuando termina.
    var panelHtml = buildPanel();
    if (!panelHtml) return false;

    var desktopHosts = scope.querySelectorAll('[data-products-desktop-root]');
    for (var i = 0; i < desktopHosts.length; i++) renderDesktop(desktopHosts[i], panelHtml);

    var mobileRoots = scope.querySelectorAll('[data-products-mobile-root]');
    for (var j = 0; j < mobileRoots.length; j++) renderMobile(mobileRoots[j], panelHtml);

    pintarCuentas(scope);

    return true;
  }

  /* El numerito de cada fila de categoria del menu movil. Sale del catalogo, asi
     que un alta o una baja se refleja sola; nace `hidden` para no enseñar un cero
     mientras carga. */
  function pintarCuentas(scope) {
    var filas = (scope || document).querySelectorAll('[data-mm-cat]');
    for (var i = 0; i < filas.length; i++) {
      var hueco = filas[i].querySelector('[data-mm-cuenta]');
      if (!hueco) continue;
      var n = cuentaDeCategoria(filas[i].getAttribute('data-mm-cat') || '');
      if (n > 0) { hueco.textContent = String(n); hueco.hidden = false; }
      else { hueco.hidden = true; }
    }
  }

  // =========================
  // Desplegable de escritorio
  // =========================
  function closeHost(host) {
    if (!host) return;
    var trigger = host.querySelector('.pc-products-trigger');
    var panel = host.querySelector('.pc-products-panel');
    host.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function closeAll(except) {
    var hosts = document.querySelectorAll('[data-products-desktop-root]');
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i] !== except) closeHost(hosts[i]);
    }
  }

  // Delegación en document, una sola vez. Es lo que permite que render() pueda
  // reescribir el innerHTML del host tantas veces como haga falta (al cargar el
  // catálogo, al inyectar la cabecera como parcial…) sin quedarse sin handlers:
  // antes los listeners se ataban a cada trigger y morían con él, y había que
  // acordarse de re-enlazar. Por eso initDesktop() se puede llamar sin miedo.
  function initDesktop() {
    if (document.documentElement.dataset.pcProductsMenuBound === 'true') return;
    document.documentElement.dataset.pcProductsMenuBound = 'true';

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest && event.target.closest('.pc-products-trigger');
      if (trigger) {
        var host = trigger.closest('[data-products-desktop-root]');
        if (!host) return;
        var panel = host.querySelector('.pc-products-panel');
        if (!panel) return;
        event.preventDefault();
        var willOpen = panel.hidden;
        closeAll(host);
        host.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        panel.hidden = !willOpen;
        return;
      }

      // Un enlace del panel cierra el desplegable y navega de forma nativa.
      var link = event.target.closest && event.target.closest('.pc-products-panel a[href]');
      if (link) {
        closeHost(link.closest('[data-products-desktop-root]'));
        return;
      }

      // Clic fuera.
      var openHosts = document.querySelectorAll('[data-products-desktop-root].is-open');
      for (var k = 0; k < openHosts.length; k++) {
        if (!openHosts[k].contains(event.target)) closeHost(openHosts[k]);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var openHosts = document.querySelectorAll('[data-products-desktop-root].is-open');
      for (var k = 0; k < openHosts.length; k++) {
        var trigger = openHosts[k].querySelector('.pc-products-trigger');
        closeHost(openHosts[k]);
        if (trigger) trigger.focus();
      }
    });
  }

  window.SS_PRODUCT_MENUS = {
    buildPanel: buildPanel,
    panelDeCategoria: panelDeCategoria,
    cuentaDeCategoria: cuentaDeCategoria,
    render: render,
    initDesktop: initDesktop
  };
})();
