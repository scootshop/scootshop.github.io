(function () {
  'use strict';

  var CART_KEY = 'ss_cart_v1';
  var MAX_QTY_PER_ITEM = 20;
  var drawerReady = false;
  var drawerRoot = null;
  var drawerBackdrop = null;
  var drawerPanel = null;
  var drawerItems = null;
  var drawerSubtotal = null;
  var drawerCount = null;
  var checkoutBtn = null;
  var continueBtn = null;
  var uiAudioCtx = null;
  var uiAudioLastAt = 0;

  function playUiSound(kind) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!uiAudioCtx) uiAudioCtx = new AudioCtx();

      if (uiAudioCtx.state === 'suspended' && typeof uiAudioCtx.resume === 'function') {
        uiAudioCtx.resume();
      }

      var now = uiAudioCtx.currentTime;
      if (now - uiAudioLastAt < 0.04) return;
      uiAudioLastAt = now;

      var oscillator = uiAudioCtx.createOscillator();
      var gain = uiAudioCtx.createGain();
      var isInc = kind === 'inc';
      var startFreq = isInc ? 760 : 640;
      var endFreq = isInc ? 980 : 900;
      var duration = isInc ? 0.075 : 0.1;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(startFreq, now);
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(uiAudioCtx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    } catch (_) {
      /* ignore */
    }
  }

  function safeText(value) {
    return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  }

  function normalizePath(path) {
    var value = safeText(path);
    if (!value) return '/';
    if (/^https?:\/\//i.test(value)) {
      try {
        var url = new URL(value, window.location.origin);
        return url.pathname + (url.search || '') + (url.hash || '');
      } catch (_) {
        return '/';
      }
    }
    return value.charAt(0) === '/' ? value : '/' + value;
  }

  function parsePrice(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
    var raw = safeText(value);
    if (!raw) return 0;
    var clean = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
    var num = Number(clean);
    return Number.isFinite(num) ? Math.max(0, num) : 0;
  }

  function formatEur(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    return num.toFixed(2) + ' €';
  }

  function compactKey(value) {
    return safeText(value).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function sanitizeQty(value) {
    var qty = parseInt(value, 10);
    if (!Number.isFinite(qty) || qty < 1) return 1;
    if (qty > MAX_QTY_PER_ITEM) return MAX_QTY_PER_ITEM;
    return qty;
  }

  function sanitizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;

    var sku = safeText(raw.sku || raw.id || raw.ref);
    var name = safeText(raw.name || raw.title || 'Producto SCOOT SHOP');
    var price = parsePrice(raw.price != null ? raw.price : raw.priceText);
    var url = normalizePath(raw.url || raw.href || '/');
    var image = safeText(raw.image);
    var qty = sanitizeQty(raw.qty || 1);
    var stock = safeText(raw.stock || 'in_stock').toLowerCase();
    var colorKey = safeText(raw.color || raw.colorKey || raw.product_color || raw.variant_color);
    var colorLabel = safeText(raw.colorLabel || raw.color_label || raw.product_color_label || raw.variant_color_label || colorKey);
    var key = compactKey([sku || url || name, colorKey || ''].join('|'));

    if (!key || !name || price <= 0) return null;

    return {
      key: key,
      sku: sku,
      name: name,
      price: Number(price.toFixed(2)),
      url: url,
      image: image,
      color: colorKey,
      colorLabel: colorLabel,
      qty: qty,
      stock: stock
    };
  }

  function readActiveColorSelection() {
    try {
      var selector = document.querySelector('.color-variants');
      if (!selector) return null;

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
      if (!activeButton) return null;

      var activeLabelNode = selector.querySelector('[data-active-color-label]');
      var colorLabel = safeText(
        activeButton.getAttribute('data-color-label') ||
        activeButton.getAttribute('aria-label') ||
        activeButton.getAttribute('title') ||
        (activeLabelNode ? activeLabelNode.textContent : '') ||
        ''
      );
      var colorKey = safeText(activeButton.getAttribute('data-color-key') || colorLabel || 'default');

      if (!colorKey && !colorLabel) return null;
      return {
        color: colorKey || colorLabel,
        colorLabel: colorLabel || colorKey || 'Color'
      };
    } catch (_) {
      return null;
    }
  }

  function read() {
    try {
      var raw = sessionStorage.getItem(CART_KEY);
      if (!raw) raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      var clean = [];
      for (var i = 0; i < parsed.length; i++) {
        var item = sanitizeItem(parsed[i]);
        if (item) clean.push(item);
      }
      return clean;
    } catch (_) {
      return [];
    }
  }

  function write(items) {
    var payload = JSON.stringify(Array.isArray(items) ? items : []);
    try {
      sessionStorage.setItem(CART_KEY, payload);
    } catch (_) {
      /* ignore */
    }
    try {
      localStorage.setItem(CART_KEY, payload);
    } catch (_) {
      /* ignore */
    }
    notifyChange();
  }

  function count(items) {
    var list = Array.isArray(items) ? items : read();
    var total = 0;
    for (var i = 0; i < list.length; i++) total += sanitizeQty(list[i].qty);
    return total;
  }

  function subtotal(items) {
    var list = Array.isArray(items) ? items : read();
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      total += parsePrice(list[i].price) * sanitizeQty(list[i].qty);
    }
    return Number(total.toFixed(2));
  }

  function add(item, qty) {
    var normalized = sanitizeItem(item);
    if (!normalized) return false;
    if (normalized.stock === 'out_of_stock') return false;

    var list = read();
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === normalized.key) {
        found = list[i];
        break;
      }
    }

    if (found) {
      found.qty = sanitizeQty(found.qty + sanitizeQty(qty || normalized.qty || 1));
      if (!found.image && normalized.image) found.image = normalized.image;
      if (!found.sku && normalized.sku) found.sku = normalized.sku;
    } else {
      normalized.qty = sanitizeQty(qty || normalized.qty || 1);
      list.push(normalized);
    }

    write(list);
    return true;
  }

  function setQty(key, qty) {
    var target = compactKey(key);
    if (!target) return;

    var list = read();
    var next = [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (row.key !== target) {
        next.push(row);
        continue;
      }
      var cleanQty = parseInt(qty, 10);
      if (!Number.isFinite(cleanQty) || cleanQty <= 0) continue;
      row.qty = sanitizeQty(cleanQty);
      next.push(row);
    }
    write(next);
  }

  function remove(key) {
    var target = compactKey(key);
    if (!target) return;
    var list = read().filter(function (row) { return row.key !== target; });
    write(list);
  }

  function clear() {
    write([]);
  }

  function notifyChange() {
    var detail = {
      items: read(),
      count: count(),
      subtotal: subtotal()
    };

    try {
      window.dispatchEvent(new CustomEvent('ss:cart-changed', { detail: detail }));
    } catch (_) {
      /* ignore */
    }

    renderHeaderBadges(detail.count);
    renderDrawer(detail);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensureDrawer() {
    if (drawerReady) return;

    var existingRoot = document.getElementById('ssCartDrawer');
    if (existingRoot) {
      drawerRoot = existingRoot;
      drawerBackdrop = document.getElementById('ssCartBackdrop');
      drawerPanel = document.getElementById('ssCartPanel');
      drawerItems = document.getElementById('ssCartItems');
      drawerSubtotal = document.getElementById('ssCartSubtotal');
      drawerCount = document.getElementById('ssCartCount');
      checkoutBtn = document.getElementById('ssCartCheckoutBtn');
      continueBtn = document.getElementById('ssCartContinue');
      drawerReady = true;
      return;
    }

    drawerRoot = document.createElement('div');
    drawerRoot.id = 'ssCartDrawer';
    drawerRoot.className = 'ss-cart-drawer';
    drawerRoot.innerHTML = '' +
      '<div class="ss-cart-backdrop" id="ssCartBackdrop" hidden></div>' +
      '<aside class="ss-cart-panel" id="ssCartPanel" aria-label="Carrito" aria-hidden="true" hidden>' +
        '<header class="ss-cart-head">' +
          '<h3>Tu carrito <span id="ssCartCount">0</span></h3>' +
          '<button type="button" class="ss-cart-close" id="ssCartClose" aria-label="Cerrar carrito">' +
            '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>' +
          '</button>' +
        '</header>' +
        '<div class="ss-cart-body" id="ssCartItems"></div>' +
        '<footer class="ss-cart-foot">' +
          '<div class="ss-cart-subtotal-row"><span>Subtotal</span><strong id="ssCartSubtotal">0.00 €</strong></div>' +
          '<div class="ss-cart-actions">' +
            '<a href="/checkout?cart=1" class="ss-cart-checkout" id="ssCartCheckoutBtn">Finalizar compra</a>' +
            '<button type="button" class="ss-cart-continue" id="ssCartContinue">Seguir comprando</button>' +
            '<button type="button" class="ss-cart-clear" id="ssCartClear">Vaciar</button>' +
          '</div>' +
        '</footer>' +
      '</aside>';

    document.body.appendChild(drawerRoot);

    drawerBackdrop = document.getElementById('ssCartBackdrop');
    drawerPanel = document.getElementById('ssCartPanel');
    drawerItems = document.getElementById('ssCartItems');
    drawerSubtotal = document.getElementById('ssCartSubtotal');
    drawerCount = document.getElementById('ssCartCount');
    checkoutBtn = document.getElementById('ssCartCheckoutBtn');
    continueBtn = document.getElementById('ssCartContinue');

    var closeBtn = document.getElementById('ssCartClose');
    var clearBtn = document.getElementById('ssCartClear');

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clear();
      });
    }
    if (continueBtn) {
      continueBtn.addEventListener('click', function () {
        closeDrawer();
      });
    }

    if (drawerItems) {
      drawerItems.addEventListener('click', function (event) {
        var emptyCta = event.target.closest('.ss-cart-empty-cta');
        if (emptyCta) {
          event.preventDefault();
          closeDrawer();
          window.location.href = '/#comprar';
          return;
        }

        var trigger = event.target.closest('[data-cart-action]');
        if (!trigger) return;

        var action = trigger.getAttribute('data-cart-action');
        var key = trigger.getAttribute('data-cart-key') || '';
        if (!key) return;

        var list = read();
        var item = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].key === key) {
            item = list[i];
            break;
          }
        }
        if (!item) return;

        if (action === 'inc') {
          if (item.qty < MAX_QTY_PER_ITEM) playUiSound('inc');
          setQty(key, item.qty + 1);
        }
        if (action === 'dec') setQty(key, item.qty - 1);
        if (action === 'remove') remove(key);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDrawer();
    });

    drawerReady = true;
  }

  function renderHeaderBadges(totalItems) {
    var badges = document.querySelectorAll('.cart-badge');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(totalItems || 0);
      badges[i].hidden = !(totalItems > 0);
    }
  }

  function renderDrawer(detail) {
    if (!drawerReady) return;

    var items = detail && Array.isArray(detail.items) ? detail.items : [];
    var totalItems = detail ? detail.count : count(items);
    var sum = detail ? detail.subtotal : subtotal(items);

    if (drawerCount) drawerCount.textContent = String(totalItems || 0);
    if (drawerSubtotal) drawerSubtotal.textContent = formatEur(sum);
    if (checkoutBtn) checkoutBtn.setAttribute('href', '/checkout?cart=1');
    if (drawerPanel) drawerPanel.classList.toggle('is-empty', !items.length);

    if (!drawerItems) return;

    if (!items.length) {
      drawerItems.innerHTML = '' +
        '<div class="ss-cart-empty">' +
          '<div class="ss-cart-empty-icon" aria-hidden="true">' +
            '<svg class="ss-cart-empty-cart-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
              '<path d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z"></path>' +
              '<path d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"></path>' +
              '<path d="M2 3L2.26121 3.09184C3.5628 3.54945 4.2136 3.77826 4.58584 4.32298C4.95808 4.86771 4.95808 5.59126 4.95808 7.03836V9.76C4.95808 12.7016 5.02132 13.6723 5.88772 14.5862C6.75412 15.5 8.14857 15.5 10.9375 15.5H12M16.2404 15.5C17.8014 15.5 18.5819 15.5 19.1336 15.0504C19.6853 14.6008 19.8429 13.8364 20.158 12.3075L20.6578 9.88275C21.0049 8.14369 21.1784 7.27417 20.7345 6.69708C20.2906 6.12 18.7738 6.12 17.0888 6.12H11.0235M4.95808 6.12H7" stroke-linecap="round"></path>' +
            '</svg>' +
          '</div>' +
          '<p>Tu carrito est\u00e1 vac\u00edo.</p>' +
          '<small>A\u00f1ade productos y vuelve aqu\u00ed para finalizar tu compra en segundos.</small>' +
          '<a class="ss-cart-empty-cta" href="/#comprar">Explorar productos</a>' +
        '</div>';
      return;
    }

    drawerItems.innerHTML = items.map(function (item) {
      var lineTotal = parsePrice(item.price) * sanitizeQty(item.qty);
      var img = item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" decoding="async" />'
        : '<div class="ss-cart-thumb-placeholder" aria-hidden="true"><i class="fa-solid fa-scooter"></i></div>';

      return '' +
        '<article class="ss-cart-item">' +
          '<a class="ss-cart-thumb" href="' + escapeHtml(item.url || '#') + '">' + img + '</a>' +
          '<div class="ss-cart-meta">' +
            '<button type="button" class="ss-cart-remove" data-cart-action="remove" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Quitar producto" title="Quitar">&times;</button>' +
            '<a class="ss-cart-name" href="' + escapeHtml(item.url || '#') + '">' + escapeHtml(item.name) + '</a>' +
            (item.colorLabel ? '<div class="ss-cart-color">Color: ' + escapeHtml(item.colorLabel) + '</div>' : '') +
            '<div class="ss-cart-price">' + formatEur(item.price) + '</div>' +
            '<div class="ss-cart-row">' +
              '<div class="ss-cart-qty">' +
                '<button type="button" data-cart-action="dec" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Reducir cantidad">-</button>' +
                '<span>' + sanitizeQty(item.qty) + '</span>' +
                '<button type="button" data-cart-action="inc" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Aumentar cantidad">+</button>' +
              '</div>' +
              '<strong class="ss-cart-line-total">' + formatEur(lineTotal) + '</strong>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function animateRemoval(key, article) {
    if (!key) return;
    if (!article) {
      remove(key);
      return;
    }
    if (article.dataset.removing === 'true') return;

    article.dataset.removing = 'true';
    article.classList.add('is-removing');

    var done = false;
    function finalize() {
      if (done) return;
      done = true;
      remove(key);
    }

    article.addEventListener('transitionend', finalize, { once: true });
    setTimeout(finalize, 220);
  }

  function openDrawer() {
    if (window.MM_closeMenu && typeof window.MM_closeMenu === 'function') {
      window.MM_closeMenu();
    }
    ensureDrawer();
    if (!drawerPanel || !drawerBackdrop) return;

    drawerBackdrop.hidden = false;
    drawerPanel.hidden = false;
    drawerPanel.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(function () {
      drawerBackdrop.classList.add('is-open');
      drawerPanel.classList.add('is-open');
      document.documentElement.classList.add('ss-cart-open');
    });
  }

  function closeDrawer() {
    if (!drawerPanel || !drawerBackdrop) return;

    drawerBackdrop.classList.remove('is-open');
    drawerPanel.classList.remove('is-open');
    document.documentElement.classList.remove('ss-cart-open');

    setTimeout(function () {
      if (drawerBackdrop) drawerBackdrop.hidden = true;
      if (drawerPanel) {
        drawerPanel.hidden = true;
        drawerPanel.setAttribute('aria-hidden', 'true');
      }
    }, 180);
  }

  function hydrateOpenerButtons() {
    var openers = document.querySelectorAll('[data-cart-open]');
    for (var i = 0; i < openers.length; i++) {
      var btn = openers[i];
      if (btn.dataset.cartBound === 'true') continue;
      btn.dataset.cartBound = 'true';
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        openDrawer();
      });
    }

    // Product pages inject header markup late; force badge sync when openers are hydrated.
    renderHeaderBadges(count());
  }

  function findProductFromCard(card) {
    if (!card) return null;

    var sku = safeText(card.getAttribute('data-sku'));
    var name = safeText(card.getAttribute('data-name')) || safeText(card.querySelector('.title') && card.querySelector('.title').textContent);
    var price = safeText(card.getAttribute('data-now')) || safeText(card.querySelector('.price-now') && card.querySelector('.price-now').textContent);
    var url = safeText(card.getAttribute('data-link'));
    var imgNode = card.querySelector('.carousel-track img');
    var image = imgNode ? safeText(imgNode.getAttribute('src') || imgNode.getAttribute('data-src')) : '';
    var stock = safeText(card.getAttribute('data-stock') || 'in_stock');

    return sanitizeItem({
      sku: sku,
      name: name,
      priceText: price,
      href: url,
      image: image,
      qty: 1,
      stock: stock
    });
  }

  function bindAddToCartDelegation() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-add-to-cart]');
      if (!trigger) return;

      event.preventDefault();

      if (trigger.getAttribute('aria-disabled') === 'true' || trigger.disabled) return;

      var fromDataset = sanitizeItem({
        sku: trigger.getAttribute('data-sku'),
        name: trigger.getAttribute('data-name'),
        priceText: trigger.getAttribute('data-price'),
        href: trigger.getAttribute('data-url'),
        image: trigger.getAttribute('data-image'),
        color: trigger.getAttribute('data-color') || trigger.getAttribute('data-color-key'),
        colorLabel: trigger.getAttribute('data-color-label'),
        stock: trigger.getAttribute('data-stock') || 'in_stock',
        qty: trigger.getAttribute('data-qty') || 1
      });

      var item = fromDataset;
      if (!item) {
        var card = trigger.closest('.card');
        item = findProductFromCard(card);
      }
      if (!item) return;

      var activeColor = readActiveColorSelection();
      if (activeColor) {
        item.color = activeColor.color;
        item.colorLabel = activeColor.colorLabel;
        item.key = compactKey([(item.sku || item.url || item.name), (item.color || '')].join('|'));
      }

      // On product detail, persist the currently visible hero image (selected variant).
      var currentMainImage = document.querySelector('#mainImage');
      var currentMainImageSrc = currentMainImage
        ? safeText(currentMainImage.getAttribute('src') || currentMainImage.getAttribute('data-src') || '')
        : '';
      if (currentMainImageSrc) {
        item.image = currentMainImageSrc;
      }

      var added = add(item, sanitizeQty(trigger.getAttribute('data-qty') || 1));
      if (!added) return;
      playUiSound('add');

      trigger.classList.add('is-added');
      var original = trigger.textContent;
      var label = trigger.getAttribute('data-added-label') || 'Añadido';
      trigger.textContent = label;
      setTimeout(function () {
        trigger.classList.remove('is-added');
        trigger.textContent = original;
      }, 950);
    });
  }

  function init() {
    ensureDrawer();
    hydrateOpenerButtons();
    bindAddToCartDelegation();
    notifyChange();
  }

  window.SS_CART = {
    key: CART_KEY,
    read: read,
    add: add,
    remove: remove,
    setQty: setQty,
    clear: clear,
    count: count,
    subtotal: subtotal,
    open: openDrawer,
    close: closeDrawer,
    refreshButtons: hydrateOpenerButtons,
    notify: notifyChange
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
