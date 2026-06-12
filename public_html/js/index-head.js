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
    // Avoid changing already requested src/href attributes at runtime.
    // Rewriting them triggers duplicate downloads on first load.
    document.querySelectorAll('[data-img]').forEach((node) => {
      const value = node.getAttribute('data-img');
      if (!value || !value.startsWith('/')) return;
      node.setAttribute('data-img', withVer(value, ver));
    });
  };

  const appendDeferredScript = (src, ver) => {
    const url = withVer(src, ver);
    if (document.querySelector('script[src="' + url + '"]')) return;
    const script = document.createElement('script');
    script.src = url;
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

  const loadAssets = (ver) => {
    window.ASSET_VER = ver;
    updateStaticElements(ver);
    appendDeferredScript('/js/cart-runtime.js', ver);
    appendDeferredScript('/js/mobile-menu.js', ver);
    appendDeferredScript('/js/auth-ui.js', ver);
    appendDeferredScript('/data/products.js', ver);
    appendDeferredScript('/js/index.js', ver);
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
