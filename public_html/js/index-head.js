/* index-head.js - inicializa assets del home sin bloquear el primer paint */
(() => {
  const enforceLightColorScheme = () => {
    if (!document || !document.head || !document.documentElement) return;

    document.documentElement.style.colorScheme = 'light';

    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.setAttribute('name', 'color-scheme');
      document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.setAttribute('content', 'only light');

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', '#ffffff');
  };

  enforceLightColorScheme();

  const BUST_SIGNAL_KEY = 'scootshop_asset_bust';
  const VERSION_CACHE_KEY = 'scootshop_asset_ver';
  const VERSION_CACHE_TTL = 10 * 60 * 1000;

  const fallbackVersion = () => {
    const meta = document.querySelector('meta[name="asset-version"]');
    const v = (meta && meta.getAttribute('content')) ? String(meta.getAttribute('content')).trim() : '';
    return v || '1';
  };

  // Auto-actualizaciÃ³n al restaurar desde bfcache: si la versiÃ³n publicada cambiÃ³
  // respecto a la que tiene esta pÃ¡gina (congelada), recargamos para traer el cÃ³digo
  // nuevo. Evita quedarse con JS/HTML viejo tras un despliegue al volver atrÃ¡s.
  window.addEventListener('pageshow', (e) => {
    if (!e || !e.persisted) return;
    fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const latest = d && d.v ? String(d.v).trim() : '';
        if (latest && latest !== fallbackVersion()) location.reload();
      })
      .catch(() => {});
  });

  const withVer = (url, ver) => {
    if (!url) return url;
    if (/^(https?:)?\/\//i.test(url)) return url;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;

    try {
      const resolved = new URL(url, window.location.origin);
      resolved.searchParams.set('v', ver);
      if (url.startsWith('/')) return resolved.pathname + resolved.search + resolved.hash;
      const rel = resolved.pathname + resolved.search + resolved.hash;
      return rel.startsWith('/') ? rel.slice(1) : rel;
    } catch (_) {
      const parts = String(url).split('#');
      const base = parts[0].replace(/([?&])v=[^&]*/g, '').replace(/[?&]$/, '');
      const hash = parts[1] ? '#' + parts[1] : '';
      const join = base.includes('?') ? '&' : '?';
      return base + join + 'v=' + encodeURIComponent(ver) + hash;
    }
  };

  const updateStaticElements = (ver) => {
    /* Ya no hay nada que reescribir. Estaba versionando [data-img] â€”la foto grande de
       cada miniaturaâ€”, pero desde que el bump global no toca las imÃ¡genes sus URLs se
       quedan congeladas en la versiÃ³n en que se subieron: ponerles la actual pedÃ­a una
       URL distinta de la cacheada, o sea rebajar la misma foto.
       El aviso que ya habÃ­a aquÃ­ ("avoid changing already requested src/href at
       runtime; rewriting them triggers duplicate downloads") vale tambiÃ©n para esto y
       para el resto de imÃ¡genes; ver la misma regla en global-assets-app.js. */
  };

  const appendDeferredScript = (src, ver, rev) => {
    // Dedupe por ruta base (ignorando ?v): si la pÃ¡gina ya incluye este script
    // de forma estÃ¡tica con otra versiÃ³n (p. ej. cart-runtime.js en el home), no
    // lo cargamos otra vez â€” provocaba doble registro del handler de "AÃ±adir".
    if (document.querySelector('script[src="' + src + '"]') ||
        document.querySelector('script[src^="' + src + '?"]')) return;
    const script = document.createElement('script');
    // `rev` = sufijo de revisiÃ³n localizado, mismo truco que cart-runtime.js en
    // global-assets.js: el fichero se sirve como inmutable y el ?v global no basta
    // para refrescarlo, pero index-head.js es no-store y el sufijo llega al instante.
    script.src = withVer(src, ver) + (rev ? '&r=' + encodeURIComponent(rev) : '');
    /* `async = false` es OBLIGATORIO, no decorativo. Un <script> creado desde JS es
       ASÃNCRONO por defecto y `defer` NO le devuelve el orden: solo `async=false`
       garantiza que se ejecuten en el orden en que se insertan. Sin esto, medido en
       producciÃ³n, `product-attributes.js` terminaba ANTES que `products.js` (455 ms
       contra 463 ms) y el nÃºcleo se anunciaba listo sin catÃ¡logo que resolver: el
       carrito escribÃ­a "Modelo: vmp" en vez de "Modelo: G2 PRO VMP". */
    script.async = false;
    script.defer = true;
    document.head.appendChild(script);
  };

  const clearLegacyAvParam = () => {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('__av')) return;
      const forcedVer = String(url.searchParams.get('__av') || '').trim();
      const currentMetaVer = fallbackVersion();
      // Keep forced version marker while HTML meta is still stale; removing it too early causes reload loops.
      if (!forcedVer || forcedVer !== currentMetaVer) return;
      url.searchParams.delete('__av');
      const clean = url.pathname + url.search + url.hash;
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', clean);
      }
    } catch (_) {}
  };

  const forceReloadToVersion = (ver, currentMetaVer) => {
    if (!ver || !currentMetaVer || ver === currentMetaVer) return false;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('__av') === ver) return false;
      url.searchParams.set('__av', ver);
      window.location.replace(url.pathname + url.search + url.hash);
      return true;
    } catch (_) {
      return false;
    }
  };

  const listenForBustSignal = () => {
    if (typeof window.addEventListener !== 'function') return;
    window.addEventListener('storage', (event) => {
      if (!event || event.key !== BUST_SIGNAL_KEY || !event.newValue) return;
      try {
        const signal = JSON.parse(event.newValue);
        const next = signal && signal.v ? String(signal.v).trim() : '';
        if (!next) return;
        try { sessionStorage.setItem(VERSION_CACHE_KEY, JSON.stringify({ v: next, ts: Date.now() })); } catch (_) {}
        const current = String(window.ASSET_VER || fallbackVersion()).trim();
        if (!current || next === current) return;
        forceReloadToVersion(next, current);
      } catch (_) {}
    });
  };

  const readVersion = () => {
    try {
      const cachedRaw = sessionStorage.getItem(VERSION_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.v && cached.ts && (Date.now() - Number(cached.ts) < VERSION_CACHE_TTL)) {
          return Promise.resolve(String(cached.v));
        }
      }
    } catch (_) {}

    if (typeof fetch !== 'function') return Promise.resolve(null);
    try {
      return fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          const next = (j && j.v) ? String(j.v) : null;
          if (next) {
            try { sessionStorage.setItem(VERSION_CACHE_KEY, JSON.stringify({ v: next, ts: Date.now() })); } catch (_) {}
          }
          return next;
        })
        .catch(() => null);
    } catch (_) { return Promise.resolve(null); }
  };

  /* â”€â”€ LA PROMESA EXISTE ANTES QUE EL NUCLEO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     `SS_READY` se cumple cuando se pueden resolver atributos contra el catalogo. Se
     publica AQUI, en el cargador, antes de pedir un solo script: asi cualquier codigo
     â€”incluido el script inline de una ficha, que corre antes que todo lo demasâ€” puede
     escribir `window.SS_READY.then(...)` sin preguntarse si el nucleo ya existe.

     Antes cada consumidor resolvia eso por su cuenta: "si SS_ATTRS existe uso su
     promesa; si no, escucho el evento ss:attrs y entonces uso su promesa". Ese bloque
     estaba copiado en cuatro sitios y el que se olvidaba â€”la fichaâ€” se quedaba sin
     enterarse. Una sola puerta, disponible desde el instante cero. */
  if (!window.SS_READY) {
    window.SS_READY = (typeof Promise === 'function')
      ? new Promise(function (res) { window.__ssResolverReady = res; })
      : null;
  }

  const loadAssets = (ver) => {
    window.ASSET_VER = ver;
    updateStaticElements(ver);
    appendDeferredScript('/js/cart-runtime.js', ver);
    appendDeferredScript('/js/mobile-menu.js', ver);
    appendDeferredScript('/js/auth-ui.js', ver);
    // La capa operativa (precio/stock del panel) va SIEMPRE antes del catÃ¡logo.
    appendDeferredScript('/data/product-overrides.js', ver);
    appendDeferredScript('/data/products.js', ver);
    /* NÃºcleo de atributos. Va DESPUÃ‰S del catÃ¡logo y ANTES de todo lo que pinta
       variantes (products-menu, index.js y, por delegaciÃ³n, variant-pop): es quien
       dice quÃ© eje es cada cosa, cÃ³mo se llama y cÃ³mo se representa. */
    appendDeferredScript('/js/product-attributes.js', ver);
    // DueÃ±o Ãºnico del panel de Productos (escritorio + mÃ³vil). Va DESPUÃ‰S de
    // products.js (necesita el catÃ¡logo) y ANTES de index.js, que delega en Ã©l.
    // Los `defer` se ejecutan en orden de documento, asÃ­ que el orden manda.
    appendDeferredScript('/js/products-menu.js', ver);
    // Subir SIEMPRE esta revisiÃ³n al tocar js/index.js (se sirve como inmutable).
    appendDeferredScript('/js/index.js', ver, '20260909-2');
  };

  const boot = () => {
    const fb = fallbackVersion();
    // Cleanup legacy asset override marker to avoid sticky old URLs.
    clearLegacyAvParam();
    listenForBustSignal();
    // Load immediately with meta-tag version for fast paint
    loadAssets(fb);
    // Then check for a newer version from server
    readVersion().then(v => {
      if (v && v !== fb) {
        if (forceReloadToVersion(v, fb)) return;
        window.ASSET_VER = v;
        // Reload products.js with updated version so price changes appear
        const oldScript = document.querySelector('script[src*="/data/products.js"]');
        if (oldScript) oldScript.remove();
        appendDeferredScript('/data/product-overrides.js', v);
        appendDeferredScript('/data/products.js', v);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
