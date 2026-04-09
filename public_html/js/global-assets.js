(function () {
  "use strict";

  function fallbackVersion() {
    var meta = document.querySelector('meta[name="asset-version"]');
    var ver = meta && meta.getAttribute('content');
    return ver ? String(ver).trim() : '1';
  }

  function loadRuntime(ver) {
    window.ASSET_VER = ver;

    if (document.querySelector('script[data-global-assets-runtime="true"]')) return;

    var script = document.createElement('script');
    script.src = '/js/global-assets-app.js?v=' + encodeURIComponent(ver);
    script.async = false;
    script.dataset.globalAssetsRuntime = 'true';
    document.head.appendChild(script);
  }

  if (typeof fetch !== 'function') {
    loadRuntime(fallbackVersion());
    return;
  }

  fetch('/asset-version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('version fetch failed');
      return response.json();
    })
    .then(function (data) {
      var ver = data && data.v ? String(data.v).trim() : fallbackVersion();
      loadRuntime(ver || fallbackVersion());
    })
    .catch(function () {
      loadRuntime(fallbackVersion());
    });
})();