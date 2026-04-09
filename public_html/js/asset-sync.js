(function () {
  'use strict';

  function fallbackVersion() {
    var meta = document.querySelector('meta[name="asset-version"]');
    var ver = meta && meta.getAttribute('content');
    return ver ? String(ver).trim() : '1';
  }

  function withVer(url, ver) {
    if (!url) return url;
    if (/^(https?:)?\/\//i.test(url)) return url;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;

    try {
      var resolved = new URL(url, window.location.origin);
      resolved.searchParams.set('v', ver);
      if (url.charAt(0) === '/') return resolved.pathname + resolved.search + resolved.hash;
      var rel = resolved.pathname + resolved.search + resolved.hash;
      return rel.charAt(0) === '/' ? rel.slice(1) : rel;
    } catch (error) {
      var parts = String(url).split('#');
      var base = parts[0];
      var hash = parts[1] ? '#' + parts[1] : '';
      var clean = base.replace(/([?&])v=[^&]*/g, '').replace(/[?&]$/, '');
      var separator = clean.indexOf('?') > -1 ? '&' : '?';
      return clean + separator + 'v=' + encodeURIComponent(ver) + hash;
    }
  }

  function updateElements(ver) {
    document.querySelectorAll('link[href]').forEach(function (node) {
      var href = node.getAttribute('href');
      if (!href || href.indexOf('/') !== 0) return;
      node.setAttribute('href', withVer(href, ver));
    });

    document.querySelectorAll('img[src], source[src], source[srcset], [data-img]').forEach(function (node) {
      ['src', 'srcset', 'data-img'].forEach(function (attr) {
        var value = node.getAttribute && node.getAttribute(attr);
        if (!value || value.indexOf('/') !== 0) return;
        if (attr === 'srcset') {
          var next = value.split(',').map(function (part) {
            var bits = part.trim().split(/\s+/);
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
  }

  function run(ver) {
    window.ASSET_VER = ver;
    updateElements(ver);
  }

  if (typeof fetch !== 'function') {
    run(fallbackVersion());
    return;
  }

  fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('version fetch failed');
      return response.json();
    })
    .then(function (data) {
      var ver = data && data.v ? String(data.v).trim() : fallbackVersion();
      run(ver || fallbackVersion());
    })
    .catch(function () {
      run(fallbackVersion());
    });
})();