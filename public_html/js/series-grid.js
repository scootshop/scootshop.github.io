// /js/series-grid.js
(function () {
  function esc(str) {
    var s = (str === null || str === undefined) ? "" : String(str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSeriesGrid({ series, mountId }) {
    const mount = document.getElementById(mountId);
    const all = window.SCOOTSHOP_PRODUCTS || [];

    const items = all.filter(p => String(p.series).toLowerCase() === String(series).toLowerCase());

    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = `<p class="empty">No hay patinetes en esta serie todavía.</p>`;
      return;
    }

    mount.innerHTML = items.map(p => {
      const titleId = `p-title-${esc(p.id)}`;
      const descId = `p-desc-${esc(p.id)}`;
      const specs = Array.isArray(p.specs) ? p.specs : [];
      const stock = String(p.stock || "in_stock").toLowerCase();
      const isOut = stock === "out_of_stock";
      const stockText = isOut ? "Agotado" : (stock === "preorder" ? "En reserva" : "Disponible");
      const stockClass = isOut ? "p-stock p-stock--out" : (stock === "preorder" ? "p-stock p-stock--pre" : "p-stock p-stock--in");
      const cardClass = isOut ? "p-card p-card--out" : "p-card";

      return `
        <article class="${cardClass}" aria-labelledby="${titleId}">
          <a class="p-link" href="${esc(p.href)}" aria-describedby="${descId}">
            <div class="p-media">
              <img
                src="${esc(p.image)}"
                alt="${esc(p.alt || p.name)}"
                loading="lazy"
                width="1200"
                height="900"
              />
            </div>

            <div class="p-body">
              <h3 class="p-title" id="${titleId}">${esc(p.name)}</h3>
              <p class="p-price" id="${descId}">${esc(p.priceText || "")}</p>
              <p class="${stockClass}" aria-label="Estado de stock">${stockText}</p>

              ${specs.length ? `
                <ul class="p-specs" aria-label="Características principales">
                  ${specs.slice(0, 3).map(s => `<li>${esc(s)}</li>`).join("")}
                </ul>
              ` : ""}
            </div>
          </a>
        </article>
      `;
    }).join("");
  }

  // Exponer función
  window.SCOOTSHOP_renderSeriesGrid = renderSeriesGrid;
})();
(function () {
  'use strict';

  function initMobileMenu() {
    // Legacy menu initialization removed: unified handler in /js/mobile-menu.js will manage menu.
    return;
  }

  function fallbackMobileMenuHTML() {
    return '' +
      '<div id="mmBackdrop" hidden></div>' +
      '<aside id="mobileMenu" hidden aria-label="Menú móvil">' +
        '<div class="mm-head">' +
          '<strong>Menú</strong>' +
          '<button id="mmClose" type="button" aria-label="Cerrar menú">✕</button>' +
        '</div>' +
        '<nav class="mm-nav" aria-label="Navegación móvil">' +
          '<a href="/#inicio">Inicio</a>' +
          '<button id="mmProductsToggle" type="button" aria-expanded="false" aria-controls="mmProductsSub">Productos</button>' +
          '<div class="mm-sub" id="mmProductsSub" hidden>' +
            '<a href="/#series-k">Serie K</a>' +
            '<a href="/#comprar">Series N</a>' +
            '<a href="/#series-g">Series GT</a>' +
            '<a href="/#series-ix">Serie IX</a>' +
          '</div>' +
          '<a href="/#faq">Preguntas</a>' +
          '<a href="/#ubicacion">Ubicación</a>' +
          '<a href="/#legal">Legal</a>' +
          '<a href="https://www.instagram.com/scootshopping" target="_blank" rel="noopener noreferrer">Instagram</a>' +
          '<a href="https://www.facebook.com/61579248524907" target="_blank" rel="noopener noreferrer">Facebook</a>' +
          '<a href="https://wa.me/34666318747" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
        '</nav>' +
      '</aside>';
  }

  function loadMobileMenuPartial() {
    var slot = document.getElementById('mobile-menu-slot');
    if (!slot) return;
    // If an improved external handler already runs, skip loading/initializing the legacy partial
    try { if (window && window.MM_MENU_HANDLED) return; } catch (e) {}

    // If the slot was pre-inlined, don't overwrite it
    try { if (slot.dataset && slot.dataset.inline === 'true') return; } catch (e) {}

    // If the menu element already exists in the DOM, just ensure it's initialized (if needed)
    if (document.getElementById('mobileMenu')) {
      try { if (typeof initMobileMenu === 'function') initMobileMenu(); } catch (e) {}
      return;
    }

    fetch('/partials/mobile-menu.html', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudo cargar mobile-menu.html');
        return res.text();
      })
      .then(function (html) {
        slot.innerHTML = html;
        try { if (!window.MM_MENU_HANDLED) initMobileMenu(); } catch (e) {}
      })
      .catch(function () {
        slot.innerHTML = fallbackMobileMenuHTML();
        try { if (!window.MM_MENU_HANDLED) initMobileMenu(); } catch (e) {}
      });
  }

  document.addEventListener('DOMContentLoaded', loadMobileMenuPartial);
})();
