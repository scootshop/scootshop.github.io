(function () {
  'use strict';

  var BUST_SIGNAL_KEY = 'scootshop_asset_bust';

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
    // Do not mutate src/href that the browser may already be downloading.
    // This avoids duplicate network transfers on first render.
    document.querySelectorAll('[data-img]').forEach(function (node) {
      var value = node.getAttribute && node.getAttribute('data-img');
      if (!value || value.indexOf('/') !== 0) return;
      node.setAttribute('data-img', withVer(value, ver));
    });
  }

  function run(ver) {
    window.ASSET_VER = ver;
    updateElements(ver);
  }

  function listenForBustSignal() {
    if (typeof window.addEventListener !== 'function') return;
    window.addEventListener('storage', function (event) {
      if (!event || event.key !== BUST_SIGNAL_KEY || !event.newValue) return;
      try {
        var signal = JSON.parse(event.newValue);
        var next = signal && signal.v ? String(signal.v).trim() : '';
        var current = String(window.ASSET_VER || fallbackVersion()).trim();
        if (!next || next === current) return;
        try { sessionStorage.setItem('scootshop_asset_ver', JSON.stringify({ v: next, ts: Date.now() })); } catch (_) {}
        var url = new URL(window.location.href);
        if (url.searchParams.get('__av') === next) return;
        url.searchParams.set('__av', next);
        window.location.replace(url.pathname + url.search + url.hash);
      } catch (_) {}
    });
  }

  listenForBustSignal();

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