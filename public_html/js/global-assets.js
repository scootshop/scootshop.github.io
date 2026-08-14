(function () {
  "use strict";

  /* AQUI NO SE TOCA EL SCROLL. Antes habia dos cosas: `scrollRestoration = manual`
     para todo el sitio y un `scrollTo(0,0)` al volver del bfcache en las fichas. Las
     dos se han ido a js/scroll-memoria.js, que es el unico dueno de la posicion.
     Forzar el tope al volver del bfcache era ademas lo contrario de lo que el cliente
     quiere: leyendo una ficha, tocar un accesorio y volver le devolvia arriba
     (medido: -2341 px). Las paginas que no participan (checkout, cuenta, pago,
     pedido) se quedan con la restauracion nativa del navegador, que ahi acierta. */

  function enforceLightColorScheme() {
    if (!document || !document.head || !document.documentElement) return;

    document.documentElement.style.colorScheme = 'light';

    var colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.setAttribute('name', 'color-scheme');
      document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.setAttribute('content', 'only light');

    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', '#ffffff');
  }

  enforceLightColorScheme();

  var BUST_SIGNAL_KEY = 'scootshop_asset_bust';
  var VERSION_CACHE_KEY = 'scootshop_asset_ver';
  var VERSION_CACHE_TTL = 10 * 60 * 1000;

  function fallbackVersion() {
    var meta = document.querySelector('meta[name="asset-version"]');
    var ver = meta && meta.getAttribute('content');
    return ver ? String(ver).trim() : '1';
  }

  // Auto-actualizaciÃ³n al restaurar desde bfcache: si la versiÃ³n publicada cambiÃ³
  // respecto a la que tiene esta pÃ¡gina congelada, recargar para traer el cÃ³digo nuevo.
  window.addEventListener('pageshow', function (e) {
    if (!e || !e.persisted) return;
    fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var latest = d && d.v ? String(d.v).trim() : '';
        if (latest && latest !== fallbackVersion()) location.reload();
      })
      .catch(function () {});
  });

  function isProductDetailPath() {
    var path = String(window.location.pathname || '');
    return /^\/(patinetes|motos|bicicletas|accesorios)\/.+/.test(path);
  }

  function primeProductLcpImage(ver) {
    if (!isProductDetailPath() || !document.head) return;
    if (document.querySelector('link[data-lcp-preload="true"]')) return;

    // Prefer the actual img src from DOM (already has the right version suffix),
    // falling back to og:image only when the img hasn't been parsed yet.
    var mainImg = document.getElementById('mainImage')
      || (document.querySelector('.gallery-main img') );
    var href = mainImg && mainImg.getAttribute('src') ? mainImg.getAttribute('src').trim() : '';

    if (!href) {
      // Fallback: og:image (same-origin only â€” avoids fetching from production on localhost)
      var ogImage = document.querySelector('meta[property="og:image"]');
      var ogHref = ogImage && ogImage.getAttribute('content') ? ogImage.getAttribute('content').trim() : '';
      if (ogHref) {
        try {
          var parsed = new URL(ogHref, window.location.origin);
          if (parsed.origin === window.location.origin) {
            parsed.searchParams.set('v', String(ver || fallbackVersion()));
            href = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch (_) {}
      }
    }

    if (!href) return;

    var preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = href;
    // Si el <img> es responsive, la precarga DEBE copiar su srcset/sizes. Con
    // solo el href se precargaba el original mientras el srcset elegia una
    // variante: el navegador se descargaba LAS DOS (medido en produccion).
    if (mainImg) {
      var imgSrcset = mainImg.getAttribute('srcset');
      var imgSizes = mainImg.getAttribute('sizes');
      if (imgSrcset) {
        preload.setAttribute('imagesrcset', imgSrcset);
        if (imgSizes) preload.setAttribute('imagesizes', imgSizes);
      }
    }
    preload.setAttribute('fetchpriority', 'high');
    preload.dataset.lcpPreload = 'true';
    document.head.appendChild(preload);
  }

  function normalizeCriticalFontsForProductPage() {
    if (!isProductDetailPath()) return;
    var links = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href') || '';
      // Keep product pages on swap to avoid persistent fallback rendering.
      if (href) {
        if (/([?&])display=(optional|fallback|auto|block)/i.test(href)) {
          href = href.replace(/([?&])display=(optional|fallback|auto|block)/i, '$1display=swap');
        } else if (!/([?&])display=/i.test(href)) {
          href += (href.indexOf('?') === -1 ? '?' : '&') + 'display=swap';
        }
        link.setAttribute('href', href);
      }

      // Prevent late font activation shifts on product pages.
      if ((link.getAttribute('media') || '').toLowerCase() === 'print') {
        link.setAttribute('media', 'all');
      }
      if (link.hasAttribute('onload')) {
        link.removeAttribute('onload');
      }
    }
  }

  function forceReloadToVersion(ver, currentMetaVer) {
    if (!ver || !currentMetaVer || ver === currentMetaVer) return false;
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('__av') === ver) return false;
      url.searchParams.set('__av', ver);
      window.location.replace(url.pathname + url.search + url.hash);
      return true;
    } catch (_) {
      return false;
    }
  }

  function listenForBustSignal() {
    if (typeof window.addEventListener !== 'function') return;
    window.addEventListener('storage', function (event) {
      if (!event || event.key !== BUST_SIGNAL_KEY || !event.newValue) return;
      try {
        var signal = JSON.parse(event.newValue);
        var next = signal && signal.v ? String(signal.v).trim() : '';
        if (!next) return;
        try { sessionStorage.setItem(VERSION_CACHE_KEY, JSON.stringify({ v: next, ts: Date.now() })); } catch (_) {}
        var current = String(window.ASSET_VER || fallbackVersion()).trim();
        if (!current || next === current) return;
        forceReloadToVersion(next, current);
      } catch (_) {}
    });
  }

  // Pinta cabecera y menÃº mÃ³vil desde la cachÃ© de sesiÃ³n lo antes posible (antes de
  // que cargue el runtime) para que en visitas repetidas aparezcan al instante, sin
  // el parpadeo de la barra vacÃ­a. El runtime los rehidrata despuÃ©s (menÃºs, carrito).
  function primeCachedPartials(ver) {
    try {
      var v = ver || fallbackVersion();
      var slots = [
        ['site-header-slot', '/partials/site-header'],
        ['mobile-menu-slot', '/partials/mobile-menu']
      ];
      for (var i = 0; i < slots.length; i++) {
        var slot = document.getElementById(slots[i][0]);
        if (!slot || slot.children.length) continue;
        var html = sessionStorage.getItem('__ss_partial_v1:' + v + ':' + slots[i][1]);
        if (html) slot.innerHTML = html;
      }
    } catch (_) {}
  }

  /* ── LA PROMESA EXISTE ANTES QUE EL NUCLEO ──────────────────────────────────
     `SS_READY` se cumple cuando se pueden resolver atributos contra el catalogo. Se
     publica AQUI, en el cargador, antes de pedir un solo script: asi cualquier codigo
     —incluido el script inline de una ficha, que corre antes que todo lo demas— puede
     escribir `window.SS_READY.then(...)` sin preguntarse si el nucleo ya existe.

     Antes cada consumidor resolvia eso por su cuenta: "si SS_ATTRS existe uso su
     promesa; si no, escucho el evento ss:attrs y entonces uso su promesa". Ese bloque
     estaba copiado en cuatro sitios y el que se olvidaba —la ficha— se quedaba sin
     enterarse. Una sola puerta, disponible desde el instante cero. */
  if (!window.SS_READY) {
    window.SS_READY = (typeof Promise === 'function')
      ? new Promise(function (res) { window.__ssResolverReady = res; })
      : null;
  }

  function loadRuntime(ver) {
    window.ASSET_VER = ver;
    primeCachedPartials(ver);
    var path = String((window.location && window.location.pathname) || '').toLowerCase();
    var isAccountPage = path === '/cuenta' || path === '/cuenta/';

    if (!document.querySelector('script[data-cart-runtime="true"]')) {
      var cartScript = document.createElement('script');
      // cart-runtime.js se sirve como inmutable; este sufijo de revisiÃ³n fuerza
      // la recarga tras un fix del runtime sin esperar a un bump global de versiÃ³n
      // (global-assets.js es no-store, asÃ­ que el nuevo sufijo llega al instante).
      // Subir esta revisiÃ³n SIEMPRE que se toque cart-runtime.js: el fichero se
      // sirve como immutable y el ?v global no basta para refrescarlo.
      var cartRuntimeRev = '20260813-5';
      cartScript.src = '/js/cart-runtime.js?v=' + encodeURIComponent(ver) + '&r=' + cartRuntimeRev;
      cartScript.async = false;
      cartScript.dataset.cartRuntime = 'true';
      document.head.appendChild(cartScript);
    }

    /* NÃºcleo de atributos: quiÃ©n dice quÃ© eje es cada variante, cÃ³mo se llama y cÃ³mo
       se representa. Va ANTES de todo lo que pinta variantes (la ficha y la burbuja),
       y `async=false` mantiene el orden. Ver js/product-attributes.js. */
    if (!document.querySelector('script[data-product-attributes="true"]')) {
      var attrsScript = document.createElement('script');
      // Mismo truco que cart-runtime.js: product-attributes.js se sirve como immutable,
      // asi que el ?v global no basta para refrescarlo. Subir SIEMPRE esta revision al
      // tocar el nucleo (global-assets.js es no-store y llega al instante).
      var attrsRev = '20260813-1';
      attrsScript.src = '/js/product-attributes.js?v=' + encodeURIComponent(ver) + '&r=' + attrsRev;
      attrsScript.async = false;
      attrsScript.dataset.productAttributes = 'true';
      document.head.appendChild(attrsScript);
    }

    // DueÃ±o Ãºnico del panel de Productos (escritorio + mÃ³vil). Va ANTES de
    // global-assets-app.js, que delega en Ã©l. `async = false` mantiene el orden.
    if (!document.querySelector('script[data-products-menu="true"]')) {
      var menuScript = document.createElement('script');
      menuScript.src = '/js/products-menu.js?v=' + encodeURIComponent(ver);
      menuScript.async = false;
      menuScript.dataset.productsMenu = 'true';
      document.head.appendChild(menuScript);
    }

    if (!document.querySelector('script[data-global-assets-runtime="true"]')) {
      var script = document.createElement('script');
      // Mismo truco que cart-runtime.js justo arriba: global-assets-app.js se
      // sirve como immutable, asÃ­ que el ?v global no basta para refrescarlo.
      // Subir SIEMPRE esta revisiÃ³n al tocar global-assets-app.js.
      var globalAppRev = '20260812-3';
      script.src = '/js/global-assets-app.js?v=' + encodeURIComponent(ver) + '&r=' + globalAppRev;
      script.async = false;
      script.dataset.globalAssetsRuntime = 'true';
      document.head.appendChild(script);
    }

    if (!isAccountPage && !document.querySelector('script[data-auth-ui-runtime="true"]')) {
      var authScript = document.createElement('script');
      authScript.src = '/js/auth-ui.js?v=' + encodeURIComponent(ver);
      authScript.async = false;
      authScript.dataset.authUiRuntime = 'true';
      document.head.appendChild(authScript);
    }
  }

  function readCachedVersion() {
    try {
      var raw = sessionStorage.getItem(VERSION_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.v || !parsed.ts) return null;
      if (Date.now() - Number(parsed.ts) > VERSION_CACHE_TTL) return null;
      return String(parsed.v);
    } catch (_) {
      return null;
    }
  }

  function writeCachedVersion(ver) {
    try {
      if (!ver) return;
      sessionStorage.setItem(VERSION_CACHE_KEY, JSON.stringify({ v: String(ver), ts: Date.now() }));
    } catch (_) {
      /* ignore storage failures */
    }
  }

  // Reusar versiÃ³n ya obtenida por asset-sync.js si existe
  if (window.ASSET_VER && window.ASSET_VER !== '1') {
    normalizeCriticalFontsForProductPage();
    primeProductLcpImage(window.ASSET_VER);
    loadRuntime(window.ASSET_VER);
    return;
  }

  if (typeof fetch !== 'function') {
    loadRuntime(fallbackVersion());
    return;
  }

  var currentMetaVer = fallbackVersion();
  normalizeCriticalFontsForProductPage();
  primeProductLcpImage(currentMetaVer);
  listenForBustSignal();
  var runtimeLoaded = false;

  function ensureRuntimeLoaded(ver) {
    if (runtimeLoaded) return;
    runtimeLoaded = true;
    loadRuntime(ver || fallbackVersion());
  }

  var cachedVer = readCachedVersion();
  if (cachedVer) {
    if (forceReloadToVersion(cachedVer, currentMetaVer)) return;
    ensureRuntimeLoaded(cachedVer);
    return;
  }

  // First load: start runtime immediately with meta version and verify real version in background.
  ensureRuntimeLoaded(currentMetaVer);

  fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('version fetch failed');
      return response.json();
    })
    .then(function (data) {
      var ver = data && data.v ? String(data.v).trim() : currentMetaVer;
      writeCachedVersion(ver);
      if (forceReloadToVersion(ver, currentMetaVer)) return;
      ensureRuntimeLoaded(ver || fallbackVersion());
    })
    .catch(function () {
      ensureRuntimeLoaded(fallbackVersion());
    });
})();
