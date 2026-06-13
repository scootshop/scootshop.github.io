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
  var LOCAL_DEV_ORDERS_KEY = 'ss_local_dev_orders_account_v1';
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
      { id: 'DEV-SS-0002', sku: 'BOLSAALM', name: 'Bolsa de almacenamiento', product: 'Bolsa de almacenamiento', product_image_url: bagImage, status: 'paid', amount: '33.95', total_amount: '33.95', currency: 'EUR', email: email, created_at: new Date(now - 4 * 3600000).toISOString(), updated_at: new Date(now - 4 * 3400000).toISOString() },
      { id: 'DEV-SS-0003', sku: 'LUCESRGB', name: 'Luces LED RGB estroboscópicas', product: 'Luces LED RGB estroboscópicas', product_image_url: rgbLightsImage, status: 'processing', amount: '26.95', total_amount: '26.95', currency: 'EUR', email: email, created_at: new Date(now - 3 * 3600000).toISOString(), updated_at: new Date(now - 3 * 3300000).toISOString() },
      { id: 'DEV-SS-0004', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'shipped', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-001', email: email, created_at: new Date(now - 2 * 3600000).toISOString(), updated_at: new Date(now - 2 * 3200000).toISOString() },
      { id: 'DEV-SS-0005', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'delivered', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-002', email: email, created_at: new Date(now - 1 * 3600000).toISOString(), updated_at: new Date(now - 1 * 3100000).toISOString() }
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

  function writeSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* ignore */
    }
  }

  function buildResumePreviewUrl(order) {
    var item = order || {};
    var amount = String(item.total_amount || item.amount || '0.00');
    var currency = String(item.currency || 'EUR').toUpperCase();
    var params = new URLSearchParams();
    params.set('resume', '1');
    params.set('checkout', '1');
    params.set('order', String(item.id || ''));
    params.set('sku', String(item.sku || ''));
    params.set('name', String(item.name || item.product || 'Pedido SCOOT SHOP'));
    params.set('price', amount);
    params.set('currency', currency);
    if (item.product_url) params.set('url', String(item.product_url));
    if (item.product_image_url) params.set('image', String(item.product_image_url));
    if (item.product_color) params.set('color', String(item.product_color));
    if (item.product_color_label) params.set('colorLabel', String(item.product_color_label));
    return '/pago?' + params.toString();
  }

  async function resumePendingPayment(orderId, previewOrder) {
    var normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) return;

    if (previewOrder && typeof previewOrder === 'object') {
      window.location.href = buildResumePreviewUrl(previewOrder);
      return;
    }

    var response = await fetch('/api/orders/resume-payment', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: normalizedOrderId })
    });

    var data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok || !data || !data.ok || !data.paymentUrl) {
      throw new Error((data && data.error) ? data.error : 'resume_payment_failed');
    }

    if (data.shipping && typeof data.shipping === 'object') {
      writeSessionStorage('ss_checkout_shipping', data.shipping);
    }
    if (Array.isArray(data.cartItems)) {
      writeSessionStorage('ss_checkout_cart_snapshot', data.cartItems);
    }

    window.location.href = String(data.paymentUrl);
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

  function formatMoney(value, currency) {
    var num = Number(value || 0);
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: (currency || 'EUR').toUpperCase(),
        minimumFractionDigits: 2,
      }).format(num);
    } catch (_) {
      return num.toFixed(2) + ' ' + (currency || 'EUR').toUpperCase();
    }
  }

  function statusLabel(status) {
    if (status === 'paid') return 'Pagado';
    if (status === 'pending_payment') return 'Pendiente pago';
    if (status === 'processing' || status === 'preparing') return 'Preparando';
    if (status === 'shipped') return 'Enviado';
    if (status === 'delivered') return 'Entregado';
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'error') return 'Error';
    return status || 'Pedido';
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

  function badgeClass(status) {
    if (status === 'paid' || status === 'processing' || status === 'preparing' || status === 'shipped' || status === 'delivered') return 'badge badge--paid';
    if (status === 'pending_payment') return 'badge badge--pending';
    if (status === 'error' || status === 'cancelled') return 'badge badge--error';
    return 'badge';
  }

  function timelineStepClass(status, step) {
    var normalized = status === 'preparing' ? 'processing' : status;
    var order = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered'];
    var currentIndex = order.indexOf(normalized);
    var stepIndex = order.indexOf(step);
    if (currentIndex === -1 || stepIndex === -1) return '';
    if (stepIndex < currentIndex) return 'is-done';
    if (stepIndex === currentIndex) return 'is-active';
    return '';
  }

  function renderTimeline(status) {
    var steps = [
      ['pending_payment', 'Pedido creado', 'Estamos esperando la confirmación del pago.'],
      ['paid', 'Pago confirmado', 'El pedido ya está pagado y entra en preparación.'],
      ['processing', 'En preparación', 'Nuestro equipo está preparando el envío.'],
      ['shipped', 'Enviado', 'Ya sale hacia tu dirección con tracking.'],
      ['delivered', 'Entregado', 'La transportista marca el pedido como entregado.'],
    ];

    return '<div class="order-timeline">' + steps.map(function (step) {
      var stepStatus = timelineStepClass(status, step[0]);
      return [
        '<div class="timeline-step ' + stepStatus + '">',
        '  <span class="dot" aria-hidden="true"></span>',
        '  <div>',
        '    <strong>' + esc(step[1]) + '</strong>',
        '    <span>' + esc(step[2]) + '</span>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('') + '</div>';
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

  function rerenderOrdersPreservingSearch() {
    var input = $('ordersSearchInput');
    var hadFocus = !!(input && document.activeElement === input);
    var caret = hadFocus ? input.selectionStart : 0;
    renderOrders();
    if (hadFocus) {
      var next = $('ordersSearchInput');
      if (next) {
        next.focus();
        try { next.setSelectionRange(caret, caret); } catch (_) { /* ignore */ }
      }
    }
  }

  function renderOrders() {
    var grid = $('ordersGrid');
    if (!grid) return;

    var allOrders = Array.isArray(state.orders) ? state.orders : [];
    var canShowOrders = !!state.user || isLocalEmulationActive();

    var searchTerm = String(ordersSearch || '').trim().toLowerCase();
    var filtered = allOrders.filter(function (order) {
      var st = String((order && order.status) || '').toLowerCase();
      if (ordersFilter === 'active' && st === 'delivered') return false;
      if (ordersFilter === 'delivered' && st !== 'delivered') return false;
      if (searchTerm && String((order && order.id) || '').toLowerCase().indexOf(searchTerm) === -1) return false;
      return true;
    });
    var baseOrders = filtered.slice(0, 10);

    var historyRows = baseOrders.map(function (order) {
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
      return [
        '<a class="order-history-link" href="' + esc(viewUrl) + '">',
        '<article class="order-history-item">',
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
        '</article>',
        '</a>'
      ].join('');
    }).join('');

    var emptyNote = !canShowOrders
      ? '<div class="history-empty">Inicia sesión para ver tus pedidos recientes.</div>'
      : (baseOrders.length ? '' : (allOrders.length
        ? '<div class="history-empty">No hay pedidos que coincidan con el filtro o la búsqueda.</div>'
        : '<div class="history-empty">Todavía no hay pedidos recientes en esta cuenta.</div>'));

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
        '  <input type="search" id="ordersSearchInput" class="acct-search" placeholder="Buscar nº de pedido" value="' + esc(ordersSearch) + '" autocomplete="off" aria-label="Buscar por número de pedido">',
        '</div>'
      ].join('');
      countLabel = filtered.length === allOrders.length
        ? allOrders.length + (allOrders.length === 1 ? ' pedido' : ' pedidos')
        : filtered.length + ' de ' + allOrders.length;
    }

    grid.hidden = false;
    grid.innerHTML = [
      '<section class="order-history">',
      '  <div class="order-history-head">',
      '    <h2>Pedidos</h2>',
      countLabel ? '    <span class="acct-orders-count">' + esc(countLabel) + '</span>' : '',
      '  </div>',
      toolsHtml,
      emptyNote,
      '  <div class="order-history-list">',
      historyRows,
      '  </div>',
      '</section>'
    ].join('');

    Array.prototype.forEach.call(grid.querySelectorAll('.acct-tab'), function (btn) {
      btn.addEventListener('click', function () {
        ordersFilter = btn.getAttribute('data-filter') || 'all';
        markOrdersInteraction(4000);
        renderOrders();
      });
    });
    var searchInput = grid.querySelector('#ordersSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        ordersSearch = String(searchInput.value || '');
        markOrdersInteraction(8000);
        rerenderOrdersPreservingSearch();
      });
    }

    updateStats(allOrders.length, canShowOrders ? allOrders.length : 0, allOrders.length ? (allOrders.filter(function (o) { return trackingProgress(o.status || 'processing') >= 55; }).length + ' con tracking') : '—');
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
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
