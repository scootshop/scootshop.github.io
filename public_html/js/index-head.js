/* index-head.js - inicializa assets del home sin bloquear el primer paint */
(() => {
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
    document.querySelectorAll('link[href]').forEach((node) => {
      const href = node.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      node.setAttribute('href', withVer(href, ver));
    });

    document.querySelectorAll('img[src], img[srcset], source[src], source[srcset], [data-img]').forEach((node) => {
      ['src', 'srcset', 'data-img'].forEach((attr) => {
        const value = node.getAttribute && node.getAttribute(attr);
        if (!value || !value.startsWith('/')) return;
        if (attr === 'srcset') {
          const next = value.split(',').map((part) => {
            const bits = part.trim().split(/\s+/);
            if (!bits[0]) return part;
            bits[0] = withVer(bits[0], ver);
            return bits.join(' ');
          }).join(', ');
          node.setAttribute(attr, next);
          return;
        }
        node.setAttribute(attr, withVer(value, ver));
      });
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

  const loadAssets = () => {
    const ver = fallbackVersion();
    window.ASSET_VER = ver;
    updateStaticElements(ver);
    appendDeferredScript('/js/mobile-menu.js', ver);
    appendDeferredScript('/data/products.js', ver);
    appendDeferredScript('/js/index.js', ver);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAssets, { once: true });
  } else {
    loadAssets();
  }
})();
