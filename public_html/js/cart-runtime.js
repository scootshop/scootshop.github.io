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


  // Guarda anti-doble-carga: si el runtime ya se inicializó (p. ej. la página
  // trae el script de forma estática y un bootstrap lo reinyecta con otra
  // versión), no volvemos a registrar el handler de "Añadir" — evitaba añadir
  // x2 por click y dejar el texto "Añadido" pegado.
  if (window.__ssCartRuntimeInit) return;
  window.__ssCartRuntimeInit = true;

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
  var uiAudioLastAt = -1; // sentinela: el primer tono nunca debe caer en el throttle

  function emitUiTone(kind) {
    if (!uiAudioCtx || uiAudioCtx.state !== 'running') return;

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
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(uiAudioCtx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  /* ── El contexto de audio se crea ANTES de que haga falta ─────────────────────
     Crearlo es caro: 455 ms medidos en una página limpia, porque levanta el
     dispositivo de audio. Hasta ahora eso caía DENTRO del clic de "Añadir", así que
     el primer añadido de cada visita se quedaba clavado medio segundo —el botón se
     congelaba en "Añadido"— y a partir del segundo todo iba fino. Medido: primer
     añadido 471 ms con sonido, 1,8 ms sin él.

     Ahora se adelanta a un hueco libre del hilo. Nace SUSPENDIDO —la política de
     autoplay no deja sonar sin un gesto del cliente— y lo despierta el `resume()` del
     primer clic, que sí es barato: 0,1 ms. Si el navegador no llega a darnos ese hueco
     antes del primer añadido, playUiSound lo crea como siempre: esto acelera, no es
     un requisito. */
  function precalentarAudio() {
    if (uiAudioCtx) return;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) uiAudioCtx = new AudioCtx();
    } catch (_) {
      /* sin audio: el resto sigue funcionando igual */
    }
  }

  function playUiSound(kind) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!uiAudioCtx) uiAudioCtx = new AudioCtx();

      // El contexto arranca suspendido por la política de autoplay: resume() es
      // asíncrono, así que emitimos el tono cuando ya está "running" (si no,
      // el primer click se programaba en t=0 y no sonaba hasta el segundo).
      if (uiAudioCtx.state === 'suspended' && typeof uiAudioCtx.resume === 'function') {
        var resumed;
        try { resumed = uiAudioCtx.resume(); } catch (_) { resumed = null; }
        if (resumed && typeof resumed.then === 'function') {
          resumed.then(function () { emitUiTone(kind); }).catch(function () {});
          return;
        }
      }

      emitUiTone(kind);
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

  /* ── Atributos con nombre ────────────────────────────────────────────────────
     El carrito guardaba UN solo eje: cuando un producto tenía dos, viajaban
     concatenados ("negro-780") y había que descomponer la cadena por posición para
     saber qué era cada trozo. Estos helpers guardan el significado aparte.

     ADITIVO A PROPÓSITO. `color`/`colorLabel` y la clave de línea NO cambian: son la
     identidad de lo que ya está en carritos abiertos y en pedidos guardados, y
     tocarla convertiría "Negro" y "negro" en dos productos distintos. */
  function sanitizeAttrs(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var out = {};
    var hay = false;
    for (var k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      var clave = safeText(k);
      var valor = safeText(raw[k]);
      if (clave && valor) { out[clave] = valor; hay = true; }
    }
    return hay ? out : null;
  }

  function leerAtributos(trigger) {
    var crudo = trigger.getAttribute('data-attrs');
    if (!crudo) return null;
    try { return sanitizeAttrs(JSON.parse(crudo)); } catch (_) { return null; }
  }

  /* Lectura COMPATIBLE: los atributos de una línea, venga del formato nuevo o del
     viejo. Sin `attrs` —toda línea guardada antes de agosto de 2026— se devuelve el
     eje único bajo la clave 'color', que es lo que significaba entonces. Así ningún
     consumidor necesita saber en qué formato se guardó. */
  function atributosDe(item) {
    if (!item) return {};
    if (item.attrs) return item.attrs;
    if (item.color) return { color: item.color };
    return {};
  }

  /* El texto de variantes de una línea. Delega en el núcleo, que resuelve etiqueta de
     eje y de opción desde el catálogo y cae al valor guardado si esa opción ya no
     existe (pedidos antiguos). Si el núcleo aún no ha cargado —el carrito puede
     pintarse antes—, se usa lo que la propia línea guardó, que es lo que se mostraba
     hasta ahora: nunca se queda en blanco. */
  /* El catálogo y el núcleo se cargan diferidos y pueden llegar DESPUÉS de que el
     cajón ya esté pintado: en local no se notaba, pero en producción la línea salía
     con el valor crudo ("Modelo: vmp") porque aún no había con qué traducirlo. Al
     avisar el núcleo se repinta una vez, y entonces sí dice "Modelo: G2 PRO VMP". */
  /* Repintado UNA vez cuando el catálogo ya es resoluble, para traducir las claves
     guardadas a sus etiquetas. Se engancha a la promesa del núcleo —la puerta única de
     readiness— y no a un evento suelto ni a un temporizador: el evento llegaba a veces
     antes que el catálogo y se repintaba con datos que aún no se podían resolver. */
  function repintarConCatalogo() {
    try { renderDrawer(estadoActual()); } catch (_) {}
  }
  try {
    ssListo().then(repintarConCatalogo);
  } catch (_) {}

  /* Etiqueta legible de una clave de eje sin catálogo delante: "battery_capacity" o
     "battery-capacity" → "Battery capacity". Evita enseñar la clave cruda. Si el
     catálogo declara `label`, manda el catálogo (eso lo resuelve el núcleo). */
  function etiquetaDeClave(clave) {
    var t = String(clave || '').replace(/[_-]+/g, ' ').trim();
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function describirVariantes(item) {
    var producto = null;
    try {
      var lista = window.SCOOTSHOP_PRODUCTS ||
        (window.SCOOTSHOP_CATALOG && window.SCOOTSHOP_CATALOG.products) || [];
      // La ruta guardada en la línea pasa por normalizePath y puede no llevar la
      // barra final que sí lleva el href del catálogo: se comparan sin ella.
      var sinBarra = function (v) { return String(v || '').replace(/\/+$/, ''); };
      var urlItem = sinBarra(item.url);
      var skuItem = String(item.sku || '');
      for (var i = 0; i < lista.length; i++) {
        if ((skuItem && lista[i].sku === skuItem) || (urlItem && sinBarra(lista[i].href) === urlItem)) {
          producto = lista[i];
          break;
        }
      }
    } catch (_) {}

    if (window.SS_ATTRS && typeof window.SS_ATTRS.describirTexto === 'function') {
      var texto = window.SS_ATTRS.describirTexto(item, producto);
      if (texto) return texto;
      return 'Único';
    }

    /* SIN NÚCLEO. Aquí ya no se dice "Color:" pase lo que pase: eso es la suposición
       legacy —toda variante es un color— y era lo que disfrazaba una carrera de
       inicialización de problema semántico. Una línea MODERNA se describe por sus
       propios atributos aunque no haya catálogo con el que traducirlos; solo una
       línea legacy de verdad, sin `attrs`, se lee como color.
       En la práctica no debería llegarse aquí: la frontera de render espera al núcleo.
       Queda como red de seguridad honesta, no como mecanismo de sincronización. */
    if (item.attrs) {
      var partes = [];
      for (var k in item.attrs) {
        if (Object.prototype.hasOwnProperty.call(item.attrs, k)) {
          partes.push(etiquetaDeClave(k) + ': ' + item.attrs[k]);
        }
      }
      if (partes.length) return partes.join(' · ');
    }
    return item.colorLabel ? ('Color: ' + item.colorLabel) : 'Único';
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
      /* Atributos con nombre. Opcionales y ADITIVOS: una línea guardada antes de esto
         no los tiene y sigue siendo válida —de ahí que `key` se siga calculando solo
         con sku+color—. Sirven para que el resumen del pedido pueda decir "Modelo:
         VMP · Medida: 720" en vez del "Color: vmp-720" que salía al concatenar. */
      attrs: sanitizeAttrs(raw.attrs),
      qty: qty,
      stock: stock
    };
  }

  function readActiveColorSelection() {
    try {
      var selector = document.querySelector('.color-variants');
      if (!selector) return null;

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
        // Nunca "Color" a pelo: si no hay etiqueta se usa la clave, que al menos es
        // lo que el cliente eligió. Inventar la palabra metía un rótulo falso en la
        // línea de un producto que se elige por modelo o por medida.
        colorLabel: colorLabel || colorKey || ''
      };
    } catch (_) {
      return null;
    }
  }

  // Imagen correcta para el carrito en una ficha de producto: la PRIMERA imagen
  // del color seleccionado (o la predeterminada si no hay color). La fuente de
  // verdad es el enlace de compra, cuyo parametro ?image= mantiene
  // product-enhancements apuntando a esa imagen (getVariantPrimaryImage). Nunca
  // usamos la imagen que se este viendo en la galeria, que cambia al navegar las
  // miniaturas.
  function readSelectedVariantImage() {
    try {
      var buyButton = document.querySelector('.btn-main[href]');
      if (!buyButton) return '';
      var parsed = new URL(buyButton.getAttribute('href'), window.location.origin);
      return safeText(parsed.searchParams.get('image') || '');
    } catch (_) {
      return '';
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
    var list = Array.isArray(items) ? items : [];
    var payload = JSON.stringify(list);
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
    // La lista que acabamos de escribir ya está saneada (sale de read() más la
    // modificación), así que se la pasamos a notifyChange en vez de obligarle
    // a releer y reparsear el almacenamiento.
    notifyChange(list);
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

  function notifyChange(known) {
    // Una sola lectura. Antes eran cuatro por clic: add() leía, y aquí
    // items/count/subtotal volvían a leer el almacenamiento y a parsear y
    // sanear el carrito entero, tres veces, para los mismos datos.
    var items = Array.isArray(known) ? known : read();
    var detail = {
      items: items,
      count: count(items),
      subtotal: subtotal(items)
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

  // Escribir un textContent idéntico invalida el layout igualmente, así que
  // solo tocamos el nodo cuando el valor cambia de verdad.
  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  // Camino rápido de los botones +/-: retoca SOLO los números de cada fila.
  // Reescribir el innerHTML entero para cambiar una cantidad destruía y
  // recreaba todos los <img>, relayouteaba la lista completa y —lo más
  // visible— reseteaba el scroll de la lista al principio.
  // Devuelve false si la estructura ya no encaja (alta, baja o reordenación):
  // en ese caso el llamante reconstruye.
  function patchDrawerItems(items) {
    var rows = drawerItems.children;
    if (rows.length !== items.length) return false;

    for (var i = 0; i < items.length; i++) {
      var row = rows[i];
      if (!row || row.getAttribute('data-cart-key') !== items[i].key) return false;
    }

    for (var j = 0; j < items.length; j++) {
      var target = rows[j];
      var qty = sanitizeQty(items[j].qty);
      setText(target.querySelector('.ss-cart-qty span'), String(qty));
      setText(target.querySelector('.ss-cart-line-total'), formatEur(parsePrice(items[j].price) * qty));
      /* La DESCRIPCIÓN de la variante también se refresca aquí, y no es un detalle:
         este parcheo devuelve `true` y corta el pintado completo, así que lo que no
         se actualice en este bucle NO se actualiza nunca mientras las líneas no
         cambien de sitio. Faltaba, y por eso el cajón se quedaba con "Model: vmp":
         cuando el catálogo llegaba tarde, el repintado entraba por aquí, refrescaba
         cantidad e importe y salía sin volver a describir la variante.
         Es un fallo del parcheo, no de los atributos: cualquier cambio futuro en el
         texto de una línea se habría perdido igual. */
      setText(target.querySelector('.ss-cart-color'), describirVariantes(items[j]));
    }
    return true;
  }

  // Con el panel cerrado (display:none) reconstruir la lista no se ve, pero se
  // paga: es trabajo dentro del propio clic de "Añadir". Se aplaza a la tarea
  // siguiente para que el navegador pinte antes la confirmación del botón, y
  // se vuelca de golpe al abrir. Las insignias del header NO se aplazan: esas
  // sí están a la vista.
  var pendingDetail = null;
  var pendingRenderTimer = 0;

  function flushPendingRender() {
    if (pendingRenderTimer) { clearTimeout(pendingRenderTimer); pendingRenderTimer = 0; }
    if (!pendingDetail) return;
    var detail = pendingDetail;
    pendingDetail = null;
    renderDrawerNow(detail);
  }

  /* ── FRONTERA ÚNICA DE RENDER ────────────────────────────────────────────────
     TODOS los caminos que pintan el cajón pasan por aquí: render inicial, open(),
     add(), cambio de cantidad, borrado, restauración desde storage y cualquier
     repintado. Por eso la espera al núcleo se pone en este punto y en ninguno más:
     un solo sitio decide que no se pinta nada que dependa del catálogo antes de
     poder resolverlo. Sin esto había que acordarse de esperar en cada consumidor, y
     el que se olvidara —open()— pintaba con el respaldo y parecía otro bug. */
  var nucleoListo = false;
  function marcarListo() {
    if (nucleoListo) return;
    nucleoListo = true;
    try { renderDrawerNow(estadoActual()); } catch (_) {}
  }
  try {
    /* NO se puede decidir aquí si hay núcleo: cart-runtime.js carga ANTES que
       product-attributes.js (medido: 392 ms contra 455 ms), así que en este instante
       `window.SS_ATTRS` todavía no existe. Comprobarlo aquí y darlo por ausente era mi
       propio error: dejaba `nucleoListo = true` desde el principio y el cajón pintaba
       con el respaldo. Se espera a que APAREZCA, con un tope para no bloquear el
       carrito en una página que no cargue el núcleo. */
    /* DEPENDENCIA INVERTIDA: no se pregunta "¿llegará el núcleo?", se espera a que él
       avise. cart-runtime.js se ejecuta ANTES que product-attributes.js, así que en
       este instante no hay forma honesta de saberlo: ni `window.SS_ATTRS` existe, ni
       su etiqueta está insertada todavía. Cualquier comprobación aquí interpreta un
       estado TRANSITORIO como definitivo — que es el error que ya cometimos dos veces,
       primero con un tope de intentos y luego mirando si estaba la etiqueta. Medido:
       en carga lenta el cajón pintaba el respaldo a 103 ms, el núcleo aparecía a
       2607 ms y ya nadie repintaba.

       La respuesta es `window.SS_READY`: la publica el CARGADOR antes de pedir un solo
       script, así que existe desde el instante cero aunque el núcleo llegue mucho más
       tarde, y se cumple cuando se pueden resolver atributos contra el catálogo. Este
       archivo no adivina nada: espera a una promesa que ya está ahí.
       (Antes eran doce líneas por consumidor: "si SS_ATTRS existe uso su promesa, si no
       escucho el evento ss:attrs y entonces uso su promesa". El evento ya no existe.) */
    ssListo().then(marcarListo);
  } catch (_) { marcarListo(); }

  function renderDrawer(detail) {
    if (!drawerReady) return;
    if (drawerPanel && drawerPanel.hidden) {
      pendingDetail = detail;
      if (!pendingRenderTimer) pendingRenderTimer = setTimeout(flushPendingRender, 0);
      return;
    }
    /* NO se bloquea esperando al núcleo. El carrito debe verse SIEMPRE: es dinero del
       cliente, no un adorno. Bloquear aquí significaba que una página sin núcleo —o
       con él caído— dejaba el cajón en blanco para siempre, que es peor que cualquier
       etiqueta imprecisa.
       El estado final sigue siendo determinista: se pinta ya con el respaldo SEGURO
       (que jamás llama "Color" a un modelo) y, en cuanto `ready` se cumple, se repinta
       enriquecido. Lo transitorio se ve como transitorio; lo definitivo llega solo. */
    renderDrawerNow(detail);
  }

  /* El estado real del carrito, en la forma que espera el pintado. Tenerlo con nombre
     evita que nadie vuelva a improvisar un `detail` a mano. */
  function estadoActual() {
    var items = read();
    return { items: items, count: count(items), subtotal: subtotal(items) };
  }

  function renderDrawerNow(detail) {
    /* SIN `detail` NO se pinta un carrito vacío: se lee el estado real.
       Aquí "faltan datos" significaba "cero líneas", y una llamada sin argumento
       —que es exactamente lo que ocurrió— vaciaba el cajón a la vista del cliente
       aunque tuviera productos dentro. Un carrito vacío solo puede venir de un
       carrito vacío de verdad, nunca de una llamada incompleta. */
    if (!detail || !Array.isArray(detail.items)) detail = estadoActual();

    var items = detail.items;
    var totalItems = typeof detail.count === 'number' ? detail.count : count(items);
    var sum = typeof detail.subtotal === 'number' ? detail.subtotal : subtotal(items);

    if (drawerCount) drawerCount.textContent = String(totalItems || 0);
    if (drawerSubtotal) drawerSubtotal.textContent = formatEur(sum);
    if (checkoutBtn) checkoutBtn.setAttribute('href', '/checkout?cart=1');
    if (drawerPanel) drawerPanel.classList.toggle('is-empty', !items.length);

    if (!drawerItems) return;

    if (items.length && patchDrawerItems(items)) return;

    if (!items.length) {
      // El estado vacío no depende de nada: si ya está puesto, no lo repintamos.
      var first = drawerItems.firstElementChild;
      if (first && first.classList.contains('ss-cart-empty')) return;

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
      // Sin loading="lazy" a propósito: el panel está en display:none mientras
      // el carrito está cerrado, así que una imagen lazy NO llega a cargarse y
      // las miniaturas aparecían de golpe A MITAD de la animación de apertura.
      // fetchpriority="low" las mantiene fuera del camino crítico de la página.
      var img = item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" width="70" height="70" decoding="async" fetchpriority="low" />'
        : '<div class="ss-cart-thumb-placeholder" aria-hidden="true"><i class="fa-solid fa-scooter"></i></div>';

      return '' +
        // data-cart-key en la fila: es lo que permite a patchDrawerItems()
        // reconocer que la lista sigue siendo la misma y limitarse a los números.
        '<article class="ss-cart-item" data-cart-key="' + escapeHtml(item.key) + '">' +
          '<a class="ss-cart-thumb" href="' + escapeHtml(item.url || '#') + '">' + img + '</a>' +
          '<div class="ss-cart-meta">' +
            '<button type="button" class="ss-cart-remove" data-cart-action="remove" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Quitar producto" title="Quitar">&times;</button>' +
            '<a class="ss-cart-name" href="' + escapeHtml(item.url || '#') + '">' + escapeHtml(item.name) + '</a>' +
            /* Las variantes las escribe el NÚCLEO, no esta plantilla: dice "Modelo:
               VMP · Medida: 720 mm" según lo que declare el producto, en vez del
               "Color:" que se ponía pasara lo que pasara. Sin variantes se mantiene
               "Único", igual que checkout, /pago, /pedido y los correos, para que la
               fila no cambie de forma. */
            '<div class="ss-cart-color">' + escapeHtml(describirVariantes(item)) + '</div>' +
            /* Sin precio unitario suelto: con una unidad decía exactamente lo mismo
               que el total de la línea, dos renglones más abajo, y con varias el
               cliente ya tiene la cuenta delante (cantidad × total). */
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

  // El fondo NO se bloquea al abrir el carrito. Historial de esta decisión:
  //  1) html.ss-cart-open{overflow:hidden} bloqueaba el scroll, pero con
  //     html{height:100%} (main.css) el navegador reseteaba el desplazamiento
  //     a 0 y la página saltaba al inicio.
  //  2) Fijar el body (position:fixed + top:-Y) conservaba la posición, pero
  //     rompía los elementos sticky —la barra de categorías y series del home
  //     desaparecía— porque sticky deja de anclarse sin contenedor scrollable.
  // El panel es position:fixed, así que se mantiene en su sitio aunque el fondo
  // se desplace; y overscroll-behavior evita que el scroll del carrito arrastre
  // la página al llegar al final de la lista.
  // Bloqueo por eventos: la página SIGUE siendo scrollable (no se toca ni una
  // propiedad de layout), simplemente se ignora la entrada del usuario. Es la
  // única vía que no rompe nada aquí, porque cualquier técnica que quite el
  // scroll despega los position:sticky (barra de categorías y series del home):
  // un sticky se ancla según el desplazamiento de su contenedor scrollable, así
  // que sin scroll vuelve a su sitio del documento y desaparece de pantalla.
  var scrollBlocked = false;
  var touchStartY = 0;
  var SCROLL_KEYS = [' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];

  function insideDrawer(target) {
    return !!(drawerPanel && target && drawerPanel.contains(target));
  }

  // "Dentro del carrito" no basta: la cabecera, el pie y el hueco en blanco que
  // queda bajo la lista NO tienen scroll propio, así que el navegador encadena
  // el gesto a la página de fondo. Solo se deja pasar el gesto cuando nace en
  // un contenedor que realmente puede desplazarse (la lista de productos).
  function drawerScroller(target) {
    if (!insideDrawer(target)) return null;
    var node = target.nodeType === 1 ? target : (target.parentElement || null);
    while (node) {
      if (node.scrollHeight > node.clientHeight) {
        var overflowY = window.getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
      }
      if (node === drawerPanel) return null;
      node = node.parentElement;
    }
    return null;
  }

  // Un scroller ya en su tope tampoco puede consumir el gesto: sin esto el
  // navegador lo hereda a la página (overscroll-behavior no llega en iOS viejo).
  function atScrollEdge(el, delta) {
    if (delta < 0) return el.scrollTop <= 0;
    if (delta > 0) return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    return true;
  }

  function stop(event) {
    // preventDefault sobre un evento no cancelable (inercia de iOS) solo genera
    // ruido en consola.
    if (event.cancelable) event.preventDefault();
  }

  function blockWheel(event) {
    var scroller = drawerScroller(event.target);
    if (!scroller || atScrollEdge(scroller, event.deltaY)) stop(event);
  }

  function rememberTouch(event) {
    if (event.touches && event.touches.length) touchStartY = event.touches[0].clientY;
  }

  function blockTouchMove(event) {
    // Pellizco para hacer zoom: no lo tocamos (accesibilidad).
    if (event.touches && event.touches.length > 1) return;
    var scroller = drawerScroller(event.target);
    if (!scroller) { stop(event); return; }
    var y = event.touches && event.touches.length ? event.touches[0].clientY : touchStartY;
    // Dedo hacia arriba (y menor que el inicio) = contenido hacia abajo.
    if (atScrollEdge(scroller, touchStartY - y)) stop(event);
  }

  function blockKeys(event) {
    if (SCROLL_KEYS.indexOf(event.key) === -1) return;
    if (insideDrawer(event.target)) return;
    var el = event.target;
    var tag = el && el.tagName ? el.tagName.toUpperCase() : '';
    // No robamos teclas a campos de texto.
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    event.preventDefault();
  }

  function blockScroll() {
    if (scrollBlocked) return;
    window.addEventListener('wheel', blockWheel, { passive: false });
    window.addEventListener('touchstart', rememberTouch, { passive: true });
    window.addEventListener('touchmove', blockTouchMove, { passive: false });
    window.addEventListener('keydown', blockKeys, false);
    scrollBlocked = true;
  }

  function unblockScroll() {
    if (!scrollBlocked) return;
    window.removeEventListener('wheel', blockWheel, { passive: false });
    window.removeEventListener('touchstart', rememberTouch, { passive: true });
    window.removeEventListener('touchmove', blockTouchMove, { passive: false });
    window.removeEventListener('keydown', blockKeys, false);
    scrollBlocked = false;
  }

  var scrollIsolationDone = false;

  function applyDrawerScrollIsolation() {
    // Evita que el scroll del carrito arrastre la página al llegar al final.
    // OJO: esto solo surte efecto sobre el elemento que REALMENTE scrollea
    // (.ss-cart-body); ponerlo en el panel —que es overflow:hidden— no corta
    // el encadenado. Duplicado en main.css por si el CSS llega antes.
    // Una sola vez: son estilos inline permanentes, no hace falta reescribirlos
    // en cada apertura (cada escritura invalida el estilo del panel).
    if (scrollIsolationDone) return;
    if (drawerItems) drawerItems.style.overscrollBehavior = 'contain';
    if (drawerPanel) drawerPanel.style.overscrollBehavior = 'contain';
    if (drawerBackdrop) drawerBackdrop.style.overscrollBehavior = 'contain';
    scrollIsolationDone = true;
  }

  // El cierre esconde el panel (hidden ⇒ display:none) SOLO cuando la
  // transición ha terminado de verdad. Antes se hacía con un setTimeout de
  // 180 ms contra una transición de 200 ms: los últimos milímetros del
  // deslizamiento se cortaban en seco.
  var closeTimer = 0;

  function finishClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
    if (drawerPanel) {
      drawerPanel.removeEventListener('transitionend', onCloseEnd);
      drawerPanel.hidden = true;
      drawerPanel.setAttribute('aria-hidden', 'true');
    }
    if (drawerBackdrop) drawerBackdrop.hidden = true;
  }

  function onCloseEnd(event) {
    if (event.target !== drawerPanel || event.propertyName !== 'transform') return;
    finishClose();
  }

  function openDrawer() {
    if (window.MM_closeMenu && typeof window.MM_closeMenu === 'function') {
      window.MM_closeMenu();
    }
    ensureDrawer();
    if (!drawerPanel || !drawerBackdrop) return;

    // Si se reabre mientras se estaba cerrando, cancelamos el ocultado
    // pendiente o el panel desaparecería a media apertura.
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
    drawerPanel.removeEventListener('transitionend', onCloseEnd);

    drawerBackdrop.hidden = false;
    drawerPanel.hidden = false;
    drawerPanel.setAttribute('aria-hidden', 'false');

    // Con el panel ya visible, volcamos lo que quedara pendiente de pintar:
    // el contenido tiene que estar bien ANTES de que empiece a deslizarse.
    flushPendingRender();

    applyDrawerScrollIsolation();
    blockScroll();

    // Un único reflujo forzado con el panel ya visible. Sin esto el navegador
    // funde "quitar hidden" y "añadir .is-open" en el mismo recálculo de
    // estilo y no hay estado inicial desde el que interpolar: el panel salta
    // entero en lugar de deslizarse. El requestAnimationFrame que había aquí
    // no lo garantizaba (el callback corre ANTES del recálculo del frame).
    void drawerPanel.offsetWidth;

    drawerBackdrop.classList.add('is-open');
    drawerPanel.classList.add('is-open');
  }

  function closeDrawer() {
    if (!drawerPanel || !drawerBackdrop) return;

    drawerBackdrop.classList.remove('is-open');
    drawerPanel.classList.remove('is-open');
    unblockScroll();

    drawerPanel.addEventListener('transitionend', onCloseEnd);
    // Red de seguridad por si transitionend no llega: pestaña en segundo
    // plano, prefers-reduced-motion o la transición cancelada a media.
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(finishClose, 450);
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
    var imgNode = card.querySelector('.card-media img');
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

      // Si el propio botón ya declara color (p. ej. las paletas del home), es
      // el elegido por el cliente y manda sobre cualquier selector de la página.
      var fromDatasetHasColor = !!(trigger.getAttribute('data-color') || trigger.getAttribute('data-color-key') || trigger.getAttribute('data-color-label'));

      var fromDataset = sanitizeItem({
        sku: trigger.getAttribute('data-sku'),
        name: trigger.getAttribute('data-name'),
        priceText: trigger.getAttribute('data-price'),
        href: trigger.getAttribute('data-url'),
        image: trigger.getAttribute('data-image'),
        color: trigger.getAttribute('data-color') || trigger.getAttribute('data-color-key'),
        colorLabel: trigger.getAttribute('data-color-label'),
        /* Atributos CON NOMBRE ({"model":"vmp","size":"720"}), que emite la burbuja
           de variantes. Van ADEMÁS de `color`, no en su lugar: esa clave es la
           identidad de la línea y de los pedidos ya guardados, y cambiarla partiría
           en dos el mismo producto ("Negro" vs "negro"). Aquí solo se añade el
           significado que antes se perdía al concatenar los ejes en una cadena. */
        attrs: leerAtributos(trigger),
        stock: trigger.getAttribute('data-stock') || 'in_stock',
        qty: trigger.getAttribute('data-qty') || 1
      });

      var item = fromDataset;
      if (!item) {
        var card = trigger.closest('.card');
        item = findProductFromCard(card);
      }
      if (!item) return;

      // El selector .color-variants pertenece a la ficha del producto que se
      // está viendo, así que solo vale para SU botón principal. Antes se leía
      // con un querySelector global y el color del producto visible se aplicaba
      // a cualquier otro botón de añadir de la página (p. ej. una tarjeta de
      // producto relacionado). Los botones que ya traen su color no lo tocan.
      var ownsColorSelector = trigger.getAttribute('data-product-cart-btn') === 'true';
      var activeColor = (ownsColorSelector && !fromDatasetHasColor) ? readActiveColorSelection() : null;
      if (activeColor) {
        item.color = activeColor.color;
        item.colorLabel = activeColor.colorLabel;
        item.key = compactKey([(item.sku || item.url || item.name), (item.color || '')].join('|'));
      }

      // La imagen del carrito debe ser la PRIMERA del color seleccionado (o la
      // predeterminada si no hay color), nunca la imagen que se este viendo en la
      // galeria en ese momento (antes se cogia de #mainImage, lo que guardaba la
      // ultima miniatura abierta).
      // Misma regla de alcance que el color: esta imagen sale del botón de
      // compra de la ficha, así que solo vale para el botón de esa ficha. Los
      // botones que traen su propia imagen (paleta del home) no se tocan.
      var variantFirstImage = ownsColorSelector ? readSelectedVariantImage() : '';
      if (variantFirstImage) {
        item.image = variantFirstImage;
      }

      var added = add(item, sanitizeQty(trigger.getAttribute('data-qty') || 1));
      if (!added) return;
      playUiSound('add');

      trigger.classList.add('is-added');
      var label = trigger.getAttribute('data-added-label') || 'Añadido';
      // Clicks rápidos: si ya hay un ciclo "Añadido" en curso, NO volvemos a
      // capturar el contenido (sería "Añadido" y se quedaba pegado para siempre);
      // solo reiniciamos el temporizador. El original se guarda una única vez.
      if (trigger.__ssAddTimer) {
        clearTimeout(trigger.__ssAddTimer);
      } else {
        // Guardamos los NODOS originales en un fragmento, no su HTML. Antes se
        // serializaba con innerHTML y se restauraba con innerHTML, es decir el
        // navegador volvía a PARSEAR HTML y reconstruía el icono desde cero en
        // cada añadido. Con el fragmento, restaurar es re-adjuntar lo que ya
        // existe: mismo resultado visual, sin parseo ni nodos nuevos.
        var keep = document.createDocumentFragment();
        while (trigger.firstChild) keep.appendChild(trigger.firstChild);
        trigger.__ssAddNodes = keep;
      }
      trigger.textContent = label;
      trigger.__ssAddTimer = setTimeout(function () {
        trigger.classList.remove('is-added');
        if (trigger.__ssAddNodes) {
          trigger.textContent = '';
          trigger.appendChild(trigger.__ssAddNodes);
          trigger.__ssAddNodes = null;
        }
        trigger.__ssAddTimer = 0;
      }, 950);
    });
  }

  function init() {
    ensureDrawer();
    hydrateOpenerButtons();
    bindAddToCartDelegation();
    notifyChange();

    /* En un rato muerto, nunca durante la carga: lo que se quiere es que el contexto
       esté listo para el primer "Añadir", no competir con el pintado inicial. Con
       requestIdleCallback se espera a que el hilo esté libre, con un tope por si nunca
       lo está; sin él, un plazo largo y a correr. */
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(precalentarAudio, { timeout: 5000 });
    } else {
      window.setTimeout(precalentarAudio, 2500);
    }
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
    notify: notifyChange,
    render: renderDrawer,
    /* Los atributos de una línea, en formato nuevo o antiguo. Es la puerta que deben
       usar checkout, /pago y el resumen del pedido para no volver a descomponer
       cadenas ni dar por hecho que el único eje se llama "color". */
    attrsOf: atributosDe
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
