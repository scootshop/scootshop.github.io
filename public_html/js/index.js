/* index.js - comportamiento especifico del home */
(() => {
  var meta = document.querySelector('meta[name="asset-version"]');
  const VER = (meta && meta.getAttribute('content')) ? String(meta.getAttribute('content')).trim() : (window.ASSET_VER || '1');
  const isLocal = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:') &&
    (u.startsWith('/') || u.startsWith('./') || u.startsWith('../')) && !u.includes('http');
  const hasV = (u) => /[?&]v=/.test(u || '');

  const addVer = (url) => {
    if (!isLocal(url) || hasV(url)) return url;
    const parts = url.split('#');
    const base = parts[0];
    const hash = parts[1] ? '#' + parts[1] : '';
    const join = base.includes('?') ? '&' : '?';
    return base + join + 'v=' + encodeURIComponent(VER) + hash;
  };

  const bumpSrcset = (srcset) => {
    if (!srcset) return srcset;
    return srcset.split(',').map((part) => {
      const bits = part.trim().split(/\s+/);
      const url = bits[0];
      const rest = bits.slice(1).join(' ');
      const u2 = addVer(url);
      return u2 + (rest ? ' ' + rest : '');
    }).join(', ');
  };

  const bump = (el) => {
    if (!el || el.nodeType !== 1) return;

    const tag = el.tagName;

    if (tag === 'IMG') {
      if (el.getAttribute('src')) el.setAttribute('src', addVer(el.getAttribute('src')));
      if (el.getAttribute('data-src')) el.setAttribute('data-src', addVer(el.getAttribute('data-src')));
      if (el.getAttribute('srcset')) el.setAttribute('srcset', bumpSrcset(el.getAttribute('srcset')));
      if (el.getAttribute('data-srcset')) el.setAttribute('data-srcset', bumpSrcset(el.getAttribute('data-srcset')));
    } else if (tag === 'SOURCE') {
      if (el.getAttribute('src')) el.setAttribute('src', addVer(el.getAttribute('src')));
      if (el.getAttribute('srcset')) el.setAttribute('srcset', bumpSrcset(el.getAttribute('srcset')));
    } else if (tag === 'VIDEO' && el.getAttribute('poster')) {
      el.setAttribute('poster', addVer(el.getAttribute('poster')));
    }

    if (el.querySelectorAll) {
      el.querySelectorAll('img[src],img[data-src],img[srcset],img[data-srcset],source[src],source[srcset],video[poster]')
        .forEach((node) => bump(node));
    }
  };

  bump(document.documentElement);

  const observeDom = () => {
    if (!document.body) return;
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        const nodes = m.addedNodes || [];
        for (const n of nodes) bump(n);
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  };

  if (document.body) observeDom();
  else document.addEventListener('DOMContentLoaded', observeDom, { once: true });
})();

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
      key: 'spare-parts',
      label: 'Repuestos',
      emptyTitle: 'Repuestos',
      emptyDescription: 'Estamos preparando recambios y piezas compatibles para mostrarlos aquí próximamente.'
    },
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
    const normalized = normalizeHomeCategoryKey(categoryKey);
    return getHomeCategories().slice().sort((left, right) => {
      const leftPinned = left.key === normalized ? 0 : 1;
      const rightPinned = right.key === normalized ? 0 : 1;
      if (leftPinned !== rightPinned) return leftPinned - rightPinned;
      return Number(left.homeOrder || 0) - Number(right.homeOrder || 0);
    });
  };

  const syncHomeCategoryButtons = () => {
    const normalized = normalizeHomeCategoryKey(activeHomeCategoryKey);
    $all('[data-home-category]').forEach((button) => {
      const isActive = button.getAttribute('data-home-category') === normalized;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
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
      ? '<div class="dgt-tooltip" data-dgt-tooltip><button class="dgt-tooltip-toggle" type="button" aria-label="Informacion sobre homologacion DGT" aria-expanded="false" data-tooltip-text="' + esc(product.dgtTooltipText || '') + '"><img class="dgt-badge" src="/img/dgt-logo.webp" alt="Logo DGT" loading="lazy" decoding="async" /></button></div>'
      : '';

    const priceValuesMarkup = product.dgtCertified
      ? '<div class="price-values"><div class="price-now">' + now + '</div>' + (was ? '<div class="price-was">' + was + '</div>' : '') + '</div>'
      : '<div class="price-now">' + now + '</div>' + (was ? '<div class="price-was">' + was + '</div>' : '');

    return '<div class="price-row" aria-label="' + esc(product.priceAriaLabel || ('Precio ' + (product.menuLabel || product.name || 'producto'))) + '">' + priceValuesMarkup + dgtMarkup + '</div>';
  };

  const buildPayButtonMarkup = (product) => {
    const stock = String(product.stock || 'in_stock').toLowerCase();
    if (stock === 'out_of_stock') {
      return '<a class="btn-paypal" href="' + esc(product.href || '#') + '" data-buy-button aria-label="' + esc((product.menuLabel || product.name || 'Producto') + ' agotado') + '"><span class="buy-text">AGOTADO</span><span class="sr-only">Agotado</span><img class="paypal-logo" src="/img/paypal-svgrepo-com.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" /></a>';
    }
    if (stock === 'preorder') {
      return '<a class="btn-paypal" href="' + esc(product.href || '#') + '" data-buy-button aria-label="Reservar ' + esc(product.menuLabel || product.name || 'producto') + '"><span class="buy-text">RESERVA</span><span class="sr-only">Reservar</span><img class="paypal-logo" src="/img/paypal-svgrepo-com.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" /></a>';
    }
    return '<a class="btn-paypal" href="/checkout" data-buy-button data-pay-button aria-label="Comprar ' + esc(product.menuLabel || product.name || 'producto') + '"><span class="buy-text">COMPRAR</span><span class="sr-only">Comprar</span><img class="paypal-logo" src="/img/paypal-svgrepo-com.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" /></a>';
  };

  const buildCardMarkup = (product, productIndex) => {
    const cardAttrs = [
      'class="card"',
      'id="p-' + esc(product.id) + '"',
      'tabindex="0"',
      'data-name="' + esc(product.name || '') + '"',
      'data-was="' + esc(product.compareAtPriceText || '') + '"',
      'data-now="' + esc(product.priceText || '') + '"',
      'data-link="' + esc(product.href || '') + '"',
      'aria-label="' + esc(product.homeAriaLabel || product.name || 'Producto') + '"'
    ];
    if (product.paypalId) cardAttrs.push('data-paypal="' + esc(product.paypalId) + '"');
    return '<article ' + cardAttrs.join(' ') + '><div class="card-media"><div class="carousel" data-carousel><div class="carousel-track">' + buildGalleryMarkup(product, productIndex) + '</div></div><div class="carousel-dots" aria-label="Selector de imagenes"></div></div><span class="chip-name">' + esc(product.badgeText || product.menuLabel || product.name || '') + '</span><div class="card-body"><div class="card-brand">' + esc(product.brand || '') + '</div><div class="title">' + esc(product.homeTitle || product.name || '') + '</div></div><div class="card-bottom">' + buildPriceRowMarkup(product) + '<div class="btn-row"><a class="btn-primary" href="' + esc(product.href || '#') + '" data-buy-button>VISTA</a>' + buildPayButtonMarkup(product) + '</div></div></article>';
  };

  const buildHomeEmptyStateMarkup = (categoryKey) => {
    const meta = getHomeCategoryMeta(categoryKey);
    if (!meta || normalizeHomeCategoryKey(categoryKey) === DEFAULT_HOME_CATEGORY_KEY) return '';
    return '<section class="container catalog-empty-state" aria-label="' + esc(meta.emptyTitle || meta.label || '') + '"><h2>' + esc((meta.emptyTitle || meta.label || '') + ' · Próximamente') + '</h2><p>' + esc(meta.emptyDescription || 'Estamos preparando esta categoría para mostrarla en la home.') + '</p></section>';
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
        return '<section class="series" id="' + esc(series.homeSectionId || ('series-' + series.key)) + '"><div class="container"><h2>' + esc(series.homeTitle || series.label || '') + '</h2>' + (series.homeDescription ? '<p>' + esc(series.homeDescription) + '</p>' : '') + '</div></section><section' + listingId + ' class="container" aria-label="' + esc(series.homeAriaLabel || ('Lista de productos ' + (series.label || ''))) + '"><div class="grid">' + products.map((product, idx) => buildCardMarkup(product, idx)).join('') + '</div></section>';
      }).join('');

      return categoryHeader + seriesMarkup;
    }).join('');
  };

  const refreshHomeCatalog = ({ scrollIntoView = false } = {}) => {
    renderHomeCatalog(activeHomeCategoryKey);
    initCards();
    runIdle(() => {
      initCardReveal();
      initCarousels();
      initDgtTooltips();
    });

    if (scrollIntoView) {
      const target = document.querySelector('[data-home-catalog-root]');
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        if (nextKey === activeHomeCategoryKey) return;
        activeHomeCategoryKey = nextKey;
        try {
          sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
        } catch (_) {
        }
        refreshHomeCatalog({ scrollIntoView: true });
      });
      nav.dataset.bound = 'true';
    }

    syncHomeCategoryButtons();
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
      menuRoot.innerHTML = '<div class="mm-sub-title">' + (hasManyCategories ? 'CATEGORIAS' : 'SERIES') + '</div>' + menuCategories.map((category) => {
        const seriesMarkup = (category.series || []).map((series) => {
          const links = series.items.map((item) => '<a class="mm-sub2-link" href="' + esc(item.href) + '">' + esc(item.label) + '</a>').join('');
          return '<button class="mm-sub-link" data-series="' + esc(category.key + '-' + series.key) + '" type="button"><span>' + esc(series.label.toUpperCase()) + '</span><i class="fa-solid fa-chevron-down mm-chevron-sm"></i></button><div class="mm-sub2" data-series-content="' + esc(category.key + '-' + series.key) + '">' + links + '</div>';
        }).join('');

        if (!hasManyCategories) return seriesMarkup;
        return '<div class="mm-sub-category"><div class="mm-sub-category-title">' + esc(category.label) + '</div>' + seriesMarkup + '</div>';
      }).join('');
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
      c.dataset.dragging = '0';

      const onStart = (x) => {
        dragging = true;
        moved = false;
        c.dataset.dragging = '0';
        startX = currentX = x;
        startTime = performance.now();
        track.classList.add('dragging');
      };

      const onMove = (x) => {
        if (!dragging) return;
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
        $all('.dgt-tooltip-toggle').forEach((item) => {
          item.setAttribute('aria-expanded', item === toggle ? 'true' : 'false');
        });
        floating.textContent = toggle.getAttribute('data-tooltip-text') || '';
        placeTooltip(toggle);
      };

      const hideTooltip = () => {
        activeToggle = null;
        $all('.dgt-tooltip-toggle').forEach((item) => item.setAttribute('aria-expanded', 'false'));
        floating.classList.remove('is-visible', 'is-above');
      };

      document.addEventListener('mousemove', (event) => {
        if (!activeToggle || isMobileView()) return;
        const overToggle = $all('.dgt-tooltip-toggle').some((toggle) => toggle.contains(event.target));
        const overTooltip = floating.contains(event.target);
        if (!overToggle && !overTooltip) hideTooltip();
      });
      document.addEventListener('click', (event) => {
        const clickedToggle = $all('.dgt-tooltip-toggle').some((toggle) => toggle.contains(event.target));
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

    const setButtonText = (button, visibleText, srText) => {
      if (!button) return;
      const textEl = button.querySelector('.buy-text');
      const srEl = button.querySelector('.sr-only');
      if (textEl) textEl.textContent = visibleText;
      if (srEl) srEl.textContent = srText || visibleText;
    };

    const productMap = new Map(
      getCatalogProducts()
        .filter((product) => product && product.href)
        .map((product) => [normalizePath(product.href), product])
    );

    const toNumber = (s) => {
      let t = (s === null || s === undefined) ? '' : String(s);
      t = t.trim();
      if (!t) return NaN;
      let x = t.replace(/[^\d,\.]/g, '');
      if (x.includes('.') && x.includes(',')) {
        x = x.replace(/\./g, '').replace(',', '.');
      } else if (x.includes(',')) {
        x = x.replace(',', '.');
      }
      return Number(x);
    };

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
        if (!product.paypalId) delete card.dataset.paypal;
        if (product.paypalId) card.dataset.paypal = product.paypalId;

        const payButton = card.querySelector('.btn-paypal');
        if (payButton) {
          const stock = String(product.stock || 'in_stock').toLowerCase();
          if (stock === 'in_stock') {
            payButton.setAttribute('data-pay-button', '');
            payButton.setAttribute('href', '/checkout');
            payButton.setAttribute('aria-label', 'Comprar ' + (product.name || card.dataset.name || 'producto'));
            setButtonText(payButton, 'COMPRAR', 'Comprar');
          } else if (stock === 'out_of_stock') {
            payButton.removeAttribute('data-pay-button');
            payButton.setAttribute('href', link || '#');
            payButton.setAttribute('aria-label', (product.name || card.dataset.name || 'Producto') + ' agotado');
            setButtonText(payButton, 'AGOTADO', 'Agotado');
          } else {
            payButton.removeAttribute('data-pay-button');
            payButton.setAttribute('href', link || '#');
            payButton.setAttribute('aria-label', 'Reservar ' + (product.name || card.dataset.name || 'producto'));
            setButtonText(payButton, 'RESERVA', 'Reservar');
          }
        }
      }

      if (link) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dgt-tooltip')) return;
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

      const payBtn = card.querySelector('[data-pay-button]');
      if (payBtn) {
        const nameP = (card.dataset.name || 'producto').trim();
        const sku = (card.dataset.sku || '').trim();
        const now = (card.dataset.now || '').trim();
        const productUrl = (card.dataset.productUrl || link || '').trim();
        const image = (card.dataset.image || '').trim();
        const paypalId = (card.dataset.paypal || '').trim();
        const n = toNumber(now);
        let url = '/checkout?name=' + encodeURIComponent(nameP);
        if (sku) url += '&sku=' + encodeURIComponent(sku);
        url += '&price=' + encodeURIComponent(Number.isFinite(n) && n > 0 ? n.toFixed(2) : now);
        if (productUrl) url += '&url=' + encodeURIComponent(productUrl);
        if (image) url += '&image=' + encodeURIComponent(image);
        if (paypalId) {
          url += '&paypal=' + encodeURIComponent(paypalId);
          url += '&hid=' + encodeURIComponent(paypalId);
        }
        payBtn.href = url;
        payBtn.setAttribute('aria-label', 'Comprar ' + nameP);
      }
    });
  };

  const updateHomeStructuredData = () => {
    const orderedProducts = getOrderedHomeCategories(activeHomeCategoryKey)
      .flatMap((category) => (category.series || []).flatMap((series) => getSeriesProducts(series.key)));
    if (!orderedProducts.length) return;
    $all('script[type="application/ld+json"]').forEach((block) => {
      const raw = block.textContent || '';
      if (!raw.trim()) return;
      try {
        const data = JSON.parse(raw);
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        let changed = false;
        graph.forEach((item) => {
          if (!item || item['@type'] !== 'ItemList' || item['@id'] !== 'https://scootshop.co/#products') return;
          item.itemListElement = orderedProducts.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: 'https://scootshop.co' + normalizePath(product.href)
          }));
          changed = true;
        });
        if (changed) block.textContent = JSON.stringify(data, null, 2);
      } catch (_) {
      }
    });
  };

  const boot = () => {
    // Disable browser's scroll restoration — we handle it ourselves after render
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    initHomeCategoryNav();
    renderHomeCatalog(activeHomeCategoryKey);

    // Restore scroll position instantly after catalog render (before paint)
    const savedY = sessionStorage.getItem('ss_scrollY');
    const isBack = !!savedY;
    if (isBack) {
      window.scrollTo(0, parseInt(savedY, 10));
      sessionStorage.removeItem('ss_scrollY');
    }

    // Save scroll position before leaving the page
    window.addEventListener('beforeunload', () => {
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
      initCards();
      updateHomeStructuredData();
      runIdle(() => {
        if (!isBack) initCardReveal();
        initCarousels();
        initDgtTooltips();
      });
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(hydrateAfterPaint);
    } else {
      window.setTimeout(hydrateAfterPaint, 0);
    }
  };

  const ensureProductsThenBoot = () => {
    const startBoot = () => {
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
