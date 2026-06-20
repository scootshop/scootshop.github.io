/* product-enhancements.js — Mejoras UX para páginas de producto */
(function () {
  'use strict';

  /* ── Solo ejecutar en páginas de producto ── */
  var gallery = document.querySelector('.gallery');
  var panel   = document.querySelector('.panel');
  if (!gallery || !panel) return;

  var ver = window.ASSET_VER || '1';

  function normalizePath(path) {
    var clean = String(path || '').split('?')[0].split('#')[0];
    if (clean && clean.charAt(clean.length - 1) !== '/') clean += '/';
    return clean;
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

  function withVersion(src) {
    if (!src) return '';
    return src.indexOf('?') === -1 ? src + '?v=' + ver : src;
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
    var ver = window.ASSET_VER || '1';
    var thumbs = gallery.querySelectorAll('.thumb[data-img]');
    var sources = [];
    var seen = {};
    for (var i = 0; i < thumbs.length; i++) {
      var src = thumbs[i].getAttribute('data-img');
      if (!src || seen[src]) continue;
      seen[src] = true;
      sources.push(src.indexOf('?') === -1 ? src + '?v=' + ver : src);
    }
    if (!sources.length) return;

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
    var btnMain = panel.querySelector('.btn-main');
    var stickyBtn = document.querySelector('.sticky-buy-btn');

    [btnMain, stickyBtn].forEach(function (link) {
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;

      try {
        var parsed = new URL(href, window.location.origin);
        parsed.searchParams.set('color', colorKey || 'default');
        parsed.searchParams.set('colorLabel', colorLabel || 'Color');
        if (variantImage) parsed.searchParams.set('image', variantImage);

        var nextHref = /^https?:\/\//i.test(href)
          ? parsed.toString()
          : (parsed.pathname + parsed.search + parsed.hash);

        link.setAttribute('href', nextHref);
      } catch (_) {
        var base = href.split('&color=')[0].split('&colorLabel=')[0];
        var fallbackHref = base + '&color=' + encodeURIComponent(colorKey || 'default') + '&colorLabel=' + encodeURIComponent(colorLabel || 'Color');
        if (variantImage) fallbackHref += '&image=' + encodeURIComponent(variantImage);
        link.setAttribute('href', fallbackHref);
      }
    });
  }

  function ensureDefaultColorFromDom() {
    var selector = panel.querySelector('.color-variants');
    if (!selector) return;

    var activeButton = selector.querySelector('.color-variant.is-active:not([disabled]):not([aria-disabled="true"])');
    if (!activeButton) {
      var allButtons = selector.querySelectorAll('.color-variant');
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
      'Color';

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

  function sentenceCase(value) {
    var text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
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

  function detectCategory() {
    var path = normalizeText(window.location.pathname || '');
    if (path.indexOf('/patinetes/') !== -1) return 'patinete';
    if (path.indexOf('/bicicletas/') !== -1) return 'bicicleta';
    if (path.indexOf('/motos/') !== -1) return 'moto';
    if (path.indexOf('/accesorios/') !== -1) return 'accesorio';
    return 'producto';
  }

  function detectDesignHook(name, subtitle, specData) {
    var full = normalizeText([name, subtitle, specData.pairs.map(function (p) { return p.label + ' ' + p.value; }).join(' ')].join(' '));

    if (full.indexOf('carbon') !== -1) return 'acabado Carbon Design';
    if (full.indexOf('armored') !== -1) return 'chasis reforzado Armored';
    if (full.indexOf('ultimate') !== -1) return 'configuracion Ultimate';
    if (full.indexOf('dual') !== -1) return 'plataforma de doble traccion';
    if (full.indexOf('connected') !== -1) return 'enfoque Connected con conectividad integrada';
    if (full.indexOf('chopper') !== -1) return 'estetica chopper de presencia marcada';
    if (full.indexOf('homologado dgt') !== -1 || full.indexOf('dgt') !== -1) return 'homologacion DGT para uso urbano';
    if (full.indexOf('plegable') !== -1) return 'diseno plegable para uso diario';
    if (full.indexOf('antivibracion') !== -1) return 'sistema antivibracion';
    if (full.indexOf('reflectante') !== -1) return 'acabado reflectante de alta visibilidad';

    var material = findSpecValue(specData, ['material', 'chasis', 'cuadro']);
    if (material) return material.toLowerCase().indexOf('alumin') !== -1 ? 'estructura ligera de aluminio' : 'acabado tecnico orientado a durabilidad';

    return '';
  }

  function buildFactHighlights(category, specData) {
    var facts = [];
    var motor = findSpecValue(specData, ['motor', 'potencia']);
    var battery = findSpecValue(specData, ['bateria']);
    var autonomy = findSpecValue(specData, ['autonomia']);
    var speed = findSpecValue(specData, ['velocidad']);
    var slope = findSpecValue(specData, ['pendiente']);
    var wheels = findSpecValue(specData, ['ruedas']);
    var brakes = findSpecValue(specData, ['frenos']);
    var suspension = findSpecValue(specData, ['suspension']);
    var compatibility = findSpecValue(specData, ['compatibilidad', 'compat.']);
    var kit = findSpecValue(specData, ['contenido', 'kit', 'pack']);
    var material = findSpecValue(specData, ['material']);

    if (category === 'accesorio') {
      if (compatibility) facts.push('compatibilidad ' + compatibility);
      if (material) facts.push('material ' + material);
      if (kit) facts.push('contenido ' + kit);
      if (!facts.length) {
        var usage = findSpecValue(specData, ['uso', 'tipo', 'sistema', 'montaje']);
        if (usage) facts.push(usage);
      }
      return uniqueList(facts).slice(0, 3);
    }

    if (motor) facts.push('motor ' + motor);
    if (battery) facts.push('bateria ' + battery);
    if (autonomy) facts.push('autonomia ' + autonomy);
    if (speed) facts.push('velocidad maxima ' + speed);
    if (slope) facts.push('pendiente ' + slope);
    if (wheels) facts.push('ruedas ' + wheels);
    if (brakes) facts.push('frenos ' + brakes);
    if (suspension) facts.push('suspension ' + suspension);

    return uniqueList(facts).slice(0, 4);
  }

  function buildInterestingDetail(category, specData) {
    var battery = findSpecValue(specData, ['bateria']);
    var autonomy = findSpecValue(specData, ['autonomia']);
    var wheels = findSpecValue(specData, ['ruedas']);
    var brakes = findSpecValue(specData, ['frenos']);
    var suspension = findSpecValue(specData, ['suspension']);
    var loading = findSpecValue(specData, ['carga maxima', 'carga max.', 'carga']);
    var extras = findSpecValue(specData, ['extras', 'bluetooth']);
    var age = findSpecValue(specData, ['edad recomendada']);
    var full = normalizeText(specData.pairs.map(function (p) { return p.label + ' ' + p.value; }).join(' '));

    if (category === 'accesorio') {
      var mount = findSpecValue(specData, ['montaje', 'fijacion']);
      if (mount) return 'Como detalle util, su sistema de montaje (' + mount + ') permite instalarlo y retirarlo en poco tiempo.';
      if (full.indexOf('impermeable') !== -1) return 'Detalle de valor: el acabado impermeable ayuda a mantener rendimiento y aspecto con uso diario.';
      return 'Su propuesta destaca por resolver una necesidad concreta del dia a dia sin complicar la instalacion.';
    }

    if (extras) return 'Como detalle diferencial, incorpora ' + extras + ', un extra poco habitual en su rango.';
    if (suspension) return 'Un punto interesante es su configuracion de suspension (' + suspension + '), pensada para mejorar confort y control en firme irregular.';
    if (wheels) return 'Dato interesante: las ruedas de ' + wheels + ' mejoran estabilidad y absorcion frente a irregularidades urbanas.';
    if (brakes) return 'En seguridad, el sistema de frenos (' + brakes + ') aporta una respuesta mas progresiva y controlada.';
    if (battery && autonomy) return 'En uso real, la combinacion de bateria ' + battery + ' y autonomia ' + autonomy + ' esta equilibrada para recorridos cotidianos.';
    if (loading) return 'Como valor practico, admite una carga maxima de ' + loading + ', ofreciendo mayor versatilidad de uso.';
    if (age) return 'Su configuracion esta pensada para una franja de edad de ' + age + ', priorizando control y comodidad.';
    if (full.indexOf('dgt') !== -1) return 'A nivel legal y practico, la homologacion DGT mejora la tranquilidad de uso en entorno urbano.';

    return 'Su configuracion tecnica prioriza equilibrio entre rendimiento, control y durabilidad para un uso constante.';
  }

  function buildSubtitleClaims(category, specData, designHook) {
    var claims = [];
    if (designHook) claims.push(sentenceCase(designHook));

    var autonomy = findSpecValue(specData, ['autonomia']);
    var motor = findSpecValue(specData, ['motor', 'potencia']);
    var battery = findSpecValue(specData, ['bateria']);
    var compatibility = findSpecValue(specData, ['compatibilidad', 'compat.']);
    var full = normalizeText(specData.pairs.map(function (p) { return p.label + ' ' + p.value; }).join(' '));

    if (category === 'accesorio') {
      if (compatibility) claims.push('Compatibilidad ' + compatibility);
      if (claims.length < 2) {
        var material = findSpecValue(specData, ['material']);
        if (material) claims.push('Material ' + material);
      }
    } else {
      if (motor) claims.push('Motor ' + motor);
      if (battery && claims.length < 2) claims.push('Bateria ' + battery);
      if (autonomy && claims.length < 2) claims.push('Autonomia ' + autonomy);
      if (claims.length < 2 && full.indexOf('dgt') !== -1) claims.push('Homologado DGT');
    }

    claims = uniqueList(claims);
    if (!claims.length) return '';
    return claims.slice(0, 2).join(' · ');
  }

  (function editorialCopyRefresh() {
    var titleEl = document.querySelector('.page-title h1, .title-left h1');
    var subtitleEl = document.querySelector('.page-title .subtitle, .title-left .subtitle');
    var descEl = panel.querySelector('.panel-inner .desc');
    if (!titleEl || (!subtitleEl && !descEl)) return;

    if (descEl && descEl.hasAttribute('data-copy-lock')) return;

    var productName = String(titleEl.textContent || '').trim();
    if (!productName) return;

    var oldSubtitle = subtitleEl ? String(subtitleEl.textContent || '').trim() : '';
    var specData = collectSpecData();
    var category = detectCategory();
    var designHook = detectDesignHook(productName, oldSubtitle, specData);
    var facts = buildFactHighlights(category, specData);
    var interestingDetail = buildInterestingDetail(category, specData);

    if (subtitleEl) {
      var nextSubtitle = buildSubtitleClaims(category, specData, designHook);
      if (nextSubtitle) subtitleEl.textContent = nextSubtitle;
    }

    if (!descEl) return;

    var intro;
    if (category === 'patinete') {
      var isArmoredDual = /m41\s+armored\s+dual/i.test(productName) || window.location.pathname.indexOf('/m41-armored-dual/') !== -1;
      if (isArmoredDual) {
        intro = 'El ' + productName + ' es la version mas contundente de la gama Ecoxtrem para riders que buscan aceleracion inmediata, traccion y control incluso en uso exigente.';
      } else {
        intro = 'El ' + productName + ' esta planteado para movilidad urbana eficiente, con una configuracion enfocada en estabilidad y control.';
      }
    } else if (category === 'bicicleta') {
      intro = 'La ' + productName + ' combina asistencia electrica y geometria orientada a confort para trayectos diarios y escapadas de fin de semana.';
    } else if (category === 'moto') {
      intro = 'La ' + productName + ' prioriza una conduccion segura y progresiva, con enfoque practico para uso recreativo y controlado.';
    } else if (category === 'accesorio') {
      intro = 'El ' + productName + ' aporta una mejora funcional real para el uso diario, con un planteamiento orientado a practicidad y durabilidad.';
    } else {
      intro = 'El ' + productName + ' destaca por un planteamiento tecnico equilibrado, pensado para uso continuo y experiencia fiable.';
    }

    if (designHook) {
      intro += ' A nivel de diseno, sobresale por su ' + designHook + '.';
    }

    var factsSentence = facts.length
      ? 'En prestaciones, ofrece ' + joinNatural(facts) + '.'
      : '';

    descEl.textContent = [intro, factsSentence, interestingDetail].filter(Boolean).join(' ');
  })();

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

  function createColorVariantSelector(product) {
    var variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
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
    var existingSelector = panelInner.querySelector('.color-variants');
    var selector;
    var isStaticMarkup = false;

    if (existingSelector) {
      selector = existingSelector;
      isStaticMarkup = true;
    } else {
      selector = document.createElement('section');
      selector.className = 'color-variants';
      selector.setAttribute('aria-label', 'Colores disponibles');
    }

    var header, activeColorLabel, grid;

    if (isStaticMarkup) {
      header = selector.querySelector('.color-variants-head');
      activeColorLabel = selector.querySelector('[data-active-color-label]');
      grid = selector.querySelector('.color-variants-grid');
    } else {
      header = document.createElement('div');
      header.className = 'color-variants-head';
      header.innerHTML =
        '<span class="color-variants-label">COLOR:</span>' +
        '<span class="color-variants-list" data-active-color-label></span>';
      selector.appendChild(header);
      activeColorLabel = header.querySelector('[data-active-color-label]');
      grid = document.createElement('div');
      grid.className = 'color-variants-grid';
      selector.appendChild(grid);
    }

    var buttons = [];

    function normalizeText(value) {
      var text = String(value || '').toLowerCase();
      try {
        text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (_) {}
      return text.trim();
    }

    function buildAccentFill(colors) {
      if (!Array.isArray(colors) || !colors.length) return '';
      if (colors.length === 1) return colors[0];
      var steps = [];
      var total = colors.length;
      for (var i = 0; i < total; i++) {
        var from = (i * 100) / total;
        var to = ((i + 1) * 100) / total;
        steps.push(colors[i] + ' ' + from + '% ' + to + '%');
      }
      return 'linear-gradient(90deg, ' + steps.join(', ') + ')';
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

    function resolveVariantAccent(variant, button) {
      var directGradient = variant && (variant.accentGradient || variant.lineGradient || variant.accentLineGradient);
      if (directGradient) {
        var gradientText = String(directGradient).trim();
        var gradientHex = gradientText.match(/#[0-9a-fA-F]{3,8}/);
        return { accent: gradientHex ? gradientHex[0] : '#d11c1c', fill: gradientText, mix: 1 };
      }

      var explicitArray = variant && (variant.accentColors || variant.lineColors || variant.accentLineColors);
      if (Array.isArray(explicitArray) && explicitArray.length) {
        var filtered = explicitArray.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
        if (filtered.length) {
          return { accent: filtered[0], fill: buildAccentFill(filtered), mix: filtered.length > 1 ? 1 : 0 };
        }
      }

      var directValue = variant && (variant.accentLine || variant.accent || variant.swatch || variant.color || variant.hex);
      var directColors = parseDirectAccentColors(directValue);
      if (directColors.length) {
        if (directColors.length === 1 && /^linear-gradient\(/i.test(directColors[0])) {
          var firstHex = directColors[0].match(/#[0-9a-fA-F]{3,8}/);
          return { accent: firstHex ? firstHex[0] : '#d11c1c', fill: directColors[0], mix: 1 };
        }
        return { accent: directColors[0], fill: buildAccentFill(directColors), mix: directColors.length > 1 ? 1 : 0 };
      }

      var labelColors = findNamedColors((variant && (variant.label || variant.name || variant.key)) || '');
      if (labelColors.length) {
        return { accent: labelColors[0], fill: buildAccentFill(labelColors), mix: labelColors.length > 1 ? 1 : 0 };
      }

      if (button && window.getComputedStyle) {
        var swatchVar = getComputedStyle(button).getPropertyValue('--variant-swatch');
        var fallback = swatchVar && String(swatchVar).trim();
        if (!fallback) {
          var buttonBg = getComputedStyle(button).backgroundColor;
          if (buttonBg && buttonBg !== 'rgba(0, 0, 0, 0)' && buttonBg !== 'transparent') fallback = buttonBg;
        }
        if (fallback) return { accent: fallback, fill: fallback, mix: 0 };
      }

      return { accent: '', fill: '', mix: 0 };
    }

    function applySeriesAccentForVariant(variant, button) {
      var resolved = resolveVariantAccent(variant, button);
      if (!resolved.accent && !resolved.fill) return;
      if (resolved.accent) panel.style.setProperty('--series-accent', resolved.accent);
      panel.style.setProperty('--series-accent-fill', resolved.fill || resolved.accent || '');
      panel.style.setProperty('--series-accent-mix', String(resolved.mix ? 1 : 0));
    }

    function renderGalleryForVariant(variant, options) {
      var allowThumbScroll = !options || options.scrollThumb !== false;
      var indexes = toIndexList(variant, originalItems.length);
      var selectedItems = indexes.length
        ? indexes.map(function (index) { return originalItems[index - 1]; }).filter(Boolean)
        : [];

      if (!selectedItems.length) return;

      mainImage.src = withVersion(selectedItems[0].src);
      if (selectedItems[0].alt) mainImage.alt = selectedItems[0].alt;

      if (activeColorLabel) {
        activeColorLabel.textContent = variant.label || variant.name || 'Color';
      }

      var activeButton = selector.querySelector('.color-variant.is-active');
      applySeriesAccentForVariant(variant, activeButton);

      var thumbButtons = thumbsWrap.querySelectorAll('.thumb');
      var activeThumb = null;
      for (var i = 0; i < thumbButtons.length; i++) {
        var thumbButton = thumbButtons[i];
        var thumbSrc = thumbButton.getAttribute('data-img') || '';
        var isActive = thumbSrc === selectedItems[0].src;
        if (isActive) activeThumb = thumbButton;
        thumbButton.classList.toggle('active', isActive);
      }

      if (allowThumbScroll && activeThumb && activeThumb.scrollIntoView) {
        activeThumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }

    function getVariantPrimaryImage(variant) {
      var indexes = toIndexList(variant, originalItems.length);
      var primaryIndex = indexes.length ? indexes[0] : 1;
      var item = originalItems[primaryIndex - 1] || originalItems[0];
      return item && item.src ? item.src : '';
    }

    // Si hay markup estático, usar los botones existentes; si no, crearlos
    if (isStaticMarkup && grid) {
      var existingButtons = grid.querySelectorAll('.color-variant');
      variants.forEach(function (variant, index) {
        var button = existingButtons[index];
        if (!button) return; // fallback: button count mismatch, skip
        buttons.push(button);
        button.addEventListener('click', function () {
          if (button.disabled) return;
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
    } else {
      variants.forEach(function (variant, index) {
        var indexes = toIndexList(variant, originalItems.length);
        var isUnavailable = !indexes.length;
        var isDefault = variant.default === true || (variant.defaultColor === true) || (!buttons.length && !variants.some(function (item) { return item.default === true || item.defaultColor === true; }) && index === 0);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'color-variant' + (isDefault ? ' is-active' : '') + (isUnavailable ? ' is-disabled' : '');
        button.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
        button.setAttribute('aria-label', variant.label || variant.name || 'Color');
        button.title = variant.label || variant.name || 'Color';
        if (isUnavailable) {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
        }
        button.style.setProperty('--variant-swatch', variant.swatch || variant.color || variant.hex || '#111');

        button.addEventListener('click', function () {
          if (button.disabled) return;
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

    if (!isStaticMarkup) {
      panelInner.insertBefore(selector, ctaCol);
    }

    function updateCheckoutUrlWithColor(variant) {
      var colorKey = variant.key || variant.label || 'default';
      var colorLabel = variant.label || variant.name || 'Color';
      var variantImage = getVariantPrimaryImage(variant);
      updateCheckoutLinksColorParams(colorKey, colorLabel, variantImage);
    }

    var defaultVariant = variants.find(function (variant) { return variant.default === true || variant.defaultColor === true; }) || variants[0];
    if (defaultVariant) {
      renderGalleryForVariant(defaultVariant, { scrollThumb: false });
      updateCheckoutUrlWithColor(defaultVariant);
      gallery.dataset.activeColor = defaultVariant.key || defaultVariant.label || 'default';
    }
  }

  /* ============================
     1) STICKY BUY BAR (móvil)
     ============================ */
  (function stickyBar() {
    if (window.matchMedia && !window.matchMedia('(max-width: 980px)').matches) return;

    var btnMain = panel.querySelector('.btn-main');
    if (!btnMain) return;

    var priceNow = panel.querySelector('.price-now');
    var h1 = document.querySelector('.page-title h1, .title-left h1');
    var priceText = priceNow ? priceNow.textContent.trim() : '';
    var nameText  = h1 ? h1.textContent.trim() : '';

    var bar = document.createElement('div');
    bar.className = 'sticky-buy-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      '<div class="sticky-buy-inner">' +
        '<div class="sticky-buy-info">' +
          '<span class="sticky-buy-name">' + nameText + '</span>' +
          '<span class="sticky-buy-price">' + priceText + '</span>' +
        '</div>' +
        '<div class="sticky-buy-actions">' +
          '<a class="sticky-buy-btn" href="' + btnMain.getAttribute('href') + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
            ' Comprar ahora' +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bar);

    var ctaCol = panel.querySelector('.cta-col');
    if (!ctaCol) return;

    var visible = false;
    var ticking = false;

    function checkScroll() {
      var rect = ctaCol.getBoundingClientRect();
      var shouldShow = rect.bottom < 0;
      if (shouldShow !== visible) {
        visible = shouldShow;
        bar.classList.toggle('is-visible', visible);
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(checkScroll); }
    }, { passive: true });

    checkScroll();
  })();


  /* ============================
     2) BADGE DE DESCUENTO (%)
     ============================ */
  (function discountBadge() {
    var priceNow = panel.querySelector('.price-now');
    var priceWas = panel.querySelector('.price-was');
    if (!priceNow || !priceWas) return;

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

    var priceValues = panel.querySelector('.price-values');
    if (priceValues) {
      priceValues.appendChild(badge);
    }
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


  /* ============================
     4) PILL DE PESO (4° pill)
     ============================ */
  (function weightPill() {
    var specRows = panel.querySelectorAll('.spec-row');
    var weightValue = '';

    for (var i = 0; i < specRows.length; i++) {
      var label = specRows[i].querySelector('.spec-label');
      if (label && /^peso/i.test(label.textContent.trim())) {
        var val = specRows[i].querySelector('.spec-value');
        if (val) weightValue = val.textContent.trim();
        break;
      }
    }

    if (!weightValue) return;

    var quickSpecs = panel.querySelector('.quick-specs');
    if (!quickSpecs) return;

    var pill = document.createElement('div');
    pill.className = 'pill';
    pill.innerHTML =
      '<span class="pill-label">Peso</span>' +
      '<span class="pill-value">' + weightValue + '</span>';
    quickSpecs.appendChild(pill);
    quickSpecs.classList.add('quick-specs--4');
  })();


  /* ============================
     5) TRUST BADGES
     ============================ */
  (function trustBadges() {
    var shippingBox = panel.querySelector('.shipping-box');
    if (!shippingBox) return;

    var badges = document.createElement('div');
    badges.className = 'trust-badges';
    badges.innerHTML =
      '<div class="trust-badge">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a2 2 0 01-2 2h-1"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
        '<span>Envío gratis</span>' +
      '</div>' +
      '<div class="trust-badge">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        '<span>Garantía</span>' +
      '</div>' +
      '<div class="trust-badge">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' +
        '<span>Pago seguro</span>' +
      '</div>';

    shippingBox.parentNode.insertBefore(badges, shippingBox.nextSibling);
  })();

  (function colorVariants() {
    var product = getCurrentProduct();
    if (product) {
      createColorVariantSelector(product);
    }
    ensureDefaultColorFromDom();
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
    img.loading = 'lazy';
    img.decoding = 'async';
    priceRow.appendChild(img);
  })();


  /* ============================
     6) PRODUCTOS RELACIONADOS
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
      indexScript.src = '/js/index.js?v=' + encodeURIComponent(ver);
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
