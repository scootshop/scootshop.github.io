(() => {
  'use strict';

  const $all = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const normalizePath = (link) => {
    const raw = String(link || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.origin);
      let path = url.pathname || '';
      if (!path.endsWith('/')) path += '/';
      return path;
    } catch (_) {
      return raw.endsWith('/') ? raw : raw + '/';
    }
  };

  const getCatalogProducts = () => Array.isArray(window.SCOOTSHOP_PRODUCTS) ? window.SCOOTSHOP_PRODUCTS.slice() : [];

  const getHomeSeries = () => {
    if (typeof window.SCOOTSHOP_getHomeSeries === 'function') return window.SCOOTSHOP_getHomeSeries();

    const seen = new Map();
    getCatalogProducts().forEach((product) => {
      if (!product || !product.series || seen.has(product.series)) return;
      seen.set(product.series, {
        key: product.series,
        label: 'Serie ' + String(product.series).toUpperCase(),
        homeTitle: 'Serie ' + String(product.series).toUpperCase(),
        homeDescription: '',
        homeSectionId: 'series-' + product.series,
        listingSectionId: 'products-' + product.series,
        homeAriaLabel: 'Lista de productos ' + String(product.series).toUpperCase(),
        homeOrder: seen.size + 1
      });
    });
    return Array.from(seen.values());
  };

  const getSeriesProducts = (seriesKey) => {
    if (typeof window.SCOOTSHOP_getSeriesProducts === 'function') return window.SCOOTSHOP_getSeriesProducts(seriesKey);

    return getCatalogProducts()
      .filter((product) => String(product.series || '').toLowerCase() === String(seriesKey || '').toLowerCase())
      .sort((left, right) => Number(left.homeOrder || 0) - Number(right.homeOrder || 0));
  };

  const getHomeCategories = () => {
    if (typeof window.SCOOTSHOP_getHomeCategories === 'function') return window.SCOOTSHOP_getHomeCategories();

    return [{
      key: 'default',
      label: 'Productos',
      showHeaderOnHome: false,
      series: getHomeSeries().map((series) => ({
        ...series,
        products: getSeriesProducts(series.key).filter((product) => product.showOnHome !== false)
      }))
    }];
  };

  const HOME_CATEGORY_FILTERS = [
    { key: 'electric-scooters', label: 'Patinetes' },
    { key: 'electric-motorcycles', label: 'Motos' },
    { key: 'electric-bikes', label: 'Bicicletas' },
    {
      key: 'accessories',
      label: 'Accesorios',
      emptyTitle: 'Accesorios',
      emptyDescription: 'Estamos preparando cascos, candados, soportes y accesorios para incorporarlos a la home.'
    }
  ];

  const DEFAULT_HOME_CATEGORY_KEY = 'electric-scooters';

  const normalizeHomeCategoryKey = (categoryKey) => {
    const raw = String(categoryKey || '').trim();
    return HOME_CATEGORY_FILTERS.some((item) => item.key === raw) ? raw : DEFAULT_HOME_CATEGORY_KEY;
  };

  let activeHomeCategoryKey = (() => {
    try {
      return normalizeHomeCategoryKey(sessionStorage.getItem('ss_homeCategory'));
    } catch (_) {
      return DEFAULT_HOME_CATEGORY_KEY;
    }
  })();

  const getHomeCategoryMeta = (categoryKey) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    return HOME_CATEGORY_FILTERS.find((item) => item.key === normalized) || HOME_CATEGORY_FILTERS[0];
  };

  const getOrderedHomeCategories = (categoryKey = activeHomeCategoryKey) => {
    return getHomeCategories().slice().sort((left, right) => Number(left.homeOrder || 0) - Number(right.homeOrder || 0));
  };

  const getHomeCategorySectionId = (categoryKey) => 'home-category-' + normalizeHomeCategoryKey(categoryKey);

  const getHomeStickyOffset = () => {
    const header = document.getElementById('siteHeader');
    const categoryStrip = document.querySelector('.home-category-strip');
    const railStrip = document.querySelector('.home-series-rail-strip');
    return (header ? header.offsetHeight : 72)
      + (categoryStrip ? categoryStrip.offsetHeight : 0)
      + (railStrip && !railStrip.hidden ? railStrip.offsetHeight : 0)
      + 8;
  };

  // Posición sticky del rail de series = alto de la cabecera fija + tira de
  // categorías. Se fija lo antes posible (en boot, antes del primer paint) para que
  // el rail no aparezca en una posición y luego salte a la correcta al volver/recargar.
  const setRailStickyTop = () => {
    const header = document.getElementById('siteHeader');
    const strip = document.querySelector('.home-category-strip');
    const top = (header ? header.offsetHeight : 72) + (strip ? strip.offsetHeight : 0);
    document.documentElement.style.setProperty('--rail-sticky-top', top + 'px');
  };

  const getCategorySectionElement = (categoryKey) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    return document.getElementById(getHomeCategorySectionId(normalized));
  };

  const ensureHomeCategoryChipVisible = (categoryKey, behavior = 'auto') => {
    const nav = document.querySelector('[data-home-category-nav]');
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const chip = nav.querySelector('[data-home-category="' + normalizeHomeCategoryKey(categoryKey) + '"]');
    if (!chip) return;
    const left = chip.offsetLeft - (nav.clientWidth / 2) + (chip.clientWidth / 2);
    nav.scrollTo({ left: Math.max(0, left), behavior });
  };

  const setActiveHomeCategory = (categoryKey, options = {}) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    const {
      persist = true,
      syncRail = true,
      chipBehavior = 'smooth'
    } = options;

    const changed = normalized !== activeHomeCategoryKey;
    activeHomeCategoryKey = normalized;
    syncHomeCategoryButtons();
    ensureHomeCategoryChipVisible(normalized, chipBehavior);

    if (persist) {
      try {
        sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
      } catch (_) {
      }
    }

    if (syncRail && changed) {
      const orderedCategories = getOrderedHomeCategories(activeHomeCategoryKey);
      renderHomeSeriesRail(orderedCategories);
      initSeriesRail();
    }
  };

  const resolveHomeCategoryKeyFromViewport = () => {
    const sections = $all('.home-category-section[data-home-category-section]');
    if (!sections.length) return '';

    const stickyLine = getHomeStickyOffset() + 6;
    let bestAbove = null;
    let nearestBelow = null;

    sections.forEach((section) => {
      const key = section.getAttribute('data-home-category-section') || '';
      if (!key) return;
      const rect = section.getBoundingClientRect();
      const item = { key, top: rect.top };

      if (rect.top <= stickyLine) {
        if (!bestAbove || item.top > bestAbove.top) bestAbove = item;
      } else if (!nearestBelow || item.top < nearestBelow.top) {
        nearestBelow = item;
      }
    });

    return (bestAbove && bestAbove.key) || (nearestBelow && nearestBelow.key) || '';
  };

  const syncHomeCategoryFromViewport = () => {
    if (homeCategoryPendingKey) {
      const timedOut = Date.now() >= homeCategoryPendingDeadline;
      if (!timedOut) {
        if (activeHomeCategoryKey !== homeCategoryPendingKey) {
          activeHomeCategoryKey = homeCategoryPendingKey;
          syncHomeCategoryButtons();
          ensureHomeCategoryChipVisible(homeCategoryPendingKey, 'auto');
        }
        return;
      }
      clearHomeCategoryPending();
    }

    const nextKey = resolveHomeCategoryKeyFromViewport();
    if (!nextKey) return;
    setActiveHomeCategory(nextKey, { persist: true, syncRail: true, chipBehavior: 'auto' });
  };

  const scheduleHomeCategoryViewportSync = () => {
    if (homeCategoryScrollTick) return;
    homeCategoryScrollTick = window.requestAnimationFrame(() => {
      homeCategoryScrollTick = 0;
      syncHomeCategoryFromViewport();
    });
  };

  const syncHomeCategoryButtons = () => {
    const normalized = normalizeHomeCategoryKey(activeHomeCategoryKey);
    $all('[data-home-category]').forEach((button) => {
      const key = button.getAttribute('data-home-category');
      const isActive = key === normalized;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      const badge = button.querySelector('.chip-count');
      if (badge) badge.remove();
    });
  };

  const setYear = () => {
    const yearEl = document.getElementById('y');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  };

  const setVh = () => {
    document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  };

  const runIdle = (callback) => {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(callback, { timeout: 900 });
    }
    return window.setTimeout(callback, 1);
  };

  // Las imágenes de producto se sirven `immutable, max-age=1 año`, así que sin
  // ?v= una foto reemplazada NUNCA llega al visitante que ya la tenía cacheada.
  // Pasó de verdad: al cambiar 23.webp (era el logo de Ecoxtrem) por el patinete
  // verde, la ficha se actualizó —sus URLs sí llevan versión— pero la tarjeta del
  // home y el carrito seguían mostrando el logo. Todo lo que salga de aquí lleva
  // versión.
  const assetVer = () => {
    if (window.ASSET_VER) return String(window.ASSET_VER).trim();
    const meta = document.querySelector('meta[name="asset-version"]');
    return meta ? String(meta.getAttribute('content') || '1').trim() : '1';
  };

  const withVer = (url) => {
    const raw = String(url || '').trim();
    if (!raw || /^(https?:)?\/\//.test(raw) || raw.indexOf('?') !== -1) return raw;
    return raw + '?v=' + encodeURIComponent(assetVer());
  };

  // Anchos de .card-shot en cada punto de corte de .grid, para que el navegador
  // elija la variante justa en vez de traerse el original de 1200-1500 px:
  //  ≤640px  → 2 columnas, tarjeta ≈ 46vw (≈173px en un móvil de 390px)
  //  ≤980px  → 2 columnas anchas
  //  ≤1199px → 3 columnas
  //  resto   → 4 columnas en un contenedor de 1340px ⇒ ≈310px fijos
  const CARD_SHOT_SIZES = '(max-width:640px) 46vw, (max-width:980px) 47vw, (max-width:1199px) 31vw, 320px';

  // Las variantes las genera scripts/build-card-shots.py con esta convención.
  const cardShotSrcset = (src) => {
    const clean = String(src || '').split('?')[0];
    const dot = clean.lastIndexOf('.');
    if (dot < 1) return '';
    const base = clean.slice(0, dot);
    // El escalón de 600 existe por medición: sin él, un móvil DPR3 (174css × 3
    // = 522px) saltaba al de 800 y se traía un 54 % más de píxeles del necesario.
    // SIN versión: las fotos no van con la versión global (se sirven immutable y
    // re-versionarlas las rebajaba enteras en cada despliegue). Ver la regla completa
    // en scripts/qa/check-image-cache.ps1.
    return base + '-400.webp 400w, '
         + base + '-600.webp 600w, '
         + base + '-800.webp 800w';
  };

  // Foto única de la tarjeta. Antes esto pintaba TODA la galería como
  // diapositivas de un carrusel arrastrable; se eliminó porque chocaba con la
  // segunda vista al pasar el ratón (data-hover-image), que es la que manda.
  const buildCardShotMarkup = (product, productIndex) => {
    const lead = (Array.isArray(product.gallery) && product.gallery.length)
      ? product.gallery[0]
      : { src: product.image, alt: product.alt || product.name };
    const isHeroCard = productIndex === 0;
    const loading = isHeroCard ? 'eager' : 'lazy';
    /* PRIORIDAD BAJA para las demás. `loading="lazy"` no basta en un carril
       horizontal: el navegador considera "cerca del viewport" todo lo que cabe a unos
       miles de píxeles a la derecha, así que en el home se bajaban ~20 fotos de
       tarjeta a la vez y competían por el ancho de banda con la imagen de portada, que
       es la que decide el LCP. Con `low` siguen bajándose —el carril se puede arrastrar
       en cualquier momento— pero DETRÁS de lo que el cliente está mirando. */
    const fetchpriority = isHeroCard ? ' fetchpriority="high"' : ' fetchpriority="low"';
    const srcset = cardShotSrcset(lead.src);
    const responsive = srcset
      ? ' srcset="' + esc(srcset) + '" sizes="' + CARD_SHOT_SIZES + '"'
      : '';
    return '<img class="card-shot" src="' + esc(lead.src) + '"' + responsive + ' alt="' + esc(lead.alt || product.alt || product.name) + '" loading="' + loading + '"' + fetchpriority + ' decoding="async" />';
  };

  // Red de seguridad del srcset: si a un producto nuevo le faltan las variantes
  // (p. ej. se creó con el scaffold y no se ejecutó build-card-shots.py), el
  // navegador NO cae solo al src — dejaría la foto rota. Aquí se detecta el
  // fallo, se quita el srcset y se recupera el original. Va en captura porque
  // el evento `error` de <img> no burbujea.
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG' || !img.classList.contains('card-shot')) return;
    if (!img.hasAttribute('srcset')) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
  }, true);

  const buildPriceRowMarkup = (product) => {
    const now = esc(product.priceText || '');
    const was = esc(product.compareAtPriceText || '');
    const dgtMarkup = product.dgtCertified
      ? '<div class="dgt-tooltip dgt-tooltip--price" data-dgt-tooltip><button class="dgt-tooltip-toggle" type="button" aria-label="Informacion sobre homologacion DGT" aria-expanded="false" data-tooltip-text="' + esc(product.dgtTooltipText || '') + '"><img class="dgt-badge" src="/img/dgtchapa.svg" alt="Logo DGT" loading="lazy" decoding="async" /></button></div>'
      : '';

    // Compute discount badge only when was > now
    let discountBadgeMarkup = '';
    if (was) {
      const parsePrice = (str) => parseFloat(String(str).replace(/[^\d,]/g, '').replace(',', '.'));
      const nowNum = parsePrice(product.priceText || '');
      const wasNum = parsePrice(product.compareAtPriceText || '');
      if (wasNum > nowNum && nowNum > 0) {
        const pct = Math.round((1 - nowNum / wasNum) * 100);
        if (pct >= 1) discountBadgeMarkup = '<span class="discount-badge">-' + pct + '%</span>';
      }
    }

    // Always wrap price content in .price-values so discount badge renders correctly
    const priceValuesMarkup = '<div class="price-values"><div class="price-now">' + now + '</div>' + (was ? '<div class="price-was">' + was + '</div>' : '') + discountBadgeMarkup + '</div>';

    return '<div class="price-row" aria-label="' + esc(product.priceAriaLabel || ('Precio ' + (product.menuLabel || product.name || 'producto'))) + '">' + priceValuesMarkup + dgtMarkup + '</div>';
  };

  const buildDgtInfoMarkup = (product) => {
    if (!product.dgtCertified) return '';
    return '<div class="dgt-tooltip dgt-tooltip--info card-dgt" data-dgt-tooltip><button class="dgt-tooltip-toggle" type="button" aria-label="Informacion sobre homologacion DGT" aria-expanded="false" data-tooltip-text="' + esc(product.dgtTooltipText || '') + '"><img class="dgt-badge" src="/img/dgtchapa.svg" alt="Logo DGT" loading="lazy" decoding="async" /></button></div>';
  };

  // Datos comunes que cart-runtime necesita en cualquier botón de añadir.
  const buildCartDataAttrs = (product, image) => {
    return ' data-sku="' + esc(product.sku || '') + '"'
      + ' data-name="' + esc(product.menuLabel || product.name || 'Producto') + '"'
      + ' data-price="' + esc(product.priceText || '') + '"'
      + ' data-url="' + esc(product.href || '') + '"'
      + ' data-image="' + esc(image || product.image || '') + '"'
      + ' data-stock="in_stock"';
  };

  // Imagen de la variante: colorVariants trae range:[desde,hasta] con los
  // índices de sus fotos, así que la primera del color es {href}/img/{desde}.webp.
  // Es el mismo criterio que usa la ficha para la imagen del carrito.
  /* La foto de una opción: sus imágenes son identificadores explícitos en el catálogo
     (`images: [1,2]`), no un tramo que haya que interpretar aquí. */
  const variantImage = (product, variant) => {
    const first = (variant && Array.isArray(variant.images) && variant.images.length)
      ? variant.images[0]
      : (Array.isArray(variant && variant.range) ? Number(variant.range[0]) : 0);
    const href = String(product.href || '').replace(/\/+$/, '');
    if (!href || !first) return product.image || '';
    return /^\d+$/.test(String(first)) ? (href + '/img/' + first + '.webp') : String(first);
  };

  const buildAddToCartButtonMarkup = (product) => {
    const stock = String(product.stock || 'in_stock').toLowerCase();
    if (stock !== 'in_stock') return '';

    const name = esc(product.menuLabel || product.name || 'producto');

    /* ¿HAY ALGO QUE PREGUNTAR? Lo dicen los ejes declarados por el producto, no una
       lista de colores. Antes esto miraba `colorVariants`, y por eso el manillar UNO y
       el KOCEVLO —dos ejes, modelo y medida, y un solo acabado— caían en "añadir
       directo" y entraban al pedido sin decir qué modelo ni qué medida.
       Un producto con tres ejes que no existan hoy funciona igual sin tocar esto.

       Una opción agotada se cae de la elección del home para que no se pueda pedir; en
       la ficha sí sigue visible pero deshabilitada, porque ahí interesa que el cliente
       vea que existe y está agotada. Qué cuenta como agotada lo decide el núcleo. */
    const ejes = (window.SS_ATTRS ? window.SS_ATTRS.ejes(product) : [])
      .map((eje) => ({ eje, options: eje.options.filter((o) => o && o.key && !o.disabled) }))
      .filter((x) => x.options.length);

    const opcionesTotales = ejes.reduce((n, x) => n + x.options.length, 0);
    const tieneEjes = ejes.length > 1 || opcionesTotales > 1
      || (typeof product.variantHint === 'string' && !!product.variantHint);
    const variants = ejes.length === 1 ? ejes[0].options : [];

    // Sin nada que elegir: se añade directo y el pedido queda sin variante ("Único").
    if (!tieneEjes && !variants.length) {
      return '<button class="btn-cart" type="button" data-add-to-cart data-added-label="Añadido"' + buildCartDataAttrs(product) + ' aria-label="Añadir al carrito ' + name + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
    }

    /* Una sola opción y ningún otro eje: es LA variante del producto, no hay nada que
       elegir. Entra al carrito con su atributo nombrado ({ color:'negro' },
       { model:'vmp' }… lo que declare el producto), no solo con la clave suelta: eso es
       lo que permite que el pedido diga después "Modelo: …" y no "Color: …". */
    if (!tieneEjes && variants.length === 1) {
      const only = variants[0];
      const eje = ejes[0].eje;
      const attrs = esc(JSON.stringify({ [eje.key]: only.key }));
      return '<button class="btn-cart" type="button" data-add-to-cart data-added-label="Añadido"' + buildCartDataAttrs(product, variantImage(product, only)) + ' data-color="' + esc(only.key) + '" data-color-label="' + esc(only.label || only.key) + '" data-attrs="' + attrs + '" aria-label="Añadir al carrito ' + name + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
    }

    /* Hay algo que elegir: el botón abre la MISMA burbuja que la caja "Añade algo más"
       de las fichas (js/variant-pop.js), que pregunta TODOS los ejes del producto —los
       colores del catálogo y, además, el modelo y la medida que solo conoce la ficha.

       Antes aquí se pintaba una paleta de colores propia (`.card-colors` +
       `.color-pop`) y cada círculo era el que añadía. Se quedó corta: solo sabía de
       color, así que un producto con modelo o medida —los manillares— se añadía
       desde el home sin esos ejes, o no se podía añadir en condiciones. La burbuja
       compartida los lee de la ficha del propio producto, así que cubre cualquier
       combinación presente y futura sin tocar el home.

       El href es lo único que necesita: de ahí saca la ficha y, de ella, los ejes. */
    return '<button class="btn-cart" type="button" data-open-variants="' + esc(product.href || '') + '"'
      + ' aria-expanded="false" aria-haspopup="dialog"'
      + ' aria-label="Elegir opciones de ' + name + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
  };

  /* La burbuja de variantes vive en su propio archivo, compartido con las fichas.
     Se pide en cuanto hay una tarjeta que la pueda abrir. Doble red: el módulo se
     protege con window.__ssVariantPop (en las fichas lo carga también
     product-enhancements.js) y aquí se evita el segundo <script>. */
  /* La burbuja se pide cuando el hilo está LIBRE, no en cuanto aparece una tarjeta que
     podría abrirla. Medido en móvil con red lenta: empezaba a los 2,5 s y terminaba a
     los 3,6 s, justo mientras se descargaban las fotos que el cliente está mirando.
     Nadie puede pulsar "Añadir" en ese hueco —la página aún se está pintando— así que
     esperar a un momento ocioso no cambia nada de lo que se ve ni de lo que se puede
     hacer; solo deja de competir por el ancho de banda. El respaldo con temporizador
     es para Safari, que no tiene requestIdleCallback. */
  const ensureVariantPop = () => {
    if (document.querySelector('script[data-variant-pop]')) return;
    const pedir = () => {
      if (document.querySelector('script[data-variant-pop]')) return;
      const s = document.createElement('script');
      s.src = withVer('/js/variant-pop.js');
      s.defer = true;
      s.setAttribute('data-variant-pop', 'true');
      document.head.appendChild(s);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(pedir, { timeout: 3000 });
    else setTimeout(pedir, 1200);
  };

  /* ===== Previsualización de la foto sobre la tarjeta =====
     Nació para la paleta de colores del home —al pasar por un color aparecía su
     foto— y sigue viva para el hover de la tarjeta, que enseña la segunda vista del
     producto. La paleta ya no existe: la sustituyó la burbuja compartida
     (js/variant-pop.js), que pregunta todos los ejes y no solo el color.

     Se usa una capa encima del carrusel en lugar de moverlo, así no se altera su
     estado ni la diapositiva actual.
     Disolución + escala: la foto entra fundiéndose sobre la anterior mientras pasa
     de un 103,5 % a su tamaño natural. Al ser el mismo patinete en la misma pose, se
     percibe como si se tiñera en el sitio, y el leve movimiento disimula cualquier
     desalineación entre tomas. Duración y curva las define el CSS
     (.card-color-preview); aquí solo se cruzan las capas.

     Solo con ratón de verdad. En táctil no hay hover: el navegador sintetiza un
     "mouseenter" al tocar y la foto se quedaría cambiada hasta tocar fuera. */
  const CAN_HOVER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  const ensurePreviewLayers = (media) => {
    const layers = Array.prototype.slice.call(media.querySelectorAll('[data-color-preview]'));
    while (layers.length < 2) {
      const img = document.createElement('img');
      img.className = 'card-color-preview';
      img.setAttribute('data-color-preview', '');
      img.setAttribute('alt', '');
      img.setAttribute('aria-hidden', 'true');
      img.setAttribute('decoding', 'async');
      media.appendChild(img);
      layers.push(img);
    }
    return layers;
  };

  /* Contador por tarjeta que invalida los revelados EN VUELO.

     El revelado no es inmediato: espera al onload de la segunda foto y además a dos
     frames. Ese hueco puede terminar mucho después de que el ratón se haya ido, y
     entonces encendía la capa cuando ya no había nadie encima. Rozando una tarjeta y
     saliendo, el ocultar no encontraba todavía nada puesto (no hacía nada) y el onload
     posterior dejaba la segunda foto fija PARA SIEMPRE, porque solo se apaga al salir
     y ya se había salido.

     Cada intento de mostrar coge un número, y ocultar quema el vigente. El revelado
     solo se aplica si el suyo sigue siendo el bueno. */
  const nextPreviewToken = (media) => {
    media.ssPreviewToken = (media.ssPreviewToken || 0) + 1;
    return media.ssPreviewToken;
  };

  const showColorPreview = (card, src) => {
    if (!card || !src) return;
    const media = card.querySelector('.card-media');
    if (!media) return;

    const layers = ensurePreviewLayers(media);
    const active = layers.filter((l) => l.classList.contains('is-on'))[0] || null;
    // Ya se está mostrando ese color: no repetimos la animación.
    if (active && active.getAttribute('src') === src) return;

    const next = layers.filter((l) => l !== active)[0] || layers[0];
    const token = nextPreviewToken(media);
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // Doble rAF: el navegador necesita registrar el estado inicial (opacidad
      // 0 y escala ampliada) antes de animar. Sin esto el cambio sería seco.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // El ratón pudo irse mientras cargaba la foto, o entre estos dos frames.
        if (media.ssPreviewToken !== token) return;
        next.classList.add('is-on');
        if (active && active !== next) active.classList.remove('is-on');
      }));
    };

    next.classList.remove('is-on');
    // Un onload viejo de esta misma capa quedaría colgado apuntando a otra foto.
    next.onload = null;
    if (next.getAttribute('src') === src && next.complete) { reveal(); return; }
    // La segunda vista no está en el documento: esperamos a tenerla cargada
    // para no fundir sobre un hueco en blanco.
    next.onload = reveal;
    next.setAttribute('src', src);
    if (next.complete) reveal();
  };

  const hideColorPreview = (card) => {
    if (!card) return;
    // Quema el número vigente: si hay una foto aún cargando, su revelado llegará
    // cuando el ratón ya no esté y se descartará solo.
    const media = card.querySelector('.card-media');
    if (media) nextPreviewToken(media);
    const layers = card.querySelectorAll('[data-color-preview]');
    for (let i = 0; i < layers.length; i++) layers[i].classList.remove('is-on');
  };

  const buildCardMarkup = (product, productIndex) => {
    const cardClassName = product.dgtCertified ? 'card has-dgt' : 'card';
    const cardAttrs = [
      'class="' + cardClassName + '"',
      'id="p-' + esc(product.id) + '"',
      'tabindex="0"',
      'data-name="' + esc(product.name || '') + '"',
      'data-sku="' + esc(product.sku || '') + '"',
      'data-was="' + esc(product.compareAtPriceText || '') + '"',
      'data-now="' + esc(product.priceText || '') + '"',
      'data-stock="' + esc(product.stock || 'in_stock') + '"',
      'data-link="' + esc(product.href || '') + '"',
      'aria-label="' + esc(product.homeAriaLabel || product.name || 'Producto') + '"'
    ];
    // Segunda vista del producto: se funde encima al pasar el ratón por la
    // tarjeta (mismo efecto que al pasar por un color). Los 34 productos del
    // catálogo tienen gallery[1] y en todos difiere de la foto de portada.
    const hoverShot = (product.gallery || [])[1];
    if (hoverShot && hoverShot.src) {
      cardAttrs.push('data-hover-image="' + esc(hoverShot.src) + '"');
    }
    return '<article ' + cardAttrs.join(' ') + '><div class="card-media">' + buildCardShotMarkup(product, productIndex) + '</div><div class="card-info"><span class="chip-name">' + esc(product.badgeText || product.menuLabel || product.name || '') + '</span><div class="card-body"><div class="card-brand">' + esc(product.brand || '') + '</div><div class="title">' + esc(product.homeTitle || product.name || '') + '</div></div>' + buildDgtInfoMarkup(product) + '</div><div class="card-bottom">' + buildPriceRowMarkup(product) + '<div class="btn-row"><a class="btn-primary" href="' + esc(product.href || '#') + '" data-buy-button>VISTA</a>' + buildAddToCartButtonMarkup(product) + '</div></div></article>';
  };

  const buildHomeEmptyStateMarkup = (categoryKey) => {
    const meta = getHomeCategoryMeta(categoryKey);
    if (!meta || normalizeHomeCategoryKey(categoryKey) === DEFAULT_HOME_CATEGORY_KEY) return '';
    return '<section class="container catalog-empty-state" aria-label="' + esc(meta.emptyTitle || meta.label || '') + '"><h2>' + esc((meta.emptyTitle || meta.label || '') + ' · Próximamente') + '</h2><p>' + esc(meta.emptyDescription || 'Estamos preparando esta categoría para mostrarla en la home.') + '</p></section>';
  };

  // ===== Brand logos and series visual identity =====
  const SERIES_VISUALS = {
    ecoxtrem: { logo: '/img/ecoxtrem-logo.webp', logoMaxW: 168, logoW: 168, logoH: 42, alt: 'Ecoxtrem Urban Mobility', accent: '#0b3b8c' },
    k:        { logo: '/img/kukirin-logo.webp',  logoMaxW: 132, logoW: 132, logoH: 44, alt: 'KuKirin', accent: '#ff8c51' },
    n:        { accent: '#d11c1c' },
    gt:       { accent: '#0b0c0f' },
    ix:       { accent: '#7c3aed' },
    b:        { accent: '#16a34a' },
    motos:    { accent: '#0ea5e9' },
    acc:      { accent: '#f59e0b' },
    'acc-limit': { accent: '#dc2626' }
  };

  const getSeriesVisual = (seriesKey) => SERIES_VISUALS[String(seriesKey || '').toLowerCase()] || null;

  const buildSeriesRailItem = (category, series, products) => {
    const sectionId = esc(series.homeSectionId || ('series-' + series.key));
    const visual = getSeriesVisual(series.key);
    const count = products.length;
    const labelText = series.label || series.homeTitle || '';
    const labelMarkup = '<span class="hsr-tile-label">' + esc(labelText) + '</span>';
    const countMarkup = count
      ? '<span class="hsr-tile-count" aria-label="' + count + (count === 1 ? ' modelo' : ' modelos') + '">' + count + ' ' + (count === 1 ? 'modelo' : 'modelos') + '</span>'
      : '<span class="hsr-tile-count hsr-tile-count--muted">Próximamente</span>';
    const accentStyle = visual && visual.accent ? ' style="--series-accent:' + visual.accent + '"' : '';

    return '<a class="hsr-tile" role="tab" data-series-link="' + sectionId + '"' + accentStyle + ' href="#' + sectionId + '" aria-label="' + esc('Ver ' + (series.label || series.homeTitle || 'serie')) + '">'
      + labelMarkup
      + countMarkup
      + '</a>';
  };

  const buildSeriesHeroMarkup = (series, products) => {
    const visual = getSeriesVisual(series.key);
    const count = products.length;
    const sectionId = esc(series.homeSectionId || ('series-' + series.key));
    const titleMarkup = (visual && visual.logo)
      ? '<img class="series-hero-logo" src="' + esc(visual.logo) + '" alt="' + esc(visual.alt || series.label || '') + '" loading="lazy" fetchpriority="low" decoding="async" width="' + esc(String(visual.logoW || visual.logoMaxW || 160)) + '" height="' + esc(String(visual.logoH || 44)) + '" style="max-width:' + visual.logoMaxW + 'px" />'
      : '<h2 class="series-hero-title">' + esc(series.homeTitle || series.label || '') + '</h2>';
    const desc = series.homeDescription
      ? '<p class="series-hero-desc">' + esc(series.homeDescription) + '</p>'
      : '';
    const kpi = count
      ? '<span class="series-hero-kpi"><strong>' + count + '</strong> ' + (count === 1 ? 'modelo' : 'modelos') + '</span>'
      : '';
    const accentStyle = visual && visual.accent ? ' style="--series-accent:' + visual.accent + '"' : '';
    return '<section class="series series-hero" id="' + sectionId + '"' + accentStyle + '>'
      + '<div class="container">'
        + '<div class="series-hero-card">'
          + '<div class="series-hero-content">'
            + '<span class="series-hero-eyebrow">' + esc((series.label || '').toString()) + '</span>'
            + titleMarkup
            + desc
          + '</div>'
          + (kpi ? '<div class="series-hero-meta">' + kpi + '</div>' : '')
        + '</div>'
      + '</div>'
    + '</section>';
  };

  const renderHomeSeriesRail = (orderedCategories) => {
    const rail = document.querySelector('[data-home-series-rail]');
    const strip = document.querySelector('.home-series-rail-strip');
    if (!rail) return;

    const activeCategory = (orderedCategories || []).find((cat) => cat.key === activeHomeCategoryKey)
      || (orderedCategories || [])[0];

    const items = [];
    if (activeCategory && Array.isArray(activeCategory.series)) {
      activeCategory.series.forEach((series) => {
        const products = Array.isArray(series.products)
          ? series.products
          : getSeriesProducts(series.key).filter((p) => p.showOnHome !== false);
        if (!products.length) return;
        items.push(buildSeriesRailItem(activeCategory, series, products));
      });
    }

    if (!items.length) {
      // Ocultar el rail solo cuando no haya series disponibles en la categoría activa.
      rail.innerHTML = '';
      if (strip) strip.hidden = true;
      return;
    }

    if (strip) strip.hidden = false;
    rail.innerHTML = items.join('');
  };

  const renderHomeCatalog = (categoryKey = activeHomeCategoryKey) => {
    const root = document.querySelector('[data-home-catalog-root]');
    if (!root) return;

    activeHomeCategoryKey = normalizeHomeCategoryKey(categoryKey);
    syncHomeCategoryButtons();

    const orderedCategories = getOrderedHomeCategories(activeHomeCategoryKey);
    const hasSelectedCategory = orderedCategories.some((category) => category.key === activeHomeCategoryKey);
    const leadingMarkup = hasSelectedCategory ? '' : buildHomeEmptyStateMarkup(activeHomeCategoryKey);

    root.innerHTML = leadingMarkup + orderedCategories.map((category) => {
      const categoryHeader = category.showHeaderOnHome
        ? '<section class="catalog-category"><div class="container"><h2>' + esc(category.homeTitle || category.label || '') + '</h2>' + (category.homeDescription ? '<p>' + esc(category.homeDescription) + '</p>' : '') + '</div></section>'
        : '';

      const seriesMarkup = (category.series || []).map((series) => {
        const products = Array.isArray(series.products)
          ? series.products
          : getSeriesProducts(series.key).filter((product) => product.showOnHome !== false);
        if (!products.length) return '';
        const listingId = series.listingSectionId ? ' id="' + esc(series.listingSectionId) + '"' : '';
        const heroMarkup = buildSeriesHeroMarkup(series, products);
        return heroMarkup
          + '<section' + listingId + ' class="container series-products" aria-label="' + esc(series.homeAriaLabel || ('Lista de productos ' + (series.label || ''))) + '" data-series-products="' + esc(series.homeSectionId || ('series-' + series.key)) + '">'
            + '<div class="grid">'
              + products.map((product, idx) => buildCardMarkup(product, idx)).join('')
            + '</div>'
          + '</section>';
      }).join('');

      const categorySectionId = getHomeCategorySectionId(category.key);
      const categoryFallback = !seriesMarkup
        ? '<section class="container catalog-empty-state" aria-label="' + esc(category.homeTitle || category.label || '') + '"><h2>' + esc((category.homeTitle || category.label || '') + ' · Próximamente') + '</h2><p>Estamos preparando esta categoría para mostrarla en la home.</p></section>'
        : '';

      return '<section class="home-category-section" id="' + esc(categorySectionId) + '" data-home-category-section="' + esc(category.key) + '">'
        + categoryHeader
        + seriesMarkup
        + categoryFallback
      + '</section>';
    }).join('');

    root.classList.add('is-hydrated');

    renderHomeSeriesRail(orderedCategories);
  };

  // ===== Series rail: scrollspy + smooth scroll =====
  let seriesRailObserver = null;
  let seriesRailClickArmed = false;
  let seriesRailResizeBound = false;
  let seriesRailPendingTargetId = '';
  let seriesRailPendingDeadline = 0;
  let seriesRailPendingTick = 0;
  let seriesRailPostClickLockUntil = 0;
  let seriesRailViewportSyncBound = false;
  let seriesRailViewportTick = 0;
  let homeCategoryObserver = null;
  let homeCategoryScrollBound = false;
  let homeCategoryScrollTick = 0;
  let homeCategoryPendingKey = '';
  let homeCategoryPendingDeadline = 0;

  const getPreferredScrollBehavior = () => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
    } catch (_) {
      return 'smooth';
    }
  };

  const clearHomeCategoryPending = () => {
    homeCategoryPendingKey = '';
    homeCategoryPendingDeadline = 0;
  };

  const clearSeriesRailPending = () => {
    seriesRailPendingTargetId = '';
    seriesRailPendingDeadline = 0;
    if (seriesRailPendingTick) {
      window.clearInterval(seriesRailPendingTick);
      seriesRailPendingTick = 0;
    }
  };

  const resolveSeriesRailFromViewport = () => {
    const sections = $all('.series-hero[id]');
    if (!sections.length) return null;

    const stickyLine = getHomeStickyOffset() + 6;
    let bestAbove = null;
    let nearestBelow = null;

    sections.forEach((section) => {
      if (!section.id) return;
      const top = section.getBoundingClientRect().top;
      const item = { id: section.id, top };

      if (top <= stickyLine) {
        if (!bestAbove || item.top > bestAbove.top) bestAbove = item;
      } else if (!nearestBelow || item.top < nearestBelow.top) {
        nearestBelow = item;
      }
    });

    const active = bestAbove || nearestBelow;
    if (!active || !active.id) return null;
    return {
      id: active.id,
      top: active.top,
      stickyLine
    };
  };

  const syncSeriesRailFromViewport = () => {
    if (seriesRailPendingTargetId) {
      if (Date.now() < seriesRailPendingDeadline) return;
      clearSeriesRailPending();
    }
    if (Date.now() < seriesRailPostClickLockUntil) return;

    const resolved = resolveSeriesRailFromViewport();
    if (!resolved) return;

    const rail = document.querySelector('[data-home-series-rail]');
    const current = rail ? rail.querySelector('[data-series-link].is-active') : null;
    const currentId = current ? current.getAttribute('data-series-link') : '';
    if (currentId === resolved.id) return;

    // Switch only when the next section is close enough to the sticky anchor.
    if (resolved.top > resolved.stickyLine + 24) return;
    setActiveSeriesRailTile(resolved.id, { center: true, behavior: getPreferredScrollBehavior() });
  };

  const scheduleSeriesRailViewportSync = () => {
    if (seriesRailViewportTick) return;
    seriesRailViewportTick = window.requestAnimationFrame(() => {
      seriesRailViewportTick = 0;
      syncSeriesRailFromViewport();
    });
  };

  const setActiveSeriesRailTile = (sectionId, options = {}) => {
    const {
      center = false,
      behavior = 'auto'
    } = options;
    const rail = document.querySelector('[data-home-series-rail]');
    if (!rail) return;
    const targetId = String(sectionId || '').trim();
    if (!targetId) return;

    const current = rail.querySelector('[data-series-link].is-active');
    const currentId = current ? current.getAttribute('data-series-link') : '';
    if (currentId === targetId && !center) return;

    const tiles = rail.querySelectorAll('[data-series-link]');
    tiles.forEach((tile) => {
      const isActive = tile.getAttribute('data-series-link') === targetId;
      tile.classList.toggle('is-active', isActive);
      tile.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive && center && rail.scrollWidth > rail.clientWidth) {
        const left = tile.offsetLeft - (rail.clientWidth / 2) + (tile.clientWidth / 2);
        rail.scrollTo({ left: Math.max(0, left), behavior });
      }
    });
  };

  const initSeriesRail = () => {
    const rail = document.querySelector('[data-home-series-rail]');
    if (!rail) return;

    // Sync sticky top position: header + category strip height (función de módulo,
    // ya ejecutada temprano en boot; aquí solo reaseguramos y enlazamos el resize).
    setRailStickyTop();
    if (!seriesRailResizeBound) {
      window.addEventListener('resize', setRailStickyTop, { passive: true });
      seriesRailResizeBound = true;
    }

    if (!seriesRailClickArmed) {
      seriesRailClickArmed = true;
      rail.addEventListener('click', (event) => {
        const link = event.target.closest('[data-series-link]');
        if (!link) return;
        const sectionId = link.getAttribute('data-series-link');
        const target = sectionId ? document.getElementById(sectionId) : null;
        if (target) {
          event.preventDefault();
          const header = document.getElementById('siteHeader');
          const strip = document.querySelector('.home-category-strip');
          const railStrip = document.querySelector('.home-series-rail-strip');
          const headerOffset = (header ? header.offsetHeight : 72) + (strip ? strip.offsetHeight : 0) + (railStrip ? railStrip.offsetHeight : 0) + 8;
          const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;

          clearSeriesRailPending();
          seriesRailPostClickLockUntil = Date.now() + 900;
          seriesRailPendingTargetId = sectionId;
          seriesRailPendingDeadline = Date.now() + 2200;

          seriesRailPendingTick = window.setInterval(() => {
            if (!seriesRailPendingTargetId) {
              clearSeriesRailPending();
              return;
            }
            const pendingTarget = document.getElementById(seriesRailPendingTargetId);
            if (!pendingTarget) {
              clearSeriesRailPending();
              return;
            }
            const distance = Math.abs(pendingTarget.getBoundingClientRect().top - headerOffset);
            const timedOut = Date.now() >= seriesRailPendingDeadline;
            if (distance <= 10 || timedOut) {
              const keepActiveId = seriesRailPendingTargetId;
              clearSeriesRailPending();
              if (keepActiveId) {
                seriesRailPostClickLockUntil = Date.now() + 700;
                setActiveSeriesRailTile(keepActiveId);
              }
            }
          }, 80);

          window.scrollTo({ top, behavior: getPreferredScrollBehavior() });
          setActiveSeriesRailTile(sectionId, { center: true, behavior: getPreferredScrollBehavior() });
        }
      });
    }

    if (seriesRailObserver) {
      try { seriesRailObserver.disconnect(); } catch (_) {}
      seriesRailObserver = null;
    }

    if (!('IntersectionObserver' in window)) return;

    const sections = $all('.series-hero[id]');
    if (!sections.length) return;

    if (!seriesRailViewportSyncBound) {
      window.addEventListener('scroll', scheduleSeriesRailViewportSync, { passive: true });
      window.addEventListener('resize', scheduleSeriesRailViewportSync, { passive: true });
      seriesRailViewportSyncBound = true;
    }

    // Initial state on load/reload: mark the section currently in viewport.
    const viewportCenter = window.innerHeight * 0.42;
    const initiallyVisible = sections
      .map((section) => ({
        id: section.id,
        top: section.getBoundingClientRect().top
      }))
      .filter((item) => item.top <= viewportCenter)
      .sort((a, b) => b.top - a.top);
    if (initiallyVisible[0] && initiallyVisible[0].id) {
      setActiveSeriesRailTile(initiallyVisible[0].id, { center: true, behavior: 'auto' });
    } else if (sections[0] && sections[0].id) {
      setActiveSeriesRailTile(sections[0].id, { center: true, behavior: 'auto' });
    }
    seriesRailPostClickLockUntil = 0;
    scheduleSeriesRailViewportSync();

    seriesRailObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (seriesRailPendingTargetId) {
        if (visible[0] && visible[0].target.id === seriesRailPendingTargetId) {
          const matchedId = seriesRailPendingTargetId;
          clearSeriesRailPending();
          seriesRailPostClickLockUntil = Date.now() + 700;
          setActiveSeriesRailTile(matchedId, { center: true, behavior: getPreferredScrollBehavior() });
          return;
        }
        if (Date.now() < seriesRailPendingDeadline) return;
        clearSeriesRailPending();
      }

      if (visible[0]) {
        scheduleSeriesRailViewportSync();
      }
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach((section) => seriesRailObserver.observe(section));
  };

  const initHomeCategoryNav = () => {
    const nav = document.querySelector('[data-home-category-nav]');
    if (!nav) return;

    if (nav.dataset.bound !== 'true') {
      nav.addEventListener('click', (event) => {
        const button = event.target.closest('[data-home-category]');
        if (!button) return;
        const nextKey = normalizeHomeCategoryKey(button.getAttribute('data-home-category'));
        const targetSection = getCategorySectionElement(nextKey);
        if (!targetSection) return;

        event.preventDefault();

        // Update category state IMMEDIATELY
        activeHomeCategoryKey = nextKey;
        syncHomeCategoryButtons();
        ensureHomeCategoryChipVisible(nextKey, 'auto');

        try {
          sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
        } catch (_) {}

        // Update rail IMMEDIATELY
        const orderedCategories = getOrderedHomeCategories(activeHomeCategoryKey);
        renderHomeSeriesRail(orderedCategories);
        initSeriesRail();

        // Force instant scroll by temporarily disabling CSS scroll-behavior
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlScrollBehavior = html.style.scrollBehavior;
        const prevBodyScrollBehavior = body.style.scrollBehavior;

        html.style.scrollBehavior = 'auto';
        body.style.scrollBehavior = 'auto';

        const top = targetSection.getBoundingClientRect().top + window.scrollY - getHomeStickyOffset();
        window.scrollTo(0, top);

        html.style.scrollBehavior = prevHtmlScrollBehavior;
        body.style.scrollBehavior = prevBodyScrollBehavior;

        // Set lock ONLY to prevent observer from overwriting during stabilization
        clearHomeCategoryPending();
        homeCategoryPendingKey = nextKey;
        homeCategoryPendingDeadline = Date.now() + 400;
      });
      nav.dataset.bound = 'true';
    }

    if (!homeCategoryScrollBound) {
      window.addEventListener('scroll', scheduleHomeCategoryViewportSync, { passive: true });
      window.addEventListener('resize', scheduleHomeCategoryViewportSync, { passive: true });
      homeCategoryScrollBound = true;
    }

    syncHomeCategoryButtons();
    ensureHomeCategoryChipVisible(activeHomeCategoryKey, 'auto');
    scheduleHomeCategoryViewportSync();
  };

  const initHomeCategorySpy = () => {
    if (homeCategoryObserver) {
      try { homeCategoryObserver.disconnect(); } catch (_) {}
      homeCategoryObserver = null;
    }

    const sections = $all('.home-category-section[data-home-category-section]');
    if (!sections.length) return;

    syncHomeCategoryFromViewport();

    if ('IntersectionObserver' in window) {
      homeCategoryObserver = new IntersectionObserver(() => {
        scheduleHomeCategoryViewportSync();
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

      sections.forEach((section) => homeCategoryObserver.observe(section));
    }
  };

  // El panel de Productos (escritorio y móvil) lo pinta js/products-menu.js, que
  // es su único dueño: el mismo markup para las dos superficies. index-head.js lo
  // carga antes que este fichero. No reimplantes el render aquí — la copia
  // paralela que había es justo lo que hacía que escritorio y móvil divergieran.
  const renderSharedProductMenus = (root = document) => {
    const api = window.SS_PRODUCT_MENUS;
    return !!(api && api.render(root));
  };

  const initDesktopProductsMenu = () => {
    const api = window.SS_PRODUCT_MENUS;
    if (api) api.initDesktop();
  };



  const initCardReveal = () => {
    const cards = [];
    // Escalonar por COLUMNA real de cada grid (responsive), no por índice global:
    // así el orden de aparición sigue las filas y no se ve desordenado.
    $all('.grid').forEach((grid) => {
      const gridCards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .card'));
      if (!gridCards.length) return;
      let cols = 1;
      try {
        const tpl = getComputedStyle(grid).gridTemplateColumns;
        cols = Math.max(1, (tpl || '').split(' ').filter(Boolean).length);
      } catch (_) {}
      gridCards.forEach((card, i) => {
        card.classList.add('reveal-ready');
        card.style.setProperty('--reveal-delay', `${(i % cols) * 45}ms`);
        cards.push(card);
      });
    });
    if (!cards.length) return;
    const finishReveal = (card) => {
      card.classList.remove('reveal-ready', 'reveal-visible');
      card.style.removeProperty('--reveal-delay');
      card.style.removeProperty('will-change');
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => finishReveal(card));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        // Promover a capa de composición SOLO durante la animación → sin
        // repintar la sombra en cada frame (elimina el jank de bajos FPS).
        card.style.willChange = 'transform, opacity';
        card.classList.add('reveal-visible');
        const onRevealEnd = (ev) => {
          if (ev.propertyName !== 'opacity' && ev.propertyName !== 'transform') return;
          finishReveal(card);
        };
        card.addEventListener('transitionend', onRevealEnd, { once:true });
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -5% 0px'
    });
    cards.forEach((card) => observer.observe(card));
  };

  const initHeroCarousel = () => {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root || root.dataset.bound === 'true') return;

    const viewport = root.querySelector('[data-hero-viewport]');
    const track = root.querySelector('[data-hero-track]');
    const prev = root.querySelector('[data-hero-prev]');
    const next = root.querySelector('[data-hero-next]');
    const dotsWrap = root.querySelector('[data-hero-dots]');
    if (!viewport || !track) return;

    const slides = Array.from(track.querySelectorAll('.hero-slide'));
    if (!slides.length) return;

    let active = 0;
    let timer = 0;
    let warmupTimer = 0;
    let pauseAuto = false;
    let hoverPause = false;
    let focusPause = false;
    let pointerPause = false;
    // El hero mide ~150px en móvil: en cuanto se baja un poco queda fuera de
    // pantalla, pero el autoplay seguía cambiando de portada cada 3 s durante
    // toda la sesión, animando transforms que nadie ve. Ya se pausaba con la
    // pestaña oculta, con el ratón encima y con el foco, pero no al salir del
    // viewport.
    let offscreenPause = false;
    const autoplayMs = 3000;

    const clampIndex = (idx) => {
      const len = slides.length;
      return ((idx % len) + len) % len;
    };

    const getImageForSlide = (idx) => {
      const slide = slides[clampIndex(idx)];
      return slide ? slide.querySelector('img') : null;
    };

    const applyHeightFromActive = () => {
      const image = getImageForSlide(active);
      const width = viewport.clientWidth;
      if (!image || !width) return;

      const setFrom = (w, h) => {
        if (!w || !h) return;
        const nextHeight = Math.max(130, Math.round((width * h) / w));
        viewport.style.height = nextHeight + 'px';
      };

      if (image.naturalWidth && image.naturalHeight) {
        setFrom(image.naturalWidth, image.naturalHeight);
      } else {
        const onLoad = () => {
          setFrom(image.naturalWidth, image.naturalHeight);
          image.removeEventListener('load', onLoad);
        };
        image.addEventListener('load', onLoad);
      }
    };

    let dots = [];
    let dotTargets = [];
    // Un punto por portada: la cantidad de puntos siempre coincide con el nº de imágenes.
    const getDotTargets = () => slides.map((_, idx) => idx);

    const buildDots = () => {
      if (!dotsWrap) return;
      dotTargets = getDotTargets();
      dotsWrap.innerHTML = '';
      dots = dotTargets.map((targetIdx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'hero-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Ir a portada ' + (targetIdx + 1));
        dot.addEventListener('click', () => goTo(targetIdx, true));
        dotsWrap.appendChild(dot);
        return dot;
      });
    };

    const updateDots = () => {
      if (!dotsWrap) return;
      const nextTargets = getDotTargets();
      const targetChanged = nextTargets.length !== dotTargets.length || nextTargets.some((value, idx) => value !== dotTargets[idx]);
      if (targetChanged || dots.length !== nextTargets.length) buildDots();
      dots.forEach((dot, idx) => {
        const isActive = dotTargets[idx] === active;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    };

    const goTo = (idx, fromUser = false) => {
      active = clampIndex(idx);
      track.style.transform = 'translateX(' + (-active * 100) + '%)';
      slides.forEach((slide, i) => {
        const current = i === active;
        slide.classList.toggle('is-active', current);
        slide.setAttribute('aria-hidden', current ? 'false' : 'true');
        slide.setAttribute('tabindex', current ? '0' : '-1');
      });
      updateDots();
      applyHeightFromActive();
      if (fromUser) restartAutoplay();
    };

    const stopAutoplay = () => {
      if (warmupTimer) {
        window.clearTimeout(warmupTimer);
        warmupTimer = 0;
      }
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (slides.length <= 1 || pauseAuto) return;
      timer = window.setInterval(() => {
        goTo(active + 1);
      }, autoplayMs);
    };

    const restartAutoplay = () => {
      startAutoplay();
    };

    const syncAutoplayPause = () => {
      pauseAuto = hoverPause || focusPause || pointerPause || offscreenPause;
      if (pauseAuto) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    };

    if (dotsWrap) buildDots();

    if (prev) prev.addEventListener('click', () => goTo(active - 1, true));
    if (next) next.addEventListener('click', () => goTo(active + 1, true));

    let pointerStartX = 0;
    let pointerCurrentX = 0;
    let pointerStartTime = 0;
    let pointerActive = false;
    const swipeThreshold = () => Math.max(44, viewport.clientWidth * 0.1);

    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerActive = true;
      pointerPause = true;
      syncAutoplayPause();
      pointerStartX = event.clientX;
      pointerCurrentX = event.clientX;
      pointerStartTime = performance.now();
      try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!pointerActive) return;
      pointerCurrentX = event.clientX;
    });

    const finishSwipe = (event) => {
      if (!pointerActive) return;
      pointerActive = false;
      pointerPause = false;
      syncAutoplayPause();
      try { viewport.releasePointerCapture(event.pointerId); } catch (_) {}
      const dx = pointerCurrentX - pointerStartX;
      const dt = performance.now() - pointerStartTime;
      const shouldSwipe = Math.abs(dx) > swipeThreshold() || (Math.abs(dx) > 26 && dt < 220);
      if (!shouldSwipe) return;
      goTo(active + (dx < 0 ? 1 : -1), true);
    };

    viewport.addEventListener('pointerup', finishSwipe);
    viewport.addEventListener('pointercancel', finishSwipe);

    root.addEventListener('mouseenter', () => {
      hoverPause = true;
      syncAutoplayPause();
    });
    root.addEventListener('mouseleave', () => {
      hoverPause = false;
      syncAutoplayPause();
    });
    root.addEventListener('focusin', () => {
      focusPause = true;
      syncAutoplayPause();
    });
    root.addEventListener('focusout', () => {
      focusPause = false;
      syncAutoplayPause();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else if (!pauseAuto) {
        startAutoplay();
      }
    });

    // Detiene el autoplay mientras el hero no esté a la vista. Mismo patrón de
    // IntersectionObserver que ya usan el rail de series y las categorías.
    // Sin soporte, se queda como estaba (siempre activo).
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          offscreenPause = !entry.isIntersecting;
          syncAutoplayPause();
        });
      }, { threshold: 0 }).observe(root);
    }

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(active - 1, true);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(active + 1, true);
      }
    });

    let lastWheelAt = 0;
    root.addEventListener('wheel', (event) => {
      const now = Date.now();
      if (now - lastWheelAt < 320) return;

      const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(primaryDelta) < 18) return;

      event.preventDefault();
      lastWheelAt = now;
      goTo(active + (primaryDelta > 0 ? 1 : -1), true);
    }, { passive: false });

    const onResize = () => applyHeightFromActive();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('load', onResize, { once: true });

    goTo(0);
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => applyHeightFromActive());
      });
    }
    window.setTimeout(() => applyHeightFromActive(), 380);
    startAutoplay();
    root.dataset.bound = 'true';
  };

  const initDgtTooltips = () => {
    const toggles = $all('.dgt-tooltip-toggle');
    if (!toggles.length) return;

    if (!document.body.__scootshopDgtTooltipApi) {
      let floating = document.querySelector('.dgt-floating-tooltip');
      if (!floating) {
        floating = document.createElement('div');
        floating.className = 'dgt-floating-tooltip';
        floating.setAttribute('role', 'tooltip');
        document.body.appendChild(floating);
      }

      let activeToggle = null;
      const isMobileView = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

      const placeTooltip = (toggle) => {
        const rect = toggle.getBoundingClientRect();
        const mobileView = isMobileView();
        const maxWidth = Math.min(mobileView ? 230 : 280, window.innerWidth - 20);
        floating.style.maxWidth = maxWidth + 'px';
        floating.style.left = '0px';
        floating.style.top = '0px';
        floating.classList.add('is-visible');
        const tooltipRect = floating.getBoundingClientRect();
        let left = mobileView ? (rect.left + (rect.width / 2) - (tooltipRect.width / 2)) : (rect.right - tooltipRect.width);
        let top = rect.bottom + (mobileView ? 8 : 10);
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
        if (top + tooltipRect.height > window.innerHeight - 10) {
          top = rect.top - tooltipRect.height - 10;
          floating.classList.add('is-above');
        } else {
          floating.classList.remove('is-above');
        }
        if (top < 10) top = 10;
        floating.style.left = left + 'px';
        floating.style.top = top + 'px';
        let arrowLeft = rect.left + (rect.width / 2) - left;
        const minArrow = 20;
        const maxArrow = tooltipRect.width - 20;
        if (arrowLeft < minArrow) arrowLeft = minArrow;
        if (arrowLeft > maxArrow) arrowLeft = maxArrow;
        floating.style.setProperty('--dgt-arrow-left', arrowLeft + 'px');
      };

      const showTooltip = (toggle) => {
        activeToggle = toggle;
        toggles.forEach((item) => {
          item.setAttribute('aria-expanded', item === toggle ? 'true' : 'false');
        });
        floating.textContent = toggle.getAttribute('data-tooltip-text') || '';
        placeTooltip(toggle);
      };

      const hideTooltip = () => {
        activeToggle = null;
        toggles.forEach((item) => item.setAttribute('aria-expanded', 'false'));
        floating.classList.remove('is-visible', 'is-above');
      };

      document.addEventListener('mousemove', (event) => {
        if (!activeToggle || isMobileView()) return;
        const overToggle = toggles.some((toggle) => toggle.contains(event.target));
        const overTooltip = floating.contains(event.target);
        if (!overToggle && !overTooltip) hideTooltip();
      });
      document.addEventListener('click', (event) => {
        const clickedToggle = toggles.some((toggle) => toggle.contains(event.target));
        const clickedTooltip = floating.contains(event.target);
        if (!clickedToggle && !clickedTooltip) hideTooltip();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideTooltip();
      });
      window.addEventListener('resize', () => {
        if (activeToggle) placeTooltip(activeToggle);
      });
      window.addEventListener('scroll', () => {
        if (activeToggle) hideTooltip();
      }, { passive:true });

      document.body.__scootshopDgtTooltipApi = {
        isMobileView,
        showTooltip,
        hideTooltip,
        isActiveToggle: (toggle) => activeToggle === toggle
      };
    }

    const api = document.body.__scootshopDgtTooltipApi;

    toggles.forEach((toggle) => {
      if (toggle.dataset.dgtTooltipBound === 'true') return;
      toggle.addEventListener('mouseenter', () => {
        if (api.isMobileView()) return;
        api.showTooltip(toggle);
      });
      toggle.addEventListener('focus', () => {
        if (api.isMobileView()) return;
        api.showTooltip(toggle);
      });
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (api.isActiveToggle(toggle) && api.isMobileView()) {
          api.hideTooltip();
          return;
        }
        api.showTooltip(toggle);
      });
      toggle.dataset.dgtTooltipBound = 'true';
    });
  };

  const initCards = () => {
    const normalizeLink = (link) => {
      let out = (link || '').trim();
      if (!out) return '';
      if (!out.startsWith('http') && !out.startsWith('/') && !out.startsWith('#')) out = '/' + out;
      return out;
    };

    const productMap = new Map(
      getCatalogProducts()
        .filter((product) => product && product.href)
        .map((product) => [normalizePath(product.href), product])
    );

    $all('.card').forEach((card) => {
      const getCardLink = () => {
        let link = normalizeLink(card.dataset.link);
        if (!link) {
          const a = card.querySelector('a.btn-primary[href]');
          link = normalizeLink(a ? a.getAttribute('href') : '');
        }
        return link;
      };

      const link = getCardLink();
      const product = productMap.get(normalizePath(link));

      if (product) {
        if (product.name) card.dataset.name = product.name;
        if (product.sku) card.dataset.sku = product.sku;
        if (product.brand) {
          const brandEl = card.querySelector('.card-brand');
          if (brandEl) brandEl.textContent = product.brand;
        }
        if (product.homeTitle) {
          const titleEl = card.querySelector('.title');
          if (titleEl) titleEl.textContent = product.homeTitle;
        }
        if (product.badgeText) {
          const chipEl = card.querySelector('.chip-name');
          if (chipEl) chipEl.textContent = product.badgeText;
        }
        if (product.href) card.dataset.productUrl = product.href;
        if (product.image) card.dataset.image = product.image;
        if (product.priceText) {
          card.dataset.now = product.priceText;
          const priceNow = card.querySelector('.price-now');
          if (priceNow) priceNow.textContent = product.priceText;
        }
        if (product.compareAtPriceText) {
          card.dataset.was = product.compareAtPriceText;
          const priceWas = card.querySelector('.price-was');
          if (priceWas) priceWas.textContent = product.compareAtPriceText;
        }
      }

      /* El botón de añadir con variantes NO se enlaza aquí: lo escucha por
         delegación js/variant-pop.js, el mismo módulo que atiende la caja "Añade
         algo más" de las fichas. Aquí solo hay que asegurarse de que el archivo
         esté pedido. */
      if (card.querySelector('[data-open-variants]')) ensureVariantPop();

      // Hover sobre la tarjeta: la segunda vista del producto entra con un
      // fundido + escala. Se superpone en una capa aparte, sin tocar la foto de
      // portada que hay debajo.
      const hoverImage = card.dataset.hoverImage
        || (product && (product.gallery || [])[1] && product.gallery[1].src)
        || '';
      if (hoverImage && CAN_HOVER) {
        /* Si la burbuja de variantes está abierta desde ESTA tarjeta manda ella: la
           foto del acabado que se está mirando no debe quedar tapada por la vista
           alternativa. Se mira por el aria-expanded del propio botón, que es lo que
           deja puesto el módulo, en vez de por una variable suya: así el home no
           depende de sus interioridades. */
        const bubbleOwnsCard = () => !!card.querySelector('[data-open-variants][aria-expanded="true"]');
        // Retardo de intención: al recorrer la parrilla se rozan muchas tarjetas
        // de paso. Sin esperar, cada una descargaría su segunda foto (~62 KB de
        // media; 2 MB si se pasan las 34). 110 ms distinguen "pasar de largo" de
        // "pararse a mirar" y no se notan al hacer hover a propósito.
        let hoverTimer = 0;
        card.addEventListener('mouseenter', () => {
          if (bubbleOwnsCard()) return;
          hoverTimer = window.setTimeout(() => {
            hoverTimer = 0;
            showColorPreview(card, hoverImage);
          }, 110);
        });
        card.addEventListener('mouseleave', () => {
          if (hoverTimer) { window.clearTimeout(hoverTimer); hoverTimer = 0; }
          if (bubbleOwnsCard()) return;
          hideColorPreview(card);
        });
      }

      if (link) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dgt-tooltip')) return;
          if (e.target.closest('[data-add-to-cart]')) return;
          // Sin esto, abrir el cuadro de opciones navegaría a la ficha del producto.
          if (e.target.closest('[data-open-variants]')) return;
          window.location.href = link;
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = link;
          }
        });
      }

      $all('[data-buy-button]', card).forEach((el) => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('keydown', (e) => e.stopPropagation());
      });
    });
  };

  // API compartida para reutilizar el mismo render/hidratación de tarjetas fuera de Home.
  window.SCOOTSHOP_HOME_CARD_API = {
    buildCardMarkup: (product, productIndex) => buildCardMarkup(product, Number(productIndex) || 0),
    hydrate: () => {
      initCards();
      initDgtTooltips();
    },
    /* Las usa js/variant-pop.js: al elegir un acabado en la burbuja abierta desde una
       tarjeta, se enseña la foto de ese acabado sobre la portada, que es lo que hacía
       la paleta antigua al pasar el ratón por un color. Se exponen desde aquí porque
       el fundido son dos capas propias del home (.card-color-preview) y su montaje no
       tiene por qué salir de este archivo. */
    previewColor: (card, src) => showColorPreview(card, src),
    clearPreview: (card) => hideColorPreview(card)
  };

  const updateHomeStructuredData = () => {
    const orderedProducts = getOrderedHomeCategories()
      .flatMap((category) => (category.series || []).flatMap((series) => getSeriesProducts(series.key)));
    if (!orderedProducts.length) return;
    const desiredUrls = orderedProducts.map((product) => 'https://scootshop.co' + normalizePath(product.href));
    $all('script[type="application/ld+json"]').forEach((block) => {
      const raw = block.textContent || '';
      if (!raw.trim()) return;
      try {
        const data = JSON.parse(raw);
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        let changed = false;
        graph.forEach((item) => {
          if (!item || item['@type'] !== 'ItemList' || item['@id'] !== 'https://scootshop.co/#products') return;
          const currentElements = Array.isArray(item.itemListElement) ? item.itemListElement : [];
          const currentUrls = currentElements.map((entry) => entry && entry.url).filter(Boolean);
          const isSame = currentUrls.length === desiredUrls.length && currentUrls.every((url, idx) => url === desiredUrls[idx]);
          if (isSame) return;

          item.itemListElement = desiredUrls.map((url, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: url
          }));
          changed = true;
        });
        if (changed) block.textContent = JSON.stringify(data, null, 2);
      } catch (_) {
      }
    });
  };

  const boot = () => {
    // index.js es el bootstrap de la HOME. También se carga en las fichas de
    // producto, pero SOLO para exponer SCOOTSHOP_HOME_CARD_API (las tarjetas de
    // "También te puede interesar"), que ya se define a nivel de módulo. En las
    // fichas, la cabecera, el footer, los menús y el resto de la UI común los
    // inicializa global-assets-app.js, así que correr boot() ahí sería redundante
    // (y era lo que restauraba el scroll de la home provocando el salto). Fuera de
    // la home no hay nada que arrancar: el marcador estático [data-hero-carousel]
    // solo existe en index.html.
    if (!document.querySelector('[data-hero-carousel]')) return;

    initHomeCategoryNav();
    renderHomeCatalog(activeHomeCategoryKey);
    // Fija la posición sticky del rail antes del primer paint para que no salte.
    setRailStickyTop();

    // Salto de scroll instantáneo (sin animación) respetando la cabecera fija. El
    // <html> ya no usa scroll-behavior:smooth global, pero forzamos behavior:'instant'
    // para que el reposicionado al restaurar nunca se anime (defensivo, clave en iOS).
    const jumpInstant = (targetY) => {
      const y = Math.max(0, targetY);
      // behavior:'instant' fuerza salto sin animación aunque hubiera scroll-behavior
      // smooth (clave en iOS, donde alternar el estilo no siempre lo suprimía).
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
      catch (_) { window.scrollTo(0, y); }
    };

    // ¿Llegamos con un ancla? (p. ej. /#faq al pulsar el menú desde /cuenta)
    let hashTarget = null;
    const rawHash = (window.location.hash || '').slice(1);
    if (rawHash) {
      let hashId = rawHash;
      try { hashId = decodeURIComponent(rawHash); } catch (_) {}
      hashTarget = document.getElementById(hashId);
    }

    /* El ancla de la URL (p. ej. /#faq desde el menú) sí es cosa de la home: se
       calcula tras pintar el catálogo, porque antes el destino no existe. Volver
       atrás NO se toca aquí — de eso se ocupa js/scroll-memoria.js, el único dueño
       del scroll, que además sabe distinguir una vuelta de una visita nueva. */
    if (hashTarget) {
      const header = document.getElementById('siteHeader');
      const headerOffset = header ? header.offsetHeight : 0;
      jumpInstant(hashTarget.getBoundingClientRect().top + window.scrollY - headerOffset);
    }

    // Al volver, las tarjetas no se presentan con su animación de entrada: el cliente
    // ya las había visto. Lo decide el arranque en línea del <head>.
    const isBack = !!(window.SS_SCROLL && window.SS_SCROLL.volviendo);

    renderSharedProductMenus();
    initDesktopProductsMenu();
    setYear();
    setVh();
    window.addEventListener('resize', setVh, { passive:true });
    window.addEventListener('orientationchange', setVh, { passive:true });

    const hydrateAfterPaint = () => {
      initHeroCarousel();
      initCards();
      runIdle(() => {
        updateHomeStructuredData();
        if (!isBack) initCardReveal();
        initDgtTooltips();
        initSeriesRail();
        initHomeCategorySpy();
      });
    };

    // requestAnimationFrame may be heavily throttled on inactive tabs.
    // Keep a short timeout fallback so the hero remains interactive quickly.
    let didHydrate = false;
    const runHydrate = () => {
      if (didHydrate) return;
      didHydrate = true;
      hydrateAfterPaint();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(runHydrate);
      window.setTimeout(runHydrate, 140);
    } else {
      window.setTimeout(runHydrate, 0);
    }
  };

  const ensureProductsThenBoot = () => {
    let booted = false;
    const startBoot = () => {
      if (booted) return;
      booted = true;
      try { boot(); } catch (e) { console.error('boot error', e); }
    };

    if (Array.isArray(window.SCOOTSHOP_PRODUCTS)) {
      // data already available
      return startBoot();
    }

    // Try to find the products script tag and wait for its load event
    const prodScript = Array.from(document.scripts || []).find(s => s && s.src && s.src.indexOf('/data/products.js') !== -1);
    if (prodScript) {
      // If already loaded according to readyState
      if (prodScript.readyState === 'complete' || prodScript.readyState === 'loaded') return startBoot();
      prodScript.addEventListener('load', startBoot, { once: true });
      // If it errors or never loads, fallback to start after short timeout
      prodScript.addEventListener('error', () => setTimeout(startBoot, 200), { once:true });
      // Also poll briefly in case products are injected by other code
      let checks = 0;
      const poll = setInterval(() => {
        if (Array.isArray(window.SCOOTSHOP_PRODUCTS) || checks++ > 50) {
          clearInterval(poll);
          startBoot();
        }
      }, 100);
      return;
    }

    // No script tag found — poll for products for a short period then boot anyway
    let tries = 0;
    const timer = setInterval(() => {
      if (Array.isArray(window.SCOOTSHOP_PRODUCTS) || tries++ > 50) {
        clearInterval(timer);
        startBoot();
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureProductsThenBoot, { once: true });
  } else {
    ensureProductsThenBoot();
  }
})();

(() => {
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      const reason = ev && ev.reason;
      const msg = typeof reason === 'string' ? reason : (reason && (reason.message || (reason.toString && reason.toString()))) || '';
      if (typeof msg === 'string' && msg.includes('A listener indicated an asynchronous response by returning true')) {
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
      }
    } catch (e) {
      // noop
    }
  });
})();

/* Prerender de páginas de contenido al pasar el ratón / tocar un enlace
   (Speculation Rules, Chrome) → navegación hacia adelante casi instantánea.
   Mejora progresiva: los navegadores sin soporte lo ignoran. Se excluyen
   pago/cuenta/admin/api para no ejecutar páginas sensibles por adelantado. */
(() => {
  try {
    if (document.getElementById('ss-speculationrules')) return;
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
    const rules = {
      prerender: [{
        where: { and: [
          { href_matches: '/*' },
          { not: { href_matches: '/checkout*' } },
          { not: { href_matches: '/pago*' } },
          { not: { href_matches: '/cuenta*' } },
          { not: { href_matches: '/admin*' } },
          { not: { href_matches: '/api*' } },
          { not: { selector_matches: '[rel~="nofollow"]' } },
          { not: { selector_matches: '[target="_blank"]' } }
        ] },
        eagerness: 'moderate'
      }]
    };
    const s = document.createElement('script');
    s.type = 'speculationrules';
    s.id = 'ss-speculationrules';
    s.textContent = JSON.stringify(rules);
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();
