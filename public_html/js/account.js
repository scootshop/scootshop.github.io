(function () {
  'use strict';

  var API_BASE = '/api/index.php?route=';
  var state = {
    config: null,
    user: null,
    orders: [],
    ordersLoadPromise: null,
    googleReady: false,
    loginBusy: false,
  };
  var ordersRefreshTimer = null;
  var ORDERS_REFRESH_MS = 20000;
  var ordersInteractionUntilTs = 0;
  var PREVIEW_ACTIVE = false;
  var PREVIEW_ORDERS_KEY = 'ss_preview_orders_v1';
  var LOCAL_DEV_ORDERS_KEY = 'ss_local_dev_orders_account_v1';

  function resolvePreviewActiveFromConfig(config) {
    if (window.SS_ENV_POLICY && typeof window.SS_ENV_POLICY.resolvePreviewActive === 'function') {
      return !!window.SS_ENV_POLICY.resolvePreviewActive(config);
    }
    return false;
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
    return [
      { id: 'DEV-SS-0001', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'pending_payment', amount: '530.00', total_amount: '530.00', currency: 'EUR', email: email, created_at: new Date(now - 5 * 3600000).toISOString(), updated_at: new Date(now - 5 * 3500000).toISOString() },
      { id: 'DEV-SS-0002', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'paid', amount: '530.00', total_amount: '530.00', currency: 'EUR', email: email, created_at: new Date(now - 4 * 3600000).toISOString(), updated_at: new Date(now - 4 * 3400000).toISOString() },
      { id: 'DEV-SS-0003', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'processing', amount: '530.00', total_amount: '530.00', currency: 'EUR', email: email, created_at: new Date(now - 3 * 3600000).toISOString(), updated_at: new Date(now - 3 * 3300000).toISOString() },
      { id: 'DEV-SS-0004', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'shipped', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-001', email: email, created_at: new Date(now - 2 * 3600000).toISOString(), updated_at: new Date(now - 2 * 3200000).toISOString() },
      { id: 'DEV-SS-0005', sku: 'M41TANK', name: 'M41 Tank Ultimate 1000W', product: 'M41 Tank Ultimate 1000W', product_image_url: image, status: 'delivered', amount: '530.00', total_amount: '530.00', currency: 'EUR', tracking: 'MRW-DEV-002', email: email, created_at: new Date(now - 1 * 3600000).toISOString(), updated_at: new Date(now - 1 * 3100000).toISOString() }
    ];
  }

  function localDevLoadOrSeedOrders(user) {
    var existing = localDevReadOrders();
    if (existing.length) {
      var defaultImage = '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/1.webp';
      var changed = false;
      for (var i = 0; i < existing.length; i++) {
        if (!existing[i] || typeof existing[i] !== 'object') continue;
        if (String(existing[i].product_image_url || '').trim()) continue;
        existing[i].product_image_url = defaultImage;
        changed = true;
      }
      if (changed) {
        localDevWriteOrders(existing);
      }
      return existing;
    }
    var seeded = localDevSeedOrders(user);
    localDevWriteOrders(seeded);
    return seeded;
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

  function normalizeOrderStatus(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'paid' || raw === 'approved' || raw === 'complete' || raw === 'completed' || raw === 'pagado') return 'paid';
    if (raw === 'pending' || raw === 'pending_payment') return 'pending_payment';
    if (raw === 'processing' || raw === 'preparing') return 'processing';
    if (raw === 'shipped' || raw === 'shipping') return 'shipped';
    if (raw === 'delivered') return 'delivered';
    if (raw === 'cancelled' || raw === 'canceled' || raw === 'failed' || raw === 'denied') return 'cancelled';
    if (raw === 'error') return 'error';
    return raw || 'pending_payment';
  }

  function statusLabel(status) {
    status = normalizeOrderStatus(status);
    if (status === 'paid') return 'Pagado';
    if (status === 'pending_payment') return 'Pendiente pago';
    if (status === 'processing') return 'Preparando';
    if (status === 'shipped') return 'Enviado';
    if (status === 'delivered') return 'Entregado';
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'error') return 'Error';
    return status || 'Pedido';
  }

  function trackingStageIndex(status) {
    status = normalizeOrderStatus(status);
    if (status === 'pending_payment') return 0;
    if (status === 'paid') return 1;
    if (status === 'processing') return 2;
    if (status === 'shipped') return 3;
    if (status === 'delivered') return 4;
    if (status === 'cancelled' || status === 'error') return 0;
    return 2;
  }

  function trackingStatusLabel(status) {
    status = normalizeOrderStatus(status);
    if (status === 'pending_payment') return '⏳ Pendiente pago';
    if (status === 'paid') return '✅ Pagado';
    if (status === 'processing') return '📦 Preparando';
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
    status = normalizeOrderStatus(status);
    if (status === 'paid' || status === 'processing' || status === 'shipped' || status === 'delivered') return 'badge badge--paid';
    if (status === 'pending_payment') return 'badge badge--pending';
    if (status === 'error' || status === 'cancelled') return 'badge badge--error';
    return 'badge';
  }

  function timelineStepClass(status, step) {
    var normalized = normalizeOrderStatus(status);
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
          var status = normalizeOrderStatus(order && order.status);
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
    }
  }

  function syncPreviewRuntime() {
    if (!PREVIEW_ACTIVE) {
      try { delete window.SS_ACCOUNT_PREVIEW; } catch (_) {}
      return;
    }

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

  function renderOrders() {
    var grid = $('ordersGrid');
    if (!grid) return;

    var baseOrders = state.orders.slice(0, 5);

    var historyRows = baseOrders.map(function (order) {
      var orderNumber = orderNumberLabel(order);
      var avatar = resolveOrderAvatar(order);
      var rawStatus = normalizeOrderStatus(order.status || 'processing');
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

    var emptyNote = !state.user
      ? '<div class="history-empty">Inicia sesión para ver tus pedidos recientes.</div>'
      : (baseOrders.length ? '' : '<div class="history-empty">Todavía no hay pedidos recientes en esta cuenta.</div>');

    grid.hidden = false;
    grid.innerHTML = [
      '<section class="order-history">',
      '  <div class="order-history-head">',
      '    <h2>Pedidos recientes</h2>',
      '  </div>',
      emptyNote,
      '  <div class="order-history-list">',
      historyRows,
      '  </div>',
      '</section>'
    ].join('');

    updateStats(baseOrders.length, state.user ? baseOrders.length : 0, baseOrders.length ? (baseOrders.filter(function (o) { return trackingProgress(o.status || 'processing') >= 55; }).length + ' con tracking') : '—');
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
    renderAvatar(user);

    var name = user && user.name ? String(user.name).trim() : 'Tu cuenta';
    var email = user && user.email ? String(user.email).trim() : '';
    $('accountUserName').textContent = name;
    $('accountUserEmail').textContent = email || 'Google login activo';
    $('accountSessionState').textContent = 'ACTIVA';
    $('accountSessionState').className = 'account-session-state account-session-state--logged-in';
    copy.textContent = 'Tu cuenta está conectada.';
    setSessionMode('logged');
    setSessionLayout(true);
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

    loginBox.hidden = false;
    loggedBox.hidden = true;
    if (statusRow) {
      statusRow.hidden = true;
    }
    if (sessionState) {
      sessionState.hidden = true;
    }
    if (insights) {
      insights.hidden = false;
    }
    if (statusEl && loginBox.parentNode === statusEl && statusRow && loginBox.nextSibling !== statusRow) {
      statusEl.insertBefore(loginBox, statusRow);
    }
    var avatarWrap = $('accountAvatarWrap');
    if (avatarWrap) avatarWrap.innerHTML = '';
    copy.textContent = '';
    setSessionMode('guest');
    setSessionLayout(false);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = function () { resolve(); };
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
      if (!state.user && PREVIEW_ACTIVE) {
        state.user = {
          name: 'Cliente SCOOT',
          email: 'cliente@scootshop.co',
          __preview: true,
        };
      }
      if (state.user) {
        renderLoggedIn(state.user);
      } else {
        renderLoggedOut();
      }
      return state.user;
    }).catch(function () {
      if (PREVIEW_ACTIVE) {
        state.user = {
          name: 'Cliente SCOOT',
          email: 'cliente@scootshop.co',
          __preview: true,
        };
        renderLoggedIn(state.user);
        return state.user;
      }
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
        state.orders = previewReadOrders();
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
      renderLoggedIn(state.user);
      setMessage('Sesión iniciada correctamente.', 'success');
      return loadOrders().then(function () {
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

  function setupGoogleButton(clientId) {
    var normalizedClientId = String(clientId || '').trim();
    var validClientId = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(normalizedClientId);
    if (!validClientId) {
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
      window.google.accounts.id.renderButton($('googleLoginButton'), {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: 'es',
      });
      state.googleReady = true;
      if (!state.user) {
        setMessage('Pulsa el botón para entrar con Google.', '');
      }
    }).catch(function () {
      setMessage('No se pudo cargar el botón de Google.', 'error');
    });
  }

  function bindEvents() {
    var logoutBtn = $('logoutBtn');
    var ordersGrid = $('ordersGrid');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
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
      });
    }

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

    apiFetch('auth_config', { method: 'GET' }).then(function (res) {
      state.config = (res.data && res.data.ok) ? res.data : null;
      PREVIEW_ACTIVE = resolvePreviewActiveFromConfig(state.config);
      syncPreviewRuntime();
      if (state.config && state.config.googleConfigured && state.config.googleClientId) {
        setupGoogleButton(state.config.googleClientId);
      } else {
        setMessage('Google Login aún no está configurado en este entorno.', 'error');
      }
    }).catch(function () {
      PREVIEW_ACTIVE = false;
      syncPreviewRuntime();
      setMessage('No se pudo cargar la configuración de la cuenta.', 'error');
    }).finally(function () {
      loadStatus().then(function () {
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
