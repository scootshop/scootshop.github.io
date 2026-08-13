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
  // Caché stale-while-revalidate de los pedidos del usuario: permite pintar la
  // lista al instante en la siguiente visita mientras se revalida en segundo
  // plano. sessionStorage (por pestaña) y atada al uid para no cruzar cuentas.
  var ORDERS_CACHE_KEY = 'ss_account_orders_cache_v1';
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

  // Criterio ÚNICO de "pedido que no va a llegar". Antes cada función tenía el
  // suyo: el color y el borde reconocían las seis variantes, pero la etiqueta y
  // el índice del timeline solo 'cancelled'. Un pedido en 'canceled' (sin doble
  // L), 'refunded', etc. caía en el default y se pintaba como «Preparando» con
  // el primer hito marcado, aunque la tarjeta saliera en rojo de cancelado.
  var CANCELED_STATUSES = /^(cancelled|canceled|refunded|payment_failed|dispute|error)$/;

  function isCanceledStatus(status) {
    return CANCELED_STATUSES.test(String(status || ''));
  }

  function trackingStageIndex(status) {
    if (isCanceledStatus(status)) return 0;
    if (status === 'pending_payment') return 0;
    if (status === 'paid') return 1;
    if (status === 'processing' || status === 'preparing') return 2;
    if (status === 'shipped') return 3;
    if (status === 'delivered') return 4;
    return 2;
  }

  function trackingStatusLabel(status) {
    if (status === 'pending_payment') return 'Pendiente pago';
    if (status === 'paid') return 'Pagado';
    if (status === 'processing' || status === 'preparing') return 'Preparando';
    if (status === 'shipped') return 'Enviado';
    if (status === 'delivered') return 'Entregado';
    // Cada motivo con su nombre: un pedido reembolsado o con el pago fallido no
    // es lo mismo que uno cancelado, aunque compartan color e icono.
    if (status === 'cancelled' || status === 'canceled') return 'Cancelado';
    if (status === 'refunded') return 'Reembolsado';
    if (status === 'payment_failed') return 'Pago fallido';
    if (status === 'dispute') return 'En disputa';
    if (status === 'error') return 'Error';
    return 'Preparando';
  }

  // Color del estado para la cabecera y el tramo hecho del timeline. Misma
  // paleta que el panel admin (b-pay/b-paid/b-pend/b-res/b-ship/b-deliv/b-canc):
  // un color por estado. Se inyecta como --acc en .tracking-inline.
  function statusAccent(status) {
    switch (status) {
      case 'pending_payment': return '#9a3412';
      case 'paid': return '#15803d';
      case 'processing':
      case 'preparing': return '#7c3aed';
      case 'reserved': return '#5b21b6';
      case 'shipped': return '#2563eb';
      case 'delivered': return '#16a34a';
      case 'cancelled':
      case 'canceled':
      case 'refunded':
      case 'payment_failed':
      case 'dispute':
      case 'error': return '#991b1b';
      default: return '#475569';
    }
  }

  // Icono de línea de la etapa actual para la cabecera (mismo set que el
  // timeline): reloj → check al pagar → caja → camión → casa; calendario si está
  // reservado, ✕ si hay incidencia.
  function trackingStatusIcon(status) {
    if (status === 'pending_payment') return TRACK_ICON.hourglass;
    if (status === 'paid') return TRACK_ICON.check;
    if (status === 'reserved') return TRACK_ICON.calendar;
    if (status === 'shipped') return TRACK_ICON.truck;
    if (status === 'delivered') return TRACK_ICON.house;
    if (status === 'cancelled' || status === 'canceled' || status === 'refunded' || status === 'payment_failed' || status === 'dispute' || status === 'error') return TRACK_ICON.alert;
    return TRACK_ICON.box;
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

  // Cuatro hitos. El primero es transformable: reloj de arena mientras el pago
  // está pendiente, check en cuanto se cobra. `at` es la etapa
  // (trackingStageIndex) a partir de la cual el hito se da por completado.
  // Iconos SVG de línea (set coherente: trazo 2, esquinas redondeadas). Heredan
  // el color con currentColor, así el CSS los pinta gris (pendiente) o verde
  // (.is-done). Reloj de arena → check al pagar; después caja, camión y casa.
  var TRACK_ICON = {
    hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.41L12 12l-4.41 4.42A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.41L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.27 9 5.15"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.59 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>'
  };
  var TRACKING_STAGES = [
    { at: 1, title: 'Pendiente pago', icon: TRACK_ICON.hourglass, doneTitle: 'Pagado', doneIcon: TRACK_ICON.check },
    { at: 2, title: 'Preparando', icon: TRACK_ICON.box },
    { at: 3, title: 'Enviado', icon: TRACK_ICON.truck },
    { at: 4, title: 'Entregado', icon: TRACK_ICON.house }
  ];

  // Iconos y segmentos alternados en una misma fila flex. El segmento i-1 une
  // el hito anterior con este y se pinta al alcanzarlo.
  function trackLineHtml(stageIdx, canceled, canceledTitle) {
    var parts = [];
    TRACKING_STAGES.forEach(function (stage, i) {
      var done = stageIdx >= stage.at;
      if (i > 0) {
        parts.push('<i class="track-seg' + (done ? ' is-on' : '') + '" aria-hidden="true"></i>');
      }
      // En un pedido cancelado el primer hito deja de ser «pendiente de pago»:
      // pasa a ser el propio motivo de la cancelación, con su icono y el color
      // del estado. Los tres siguientes se quedan apagados, porque el recorrido
      // se interrumpió ahí.
      var esCancelado = canceled && i === 0;
      var icon = esCancelado ? TRACK_ICON.alert : (done && stage.doneIcon ? stage.doneIcon : stage.icon);
      var title = esCancelado ? (canceledTitle || 'Cancelado') : (done && stage.doneTitle ? stage.doneTitle : stage.title);
      var cls = 'track-ico' + (done ? ' is-done' : '') + (esCancelado ? ' is-canceled' : '');
      parts.push('<span class="' + cls + '" title="' + esc(title) + '">' + icon + '</span>');
    });
    return '<div class="track-line' + (stageIdx >= 4 ? ' is-delivered' : '') + '">' + parts.join('') + '</div>';
  }

  function ordersRowsHtml(baseOrders) {
    return baseOrders.map(function (order) {
      var orderNumber = orderNumberLabel(order);
      var avatar = resolveOrderAvatar(order);
      var rawStatus = String(order.status || 'processing');
      var status = trackingStatusLabel(rawStatus);
      var lastUpdate = formatLastUpdate(order.updated_at || order.created_at);
      var date = formatShortDate(order.created_at);
      var stageIdx = trackingStageIndex(rawStatus);
      var viewUrl = '/pedido/?order=' + encodeURIComponent(String(order.id || '')) + (PREVIEW_ACTIVE ? '&preview_active=1' : '');
      var canceled = isCanceledStatus(rawStatus);
      var cardStateCls = stageIdx >= 4 ? ' is-delivered' : (canceled ? ' is-canceled' : '');
      return [
        '<article class="order-history-item' + cardStateCls + '">',
        '<a class="order-history-link" href="' + esc(viewUrl) + '">',
        '  <div class="history-top">',
        '    ' + renderOrderAvatar(orderNumber, avatar),
        '    <div class="history-main">',
        '      <strong>' + esc(orderNumber) + '</strong>',
        '      <span>' + esc(lastUpdate) + '</span>',
        '    </div>',
        '    <div class="history-date">' + esc(date) + '</div>',
        '  </div>',
        '  <div class="tracking-inline" style="--acc:' + statusAccent(rawStatus) + '">',
        '    <div class="tracking-status"><span class="tracking-status-ico">' + trackingStatusIcon(rawStatus) + '</span>' + esc(status) + '</div>',
        '    ' + trackLineHtml(stageIdx, canceled, status),
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

  // Tope de direcciones guardadas: lo manda el backend (CUSTOMER_ADDRESS_MAX).
  var ADDRESS_MAX_FALLBACK = 5;

  function addressLimit() {
    return Number(state.addressesMax || 0) || ADDRESS_MAX_FALLBACK;
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
      state.addressesMax = Number(res.data.addresses_max || 0) || ADDRESS_MAX_FALLBACK;
      state.editingAddressId = null;
      var note = $('addressesGuestNote');
      if (note) note.hidden = true;
      renderProfileCard();
      renderAddressCard();
      updateAddressCount();
    }).catch(function () { hideAccountExtras(); });
  }

  // El teléfono se guarda con prefijo ("+34 666318747"); el formulario lo muestra partido.
  function splitPhone(raw) {
    var value = String(raw || '').trim();
    var m = value.match(/^(\+\d{1,4})\s*(.*)$/);
    return m ? { prefix: m[1], national: m[2].trim() } : { prefix: '+34', national: value };
  }

  function renderProfileCard() {
    var card = $('accountProfileCard');
    if (!card || !window.SS_ADDR) return;
    var p = state.profile || {};
    var phone = splitPhone(p.phone);
    card.hidden = false;
    card.innerHTML = [
      '<div class="acct-cardhead"><h2 class="acct-cardhead__title">Mis datos<i class="fa-solid fa-user" aria-hidden="true"></i></h2></div>',
      '<form class="acct-form" id="accountProfileForm" novalidate>',
      window.SS_ADDR.contactFieldsHtml({ idPrefix: 'prof', emailDisabled: true, values: { fullName: p.name || '', email: p.email || '', phonePrefix: phone.prefix, phone: window.SS_ADDR.formatPhone(phone.national) } }),
      '  <div class="acct-form-actions">',
      '    <button type="submit" class="acct-btn acct-btn--dark" id="profileSaveBtn">Guardar</button>',
      '    <span class="acct-form-note" id="profileNote"></span>',
      '  </div>',
      '</form>'
    ].join('');

    // Teléfono en formato "666 318 747" también mientras se escribe (igual que el checkout).
    var phoneEl = card.querySelector('[data-addr="phone"]');
    if (phoneEl) {
      phoneEl.addEventListener('beforeinput', function (e) {
        if (e.data && /\D/.test(e.data)) e.preventDefault();
      });
      phoneEl.addEventListener('input', function () {
        phoneEl.value = window.SS_ADDR.formatPhone(phoneEl.value);
      });
    }
    var prefixEl = card.querySelector('[data-addr="phonePrefix"]');
    if (prefixEl) {
      prefixEl.addEventListener('beforeinput', function (e) {
        if (e.data && /[^+\d]/.test(e.data)) e.preventDefault();
      });
    }
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
    var max = addressLimit();
    var count = (state.addresses || []).length;
    var atLimit = count >= max;
    var html = [
      '<div class="acct-cardhead"><h2 class="acct-cardhead__title">Direcciones<i class="fa-solid fa-location-dot" aria-hidden="true"></i></h2>',
      '<div class="acct-cardhead__aside">',
      '<span class="acct-count' + (atLimit ? ' is-full' : '') + '" title="Máximo ' + max + ' direcciones guardadas">' + count + '/' + max + '</span>'
    ];
    if (!editing) {
      html.push('<button type="button" class="acct-link-btn" id="addAddressBtn"' + (atLimit ? ' disabled title="Has alcanzado el máximo de ' + max + ' direcciones"' : '') + '>+ Añadir</button>');
    }
    html.push('</div></div>');

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
      if (atLimit) {
        html.push('<p class="acct-empty-note">Has alcanzado el máximo de ' + max + ' direcciones. Elimina una para poder añadir otra.</p>');
      }
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
    // Guardar con prefijo y en formato "666 318 747": el checkout usa este teléfono
    // tal cual como prioritario.
    var national = window.SS_ADDR ? window.SS_ADDR.formatPhone(c.phone) : String(c.phone || '');
    var phone = national ? ((c.phonePrefix || '+34') + ' ' + national) : '';
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
      var err = res.data && res.data.error;
      if (note) {
        note.textContent = err === 'address_limit'
          ? ('Máximo ' + addressLimit() + ' direcciones guardadas')
          : 'No se pudo guardar';
        note.className = 'acct-form-note acct-form-note--err';
      }
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
    // Sin texto de estado: que la sesión está activa ya lo dicen el nombre, el
    // correo y el botón «Salir». El elemento se conserva porque el guard de
    // arriba (`if (!loginBox || !loggedBox || !copy) return;`) lo exige, y su
    // caja se colapsa desde el CSS de cuenta/index.html.
    copy.textContent = '';
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

    // Sin sesión no debe quedar rastro de pedidos cacheados en la pestaña.
    clearOrdersCache();

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

  function ordersCacheUid(user) {
    if (!user) return '';
    return String(user.id || user.email || '');
  }
  function readOrdersCache(user) {
    var uid = ordersCacheUid(user);
    if (!uid) return null;
    try {
      var raw = sessionStorage.getItem(ORDERS_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || String(obj.uid) !== uid) return null;
      return Array.isArray(obj.orders) ? obj.orders : null;
    } catch (_) { return null; }
  }
  function writeOrdersCache(user, orders) {
    var uid = ordersCacheUid(user);
    if (!uid) return;
    try {
      sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify({
        uid: uid,
        orders: Array.isArray(orders) ? orders : [],
        ts: Date.now()
      }));
    } catch (_) { /* cuota o modo privado: ignora */ }
  }
  function clearOrdersCache() {
    try { sessionStorage.removeItem(ORDERS_CACHE_KEY); } catch (_) { /* ignore */ }
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

      // En la primera carga (aún sin pedidos en memoria) pintamos al instante
      // la caché de este usuario para percepción inmediata; luego revalidamos.
      var paintedCache = false;
      if (!state.orders || !state.orders.length) {
        var cachedOrders = readOrdersCache(state.user);
        if (cachedOrders && cachedOrders.length) {
          state.orders = cachedOrders;
          renderOrders();
          paintedCache = true;
        }
      }

      return apiFetch('account_orders', { method: 'GET' }).then(function (res) {
        if (!res.ok || !res.data || !res.data.ok) {
          // Si ya había caché pintada, no la borramos por un fallo transitorio.
          if (!paintedCache) { state.orders = []; renderOrders(); }
          return state.orders;
        }
        state.user = res.data.user || state.user;
        state.orders = Array.isArray(res.data.orders) ? res.data.orders : [];
        writeOrdersCache(state.user, state.orders);
        renderOrders();
        return state.orders;
      }).catch(function () {
        if (!paintedCache) { state.orders = []; renderOrders(); }
        return state.orders;
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

      // El iframe que pinta GSI NO se estira con CSS: hay que decirle la
      // anchura al renderizar. Medimos el contenedor (en móvil ocupa el ancho
      // de la tarjeta, en escritorio son los 260px fijos) y la pasamos.
      // Google ignora valores fuera de 200-400, así que se recorta al rango; si
      // la medida saliera 0 —contenedor aún sin layout— se omite el parámetro y
      // vuelve al comportamiento anterior en vez de pintar un botón inválido.
      var hostWidth = 0;
      try {
        hostWidth = Math.round(googleButtonHost.getBoundingClientRect().width || 0);
      } catch (_) {
        hostWidth = 0;
      }
      var gsiOptions = {
        // 'outline' (botón blanco con borde) y no 'filled_black': desde el
        // rediseño la caja de invitado vive sobre la franja oscura #1f2124, y
        // un pill negro sobre casi-negro desaparecía.
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: 'es',
      };
      if (hostWidth > 0) {
        gsiOptions.width = Math.max(200, Math.min(400, hostWidth));
      }
      window.google.accounts.id.renderButton(googleButtonHost, gsiOptions);
      finalizeGoogleButtonRender(googleButtonHost, 0, 0, 0);
      state.googleReady = true;
      if (!state.user) {
        // Sin microcopy: el botón de Google que acaba de renderizarse ya dice
        // lo que hay que hacer. Se mantiene la llamada con texto vacío porque
        // aquí SÍ hay que limpiar: si antes falló la carga del botón quedaría
        // en pantalla un error («No se pudo cargar el botón de Google») que ya
        // no es cierto.
        setMessage('', '');
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
      if (t.closest('#addAddressBtn')) {
        if ((state.addresses || []).length >= addressLimit()) return;
        state.editingAddressId = 0; renderAddressCard(); return;
      }
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
    // auth_config solo alimenta el Google Login del invitado; no debe bloquear
    // la sesión ni los pedidos. Se lanza en paralelo a loadStatus para que la
    // lista aparezca tras UNA sola llamada (estado), no tres en cadena.
    var configReady = apiFetch('auth_config', { method: 'GET' }).then(function (res) {
      state.config = (res.data && res.data.ok) ? res.data : null;
      if (!state.config || !state.config.googleConfigured || !state.config.googleClientId) {
        setMessage('Google Login aún no está configurado en este entorno.', 'error');
      }
    }).catch(function () {
      setMessage('No se pudo cargar la configuración de la cuenta.', 'error');
    });

    var statusReady = loadStatus();

    // Los pedidos dependen solo de la sesión: arrancan en cuanto hay estado.
    statusReady.then(function () {
      return loadOrders();
    }).finally(function () {
      startOrdersAutoRefresh();
      syncSharedAuthUi();
      loadProfile();
    });

    // El login de invitado necesita config + estado de sesión ya resueltos.
    Promise.all([configReady, statusReady]).then(function () {
      ensureGoogleLoginForGuest();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
