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

  const getMenuCategories = () => {
    if (typeof window.SCOOTSHOP_getMenuCategories === 'function') return window.SCOOTSHOP_getMenuCategories();

    return [{
      key: 'default',
      label: 'Productos',
      series: getMenuSeries()
    }];
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

  const getMenuSeries = () => {
    if (typeof window.SCOOTSHOP_getMenuSeries === 'function') return window.SCOOTSHOP_getMenuSeries();

    return getHomeSeries().map((series) => ({
      key: series.key,
      label: series.label,
      items: getSeriesProducts(series.key).map((product) => ({
        label: product.menuLabel || product.name,
        href: product.href
      }))
    })).filter((series) => series.items.length);
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

  const initDeferredMapEmbeds = () => {
    const embeds = $all('iframe[data-src]');
    if (!embeds.length) return;

    const loadEmbed = (embed) => {
      if (!embed || embed.dataset.loaded === 'true') return;
      const nextSrc = embed.getAttribute('data-src');
      if (!nextSrc) return;
      embed.dataset.loaded = 'true';
      embed.setAttribute('src', nextSrc);
      embed.classList.remove('is-pending');
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadEmbed(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '240px 0px' });

      embeds.forEach((embed) => observer.observe(embed));
      return;
    }

    runIdle(() => embeds.forEach(loadEmbed));
  };

  const buildGalleryMarkup = (product, productIndex) => {
    const gallery = Array.isArray(product.gallery) && product.gallery.length
      ? product.gallery
      : [{ src: product.image, alt: product.alt || product.name }];

    return gallery.map((media, mediaIndex) => {
      const isLeadSlide = mediaIndex === 0;
      const isHeroCard = productIndex === 0 && mediaIndex === 0;
      const loading = isHeroCard ? 'eager' : 'lazy';
      const fetchpriority = isHeroCard ? ' fetchpriority="high"' : '';
      const srcAttr = isLeadSlide
        ? ' src="' + esc(media.src) + '"'
        : ' data-src="' + esc(media.src) + '"';
      return '<img' + srcAttr + ' alt="' + esc(media.alt || product.alt || product.name) + '" loading="' + loading + '"' + fetchpriority + ' decoding="async" />';
    }).join('');
  };

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

  const buildAddToCartButtonMarkup = (product) => {
    const stock = String(product.stock || 'in_stock').toLowerCase();
    if (stock !== 'in_stock') return '';

    return '<button class="btn-cart" type="button" data-add-to-cart data-added-label="Añadido" data-sku="' + esc(product.sku || '') + '" data-name="' + esc(product.menuLabel || product.name || 'Producto') + '" data-price="' + esc(product.priceText || '') + '" data-url="' + esc(product.href || '') + '" data-image="' + esc(product.image || '') + '" data-stock="in_stock" aria-label="Añadir al carrito ' + esc(product.menuLabel || product.name || 'producto') + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
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
    return '<article ' + cardAttrs.join(' ') + '><div class="card-media"><div class="carousel" data-carousel><div class="carousel-track">' + buildGalleryMarkup(product, productIndex) + '</div></div><div class="carousel-dots" aria-label="Selector de imagenes"></div></div><div class="card-info"><span class="chip-name">' + esc(product.badgeText || product.menuLabel || product.name || '') + '</span><div class="card-body"><div class="card-brand">' + esc(product.brand || '') + '</div><div class="title">' + esc(product.homeTitle || product.name || '') + '</div></div>' + buildDgtInfoMarkup(product) + '</div><div class="card-bottom">' + buildPriceRowMarkup(product) + '<div class="btn-row"><a class="btn-primary" href="' + esc(product.href || '#') + '" data-buy-button>VISTA</a>' + buildAddToCartButtonMarkup(product) + '</div></div></article>';
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
    acc:      { accent: '#f59e0b' }
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

  const refreshHomeCatalog = ({ scrollIntoView = false } = {}) => {
    renderHomeCatalog(activeHomeCategoryKey);
    initCards();
    runIdle(() => {
      initCardReveal();
      initCarousels();
      initDgtTooltips();
      initSeriesRail();
      initHomeCategorySpy();
    });

    if (scrollIntoView) {
      const target = document.querySelector('[data-home-catalog-root]');
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: 'start' });
      }
    }
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

  const renderSharedProductMenus = (root = document) => {
    const menuCategories = getMenuCategories();
    const hasManyCategories = menuCategories.length > 1;

    $all('[data-products-desktop-root]', root).forEach((host) => {
      const categoriesMarkup = menuCategories.map((category) => {
        const groups = (category.series || []).map((series) => {
          const links = series.items.map((item) => '<a href="' + esc(item.href) + '" role="menuitem">' + esc(item.label) + '</a>').join('');
          return '<section class="pc-products-group" aria-label="' + esc(series.label) + '"><button class="pc-series-toggle" type="button" aria-expanded="false" aria-controls="pc-series-' + esc(category.key + '-' + series.key) + '"><span>' + esc(series.label) + '</span><i class="fa-solid fa-chevron-down pc-products-caret" aria-hidden="true"></i></button><div class="pc-series-list" id="pc-series-' + esc(category.key + '-' + series.key) + '" hidden>' + links + '</div></section>';
        }).join('');

        if (!hasManyCategories) return '<div class="pc-products-groups">' + groups + '</div>';
        return '<section class="pc-products-category" aria-label="' + esc(category.label) + '"><div class="pc-products-category-title">' + esc(category.label) + '</div><div class="pc-products-groups">' + groups + '</div></section>';
      }).join('');

      host.innerHTML = '<button class="pc-products-trigger" type="button" aria-expanded="false" aria-controls="pcProductsPanel"><i class="fa-solid fa-cart-shopping nav-icon" aria-hidden="true"></i>Productos</button><div class="pc-products-panel" id="pcProductsPanel" role="menu" aria-label="Submenu de productos" hidden><div class="pc-products-title">' + (hasManyCategories ? 'Categorías' : 'Series') + '</div>' + categoriesMarkup + '</div>';
    });

    $all('[data-products-mobile-root]', root).forEach((menuRoot) => {
      const groups = menuCategories.map((category) => {
        const seriesMarkup = (category.series || []).map((series) => {
          const links = series.items.map((item) => '<a class="mm-sub2-link" href="' + esc(item.href) + '">' + esc(item.label) + '</a>').join('');
          return '<button class="mm-sub-link" data-series="' + esc(category.key + '-' + series.key) + '" type="button"><span>' + esc(series.label.toUpperCase()) + '</span><i class="fa-solid fa-chevron-down mm-chevron-sm"></i></button><div class="mm-sub2" data-series-content="' + esc(category.key + '-' + series.key) + '">' + links + '</div>';
        }).join('');

        if (!hasManyCategories) return '<div class="mm-sub-category-card">' + seriesMarkup + '</div>';
        return '<section class="mm-sub-category-card mm-sub-category" aria-label="' + esc(category.label) + '"><div class="mm-sub-category-title mm-sub-category-title--compact">' + esc(category.label) + '</div>' + seriesMarkup + '</section>';
      }).join('');

      menuRoot.innerHTML = '<div class="mm-sub-shell"><div class="mm-sub-title">' + (hasManyCategories ? 'CATEGORIAS' : 'SERIES') + '</div>' + groups + '</div>';
    });
  };

  const initDesktopProductsMenu = () => {
    $all('[data-products-desktop-root]').forEach((host) => {
      host.dataset.bound = 'false';
    });

    $all('[data-products-desktop-root]').forEach((host) => {
      if (host.dataset.bound === 'true') return;
      const trigger = host.querySelector('.pc-products-trigger');
      const panel = host.querySelector('.pc-products-panel');
      const toggles = $all('.pc-series-toggle', host);
      if (!trigger || !panel) return;

      const closeHost = () => {
        host.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        toggles.forEach((toggle) => {
          const list = document.getElementById(toggle.getAttribute('aria-controls'));
          toggle.setAttribute('aria-expanded', 'false');
          toggle.parentElement.classList.remove('is-open');
          if (list) list.hidden = true;
        });
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const willOpen = panel.hidden;
        $all('[data-products-desktop-root]').forEach((otherHost) => {
          if (otherHost === host) return;
          const otherTrigger = otherHost.querySelector('.pc-products-trigger');
          const otherPanel = otherHost.querySelector('.pc-products-panel');
          if (!otherTrigger || !otherPanel) return;
          otherHost.classList.remove('is-open');
          otherTrigger.setAttribute('aria-expanded', 'false');
          otherPanel.hidden = true;
          $all('.pc-series-toggle', otherHost).forEach((otherToggle) => {
            const list = document.getElementById(otherToggle.getAttribute('aria-controls'));
            otherToggle.setAttribute('aria-expanded', 'false');
            otherToggle.parentElement.classList.remove('is-open');
            if (list) list.hidden = true;
          });
        });
        host.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        panel.hidden = !willOpen;
        if (!willOpen) closeHost();
      });

      toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const list = document.getElementById(toggle.getAttribute('aria-controls'));
          if (!list) return;
          const willOpen = list.hidden;
          toggles.forEach((otherToggle) => {
            const otherList = document.getElementById(otherToggle.getAttribute('aria-controls'));
            otherToggle.setAttribute('aria-expanded', 'false');
            otherToggle.parentElement.classList.remove('is-open');
            if (otherList) otherList.hidden = true;
          });
          toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          toggle.parentElement.classList.toggle('is-open', willOpen);
          list.hidden = !willOpen;
        });
      });

      $all('.pc-series-list a', host).forEach((link) => {
        link.addEventListener('click', () => closeHost());
      });

      host.dataset.bound = 'true';
    });

    if (document.documentElement.dataset.pcProductsMenuBound === 'true') return;

    document.addEventListener('click', (event) => {
      $all('[data-products-desktop-root].is-open').forEach((host) => {
        if (host.contains(event.target)) return;
        const trigger = host.querySelector('.pc-products-trigger');
        const panel = host.querySelector('.pc-products-panel');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (panel) panel.hidden = true;
        host.classList.remove('is-open');
        $all('.pc-series-toggle', host).forEach((toggle) => {
          const list = document.getElementById(toggle.getAttribute('aria-controls'));
          toggle.setAttribute('aria-expanded', 'false');
          toggle.parentElement.classList.remove('is-open');
          if (list) list.hidden = true;
        });
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      $all('[data-products-desktop-root].is-open').forEach((host) => {
        const trigger = host.querySelector('.pc-products-trigger');
        const panel = host.querySelector('.pc-products-panel');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (panel) panel.hidden = true;
        host.classList.remove('is-open');
        $all('.pc-series-toggle', host).forEach((toggle) => {
          const list = document.getElementById(toggle.getAttribute('aria-controls'));
          toggle.setAttribute('aria-expanded', 'false');
          toggle.parentElement.classList.remove('is-open');
          if (list) list.hidden = true;
        });
      });
    });

    document.documentElement.dataset.pcProductsMenuBound = 'true';
  };



  const initCardReveal = () => {
    const cards = $all('.grid > .card');
    if (!cards.length) return;
    const finishReveal = (card) => {
      card.classList.remove('reveal-ready', 'reveal-visible');
      card.style.removeProperty('--reveal-delay');
    };
    cards.forEach((card, idx) => {
      card.classList.add('reveal-ready');
      card.style.setProperty('--reveal-delay', `${Math.min(idx % 4, 3) * 70}ms`);
    });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => finishReveal(card));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        card.classList.add('reveal-visible');
        const onRevealEnd = (ev) => {
          if (ev.propertyName !== 'opacity' && ev.propertyName !== 'transform') return;
          finishReveal(card);
        };
        card.addEventListener('transitionend', onRevealEnd, { once:true });
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    });
    cards.forEach((card) => observer.observe(card));
  };

  const initCarousels = () => {
    const mq = window.matchMedia('(min-width: 992px)');
    const maxDotCount = 3;
    const dotCount = (slidesLen) => Math.min(maxDotCount, slidesLen);
    const activeDotIndex = (i, slidesLen) => {
      const nDots = dotCount(slidesLen);
      if (nDots <= 1) return 0;
      return i % nDots;
    };

    $all('[data-carousel]').forEach((c) => {
      const track = c.querySelector('.carousel-track');
      if (!track) return;
      const cardEl = c.closest('.card');
      const slides = Array.from(track.children);
      if (!slides.length) return;
      const loadSlideMedia = (idx) => {
        const slide = slides[(idx + slides.length) % slides.length];
        if (!slide) return;
        if (slide.dataset.mediaLoaded === 'true') return;
        const nextSrc = slide.getAttribute('data-src');
        const nextSrcset = slide.getAttribute('data-srcset');
        if (nextSrc) {
          slide.setAttribute('src', nextSrc);
          slide.removeAttribute('data-src');
        }
        if (nextSrcset) {
          slide.setAttribute('srcset', nextSrcset);
          slide.removeAttribute('data-srcset');
        }
        slide.dataset.mediaLoaded = 'true';
      };

      slides.forEach((slide) => {
        if (slide.getAttribute('src') || slide.getAttribute('srcset')) {
          slide.dataset.mediaLoaded = 'true';
        }
      });

      const dotsWrap = c.parentElement ? c.parentElement.querySelector('.carousel-dots') : null;
      let dots = [];
      let i = 0;

      const buildDots = () => {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = '';
        dots = [];
        const nDots = dotCount(slides.length);
        for (let di = 0; di < nDots; di++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'dot';
          b.setAttribute('aria-label', `Ir a seccion ${di + 1} de ${nDots}`);
          b.addEventListener('click', (ev) => {
            ev.stopPropagation();
            let target = di;
            if (slides.length > nDots) {
              const forwardOffset = (di - (i % nDots) + nDots) % nDots;
              target = (i + forwardOffset) % slides.length;
            }
            go(target, true);
          });
          dotsWrap.appendChild(b);
          dots.push(b);
        }
      };

      const updateDots = () => {
        if (!dots.length) return;
        const a = activeDotIndex(i, slides.length);
        dots.forEach((d, idx) => {
          d.classList.toggle('active', idx === a);
          d.setAttribute('aria-current', idx === a ? 'true' : 'false');
        });
      };

      const go = (idx, animate) => {
        i = (idx + slides.length) % slides.length;
        loadSlideMedia(i);
        if (!animate) track.style.transition = 'none';
        track.style.transform = `translateX(${-i * 100}%)`;
        if (!animate) requestAnimationFrame(() => { track.style.transition = 'transform .3s ease'; });
        updateDots();
      };

      buildDots();
      go(0, false);

      const threshold = () => Math.max(40, c.clientWidth * 0.12);
      let dragging = false;
      let moved = false;
      let startX = 0;
      let currentX = 0;
      let startTime = 0;
      let interactionTimer = 0;
      let lastWheelAt = 0;
      c.dataset.dragging = '0';

      const setInteracting = () => {
        if (!cardEl) return;
        if (interactionTimer) {
          clearTimeout(interactionTimer);
          interactionTimer = 0;
        }
        cardEl.classList.add('is-carousel-interacting');
      };

      const clearInteracting = () => {
        if (!cardEl) return;
        if (interactionTimer) clearTimeout(interactionTimer);
        interactionTimer = setTimeout(() => {
          cardEl.classList.remove('is-carousel-interacting');
          interactionTimer = 0;
        }, 180);
      };

      const onStart = (x) => {
        dragging = true;
        moved = false;
        c.dataset.dragging = '0';
        setInteracting();
        startX = currentX = x;
        startTime = performance.now();
        track.classList.add('dragging');
      };

      const onMove = (x) => {
        if (!dragging) return;
        setInteracting();
        currentX = x;
        const dx = currentX - startX;
        if (Math.abs(dx) > 6) {
          moved = true;
          c.dataset.dragging = '1';
        }
        track.style.transform = `translateX(calc(${-i * 100}% + ${dx}px))`;
      };

      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('dragging');
        const dx = currentX - startX;
        const dt = performance.now() - startTime;
        const swipe = (Math.abs(dx) > threshold()) || (Math.abs(dx) > 30 && dt < 220);
        if (swipe) i += (dx < 0 ? 1 : -1);
        go(i, true);
        if (swipe || moved) {
          c.dataset.dragging = '1';
          setTimeout(() => { c.dataset.dragging = '0'; }, 120);
        } else {
          c.dataset.dragging = '0';
        }
        clearInteracting();
      };

      c.addEventListener('click', (e) => {
        if (c.dataset.dragging === '1') {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      c.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      c.addEventListener('selectstart', (e) => {
        if (dragging) e.preventDefault();
      });
      c.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        c.setPointerCapture(e.pointerId);
        onStart(e.clientX);
      });
      c.addEventListener('pointermove', (e) => onMove(e.clientX));
      c.addEventListener('pointerup', (e) => { try { c.releasePointerCapture(e.pointerId); } catch (_) {} onEnd(); });
      c.addEventListener('pointercancel', (e) => { try { c.releasePointerCapture(e.pointerId); } catch (_) {} onEnd(); });


      const rebuild = () => {
        buildDots();
        updateDots();
        go(i, false);
      };

      if (mq.addEventListener) mq.addEventListener('change', rebuild);
      else if (mq.addListener) mq.addListener(rebuild);

      window.addEventListener('resize', rebuild, { passive:true });
    });
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
    const autoplayMs = 3000;

    const getBehavior = () => {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      } catch (_) {
        return 'smooth';
      }
    };

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

    const maxHeroDots = 5;
    let dots = [];
    let dotTargets = [];
    const getDotTargets = () => {
      if (slides.length <= maxHeroDots) return slides.map((_, idx) => idx);
      const maxStart = slides.length - maxHeroDots;
      const start = Math.max(0, Math.min(active - Math.floor(maxHeroDots / 2), maxStart));
      return Array.from({ length: maxHeroDots }, (_, idx) => start + idx);
    };

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
      pauseAuto = hoverPause || focusPause || pointerPause;
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

      if (link) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dgt-tooltip')) return;
          if (e.target.closest('[data-add-to-cart]')) return;
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
      initCarousels();
      initDgtTooltips();
    }
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

    // Disable browser's scroll restoration — we handle it ourselves after render
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

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

    // ¿Llegamos con un ancla? (p. ej. /#ubicacion al pulsar el menú desde /cuenta)
    let hashTarget = null;
    const rawHash = (window.location.hash || '').slice(1);
    if (rawHash) {
      let hashId = rawHash;
      try { hashId = decodeURIComponent(rawHash); } catch (_) {}
      hashTarget = document.getElementById(hashId);
    }

    const savedY = sessionStorage.getItem('ss_scrollY');
    let isBack = false;

    if (hashTarget) {
      // El ancla tiene PRIORIDAD sobre la restauración: si no, al cargar la home
      // con #ubicacion la restauración de ss_scrollY nos dejaría en otra posición
      // (y el scroll nativo cae mal porque el catálogo lo pinta JS). Se calcula tras
      // renderizar el catálogo, descontando la cabecera fija, y de forma instantánea.
      sessionStorage.removeItem('ss_scrollY');
      const header = document.getElementById('siteHeader');
      const headerOffset = header ? header.offsetHeight : 0;
      jumpInstant(hashTarget.getBoundingClientRect().top + window.scrollY - headerOffset);
    } else if (savedY) {
      // Volver a la home: restaurar la posición previa de forma instantánea
      // (p. ej. seguías en serie IX).
      isBack = true;
      const targetY = parseInt(savedY, 10) || 0;
      jumpInstant(targetY);
      sessionStorage.removeItem('ss_scrollY');

      // Reaseguro agnóstico del navegador: en móvil (iOS Safari no soporta
      // overflow-anchor; la barra de direcciones y las fuentes recolocan la
      // maquetación) la posición puede desviarse justo tras restaurar. Re-aplicamos
      // durante unos frames y tras cargar las fuentes, deteniéndonos en cuanto el
      // usuario hace scroll para no secuestrar su interacción.
      let userMoved = false;
      const onUserMove = function () { userMoved = true; };
      window.addEventListener('wheel', onUserMove, { passive: true, once: true });
      window.addEventListener('touchmove', onUserMove, { passive: true, once: true });
      window.addEventListener('keydown', onUserMove, { once: true });
      let frame = 0;
      const reassert = function () {
        if (userMoved) return;
        if (Math.abs(window.scrollY - targetY) > 1) jumpInstant(targetY);
        if (++frame < 10) requestAnimationFrame(reassert);
      };
      requestAnimationFrame(reassert);
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(function () {
          if (!userMoved && Math.abs(window.scrollY - targetY) > 1) jumpInstant(targetY);
        }).catch(function () {});
      }
    }

    // Revelamos el contenido (oculto por el inline de <head>) SOLO cuando la
    // maquetación está estable (fuentes cargadas). Clave en móvil: iOS WebKit no
    // tiene scroll anchoring, así que el reflow de fuentes tras restaurar movía el
    // contenido bajo el scroll fijo y se veía el salto. Al revelar ya estabilizado,
    // aparece directamente en su sitio. Failsafe por tiempo (además del del <head>).
    (function revealWhenStable() {
      var de = document.documentElement;
      if (!de.classList.contains('ss-restoring')) return;
      var done = false;
      var reveal = function () { if (done) return; done = true; de.classList.remove('ss-restoring'); };
      var afterPaint = function () { requestAnimationFrame(function () { requestAnimationFrame(reveal); }); };
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(afterPaint).catch(reveal);
      } else {
        afterPaint();
      }
      setTimeout(reveal, 600);
    })();

    // Save scroll position before leaving the page
    window.addEventListener('pagehide', () => {
      sessionStorage.setItem('ss_scrollY', String(window.scrollY));
    });

    renderSharedProductMenus();
    initDesktopProductsMenu();
    setYear();
    setVh();
    window.addEventListener('resize', setVh, { passive:true });
    window.addEventListener('orientationchange', setVh, { passive:true });
    initDeferredMapEmbeds();

    const hydrateAfterPaint = () => {
      initHeroCarousel();
      initCards();
      runIdle(() => {
        updateHomeStructuredData();
        if (!isBack) initCardReveal();
        initCarousels();
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
