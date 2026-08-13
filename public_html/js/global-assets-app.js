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

  /* Aquí había un escapeHtml() sin un solo uso en este archivo. Cada módulo que lo
     necesita tiene el suyo (cart-runtime, index.js, product-enhancements…). */

  // El panel de Productos (escritorio y móvil) lo pinta js/products-menu.js, que
  // es su único dueño. Aquí solo se delega. No reimplantes el render: la copia
  // paralela que había aquí y en js/index.js es justo lo que hacía que las dos
  // superficies divergieran.
  function renderSharedProductMenus(root) {
    var api = window.SS_PRODUCT_MENUS;
    return !!(api && api.render(root));
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

  // Desactivado a propósito: el chip .badge-min del título conserva la serie
  // estática del HTML ("Serie N", "Ecoxtrem"…) en vez de saltar al brand OEM
  // del catálogo (~1.6s tras cargar). Evita el flip visible (precarga) y no
  // expone marcas OEM. Antes reescribía el texto con el brand del producto; si
  // se quiere reactivar, ver git / memoria project_ficha_cls_precarga.
  function applyProductBrandBadge() { /* no-op */ }

  // Oculta HTML para evitar FOUC mientras inyecta CSS (se auto-quita con timeout)
  // Si la página ya enlaza main.css en <head>, ya tiene CSS crítico y no debe ocultarse.
  var HIDE_ID = "__asset_hide__";
  var hideStyle = document.createElement("style");
  hideStyle.id = HIDE_ID;
  var _hasMainCss = !!document.querySelector('link[rel="stylesheet"][href*="/css/main.css"]');
  if (!_hasMainCss) {
    hideStyle.textContent = "html{visibility:hidden}";
    document.head.appendChild(hideStyle);
  }

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
    var path = String(window.location.pathname || "");
    var skipIconsCss = path === "/pago" || path === "/pago.html" || path === "/checkout/" || path === "/checkout" || path === "/admin/pedidos.html";
    // Include main.css and mobile menu globally. icons.css is skipped on pages that don't use Font Awesome.
    var cssFiles = ["/css/main.css", "/css/partials.mobile-menu.css"];
    if (!skipIconsCss) cssFiles.push("/css/icons.css");
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

    if (!shouldBump) return;

    el.setAttribute("href", addVerToUrl(href, ver));

    // Si la precarga es responsive, hay que versionar TAMBIEN sus candidatos.
    // Dejandolos con la version anterior, el href y el imagesrcset apuntaban a
    // URLs distintas y el navegador acababa descargando las dos imagenes.
    var imageSrcset = el.getAttribute("imagesrcset");
    if (imageSrcset) {
      el.setAttribute("imagesrcset", imageSrcset.split(",").map(function (candidate) {
        var parts = candidate.trim().split(/\s+/);
        if (!parts[0]) return candidate.trim();
        parts[0] = addVerToUrl(parts[0], ver);
        return parts.join(" ");
      }).join(", "));
    }
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
    var nuevo = (attr.indexOf("srcset") > -1) ? bumpSrcset(v, ver) : addVerToUrl(v, ver);
    /* Si no cambia nada, NO se escribe. Escribir el mismo src vuelve a lanzar el
       algoritmo de carga de la imagen, y sobre una que ya estaba bajando eso es una
       descarga tirada y un hueco en blanco a la vista. Este guardia vale para todo el
       sitio: cualquier <img> que ya venga versionado deja de pasar por el aro. */
    if (nuevo === v) return;
    el.setAttribute(attr, nuevo);
  }

  /* LAS IMÁGENES YA NO SE VERSIONAN AQUÍ, y es deliberado.

     Desde agosto de 2026 el bump global no toca las fotos: se sirven immutable y
     re-versionarlas obligaba a rebajar ~1,1 MB por ficha en cada despliegue. Sus URLs
     quedan congeladas en la versión en que se subieron. Si esta pasada siguiera
     poniéndoles la versión ACTUAL, reescribiría `1.webp?v=…-12` a `…-13` sobre una
     imagen que el navegador YA estaba bajando: se tira lo empezado, se pide la otra
     URL y la foto parpadea. Medido en la ficha del M41: 25 fotos bajadas dos veces.

     Es la misma regla que index-head.js ya se aplicaba a sí mismo ("avoid changing
     already requested src/href at runtime"), que aquí faltaba.

     Lo que SÍ se sigue versionando es lo que de verdad va con la versión global: CSS,
     JS, los url() de estilos y los <link>. */
  function bumpNode(root, ver) {
    if (!root || root.nodeType !== 1) return;

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

    if (root.querySelectorAll) {
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

      /* [data-img] tampoco se versiona: es la foto grande que carga cada miniatura de
         la galería al pulsarla. Subirle la versión significaba pedir una URL distinta
         de la que ya está en caché, o sea rebajar la misma foto por pulsar. Va con la
         misma regla que el resto de imágenes. */
    }
  }

  function enableCacheBusting(ver) {
    onReady(function () {
      var runInitialBump = function () {
        bumpNode(document.documentElement, ver);
      };

      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(runInitialBump, { timeout: 1400 });
      } else {
        setTimeout(runInitialBump, 60);
      }

      var queue = [];
      var queued = false;
      var flushQueue = function () {
        queued = false;
        if (!queue.length) return;
        var toProcess = queue.slice();
        queue.length = 0;
        for (var i = 0; i < toProcess.length; i++) {
          bumpNode(toProcess[i], ver);
        }
      };

      var scheduleFlush = function () {
        if (queued) return;
        queued = true;
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(flushQueue, { timeout: 800 });
        } else {
          setTimeout(flushQueue, 40);
        }
      };

      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (!m.addedNodes || !m.addedNodes.length) continue;
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (!n || n.nodeType !== 1) continue;
            queue.push(n);
          }
        }
        scheduleFlush();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

      // Keep this observer only during startup/hydration window.
      setTimeout(function () {
        try { mo.disconnect(); } catch (e) { /* ignore */ }
      }, 15000);
    });
  }

  // =========================
  // Partials (header + menú móvil)
  // =========================
  function partialCacheKey(url, ver) {
    return '__ss_partial_v1:' + String(ver || '1') + ':' + String(url || '');
  }

  function readPartialCache(url, ver) {
    try {
      return sessionStorage.getItem(partialCacheKey(url, ver)) || '';
    } catch (_) {
      return '';
    }
  }

  function writePartialCache(url, ver, html) {
    try {
      if (!html) return;
      sessionStorage.setItem(partialCacheKey(url, ver), String(html));
    } catch (_) {
      /* ignore storage failures */
    }
  }

  /* Hidratar = rellenar lo que el HTML del parcial trae vacío (el submenú de
     productos) y refrescar lo que depende del estado (cuenta, carrito). Va separado
     de PINTAR a propósito: hay un caso —el habitual en visitas repetidas— en el que
     el DOM ya es correcto y solo falta hidratarlo. */
  function hydratePartial(slot) {
    if (!slot) return;
    renderSharedProductMenus(slot);
    initDesktopProductsMenu();
    if (window.SS_AUTH_UI && typeof window.SS_AUTH_UI.refresh === 'function') {
      window.SS_AUTH_UI.refresh();
    }
    if (window.SS_CART && typeof window.SS_CART.refreshButtons === 'function') {
      window.SS_CART.refreshButtons();
    }
  }

  /* Deshacer el bloqueo de scroll si el menú ha dejado de estar abierto. Red de
     seguridad: el bloqueo lo pone mobile-menu.js en el BODY, así que sobrevive a
     cualquier sustitución del panel. Si alguna vez se sustituye con el menú abierto,
     al menos la página no se queda congelada. */
  function soltarBloqueoSiNoHayMenu() {
    var body = document.body;
    if (!body || !body.classList.contains('mm-lock-scroll')) return;
    var panel = document.getElementById('mobileMenu');
    if (panel && panel.classList.contains('active')) return;
    var y = Math.abs(parseInt(body.style.top || '0', 10)) || 0;
    body.classList.remove('mm-lock-scroll');
    body.style.top = '';
    try { window.scrollTo(0, y); } catch (_) {}
  }

  function applyPartialHtml(slotId, slot, html) {
    if (!slot || !html) return false;
    slot.innerHTML = html;
    hydratePartial(slot);
    if (slotId === 'mobile-menu-slot') soltarBloqueoSiNoHayMenu();
    return true;
  }

  function menuMovilAbierto() {
    var panel = document.getElementById('mobileMenu');
    return !!(panel && panel.classList.contains('active'));
  }

  function loadPartial(slotId, url) {
    var slot = document.getElementById(slotId);
    if (!slot) return Promise.resolve(false);
    var ver = window.ASSET_VER || fallbackVersion();
    var verUrl = withVer(url, ver);
    var cachedHtml = readPartialCache(url, ver);
    var hydratedFromCache = false;

    if (cachedHtml && slot.children.length === 0) {
      hydratedFromCache = applyPartialHtml(slotId, slot, cachedHtml);
    }

    /* El hueco puede venir YA pintado de antes de que corriera este archivo:
       primeCachedPartials() (global-assets.js) vuelca la misma caché de sesión nada
       más arrancar, para que la barra no aparezca vacía. En ese caso el DOM ya es
       correcto —lo que le falta es la hidratación, que aquella función no hace. */
    var yaPintadoDesdeCache = !!cachedHtml && !hydratedFromCache && slot.children.length > 0;

    return fetch(verUrl, { cache: hydratedFromCache ? 'force-cache' : 'default', credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error("No se pudo cargar " + url);
        return res.text();
      })
      .then(function (html) {
        if (!html) return hydratedFromCache;
        writePartialCache(url, ver, html);

        /* NO se vuelve a pintar si lo que llega es EXACTAMENTE lo que ya se ve.
           Antes sí se reemplazaba en este caso —el más frecuente, porque la caché de
           sesión guarda el mismo html que sirve el servidor— y eso rompía el menú:
           reproducido sirviendo el parcial a 1,5 s (lo normal en datos móviles), si el
           cliente lo tenía abierto en ese instante el panel se destruía y renacía SIN
           `.active`. El menú desaparecía y, como el bloqueo de scroll vive en el body,
           la página se quedaba congelada y sin menú. Aquí solo falta hidratar. */
        if (cachedHtml === html && (hydratedFromCache || yaPintadoDesdeCache)) {
          if (yaPintadoDesdeCache) hydratePartial(slot);
          return true;
        }

        /* El html ha cambiado de verdad (despliegue nuevo) y el menú está abierto:
           se espera a que se cierre. Sustituirlo debajo del dedo es justo el fallo de
           arriba, solo que por otro camino. */
        if (slotId === 'mobile-menu-slot' && menuMovilAbierto()) {
          var reintento = window.setInterval(function () {
            if (menuMovilAbierto()) return;
            window.clearInterval(reintento);
            applyPartialHtml(slotId, slot, html);
          }, 400);
          return true;
        }

        return applyPartialHtml(slotId, slot, html);
      })
      .catch(function () { return hydratedFromCache; });
  }

  // El comportamiento del desplegable de escritorio también vive en
  // js/products-menu.js. Aquí solo se delega.
  function initDesktopProductsMenu() {
    var api = window.SS_PRODUCT_MENUS;
    if (api) api.initDesktop();
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

    enforceProductActionOrder();
    configureReserveButton();
    enhanceCtaInteractions();

    var shippingBox = document.querySelector('.shipping-box');
    if (shippingBox) {
      shippingBox.setAttribute('aria-label', 'Envío y preparación');
      
      // Detectar si es M41 o Bison GT para tránsito express
      var isExpressShipping = /\/(m41-tank-ultimate-1000w|bison-gt-carbon-design)\//.test(window.location.pathname);
      
      // El tránsito va en su PROPIA línea, con su propio icono (el calendario que le
      // pone .ship-transit en tarjetas.css). Pegado a la preparación en el mismo
      // renglón no cabía en móvil: se partía por donde quería y los días quedaban
      // sueltos en una tercera línea sin icono. Esta estructura de tres <div> tiene
      // que ser la MISMA que la del HTML de las fichas: aquí se reescribe la caja
      // entera en cada carga, así que lo que se escriba aquí es lo que se ve.
      if (isExpressShipping) {
        shippingBox.innerHTML = '' +
          '<div><strong>Envío gratis</strong> (Península)</div>' +
          '<div>Preparación: <strong>1 día hábil</strong></div>' +
          '<div class="ship-transit">Tránsito: <span class="transit-express"><strong>2-3 días</strong><i class="icon-fire"></i></span></div>';
      } else {
        shippingBox.innerHTML = '' +
          '<div><strong>Envío gratis</strong> (Península)</div>' +
          '<div>Preparación: <strong>1 día hábil</strong></div>' +
          '<div class="ship-transit">Tránsito: <strong>5–7 días hábiles</strong></div>';
      }
    }

    // Galería
    var mainImg = document.getElementById("mainImage");
    if (mainImg) {
      // Red de seguridad del srcset: si faltara una variante (producto nuevo al
      // que no se le paso build-card-shots.py), el navegador NO cae solo al src
      // y la foto quedaria rota. Al primer fallo se retira el srcset y se
      // recupera el original.
      mainImg.addEventListener("error", function () {
        if (!mainImg.hasAttribute("srcset")) return;
        var original = mainImg.getAttribute("src");
        mainImg.removeAttribute("srcset");
        mainImg.removeAttribute("sizes");
        if (original) mainImg.setAttribute("src", original);
      });

      var thumbs = document.querySelectorAll(".thumb");
      thumbs.forEach(function (b) {
        b.addEventListener("click", function () {
          var src = b.getAttribute("data-img");
          if (!src) return;
          // IMPRESCINDIBLE quitar el srcset antes de tocar src: mientras hay
          // srcset el navegador elige de ahi e IGNORA el src, asi que la foto
          // no cambiaria al pulsar la miniatura. Ademas es lo correcto: el
          // srcset inicial describe la portada, no esta otra foto.
          mainImg.removeAttribute("srcset");
          mainImg.removeAttribute("sizes");
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
    reserveBtn.setAttribute('aria-label', 'Reservar por WhatsApp ' + name);
    reserveBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Reservar';
  }

  function enhanceCtaInteractions() {
    var ctaCol = document.querySelector('.cta-col');
    if (!ctaCol) return;

    var buyBtn = ctaCol.querySelector('.btn-main[href]');
    if (buyBtn && !buyBtn.dataset.loadingBound) {
      buyBtn.dataset.loadingBound = 'true';
      buyBtn.addEventListener('click', function () {
        if (buyBtn.dataset.loading === 'true') return;
        if (buyBtn.getAttribute('aria-disabled') === 'true') return;
        buyBtn.dataset.loading = 'true';
        buyBtn.setAttribute('aria-busy', 'true');
        buyBtn.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Abriendo checkout...';
        buyBtn.style.pointerEvents = 'none';

        setTimeout(function () {
          buyBtn.dataset.loading = 'false';
          buyBtn.removeAttribute('aria-busy');
          buyBtn.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Comprar ahora';
          buyBtn.style.pointerEvents = '';
        }, 1800);
      });
    }

    var reserveBtn = document.getElementById('reserveBtn');
    if (reserveBtn && !reserveBtn.dataset.loadingBound) {
      reserveBtn.dataset.loadingBound = 'true';
      reserveBtn.addEventListener('click', function () {
        if (reserveBtn.dataset.loading === 'true') return;
        reserveBtn.dataset.loading = 'true';
        reserveBtn.setAttribute('aria-busy', 'true');
        reserveBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Abriendo WhatsApp...';
        reserveBtn.style.pointerEvents = 'none';

        setTimeout(function () {
          reserveBtn.dataset.loading = 'false';
          reserveBtn.removeAttribute('aria-busy');
          reserveBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Reservar';
          reserveBtn.style.pointerEvents = '';
        }, 1200);
      });
    }
  }

  function enforceProductActionOrder() {
    var panelInner = document.querySelector('.panel-inner');
    if (!panelInner) return;

    // Caja de variantes del panel: aqui solo importa DONDE va, no de que eje es.
    var cajaVariantes = panelInner.querySelector('.variant-axis');
    var desc = panelInner.querySelector('.desc');
    // Lo inyecta product-enhancements.js despues de .desc. Si no se contempla
    // aqui, esta funcion vuelve a pegar el CTA justo detras de .desc y lo tira
    // debajo ~1s despues de cargar, a la vista del cliente.
    var compat = panelInner.querySelector('.compat-box');
    var ctaCol = panelInner.querySelector('.cta-col');

    // Desired order: price, color+stock, description, compatible accessories, then CTA.
    if (cajaVariantes) {
      var firstContent = desc || compat || ctaCol;
      if (firstContent && cajaVariantes !== firstContent) {
        panelInner.insertBefore(cajaVariantes, firstContent);
      }
    }

    if (desc && compat && desc.nextElementSibling !== compat) {
      panelInner.insertBefore(compat, desc.nextSibling);
    }

    if (!ctaCol) return;

    var anchor = compat || desc || cajaVariantes;
    if (!anchor) return;
    if (anchor.nextElementSibling !== ctaCol) {
      panelInner.insertBefore(ctaCol, anchor.nextSibling);
    }
  }

  function initSmartPrefetch() {
    if (!document || !document.head) return;

    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) return;
    } catch (_) {}

    var conn = navigator && navigator.connection;
    if (conn) {
      var type = String(conn.effectiveType || '').toLowerCase();
      if (conn.saveData || type === 'slow-2g' || type === '2g') return;
    }

    var prefetched = new Set();
    var isInternalPath = function (href) {
      if (!href) return false;
      if (href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) return false;
      try {
        var parsed = new URL(href, window.location.origin);
        if (parsed.origin !== window.location.origin) return false;
        if (!parsed.pathname || parsed.pathname === '/') return false;
        return true;
      } catch (_) {
        return false;
      }
    };

    var prefetchHref = function (href) {
      if (!isInternalPath(href) || prefetched.has(href)) return;
      prefetched.add(href);
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      link.as = 'document';
      document.head.appendChild(link);
    };

    var schedulePrefetch = function (href) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(function () { prefetchHref(href); }, { timeout: 1200 });
      } else {
        setTimeout(function () { prefetchHref(href); }, 120);
      }
    };

    var selectors = [
      'a[href^="/patinetes/"]',
      'a[href^="/motos/"]',
      'a[href^="/bicicletas/"]',
      'a[href^="/accesorios/"]',
      'a[href^="/checkout"]',
      'a[data-buy-button]'
    ].join(',');

    var links = Array.prototype.slice.call(document.querySelectorAll(selectors));
    links.forEach(function (anchor) {
      if (!anchor || !anchor.href) return;
      var href = anchor.href;

      anchor.addEventListener('mouseenter', function () { schedulePrefetch(href); }, { passive: true, once: true });
      anchor.addEventListener('touchstart', function () { schedulePrefetch(href); }, { passive: true, once: true });
      anchor.addEventListener('focus', function () { schedulePrefetch(href); }, { passive: true, once: true });
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = entry.target;
          observer.unobserve(target);
          if (target && target.href) schedulePrefetch(target.href);
        });
      }, { rootMargin: '180px 0px' });

      links.slice(0, 18).forEach(function (anchor) {
        if (anchor && anchor.href) observer.observe(anchor);
      });
    }
  }

  /* Sitio del aviso de stock, por orden de preferencia. La ficha NO decide: si
     tiene selector de opciones va en su cabecera y, si no, en la fila del precio.
     En los dos casos acaba arriba a la derecha del panel, que es lo que hace que
     todas las fichas se vean igual sin tener que tocarlas una a una. El último
     caso es la red de seguridad de una ficha sin ninguna de las dos cosas.

     La PRIMERA cabecera, no la del color: los cuatro manillares tienen además un
     selector de medida (y el UNO y el KOCEVLO, otro de modelo) que reutiliza esta
     misma clase, y desde que los bloques se ven como una sola tarjeta el aviso
     colgado del color quedaba flotando a media altura del cuadro. Buscando la
     primera sube al borde superior. En el resto de fichas no cambia nada: allí la
     única cabecera de opciones ES la del color. */
  /* La sección del eje de CÍRCULOS. Se busca por lo que CONTIENE, no por su nombre:
     todas las secciones de eje se llaman igual (.variant-axis) desde que las clases
     nombran el control y no el eje. Antes esto decía `.color-variants` y funcionaba
     por accidente —el nombre delataba el eje—; con el nombre único, coger "la
     primera" señalaba la medida en las fichas de manillar. */
  function seccionDeSwatches(raiz) {
    var ambito = raiz || document;
    var secciones = ambito.querySelectorAll('.variant-axis');
    for (var i = 0; i < secciones.length; i++) {
      if (secciones[i].querySelector('.variant-option--swatch')) return secciones[i];
    }
    /* Sin círculos NO hay respuesta: devolver "la primera" hacía que en una ficha de
       modelo+medida se leyera un eje cualquiera como si fuera la variante elegida, y
       la hidratación escribía "720 mm" donde el selector ya había puesto "rb12-720". */
    return null;
  }

  function findStockNoteHome(ctaCol) {
    return document.querySelector('.panel-inner .variant-axis-head')
      || document.querySelector('.variant-axis')
      || document.querySelector('.panel .price-row')
      || ctaCol
      || null;
  }

  function ensureStockNote(ctaCol) {
    var home = findStockNoteHome(ctaCol);
    if (!home) return null;

    /* Se busca en TODA la ficha, no solo dentro de home: si el HTML estático la
       trae en otro sitio se recoloca, en vez de dejar dos avisos a la vez. */
    var note = document.querySelector('.stock-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'stock-note';
    }
    /* PERO si la ficha ya la colocó en la cabecera de un eje, ahí se queda. En una
       ficha de dos ejes "la primera cabecera" depende del orden en que se esté
       reordenando el panel en ese instante, y el aviso saltaba de la fila de la
       medida a la del color según quién llegara antes. Lo que el HTML declara manda. */
    var yaColocada = note.parentElement && note.parentElement.classList
      && note.parentElement.classList.contains('variant-axis-head');
    if (!yaColocada && note.parentElement !== home) home.appendChild(note);
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
    var isProductDetail = /^\/(patinetes|motos|bicicletas|accesorios)\//.test(pathname);
    if (!isProductDetail) return;

    function applyActiveColorToCheckoutUrl(nextHref, currentAction) {
      try {
        var parsed = new URL(nextHref, window.location.origin);

        var selector = seccionDeSwatches();
        var activeButton = selector ? selector.querySelector('.variant-option.is-active:not([disabled]):not([aria-disabled="true"])') : null;
        if (!activeButton && selector) {
          var allButtons = selector.querySelectorAll('.variant-option');
          for (var b = 0; b < allButtons.length; b++) {
            if (!allButtons[b].disabled && allButtons[b].getAttribute('aria-disabled') !== 'true') {
              activeButton = allButtons[b];
              break;
            }
          }
        }

        var activeLabelNode = selector ? selector.querySelector('[data-active-color-label]') : null;
        var colorLabel = activeButton
          ? (activeButton.getAttribute('aria-label') || activeButton.getAttribute('title') || (activeLabelNode ? activeLabelNode.textContent : '') || '').trim()
          : '';
        var colorKey = activeButton
          ? (activeButton.getAttribute('data-color-key') || colorLabel || 'default').trim()
          : '';

        if (!colorKey && currentAction && currentAction.href) {
          try {
            var previous = new URL(currentAction.href, window.location.origin);
            colorKey = (previous.searchParams.get('color') || '').trim();
            colorLabel = colorLabel || (previous.searchParams.get('colorLabel') || '').trim();
          } catch (_) {}
        }

        if (!colorKey) return parsed.pathname + parsed.search + parsed.hash;

        parsed.searchParams.set('color', colorKey);
        // Sin etiqueta no se inventa una: escribir "Color" aqui metia la palabra
        // en el enlace de compra de un producto que se elige por modelo o medida.
        parsed.searchParams.set('colorLabel', colorLabel || '');

        var mainImage = document.querySelector('#mainImage');
        var mainImageSrc = mainImage ? (mainImage.getAttribute('src') || '').trim() : '';
        if (mainImageSrc) parsed.searchParams.set('image', mainImageSrc);

        return parsed.pathname + parsed.search + parsed.hash;
      } catch (_) {
        return nextHref;
      }
    }

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
          currentAction.href = applyActiveColorToCheckoutUrl(buildCheckoutUrl(product), currentAction);
          currentAction.setAttribute('aria-label', 'Comprar ahora ' + (product.name || 'producto'));
          currentAction.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Comprar ahora';

          var addToCartBtn = ctaCol.querySelector('[data-product-cart-btn="true"]');
          if (!addToCartBtn) {
            addToCartBtn = document.createElement('button');
            addToCartBtn.type = 'button';
            addToCartBtn.className = 'btn-cart';
            addToCartBtn.setAttribute('data-add-to-cart', 'true');
            addToCartBtn.setAttribute('data-product-cart-btn', 'true');
            addToCartBtn.setAttribute('data-added-label', 'Añadido');
            if (reserveBtn && reserveBtn.parentNode === ctaCol) ctaCol.insertBefore(addToCartBtn, reserveBtn);
            else ctaCol.appendChild(addToCartBtn);
          }
          ctaCol.classList.add('cta-col--with-cart');

          var activeImage = document.querySelector('#mainImage');
          var imageSrc = activeImage ? (activeImage.getAttribute('src') || '') : '';

          var colorSelector = seccionDeSwatches();
          var activeColorButton = colorSelector ? colorSelector.querySelector('.variant-option.is-active:not([disabled]):not([aria-disabled="true"])') : null;
          if (!activeColorButton && colorSelector) {
            var colorButtons = colorSelector.querySelectorAll('.variant-option');
            for (var cb = 0; cb < colorButtons.length; cb++) {
              if (!colorButtons[cb].disabled && colorButtons[cb].getAttribute('aria-disabled') !== 'true') {
                activeColorButton = colorButtons[cb];
                break;
              }
            }
          }
          var activeColorLabelNode = colorSelector ? colorSelector.querySelector('[data-active-color-label]') : null;
          var activeColorLabel = activeColorButton
            ? (activeColorButton.getAttribute('aria-label') || activeColorButton.getAttribute('title') || (activeColorLabelNode ? activeColorLabelNode.textContent : '') || '').trim()
            : '';
          var activeColorKey = activeColorButton
            ? (activeColorButton.getAttribute('data-color-key') || activeColorLabel || '').trim()
            : '';

          addToCartBtn.setAttribute('data-sku', product.sku || '');
          addToCartBtn.setAttribute('data-name', product.name || 'Producto SCOOT SHOP');
          addToCartBtn.setAttribute('data-price', product.priceText || '');
          addToCartBtn.setAttribute('data-url', product.href || pathname);
          addToCartBtn.setAttribute('data-image', imageSrc || product.image || '');
          /* La variante elegida NO se pisa con vacío. Esta hidratación lee el eje de
             CÍRCULOS del DOM; una ficha que se elige por modelo y medida no tiene
             ninguno, así que aquí `activeColorKey` sale vacío y borraba la clave que
             el selector ya había escrito: la línea entraba al carrito sin variante.
             Se escribe solo cuando hay algo que escribir. */
          /* La variante la manda el SELECTOR, no esta hidratación. Si el botón ya trae
             atributos con nombre es que alguien la ha resuelto —incluida la
             combinación de dos ejes— y aquí no hay nada que corregir. */
          var yaResuelta = !!addToCartBtn.getAttribute('data-attrs');
          if (!yaResuelta && activeColorKey) {
            addToCartBtn.setAttribute('data-color-key', activeColorKey);
            addToCartBtn.setAttribute('data-color', activeColorKey);
          }
          if (!yaResuelta && activeColorLabel) addToCartBtn.setAttribute('data-color-label', activeColorLabel);
          addToCartBtn.setAttribute('data-stock', 'in_stock');
          addToCartBtn.setAttribute('aria-label', 'Añadir al carrito ' + (product.name || 'producto'));
          addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir';

          if (window.SS_CART && typeof window.SS_CART.notify === 'function') {
            window.SS_CART.notify();
          }

          if (stockNote) {
            stockNote.className = 'stock-note stock-note--in';
            stockNote.textContent = 'Stock';
          }
          if (stateValue) stateValue.textContent = 'Disponible';
        } else {
          availability = stock === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/PreOrder';
          var label = stock === 'out_of_stock' ? 'Agotado' : 'Reservar unidad';
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

          var disabledCartBtn = ctaCol.querySelector('[data-product-cart-btn="true"]');
          if (disabledCartBtn && disabledCartBtn.parentNode) {
            disabledCartBtn.parentNode.removeChild(disabledCartBtn);
          }
          ctaCol.classList.remove('cta-col--with-cart');

          if (stockNote) {
            stockNote.className = stock === 'out_of_stock' ? 'stock-note stock-note--out' : 'stock-note';
            stockNote.textContent = stock === 'out_of_stock'
              ? 'NO Stock'
              : 'Disponible para reserva por WhatsApp.';
          }
          if (stateValue) stateValue.textContent = stock === 'out_of_stock' ? 'Agotado' : 'Reserva abierta';
        }
      }

      enforceProductActionOrder();
      updateProductStructuredData(product, availability);
      configureReserveButton();
      enhanceCtaInteractions();
    });
  }

  // =========================
  // Boot
  // =========================
  // Load base CSS asap with fallback version to avoid unstyled menu on slow/blocked fetch
  var preVer = window.ASSET_VER || fallbackVersion();
  window.ASSET_VER = preVer;
  ensureCss(preVer, function () { /* early paint */ });

  // Si ya tenemos versión fiable (puesta por asset-sync.js o global-assets.js), no refetchar
  var _skipVersionFetch = (window.ASSET_VER && window.ASSET_VER !== '1');
  (_skipVersionFetch ? Promise.resolve(window.ASSET_VER) : readVersion().catch(function () { return null; }))
    .then(function (v) {
      var ver = v || preVer;
      window.ASSET_VER = ver;

      ensureCss(ver, function () {
        enableCacheBusting(ver);

        var catalogPromise = loadProductCatalog().catch(function () { return []; });

        onReady(function () {
          initSmartPrefetch();

          catalogPromise
            .then(function () {
              renderSharedProductMenus(document);
              initDesktopProductsMenu();
              return loadProductCatalog();
            })
            .then(function (products) {
              applyProductBrandBadge(products || []);
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
            loadScript(mobileScriptUrl);

            // Carga partials en paralelo para evitar latencia percibida en header/menu/carrito.
            Promise.all([
              loadPartial('site-header-slot', '/partials/site-header'),
              loadPartial('mobile-menu-slot', '/partials/mobile-menu')
            ]).catch(function () { /* silencioso */ });
          } catch (e) {
            // En caso de cualquier error, procedemos con la carga de partials
            Promise.all([
              loadPartial('site-header-slot', '/partials/site-header'),
              loadPartial('mobile-menu-slot', '/partials/mobile-menu')
            ]).catch(function () { /* silencioso */ });
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

              loadPartial('site-header-slot', '/partials/site-header');
            }
            if (menuSlot && menuSlot.children.length === 0) {

              loadPartial('mobile-menu-slot', '/partials/mobile-menu');
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
          var headEl = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
          if (!headEl) return;
          headEl.appendChild(s);
          var b = document.createElement('div');
          b.className = 'cc-banner';
          b.setAttribute('role', 'dialog');
          b.setAttribute('aria-label', 'Consentimiento de cookies');
          b.innerHTML = '<span>Usamos cookies técnicas y de terceros (Stripe, Google Maps, Google Fonts) para el funcionamiento del sitio. <a href="/legal/#cookies">Más info</a></span><button class="cc-ok" type="button">Aceptar</button><button class="cc-no" type="button">Rechazar</button>';
          var bodyEl = document.body || document.getElementsByTagName('body')[0];
          if (!bodyEl) return;
          bodyEl.appendChild(b);

          function persistCookieConsent(value) {
            try { localStorage.setItem('cc_ok', value); } catch (e) {}
            b.remove();
          }

          var okBtn = b.querySelector('.cc-ok');
          var noBtn = b.querySelector('.cc-no');
          if (okBtn) okBtn.addEventListener('click', function () { persistCookieConsent('1'); });
          if (noBtn) noBtn.addEventListener('click', function () { persistCookieConsent('0'); });
        })();
      });
    });

})();
