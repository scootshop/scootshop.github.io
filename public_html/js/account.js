(function () {
  'use strict';

  var API_BASE = '/api/index.php?route=';
  var state = {
    config: null,
    user: null,
    orders: [],
    ordersLoadPromise: null,
    googleReady: false,
    googleRenderAttempts: 0,
    googleRenderTimer: null,
    loginBusy: false,
    localEmulation: false,
  };
  var ordersRefreshTimer = null;
  var ORDERS_REFRESH_MS = 20000;
  var ordersInteractionUntilTs = 0;
  var ordersFilter = 'all';
  var ordersSearch = '';
  var PREVIEW_ACTIVE = false;
  var PREVIEW_ORDERS_KEY = 'ss_preview_orders_v1';
  var LOCAL_DEV_ORDERS_KEY = 'ss_local_dev_orders_account_v3';
  var DEV_LOGIN_WRAPPER_ID = 'localDevLoginWrap';
  var DEV_LOGIN_EMAIL_KEY = 'ss_local_login_email';
  var DEV_LOGIN_NAME_KEY = 'ss_local_login_name';
  try {
    PREVIEW_ACTIVE = new URLSearchParams(window.location.search).get('preview_active') === '1';
  } catch (_) {
    PREVIEW_ACTIVE = false;
  }

  function $(id) { return document.getElementById(id); }

  function isLocalRuntime() {
    var host = '';
    try {
      host = String(window.location.hostname || '').toLowerCase();
    } catch (_) {
      host = '';
    }
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function previewReadOrders() {
    try {
      var raw = sessionStorage.getItem(PREVIEW_ORDERS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function previewWriteOrders(list) {
    try {
      sessionStorage.setItem(PREVIEW_ORDERS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (_) {
      /* ignore */
    }
  }

  function previewCreateOrder(input) {
    var now = new Date();
    var id = 'PREV-' + String(now.getTime());
    var payload = input && typeof input === 'object' ? input : {};
    var next = {
      id: String(payload.id || id),
      sku: String(payload.sku || 'PREVIEW-SKU-001'),
      name: String(payload.name || payload.product || 'Pedido de prueba QA'),
      product: String(payload.product || payload.name || 'Pedido de prueba QA'),
      status: String(payload.status || 'pending_payment'),
      amount: String(payload.amount || '99.99'),
      total_amount: String(payload.total_amount || payload.amount || '99.99'),
      currency: String(payload.currency || 'EUR'),
      tracking: String(payload.tracking || ''),
      created_at: String(payload.created_at || now.toISOString()),
      updated_at: String(payload.updated_at || now.toISOString()),
    };
    var list = previewReadOrders();
    list.unshift(next);
    previewWriteOrders(list.slice(0, 25));
    return next;
  }

  function localDevReadOrders() {
    try {
      var raw = localStorage.getItem(LOCAL_DEV_ORDERS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function localDevWriteOrders(list) {
    try {
      localStorage.setItem(LOCAL_DEV_ORDERS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (_) {
      /* ignore */
    }
  }

  function localDevSeedOrders(user) {
    var now = Date.now();
    var email = String((user && user.email) || 'prueba.local@scootshop.co').trim().toLowerCase();
    var image = '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/1.webp';
    var supportImage = '/accesorios/soporte-movil/img/1.webp';
    var bagImage = '/accesorios/bolsa-almacenamiento/img/1.webp';
    var rgbLightsImage = '/accesorios/luces-led-rgb/img/1.webp';
    return [
      {
        id: 'DEV-SS-0001',
        sku: 'M41TANK',
        name: 'Pedido combinado M41 + accesorios',
        product: 'Pedido combinado M41 + accesorios',
        product_image_url: image,
        status: 'pending_payment',
        amount: '588.90',
        total_amount: '588.90',
        currency: 'EUR',
        email: email,
        customer_name: 'Cliente local',
        payment_method: 'manual',
        order_items: [
          { sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', qty: 1, unit_price: 530, line_total: 530, image: image, color_label: '' },
          { sku: 'SOPMOVIL', name: 'Soporte móvil', qty: 1, unit_price: 24.95, line_total: 24.95, image: supportImage, color_label: 'Negro' },
          { sku: 'BOLSAALM', name: 'Bolsa de almacenamiento', qty: 1, unit_price: 33.95, line_total: 33.95, image: bagImage, color_label: 'Negro' }
        ],
        created_at: new Date(now - 5 * 3600000).toISOString(),
        updated_at: new Date(now - 5 * 3500000).toISOString()
      },
      { id: 'DEV-SS-0002', sku: 'BOLSAALM', name: 'Bolsa de almacenamiento', product: 'Bolsa de almacenamiento', product_image_url: bagImage, status: 'paid', amount: '33.95', total_amount: '33.95', currency: 'EUR', email: email, receipt_url: '/uploads/receipts/demo-recibo.pdf?v=3', created_at: new Date(now - 4 * 3600000).toISOString(), updated_at: new Date(now - 4 * 3400000).toISOString() },
      { id: 'DEV-SS-0003', sku: 'LUCESRGB', name: 'Luces LED RGB estroboscópicas', product: 'Luces LED RGB estroboscópicas', product_image_url: rgbLightsImage, status: 'processing', amount: '26.95', total_amount: '26.95', currency: 'EUR', email: email, created_at: new Date(now - 3 * 3600000).toISOString(), updated_at: new Date(now - 3 * 3300000).toISOString() },
      { id: 'DEV-SS-0004', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'shipped', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-001', email: email, created_at: new Date(now - 2 * 3600000).toISOString(), updated_at: new Date(now - 2 * 3200000).toISOString() },
      { id: 'DEV-SS-0005', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'delivered', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-002', email: email, receipt_url: '/uploads/receipts/demo-recibo.pdf?v=3', created_at: new Date(now - 1 * 3600000).toISOString(), updated_at: new Date(now - 1 * 3100000).toISOString() }
    ];
  }

  function localDevNormalizeOrders(list, user) {
    var fallbackImage = '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/1.webp';
    var seeded = localDevSeedOrders(user);
    var source = Array.isArray(list) ? list.filter(function (item) {
      return item && typeof item === 'object';
    }) : [];

    if (!source.length) {
      return { list: seeded, changed: true };
    }

    var normalized = source.map(function (order) {
      var next = Object.assign({}, order);
      if (!String(next.product_image_url || '').trim()) {
        next.product_image_url = fallbackImage;
      }
      if (Array.isArray(next.order_items) && next.order_items.length) {
        next.order_items = next.order_items.map(function (item) {
          return Object.assign({}, item);
        });
      }
      return next;
    });

    var requiredStatuses = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered'];
    var present = {};
    for (var i = 0; i < normalized.length; i++) {
      present[String(normalized[i].status || '').toLowerCase()] = true;
    }

    var complete = normalized.length >= requiredStatuses.length && requiredStatuses.every(function (status) {
      return !!present[status];
    });

    var hasMultiItemOrder = normalized.some(function (order) {
      return String(order.id || '') === 'DEV-SS-0001' && Array.isArray(order.order_items) && order.order_items.length > 1;
    });

    var hasBagOrder = normalized.some(function (order) {
      var sku = String(order && order.sku || '').toUpperCase();
      var title = String((order && (order.name || order.product)) || '').toLowerCase();
      return sku === 'BOLSAALM' || title.indexOf('bolsa de almacenamiento') !== -1;
    });

    var hasRgbLightsOrder = normalized.some(function (order) {
      var sku = String(order && order.sku || '').toUpperCase();
      var title = String((order && (order.name || order.product)) || '').toLowerCase();
      return sku === 'LUCESRGB' || (title.indexOf('luces') !== -1 && title.indexOf('rgb') !== -1);
    });

    if (!complete || !hasMultiItemOrder || !hasBagOrder || !hasRgbLightsOrder) {
      return { list: seeded, changed: true };
    }

    var changed = false;
    for (var j = 0; j < source.length; j++) {
      if (source[j] !== normalized[j]) {
        changed = true;
        break;
      }
    }
    return { list: normalized, changed: changed };
  }

  function localDevLoadOrSeedOrders(user) {
    var existing = localDevReadOrders();
    var normalized = localDevNormalizeOrders(existing, user);
    if (normalized.changed) {
      localDevWriteOrders(normalized.list);
    }
    return normalized.list;
  }

  function isLocalEmulationActive() {
    return !!state.localEmulation;
  }

  function setSessionMode(mode) {
    var shell = $('accountSessionShell');
    if (!shell) return;
    shell.classList.remove('is-guest', 'is-logged');
    if (mode === 'guest') shell.classList.add('is-guest');
    if (mode === 'logged') shell.classList.add('is-logged');
  }

  function setSessionLayout(isLoggedIn) {
    var body = document.body;
    if (!body) return;
    body.classList.remove('account-page--session-only');
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function trackingStageIndex(status) {
    if (status === 'pending_payment') return 0;
    if (status === 'paid') return 1;
    if (status === 'processing' || status === 'preparing') return 2;
    if (status === 'shipped') return 3;
    if (status === 'delivered') return 4;
    if (status === 'cancelled' || status === 'error') return 0;
    return 2;
  }

  function trackingStatusLabel(status) {
    if (status === 'pending_payment') return '⏳ Pendiente pago';
    if (status === 'paid') return '✅ Pagado';
    if (status === 'processing' || status === 'preparing') return '📦 Preparando';
    if (status === 'shipped') return '🚚 Enviado';
    if (status === 'delivered') return '🏠 Entregado';
    if (status === 'cancelled') return '❌ Cancelado';
    if (status === 'error') return '⚠️ Error';
    return '📦 Preparando';
  }

  function trackingProgress(status) {
    var idx = trackingStageIndex(status);
    return Math.round((idx / 4) * 100);
  }

  function orderNumberLabel(order) {
    var raw = String(
      (order && (order.id || order.order_id || order.order_number || order.number)) || ''
    ).trim();
    return raw || 'SIN-ID';
  }

  function formatShortDate(value) {
    if (!value) return '—';
    try {
      var date = new Date(value);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (_) {
      return '—';
    }
  }

  function formatLastUpdate(value) {
    if (!value) return 'Última actualización —';
    try {
      var date = new Date(value);
      if (isNaN(date.getTime())) return 'Última actualización —';
      var text = date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return 'Última actualización ' + text;
    } catch (_) {
      return 'Última actualización —';
    }
  }

  function updateStats(count, linkedCount, tracking) {
    var ordersStat = $('accountOrdersStat');
    var linkedStat = $('accountLinkedStat');
    var trackingStat = $('accountTrackingStat');
    var quickOrders = $('accountQuickOrders');
    var quickTrackings = $('accountQuickTrackings');
    var quickSupport = $('accountQuickSupport');
    if (ordersStat) ordersStat.textContent = String(count || 0);
    if (linkedStat) linkedStat.textContent = String(linkedCount || 0);
    if (trackingStat) trackingStat.textContent = tracking || '—';
    if (quickOrders) quickOrders.textContent = String(count || 0);

    if (quickTrackings) {
      var trackingCount = 0;
      if (Array.isArray(state.orders)) {
        trackingCount = state.orders.filter(function (order) {
          var code = String((order && (order.tracking || order.tracking_number || order.tracking_code)) || '').trim();
          if (code) return true;
          var status = String((order && order.status) || '').toLowerCase();
          return status === 'shipped' || status === 'delivered';
        }).length;
      }
      quickTrackings.textContent = String(trackingCount);
    }

    if (quickSupport) {
      quickSupport.textContent = 'WhatsApp';
    }
  }

  function toPositiveInt(value) {
    var n = Number(value);
    if (!isFinite(n)) return 0;
    n = Math.floor(n);
    return n > 0 ? n : 0;
  }

  function parseJsonArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(function (item) { return item && typeof item === 'object'; });
    if (typeof raw !== 'string') return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && typeof item === 'object'; }) : [];
    } catch (_) {
      return [];
    }
  }

  function getOrderItems(order) {
    var source = order && typeof order === 'object' ? order : {};
    if (Array.isArray(source.cart_items)) return source.cart_items;
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.order_items)) return source.order_items;
    return parseJsonArray(source.cart_items_json);
  }

  function getOrderItemsCount(order, items) {
    var source = order && typeof order === 'object' ? order : {};
    var explicit = toPositiveInt(
      source.items_count || source.item_count || source.products_count || source.total_items || source.cart_items_count
    );
    if (explicit) return explicit;

    var list = Array.isArray(items) ? items : [];
    var units = 0;
    for (var i = 0; i < list.length; i++) {
      var entry = list[i] || {};
      var qty = toPositiveInt(entry.qty || entry.quantity || entry.units || 1);
      units += qty || 1;
    }
    if (units > 0) return units;

    return source.sku || source.product || source.name ? 1 : 0;
  }

  function getOrderPrimaryImage(order, items) {
    var source = order && typeof order === 'object' ? order : {};
    var preferred = String(source.product_image_url || source.image || source.image_url || '').trim();
    if (preferred) return preferred;

    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var candidate = getOrderItemImage(item);
      if (candidate) return candidate;
    }
    return '';
  }

  function getOrderItemImage(item) {
    var row = item && typeof item === 'object' ? item : {};
    var product = row.product && typeof row.product === 'object' ? row.product : {};
    return String(
      row.image || row.product_image_url || row.image_url || row.img || row.photo || row.thumbnail ||
      product.image || product.product_image_url || product.image_url || product.img || ''
    ).trim();
  }

  function getOrderImageList(order, items) {
    var out = [];

    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var candidate = getOrderItemImage(item);
      if (!candidate) continue;
      var qty = toPositiveInt(item.qty || item.quantity || item.units || 1);
      if (!qty) qty = 1;
      for (var q = 0; q < qty; q++) {
        out.push(candidate);
        if (out.length >= 12) break;
      }
      if (out.length >= 12) break;
    }

    return out;
  }

  function resolveOrderAvatar(order) {
    var items = getOrderItems(order);
    var images = getOrderImageList(order, items);
    return {
      itemCount: getOrderItemsCount(order, items),
      imageUrl: images[0] || getOrderPrimaryImage(order, items),
      imageList: images
    };
  }

  // ── Acciones por pedido: descargar recibo (PDF admin) ──

  // El recibo es un PDF que sube el admin por pedido. El botón solo aparece
  // si el pedido tiene un receipt_url y enlaza directamente a ese archivo.
  function orderReceiptUrl(order) {
    return String((order && order.receipt_url) || '').trim();
  }

  function orderTracking(order) {
    return String((order && (order.tracking || order.tracking_number || order.tracking_code)) || '').trim();
  }

  // Indicador "recibo nuevo": marca por pedido qué receipt_url ya se ha visto,
  // para mostrar un punto en el kebab solo mientras el recibo sea novedad.
  var SEEN_RECEIPTS_KEY = 'ss_seen_receipts_v1';
  function readSeenReceipts() {
    try {
      var raw = localStorage.getItem(SEEN_RECEIPTS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  function receiptIsNew(orderId, receiptUrl) {
    if (!receiptUrl) return false;
    return readSeenReceipts()[String(orderId)] !== receiptUrl;
  }
  function markReceiptSeen(orderId, receiptUrl) {
    if (!orderId || !receiptUrl) return;
    var seen = readSeenReceipts();
    if (seen[String(orderId)] === receiptUrl) return;
    seen[String(orderId)] = receiptUrl;
    try { localStorage.setItem(SEEN_RECEIPTS_KEY, JSON.stringify(seen)); } catch (_) { /* ignore */ }
  }

  function disabledMenuItem(icon, label) {
    return '<span class="order-menu-item is-disabled" role="menuitem" aria-disabled="true" title="Aún no disponible">' +
      '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>' +
      '<span class="order-menu-item-label">' + esc(label) + '<small>Aún no disponible</small></span>' +
      '</span>';
  }

  // Menú de 3 puntos (arriba-derecha): descargar recibo + copiar tracking.
  // Si falta alguno, la opción aparece en gris con microcopy "Aún no disponible".
  function orderMenuHtml(order) {
    var orderId = String((order && order.id) || '');
    var receiptUrl = orderReceiptUrl(order);
    var tracking = orderTracking(order);
    var fileName = 'recibo-' + String(orderNumberLabel(order)).replace(/[^A-Za-z0-9_-]+/g, '-') + '.pdf';
    var hasNew = receiptIsNew(orderId, receiptUrl);

    var bang = hasNew ? '<span class="order-menu-item-bang" aria-hidden="true">!</span>' : '';
    var receiptItem = receiptUrl
      ? '<a class="order-menu-item" role="menuitem" href="' + esc(receiptUrl) + '" target="_blank" rel="noopener noreferrer" download="' + esc(fileName) + '"><i class="fa-solid fa-receipt" aria-hidden="true"></i><span class="order-menu-item-label">Descargar recibo</span>' + bang + '</a>'
      : disabledMenuItem('fa-receipt', 'Descargar recibo');

    var trackingItem = tracking
      ? '<button type="button" class="order-menu-item" role="menuitem" data-copy-tracking="' + esc(tracking) + '"><i class="fa-solid fa-truck" aria-hidden="true"></i><span class="order-menu-item-label">Copiar tracking</span></button>'
      : disabledMenuItem('fa-truck', 'Copiar tracking');

    return [
      '<div class="order-menu' + (hasNew ? ' has-new' : '') + '" data-order-menu data-order-id="' + esc(orderId) + '" data-receipt-url="' + esc(receiptUrl) + '">',
      '  <button type="button" class="order-menu-btn" aria-label="Acciones del pedido' + (hasNew ? ' · recibo disponible' : '') + '" aria-haspopup="true" aria-expanded="false" data-menu-toggle><span class="order-menu-dots" aria-hidden="true"></span><span class="order-menu-bang" aria-hidden="true">!</span></button>',
      '  <div class="order-menu-pop" role="menu" hidden>',
      '    ' + receiptItem,
      '    ' + trackingItem,
      '  </div>',
      '</div>'
    ].join('');
  }

  function closeAllOrderMenus() {
    var grid = $('ordersGrid');
    if (!grid) return;
    Array.prototype.forEach.call(grid.querySelectorAll('.order-menu.is-open'), function (m) {
      m.classList.remove('is-open');
      var b = m.querySelector('[data-menu-toggle]');
      if (b) b.setAttribute('aria-expanded', 'false');
      var p = m.querySelector('.order-menu-pop');
      if (p) p.hidden = true;
    });
    Array.prototype.forEach.call(grid.querySelectorAll('.order-history-item.is-menu-open'), function (c) {
      c.classList.remove('is-menu-open');
    });
  }

  function toggleOrderMenu(toggleBtn) {
    var menu = toggleBtn.closest('.order-menu');
    if (!menu) return;
    var card = toggleBtn.closest('.order-history-item');
    var willOpen = !menu.classList.contains('is-open');
    closeAllOrderMenus();
    if (!willOpen) return;
    menu.classList.add('is-open');
    if (card) card.classList.add('is-menu-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    var pop = menu.querySelector('.order-menu-pop');
    if (pop) pop.hidden = false;
    // Al abrir, el "!" del kebab desaparece: la alerta "se mueve" a la opción del menú.
    if (menu.classList.contains('has-new')) {
      markReceiptSeen(menu.getAttribute('data-order-id'), menu.getAttribute('data-receipt-url'));
      menu.classList.remove('has-new');
      toggleBtn.setAttribute('aria-label', 'Acciones del pedido');
    }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (_) { /* ignore */ }
  }

  function copyTracking(value, btn) {
    var text = String(value || '');
    if (!text) return;
    function flash() {
      if (!btn) return;
      var original = btn.getAttribute('data-label') || btn.innerHTML;
      if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', original);
      btn.innerHTML = '<i class="fa-solid fa-truck" aria-hidden="true"></i> Tracking copiado';
      setTimeout(function () {
        btn.innerHTML = btn.getAttribute('data-label');
        closeAllOrderMenus();
      }, 1100);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(function () { legacyCopy(text); flash(); });
    } else {
      legacyCopy(text);
      flash();
    }
  }

  function renderOrderAvatar(orderNumber, avatar) {
    var fallback = String(orderNumber || '').trim();
    fallback = fallback ? fallback.slice(-1) : '•';

    var itemCount = toPositiveInt(avatar && avatar.itemCount);
    var imageUrl = String((avatar && avatar.imageUrl) || '').trim();
    var imageList = Array.isArray(avatar && avatar.imageList) ? avatar.imageList.slice(0, 12) : [];

    if (itemCount === 1 && imageUrl) {
      return [
        '<div class="history-avatar history-avatar--product" aria-hidden="true">',
        '  <img class="history-avatar-img history-avatar-img--single" src="' + esc(imageUrl) + '" alt="" loading="lazy" decoding="async">',
        '</div>'
      ].join('');
    }

    if (itemCount > 1) {
      var visibleTiles = Math.min(4, itemCount);
      var extraCount = itemCount > 4 ? (itemCount - 4) : 0;
      if (imageList.length >= 2 || imageUrl) {
        var collageImages = imageList.slice(0, visibleTiles);
        while (collageImages.length < visibleTiles && imageUrl) {
          collageImages.push(imageUrl);
        }
        var tiles = [0, 1, 2, 3].map(function (index) {
          var src = String(collageImages[index] || '').trim();
          if (!src) {
            return '<span class="history-avatar-tile" aria-hidden="true"></span>';
          }
          return '<span class="history-avatar-tile"><img class="history-avatar-img history-avatar-img--tile" src="' + esc(src) + '" alt="" loading="lazy" decoding="async"></span>';
        }).join('');
        return [
          '<div class="history-avatar history-avatar--collage" aria-hidden="true">',
          '  <span class="history-avatar-grid">' + tiles + '</span>',
          (extraCount > 0 ? '  <span class="history-avatar-badge">+' + esc(extraCount) + '</span>' : ''),
          '</div>'
        ].join('');
      }

      if (imageUrl) {
        var fallbackCount = itemCount > 99 ? '99+' : String(itemCount);
        return [
          '<div class="history-avatar history-avatar--product history-avatar--multi" aria-hidden="true">',
          '  <img class="history-avatar-img history-avatar-img--single" src="' + esc(imageUrl) + '" alt="" loading="lazy" decoding="async">',
          '  <span class="history-avatar-badge">x' + esc(fallbackCount) + '</span>',
          '</div>'
        ].join('');
      }
      var fallbackBadge = itemCount > 99 ? '99+' : String(itemCount);
      return '<div class="history-avatar history-avatar--multi-fallback" aria-hidden="true">x' + esc(fallbackBadge) + '</div>';
    }

    return '<div class="history-avatar">' + esc(fallback) + '</div>';
  }

  function setLoading(loading) {
    var loadingEl = $('accountStatusLoading');
    var statusEl = $('accountStatus');
    if (!loadingEl || !statusEl) return;
    loadingEl.hidden = !loading;
    statusEl.hidden = loading;
  }

  function setMessage(text, kind) {
    var out = $('authMessage');
    if (!out) return;
    var cls = 'account-note';
    if (kind === 'error') cls += ' account-note--error';
    if (kind === 'success') cls += ' account-note--success';
    out.className = cls;
    out.textContent = text || '';
  }

  function syncSharedAuthUi() {
    if (PREVIEW_ACTIVE) return;
    if (window.SS_AUTH_UI && typeof window.SS_AUTH_UI.refresh === 'function') {
      window.SS_AUTH_UI.refresh();
      return;
    }
    scheduleHeaderAccountStateSync(24);
  }

  function resolveHeaderUiState() {
    return (state.user && state.user.email) ? 'logged_in' : 'guest';
  }

  function headerStateLabel(uiState) {
    if (uiState === 'logged_in' && state.user && state.user.email) {
      return 'Cuenta conectada: ' + String(state.user.email).trim();
    }
    return 'Ir a área cliente';
  }

  function syncHeaderAccountState() {
    var btn = $('headerAccountToggle');
    var dot = $('headerAccountDot');
    var uiState = resolveHeaderUiState();
    if (!btn) return false;

    btn.dataset.authState = uiState;
    btn.setAttribute('aria-label', headerStateLabel(uiState));
    if (dot) {
      dot.hidden = false;
      dot.className = 'header-account-dot header-account-dot--' + uiState;
    }
    return true;
  }

  function scheduleHeaderAccountStateSync(retries) {
    var remaining = Number(retries || 0);
    if (syncHeaderAccountState() || remaining <= 0) return;
    setTimeout(function () {
      scheduleHeaderAccountStateSync(remaining - 1);
    }, 140);
  }

  function renderAvatar(user) {
    var wrap = $('accountAvatarWrap');
    if (!wrap) return;
    var picture = user && user.picture ? String(user.picture).trim() : '';
    var initials = ((user && user.name) ? String(user.name).trim() : (user && user.email ? String(user.email).trim() : 'U')) || 'U';
    initials = initials.slice(0, 1).toUpperCase();
    if (picture) {
      wrap.innerHTML = '<img class="account-avatar" src="' + esc(picture) + '" alt="Avatar de ' + esc(user.name || user.email || 'usuario') + '" referrerpolicy="no-referrer">';
      return;
    }
    wrap.innerHTML = '<div class="account-avatar-fallback" aria-hidden="true">' + esc(initials) + '</div>';
  }

  // Estado filtrado actual (filtro de pestaña + búsqueda por nº de pedido).
  function ordersFilteredState() {
    var allOrders = Array.isArray(state.orders) ? state.orders : [];
    var searchTerm = String(ordersSearch || '').trim().toLowerCase();
    var filtered = allOrders.filter(function (order) {
      var st = String((order && order.status) || '').toLowerCase();
      if (ordersFilter === 'active' && st === 'delivered') return false;
      if (ordersFilter === 'delivered' && st !== 'delivered') return false;
      if (searchTerm && String((order && order.id) || '').toLowerCase().indexOf(searchTerm) === -1) return false;
      return true;
    });
    return { allOrders: allOrders, filtered: filtered, baseOrders: filtered.slice(0, 10) };
  }

  function ordersRowsHtml(baseOrders) {
    return baseOrders.map(function (order) {
      var orderNumber = orderNumberLabel(order);
      var avatar = resolveOrderAvatar(order);
      var rawStatus = String(order.status || 'processing');
      var status = trackingStatusLabel(rawStatus);
      var lastUpdate = formatLastUpdate(order.updated_at || order.created_at);
      var date = formatShortDate(order.created_at);
      var progress = trackingProgress(rawStatus);
      var stageIdx = trackingStageIndex(rawStatus);
      var trackLineClass = 'track-line' + (stageIdx >= 4 ? ' is-delivered' : '');
      var viewUrl = '/pedido/?order=' + encodeURIComponent(String(order.id || '')) + (PREVIEW_ACTIVE ? '&preview_active=1' : '');
      var deliveredCls = stageIdx >= 4 ? ' is-delivered' : '';
      return [
        '<article class="order-history-item' + deliveredCls + '">',
        '<a class="order-history-link" href="' + esc(viewUrl) + '">',
        '  <div class="history-top">',
        '    ' + renderOrderAvatar(orderNumber, avatar),
        '    <div class="history-main">',
        '      <strong>' + esc(orderNumber) + '</strong>',
        '      <span>' + esc(lastUpdate) + '</span>',
        '    </div>',
        '    <div class="history-date">' + esc(date) + '</div>',
        '  </div>',
        '  <div class="tracking-inline">',
        '    <div class="tracking-status">' + esc(status) + '</div>',
        '    <div class="' + esc(trackLineClass) + '" style="--progress:' + esc(progress + '%') + ';">',
        '      <i aria-hidden="true"></i>',
        '      <div class="tracking-icons">',
        '        <span class="' + (stageIdx >= 0 ? 'is-on' : '') + '" title="Pendiente pago">⏳</span>',
        '        <span class="' + (stageIdx >= 1 ? 'is-on' : '') + '" title="Pagado">✅</span>',
        '        <span class="' + (stageIdx >= 2 ? 'is-on' : '') + '" title="Preparando">📦</span>',
        '        <span class="' + (stageIdx >= 3 ? 'is-on' : '') + '" title="Enviado">🚚</span>',
        '        <span class="' + (stageIdx >= 4 ? 'is-on' : '') + '" title="Entregado">🏠</span>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</a>',
        orderMenuHtml(order),
        '</article>'
      ].join('');
    }).join('');
  }

  function ordersListInnerHtml(canShowOrders, allOrders, baseOrders) {
    if (baseOrders.length) return ordersRowsHtml(baseOrders);
    if (!canShowOrders) return '<div class="history-empty">Inicia sesión para ver tus pedidos recientes.</div>';
    return allOrders.length
      ? '<div class="history-empty">No hay pedidos que coincidan con el filtro o la búsqueda.</div>'
      : '<div class="history-empty">Todavía no hay pedidos recientes en esta cuenta.</div>';
  }

  function ordersCountLabel(allOrders, filtered) {
    return filtered.length === allOrders.length
      ? allOrders.length + (allOrders.length === 1 ? ' pedido' : ' pedidos')
      : filtered.length + ' de ' + allOrders.length;
  }

  // Actualiza SOLO la lista y el contador, sin tocar el input ni el toolbar.
  // Clave del fix: al buscar NO se reconstruye el <input>, así el teclado del
  // móvil no se cierra/resetea entre teclas.
  function updateOrdersList() {
    var grid = $('ordersGrid');
    if (!grid) return;
    var canShowOrders = !!state.user || isLocalEmulationActive();
    var data = ordersFilteredState();
    var listEl = grid.querySelector('.order-history-list');
    if (listEl) listEl.innerHTML = ordersListInnerHtml(canShowOrders, data.allOrders, data.baseOrders);
    var countEl = grid.querySelector('.acct-orders-count');
    if (countEl) countEl.textContent = ordersCountLabel(data.allOrders, data.filtered);
  }

  function renderOrders() {
    var grid = $('ordersGrid');
    if (!grid) return;

    var canShowOrders = !!state.user || isLocalEmulationActive();
    var data = ordersFilteredState();
    var allOrders = data.allOrders;
    var filtered = data.filtered;
    var baseOrders = data.baseOrders;

    function filterBtn(key, label) {
      return '<button type="button" class="acct-tab' + (ordersFilter === key ? ' is-active' : '') + '" data-filter="' + key + '">' + label + '</button>';
    }

    var toolsHtml = '';
    var countLabel = '';
    if (canShowOrders && allOrders.length) {
      toolsHtml = [
        '<div class="acct-tools">',
        '  <div class="acct-tabs" aria-label="Filtrar pedidos">',
        filterBtn('all', 'Todos'),
        filterBtn('active', 'En curso'),
        filterBtn('delivered', 'Entregados'),
        '  </div>',
        '  <input type="search" id="ordersSearchInput" class="acct-search" placeholder="Buscar nº de pedido" value="' + esc(ordersSearch) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Buscar por número de pedido">',
        '</div>'
      ].join('');
      countLabel = ordersCountLabel(allOrders, filtered);
    }

    grid.hidden = false;
    grid.innerHTML = [
      '<section class="order-history">',
      '  <div class="order-history-head">',
      '    <h2>Pedidos<i class="fa-solid fa-box" aria-hidden="true"></i></h2>',
      countLabel ? '    <span class="acct-orders-count">' + esc(countLabel) + '</span>' : '',
      '  </div>',
      toolsHtml,
      '  <div class="order-history-list">',
      ordersListInnerHtml(canShowOrders, allOrders, baseOrders),
      '  </div>',
      '</section>'
    ].join('');

    Array.prototype.forEach.call(grid.querySelectorAll('.acct-tab'), function (btn) {
      btn.addEventListener('click', function () {
        ordersFilter = btn.getAttribute('data-filter') || 'all';
        markOrdersInteraction(4000);
        // Cambiar el estado activo sin reconstruir el toolbar (no toca el input).
        Array.prototype.forEach.call(grid.querySelectorAll('.acct-tab'), function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-filter') === ordersFilter);
        });
        updateOrdersList();
      });
    });
    var searchInput = grid.querySelector('#ordersSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        ordersSearch = String(searchInput.value || '');
        markOrdersInteraction(8000);
        updateOrdersList();
      });
    }

    updateStats(allOrders.length, canShowOrders ? allOrders.length : 0, allOrders.length ? (allOrders.filter(function (o) { return trackingProgress(o.status || 'processing') >= 55; }).length + ' con tracking') : '—');
  }

  // ── PESTAÑAS (Pedidos / Direcciones / Ayuda) ──────────────────
  function setAccountTab(tab) {
    var panels = document.querySelectorAll('.acct-panel');
    Array.prototype.forEach.call(panels, function (p) {
      p.hidden = (p.getAttribute('data-panel') !== tab);
    });
    var tiles = document.querySelectorAll('.acct-tab-tile');
    Array.prototype.forEach.call(tiles, function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var main = document.querySelector('.acct-main');
    if (main) main.setAttribute('data-active', tab);
  }

  function updateAddressCount() {
    var el = $('accountQuickAddresses');
    if (el) el.textContent = String((state.addresses || []).length);
  }

  // ── PERFIL + LIBRETA DE DIRECCIONES (solo sesión real) ────────
  function isRealCustomer() {
    return !!(state.user && Number(state.user.id || 0) > 0 && !state.user.__preview);
  }

  function hideAccountExtras() {
    var p = $('accountProfileCard');
    var a = $('accountAddressCard');
    if (p) { p.hidden = true; p.innerHTML = ''; }
    if (a) { a.hidden = true; a.innerHTML = ''; }
    var note = $('addressesGuestNote');
    if (note) note.hidden = false;
    var cnt = $('accountQuickAddresses');
    if (cnt) cnt.textContent = '0';
  }

  function loadProfile() {
    if (!isRealCustomer()) { hideAccountExtras(); return Promise.resolve(); }
    return apiFetch('account_profile', { method: 'GET' }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) { hideAccountExtras(); return; }
      state.profile = res.data.profile || {};
      state.addresses = Array.isArray(res.data.addresses) ? res.data.addresses : [];
      state.editingAddressId = null;
      var note = $('addressesGuestNote');
      if (note) note.hidden = true;
      renderProfileCard();
      renderAddressCard();
      updateAddressCount();
    }).catch(function () { hideAccountExtras(); });
  }

  function renderProfileCard() {
    var card = $('accountProfileCard');
    if (!card || !window.SS_ADDR) return;
    var p = state.profile || {};
    card.hidden = false;
    card.innerHTML = [
      '<div class="acct-cardhead"><h2 class="acct-cardhead__title">Mis datos<i class="fa-solid fa-user" aria-hidden="true"></i></h2></div>',
      '<form class="acct-form" id="accountProfileForm" novalidate>',
      window.SS_ADDR.contactFieldsHtml({ idPrefix: 'prof', emailDisabled: true, values: { fullName: p.name || '', email: p.email || '', phone: p.phone || '' } }),
      '  <div class="acct-form-actions">',
      '    <button type="submit" class="acct-btn acct-btn--dark" id="profileSaveBtn">Guardar</button>',
      '    <span class="acct-form-note" id="profileNote"></span>',
      '  </div>',
      '</form>'
    ].join('');
  }

  function addressText(a) {
    var parts = [];
    if (a.address) parts.push(a.address);
    if (a.address2) parts.push(a.address2);
    var line2 = [a.postal, a.city].filter(Boolean).join(' ');
    if (line2) parts.push(line2);
    var line3 = [a.province, a.country].filter(Boolean).join(', ');
    if (line3) parts.push(line3);
    return parts.join(' · ');
  }

  function addressRowHtml(a) {
    var label = a.label || 'Dirección';
    return [
      '<div class="acct-address' + (a.is_default ? ' is-default' : '') + '">',
      '  <div class="acct-address-top">',
      '    <span class="acct-address-label">' + esc(label) + '</span>',
      (a.is_default ? '    <span class="acct-default-badge">Predeterminada</span>' : ''),
      '  </div>',
      '  <div class="acct-address-text">' + esc(addressText(a)) + '</div>',
      '  <div class="acct-address-actions">',
      '    <button type="button" class="acct-addr-action" data-addr-edit="' + esc(a.id) + '">Editar</button>',
      (a.is_default ? '' : '    <button type="button" class="acct-addr-action" data-addr-default="' + esc(a.id) + '">Predeterminada</button>'),
      '    <button type="button" class="acct-addr-action acct-addr-action--danger" data-addr-delete="' + esc(a.id) + '">Eliminar</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function addressFormHtml(a) {
    a = a || {};
    var editing = Number(a.id || 0) > 0;
    return [
      '<form class="acct-form" id="addressForm" novalidate>',
      '  <div class="form-grid"><div class="field field--full"><label for="addr_label">Etiqueta <span class="opt">(opcional)</span></label><input id="addr_label" data-addr="label" type="text" maxlength="80" placeholder="Casa, Trabajo…" value="' + esc(a.label || '') + '"></div></div>',
      window.SS_ADDR.addressFieldsHtml({ idPrefix: 'addr', values: { country: a.country || 'España', address: a.address || '', address2: a.address2 || '', postal: a.postal || '', city: a.city || '', province: a.province || '' } }),
      '  <label class="acct-check"><input type="checkbox" data-addr="default"' + (a.is_default ? ' checked' : '') + '> Usar como predeterminada</label>',
      '  <div class="acct-form-actions">',
      '    <button type="submit" class="acct-btn acct-btn--dark" id="addrSaveBtn">' + (editing ? 'Guardar dirección' : 'Añadir dirección') + '</button>',
      '    <button type="button" class="acct-btn" id="addrCancelBtn">Cancelar</button>',
      '    <span class="acct-form-note" id="addrNote"></span>',
      '  </div>',
      '</form>'
    ].join('');
  }

  function renderAddressCard() {
    var card = $('accountAddressCard');
    if (!card) return;
    card.hidden = false;
    var editing = state.editingAddressId !== null && state.editingAddressId !== undefined;
    var html = ['<div class="acct-cardhead"><h2 class="acct-cardhead__title">Direcciones<i class="fa-solid fa-location-dot" aria-hidden="true"></i></h2>'];
    if (!editing) {
      html.push('<button type="button" class="acct-link-btn" id="addAddressBtn">+ Añadir</button>');
    }
    html.push('</div>');

    var current = {};
    if (editing) {
      current = Number(state.editingAddressId) === 0
        ? {}
        : ((state.addresses || []).filter(function (x) { return Number(x.id) === Number(state.editingAddressId); })[0] || {});
      html.push(addressFormHtml(current));
    } else if (!state.addresses || !state.addresses.length) {
      html.push('<p class="acct-empty-note">Aún no tienes direcciones guardadas. Añade una para agilizar tus próximos pedidos.</p>');
    } else {
      html.push(state.addresses.map(addressRowHtml).join(''));
    }
    card.innerHTML = html.join('');

    if (editing && window.SS_ADDR) {
      var form = card.querySelector('#addressForm');
      if (form) window.SS_ADDR.bindAddressForm(form, { province: current.province, city: current.city });
    }
  }

  function saveProfile() {
    var form = $('accountProfileForm');
    var btn = $('profileSaveBtn');
    var note = $('profileNote');
    var c = (window.SS_ADDR && form) ? window.SS_ADDR.readContact(form) : { fullName: '', phone: '' };
    var name = c.fullName;
    var phone = c.phone;
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    apiFetch('account_profile_update', { method: 'POST', body: JSON.stringify({ name: name, phone: phone }) }).then(function (res) {
      if (res.ok && res.data && res.data.ok) {
        state.profile = Object.assign({}, state.profile, { name: name, phone: phone });
        if (state.user) state.user.name = name;
        var nm = $('accountUserName');
        if (nm && name) nm.textContent = name;
        if (note) { note.textContent = 'Guardado ✓'; note.className = 'acct-form-note acct-form-note--ok'; }
      } else if (note) {
        note.textContent = 'No se pudo guardar'; note.className = 'acct-form-note acct-form-note--err';
      }
    }).catch(function () {
      if (note) { note.textContent = 'Error de conexión'; note.className = 'acct-form-note acct-form-note--err'; }
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
      setTimeout(function () { var n = $('profileNote'); if (n) n.textContent = ''; }, 2600);
    });
  }

  function saveAddress() {
    var form = $('addressForm');
    var btn = $('addrSaveBtn');
    var note = $('addrNote');
    if (!window.SS_ADDR || !form) return;
    var addr = window.SS_ADDR.readAddress(form);
    var labelEl = form.querySelector('[data-addr="label"]');
    var defEl = form.querySelector('[data-addr="default"]');
    var payload = {
      id: Number(state.editingAddressId || 0) || 0,
      label: labelEl ? String(labelEl.value || '').trim() : '',
      address: addr.address,
      address2: addr.address2,
      postal: addr.postal,
      city: addr.city,
      province: addr.province,
      country: addr.country,
      is_default: !!(defEl && defEl.checked)
    };
    if (!payload.address || (!payload.city && !payload.postal)) {
      if (note) { note.textContent = 'Completa dirección y ciudad/CP'; note.className = 'acct-form-note acct-form-note--err'; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    apiFetch('account_address_save', { method: 'POST', body: JSON.stringify(payload) }).then(function (res) {
      if (res.ok && res.data && res.data.ok) {
        state.editingAddressId = null;
        return loadProfile();
      }
      if (note) { note.textContent = 'No se pudo guardar'; note.className = 'acct-form-note acct-form-note--err'; }
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar dirección'; }
    }).catch(function () {
      if (note) { note.textContent = 'Error de conexión'; note.className = 'acct-form-note acct-form-note--err'; }
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar dirección'; }
    });
  }

  function deleteAddress(id) {
    if (!id) return;
    if (!window.confirm('¿Eliminar esta dirección?')) return;
    apiFetch('account_address_delete', { method: 'POST', body: JSON.stringify({ id: id }) }).then(function (res) {
      if (res.ok && res.data && res.data.ok) loadProfile();
    });
  }

  function setDefaultAddress(id) {
    var a = (state.addresses || []).filter(function (x) { return Number(x.id) === Number(id); })[0];
    if (!a) return;
    var payload = Object.assign({}, a, { id: id, is_default: true });
    apiFetch('account_address_save', { method: 'POST', body: JSON.stringify(payload) }).then(function (res) {
      if (res.ok && res.data && res.data.ok) loadProfile();
    });
  }

  function stopOrdersAutoRefresh() {
    if (!ordersRefreshTimer) return;
    clearInterval(ordersRefreshTimer);
    ordersRefreshTimer = null;
  }

  function markOrdersInteraction(ms) {
    var duration = Number(ms || 0);
    if (!isFinite(duration) || duration <= 0) duration = 1000;
    var until = Date.now() + duration;
    if (until > ordersInteractionUntilTs) {
      ordersInteractionUntilTs = until;
    }
  }

  function isOrdersInteractionActive() {
    return Date.now() < ordersInteractionUntilTs;
  }

  function startOrdersAutoRefresh() {
    stopOrdersAutoRefresh();
    if (!state.user || (state.user && state.user.__preview)) return;
    ordersRefreshTimer = setInterval(function () {
      if (document.hidden) return;
      if (isOrdersInteractionActive()) return;
      loadOrders();
    }, ORDERS_REFRESH_MS);
  }

  function renderLoggedIn(user) {
    var loginBox = $('accountLoginBox');
    var loggedBox = $('accountLoggedInBox');
    var copy = $('accountLoggedInCopy');
    var statusRow = $('accountStatusRow');
    var sessionState = $('accountSessionState');
    var insights = $('accountInsights');
    var statusEl = $('accountStatus');
    if (!loginBox || !loggedBox || !copy) return;

    loginBox.hidden = true;
    loggedBox.hidden = false;
    setMessage('', '');
    if (statusEl && loginBox.parentNode === statusEl && insights && loginBox.nextSibling !== insights) {
      statusEl.appendChild(loginBox);
    }
    if (statusRow) {
      statusRow.hidden = false;
    }
    if (sessionState) {
      sessionState.hidden = false;
    }
    if (insights) {
      insights.hidden = false;
    }
    clearGoogleLoginUi();
    renderAvatar(user);

    var name = user && user.name ? String(user.name).trim() : 'Tu cuenta';
    var email = user && user.email ? String(user.email).trim() : '';
    var accountUserName = $('accountUserName');
    var accountUserEmail = $('accountUserEmail');
    var accountSessionState = $('accountSessionState');
    if (accountUserName) {
      accountUserName.textContent = name;
    }
    if (accountUserEmail) {
      accountUserEmail.textContent = email || 'Google login activo';
    }
    if (accountSessionState) {
      accountSessionState.textContent = 'ACTIVA';
      accountSessionState.className = 'account-session-state account-session-state--logged-in';
    }
    copy.textContent = 'Tu cuenta está conectada.';
    setSessionMode('logged');
    setSessionLayout(true);
    scheduleHeaderAccountStateSync(24);
  }

  function renderLoggedOut() {
    var loginBox = $('accountLoginBox');
    var loggedBox = $('accountLoggedInBox');
    var copy = $('accountLoggedInCopy');
    var statusRow = $('accountStatusRow');
    var sessionState = $('accountSessionState');
    var insights = $('accountInsights');
    var statusEl = $('accountStatus');
    if (!loginBox || !loggedBox || !copy) return;

    var localEmulation = isLocalEmulationActive();
    var googleHost = $('googleLoginButton');
    if (googleHost) {
      markGoogleButtonReady(googleHost, false);
    }

    loginBox.hidden = localEmulation;
    loggedBox.hidden = true;
    if (statusRow) {
      statusRow.hidden = !localEmulation;
    }
    if (sessionState) {
      sessionState.hidden = false;
      sessionState.textContent = 'INVITADO';
      sessionState.className = 'account-session-state account-session-state--guest';
    }
    if (insights) {
      insights.hidden = false;
    }
    if (statusEl && loginBox.parentNode === statusEl && statusRow && loginBox.nextSibling !== statusRow) {
      statusEl.insertBefore(loginBox, statusRow);
    }
    var avatarWrap = $('accountAvatarWrap');
    var userName = $('accountUserName');
    var userEmail = $('accountUserEmail');
    if (localEmulation) {
      if (avatarWrap) avatarWrap.innerHTML = '<div class="account-avatar-fallback" aria-hidden="true">E</div>';
      if (userName) userName.textContent = 'Pedidos emulados';
      if (userEmail) userEmail.textContent = 'Vista local con 5 estados de pedido';
    } else {
      if (avatarWrap) avatarWrap.innerHTML = '';
      if (userName) userName.textContent = '';
      if (userEmail) userEmail.textContent = '';
    }
    copy.textContent = '';
    setSessionMode('guest');
    setSessionLayout(false);
    hideAccountExtras();
    ensureGoogleLoginForGuest();
    scheduleHeaderAccountStateSync(24);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset && existing.dataset.loaded === 'true') {
          resolve();
          return;
        }
        if (src.indexOf('accounts.google.com/gsi/client') !== -1 && window.google && window.google.accounts && window.google.accounts.id) {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('script_load_failed')); }, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = function () {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = function () { reject(new Error('script_load_failed')); };
      document.head.appendChild(script);
    });
  }

  function apiFetch(route, options) {
    return fetch(API_BASE + encodeURIComponent(route), Object.assign({
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }, options || {})).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      }).catch(function () {
        return { ok: res.ok, status: res.status, data: null };
      });
    });
  }

  function loadStatus() {
    setLoading(true);
    return apiFetch('auth_status', { method: 'GET' }).then(function (res) {
      state.user = res.data && res.data.user ? res.data.user : null;
      state.localEmulation = false;
      if (!state.user && PREVIEW_ACTIVE) {
        state.user = {
          name: 'Cliente SCOOT',
          email: 'cliente@scootshop.co',
          __preview: true,
        };
      } else if (!state.user && isLocalRuntime()) {
        state.localEmulation = true;
      }
      if (state.user) {
        renderLoggedIn(state.user);
      } else {
        renderLoggedOut();
      }
      return state.user;
    }).catch(function () {
      if (PREVIEW_ACTIVE) {
        state.localEmulation = false;
        state.user = {
          name: 'Cliente SCOOT',
          email: 'cliente@scootshop.co',
          __preview: true,
        };
        renderLoggedIn(state.user);
        return state.user;
      }
      state.user = null;
      state.localEmulation = isLocalRuntime();
      renderLoggedOut();
      return null;
    }).finally(function () {
      setLoading(false);
    });
  }

  function loadOrders() {
    if (state.ordersLoadPromise) return state.ordersLoadPromise;

    var run = Promise.resolve().then(function () {
      if (state.user && state.user.__preview) {
        var previewOrders = previewReadOrders();
        if (!previewOrders.length && isLocalRuntime()) {
          previewOrders = localDevLoadOrSeedOrders(state.user);
        }
        state.orders = previewOrders;
        renderOrders();
        return state.orders;
      }

      if (!state.user && isLocalEmulationActive()) {
        state.orders = localDevLoadOrSeedOrders({
          email: 'prueba.local@scootshop.co',
          name: 'Pedidos emulados'
        });
        renderOrders();
        return state.orders;
      }

      if (!state.user) {
        state.orders = [];
        renderOrders();
        return [];
      }

      if (isLocalRuntime() && Number(state.user.id || 0) <= 0) {
        state.orders = localDevLoadOrSeedOrders(state.user);
        renderOrders();
        return state.orders;
      }

      return apiFetch('account_orders', { method: 'GET' }).then(function (res) {
        if (!res.ok || !res.data || !res.data.ok) {
          state.orders = [];
          renderOrders();
          return [];
        }
        state.user = res.data.user || state.user;
        state.orders = Array.isArray(res.data.orders) ? res.data.orders : [];
        renderOrders();
        return state.orders;
      }).catch(function () {
        state.orders = [];
        renderOrders();
        return [];
      });
    });

    state.ordersLoadPromise = run.finally(function () {
      state.ordersLoadPromise = null;
    });
    return state.ordersLoadPromise;
  }

  function handleLoginCredential(response) {
    if (!response || !response.credential) {
      setMessage('No se pudo obtener el token de Google.', 'error');
      return;
    }
    state.loginBusy = true;
    setMessage('Verificando tu sesión de Google...', '');

    apiFetch('auth_google_login', {
      method: 'POST',
      body: JSON.stringify({ id_token: response.credential }),
    }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error((res.data && (res.data.error || res.data.detail)) || 'google_login_failed');
      }
      state.user = res.data.user || null;
      if (state.user) {
        renderLoggedIn(state.user);
      } else {
        renderLoggedOut();
      }
      setMessage('Sesión iniciada correctamente.', 'success');
      return loadStatus().then(function () {
        return loadOrders();
      }).then(function () {
        startOrdersAutoRefresh();
        syncSharedAuthUi();
        loadProfile();
      });
    }).catch(function (err) {
      var message = 'No se pudo iniciar sesión con Google.';
      if (err && err.message === 'google_not_configured') {
        message = 'Google Login no está disponible en este entorno.';
      }
      setMessage(message, 'error');
      renderLoggedOut();
      state.orders = [];
      renderOrders();
    }).finally(function () {
      state.loginBusy = false;
    });
  }

  function handleDevLogin() {
    var savedEmail = '';
    var savedName = '';
    try {
      savedEmail = String(localStorage.getItem(DEV_LOGIN_EMAIL_KEY) || '').trim().toLowerCase();
      savedName = String(localStorage.getItem(DEV_LOGIN_NAME_KEY) || '').trim();
    } catch (_) {
      savedEmail = '';
      savedName = '';
    }

    var email = savedEmail || (state.user && state.user.email ? String(state.user.email).trim().toLowerCase() : 'prueba.local@scootshop.co');
    var name = savedName || (state.user && state.user.name ? String(state.user.name).trim() : 'Prueba Local');

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      email = 'prueba.local@scootshop.co';
    }
    if (!name) {
      name = 'Prueba Local';
    }

    state.loginBusy = true;
    setMessage('Entrando en local con ' + email + '...', '');

    apiFetch('auth_dev_login', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        name: name || 'Prueba Local'
      }),
    }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error((res.data && (res.data.error || res.data.detail)) || 'dev_login_failed');
      }
      try {
        localStorage.setItem(DEV_LOGIN_EMAIL_KEY, email);
        localStorage.setItem(DEV_LOGIN_NAME_KEY, name);
      } catch (_) {
        /* ignore */
      }
      state.user = res.data.user || null;
      if (state.user) {
        renderLoggedIn(state.user);
      } else {
        renderLoggedOut();
      }
      setMessage('Sesión local iniciada correctamente.', 'success');
      return loadStatus().then(function () {
        return loadOrders();
      }).then(function () {
        startOrdersAutoRefresh();
        syncSharedAuthUi();
        loadProfile();
      });
    }).catch(function (err) {
      var detail = err && err.message ? String(err.message) : '';
      setMessage('No se pudo iniciar la sesión local' + (detail ? ': ' + detail : '.'), 'error');
      renderLoggedOut();
      state.orders = [];
      renderOrders();
    }).finally(function () {
      state.loginBusy = false;
    });
  }

  function ensureDevLoginButton() {
    var wrapper = $(DEV_LOGIN_WRAPPER_ID);
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }

  function clearGoogleLoginUi() {
    var host = $('googleLoginButton');
    if (host) {
      host.innerHTML = '';
      markGoogleButtonReady(host, false);
    }
    if (window.google && window.google.accounts && window.google.accounts.id && typeof window.google.accounts.id.cancel === 'function') {
      try {
        window.google.accounts.id.cancel();
      } catch (_) {
        /* ignore */
      }
    }
    state.googleReady = false;
  }

  function ensureGoogleLoginForGuest() {
    if (state.user && state.user.email) {
      clearGoogleLoginUi();
      return;
    }
    if (!state.config || !state.config.googleConfigured || !state.config.googleClientId) {
      return;
    }
    setupGoogleButton(state.config.googleClientId);
  }

  function markGoogleButtonReady(container, ready) {
    var node = container || null;
    if (!node) return;
    node.setAttribute('data-gsi-ready', ready ? '1' : '0');
  }

  function finalizeGoogleButtonRender(container, attempt, lastWidth, stableCount) {
    var node = container || null;
    var tries = Number(attempt || 0);
    var prevWidth = Number(lastWidth || 0);
    var stable = Number(stableCount || 0);
    if (!node) return;

    var iframe = node.querySelector('iframe');
    if (iframe) {
      var width = 0;
      try {
        width = Math.round(Number(iframe.getBoundingClientRect().width || 0));
      } catch (_) {
        width = 0;
      }
      if (isFinite(width) && width > 0) {
        if (width === prevWidth) {
          stable += 1;
        } else {
          stable = 0;
        }
        if (stable >= 2) {
          markGoogleButtonReady(node, true);
          return;
        }
        setTimeout(function () {
          finalizeGoogleButtonRender(node, tries + 1, width, stable);
        }, 50);
        return;
      }
    }

    if (tries >= 40) {
      // Fail open so the user never gets a permanently hidden login entry.
      markGoogleButtonReady(node, true);
      return;
    }

    setTimeout(function () {
      finalizeGoogleButtonRender(node, tries + 1, prevWidth, stable);
    }, 50);
  }

  function setupGoogleButton(clientId) {
    if (state.user && state.user.email) {
      clearGoogleLoginUi();
      return;
    }

    if (isLocalRuntime()) {
      var localBtn = $('googleLoginButton');
      if (localBtn) {
        localBtn.innerHTML = '';
        markGoogleButtonReady(localBtn, true);
      }
      setMessage('Google Login se habilita solo en dominio público autorizado. En local puedes comprar como invitado.', '');
      state.googleReady = false;
      return;
    }

    var normalizedClientId = String(clientId || '').trim();
    if (state.googleReady && window.SS_GOOGLE_GSI_STATE && window.SS_GOOGLE_GSI_STATE.clientId === normalizedClientId) {
      return;
    }
    var validClientId = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(normalizedClientId);
    if (!validClientId) {
      var invalidHost = $('googleLoginButton');
      if (invalidHost) {
        markGoogleButtonReady(invalidHost, true);
      }
      setMessage('Google Login no está disponible en este entorno. Puedes comprar como invitado.', 'error');
      return;
    }

    loadScript('https://accounts.google.com/gsi/client').then(function () {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        throw new Error('google_gsi_unavailable');
      }

      var gsiState = window.SS_GOOGLE_GSI_STATE || null;
      if (!gsiState || gsiState.clientId !== normalizedClientId) {
        window.google.accounts.id.initialize({
          client_id: normalizedClientId,
          callback: handleLoginCredential,
          cancel_on_tap_outside: true,
          auto_select: false,
        });
        window.SS_GOOGLE_GSI_STATE = {
          clientId: normalizedClientId,
          owner: 'account-page'
        };
      }
      var googleButtonHost = $('googleLoginButton');
      if (!googleButtonHost) {
        throw new Error('google_button_missing');
      }

      var hostWidth = 0;
      try {
        hostWidth = Math.round(Number(googleButtonHost.clientWidth || 0));
      } catch (_) {
        hostWidth = 0;
      }
      if (!isFinite(hostWidth) || hostWidth <= 0) {
        if (state.googleRenderAttempts < 16) {
          state.googleRenderAttempts += 1;
          if (state.googleRenderTimer) {
            clearTimeout(state.googleRenderTimer);
          }
          state.googleRenderTimer = setTimeout(function () {
            setupGoogleButton(normalizedClientId);
          }, 120);
          return;
        }
        throw new Error('google_button_host_not_ready');
      }

      state.googleRenderAttempts = 0;
      if (state.googleRenderTimer) {
        clearTimeout(state.googleRenderTimer);
        state.googleRenderTimer = null;
      }

      markGoogleButtonReady(googleButtonHost, false);
      googleButtonHost.innerHTML = '';

      window.google.accounts.id.renderButton(googleButtonHost, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: 'es',
      });
      finalizeGoogleButtonRender(googleButtonHost, 0, 0, 0);
      state.googleReady = true;
      if (!state.user) {
        setMessage('Pulsa el botón para entrar con Google.', '');
      }
    }).catch(function (err) {
      var reason = err && err.message ? String(err.message) : '';
      if (reason === 'google_gsi_unavailable' || reason === 'script_load_failed') {
        setTimeout(function () {
          setupGoogleButton(normalizedClientId);
        }, 500);
        return;
      }
      setMessage('No se pudo cargar el botón de Google.', 'error');
    });
  }

  function bindEvents() {
    var ordersGrid = $('ordersGrid');
    var runLogout = function () {
      apiFetch('auth_logout', { method: 'POST', body: '{}' }).finally(function () {
        stopOrdersAutoRefresh();
        state.user = null;
        state.orders = [];
        renderLoggedOut();
        renderOrders();
        setMessage('Sesión cerrada.', '');
        loadStatus().then(function () {
          return loadOrders();
        }).finally(function () {
          syncSharedAuthUi();
        });
      });
    };

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('#logoutBtn') : null;
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var confirmed = window.confirm('¿Estás seguro que quieres cerrar sesión?');
      if (!confirmed) return;
      runLogout();
    }, true);

    if (ordersGrid) {
      ordersGrid.addEventListener('click', function (event) {
        var menuToggle = event.target.closest ? event.target.closest('[data-menu-toggle]') : null;
        if (menuToggle) {
          event.preventDefault();
          event.stopPropagation();
          toggleOrderMenu(menuToggle);
          return;
        }

        var copyBtn = event.target.closest ? event.target.closest('[data-copy-tracking]') : null;
        if (copyBtn) {
          event.preventDefault();
          event.stopPropagation();
          copyTracking(copyBtn.getAttribute('data-copy-tracking'), copyBtn);
          return;
        }
      });
      ordersGrid.addEventListener('pointerenter', function () {
        markOrdersInteraction(1800);
      });
      ordersGrid.addEventListener('pointermove', function () {
        markOrdersInteraction(1200);
      });
      ordersGrid.addEventListener('pointerleave', function () {
        markOrdersInteraction(300);
      });
      ordersGrid.addEventListener('touchstart', function () {
        markOrdersInteraction(2200);
      }, { passive: true });
      ordersGrid.addEventListener('focusin', function () {
        markOrdersInteraction(1500);
      });
    }

    // Pestañas Pedidos / Direcciones / Ayuda
    document.addEventListener('click', function (event) {
      var tab = event.target && event.target.closest ? event.target.closest('[data-tab]') : null;
      if (tab) setAccountTab(tab.getAttribute('data-tab'));
    });

    // Cerrar el menú de 3 puntos al hacer clic fuera o pulsar Escape.
    document.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('.order-menu')) return;
      closeAllOrderMenus();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllOrderMenus();
    });

    // Perfil + direcciones (envíos de formularios y acciones)
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.id) return;
      if (form.id === 'accountProfileForm') { event.preventDefault(); saveProfile(); }
      else if (form.id === 'addressForm') { event.preventDefault(); saveAddress(); }
    });
    document.addEventListener('click', function (event) {
      var t = event.target;
      if (!t || !t.closest) return;
      if (t.closest('#addAddressBtn')) { state.editingAddressId = 0; renderAddressCard(); return; }
      if (t.closest('#addrCancelBtn')) { state.editingAddressId = null; renderAddressCard(); return; }
      var edit = t.closest('[data-addr-edit]');
      if (edit) { state.editingAddressId = Number(edit.getAttribute('data-addr-edit')); renderAddressCard(); return; }
      var del = t.closest('[data-addr-delete]');
      if (del) { deleteAddress(Number(del.getAttribute('data-addr-delete'))); return; }
      var def = t.closest('[data-addr-default]');
      if (def) { setDefaultAddress(Number(def.getAttribute('data-addr-default'))); return; }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (!state.user || (state.user && state.user.__preview)) return;
      loadOrders();
    });

    window.addEventListener('focus', function () {
      if (!state.user || (state.user && state.user.__preview)) return;
      loadOrders();
    });
  }

  function boot() {
    var statusPanel = $('accountStatus');
    if (!statusPanel) return;

    bindEvents();
    scheduleHeaderAccountStateSync(30);

    if (PREVIEW_ACTIVE) {
      window.SS_ACCOUNT_PREVIEW = {
        createOrder: function (payload) {
          var created = previewCreateOrder(payload || {});
          state.orders = previewReadOrders();
          renderOrders();
          return created;
        },
        clearOrders: function () {
          previewWriteOrders([]);
          state.orders = [];
          renderOrders();
          return true;
        },
        getOrders: function () {
          return previewReadOrders();
        }
      };
    }
    apiFetch('auth_config', { method: 'GET' }).then(function (res) {
      state.config = (res.data && res.data.ok) ? res.data : null;
      if (!state.config || !state.config.googleConfigured || !state.config.googleClientId) {
        setMessage('Google Login aún no está configurado en este entorno.', 'error');
      }
    }).catch(function () {
      setMessage('No se pudo cargar la configuración de la cuenta.', 'error');
    }).finally(function () {
      loadStatus().then(function () {
        ensureGoogleLoginForGuest();
        return loadOrders();
      }).finally(function () {
        startOrdersAutoRefresh();
        syncSharedAuthUi();
        loadProfile();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
