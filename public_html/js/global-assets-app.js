/* /js/global-assets.js */
(function () {
  "use strict";

  // =========================
  // Helpers
  // =========================
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function normalizePath(path) {
    var out = String(path || "").trim();
    if (!out) return "";
    try {
      var url = new URL(out, window.location.origin);
      var pathname = url.pathname || "";
      return pathname.endsWith("/") ? pathname : pathname + "/";
    } catch (e) {
      return out.endsWith("/") ? out : out + "/";
    }
  }

  function moneyToNumber(text) {
    var raw = (text === null || text === undefined) ? "" : String(text).trim();
    if (!raw) return NaN;
    var value = raw.replace(/[^\d,\.]/g, "");
    if (value.indexOf(".") > -1 && value.indexOf(",") > -1) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else if (value.indexOf(",") > -1) {
      value = value.replace(",", ".");
    }
    return Number(value);
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getMenuSeries() {
    if (typeof window.SCOOTSHOP_getMenuSeries === 'function') {
      return window.SCOOTSHOP_getMenuSeries();
    }

    var products = Array.isArray(window.SCOOTSHOP_PRODUCTS) ? window.SCOOTSHOP_PRODUCTS : [];
    var seriesMap = new Map();

    products.forEach(function (product) {
      if (!product || !product.series || !product.href) return;
      var key = String(product.series).toLowerCase();
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          key: key,
          label: 'Serie ' + String(product.series).toUpperCase(),
          items: []
        });
      }
      seriesMap.get(key).items.push({
        label: product.menuLabel || product.name,
        href: product.href,
        order: Number(product.menuOrder || product.homeOrder || 0)
      });
    });

    return Array.from(seriesMap.values()).map(function (series) {
      series.items.sort(function (left, right) {
        return Number(left.order || 0) - Number(right.order || 0);
      });
      series.items = series.items.map(function (item) {
        return { label: item.label, href: item.href };
      });
      return series;
    }).filter(function (series) {
      return series.items.length > 0;
    });
  }

  function getMenuCategories() {
    if (typeof window.SCOOTSHOP_getMenuCategories === 'function') {
      return window.SCOOTSHOP_getMenuCategories();
    }

    return [{
      key: 'default',
      label: 'Productos',
      series: getMenuSeries()
    }];
  }

  function buildDesktopProductsMenu(host) {
    if (!host) return;

    var fallbackLink = host.querySelector('a[href]');
    var fallbackHref = fallbackLink ? (fallbackLink.getAttribute('href') || '/#comprar') : '/#comprar';

    var categories = getMenuCategories();
    var hasManyCategories = categories.length > 1;
    var groups = categories.map(function (category) {
      var seriesMarkup = (category.series || []).map(function (series) {
        var links = series.items.map(function (item) {
          return '<a href="' + escapeHtml(item.href) + '" role="menuitem">' + escapeHtml(item.label) + '</a>';
        }).join('');

        return '' +
          '<section class="pc-products-group" aria-label="' + escapeHtml(series.label) + '">' +
            '<button class="pc-series-toggle" type="button" aria-expanded="false" aria-controls="pc-series-' + escapeHtml(category.key + '-' + series.key) + '">' +
              '<span>' + escapeHtml(series.label) + '</span>' +
              '<i class="fa-solid fa-chevron-down pc-products-caret" aria-hidden="true"></i>' +
            '</button>' +
            '<div class="pc-series-list" id="pc-series-' + escapeHtml(category.key + '-' + series.key) + '" hidden>' + links + '</div>' +
          '</section>';
      }).join('');

      if (!hasManyCategories) return '<div class="pc-products-groups">' + seriesMarkup + '</div>';
      return '<section class="pc-products-category" aria-label="' + escapeHtml(category.label) + '"><div class="pc-products-category-title">' + escapeHtml(category.label) + '</div><div class="pc-products-groups">' + seriesMarkup + '</div></section>';
    }).join('');

    host.innerHTML = '' +
      '<button class="pc-products-trigger" type="button" aria-expanded="false" aria-controls="pcProductsPanel">' +
        '<i class="fa-solid fa-cart-shopping nav-icon" aria-hidden="true"></i>Productos' +
      '</button>' +
      '<div class="pc-products-panel" id="pcProductsPanel" role="menu" aria-label="Submenú de productos" hidden>' +
        '<div class="pc-products-title">' + (hasManyCategories ? 'Categorías' : 'Series') + '</div>' +
        groups +
      '</div>';

    host.dataset.productsHref = fallbackHref;
  }

  function buildMobileProductsMenu(root) {
    if (!root) return;

    var categories = getMenuCategories();
    var hasManyCategories = categories.length > 1;
    var groups = categories.map(function (category) {
      var seriesMarkup = (category.series || []).map(function (series) {
        var links = series.items.map(function (item) {
          return '<a class="mm-sub2-link" href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + '</a>';
        }).join('');

        return '' +
          '<button class="mm-sub-link" data-series="' + escapeHtml(category.key + '-' + series.key) + '" type="button">' +
            '<span>' + escapeHtml(series.label.toUpperCase()) + '</span>' +
            '<i class="fa-solid fa-chevron-down mm-chevron-sm"></i>' +
          '</button>' +
          '<div class="mm-sub2" data-series-content="' + escapeHtml(category.key + '-' + series.key) + '">' + links + '</div>';
      }).join('');

      if (!hasManyCategories) return seriesMarkup;
      return '<div class="mm-sub-category"><div class="mm-sub-category-title">' + escapeHtml(category.label) + '</div>' + seriesMarkup + '</div>';
    }).join('');

    root.innerHTML = '<div class="mm-sub-title">' + (hasManyCategories ? 'CATEGORIAS' : 'SERIES') + '</div>' + groups;
  }

  function renderSharedProductMenus(root) {
    var scope = root || document;

    var desktopHosts = scope.querySelectorAll('[data-products-desktop-root]');
    for (var i = 0; i < desktopHosts.length; i++) buildDesktopProductsMenu(desktopHosts[i]);

    var mobileRoots = scope.querySelectorAll('[data-products-mobile-root]');
    for (var j = 0; j < mobileRoots.length; j++) buildMobileProductsMenu(mobileRoots[j]);
  }

  function buildCheckoutUrl(product) {
    var name = product && product.name ? String(product.name).trim() : "producto";
    var sku = product && product.sku ? String(product.sku).trim() : "";
    var productUrl = product && product.href ? normalizePath(product.href) : "";
    var image = product && product.image ? String(product.image).trim() : "";
    var numericPrice = moneyToNumber(product && product.priceText ? product.priceText : "");
    var price = Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : String(product && product.priceText ? product.priceText : "").trim();
    var url = "/checkout?name=" + encodeURIComponent(name);
    if (sku) url += "&sku=" + encodeURIComponent(sku);
    url += "&price=" + encodeURIComponent(price);
    if (productUrl) url += "&url=" + encodeURIComponent(productUrl);
    if (image) url += "&image=" + encodeURIComponent(image);
    if (product && product.paypalId) {
      url += "&paypal=" + encodeURIComponent(product.paypalId);
      url += "&hid=" + encodeURIComponent(product.paypalId);
    }
    return url;
  }

  function loadProductCatalog() {
    if (Array.isArray(window.SCOOTSHOP_PRODUCTS)) return Promise.resolve(window.SCOOTSHOP_PRODUCTS);

    return new Promise(function (resolve) {
      var existing = document.querySelector('script[data-products-catalog="true"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.SCOOTSHOP_PRODUCTS || []); }, { once: true });
        existing.addEventListener('error', function () { resolve([]); }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = withVer('/data/products.js', window.ASSET_VER || fallbackVersion());
      script.defer = true;
      script.dataset.productsCatalog = 'true';
      script.addEventListener('load', function () { resolve(window.SCOOTSHOP_PRODUCTS || []); }, { once: true });
      script.addEventListener('error', function () { resolve([]); }, { once: true });
      document.head.appendChild(script);
    });
  }

  // Oculta HTML para evitar FOUC mientras inyecta CSS (se auto-quita con timeout)
  var HIDE_ID = "__asset_hide__";
  var hideStyle = document.createElement("style");
  hideStyle.id = HIDE_ID;
  hideStyle.textContent = "html{visibility:hidden}";
  document.head.appendChild(hideStyle);

  function showHtml() {
    var st = document.getElementById(HIDE_ID);
    if (st && st.parentNode) st.parentNode.removeChild(st);
  }
  var showTimeout = setTimeout(showHtml, 1400);

  // =========================
  // Asset version
  // =========================
  function readVersion() {
    if (typeof fetch !== "function") return Promise.resolve(null);
    try {
      return fetch("/asset-version.json?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("version fetch failed");
          return r.json();
        })
        .then(function (j) {
          return (j && j.v) ? String(j.v) : null;
        });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  function fallbackVersion() {
    var meta = document.querySelector('meta[name="asset-version"]');
    var ver = meta && meta.getAttribute("content");
    ver = ver ? String(ver).trim() : "";
    return ver ? ver : "1";
  }

  function withVer(url, ver) {
    if (!url) return url;
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set("v", String(ver));

      if (/^https?:\/\//i.test(url)) return u.toString();
      if (url.startsWith("/")) return u.pathname + u.search + u.hash;

      var rel = u.pathname + u.search + u.hash;
      if (rel.startsWith("/")) rel = rel.slice(1);
      return rel;
    } catch (e) {
      var hashParts = String(url).split("#");
      var beforeHash = hashParts[0];
      var hash = hashParts[1] ? "#" + hashParts[1] : "";
      var qParts = beforeHash.split("?");
      var base = qParts[0];
      var query = qParts[1] || "";

      var out = [];
      if (query) {
        query.split("&").forEach(function (p) {
          if (!p) return;
          if (/^v=/.test(p)) return;
          out.push(p);
        });
      }
      out.push("v=" + encodeURIComponent(ver));
      return base + "?" + out.join("&") + hash;
    }
  }

  // =========================
  // CSS injection
  // =========================
  function findCssLinkByBase(baseHref) {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var clean = href.split("?")[0];
      if (clean === baseHref) return links[i];
    }
    return null;
  }

  function ensureCss(ver, done) {
    // Include main.css (combined partials) + tarjetas + icons so header & mobile menu styles are available on all pages
    var cssFiles = ["/css/main.css", "/css/tarjetas.css", "/css/icons.css"];
    var pending = 0;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(showTimeout);
      showHtml();
      if (typeof done === "function") done();
    }

    cssFiles.forEach(function (base) {
      var link = findCssLinkByBase(base);

      if (link) {
        // Actualiza a la versión correcta si no la tiene
        var current = link.getAttribute("href") || "";
        var target = withVer(base, ver);
        if (current !== target) link.setAttribute("href", target);
        return;
      }

      pending++;
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = withVer(base, ver);

      l.addEventListener("load", function () {
        pending--;
        if (pending <= 0) finish();
      });
      l.addEventListener("error", function () {
        pending--;
        if (pending <= 0) finish();
      });

      document.head.appendChild(l);
    });

    // Si no hubo nada que cargar, mostramos ya
    if (pending === 0) finish();
  }

  // =========================
  // Cache busting para imágenes (locales)
  // =========================
  function isLocal(u) {
    if (!u) return false;
    var str = String(u).trim();
    if (!str) return false;
    if (str.startsWith("#")) return false;
    if (str.startsWith("data:") || str.startsWith("blob:") || str.startsWith("javascript:") || str.startsWith("mailto:") || str.startsWith("tel:")) return false;

    // Absolute same-origin URLs are local too
    if (/^https?:\/\//i.test(str)) {
      try {
        var abs = new URL(str, window.location.href);
        return abs.origin === window.location.origin;
      } catch (e) {
        return false;
      }
    }

    // Scheme-relative external URLs
    if (str.startsWith("//")) return false;

    // Relative or root-relative URL
    return true;
  }

  function addVerToUrl(url, ver) {
    if (!isLocal(url)) return url;

    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set("v", String(ver));
      // Keep same format as input when possible
      if (/^https?:\/\//i.test(url)) return u.toString();
      if (url.startsWith("/")) return u.pathname + u.search + u.hash;
      var rel = u.pathname + u.search + u.hash;
      if (rel.startsWith("/")) rel = rel.slice(1);
      return rel;
    } catch (e) {
      var parts = url.split("#");
      var base = parts[0];
      var hash = parts[1] ? "#" + parts[1] : "";
      var join = base.indexOf("?") > -1 ? "&" : "?";
      return base + join + "v=" + encodeURIComponent(ver) + hash;
    }
  }

  function bumpCssUrlString(str, ver) {
    if (!str) return str;
    return String(str).replace(/url\(([^)]+)\)/gi, function (m, raw) {
      var token = String(raw || "").trim();
      var quote = "";
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        quote = token.charAt(0);
        token = token.slice(1, -1).trim();
      }
      var updated = addVerToUrl(token, ver);
      return "url(" + (quote || "") + updated + (quote || "") + ")";
    });
  }

  function bumpLinkAttr(el, ver) {
    if (!el || !el.getAttribute) return;
    var href = el.getAttribute("href");
    if (!href) return;

    var rel = (el.getAttribute("rel") || "").toLowerCase();
    var as = (el.getAttribute("as") || "").toLowerCase();
    var shouldBump = false;

    if (rel.indexOf("stylesheet") > -1) shouldBump = true;
    if (rel.indexOf("icon") > -1) shouldBump = true;
    if (rel.indexOf("manifest") > -1) shouldBump = true;
    if (rel.indexOf("preload") > -1 && as === "image") shouldBump = true;

    if (shouldBump) el.setAttribute("href", addVerToUrl(href, ver));
  }

  function bumpStyleAttr(el, ver) {
    if (!el || !el.getAttribute || !el.setAttribute) return;
    var inlineStyle = el.getAttribute("style");
    if (!inlineStyle || inlineStyle.indexOf("url(") === -1) return;
    el.setAttribute("style", bumpCssUrlString(inlineStyle, ver));
  }

  function bumpSrcset(srcset, ver) {
    if (!srcset) return srcset;
    return srcset.split(",").map(function (part) {
      var p = part.trim().split(/\s+/);
      var url = p[0];
      var rest = p.slice(1).join(" ");
      var newUrl = addVerToUrl(url, ver);
      return newUrl + (rest ? " " + rest : "");
    }).join(", ");
  }

  function bumpAttr(el, attr, ver) {
    var v = el.getAttribute(attr);
    if (!v) return;
    if (attr.indexOf("srcset") > -1) el.setAttribute(attr, bumpSrcset(v, ver));
    else el.setAttribute(attr, addVerToUrl(v, ver));
  }

  function bumpNode(root, ver) {
    if (!root || root.nodeType !== 1) return;

    if (root.matches && root.matches("img")) {
      var isLazy = (root.getAttribute("loading") === "lazy");
      if (!root.complete || isLazy) bumpAttr(root, "src", ver);
      bumpAttr(root, "data-src", ver);
      bumpAttr(root, "srcset", ver);
      bumpAttr(root, "data-srcset", ver);
    }

    if (root.matches && root.matches("source")) {
      bumpAttr(root, "srcset", ver);
      bumpAttr(root, "data-srcset", ver);
      bumpAttr(root, "src", ver);
      bumpAttr(root, "data-src", ver);
    }

    if (root.matches && root.matches("link")) {
      bumpLinkAttr(root, ver);
    }

    if (root.matches && root.matches("style")) {
      var cssText = root.textContent || "";
      if (cssText.indexOf("url(") > -1) root.textContent = bumpCssUrlString(cssText, ver);
    }

    if (root.matches && root.matches("[style]")) {
      bumpStyleAttr(root, ver);
    }

    if (root.matches && root.matches("[data-img]")) {
      var dataImg = root.getAttribute("data-img");
      if (dataImg) root.setAttribute("data-img", addVerToUrl(dataImg, ver));
    }

    if (root.querySelectorAll) {
      var imgs = root.querySelectorAll("img");
      for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        var isLazy2 = (img.getAttribute("loading") === "lazy");
        if (!img.complete || isLazy2) bumpAttr(img, "src", ver);
        bumpAttr(img, "data-src", ver);
        bumpAttr(img, "srcset", ver);
        bumpAttr(img, "data-srcset", ver);
      }

      var sources = root.querySelectorAll("source");
      for (var j = 0; j < sources.length; j++) {
        var s = sources[j];
        bumpAttr(s, "srcset", ver);
        bumpAttr(s, "data-srcset", ver);
        bumpAttr(s, "src", ver);
        bumpAttr(s, "data-src", ver);
      }

      var links = root.querySelectorAll("link[href]");
      for (var k = 0; k < links.length; k++) {
        bumpLinkAttr(links[k], ver);
      }

      var styled = root.querySelectorAll("[style]");
      for (var m = 0; m < styled.length; m++) {
        bumpStyleAttr(styled[m], ver);
      }

      var styles = root.querySelectorAll("style");
      for (var n = 0; n < styles.length; n++) {
        var t = styles[n].textContent || "";
        if (t.indexOf("url(") > -1) styles[n].textContent = bumpCssUrlString(t, ver);
      }

      var dataImgs = root.querySelectorAll("[data-img]");
      for (var p = 0; p < dataImgs.length; p++) {
        var item = dataImgs[p];
        var raw = item.getAttribute("data-img");
        if (raw) item.setAttribute("data-img", addVerToUrl(raw, ver));
      }
    }
  }

  function enableCacheBusting(ver) {
    onReady(function () {
      bumpNode(document.documentElement, ver);

      var mo = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (!m.addedNodes) return;
          m.addedNodes.forEach(function (n) { bumpNode(n, ver); });
        });
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // =========================
  // Partials (header + menú móvil)
  // =========================
  function loadPartial(slotId, url) {
    var slot = document.getElementById(slotId);
    if (!slot) return Promise.resolve(false);
    // If slot is already populated inline, skip fetching to avoid overwriting existing DOM
    try { if (slot.dataset && slot.dataset.inline === 'true') return Promise.resolve(true); } catch (e) {}

    // If the mobile menu elements already exist in the DOM (bound by another script), don't overwrite
    try {
      if (slotId === 'mobile-menu-slot' && document.getElementById('mobileMenu')) return Promise.resolve(true);
    } catch (e) {}

    var verUrl = withVer(url, window.ASSET_VER || fallbackVersion());
    return fetch(verUrl, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("No se pudo cargar " + url);
        return res.text();
      })
      .then(function (html) {
        slot.innerHTML = html;
        renderSharedProductMenus(slot);
        initDesktopProductsMenu();
        // Trigger mobile menu initialization after insertion
        if (slotId === 'mobile-menu-slot') {
          try {
            // Small delay to ensure DOM updates
            setTimeout(function() {
              if (window && typeof window.MM_openMenu === 'function') {
                console.log('[GLOBAL-ASSETS] Mobile menu partial loaded and ready');
              }
            }, 50);
          } catch (e) { /* ignore */ }
        }
        return true;
      })
      .catch(function () { return false; });
  }

  function initDesktopProductsMenu() {
    var hosts = document.querySelectorAll('[data-products-desktop-root]');
    for (var hostIdx = 0; hostIdx < hosts.length; hostIdx++) {
      var host = hosts[hostIdx];
      if (!host || host.dataset.bound === 'true') continue;

      var trigger = host.querySelector('.pc-products-trigger');
      var panel = host.querySelector('.pc-products-panel');
      var toggles = host.querySelectorAll('.pc-series-toggle');
      if (!trigger || !panel) continue;

      (function (currentHost, currentTrigger, currentPanel, currentToggles) {
        function closeHost() {
          currentHost.classList.remove('is-open');
          currentTrigger.setAttribute('aria-expanded', 'false');
          currentPanel.hidden = true;

          currentToggles.forEach(function (toggle) {
            var list = document.getElementById(toggle.getAttribute('aria-controls'));
            toggle.setAttribute('aria-expanded', 'false');
            toggle.parentElement.classList.remove('is-open');
            if (list) list.hidden = true;
          });
        }

        currentTrigger.addEventListener('click', function (event) {
          event.preventDefault();
          var willOpen = currentPanel.hidden;

          hosts.forEach(function (otherHost) {
            if (otherHost === currentHost) return;
            var otherTrigger = otherHost.querySelector('.pc-products-trigger');
            var otherPanel = otherHost.querySelector('.pc-products-panel');
            if (!otherTrigger || !otherPanel) return;
            otherHost.classList.remove('is-open');
            otherTrigger.setAttribute('aria-expanded', 'false');
            otherPanel.hidden = true;
            otherHost.querySelectorAll('.pc-series-toggle').forEach(function (toggle) {
              var list = document.getElementById(toggle.getAttribute('aria-controls'));
              toggle.setAttribute('aria-expanded', 'false');
              toggle.parentElement.classList.remove('is-open');
              if (list) list.hidden = true;
            });
          });

          currentHost.classList.toggle('is-open', willOpen);
          currentTrigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          currentPanel.hidden = !willOpen;
          if (!willOpen) closeHost();
        });

        currentToggles.forEach(function (toggle) {
          toggle.addEventListener('click', function () {
            var list = document.getElementById(toggle.getAttribute('aria-controls'));
            if (!list) return;
            var willOpen = list.hidden;

            currentToggles.forEach(function (otherToggle) {
              var otherList = document.getElementById(otherToggle.getAttribute('aria-controls'));
              otherToggle.setAttribute('aria-expanded', 'false');
              otherToggle.parentElement.classList.remove('is-open');
              if (otherList) otherList.hidden = true;
            });

            toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            toggle.parentElement.classList.toggle('is-open', willOpen);
            list.hidden = !willOpen;
          });
        });

        currentHost.querySelectorAll('.pc-series-list a').forEach(function (link) {
          link.addEventListener('click', function () {
            closeHost();
          });
        });

        host.dataset.bound = 'true';
      })(host, trigger, panel, toggles);
    }

    if (!document.documentElement.dataset.pcProductsMenuBound) {
      document.addEventListener('click', function (event) {
        var openHosts = document.querySelectorAll('[data-products-desktop-root].is-open');
        openHosts.forEach(function (host) {
          if (host.contains(event.target)) return;
          var trigger = host.querySelector('.pc-products-trigger');
          var panel = host.querySelector('.pc-products-panel');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
          if (panel) panel.hidden = true;
          host.classList.remove('is-open');
          host.querySelectorAll('.pc-series-toggle').forEach(function (toggle) {
            var list = document.getElementById(toggle.getAttribute('aria-controls'));
            toggle.setAttribute('aria-expanded', 'false');
            toggle.parentElement.classList.remove('is-open');
            if (list) list.hidden = true;
          });
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        var openHosts = document.querySelectorAll('[data-products-desktop-root].is-open');
        openHosts.forEach(function (host) {
          var trigger = host.querySelector('.pc-products-trigger');
          var panel = host.querySelector('.pc-products-panel');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
          if (panel) panel.hidden = true;
          host.classList.remove('is-open');
          host.querySelectorAll('.pc-series-toggle').forEach(function (toggle) {
            var list = document.getElementById(toggle.getAttribute('aria-controls'));
            toggle.setAttribute('aria-expanded', 'false');
            toggle.parentElement.classList.remove('is-open');
            if (list) list.hidden = true;
          });
        });
      });

      document.documentElement.dataset.pcProductsMenuBound = 'true';
    }
  }

  // =========================
  // Menú móvil (usa IDs del partial)
  // =========================
  // Mobile menu handler is now fully delegated in /js/mobile-menu.js
  // No init needed here - event delegation handles everything

  // =========================
  // Product page behaviors
  // =========================
  function initCommonProductUI() {
    // Año
    var y = document.getElementById("y");
    if (y) y.textContent = new Date().getFullYear();

    configureReserveButton();

    var shippingBox = document.querySelector('.shipping-box');
    if (shippingBox) {
      shippingBox.setAttribute('aria-label', 'Envío y preparación');
      shippingBox.innerHTML = '' +
        '<div><strong>Envío gratis</strong> (Península)</div>' +
        '<div>Preparación: <strong>1 día hábil</strong> · Tránsito: <strong>5–7 días hábiles</strong></div>';
    }

    // Galería
    var mainImg = document.getElementById("mainImage");
    if (mainImg) {
      var thumbs = document.querySelectorAll(".thumb");
      thumbs.forEach(function (b) {
        b.addEventListener("click", function () {
          var src = b.getAttribute("data-img");
          if (!src) return;
          mainImg.src = addVerToUrl(src, window.ASSET_VER || fallbackVersion());

          thumbs.forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
        });
      });
    }

    // Acordeón ficha técnica (genérico)
    var accBtns = document.querySelectorAll(".spec-acc-btn");
    accBtns.forEach(function (btn) {
      var panelId = btn.getAttribute("aria-controls");
      if (!panelId) return;
      var panel = document.getElementById(panelId);
      if (!panel) return;

      function setOpen(open) {
        btn.setAttribute("aria-expanded", String(open));
        panel.hidden = !open;
      }

      setOpen(false);
      btn.addEventListener("click", function () {
        var isOpen = btn.getAttribute("aria-expanded") === "true";
        setOpen(!isOpen);
      });
    });
  }

  function configureReserveButton() {
    var reserveBtn = document.getElementById("reserveBtn");
    if (!reserveBtn) return;

    var h1 = document.querySelector(".page-title h1");
    var name = (h1 ? h1.textContent : "").trim() || "Producto";
    var priceEl = document.querySelector(".price-now");
    var price = (priceEl ? priceEl.textContent : "").trim();

    var phone = "34666318747";
    var msg = "Hola! Quiero reservar el " + name + (price ? " (" + price + ")" : "") + ". ¿Está disponible?";
    reserveBtn.href = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
    reserveBtn.target = "_blank";
    reserveBtn.rel = "noopener noreferrer";
  }

  function ensureStockNote(ctaCol) {
    if (!ctaCol) return null;
    var note = ctaCol.querySelector('.stock-note');
    if (note) return note;

    note = document.createElement('p');
    note.className = 'stock-note';
    var reserveBtn = ctaCol.querySelector('#reserveBtn, .btn-reserve');
    if (reserveBtn && reserveBtn.parentNode === ctaCol) ctaCol.insertBefore(note, reserveBtn);
    else ctaCol.appendChild(note);
    return note;
  }

  function findSpecStateValue() {
    var rows = document.querySelectorAll('.spec-row');
    for (var i = 0; i < rows.length; i++) {
      var label = rows[i].querySelector('.spec-label');
      var value = rows[i].querySelector('.spec-value');
      if (!label || !value) continue;
      if ((label.textContent || '').trim().toLowerCase() === 'estado') return value;
    }
    return null;
  }

  function updateProductStructuredData(product, availability) {
    var blocks = document.querySelectorAll('script[type="application/ld+json"]');
    blocks.forEach(function (block) {
      var raw = block.textContent || '';
      if (!raw.trim()) return;
      try {
        var data = JSON.parse(raw);
        var changed = false;
        var items = Array.isArray(data['@graph']) ? data['@graph'] : [data];

        items.forEach(function (item) {
          if (!item || item['@type'] !== 'Product') return;
          if (product && product.name) item.name = product.name;
          if (product && product.priceText) {
            var numericPrice = moneyToNumber(product.priceText);
            item.offers = item.offers || { '@type': 'Offer' };
            item.offers.availability = availability;
            item.offers.itemCondition = item.offers.itemCondition || 'https://schema.org/NewCondition';
            if (item.offers.seller === undefined) item.offers.seller = { '@id': 'https://scootshop.co/#org' };
            if (Number.isFinite(numericPrice)) {
              item.offers.price = numericPrice.toFixed(2);
              item.offers.priceCurrency = item.offers.priceCurrency || 'EUR';
            } else {
              delete item.offers.price;
              delete item.offers.priceCurrency;
            }
            changed = true;
          }
        });

        if (changed) block.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        /* ignore invalid JSON-LD blocks */
      }
    });
  }

  function syncProductPageState() {
    var pathname = normalizePath(window.location.pathname);
    var isProductDetail = /^\/(patinetes|motos|bicicletas)\//.test(pathname);
    if (!isProductDetail) return;

    loadProductCatalog().then(function (products) {
      if (!Array.isArray(products) || !products.length) return;

      var currentPath = pathname;
      var product = null;
      for (var i = 0; i < products.length; i++) {
        if (normalizePath(products[i].href) === currentPath) {
          product = products[i];
          break;
        }
      }
      if (!product) return;

      var stock = String(product.stock || 'in_stock').toLowerCase();
      var priceNow = document.querySelector('.price-now');
      if (priceNow && product.priceText) priceNow.textContent = product.priceText;

      var ctaCol = document.querySelector('.cta-col');
      var currentAction = ctaCol ? ctaCol.querySelector('.btn-main') : null;
      var reserveBtn = document.getElementById('reserveBtn');
      var stockNote = ensureStockNote(ctaCol);
      var stateValue = findSpecStateValue();
      var availability = 'https://schema.org/InStock';

      if (ctaCol) {
        if (stock === 'in_stock') {
          availability = 'https://schema.org/InStock';
          if (!currentAction || currentAction.tagName !== 'A') {
            var link = document.createElement('a');
            link.className = 'btn-main';
            if (currentAction && currentAction.parentNode === ctaCol) ctaCol.replaceChild(link, currentAction);
            else if (reserveBtn && reserveBtn.parentNode === ctaCol) ctaCol.insertBefore(link, reserveBtn);
            else ctaCol.insertBefore(link, ctaCol.firstChild);
            currentAction = link;
          }
          currentAction.classList.remove('is-disabled');
          currentAction.removeAttribute('aria-disabled');
          currentAction.removeAttribute('disabled');
          currentAction.href = buildCheckoutUrl(product);
          currentAction.setAttribute('aria-label', 'Comprar ' + (product.name || 'producto'));
          currentAction.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Comprar';
          if (stockNote) {
            stockNote.className = 'stock-note stock-note--in';
            stockNote.textContent = 'Disponible en stock';
          }
          if (stateValue) stateValue.textContent = 'Disponible';
        } else {
          availability = stock === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/PreOrder';
          var label = stock === 'out_of_stock' ? 'Agotado' : 'Proximamente';
          if (!currentAction || currentAction.tagName !== 'BUTTON') {
            var button = document.createElement('button');
            button.className = 'btn-main is-disabled';
            button.type = 'button';
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            if (currentAction && currentAction.parentNode === ctaCol) ctaCol.replaceChild(button, currentAction);
            else if (reserveBtn && reserveBtn.parentNode === ctaCol) ctaCol.insertBefore(button, reserveBtn);
            else ctaCol.insertBefore(button, ctaCol.firstChild);
            currentAction = button;
          }
          currentAction.classList.add('is-disabled');
          currentAction.setAttribute('aria-label', (product.name || 'Producto') + ' ' + label.toLowerCase());
          currentAction.setAttribute('aria-disabled', 'true');
          currentAction.disabled = true;
          currentAction.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> ' + label;
          if (stockNote) {
            stockNote.className = stock === 'out_of_stock' ? 'stock-note stock-note--out' : 'stock-note';
            stockNote.textContent = stock === 'out_of_stock'
              ? 'Actualmente agotado. Puedes reservar por WhatsApp.'
              : 'Disponible para reserva por WhatsApp.';
          }
          if (stateValue) stateValue.textContent = stock === 'out_of_stock' ? 'Agotado' : 'Reserva abierta';
        }
      }

      updateProductStructuredData(product, availability);
      configureReserveButton();
    });
  }

  // =========================
  // Boot
  // =========================
  // Load base CSS asap with fallback version to avoid unstyled menu on slow/blocked fetch
  var preVer = fallbackVersion();
  window.ASSET_VER = preVer;
  ensureCss(preVer, function () { /* early paint */ });

  readVersion()
    .catch(function () { return null; })
    .then(function (v) {
      var ver = v || preVer;
      window.ASSET_VER = ver;

      ensureCss(ver, function () {
        enableCacheBusting(ver);

        onReady(function () {
          loadProductCatalog()
            .catch(function () { return []; })
            .then(function () {
              renderSharedProductMenus(document);
              initDesktopProductsMenu();
            });

          // Intentar cargar el manejador mejorado del menú móvil si existe
          try {
            var mobileScriptUrl = withVer('/js/mobile-menu.js', ver);
            var loadScript = function (src) {
              return new Promise(function (resolve) {
                var s = document.createElement('script');
                s.src = src;
                s.addEventListener('load', function () { resolve(); });
                s.addEventListener('error', function () { resolve(); });
                document.head.appendChild(s);
              });
            };

            // Always load the versioned mobile menu script
            loadScript(mobileScriptUrl).then(function () {
              // Carga partials SOLO si existen los slots
              Promise.resolve()
                .then(function () { return loadPartial("site-header-slot", "/partials/site-header.html"); })
                .then(function () { return loadPartial("mobile-menu-slot", "/partials/mobile-menu.html"); })
                .catch(function () { /* silencioso */ });
            });
          } catch (e) {
            // En caso de cualquier error, procedemos con la carga de partials
            Promise.resolve()
              .then(function () { return loadPartial("site-header-slot", "/partials/site-header.html"); })
              .then(function () { return loadPartial("mobile-menu-slot", "/partials/mobile-menu.html"); })
              .catch(function () { /* silencioso */ });
          }

          initCommonProductUI();
          syncProductPageState();
        });

        // Fallback: if after a short delay the slots are still empty, try to fetch them again
        setTimeout(function () {
          try {
            var headerSlot = document.getElementById('site-header-slot');
            var menuSlot = document.getElementById('mobile-menu-slot');
            if (headerSlot && headerSlot.children.length === 0) {
              console.info('global-assets: header slot empty — fetching partial');
              loadPartial('site-header-slot', '/partials/site-header.html');
            }
            if (menuSlot && menuSlot.children.length === 0) {
              console.info('global-assets: mobile menu slot empty — fetching partial');
              loadPartial('mobile-menu-slot', '/partials/mobile-menu.html');
            }
          } catch (e) { /* ignore */ }
        }, 900);

        // Cookie consent banner (RGPD)
        (function () {
          try {
            if (localStorage.getItem('cc_ok')) return;
          } catch (e) { return; }
          var s = document.createElement('style');
          s.textContent = '.cc-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#111;color:#eee;font:400 .88rem/1.4 "Plus Jakarta Sans",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 18px;flex-wrap:wrap;box-shadow:0 -2px 12px rgba(0,0,0,.25)}.cc-banner a{color:#7dd3fc;text-decoration:underline}.cc-banner button{cursor:pointer;border:none;border-radius:4px;font:700 .84rem/1 "Plus Jakarta Sans",system-ui,sans-serif;padding:8px 18px}.cc-ok{background:#fff;color:#111}.cc-no{background:transparent;color:#aaa;text-decoration:underline}';
          document.head.appendChild(s);
          var b = document.createElement('div');
          b.className = 'cc-banner';
          b.setAttribute('role', 'dialog');
          b.setAttribute('aria-label', 'Consentimiento de cookies');
          b.innerHTML = '<span>Usamos cookies técnicas y de terceros (Stripe, Google Maps, Google Fonts) para el funcionamiento del sitio. <a href="/legal/#cookies">Más info</a></span><button class="cc-ok" type="button">Aceptar</button><button class="cc-no" type="button">Rechazar</button>';
          document.body.appendChild(b);
          b.querySelector('.cc-ok').addEventListener('click', function () { try { localStorage.setItem('cc_ok', '1'); } catch (e) {} b.remove(); });
          b.querySelector('.cc-no').addEventListener('click', function () { try { localStorage.setItem('cc_ok', '0'); } catch (e) {} b.remove(); });
        })();
      });
    });

})();
