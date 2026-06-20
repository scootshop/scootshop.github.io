(function () {
  "use strict";

  // En todas las páginas (no solo el home): desactivar la restauración de scroll
  // nativa del navegador. Sin esto, las fichas hacían su propia restauración —que
  // con scroll-behavior:smooth se ve ANIMADA y a veces deja la página en una
  // posición previa (p. ej. abajo)— al volver/entrar en iOS WebKit. Con 'manual',
  // las fichas abren arriba; el bfcache sigue restaurando el atrás/adelante real.
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  // En fichas de producto: abrir SIEMPRE arriba. Al re-entrar desde el bfcache
  // (volver/adelante en iOS WebKit) el navegador las restauraba en una posición
  // previa (p. ej. los botones de compra); forzamos el tope solo en ese caso
  // (pageshow persistido), sin arrancar al usuario que ya está leyendo.
  try {
    window.addEventListener('pageshow', function (e) {
      if (e && e.persisted && isProductDetailPath()) {
        try { window.scrollTo(0, 0); } catch (_) {}
      }
    });
  } catch (e) {}

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

  // Auto-actualización al restaurar desde bfcache: si la versión publicada cambió
  // respecto a la que tiene esta página congelada, recargar para traer el código nuevo.
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

  function addVersionToUrl(url, ver) {
    if (!url) return '';
    var raw = String(url).trim();
    if (!raw) return '';

    try {
      var parsed = new URL(raw, window.location.origin);
      if (parsed.origin !== window.location.origin) return parsed.toString();
      parsed.searchParams.set('v', String(ver || '1'));
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_) {
      return raw;
    }
  }

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
      // Fallback: og:image (same-origin only — avoids fetching from production on localhost)
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

  // Pinta cabecera y menú móvil desde la caché de sesión lo antes posible (antes de
  // que cargue el runtime) para que en visitas repetidas aparezcan al instante, sin
  // el parpadeo de la barra vacía. El runtime los rehidrata después (menús, carrito).
  function primeCachedPartials(ver) {
    try {
      var v = ver || fallbackVersion();
      var slots = [
        ['site-header-slot', '/partials/site-header.html'],
        ['mobile-menu-slot', '/partials/mobile-menu.html']
      ];
      for (var i = 0; i < slots.length; i++) {
        var slot = document.getElementById(slots[i][0]);
        if (!slot || slot.children.length) continue;
        var html = sessionStorage.getItem('__ss_partial_v1:' + v + ':' + slots[i][1]);
        if (html) slot.innerHTML = html;
      }
    } catch (_) {}
  }

  function loadRuntime(ver) {
    window.ASSET_VER = ver;
    primeCachedPartials(ver);
    var path = String((window.location && window.location.pathname) || '').toLowerCase();
    var isAccountPage = path === '/cuenta' || path === '/cuenta/';

    if (!document.querySelector('script[data-cart-runtime="true"]')) {
      var cartScript = document.createElement('script');
      // cart-runtime.js se sirve como inmutable; este sufijo de revisión fuerza
      // la recarga tras un fix del runtime sin esperar a un bump global de versión
      // (global-assets.js es no-store, así que el nuevo sufijo llega al instante).
      var cartRuntimeRev = '20260616-4';
      cartScript.src = '/js/cart-runtime.js?v=' + encodeURIComponent(ver) + '&r=' + cartRuntimeRev;
      cartScript.async = false;
      cartScript.dataset.cartRuntime = 'true';
      document.head.appendChild(cartScript);
    }

    if (!document.querySelector('script[data-global-assets-runtime="true"]')) {
      var script = document.createElement('script');
      script.src = '/js/global-assets-app.js?v=' + encodeURIComponent(ver);
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

  // Reusar versión ya obtenida por asset-sync.js si existe
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