/* product-enhancements.js — Mejoras UX para páginas de producto */
(function () {
  'use strict';

  /* La promesa se COGE o se CREA: quien llegue primero la publica. Hace falta porque
     el orden real de carga cambia según la página —las fichas enlazan este archivo con
     una etiqueta sin `defer`, así que corre ANTES que el cargador— y dar por hecho que
     ya existe significaba arrancar sin catálogo y construir el selector vacío. */
  function ssListo() {
    if (!window.SS_READY && typeof Promise === 'function') {
      window.SS_READY = new Promise(function (res) { window.__ssResolverReady = res; });
    }
    return window.SS_READY || { then: function (fn) { fn(); } };
  }


  /* ── Solo ejecutar en páginas de producto ── */
  var gallery = document.querySelector('.gallery');
  var panel   = document.querySelector('.panel');
  if (!gallery || !panel) return;

  // La versión se lee EN CADA USO, no una vez al cargar el módulo.
  // Antes era `var ver = window.ASSET_VER || '1'` evaluado aquí: si asset-sync.js
  // aún no había asignado window.ASSET_VER —es asíncrono, o sea una carrera—
  // `ver` se quedaba en '1' para toda la sesión. Y `?v=1` es una constante que
  // NINGÚN bump invalida: la foto quedaba cacheada un año con la versión vieja.
  // Eso explicaba que la 23.webp del Armored Dual saliera antigua solo A VECES.
  // El <meta name="asset-version"> siempre está en el HTML con la versión
  // publicada, así que sirve de respaldo de verdad.
  function assetVersion() {
    if (window.ASSET_VER) return String(window.ASSET_VER).trim();
    var meta = document.querySelector('meta[name="asset-version"]');
    var fromMeta = meta ? String(meta.getAttribute('content') || '').trim() : '';
    return fromMeta || '1';
  }

  function normalizePath(path) {
    var clean = String(path || '').split('?')[0].split('#')[0];
    if (clean && clean.charAt(clean.length - 1) !== '/') clean += '/';
    return clean;
  }

  /* ── La rueda del ratón también desliza los carriles horizontales ──────────
     Un ratón normal solo manda deltaY, y el navegador NO lo traduce a movimiento
     horizontal: con el puntero sobre los colores la rueda movía la página y el
     carril se quedaba quieto. Aquí se traduce a mano.

     La página NO se bloquea: solo se consume la rueda mientras quede carril por
     recorrer. Al llegar al tope, el gesto sigue su camino y la página baja como
     siempre, que es lo que uno espera al pasar el ratón por encima de una fila
     de colores mientras lee.

     passive:false es obligatorio: sin él preventDefault() no tiene efecto y se
     movería el carril Y la página a la vez. */
  function conectarRuedaHorizontal(carril) {
    if (!carril || carril.dataset.ruedaBound === 'true') return;
    carril.dataset.ruedaBound = 'true';
    carril.addEventListener('wheel', function (ev) {
      var max = carril.scrollWidth - carril.clientWidth;
      if (max <= 1) return;                     // cabe todo: no hay nada que deslizar

      // deltaMode: 0 píxeles, 1 líneas (ruedas de muescas), 2 páginas.
      var unidad = ev.deltaMode === 1 ? 16 : (ev.deltaMode === 2 ? carril.clientWidth : 1);
      var dx = ev.deltaX * unidad;
      var dy = ev.deltaY * unidad;
      // Trackpads y ruedas inclinables mandan deltaX; el ratón de siempre, deltaY.
      var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!delta) return;

      var antes = carril.scrollLeft;
      var destino = Math.max(0, Math.min(max, antes + delta));
      if (destino === antes) return;            // en el tope: que siga la página
      carril.scrollLeft = destino;
      ev.preventDefault();
    }, { passive: false });
  }

  function getCurrentProduct() {
    var products = window.SCOOTSHOP_PRODUCTS;
    if (!Array.isArray(products) || !products.length) return null;

    var currentPath = window.location.pathname || '';
    if (currentPath && currentPath.charAt(currentPath.length - 1) !== '/') currentPath += '/';
    currentPath = normalizePath(currentPath);

    for (var i = 0; i < products.length; i++) {
      var productPath = normalizePath(products[i].href || '');
      if (productPath === currentPath) return products[i];
    }

    return null;
  }

  /* Devuelve la URL TAL CUAL. Antes le colgaba '?v=' + versión, y desde que las fotos
     dejaron de versionarse eso fabricaba una segunda URL para el MISMO archivo: el
     HTML y el catálogo dicen /img/1.webp y esto pedía /img/1.webp?v=…-14, así que el
     navegador se bajaba la foto dos veces y la galería parpadeaba al cambiar de color.
     Se conserva la función —y no se borran las llamadas— porque es el sitio donde
     explicar por qué las imágenes NO llevan versión. */
  function withVersion(src) {
    return src || '';
  }

  function getThumbItems() {
    var thumbButtons = gallery.querySelectorAll('.thumb');
    var items = [];

    for (var i = 0; i < thumbButtons.length; i++) {
      var thumb = thumbButtons[i];
      var thumbImg = thumb.querySelector('img');
      var src = thumb.getAttribute('data-img') || (thumbImg ? (thumbImg.getAttribute('src') || '') : '');
      if (!src) continue;
      items.push({
        index: i + 1,
        src: src,
        alt: thumbImg ? (thumbImg.getAttribute('alt') || '') : '',
        thumbSrc: thumbImg ? (thumbImg.getAttribute('src') || '') : ''
      });
    }

    return items;
  }

  function tuneGalleryThumbPriority() {
    var thumbImages = gallery.querySelectorAll('.thumb img');
    for (var i = 0; i < thumbImages.length; i++) {
      thumbImages[i].setAttribute('loading', 'lazy');
      thumbImages[i].setAttribute('decoding', 'async');
      thumbImages[i].setAttribute('fetchpriority', 'low');
    }
  }

  /* Prefetch en segundo plano de las imágenes completas (data-img) durante el
     tiempo de inactividad. Las miniaturas usan una versión pequeña (img/thumbs/),
     así que al pulsar una miniatura la versión completa debe estar ya cacheada
     para que el cambio sea instantáneo. No bloquea la carga inicial. */
  function prefetchFullGalleryImages() {
    var thumbs = gallery.querySelectorAll('.thumb[data-img]');
    var sources = [];
    var seen = {};
    for (var i = 0; i < thumbs.length; i++) {
      var src = thumbs[i].getAttribute('data-img');
      if (!src || seen[src]) continue;
      seen[src] = true;
      /* La URL va TAL CUAL. Añadirle '?v=' era contraproducente justo aquí: esto
         precalienta la caché para que pulsar una miniatura sea instantáneo, y al
         pedirla con una query que la foto del DOM no lleva, lo que se calentaba era
         una URL que nadie iba a usar — descarga duplicada y ni un pulsado más rápido. */
      sources.push(src);
    }
    if (!sources.length) return;

    // Precarga ACOTADA. Antes se traia la galeria entera en segundo plano: en la
    // ficha del M41 Armored son 23 fotos a tamano completo, medido en 2,73 MB
    // por visita en movil, para unas fotos que la mayoria de clientes no llega a
    // abrir. Adelantamos solo las primeras —que son las que se pulsan— y el
    // resto se descarga al pulsarlas, que es cuando hacen falta.
    var PRELOAD_MAX = 4;

    // Respeta el ahorro de datos y las redes muy lentas. Es la API estandar
    // (navigator.connection), no deteccion por user agent.
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData) return;
      if (/^(slow-)?2g$/.test(String(conn.effectiveType || ''))) return;
    }

    sources = sources.slice(0, PRELOAD_MAX);

    var index = 0;
    function loadNext() {
      if (index >= sources.length) return;
      var img = new Image();
      img.decoding = 'async';
      img.onload = img.onerror = function () { schedule(); };
      img.src = sources[index++];
    }
    function schedule() {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(loadNext, { timeout: 1500 });
      } else {
        window.setTimeout(loadNext, 200);
      }
    }
    schedule();
  }

  function updateCheckoutLinksColorParams(colorKey, colorLabel, variantImage) {
    var link = panel.querySelector('.btn-main');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;

    try {
      var parsed = new URL(href, window.location.origin);
      parsed.searchParams.set('color', colorKey || 'default');
      parsed.searchParams.set('colorLabel', colorLabel || '');
      if (variantImage) parsed.searchParams.set('image', variantImage);

      var nextHref = /^https?:\/\//i.test(href)
        ? parsed.toString()
        : (parsed.pathname + parsed.search + parsed.hash);

      link.setAttribute('href', nextHref);
    } catch (_) {
      var base = href.split('&color=')[0].split('&colorLabel=')[0];
      var fallbackHref = base + '&color=' + encodeURIComponent(colorKey || 'default') + '&colorLabel=' + encodeURIComponent(colorLabel || '');
      if (variantImage) fallbackHref += '&image=' + encodeURIComponent(variantImage);
      link.setAttribute('href', fallbackHref);
    }
  }

  function ensureDefaultColorFromDom() {
    var selector = panel.querySelector('.variant-axis');
    if (!selector) return;

    var activeButton = selector.querySelector('.variant-option.is-active:not([disabled]):not([aria-disabled="true"])');
    if (!activeButton) {
      var allButtons = selector.querySelectorAll('.variant-option');
      for (var i = 0; i < allButtons.length; i++) {
        if (!allButtons[i].disabled && allButtons[i].getAttribute('aria-disabled') !== 'true') {
          activeButton = allButtons[i];
          break;
        }
      }
    }
    if (!activeButton) return;

    var activeLabelNode = selector.querySelector('[data-active-color-label]');
    var label =
      (activeButton.getAttribute('aria-label') || '').trim() ||
      (activeButton.getAttribute('title') || '').trim() ||
      (activeLabelNode ? String(activeLabelNode.textContent || '').trim() : '') ||
      /* Último recurso leyendo el DOM: el rótulo del eje que la propia sección
         declara. "Color" a pelo era la suposición de siempre. */
      (function () {
        var et = selector.querySelector('.variant-axis-label');
        return et ? String(et.textContent || '').replace(/:\s*$/, '').trim() : '';
      })();

    var key = (activeButton.getAttribute('data-color-key') || '').trim() || label || 'default';
    var mainImage = gallery.querySelector('#mainImage');
    var variantImage = mainImage ? (mainImage.getAttribute('src') || '') : '';

    updateCheckoutLinksColorParams(key, label, variantImage);
  }

  tuneGalleryThumbPriority();

  if (window.addEventListener) {
    if (document.readyState === 'complete') {
      prefetchFullGalleryImages();
    } else {
      window.addEventListener('load', prefetchFullGalleryImages, { once: true });
    }
  }

  function normalizeText(value) {
    var text = String(value || '').toLowerCase();
    try {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (_) {}
    return text.replace(/\s+/g, ' ').trim();
  }

  function uniqueList(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var item = String(items[i] || '').trim();
      if (!item) continue;
      if (out.indexOf(item) === -1) out.push(item);
    }
    return out;
  }

  function joinNatural(items) {
    var clean = uniqueList(items || []);
    if (!clean.length) return '';
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return clean[0] + ' y ' + clean[1];
    return clean.slice(0, clean.length - 1).join(', ') + ' y ' + clean[clean.length - 1];
  }

  function collectSpecData() {
    var map = {};
    var pairs = [];
    var rows = panel.querySelectorAll('.spec-row');

    for (var i = 0; i < rows.length; i++) {
      var labelNode = rows[i].querySelector('.spec-label');
      var valueNode = rows[i].querySelector('.spec-value');
      if (!labelNode || !valueNode) continue;

      var label = String(labelNode.textContent || '').trim();
      var value = String(valueNode.textContent || '').trim();
      if (!label || !value) continue;

      var key = normalizeText(label);
      if (!map[key]) map[key] = value;
      pairs.push({ key: key, label: label, value: value });
    }

    return { map: map, pairs: pairs };
  }

  function findSpecValue(specData, aliases) {
    var aliasList = Array.isArray(aliases) ? aliases : [];
    for (var i = 0; i < specData.pairs.length; i++) {
      var key = specData.pairs[i].key;
      for (var j = 0; j < aliasList.length; j++) {
        if (key.indexOf(normalizeText(aliasList[j])) !== -1) {
          return specData.pairs[i].value;
        }
      }
    }
    return '';
  }

  /* ─────────────────────────────────────────────────────────────
     SINCRONIZACIÓN DE METADATOS (fuente única = ficha técnica visible)
     Regenera el additionalProperty del JSON-LD y las descripciones
     og/twitter a partir de la ficha técnica visible (.spec-row). Así,
     al editar la ficha, los metadatos estructurados y sociales se
     actualizan solos y nunca se desincronizan. La versión estática del
     HTML sigue siendo el respaldo que leen los rastreadores sin JS.
     ───────────────────────────────────────────────────────────── */
  (function syncMetadataFromSpecs() {
    try {
      var specData = collectSpecData();
      if (!specData.pairs.length) return;

      // Etiquetas que no son "propiedades técnicas" del producto
      var skip = { modelo: 1, serie: 1, estado: 1, precio: 1, homologacion: 1, garantia: 1 };

      var titleEl = document.querySelector('.page-title h1, .title-left h1');
      var productName = titleEl ? String(titleEl.textContent || '').trim() : '';
      var fullText = normalizeText(specData.pairs.map(function (p) { return p.label + ' ' + p.value; }).join(' '));
      var isDgt = fullText.indexOf('dgt') !== -1 || fullText.indexOf('homologado') !== -1;

      // 1) JSON-LD: regenerar additionalProperty del nodo Product
      var ldNodes = document.querySelectorAll('script[type="application/ld+json"]');
      for (var n = 0; n < ldNodes.length; n++) {
        var data;
        try { data = JSON.parse(ldNodes[n].textContent || '{}'); } catch (_) { continue; }

        var graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        var changed = false;

        for (var g = 0; g < graph.length; g++) {
          var node = graph[g];
          var type = node && node['@type'];
          var isProduct = type === 'Product' || (Array.isArray(type) && type.indexOf('Product') !== -1);
          if (!isProduct) continue;

          var props = [];
          for (var i = 0; i < specData.pairs.length; i++) {
            if (skip[specData.pairs[i].key]) continue;
            props.push({ '@type': 'PropertyValue', name: specData.pairs[i].label, value: specData.pairs[i].value });
          }
          if (props.length) { node.additionalProperty = props; changed = true; }
        }

        if (changed) ldNodes[n].textContent = JSON.stringify(data['@graph'] ? data : graph[0], null, 2);
      }

      // 2) og/twitter: regenerar descripción desde specs clave
      var motor = findSpecValue(specData, ['motor', 'potencia']);
      var battery = findSpecValue(specData, ['bateria']);
      var speed = findSpecValue(specData, ['velocidad']);
      var autonomy = findSpecValue(specData, ['autonomia']);
      var brakes = findSpecValue(specData, ['frenos']);
      var wheels = findSpecValue(specData, ['ruedas']);

      var bits = [];
      if (motor) bits.push('motor ' + motor);
      if (battery) bits.push('batería ' + battery);
      if (speed) bits.push('velocidad máxima ' + speed);
      if (autonomy) bits.push('autonomía ' + autonomy);
      if (brakes) bits.push('frenos ' + brakes);
      if (wheels) bits.push('ruedas ' + wheels);

      if (productName && bits.length >= 2) {
        var lead = productName + (isDgt ? ' homologado por la DGT' : '') + ', con ';
        var description = lead + joinNatural(bits) + '.';
        var setMeta = function (selector, value) {
          var el = document.head && document.head.querySelector(selector);
          if (el) el.setAttribute('content', value);
        };
        setMeta('meta[property="og:description"]', description);
        setMeta('meta[name="twitter:description"]', description);
      }
    } catch (_) { /* ante cualquier fallo, se conservan los metadatos estáticos */ }
  })();

  function toIndexList(variant, total) {
    var indexes = [];
    var source = null;

    if (Array.isArray(variant.images) && variant.images.length) {
      source = variant.images;
      for (var i = 0; i < source.length; i++) {
        var value = source[i];
        if (typeof value === 'number') {
          if (value >= 1 && value <= total) indexes.push(value);
        } else if (typeof value === 'string' && /^\d+$/.test(value)) {
          var parsed = parseInt(value, 10);
          if (parsed >= 1 && parsed <= total) indexes.push(parsed);
        }
      }
      return indexes;
    }

    var start = null;
    var end = null;
    if (Array.isArray(variant.range) && variant.range.length >= 2) {
      start = parseInt(variant.range[0], 10);
      end = parseInt(variant.range[1], 10);
    } else if (variant.from !== undefined || variant.to !== undefined) {
      start = parseInt(variant.from, 10);
      end = parseInt(variant.to, 10);
    } else if (variant.start !== undefined || variant.end !== undefined) {
      start = parseInt(variant.start, 10);
      end = parseInt(variant.end, 10);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end)) return indexes;
    if (start > end) { var swap = start; start = end; end = swap; }
    for (var j = start; j <= end; j++) {
      if (j >= 1 && j <= total) indexes.push(j);
    }
    return indexes;
  }

  /* Selector de variantes de la ficha. El eje —qué es, cómo se llama y cómo se
     representa— sale del NÚCLEO (js/product-attributes.js), no de `colorVariants` ni
     de las clases del HTML. Antes esta función se llamaba createColorVariantSelector,
     leía `product.colorVariants` y escribía "COLOR:" a fuego: por eso el G2 PRO tenía
     que disfrazar su eje de modelo con una clase extra puesta a mano en su ficha. */
  function createVariantSelector(product) {
    var ejes = (window.SS_ATTRS ? window.SS_ATTRS.ejes(product) : []);
    if (!ejes.length) return;

    /* QUÉ EJE PINTA ESTA FUNCIÓN.
       El contenedor `.variant-axis` es el de los círculos. En un producto de varios
       ejes (los manillares: medida + color, o modelo + medida) el primero del catálogo
       NO tiene por qué ser el color, y escribir ahí el eje equivocado rotulaba los
       círculos con "720 mm". Así que se empareja por contenedor: si existe un eje de
       tipo swatch, es el suyo; si no, el primero. Las secciones `.variant-axis` de
       esas fichas las gobierna su propio script inline hasta la etapa 4. */
    var eje = null;
    for (var ie = 0; ie < ejes.length; ie++) {
      if (ejes[ie].type === 'swatch') { eje = ejes[ie]; break; }
    }
    /* SIN EJE DE CÍRCULOS. Un manillar de modelo+medida no tiene ninguno: sus dos ejes
       viven en secciones `.variant-axis`. Antes aquí se abandonaba —los pintaba el
       script inline de la ficha—; ahora se marcan como "todos secundarios" y los pinta
       el mismo controlador genérico de más abajo. Si la ficha no trae ninguna sección
       donde pintarlos, se usa el primer eje como principal, como siempre. */
    var soloSecundarios = false;
    if (!eje) {
      soloSecundarios = !!panel.querySelector('.variant-axis');
      eje = ejes[0];
    }
    var variants = eje.options;
    if (!variants.length) return;

    var panelInner = panel.querySelector('.panel-inner');
    var ctaCol = panel.querySelector('.cta-col');
    if (!panelInner || !ctaCol) return;

    var galleryMain = gallery.querySelector('.gallery-main');
    var mainImage = gallery.querySelector('#mainImage');
    var thumbsWrap = gallery.querySelector('.thumbs');
    if (!galleryMain || !mainImage || !thumbsWrap) return;

    var originalItems = getThumbItems();
    if (!originalItems.length) return;

    // Reutilizar markup estático si ya existe en el DOM (evita inserción dinámica que causa CLS)
    /* La sección de este eje: las secciones del HTML se emparejan EN ORDEN con los
       ejes del catálogo, así que la del eje principal es la que ocupa su posición.
       Coger "la primera" fallaba en una ficha de dos ejes cuyo primer eje no es el de
       círculos: el selector de color se montaba encima de la medida. */
    var indicePrincipal = 0;
    for (var ip = 0; ip < ejes.length; ip++) if (ejes[ip].key === eje.key) indicePrincipal = ip;
    var seccionesFicha = panelInner.querySelectorAll('.variant-axis');
    var existingSelector = soloSecundarios ? null : (seccionesFicha[indicePrincipal] || seccionesFicha[0] || null);
    var selector;
    var isStaticMarkup = false;

    if (existingSelector) {
      selector = existingSelector;
      isStaticMarkup = true;
    } else {
      selector = document.createElement('section');
      selector.className = 'variant-axis';
      selector.setAttribute('aria-label', eje.label + ': opciones disponibles');
    }

    var header, activeColorLabel, grid;

    if (isStaticMarkup) {
      header = selector.querySelector('.variant-axis-head');
      activeColorLabel = selector.querySelector('[data-active-color-label]');
      grid = selector.querySelector('.variant-axis-grid');
      /* El rótulo lo manda el CATÁLOGO, también sobre markup estático. Así una ficha
         no puede volver a decir "MODELOS:" mientras su dato dice otra cosa —que es
         justo la contradicción que hacía que el Home y la ficha no coincidieran. */
      var etiquetaEstatica = selector.querySelector('.variant-axis-label');
      if (etiquetaEstatica) etiquetaEstatica.textContent = eje.label.toUpperCase() + ':';
      selector.setAttribute('aria-label', eje.label + ': opciones disponibles');
    } else {
      var dynBox = document.createElement('div');
      dynBox.className = 'variant-axis-box';
      header = document.createElement('div');
      header.className = 'variant-axis-head';
      header.innerHTML =
        '<span class="variant-axis-label">' + eje.label.toUpperCase() + ':</span>' +
        '<span class="variant-axis-value" data-active-color-label></span>';
      dynBox.appendChild(header);
      activeColorLabel = header.querySelector('[data-active-color-label]');
      grid = document.createElement('div');
      grid.className = 'variant-axis-grid';
      dynBox.appendChild(grid);
      selector.appendChild(dynBox);
    }

    var buttons = [];

    function normalizeText(value) {
      var text = String(value || '').toLowerCase();
      try {
        text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (_) {}
      return text.trim();
    }

    function findNamedColors(text) {
      var normalized = normalizeText(text);
      if (!normalized) return [];

      var combos = [
        { pattern: /(rojo\s*\/\s*negro|rojo\s+y\s+negro|red\s*\/\s*black|red\s+and\s+black|redblack|rojonegro)/, colors: ['#dc2626', '#111111'] },
        { pattern: /(azul\s*\/\s*negro|azul\s+y\s+negro|blue\s*\/\s*black|blue\s+and\s+black|bluenegro|azulnegro)/, colors: ['#2563eb', '#111111'] },
        { pattern: /(blanco\s*\/\s*negro|white\s*\/\s*black|blanconegro)/, colors: ['#f8fafc', '#111111'] }
      ];

      for (var c = 0; c < combos.length; c++) {
        if (combos[c].pattern.test(normalized)) return combos[c].colors.slice();
      }

      var map = [
        { token: 'negro', color: '#111111' },
        { token: 'black', color: '#111111' },
        { token: 'rojo', color: '#dc2626' },
        { token: 'red', color: '#dc2626' },
        { token: 'azul', color: '#2563eb' },
        { token: 'blue', color: '#2563eb' },
        { token: 'verde', color: '#22c55e' },
        { token: 'green', color: '#22c55e' },
        { token: 'fluor', color: '#d9ff43' },
        { token: 'amarillo', color: '#eab308' },
        { token: 'yellow', color: '#eab308' },
        { token: 'blanco', color: '#f8fafc' },
        { token: 'white', color: '#f8fafc' },
        { token: 'gris', color: '#64748b' },
        { token: 'gray', color: '#64748b' },
        { token: 'silver', color: '#94a3b8' },
        { token: 'naranja', color: '#f97316' },
        { token: 'orange', color: '#f97316' },
        { token: 'morado', color: '#7c3aed' },
        { token: 'purple', color: '#7c3aed' }
      ];

      var parts = normalized.split(/\s*\/\s*|\s*,\s*|\s+\+\s+|\s+y\s+|\s+and\s+/);
      var found = [];
      for (var p = 0; p < parts.length; p++) {
        var part = parts[p];
        for (var m = 0; m < map.length; m++) {
          if (part.indexOf(map[m].token) !== -1) {
            if (found.indexOf(map[m].color) === -1) found.push(map[m].color);
            break;
          }
        }
      }
      return found;
    }

    function parseDirectAccentColors(value) {
      var raw = String(value || '').trim();
      if (!raw) return [];
      if (/^linear-gradient\(/i.test(raw)) return [raw];

      var hexMatches = raw.match(/#[0-9a-fA-F]{3,8}/g);
      if (hexMatches && hexMatches.length) return hexMatches;

      if (raw.indexOf('/') !== -1 || raw.indexOf(',') !== -1 || /\s+and\s+|\s+y\s+/i.test(raw)) {
        var named = findNamedColors(raw);
        if (named.length) return named;
      }

      return [raw];
    }

    // Croma (vivacidad) de un hex: 0 para grises/blancos/negros, alto para colores saturados.
    function hexChroma(hex) {
      var h = String(hex || '').trim().replace(/^#/, '');
      if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length < 6) return -1;
      var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return -1;
      return Math.max(r, g, b) - Math.min(r, g, b);
    }

    // De una lista de hex devuelve el más vivo (mayor croma). Para swatches bicolor
    // (p. ej. "gris y amarillo") elige el color distintivo (amarillo), no el gris.
    function pickVividHex(hexes) {
      if (!Array.isArray(hexes) || !hexes.length) return '';
      var best = hexes[0], bestChroma = hexChroma(hexes[0]);
      for (var i = 1; i < hexes.length; i++) {
        var c = hexChroma(hexes[i]);
        if (c > bestChroma) { best = hexes[i]; bestChroma = c; }
      }
      return best;
    }

    function collectHexes(value) {
      return String(value || '').match(/#[0-9a-fA-F]{3,8}/g) || [];
    }

    // Saca el par [izquierda, derecha] EN EL ORDEN del swatch, para que la línea sea
    // bicolor igual que el círculo de color.
    function accentPair(colors) {
      var hexes = [];
      colors.forEach(function (c) { hexes = hexes.concat(collectHexes(c)); });
      if (hexes.length >= 2) return { a: hexes[0], b: hexes[hexes.length - 1] };
      if (hexes.length === 1) return { a: hexes[0], b: hexes[0] };
      if (colors.length >= 2) return { a: String(colors[0]).trim(), b: String(colors[colors.length - 1]).trim() };
      if (colors.length === 1) return { a: String(colors[0]).trim(), b: String(colors[0]).trim() };
      return null;
    }

    function finalizeAccent(pair) {
      if (!pair || (!pair.a && !pair.b)) return null;
      var vivid = pickVividHex([pair.a, pair.b].filter(function (x) { return /^#/.test(x); })) || pair.b || pair.a;
      return { a: pair.a, b: pair.b, accent: vivid };
    }

    // La línea de acento es BICOLOR cuando el swatch lo es: dos mitades de color sólido
    // (izquierda = primer color, derecha = segundo) pintadas en .price-row::before / ::after.
    // Cada mitad transiciona suave (CSS interpola background-color, pero NO gradientes). Para
    // swatch de un color, ambas mitades son iguales y se ve una sola línea. Regla general.
    function resolveVariantAccent(variant, button) {
      var directGradient = variant && (variant.accentGradient || variant.lineGradient || variant.accentLineGradient);
      if (directGradient) {
        var pg = finalizeAccent(accentPair([String(directGradient)]));
        if (pg) return pg;
      }

      var explicitArray = variant && (variant.accentColors || variant.lineColors || variant.accentLineColors);
      if (Array.isArray(explicitArray) && explicitArray.length) {
        var filtered = explicitArray.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
        if (filtered.length) {
          var pe = finalizeAccent(accentPair(filtered));
          if (pe) return pe;
        }
      }

      var directValue = variant && (variant.accentLine || variant.accent || variant.swatch || variant.color || variant.hex);
      var directColors = parseDirectAccentColors(directValue);
      if (directColors.length) {
        var pd = finalizeAccent(accentPair(directColors));
        if (pd) return pd;
      }

      var labelColors = findNamedColors((variant && (variant.label || variant.name || variant.key)) || '');
      if (labelColors.length) {
        var pl = finalizeAccent(accentPair(labelColors));
        if (pl) return pl;
      }

      if (button && window.getComputedStyle) {
        var swatchVar = getComputedStyle(button).getPropertyValue('--variant-swatch');
        var fallback = swatchVar && String(swatchVar).trim();
        if (fallback) {
          var pf = finalizeAccent(accentPair([fallback]));
          if (pf) return pf;
        }
        var buttonBg = getComputedStyle(button).backgroundColor;
        if (buttonBg && buttonBg !== 'rgba(0, 0, 0, 0)' && buttonBg !== 'transparent') {
          return { a: buttonBg, b: buttonBg, accent: buttonBg };
        }
      }

      return { a: '', b: '', accent: '' };
    }

    function applySeriesAccentForVariant(variant, button) {
      var resolved = resolveVariantAccent(variant, button);
      if (!resolved.a && !resolved.b && !resolved.accent) return;
      if (resolved.accent) panel.style.setProperty('--series-accent', resolved.accent);
      panel.style.setProperty('--series-accent-a', resolved.a || resolved.accent || '');
      panel.style.setProperty('--series-accent-b', resolved.b || resolved.a || resolved.accent || '');
    }

    // Cambio de foto al elegir color: entra fundiéndose y escalando desde un
    // 103,5 %, igual que la previsualización de las tarjetas del home. Se pinta
    // en una capa encima y, al terminar, la imagen real toma el relevo ya
    // cargada; así el <img> principal nunca parpadea.
    var VARIANT_FADE_MS = 190;
    var variantFadeTimer = 0;

    // La duración real la manda el CSS (190 ms en escritorio, 420 ms en móvil,
    // 0 si el sistema pide reducir movimiento). Leerla de ahí evita que el
    // relevo de la imagen se descuadre respecto a la transición: si el JS
    // cambiara la foto antes de tiempo, se vería un corte a mitad del fundido.
    function variantFadeMs(layer) {
      try {
        var ms = parseFloat(getComputedStyle(layer).transitionDuration) * 1000;
        if (isFinite(ms) && ms >= 0) return ms;
      } catch (_) {}
      return VARIANT_FADE_MS;
    }

    // Mientras el <img> tenga srcset, el navegador elige de ahi e IGNORA el src:
    // cambiar solo .src NO cambiaria la foto. El srcset inicial describe la
    // portada del producto; en cuanto se navega a otra vista deja de aplicar.
    function setMainImageSrc(src, alt) {
      if (!mainImage || !src) return;
      // Al arrancar, el render de la variante por defecto pide EXACTAMENTE la
      // foto que ya esta puesta. Si no salieramos aqui, tirariamos el srcset
      // responsive del HTML y forzariamos una segunda descarga del original
      // en todas las fichas con selector de color.
      // Comparamos SIN la query: el sufijo ?v= lo reescriben en caliente
      // global-assets-app.js y asset-sync.js, asi que las cadenas completas casi
      // nunca coinciden aunque sea la misma foto.
      var samePath = function (a) { return String(a || '').split('?')[0]; };
      var current = mainImage.getAttribute('src') || '';
      if (samePath(current) === samePath(src)) {
        if (alt) mainImage.alt = alt;
        return;
      }
      mainImage.removeAttribute('srcset');
      mainImage.removeAttribute('sizes');
      mainImage.src = src;
      if (alt) mainImage.alt = alt;
    }

    function swapMainImageAnimated(src, alt) {
      var wrap = mainImage && mainImage.parentElement;
      if (!wrap || !src) {
        if (mainImage && src) { setMainImageSrc(src, alt); }
        return;
      }
      var layer = wrap.querySelector('[data-variant-fade]');
      if (!layer) {
        layer = document.createElement('img');
        layer.className = 'gallery-variant-fade';
        layer.setAttribute('data-variant-fade', '');
        layer.setAttribute('alt', '');
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('decoding', 'async');
        wrap.appendChild(layer);
      }

      // La capa debe ocupar EXACTAMENTE el mismo recuadro que la foto real. No
      // vale con inset:0: .gallery-main tiene padding (24px, 16px en móvil) y en
      // escritorio la foto va limitada al 80%, así que una capa a inset:0 sale
      // más grande y el patinete "encogía" de golpe al terminar el fundido.
      // Medimos el rectángulo real y lo copiamos en píxeles: así da igual el
      // breakpoint, el padding o el límite de anchura.
      function pinToMainImage() {
        var wrapRect = wrap.getBoundingClientRect();
        var imgRect = mainImage.getBoundingClientRect();
        if (!imgRect.width || !imgRect.height) return false;
        layer.style.left = (imgRect.left - wrapRect.left) + 'px';
        layer.style.top = (imgRect.top - wrapRect.top) + 'px';
        layer.style.width = imgRect.width + 'px';
        layer.style.height = imgRect.height + 'px';
        return true;
      }

      var launched = false;
      var run = function () {
        if (launched) return;
        launched = true;
        if (!pinToMainImage()) {
          setMainImageSrc(src, alt);
          return;
        }
        // Doble rAF: el navegador debe registrar el estado inicial (opacidad 0
        // y escala ampliada) antes de animar; si no, el cambio sería seco.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            layer.classList.add('is-on');
            variantFadeTimer = window.setTimeout(function () {
              variantFadeTimer = 0;
              setMainImageSrc(src, alt);
              // Ocultar la capa sin transición: debajo ya está la misma foto,
              // así que un segundo fundido solo añadiría un fantasma.
              layer.style.transition = 'none';
              layer.classList.remove('is-on');
              void layer.offsetWidth;
              layer.style.transition = '';
            }, variantFadeMs(layer));
          });
        });
      };

      // Si el cliente cambia de color a media animación, el temporizador antiguo
      // dejaría la foto del color anterior. Lo cancelamos antes de empezar.
      if (variantFadeTimer) { window.clearTimeout(variantFadeTimer); variantFadeTimer = 0; }
      layer.style.transition = 'none';
      layer.classList.remove('is-on');
      void layer.offsetWidth;
      layer.style.transition = '';
      layer.onload = run;
      layer.src = src;
      if (layer.complete) run();
    }

    /* `options.indices` permite pintar la galería de una COMBINACIÓN y no solo de una
       opción: en un manillar la foto depende del acabado Y de la medida (`imagesBy`).
       Antes esto no existía, y el script de cada ficha lo resolvía reescribiendo a mano
       `variant.images` del catálogo vivo antes de llamar aquí. */
    function renderGalleryForVariant(variant, options) {
      var allowThumbScroll = !options || options.scrollThumb !== false;
      var animate = !options || options.animate !== false;
      var indexes = (options && Array.isArray(options.indices) && options.indices.length)
        ? options.indices.filter(function (n) { return n >= 1 && n <= originalItems.length; })
        : toIndexList(variant, originalItems.length);
      var selectedItems = indexes.length
        ? indexes.map(function (index) { return originalItems[index - 1]; }).filter(Boolean)
        : [];

      if (!selectedItems.length) return;

      if (animate) {
        swapMainImageAnimated(withVersion(selectedItems[0].src), selectedItems[0].alt);
      } else {
        setMainImageSrc(withVersion(selectedItems[0].src), selectedItems[0].alt);
      }

      if (activeColorLabel) {
        // Sin etiqueta en la opción, el respaldo es el nombre del EJE del catálogo.
        // Poner "Color" aquí era la vieja suposición: en una ficha de modelo, el
        // valor activo se anunciaba como un color.
        activeColorLabel.textContent = variant.label || variant.name || (eje && eje.label) || '';
      }

      applyVariantContent(variant);

      var activeButton = selector.querySelector('.variant-option.is-active');
      applySeriesAccentForVariant(variant, activeButton);

      // data-img se versiona EN CALIENTE (global-assets-app.js y asset-sync.js le
      // añaden ?v=...), pero originalItems se leyó al arrancar, antes de esa
      // pasada. Comparar las cadenas tal cual no coincidía nunca: al cambiar de
      // color no se marcaba ninguna miniatura y, de paso, el centrado de abajo
      // no llegaba a ejecutarse. Se comparan las rutas sin la query.
      var sinVersion = function (value) { return String(value || '').split('?')[0]; };
      var objetivo = sinVersion(selectedItems[0].src);
      var thumbButtons = thumbsWrap.querySelectorAll('.thumb');
      var activeThumb = null;
      for (var i = 0; i < thumbButtons.length; i++) {
        var thumbButton = thumbButtons[i];
        var isActive = sinVersion(thumbButton.getAttribute('data-img')) === objetivo;
        if (isActive) activeThumb = thumbButton;
        thumbButton.classList.toggle('active', isActive);
      }

      if (allowThumbScroll && activeThumb && thumbsWrap.scrollTo) {
        // No se usa scrollIntoView: arrastra también la PÁGINA cuando la tira de
        // miniaturas queda fuera de pantalla —en móvil ocurre al bajar hasta el
        // selector de color— y ese salto vertical molesta más de lo que aporta
        // centrar la miniatura. Desplazando el contenedor, la página no se mueve.
        // Se piden los dos ejes porque las miniaturas son horizontales en móvil
        // y verticales en escritorio; el eje que no puede desplazarse se ignora.
        var tRect = activeThumb.getBoundingClientRect();
        var wRect = thumbsWrap.getBoundingClientRect();
        thumbsWrap.scrollTo({
          left: thumbsWrap.scrollLeft + (tRect.left - wRect.left) - (wRect.width - tRect.width) / 2,
          top: thumbsWrap.scrollTop + (tRect.top - wRect.top) - (wRect.height - tRect.height) / 2,
          behavior: 'smooth'
        });
      }
    }

    /* La foto principal de una opción la resuelve el NÚCLEO, con la misma convención
       que usa la burbuja: identificadores explícitos, `imagesBy` para las fotos por
       combinación y la galería del producto para traducir un índice en ruta. Aquí
       había una copia que resolvía solo por índice y no entendía `imagesBy`. */
    function getVariantPrimaryImage(variant) {
      if (window.SS_ATTRS && typeof window.SS_ATTRS.fotoDe === 'function' && eje) {
        var seleccion = {};
        seleccion[eje.key] = variant;
        var url = window.SS_ATTRS.fotoDe(product, seleccion);
        if (url) return url;
      }
      var indexes = toIndexList(variant, originalItems.length);
      var primaryIndex = indexes.length ? indexes[0] : 1;
      var item = originalItems[primaryIndex - 1] || originalItems[0];
      return item && item.src ? item.src : '';
    }

    // Algunas variantes no cambian solo la foto sino la CONFIGURACIÓN del producto
    // (p. ej. KUKIRIN G2 PRO: VMP homologado por la DGT vs Normal deslimitado). Si
    // la variante trae `desc`, se reescribe la descripción; si trae `dgt` booleano,
    // se muestra u oculta el badge de la DGT. En la carga inicial la variante por
    // defecto coincide con el HTML estático, así que reasignar el mismo texto no
    // provoca salto (mismo alto renderizado).
    function applyVariantContent(variant) {
      if (!variant) return;

      if (typeof variant.desc === 'string' && variant.desc) {
        var descEl = panel.querySelector('.desc');
        if (descEl && descEl.innerHTML !== variant.desc) {
          descEl.innerHTML = variant.desc;
        }
      }

      if (typeof variant.dgt === 'boolean') {
        var badge = panel.querySelector('.price-row .dgt-badge');
        if (badge) {
          var target = (badge.closest && badge.closest('.dgt-tooltip')) || badge;
          target.style.display = variant.dgt ? '' : 'none';
        }
      }

      /* PRECIO Y REFERENCIA POR OPCIÓN. Una variante no siempre cambia solo la foto:
         puede ser otra configuración con otro precio y otra referencia (una versión
         Plus, una medida más larga). El catálogo ya podía declararlo —el núcleo
         normaliza `sku` y `priceText` en cada opción— pero nadie los leía, así que
         declararlo no servía de nada. Se leen aquí, en el mismo sitio que la
         descripción y el sello, y de aquí salen el precio visible, el botón de
         carrito y el enlace de compra. Si la opción no los declara, no se toca nada:
         los productos de hoy se comportan exactamente igual. */
      var precioEl = panel.querySelector('.price-now');
      if (precioEl && variant.priceText && precioEl.textContent.trim() !== variant.priceText) {
        precioEl.textContent = variant.priceText;
      }

      if (variant.sku) {
        var btnCarrito = panel.querySelector('[data-product-cart-btn="true"]');
        if (btnCarrito) {
          btnCarrito.setAttribute('data-sku', variant.sku);
          if (variant.priceText) btnCarrito.setAttribute('data-price', variant.priceText);
        }
        var comprar = panel.querySelector('.btn-main');
        if (comprar && comprar.getAttribute('href')) {
          try {
            var u = new URL(comprar.getAttribute('href'), window.location.origin);
            u.searchParams.set('sku', variant.sku);
            if (variant.priceText) {
              var num = String(variant.priceText).replace(/[^\d.,]/g, '').replace(',', '.');
              if (num) u.searchParams.set('price', num);
            }
            comprar.setAttribute('href', u.pathname + u.search + u.hash);
          } catch (_) {}
        }
      }
    }

    /* ── Regla global de los swatches bicolor ────────────────────────────────
       Un color partido SIEMPRE se enseña con el corte en DIAGONAL. Los patinetes
       venían de 90deg (línea vertical) y los manillares se hicieron a 135deg, así
       que el mismo concepto se veía de dos formas según la sección.

       Se normaliza aquí, y no solo en el catálogo, para que la regla aguante:
       da igual que el 90deg venga de products.js o escrito a mano en el HTML de
       una ficha, sale diagonal igual. Solo se toca el ángulo; las paradas de
       color se respetan tal cual. */
    function swatchDiagonal(valor) {
      var v = String(valor || '').trim();
      if (!v) return v;
      // 0/90/180/270deg son los cortes rectos (vertical u horizontal): a diagonal.
      return v.replace(/^linear-gradient\(\s*(?:0|90|180|270)deg\s*,/i, 'linear-gradient(135deg,');
    }

    function aplicarSwatch(button, valor) {
      button.style.setProperty('--variant-swatch', swatchDiagonal(valor));
    }

    /* EL CATÁLOGO MANDA SOBRE EL BOTÓN.
       Una sola función para las DOS ramas —markup estático y dinámico—, para que el
       HTML de una ficha no pueda contradecir al dato. Antes la rama estática se
       limitaba a enganchar el clic y dejaba texto, swatch y clave tal y como
       estuvieran escritos: por eso el G2 PRO rotulaba "KG2 PRO (VMP)" en su ficha
       mientras su catálogo decía "G2 PRO VMP", y por eso la clase de píldora había
       que ponerla a mano. Generalizado aquí, las 12 fichas pasan a ser consumidoras
       de golpe y sin tratamiento especial para ninguna. */
    function aplicarDatosAlBoton(button, variant, esPildora, isDefault, isUnavailable, ejeDeLaOpcion) {
      // El respaldo del nombre es el rótulo del eje AL QUE PERTENECE la opción, no el
      // del eje principal: en una ficha de dos ejes eso anunciaba mal la medida.
      var suEje = ejeDeLaOpcion || eje;
      var nombre = variant.label || variant.name || (suEje && suEje.label) || '';
      // Clase BASE siempre, y el modificador segun el tipo del eje: lo que decide
      // si es circulo o pildora es el dato, no el HTML.
      button.classList.add('variant-option');
      button.classList.toggle('variant-option--pill', esPildora);
      button.classList.toggle('variant-option--swatch', !esPildora);
      button.classList.toggle('is-active', !!isDefault);
      button.classList.toggle('is-disabled', !!isUnavailable);
      button.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
      // El nombre SIEMPRE accesible, también en el círculo: una opción no puede
      // identificarse solo por su color.
      button.setAttribute('aria-label', nombre);
      button.title = nombre;
      /* AQUÍ NO se toca `data-color-key`, y es deliberado. Esa clave es la identidad
         de la línea en el carrito y en los pedidos YA guardados. Hoy sale de la
         etiqueta ("Negro"); el catálogo la llama "negro". Escribirla desde el dato
         cambiaría la identidad de las líneas a mitad de migración: el mismo color
         entraría dos veces y los pedidos históricos dejarían de casar. El cambio a
         atributos con nombre es la etapa 5, que sí lleva lectura compatible de lo
         antiguo. Hasta entonces, quien la escribe sigue siendo quien la escribía. */
      button.disabled = !!isUnavailable;
      if (isUnavailable) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
      // La píldora lleva el nombre DENTRO; el círculo, su muestra de color. En la
      // píldora manda la etiqueta corta si el catálogo la declara: el nombre completo
      // sigue yendo en aria-label y title, así que no se pierde para nadie.
      if (esPildora) button.textContent = variant.shortLabel || nombre;
      else aplicarSwatch(button, variant.swatch || variant.color || variant.hex || '#111');
    }

    /* Si el producto tiene MÁS de un eje, el clic no lo resuelve el botón por su
       cuenta: lo resuelve la selección completa (ver montarEjesSecundarios). Se
       declara aquí para que los dos caminos de abajo puedan delegar. */
    var aplicarSeleccionCombinada = null;

    // Si hay markup estático se REUTILIZAN sus nodos (evita el salto de maquetación
    // de insertarlos), pero su contenido se reescribe desde el catálogo.
    if (soloSecundarios) {
      // Nada que pintar aquí: los ejes van todos a las secciones `.variant-axis`.
    } else if (isStaticMarkup && grid) {
      var existingButtons = grid.querySelectorAll('.variant-option');
      variants.forEach(function (variant, index) {
        var button = existingButtons[index];
        if (!button) return; // fallback: button count mismatch, skip
        var indexesEst = toIndexList(variant, originalItems.length);
        aplicarDatosAlBoton(
          button, variant, eje.type === 'pill',
          button.classList.contains('is-active'),
          !indexesEst.length && !variant.images
        );
        button.__ssOpcion = variant;
        buttons.push(button);
        button.addEventListener('click', function () {
          if (button.disabled) return;
          if (aplicarSeleccionCombinada) { aplicarSeleccionCombinada(variant, button); return; }
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('is-active');
            buttons[i].setAttribute('aria-pressed', 'false');
          }
          button.classList.add('is-active');
          button.setAttribute('aria-pressed', 'true');
          renderGalleryForVariant(variant);
          updateCheckoutUrlWithColor(variant);
          applySeriesAccentForVariant(variant, button);
        });
      });
    } else if (grid) {
      variants.forEach(function (variant, index) {
        var indexes = toIndexList(variant, originalItems.length);
        var isUnavailable = !indexes.length;
        var isDefault = variant.default === true || (variant.defaultColor === true) || (!buttons.length && !variants.some(function (item) { return item.default === true || item.defaultColor === true; }) && index === 0);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'variant-option variant-option--swatch';
        // Misma función que la rama estática: una sola definición de "cómo se pinta
        // una opción", que además decide píldora o círculo por el TIPO del eje.
        aplicarDatosAlBoton(button, variant, eje.type === 'pill', isDefault, isUnavailable);
        button.__ssOpcion = variant;

        button.addEventListener('click', function () {
          if (button.disabled) return;
          if (aplicarSeleccionCombinada) { aplicarSeleccionCombinada(variant, button); return; }
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('is-active');
            buttons[i].setAttribute('aria-pressed', 'false');
          }
          button.classList.add('is-active');
          button.setAttribute('aria-pressed', 'true');
          renderGalleryForVariant(variant);
          updateCheckoutUrlWithColor(variant);
          applySeriesAccentForVariant(variant, button);
        });

        buttons.push(button);
        grid.appendChild(button);
      });
    }

    if (!isStaticMarkup && !soloSecundarios) {
      panelInner.insertBefore(selector, ctaCol);
    }

    function updateCheckoutUrlWithColor(variant) {
      var colorKey = variant.key || variant.label || 'default';
      var colorLabel = variant.label || variant.name || (eje && eje.label) || '';
      var variantImage = getVariantPrimaryImage(variant);
      updateCheckoutLinksColorParams(colorKey, colorLabel, variantImage);

      // Sincronizar el botón "Añadir" con la versión elegida. global-assets-app.js
      // escribe el color por defecto en el botón al hidratar y NO lo actualiza al
      // cambiar de versión; como cart-runtime, al ver que el botón ya trae data-color,
      // ignora la selección activa, el carrito añadía SIEMPRE la versión por defecto.
      // Reescribiendo aquí data-color en cada cambio, el botón refleja la versión real.
      var cartBtn = panel.querySelector('[data-product-cart-btn="true"]');
      if (cartBtn) {
        var cartKey = variant.key || variant.label || '';
        cartBtn.setAttribute('data-color-key', cartKey);
        cartBtn.setAttribute('data-color', cartKey);
        cartBtn.setAttribute('data-color-label', colorLabel);
        if (variantImage) cartBtn.setAttribute('data-image', variantImage);
        /* Y el atributo CON NOMBRE, que es lo que llega al pedido. `data-color` sigue
           existiendo como identidad de línea (y en las fichas de dos ejes lleva la
           clave combinada), pero quien dice qué eje es esto es el catálogo. */
        if (window.SS_ATTRS && window.SS_ATTRS.marcarSeleccion && variant.key) {
          var parcial = {};
          parcial[eje.key] = variant.key;
          window.SS_ATTRS.marcarSeleccion(cartBtn, parcial);
        }
      }
    }

    /* La opción de partida la decide el núcleo: la marcada, y si no la primera que no
       esté agotada. Aquí se cogía `variants[0]` a secas, así que una ficha cuyo primer
       color estuviera agotado abría con una opción que no se podía comprar. */
    var defaultVariant = (window.SS_ATTRS && typeof window.SS_ATTRS.porDefecto === 'function')
      ? window.SS_ATTRS.porDefecto(eje)
      : (variants.find(function (variant) { return variant.default === true || variant.defaultColor === true; }) || variants[0]);
    if (defaultVariant && !soloSecundarios) {
      // Carga inicial: sin animación (no tiene sentido "cambiar" a la foto que
      // ya se está pintando por primera vez).
      renderGalleryForVariant(defaultVariant, { scrollThumb: false, animate: false });
      updateCheckoutUrlWithColor(defaultVariant);
      gallery.dataset.activeColor = defaultVariant.key || defaultVariant.label || 'default';
    }

    /* ══════════════════════════════════════════════════════════════════════════
       EJES SECUNDARIOS — un producto puede tener N ejes, no uno

       Hasta ahora esta función pintaba UN eje (el de círculos) y las fichas con dos
       —los manillares: medida + acabado, o modelo + medida— llevaban su propio script
       inline de ~120 líneas. Cuatro copias del mismo baile: recombinar la clave,
       recolocar las fotos de la medida elegida, reescribir el botón de carrito y los
       enlaces de compra. Cada arreglo había que hacerlo cuatro veces, y una ficha
       nueva de dos ejes exigía escribir una quinta.

       Aquí eso pasa a ser UNA implementación guiada por los datos: los ejes vienen del
       catálogo, las secciones `.variant-axis` del HTML se emparejan EN ORDEN con los
       ejes que no son el principal, y a partir de ahí toda elección —de cualquier eje—
       pasa por `aplicarSeleccion()`.

       Lo que sigue viviendo en el HTML de la ficha es solo la maquetación: la sección,
       su cabecera y su rejilla. Ni una regla.
       ══════════════════════════════════════════════════════════════════════════ */
    var seleccionActual = {};
    if (!soloSecundarios) seleccionActual[eje.key] = defaultVariant;

    (function montarEjesSecundarios() {
      var otros = [];
      for (var io = 0; io < ejes.length; io++) {
        if (soloSecundarios || ejes[io].key !== eje.key) otros.push(ejes[io]);
      }
      if (!otros.length) return;

      var todasSecciones = panel.querySelectorAll('.variant-axis');
      if (!todasSecciones.length) return;   // esta ficha no tiene dónde pintarlos
      var secciones = [];
      for (var isec = 0; isec < todasSecciones.length; isec++) {
        if (!soloSecundarios && isec === indicePrincipal) continue;   // esa es la del principal
        secciones.push(todasSecciones[isec]);
      }

      var controles = [];

      otros.forEach(function (ejeSec, idx) {
        var seccion = secciones[idx];
        if (!seccion) return;
        var rejilla = seccion.querySelector('.variant-axis-grid') || seccion.querySelector('.variant-axis-grid');
        if (!rejilla) return;

        // El rótulo lo pone el CATÁLOGO, no el HTML: es justo lo que se estaba
        // escribiendo a mano y lo que hacía que un eje se anunciara mal.
        var rotulo = seccion.querySelector('.variant-axis-label');
        if (rotulo && ejeSec.label) rotulo.textContent = String(ejeSec.label).toUpperCase() + ':';
        var valorActivo = seccion.querySelector('[data-active-size-label]')
          || seccion.querySelector('[data-active-model-label]')
          || seccion.querySelector('.variant-axis-value');

        var existentes = rejilla.querySelectorAll('button');
        var botones = [];
        ejeSec.options.forEach(function (op, i) {
          var b = existentes[i];
          if (!b) {
            b = document.createElement('button');
            b.type = 'button';
            rejilla.appendChild(b);
          }
          b.className = 'variant-option ' + (ejeSec.type === 'swatch' ? 'variant-option--swatch' : 'variant-option--pill');
          aplicarDatosAlBoton(b, op, ejeSec.type !== 'swatch', false, false, ejeSec);
          b.addEventListener('click', function () {
            if (b.disabled) return;
            seleccionActual[ejeSec.key] = op;
            aplicarSeleccion();
          });
          botones.push({ op: op, el: b });
        });

        // Punto de partida: lo que el HTML ya marcaba (así la página no cambia al
        // cargar) y, si no marcaba nada, lo que diga el catálogo.
        var activoEstatico = null;
        botones.forEach(function (x) { if (x.el.classList.contains('is-active')) activoEstatico = x.op; });
        seleccionActual[ejeSec.key] = activoEstatico
          || (window.SS_ATTRS.porDefecto ? window.SS_ATTRS.porDefecto(ejeSec) : null)
          || ejeSec.options[0];

        controles.push({ eje: ejeSec, botones: botones, valorActivo: valorActivo });
      });

      if (!controles.length) return;

      /* La clave y la etiqueta que van al CARRITO. Siguen siendo las combinadas de
         siempre ("negro-780", "Negro · 780 mm") porque son la identidad de las líneas
         ya guardadas: cambiarlas partiría en dos el mismo producto. El ORDEN de esa
         combinación lo declara el catálogo en `legacyKeyAxes`, en vez de estar
         escrito en el script de cada ficha. Desaparece cuando la identidad de línea
         pase a ser `attrs`. */
      function claveCombinada() {
        var orden = Array.isArray(product.legacyKeyAxes) && product.legacyKeyAxes.length
          ? product.legacyKeyAxes
          : ejes.map(function (e) { return e.key; });
        var claves = [];
        var etiquetas = [];
        orden.forEach(function (k) {
          var op = seleccionActual[k];
          if (!op) return;
          claves.push(op.key);
          etiquetas.push(op.label || op.key);
        });
        return { key: claves.join('-'), label: etiquetas.join(' · ') };
      }

      function aplicarSeleccion(opciones) {
        var animar = !opciones || opciones.animate !== false;
        var principal = soloSecundarios
          ? (seleccionActual[controles[0].eje.key] || null)
          : (seleccionActual[eje.key] || defaultVariant);

        // 1) Disponibilidad cruzada: la decide el dato (`allows`), en los dos sentidos.
        controles.forEach(function (c) {
          c.botones.forEach(function (x) {
            var libre = window.SS_ATTRS.disponible(c.eje, x.op, seleccionActual);
            x.el.disabled = !libre;
            x.el.classList.toggle('is-disabled', !libre);
            if (!libre) x.el.setAttribute('aria-disabled', 'true');
            else x.el.removeAttribute('aria-disabled');
            var elegido = seleccionActual[c.eje.key] === x.op;
            x.el.classList.toggle('is-active', elegido);
            x.el.setAttribute('aria-pressed', elegido ? 'true' : 'false');
          });
          if (c.valorActivo) {
            var op = seleccionActual[c.eje.key];
            c.valorActivo.textContent = op ? (op.label || op.key) : '';
          }
        });

        (soloSecundarios ? [] : buttons).forEach(function (b) {
          var esActivo = b === (opciones && opciones.boton);
          if (opciones && opciones.boton) {
            b.classList.toggle('is-active', esActivo);
            b.setAttribute('aria-pressed', esActivo ? 'true' : 'false');
          }
          var opb = b.__ssOpcion;
          if (opb) {
            var libre = window.SS_ATTRS.disponible(eje, opb, seleccionActual);
            b.disabled = !libre;
            b.classList.toggle('is-disabled', !libre);
          }
        });

        // 2) La foto de la COMBINACIÓN, no la de una opción suelta.
        var indices = window.SS_ATTRS.imagenesDe(product, seleccionActual)
          .map(function (n) { return parseInt(n, 10); })
          .filter(function (n) { return n >= 1; });
        renderGalleryForVariant(principal, { indices: indices, animate: animar, scrollThumb: animar });

        // 3) Identidad de línea, atributos con nombre y enlaces de compra.
        var comb = claveCombinada();
        var foto = window.SS_ATTRS.fotoDe(product, seleccionActual);
        updateCheckoutLinksColorParams(comb.key, comb.label, foto);

        var cartBtn = panel.querySelector('[data-product-cart-btn="true"]');
        if (cartBtn) {
          cartBtn.setAttribute('data-color-key', comb.key);
          cartBtn.setAttribute('data-color', comb.key);
          cartBtn.setAttribute('data-color-label', comb.label);
          if (foto) cartBtn.setAttribute('data-image', foto);
          var parcial = {};
          for (var k in seleccionActual) {
            if (Object.prototype.hasOwnProperty.call(seleccionActual, k) && seleccionActual[k]) {
              parcial[k] = seleccionActual[k].key;
            }
          }
          window.SS_ATTRS.marcarSeleccion(cartBtn, parcial);
        }

        if (activeColorLabel) activeColorLabel.textContent = comb.label;
      }

      aplicarSeleccionCombinada = function (variant, boton) {
        seleccionActual[eje.key] = variant;
        aplicarSeleccion({ boton: boton });
        applySeriesAccentForVariant(variant, boton);
      };

      /* El aviso de stock vive en la cabecera del PRIMER eje —es donde lo pone el HTML
         y donde estaba el diseño—. Con dos secciones que ahora se llaman igual, la
         hidratación lo recolocaba en la segunda; se reafirma aquí, que es el último
         que toca estas secciones. */
      var cabeceraPrimera = panel.querySelector('.variant-axis .variant-axis-head');
      var aviso = panel.querySelector('.stock-note');
      if (cabeceraPrimera && aviso && aviso.parentElement !== cabeceraPrimera) {
        cabeceraPrimera.appendChild(aviso);
      }

      // Estado inicial sin animación: la página ya nace con la foto correcta.
      aplicarSeleccion({ animate: false });
    })();

  }

  /* ============================
     1) BADGE DE DESCUENTO (%)
     ============================ */
  (function discountBadge() {
    var priceRow = panel.querySelector('.price-row');
    var priceNow = panel.querySelector('.price-now');
    var priceWas = panel.querySelector('.price-was');
    if (!priceRow || !priceNow || !priceWas) return;

    // Normaliza la estructura: agrupa precio actual + precio anterior (+ badge)
    // dentro de un wrapper .price-values. Muchas fichas no lo traen y, sin él,
    // el badge quedaba descolocado o ni se inyectaba. Así TODAS las fichas
    // comparten la misma estructura → misma posición y estilo.
    var priceValues = priceRow.querySelector('.price-values');
    if (!priceValues) {
      priceValues = document.createElement('span');
      priceValues.className = 'price-values';
      priceNow.parentNode.insertBefore(priceValues, priceNow);
      priceValues.appendChild(priceNow);
      priceValues.appendChild(priceWas);
    }

    // Idempotente: si ya hay un badge estático en el HTML, reubícalo dentro del
    // wrapper (para igualar posición) y no añadas otro.
    var existing = priceRow.querySelector('.discount-badge');
    if (existing) {
      if (existing.parentNode !== priceValues) priceValues.appendChild(existing);
      return;
    }

    function parsePrice(el) {
      var text = el.textContent.replace(/[^\d,.]/g, '').replace(',', '.');
      return parseFloat(text);
    }

    var now = parsePrice(priceNow);
    var was = parsePrice(priceWas);
    if (!was || !now || was <= now) return;

    var pct = Math.round((1 - now / was) * 100);
    if (pct < 1) return;

    var badge = document.createElement('span');
    badge.className = 'discount-badge';
    badge.textContent = '-' + pct + '%';
    priceValues.appendChild(badge);
  })();


  /* ============================
     2) FACADE DE VIDEO (carga diferida de YouTube)
     ============================
     El <iframe> de YouTube descarga ~1 MB del reproductor en cada visita
     (incluso sin pulsar play, solo para mostrar el poster). Lo sustituimos por
     una miniatura + boton; el reproductor real se carga SOLO al hacer clic.
     Como este script corre al final del body y el video esta bajo el pliegue
     (loading=lazy), reemplazamos el iframe antes de que el navegador lo baje.
     El recuadro mantiene aspect-ratio 16/9 -> sin saltos de layout (CLS 0). */
  (function youtubeFacade() {
    var frames = document.querySelectorAll('.video-embed-frame');
    if (!frames.length) return;

    Array.prototype.forEach.call(frames, function (frame) {
      var iframe = frame.querySelector('iframe');
      if (!iframe) return;
      var src = iframe.getAttribute('src') || '';
      var m = src.match(/embed\/([A-Za-z0-9_-]{6,})/);
      if (!m) return;
      var id = m[1];
      var title = iframe.getAttribute('title') || 'Reproducir vídeo';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'yt-facade';
      btn.setAttribute('aria-label', title);

      var thumb = document.createElement('img');
      thumb.className = 'yt-facade-thumb';
      thumb.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';

      var play = document.createElement('span');
      play.className = 'yt-facade-play';
      play.setAttribute('aria-hidden', 'true');

      btn.appendChild(thumb);
      btn.appendChild(play);

      btn.addEventListener('click', function () {
        var real = document.createElement('iframe');
        real.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1';
        real.title = title;
        real.setAttribute('loading', 'eager');
        real.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        real.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        real.setAttribute('allowfullscreen', '');
        frame.innerHTML = '';
        frame.appendChild(real);
      }, { once: true });

      frame.innerHTML = '';
      frame.appendChild(btn);
    });
  })();


  /* ============================
     3) PLAY ICON + VIDEO MODAL
     ============================ */
  (function videoModal() {
    var iframe = document.querySelector('.video-embed-frame iframe');
    if (!iframe) return;

    var galleryMain = gallery.querySelector('.gallery-main');
    if (!galleryMain) return;

    /* Play overlay on gallery */
    var playBtn = document.createElement('button');
    playBtn.className = 'gallery-play-btn';
    playBtn.type = 'button';
    playBtn.setAttribute('aria-label', 'Ver vídeo del producto');
    playBtn.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
      '<span>Ver vídeo</span>';
    galleryMain.appendChild(playBtn);

    /* Modal */
    var modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Vídeo del producto');
    modal.innerHTML =
      '<div class="video-modal-backdrop"></div>' +
      '<div class="video-modal-body">' +
        '<button class="video-modal-close" type="button" aria-label="Cerrar vídeo">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
        '<div class="video-modal-frame"></div>' +
      '</div>';
    document.body.appendChild(modal);

    var videoSrc = iframe.getAttribute('src') || '';

    function openModal() {
      var frame = modal.querySelector('.video-modal-frame');
      frame.innerHTML = '<iframe src="' + videoSrc + '&autoplay=1" allowfullscreen allow="autoplay; encrypted-media"></iframe>';
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      var frame = modal.querySelector('.video-modal-frame');
      frame.innerHTML = '';
    }

    playBtn.addEventListener('click', openModal);
    modal.querySelector('.video-modal-backdrop').addEventListener('click', closeModal);
    modal.querySelector('.video-modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  })();


  /* ==========================================
     4) ACCESORIO COMPATIBLE (añadir sin salir)
     ==========================================
     Ocupa el hueco que dejaron las .quick-specs, entre .desc y .cta-col.
     Se pinta SOLO si el producto declara compatibleSkus en el catálogo, así
     que las 35 fichas sin accesorio compatible quedan exactamente igual.

     No registra ningún listener propio: los botones llevan el mismo contrato
     data-* que el resto del sitio y cart-runtime.js los recoge por delegación
     en document, incluido el "Añadido" temporal de data-added-label.

     OJO: NO lleva data-product-cart-btn="true". Ese atributo significa "este
     botón es dueño del selector de color de la ficha"; puesto aquí, el mando
     limitador se añadiría con el color elegido para el patinete. */
  /* SE ESPERA AL NÚCLEO ANTES DE DECIDIR NADA. Esto se pintaba en cuanto se ejecutaba
     el archivo, y para entonces `window.SS_ATTRS` todavía no existe: lo añade
     global-assets.js y llega unos 200 ms más tarde (medido en la ficha: este archivo a
     los 380 ms, el núcleo a los 586). Preguntarle a un núcleo que no está devolvía cero
     ejes, o sea "este accesorio no tiene nada que elegir", y el manillar WAKE Downhill
     —siete colores— salía con el botón «+» de añadir directo. Un pedido así llega sin
     saber qué color enviar.
     Los demás accesorios con ejes se libraban por casualidad: declaran `variantHint`,
     que es un texto del catálogo y no necesita núcleo. Ese campo estaba tapando el
     fallo, no arreglándolo. */
  ssListo().then(function compatibleAccessories() {
    var panelInner = panel.querySelector('.panel-inner');
    var desc = panelInner && panelInner.querySelector('.desc');
    if (!panelInner || !desc) return;
    if (typeof window.SCOOTSHOP_getCompatibleAccessories !== 'function') return;

    var cartBtn = panel.querySelector('.btn-cart[data-sku]');
    var sku = cartBtn && cartBtn.getAttribute('data-sku');
    if (!sku) return;

    var compatibles = window.SCOOTSHOP_getCompatibleAccessories(sku) || [];
    if (!compatibles.length) return;

    /* Los que ROTAN van al final de la lista, siempre las dos últimas filas. Los
       demás (limitador, bolsa) están siempre en pantalla y son los que dan estabilidad
       al bloque: si el carrusel queda en medio, lo que se mueve parte la lista en dos y
       la fila de abajo parece descolgada. Con el relevo abajo, lo fijo se lee primero y
       el movimiento queda contenido al final.
       El orden dentro de cada mitad se respeta: es `sort` estable (Chrome, Safari y
       Firefox lo garantizan desde 2019) y la clave es un simple 0/1, así que el orden
       de `compatibleSkus` en el catálogo se mantiene. */
    compatibles = compatibles.slice().sort(function (a, b) {
      var ra = a && a.rotationGroup ? 1 : 0;
      var rb = b && b.rotationGroup ? 1 : 0;
      return ra - rb;
    });

    function esc(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    var FLECHA_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

    /* El recuadro es EL MISMO que el resumen del pedido de /checkout y /pago:
       se reutilizan sus clases order-summary__product(--line) tal cual, que
       viven en main.css —fichero que la ficha ya carga— en vez de imitar el
       diseño con reglas propias. Si mañana cambia el resumen, esto cambia con
       él y no se queda desincronizado. */
    var filas = compatibles.map(function (acc) {
      /* SIN ?v=, tal cual viene del catálogo. Las fotos ya no van con la versión
         global (se sirven immutable y re-versionarlas las rebajaba enteras en cada
         despliegue), así que colgarle aquí la versión actual solo conseguiría que
         estas miniaturas se volvieran a bajar en cada bump. Y ya no hace falta
         igualar nada: global-assets-app.js dejó de reescribir el src de las imágenes,
         que era lo que partía la descarga en dos y hacía parpadear la fila. */
      var img = (acc.gallery && acc.gallery[0] && acc.gallery[0].src) || acc.image || '';

      /* Accesorios CON variantes (color, medida...) NO se pueden añadir desde aquí.
         Este botón no lleva data-product-cart-btn a propósito —si no, heredaría el
         color elegido para el patinete—, así que la línea entraría con color y
         colorLabel vacíos y el pedido llegaría sin saber cuál de las combinaciones
         hay que enviar. En su lugar se enlaza a la ficha, que es donde se eligen.
         Los que no tienen variantes (limitador, bolsa) se siguen añadiendo de un clic. */
      /* Que un accesorio tenga algo que elegir lo dicen sus EJES declarados, sean del
         tipo que sean: color, medida, modelo o cualquiera que aparezca mañana. Antes se
         miraba `colorVariants`, y por eso el manillar UNO —que se elige por modelo y
         medida, y solo existe en plateado— podía añadirse de un clic sin decir cuál.
         `variantHint` sigue contando para el caso en que el eje viva solo en la ficha. */
      var ejesAcc = (window.SS_ATTRS ? window.SS_ATTRS.ejes(acc) : []);
      var opcionesAcc = 0;
      for (var ea = 0; ea < ejesAcc.length; ea++) opcionesAcc += ejesAcc[ea].options.length;
      var tieneVariantes = ejesAcc.length > 1 || opcionesAcc > 1
        || (typeof acc.variantHint === 'string' && !!acc.variantHint);

      /* Qué hay que elegir en la ficha. Por defecto solo el color; los que además
         llevan otro eje metido dentro de la clave de color (el WAKE 720/780, que
         combina color y medida) lo declaran con `variantHint` en el catálogo. */
      var pista = (typeof acc.variantHint === 'string' && acc.variantHint) ? acc.variantHint : 'color';

      /* La variante se elige AQUÍ MISMO, en la burbuja (ver acc-pop más abajo),
         con ratón y con el dedo. El cuadro mide 236 px, así que cabe de sobra en un
         móvil de 320. Si el JS fallara, el <a> de reserva no existe: por eso la
         burbuja se va a la ficha si no consigue leerla (ver abrir()). */
      var accion = tieneVariantes
        /* Botón con la MISMA clase .compat-add: hereda el círculo de 38 px, el borde
           y el hover sin duplicar CSS. El icono va en SVG inline: css/icons.css es un
           subset local de Font Awesome y no trae ni fa-plus ni fa-chevron. */
        ? '<button type="button" class="compat-add" data-open-variants="' + esc(acc.href) + '"' +
            ' aria-expanded="false" aria-haspopup="dialog"' +
            ' title="Elegir ' + esc(pista) + '"' +
            ' aria-label="Elegir ' + esc(pista) + ' de ' + esc(acc.name) + '">' +
            FLECHA_SVG +
          '</button>'
        // Sin .btn-cart: ese es la píldora ancha del panel (sombra triple, sin
        // borde). Este copia los botones circulares de la cabecera —carrito,
        // menú y cuenta—, que son borde de 1px y fondo blanco sin sombra.
        : '<button type="button" class="compat-add" data-add-to-cart="true" data-added-label="Añadido"' +
            ' data-sku="' + esc(acc.sku) + '"' +
            ' data-name="' + esc(acc.name) + '"' +
            ' data-price="' + esc(acc.priceText) + '"' +
            ' data-url="' + esc(acc.href) + '"' +
            ' data-image="' + esc(img) + '"' +
            ' data-stock="' + esc(acc.stock || 'in_stock') + '"' +
            ' title="Añadir al carrito"' +
            ' aria-label="Añadir al carrito ' + esc(acc.name) + '">' +
            // "+" de texto, NO <i class="fa-plus">: css/icons.css es un subset
            // local de Font Awesome y fa-plus no está incluido, así que el
            // icono salía vacío y el botón se veía como una mancha negra.
            '<span class="compat-add-plus" aria-hidden="true">+</span>' +
          '</button>';

      // La flecha por sí sola no explica por qué esta fila no se añade de un clic.
      var meta = 'Ref: ' + esc(acc.sku) + (tieneVariantes ? ' · elige ' + esc(pista) : '');

      /* Chip de color, igual que en el resumen del pedido de /checkout y /pago.
         Se respeta la regla que ya sigue pago.js: lo que no tiene opción de color
         pone "Único" en vez de quedarse sin chip, para que todas las filas pesen
         lo mismo. Lo que sí tiene, "Por elegir", porque desde aquí no se elige.

         El estilo de píldora va inline y no en un .css: la clase --color solo
         tiene píldora dentro de .order-summary--checkout/--payment, y añadir
         .compat-box a ese selector obligaría a bumpear el asset-version global y
         redesplegar las 43 fichas por un chip que solo se ve en cuatro páginas.
         Los valores son los MISMOS que usa ese chip en el resumen del pedido
         (fondo blanco y sombra suave, no el gris del chip Ref), para que el
         cliente vea la misma píldora aquí y luego en /checkout y /pago. */
      var chipColor = 'padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.82);'
        + 'color:#667085;box-shadow:0 8px 18px rgba(15,23,42,.06);'
        + 'letter-spacing:.06em;text-transform:uppercase;margin-top:2px;';
      /* El rótulo sale del PRIMER eje que declare el accesorio, no de un "Color:" fijo:
         un manillar que se elige por medida dice "Medida: por elegir". Si no declara
         ejes, "Único". Así el chip no contradice a la ficha ni al carrito. */
      var ejeChip = ejesAcc.length ? ejesAcc[0] : null;
      var textoChip = tieneVariantes
        ? ((ejeChip ? ejeChip.label : 'Color') + ': Por elegir')
        : 'Único';
      var color = '<span class="order-summary__product-meta order-summary__product-meta--color"'
        + ' style="' + chipColor + '">' + esc(textoChip) + '</span>';

      /* Accesorios de la misma familia (los cinco manillares) se marcan con su grupo:
         el bloque no los enseña todos a la vez, los va rotando de dos en dos. */
      var grupo = (typeof acc.rotationGroup === 'string' && acc.rotationGroup)
        ? ' data-rot-group="' + esc(acc.rotationGroup) + '"'
        : '';

      return '' +
        '<div class="order-summary__product order-summary__product--line compat-row"' + grupo + '>' +
          '<div class="order-summary__product-main">' +
            '<img class="order-summary__product-image" src="' + esc(img) + '" alt="" loading="lazy" decoding="async" width="56" height="56">' +
            '<div class="order-summary__product-info">' +
              '<a class="order-summary__product-title compat-name" href="' + esc(acc.href) + '">' + esc(acc.name) + '</a>' +
              '<span class="order-summary__product-meta order-summary__product-meta--ref">' + meta + '</span>' +
              color +
            '</div>' +
          '</div>' +
          '<div class="compat-buy">' +
            '<span class="order-summary__product-line-total">' + esc(acc.priceText) + '</span>' +
            accion +
          '</div>' +
        '</div>';
    }).join('');

    var bloque = document.createElement('div');
    bloque.className = 'compat-box';
    bloque.setAttribute('aria-label', 'Accesorios compatibles');
    bloque.innerHTML =
      '<div class="compat-head">' +
        '<span class="compat-title">Añade algo más</span>' +
        '<span class="compat-hint">Compatible con este modelo</span>' +
      '</div>' +
      '<div class="order-summary__product-list">' + filas + '</div>';

    desc.parentNode.insertBefore(bloque, desc.nextSibling);

    /* ── Rotación por familias ───────────────────────────────────────────────
       Con cinco manillares compatibles el bloque se convertía en un muro y había
       que bajar mucho para llegar al botón de comprar del patinete. En vez de
       recortar el catálogo, se enseñan DOS y se cambian cada 4,5 s: el cliente
       acaba viéndolos todos y el bloque no crece.

       El relevo es un fundido en dos tiempos: primero se desvanecen las que salen
       y, cuando han terminado, se intercambian y entran las nuevas apareciendo.
       Nunca se solapan, así que el bloque no pega tirones ni cambia de alto.

       El orden se baraja en cada visita (de ahí que no siempre salgan los mismos
       primero) pero se recorre la lista entera, así que ninguno se queda sin
       turno y no se repite uno dentro de la misma vuelta.

       EL RELEVO ES POR FILA, no del bloque entero: la que tiene el ratón encima (o
       el foco dentro) se queda quieta y la otra sigue su turno. Sin ese freno, la
       fila podría cambiar en el instante entre que apuntas y pulsas y acabarías
       abriendo un manillar que no era —que es lo que pide la WCAG 2.2.2 para
       contenido que se actualiza solo—, pero congelar el bloque entero era pasarse:
       bastaba con dejar el puntero en el título o en un hueco para que no rotara
       nada. El reloj solo se para del todo con la pestaña en segundo plano o con la
       burbuja de variantes abierta.

       Las animaciones van con element.animate() en vez de CSS a propósito:
       .compat-* vive en tarjetas.css, que cargan las 43 fichas, y añadir reglas
       ahí obligaría a bumpear el asset-version global y redesplegarlas todas por
       una animación que solo se ve en cuatro páginas. */
    (function rotarFamilias() {
      var VISIBLES = 2;
      var CADA_MS = 4500;

      var pool = [];
      var todas = bloque.querySelectorAll('.compat-row[data-rot-group]');
      for (var i = 0; i < todas.length; i++) pool.push(todas[i]);
      if (pool.length <= VISIBLES) return;   // con dos o menos no hay nada que rotar

      // Barajado Fisher-Yates. Solo cambia el orden en que se van mostrando; en
      // pantalla siguen saliendo en el orden del DOM, entre el limitador y la bolsa.
      for (var s = pool.length - 1; s > 0; s--) {
        var r = Math.floor(Math.random() * (s + 1));
        var tmp = pool[s]; pool[s] = pool[r]; pool[r] = tmp;
      }

      // display en el style del elemento, no el atributo [hidden]: las filas llevan
      // un display de .compat-box en main.css que ganaría al del user-agent.
      function ocultar(fila) { fila.style.display = 'none'; }
      function ver(fila) { fila.style.display = ''; }

      var suave = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var idx = 0;

      // Las filas ocultas no descargan su foto (loading="lazy" + display:none), así
      // que al aparecer saldrían un instante en blanco. Se adelanta la del turno
      // siguiente, no las cinco: en la ficha de un patinete no toca gastar ahí.
      function precargarSiguientes() {
        for (var k = 0; k < VISIBLES; k++) {
          // `idx` ya apunta a la siguiente candidata a entrar.
          var f = pool[(idx + k) % pool.length];
          var im = f && f.querySelector('img');
          if (im && im.src) { var pre = new Image(); pre.decoding = 'async'; pre.src = im.src; }
        }
      }

      // El fundido de salida se queda "pegado" a opacidad 0 (fill:forwards) para que
      // la fila no reaparezca entre que acaba la animacion y se oculta. Al volver a
      // mostrarla hay que cancelar esa animacion o entraria invisible.
      function limpiarAnimaciones(fila) {
        if (!fila.getAnimations) return;
        var as = fila.getAnimations();
        for (var i = 0; i < as.length; i++) as[i].cancel();
      }

      /* Las filas que hay AHORA en pantalla, por hueco. Se lleva a mano en vez de
         deducirla del display porque los relevos ya no son en bloque: puede quedarse
         una y cambiar solo la otra, así que hace falta saber QUÉ hueco se renueva. */
      var visibles = [];

      function mostrarPareja(desde) {
        for (var i = 0; i < pool.length; i++) ocultar(pool[i]);
        visibles = [];
        for (var k = 0; k < VISIBLES; k++) {
          var fila = pool[(desde + k) % pool.length];
          limpiarAnimaciones(fila);
          ver(fila);
          visibles.push(fila);
        }
        return visibles.slice();
      }

      /* La siguiente del pool que no esté ya en pantalla: sin esto, al relevar un solo
         hueco podía tocarle la fila que se está quedando y salir dos veces. */
      function siguienteLibre() {
        for (var intento = 0; intento < pool.length; intento++) {
          var cand = pool[idx % pool.length];
          idx = (idx + 1) % pool.length;
          if (visibles.indexOf(cand) === -1) return cand;
        }
        return null;
      }

      /* Una fila se queda quieta si el cliente la está apuntando, tabulando dentro o
         tiene SU burbuja de variantes abierta. Solo ESA: las demás siguen su turno.
         Antes se paraba el bloque entero al entrar el ratón en cualquier punto de la
         caja —incluidos el título y los huecos— y también con cualquier burbuja
         abierta, así que configurar un manillar congelaba al otro.

         La burbuja hay que mirarla por el `aria-expanded` de SU botón y no por si
         existe una `.acc-pop` visible: el cuadro vive en <body>, fuera del bloque, y
         mientras el ratón está dentro de él la fila no figura como `:hover`. Sin este
         freno, la fila que se está configurando se esfumaría debajo y la burbuja se
         quedaría colgada de un botón oculto. */
      function apuntada(fila) {
        if (!fila) return false;
        if (fila.matches && fila.matches(':hover')) return true;
        if (fila.querySelector('[data-open-variants][aria-expanded="true"]')) return true;
        return !!(document.activeElement && fila.contains(document.activeElement));
      }

      function desvanecer(filas, cb) {
        if (!suave || !filas.length || !filas[0].animate) { cb(); return; }
        var pendientes = filas.length;
        var fin = function () { if (--pendientes === 0) cb(); };
        for (var i = 0; i < filas.length; i++) {
          var an = filas[i].animate([{ opacity: 1 }, { opacity: 0 }],
            { duration: 260, easing: 'ease-in', fill: 'forwards' });
          an.onfinish = fin;
          an.oncancel = fin;
        }
      }

      function aparecer(filas) {
        if (!suave) return;
        for (var i = 0; i < filas.length; i++) {
          if (!filas[i].animate) continue;
          filas[i].animate([{ opacity: 0 }, { opacity: 1 }],
            { duration: 340, easing: 'ease-out' });
        }
      }

      var enRelevo = false;
      function relevar() {
        if (enRelevo) return;                 // no encadenar dos relevos a la vez

        // Relevo POR FILA: salen solo las que nadie está mirando ni configurando.
        var salen = [];
        for (var i = 0; i < visibles.length; i++) {
          if (!apuntada(visibles[i])) salen.push(visibles[i]);
        }
        if (!salen.length) return;            // las tiene todas apuntadas: quietas

        enRelevo = true;
        desvanecer(salen, function () {
          /* La entrante se INSERTA en el sitio exacto de la saliente antes de ocultar
             a esta. Es lo que mantiene quieta a la fila que se queda: las ocultas van
             con display:none y no ocupan sitio, así que el hueco de cada una lo decide
             el ORDEN entre las visibles, no su posición en el DOM. Si la entrante
             cayera al otro lado de la que se queda, esa daría un salto de una fila
             entera —y con una burbuja abierta anclada a ella, se quedaría flotando
             lejos de su botón. */
          var entran = [];
          for (var h = 0; h < visibles.length; h++) {
            if (salen.indexOf(visibles[h]) === -1) continue;
            var saliente = visibles[h];
            /* siguienteLibre() mira `visibles`, que todavía contiene a la saliente y a
               la que se queda: así no se repite ninguna de las dos. */
            var nueva = siguienteLibre();
            if (!nueva) continue;
            saliente.parentNode.insertBefore(nueva, saliente);
            limpiarAnimaciones(nueva);
            ver(nueva);
            ocultar(saliente);
            visibles[h] = nueva;
            entran.push(nueva);
          }
          // Solo las que ENTRAN se funden: la que se queda no debe parpadear.
          aparecer(entran);
          precargarSiguientes();
          enRelevo = false;
        });
      }

      var timer = 0;
      function arrancar() {
        if (timer || document.hidden) return;
        timer = window.setInterval(relevar, CADA_MS);
      }
      function parar() { if (timer) { window.clearInterval(timer); timer = 0; } }

      /* El reloj ya NO se para al entrar el ratón en la caja: quien decide es cada
         fila, en relevar(). Solo se para con la pestaña en segundo plano. */
      // En segundo plano no se ve nada: seguir rotando solo gasta bateria.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) parar(); else arrancar();
      });

      mostrarPareja(0);     // primer par, sin animacion: nadie lo ha visto cambiar
      idx = VISIBLES % pool.length;   // el cursor queda tras la pareja inicial
      precargarSiguientes();
      arrancar();
    })();
  });


  /* ══════════════════════════════════════════════════════════════════════════
     4b) BURBUJA DE VARIANTES → js/variant-pop.js
     ──────────────────────────────────────────────────────────────────────────
     Ya NO vive aquí. Se sacó a su propio archivo porque la comparten las fichas
     y el HOME: la caja "Añade algo más" de arriba y las tarjetas del home abren
     exactamente el mismo cuadro, así que un cambio vale para los dos sitios.
     Este archivo solo pinta los botones con `data-open-variants`; de abrirlos se
     encarga el módulo, que escucha por delegación en `document`.

     Se pide una sola vez: el propio módulo se protege con `window.__ssVariantPop`
     (en las fichas lo cargan index.js y este archivo a la vez) y aquí se evita
     además el segundo <script>. */
  (function cargarBurbujaDeVariantes() {
    if (document.querySelector('script[data-variant-pop]')) return;
    var s = document.createElement('script');
    s.src = '/js/variant-pop.js?v=' + encodeURIComponent(assetVersion());
    s.defer = true;
    s.setAttribute('data-variant-pop', 'true');
    document.head.appendChild(s);
  })();


  /* Aquí se inyectaban los SELLOS de confianza (Envío gratis / Garantía / Pago seguro).
     Eliminados: el de envío repetía la primera línea del bloque de envío, que está justo
     al lado con el mismo icono, y los otros dos no decían nada que no esté ya en la
     ficha. Con ellos se fue su envoltorio .ship-trust, que solo existía para colocarlos
     junto al envío. El bloque de envío vuelve a ser hijo directo de .panel-inner. */

  (function variantSelector() {
    function arrancar() {
      var product = getCurrentProduct();
      if (product) createVariantSelector(product);
      ensureDefaultColorFromDom();
    }
    /* El núcleo puede no estar todavía: la ficha se enlaza con etiqueta estática y a
       product-attributes.js lo añade global-assets.js de forma diferida. Si aún no
       está, se espera a su aviso; sin esto el selector se quedaba sin construir y los
       botones de la ficha dejaban de cambiar la foto. */
    ssListo().then(arrancar);
  })();

  /* ══════════════════════════════════════════════════════════════════════════
     CARRIL DE COLORES — deslizar en horizontal cuando no caben en el recuadro
     ──────────────────────────────────────────────────────────────────────────
     La fila de círculos no se parte en dos líneas ni encoge (flex-wrap:nowrap en
     tarjetas.css, a propósito), así que con muchos colores —el manillar LUNJE
     tiene 10— se sale del recuadro. El deslizamiento lo pone el CSS
     (overflow-x:auto en .variant-axis-grid); aquí va solo lo que el CSS no
     puede saber:

       1) si el carril desborda DE VERDAD y por qué lado queda algo por ver, para
          pintar el degradado del borde solo entonces (clases .is-rail*), y
       2) que el color elegido esté a la vista. Sin esto, al abrir una ficha cuyo
          color por defecto es el 8º se ven seis círculos, ninguno marcado, y
          parece que no hay nada seleccionado.

     Dos cosas que NO se pueden cambiar a la ligera:
       · el desplazamiento se hace escribiendo scrollLeft del carril, NUNCA con
         scrollIntoView(): ese arrastra también el scroll de la PÁGINA y las
         fichas dependen de nacer arriba del todo.
       · el carril solo se mueve si el círculo activo NO se ve entero, para no
         pelear con el dedo del cliente cuando ya está deslizando.

     Se recalcula al vuelo porque el carril cambia de sitio y de estado por su
     cuenta: enforceProductActionOrder() (global-assets-app.js) recoloca la
     sección ~1s después de cargar —y mover el nodo pone su scroll a cero— y el
     color activo lo cambian tanto los botones como los scripts propios de cada
     ficha (LUNJE recombina medida+color, G2 PRO alterna versión).
     ══════════════════════════════════════════════════════════════════════════ */
  (function carrilDeVariantes() {
    var SLACK = 2;      // px de holgura: el scroll fraccionado nunca da el 0 exacto
    var EDGE_PAD = 15;  // el padding lateral del carril (--rail-pad en tarjetas.css)
    var frame = 0;

    /* Los DOS carriles de la ficha, con el mismo trato: el de color y el de
       medida/modelo de los manillares. Antes ese segundo se partía en dos filas
       (flex-wrap:wrap) en vez de deslizarse; ahora comparte CSS y controlador, así
       que un cambio aquí vale para los dos. */
    function rails() {
      return Array.prototype.slice.call(
        document.querySelectorAll('.variant-axis-grid, .variant-axis-grid'));
    }

    function prefersReducedMotion() {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (_) {
        return false;
      }
    }

    // Qué bordes se difuminan: ninguno si cabe todo, y solo el lado por el que
    // queda carril por recorrer cuando no cabe.
    function syncEdges(rail) {
      var max = rail.scrollWidth - rail.clientWidth;
      var scrollable = max > SLACK;
      rail.classList.toggle('is-rail', scrollable);
      rail.classList.toggle('is-rail-start', scrollable && rail.scrollLeft <= SLACK);
      rail.classList.toggle('is-rail-end', scrollable && rail.scrollLeft >= max - SLACK);
      /* Si cabe entera, las píldoras se reparten el ancho en vez de dejar hueco
         muerto a la derecha (el WAKE y el LUNJE solo tienen dos medidas). Mismo
         gesto que la burbuja con .acc-pop-rail.is-fit. En el carril de colores la
         clase no hace nada: allí los círculos no se estiran nunca. */
      rail.classList.toggle('is-fit', !scrollable);
    }

    function revealActive(rail, smooth) {
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= SLACK) return;

      // `.is-active` a secas: sirve igual para el círculo de color y para la píldora
      // de medida/modelo, que ahora comparten carril.
      var active = rail.querySelector('.is-active');
      if (!active) return;

      var railRect = rail.getBoundingClientRect();
      var activeRect = active.getBoundingClientRect();
      var visible = activeRect.left >= railRect.left + EDGE_PAD - 1 &&
                    activeRect.right <= railRect.right - EDGE_PAD + 1;
      if (visible) return;

      // Centrado dentro de la ventana del carril: así se ven también los vecinos
      // y se lee de un vistazo que la fila sigue a los dos lados.
      var target = rail.scrollLeft + (activeRect.left - railRect.left) -
                   (rail.clientWidth - activeRect.width) / 2;
      target = Math.max(0, Math.min(max, Math.round(target)));
      if (Math.abs(target - rail.scrollLeft) < 1) return;

      if (smooth && !prefersReducedMotion() && typeof rail.scrollTo === 'function') {
        try {
          rail.scrollTo({ left: target, behavior: 'smooth' });
          return;
        } catch (_) {}
      }
      rail.scrollLeft = target;
    }

    function bind(rail) {
      conectarRuedaHorizontal(rail);
      if (rail.dataset.railBound === 'true') return;
      rail.dataset.railBound = 'true';
      rail.addEventListener('scroll', function () { syncEdges(rail); }, { passive: true });
    }

    /* motivo:
         'inicio' → primera pasada, sin animación
         'color'  → ha cambiado el círculo activo: se enseña siempre, deslizando
         'layout' → algo ha movido o remedido el carril. Aquí NO se toca el scroll
                    si el cliente lo había deslizado él (scrollLeft > 0): en móvil
                    esconder la barra de direcciones dispara un resize por cada
                    scroll de la página, y recolocar el carril en ese momento sería
                    quitárselo de las manos. Cuando de verdad lo han movido de sitio
                    —enforceProductActionOrder()— el scroll vuelve solo a cero, que
                    es justo el caso que sí hay que recolocar. */
    function schedule(motivo) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        rails().forEach(function (rail) {
          bind(rail);
          if (motivo !== 'layout' || rail.scrollLeft <= SLACK) {
            revealActive(rail, motivo === 'color');
          }
          syncEdges(rail);
        });
      });
    }

    schedule('inicio');

    var panelInner = panel.querySelector('.panel-inner');
    if (panelInner && window.MutationObserver) {
      // Solo interesan dos cosas: que muevan la sección (childList) y que cambie el
      // botón activo (class de un .variant-option). Las clases .is-rail* que escribe
      // esta misma función van en el carril, no en un .variant-option, así que no se
      // realimentan.
      new MutationObserver(function (records) {
        var motivo = '';
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          var isActiveSwitch = record.type === 'attributes' &&
                               record.target.classList &&
                               (record.target.classList.contains('variant-option variant-option--swatch') ||
                                record.target.classList.contains('variant-option--pill'));
          if (isActiveSwitch) { motivo = 'color'; break; }
          if (record.type === 'childList') motivo = 'layout';
        }
        if (motivo) schedule(motivo);
      }).observe(panelInner, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    window.addEventListener('load', function () { schedule('layout'); });
    window.addEventListener('resize', function () { schedule('layout'); }, { passive: true });
    window.addEventListener('orientationchange', function () { schedule('layout'); });
  })();

  /* ============================
     BADGE DGT AUTOMÁTICO
     Regla: si el producto está certificado por la DGT en el catálogo
     (products.js → dgtCertified:true, lo mismo que pinta el icono en la
     home), el badge aparece también en la ficha. Fuente única = catálogo.
     Idempotente: no duplica si el HTML ya trae el badge estático.
     ============================ */
  (function ensureDgtBadge() {
    var product = getCurrentProduct();
    if (!product || product.dgtCertified !== true) return;

    var priceRow = panel.querySelector('.price-row');
    if (!priceRow || priceRow.querySelector('.dgt-badge')) return;

    var img = document.createElement('img');
    img.className = 'dgt-badge';
    img.src = withVersion('/img/dgtchapa.svg');
    img.alt = 'Logo DGT';
    // width/height + eager: reservan el hueco por aspect-ratio y lo cargan ya,
    // para que no crezca el price-row al llegar (antes con lazy y sin dims saltaba
    // ~19px hacia abajo). El SVG es 1254x1254; el CSS lo escala a 57px.
    img.setAttribute('width', '1254');
    img.setAttribute('height', '1254');
    img.loading = 'eager';
    img.decoding = 'async';
    priceRow.appendChild(img);
  })();


  /* ============================
     5) PRODUCTOS RELACIONADOS
     ============================ */
  (function relatedProducts() {
    var products = window.SCOOTSHOP_PRODUCTS;
    if (!Array.isArray(products) || !products.length) return;

    var currentPath = window.location.pathname;
    if (!currentPath.endsWith('/')) currentPath += '/';

    /* Find current product */
    var current = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].href === currentPath) { current = products[i]; break; }
    }
    if (!current) return;

    /* Fisher-Yates shuffle */
    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }

    var others = products.filter(function (p) {
      return p.href !== current.href && p.stock !== 'out_of_stock';
    });

    /* Guarantee at least 1 accessory; remaining 3 slots are fully random */
    var accessories = others.filter(function (p) { return p.categoryKey === 'accessories'; });
    var rest = others.filter(function (p) { return p.categoryKey !== 'accessories'; });

    var oneAcc = shuffle(accessories).slice(0, 1);
    var pool = shuffle(others.filter(function (p) { return p.href !== (oneAcc[0] && oneAcc[0].href); }));
    var related = oneAcc.concat(pool.slice(0, 3));
    related = shuffle(related);

    if (related.length < 2) return;

    var section = document.querySelector('main > section.container');
    if (!section) return;

    var relatedEl = document.createElement('section');
    relatedEl.className = 'related-products';
    relatedEl.setAttribute('aria-label', 'Productos relacionados');
    relatedEl.setAttribute('data-home-catalog-root', '');
    /* Estas tarjetas se barajan en cada carga (`shuffle` unas líneas más arriba), así
       que su `id` NO es una posición estable de la página: al volver atrás, la que
       estabas mirando puede no existir. js/scroll-memoria.js se salta esta zona al
       elegir dónde anclar la vuelta. */
    relatedEl.setAttribute('data-scroll-volatil', '');
    var relatedMounted = false;
    var loadFallbackTimer = 0;

    function mountRelated(useHomeCards) {
      if (relatedMounted) return;

      var homeCardApi = window.SCOOTSHOP_HOME_CARD_API;
      var canUseHomeCards = !!(useHomeCards && homeCardApi && typeof homeCardApi.buildCardMarkup === 'function');
      if (!canUseHomeCards) return;

      var html = '<h2 class="related-title">También te puede interesar</h2>';
      html += '<div class="grid related-home-grid">';
      related.forEach(function (p, idx) {
        html += homeCardApi.buildCardMarkup(p, idx);
      });

      html += '</div>';
      relatedEl.innerHTML = html;

      /* Insert before footer */
      var footer = section.querySelector('footer');
      if (footer) {
        section.insertBefore(relatedEl, footer);
      } else {
        section.appendChild(relatedEl);
      }

      if (canUseHomeCards && typeof homeCardApi.hydrate === 'function') {
        homeCardApi.hydrate();
      }

      relatedMounted = true;
      if (loadFallbackTimer) {
        window.clearTimeout(loadFallbackTimer);
        loadFallbackTimer = 0;
      }
    }

    if (window.SCOOTSHOP_HOME_CARD_API && typeof window.SCOOTSHOP_HOME_CARD_API.buildCardMarkup === 'function') {
      mountRelated(true);
      return;
    }

    var indexScript = document.querySelector('script[src*="/js/index.js"]');
    if (!indexScript) {
      indexScript = document.createElement('script');
      indexScript.src = '/js/index.js?v=' + encodeURIComponent(assetVersion());
      indexScript.defer = true;
      indexScript.setAttribute('data-home-card-api-loader', 'true');
      document.head.appendChild(indexScript);
    }

    indexScript.addEventListener('load', function () {
      var hasHomeApi = !!(window.SCOOTSHOP_HOME_CARD_API && typeof window.SCOOTSHOP_HOME_CARD_API.buildCardMarkup === 'function');
      mountRelated(hasHomeApi);
    }, { once: true });

    indexScript.addEventListener('error', function () {
    }, { once: true });

    loadFallbackTimer = window.setTimeout(function () {
      var hasHomeApi = !!(window.SCOOTSHOP_HOME_CARD_API && typeof window.SCOOTSHOP_HOME_CARD_API.buildCardMarkup === 'function');
      mountRelated(hasHomeApi);
    }, 900);
  })();

})();
