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

  /* El panel corta en la serie: NO lista modelos. Cada serie enlaza a su sección
     de la portada (homeSectionId), donde ya hay foto, precio y stock. Así el
     panel se queda en un número fijo de filas por muchos productos que se
     añadan al catálogo. */
  function buildPanel(categories) {
    var cats = categories || getMenuCategories();
    if (!cats.length) return '';

    var groups = cats.map(function (category) {
      var rows = (category.series || []).map(function (series) {
        var count = (series.items || []).length;
        var sectionId = series.homeSectionId || ('series-' + series.key);
        return '' +
          '<a class="mm-link" href="/#' + escapeHtml(sectionId) + '">' +
            '<span class="mm-link-content">' + escapeHtml(series.label) + '</span>' +
            '<span class="mm-link-aside">' +
              '<span class="mm-count">' + count + '</span>' +
              '<i class="fa-solid fa-chevron-right mm-arrow" aria-hidden="true"></i>' +
            '</span>' +
          '</a>';
      }).join('');

      return '' +
        '<section class="mm-sub-group" aria-label="' + escapeHtml(category.label) + '">' +
          '<div class="mm-sub-title">' + escapeHtml(category.label) + '</div>' +
          '<div class="mm-nav">' + rows + '</div>' +
        '</section>';
    }).join('');

    return '<div class="mm-sub-shell">' + groups + '</div>';
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
    var fallbackHref = fallbackLink ? (fallbackLink.getAttribute('href') || '/#comprar') : '/#comprar';

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
    // estático a /#comprar en vez de quedarse con un desplegable vacío. Quien
    // carga el catálogo vuelve a llamar aquí cuando termina.
    var panelHtml = buildPanel();
    if (!panelHtml) return false;

    var desktopHosts = scope.querySelectorAll('[data-products-desktop-root]');
    for (var i = 0; i < desktopHosts.length; i++) renderDesktop(desktopHosts[i], panelHtml);

    var mobileRoots = scope.querySelectorAll('[data-products-mobile-root]');
    for (var j = 0; j < mobileRoots.length; j++) renderMobile(mobileRoots[j], panelHtml);

    return true;
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
    render: render,
    initDesktop: initDesktop
  };
})();
