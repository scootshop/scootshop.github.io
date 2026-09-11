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
  var drawerShip = null;
  var drawerShipTxt = null;
  var drawerShipBar = null;

  /* Envío por umbral. Espejo de SHIPPING_FREE_FROM / SHIPPING_FEE en api/index.php,
     donde vive la regla de verdad; aquí solo se ENSEÑA cuánto falta. */
  var ENVIO_GRATIS_DESDE = 10;
  var ENVIO_IMPORTE = 2.99;
  var drawerCount = null;
  var checkoutBtn = null;
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

  /* EL DINERO, COMO EN TODO EL SITIO: coma decimal y los enteros SIN decimales —
     «12 €», no «12,00 €»; «8,90 €» con ellos. Es la regla del catálogo («535 €») y
     la que ya siguen /checkout (`formatMoney`) y /pago (`fmtEur`); este cajón era
     el último que arrastraba dos ceros en cada línea redonda. */
  function formatEur(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    var txt = Number.isInteger(num) ? String(num) : num.toFixed(2).replace('.', ',');
    return txt + ' €';
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
      var selector = document.querySelector('.variant-axis');
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

  /* LOS PACKS

     Una oferta de pack cambia lo que cuesta cada linea cuando estan TODAS.
     Quien lo sabe es el catalogo (`SCOOTSHOP_resolverPacks`), y la MISMA regla
     la aplica el backend al tarifar el pedido. Aqui solo se pinta.

     Antes esto leia `ss_checkout_discount` —el codigo de descuento que dejaba la
     portada— para adivinar el precio del pack. Eran dos verdades: la del cupon y
     la del catalogo, y bastaba que el cupon no validara para que el cliente
     viera un precio en el cajon y otro al pagar.

     Si el catalogo todavia no ha cargado (`resolverPacks` no existe), se suma
     como toda la vida: precios sueltos, nunca un precio inventado.
  */
  /* La copia del carrito que se acaba de vaciar. Vive en memoria y muere con
     la pestaña: no es un historial, es una red debajo de un boton. */
  var deshacerVaciado = null;

  /* ── EL PACK A MEDIAS ─────────────────────────────────────────────────────

     Quitar una pieza DESHACE el pack, y hasta ahora eso pasaba en silencio: el
     cliente quitaba la bolsa de 8 € y el carrito le subia 28,99 € sin una
     palabra. Es el unico momento del cajon en el que hay dinero cambiando de
     sitio sin que nadie lo explique.

     Solo se avisa cuando el carrito esta CERCA: al menos tres piezas dentro y
     algo suelto. Con una sola pieza no hay un pack roto, hay un carrito normal, y
     decir «te faltan cuatro cosas» seria un anuncio, no un aviso. */
  function packAMedias(items) {
    try {
      var packs = (typeof window.SCOOTSHOP_getPacks === 'function')
        ? window.SCOOTSHOP_getPacks() : [];
      if (!packs.length || !items.length) return null;

      var hay = {};
      for (var i = 0; i < items.length; i++) {
        var s = String(items[i].sku || '').toUpperCase();
        if (s) hay[s] = (hay[s] || 0) + sanitizeQty(items[i].qty);
      }

      for (var p = 0; p < packs.length; p++) {
        var pack = packs[p];
        var dentro = 0;
        var faltan = [];
        for (var a = 0; a < pack.articulos.length; a++) {
          var art = pack.articulos[a];
          var n = Math.max(1, parseInt(art.cantidad, 10) || 1);
          var tiene = hay[String(art.sku).toUpperCase()] || 0;
          if (tiene >= n) dentro++;
          else faltan.push({ sku: art.sku, cantidad: n - tiene });
        }
        if (faltan.length && dentro >= 3) return { pack: pack, faltan: faltan };
      }
    } catch (_) {}
    return null;
  }

  /* Lo que costaria el carrito CON el pack completo. Sale que añadir lo que falta
     BAJA el total, y esa es exactamente la frase que hay que decirle al cliente. */
  function loQueBajaAlCompletar(items, medias) {
    try {
      if (typeof window.SCOOTSHOP_resolverPacks !== 'function') return null;
      var completo = items.slice();
      for (var i = 0; i < medias.faltan.length; i++) {
        completo.push({ sku: medias.faltan[i].sku, qty: medias.faltan[i].cantidad, price: 0 });
      }
      var ahora = window.SCOOTSHOP_resolverPacks(items);
      var luego = window.SCOOTSHOP_resolverPacks(completo);
      if (!ahora || !luego || !luego.packs.length) return null;
      return { baja: +(ahora.subtotal - luego.subtotal).toFixed(2), total: luego.subtotal };
    } catch (_) { return null; }
  }

  function packDeLineas(items) {
    try {
      if (typeof window.SCOOTSHOP_resolverPacks !== 'function') return null;
      var r = window.SCOOTSHOP_resolverPacks(items || []);
      return (r && r.packs && r.packs.length) ? r : null;
    } catch (_) { return null; }
  }

  /* Lo que vale UNA linea con los packs puestos, y lo que se tacha. */
  function importeDeLinea(item, pack, indice) {
    var qty = sanitizeQty(item.qty);
    var suelto = parsePrice(item.price) * qty;
    var linea = pack && pack.lineas && pack.lineas[indice];
    if (!linea) return { ahora: suelto, antes: 0 };
    return { ahora: linea.importe, antes: linea.importeSuelto || 0 };
  }

  function textoDeLinea(item, pack, indice) {
    var v = importeDeLinea(item, pack, indice);
    if (v.ahora <= 0) {
      return '<span class="ss-cart-gratis">Gratis</span>' +
             (v.antes ? '<s class="ss-cart-antes">' + formatEur(v.antes) + '</s>' : '');
    }
    return formatEur(v.ahora) +
           (v.antes ? '<s class="ss-cart-antes">' + formatEur(v.antes) + '</s>' : '');
  }

  /* Lo que el pack rebaja sobre la suma suelta. Solo para el rotulo: la cifra
     que se enseña sale de sumar las lineas, no de restar esto. */
  function rebajaDePack(items) {
    var pack = packDeLineas(items);
    if (!pack) return 0;
    return +(pack.subtotalSuelto - pack.subtotal).toFixed(2);
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
    /* Añadir algo cancela el deshacer: ya no es «lo acabo de vaciar sin
       querer», es un carrito nuevo. */
    deshacerVaciado = null;
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
      drawerCount = document.getElementById('ssCartCount');
      checkoutBtn = document.getElementById('ssCartCheckoutBtn');
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
          /* VACIAR VIVE AQUI, no abajo. Abajo estaba en un boton del mismo
             tamaño y peso que «Seguir comprando», al lado del de pagar: una
             accion destructiva con la misma voz que una neutra. Aqui es texto
             pequeño, esta lejos del boton de pagar, y ademas AHORA SE PUEDE
             DESHACER — antes un toque borraba el carrito sin vuelta atras. */
          '<div class="ss-cart-head-acciones">' +
            '<button type="button" class="ss-cart-clear" id="ssCartClear">Vaciar</button>' +
          '<button type="button" class="ss-cart-close" id="ssCartClose" aria-label="Cerrar carrito">' +
            // Equis y no flecha: cerrar es cerrar, y es el mismo simbolo que
            // usa el panel de filtros, el otro cajon del sitio.
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
          '</button>' +
          '</div>' +
        '</header>' +
        '<div class="ss-cart-body" id="ssCartItems"></div>' +
        '<footer class="ss-cart-foot">' +
          /* Barra de progreso hacia el envío gratis. Los estilos van EN LÍNEA a
             propósito: `.ss-cart-*` vive en main.css, y añadir reglas allí obligaría
             a bumpear el asset-version global y redesplegar los 48 HTML por una barra
             que solo se ve dentro del cajón. Mismo criterio que las animaciones de
             la caja "Añade algo más". */
          '<div id="ssCartShip" hidden style="margin:0 0 12px">' +
            '<div id="ssCartShipTxt" style="font-size:.82rem;font-weight:700;color:#4a5560;margin:0 0 7px;line-height:1.35"></div>' +
            '<div id="ssCartShipTrack" style="height:7px;background:#e8ecf0;border-radius:99px;'
              + 'overflow:hidden;transition:' + TRANSICION_CARRIL + '">' +
              '<div id="ssCartShipBar" style="height:100%;width:0%;background:#111315;border-radius:99px;transition:width .35s ease,background-color .35s ease"></div>' +
            '</div>' +
          '</div>' +
          /* EL IMPORTE VA DENTRO DEL BOTON, no en una fila propia.

             Aqui habia un renglon «Subtotal ....... 585,99 €» de 55 px, un tercio
             del pie, para decir un numero que se mira justo al decidir. Metido en el
             boton se recuperan esos 55 px sin encoger el objetivo tactil —el boton
             conserva sus 357 px de ancho en un movil de 390— y, sobre todo, es lo
             que ya hace la pantalla SIGUIENTE: en /checkout el boton dice
             «CONTINUAR A PAGO — 812,99 €». Dos pasos seguidos, la misma forma.

             Y es el TOTAL, no el subtotal: por debajo de 10 € se cobran 2,99 € de
             envio, y esa regla depende solo del carrito, asi que aqui ya se sabe.
             Poner «subtotal» en un boton que promete cerrar la compra seria peor
             que no poner nada. */
          /* UNA sola decision, y nada mas. «Seguir comprando» se fue porque repetia
             lo que ya hacen el aspa de arriba y el clic en el velo; el letrero que
             lo explicaba se ha ido detras. Cerrar un cajon tocando fuera no hay que
             enseñarlo: se sabe, y escribirlo debajo del unico boton de la pantalla
             solo le quitaba fuerza. */
          '<div class="ss-cart-actions">' +
            '<div class="ss-cart-total">' +
              '<span class="ss-cart-total-rot">Total</span>' +
              '<strong class="ss-cart-total-val" id="ssCartTotal">0 €</strong>' +
            '</div>' +
            '<a href="/checkout?cart=1" class="ss-cart-checkout" id="ssCartCheckoutBtn">' +
              '<span class="ss-cart-checkout-txt">Finalizar compra</span>' +
              /* LA MISMA FLECHA que «Elegir opcion» del catalogo y que el
                 «Continuar a pago» del checkout: el mismo SVG, literal. */
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>' +
            '</a>' +
          '</div>' +
        '</footer>' +
      '</aside>';

    document.body.appendChild(drawerRoot);

    drawerBackdrop = document.getElementById('ssCartBackdrop');
    drawerPanel = document.getElementById('ssCartPanel');
    drawerItems = document.getElementById('ssCartItems');
    drawerCount = document.getElementById('ssCartCount');
    drawerShip = document.getElementById('ssCartShip');
    drawerShipTxt = document.getElementById('ssCartShipTxt');
    drawerShipBar = document.getElementById('ssCartShipBar');
    checkoutBtn = document.getElementById('ssCartCheckoutBtn');

    var closeBtn = document.getElementById('ssCartClose');
    var clearBtn = document.getElementById('ssCartClear');

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        /* Se guarda lo que habia ANTES de borrar. El estado vacio enseña
           entonces un «Deshacer» que lo repone tal cual —cantidades y
           variantes incluidas—, y la copia se tira en cuanto el cliente hace
           otra cosa. Sin esto, vaciar era irreversible de un solo toque. */
        var previo = read();
        if (!previo.length) return;
        deshacerVaciado = previo;
        clear();
      });
    }

    if (drawerItems) {
      drawerItems.addEventListener('click', function (event) {
        var fix = event.target.closest('.ss-cart-pack-roto__btn');
        if (fix) {
          event.preventDefault();
          /* Las lineas las construye el CATALOGO (`SCOOTSHOP_lineasDePack`), que es
             quien sabe de que color va cada pieza del pack y con que foto. Aqui solo
             se añade LO QUE FALTA: lo que ya esta dentro no se toca. */
          var medias2 = packAMedias(read());
          var todas = (medias2 && typeof window.SCOOTSHOP_lineasDePack === 'function')
            ? window.SCOOTSHOP_lineasDePack(medias2.pack.id) : null;
          if (!todas) return;
          medias2.faltan.forEach(function (f) {
            for (var k = 0; k < todas.length; k++) {
              if (String(todas[k].sku).toUpperCase() !== String(f.sku).toUpperCase()) continue;
              add(todas[k], f.cantidad);
              break;
            }
          });
          return;
        }

        var undo = event.target.closest('.ss-cart-deshacer');
        if (undo) {
          event.preventDefault();
          var repuesto = deshacerVaciado || [];
          deshacerVaciado = null;
          write(repuesto);
          return;
        }

        var emptyCta = event.target.closest('.ss-cart-empty-cta');
        if (emptyCta) {
          event.preventDefault();
          closeDrawer();
          window.location.href = '/patinetes/';
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

    var pack = packDeLineas(items);
    for (var j = 0; j < items.length; j++) {
      var target = rows[j];
      var qty = sanitizeQty(items[j].qty);
      setText(target.querySelector('.ss-cart-qty span'), String(qty));
      /* `innerHTML` y no `setText`: con el pack la linea lleva el precio suelto
         tachado al lado, y eso son dos elementos, no un texto. */
      var celda = target.querySelector('.ss-cart-line-total');
      if (celda) celda.innerHTML = textoDeLinea(items[j], pack, j);
      /* La DESCRIPCIÓN de la variante también se refresca aquí, y no es un detalle:
         este parcheo devuelve `true` y corta el pintado completo, así que lo que no
         se actualice en este bucle NO se actualiza nunca mientras las líneas no
         cambien de sitio. Faltaba, y por eso el cajón se quedaba con "Model: vmp":
         cuando el catálogo llegaba tarde, el repintado entraba por aquí, refrescaba
         cantidad e importe y salía sin volver a describir la variante.
         Es un fallo del parcheo, no de los atributos: cualquier cambio futuro en el
         texto de una línea se habría perdido igual.

         Y por eso mismo la chapa del PACK tambien se resuelve aqui: si no, este
         bucle le metia el texto de la variante dentro de la chapa roja y salia
         «COLOR: GRIS Y AMARILLO» en rojo, que no es ninguna de las dos cosas. */
      var chapa = target.querySelector('.ss-cart-color');
      if (chapa) {
        var enPack = !!(pack && pack.lineas && pack.lineas[j] && pack.lineas[j].enPack);
        chapa.classList.toggle('ss-cart-color--pack', enPack);
        setText(chapa, enPack ? 'Pack de la semana' : describirVariantes(items[j]));
      }
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

  /* Progreso hacia el envío gratis.
     La barra NO se llena del todo mientras el pedido no alcance el umbral, y en ese
     caso dice cuánto falta y cuánto se cobrará: es la diferencia entre enterarte en
     el carrito o enterarte al pagar. Con el carrito vacío se esconde entera, porque
     "te faltan 10 €" sobre cero no informa de nada. */
  /* ── LA BARRA DE ENVIO: SE LLENA, CELEBRA Y SE RECOGE ─────────────────────

     Que la barra desaparezca EN CUANTO se consigue el envio se lleva por delante
     lo unico que hacia bien: llenarse hasta el 100 % y ponerse verde. Ese medio
     segundo es el premio de haber llegado, y quitarlo deja el momento mudo.

     Asi que hay tres casos, no dos:
       - falta dinero        -> barra a su porcentaje, en negro;
       - ACABA de conseguirse -> se llena y se pone verde, se deja verla, y solo
         entonces se recoge;
       - ya estaba conseguido -> nada de barra, ni animacion: no hay nada que
         celebrar, esto es abrir el cajon con la compra ya hecha.

     `primeraPintada` existe justo para el tercero: sin el, abrir el carrito con
     el envio ya logrado disparaba la celebracion cada vez. */
  /* EL TOTAL VIVE EN SU MITAD, no dentro del boton.

     Primero se metio en el rotulo del boton («Finalizar compra — 10,99 €»), que es
     lo que hace /checkout. Funcionaba, pero alargaba el boton a 357 px con una
     letra de 12,6, y en un boton tan ancho esa letra se queda flotando y se lee
     mas debil que la de «Elegir opcion» del catalogo, que mide lo mismo en un
     boton de 170. Subir la letra lo arreglaba a costa de romper esa igualdad.

     Partido en dos, el boton vuelve a ~170 px —el ancho donde esa tipografia
     llena— y el importe gana un sitio propio donde puede ir grande. */
  function pintarTotal(total) {
    var hueco = document.getElementById('ssCartTotal');
    if (hueco) {
      var n = Number(total);
      hueco.textContent = formatEur(isFinite(n) && n > 0 ? n : 0);
    }
    /* Se escribe en el <span>, NO en el <a>: `textContent` sobre el enlace
       borraria la flecha, que es un hermano del texto. */
    var rotulo = checkoutBtn && checkoutBtn.querySelector('.ss-cart-checkout-txt');
    if (rotulo) rotulo.textContent = 'Finalizar compra';
  }

  var envioGratisPrevio = null;
  var primeraPintada = true;
  var recogidaBarra = null;
  var celebrando = false;

  /* Corta la celebracion a medias. Solo se llama cuando el envio DEJA de estar
     conseguido: ahi la barra tiene que volver, y esperar a que termine una
     animacion que ya no describe la verdad seria peor. */
  function cortarCelebracion() {
    if (recogidaBarra) { clearTimeout(recogidaBarra); recogidaBarra = null; }
    celebrando = false;
  }

  /* Va en linea y no en main.css a proposito: `cart-runtime.js` tiene revision
     propia, asi que un arreglo del cajon llega sin bumpear la version global ni
     redesplegar los 105 HTML. Mismo criterio que el resto de la barra. */
  var TRANSICION_CARRIL = 'height .32s ease,opacity .26s ease,margin-top .32s ease';

  /* Abre o recoge el carril de la barra. `animado` decide si el cambio se ve
     ocurrir o si aparece ya hecho — y NO se usa `hidden`: un elemento oculto no
     puede animarse, y ademas dependeria de que `[hidden]` gane el pulso a los
     estilos en linea. Recogido es alto 0 y opacidad 0, que es lo mismo a la vista
     y ademas se puede volver a abrir. */
  function pintarCarril(visible, animado) {
    var carril = drawerShipBar && drawerShipBar.parentNode;
    if (!carril) return;

    if (!animado) carril.style.transition = 'none';

    carril.style.height = visible ? '7px' : '0px';
    carril.style.opacity = visible ? '1' : '0';
    carril.style.marginTop = visible ? '0px' : '-7px';

    if (!animado) {
      /* Un reflujo forzado entre quitar y reponer la transicion: sin el, el
         navegador junta los dos cambios en el mismo fotograma y la anima igual. */
      void carril.offsetHeight;
      carril.style.transition = TRANSICION_CARRIL;
    }
  }

  function pintarEnvio(sum, hayLineas) {
    if (!drawerShip || !drawerShipTxt || !drawerShipBar) return;

    /* El rótulo dice "Subtotal" y nada más, haya envío que pagar o no: eso lo cuenta
       la línea de progreso de aquí arriba, y repetirlo bajo la cifra solo metía un
       texto bajo un número que no lo incluye. */
    /* Con pack, el rotulo cuenta la rebaja debajo de la palabra «Subtotal»: es
       donde el ojo ya esta y no obliga a meter otra fila en un pie estrecho. */
    /* «Subtotal» y nada mas. Debajo iba «Pack de la semana: ahorras 36,99 €» en
       verde, de cuando el pack no se distinguia por ningun lado en la lista. Con
       la chapa roja en cada linea y el precio suelto tachado al lado, esa frase
       repetia lo que ya se ve cinco veces mas arriba.

       La CIFRA si sale de sumar las lineas ya con su precio de pack, no de
       restarle un descuento al total suelto: asi lo de arriba cuadra con lo de
       abajo. */
    var lineas = read();
    var packActivo = packDeLineas(lineas);
    if (packActivo) sum = packActivo.subtotal;
    sum = Math.max(0, Number(Number(sum).toFixed(2)));

    if (!hayLineas || !(sum > 0)) {
      drawerShip.hidden = true;
      pintarTotal(0);
      return;
    }
    drawerShip.hidden = false;

    var envio = sum >= ENVIO_GRATIS_DESDE ? 0 : ENVIO_IMPORTE;
    var gratis = envio <= 0;
    var acabaDeLograrse = gratis && envioGratisPrevio === false && !primeraPintada;

    if (!gratis) {
      cortarCelebracion();
      pintarCarril(true, false);
    } else if (celebrando) {
      /* LA ANIMACION TERMINA SU RECORRIDO, PASE LO QUE PASE.

         Aqui estaba el fallo: al pulsar «+» dos veces seguidas, la primera
         cruzaba el umbral y arrancaba la celebracion, y la segunda entraba
         200 ms despues, veia que el envio «ya estaba conseguido» —porque lo
         estaba— y recogia la barra de golpe. La animacion desaparecia a mitad.

         Con una sola pulsacion no pasaba, y por eso costaba verlo: hace falta un
         segundo cambio DENTRO de la ventana de 900 ms. Mientras `celebrando` sea
         cierto no se toca el carril; el temporizador es el unico que lo recoge. */
    } else if (acabaDeLograrse) {
      /* Se deja llena y verde el tiempo de verla. 900 ms: la barra tarda 320 en
         llenarse (su propia transicion) y quedan otros 580 de premio. */
      celebrando = true;
      pintarCarril(true, false);
      recogidaBarra = setTimeout(function () {
        recogidaBarra = null;
        celebrando = false;
        /* LA BARRA SE QUEDA. Aqui se recogia con `pintarCarril(false, true)`: la
           celebracion duraba 900 ms y despues el carril se plegaba a 0 px, asi que
           el envio gratis conseguido se quedaba en una linea de texto suelta. El
           carril lleno y verde ES la senal de que esta conseguido, y quitarla
           justo al lograrlo deja el pie diciendo menos de lo que sabe. */
      }, 900);
    } else {
      /* Envio gratis ya conseguido de antes (se abre el cajon con el carrito ya por
         encima del umbral). Antes entraba sin carril; ahora se pinta lleno, igual
         que despues de la celebracion, para que el pie diga lo mismo se llegue por
         donde se llegue. */
      pintarCarril(true, false);
    }

    envioGratisPrevio = gratis;
    primeraPintada = false;

    var falta = Math.max(0, ENVIO_GRATIS_DESDE - sum);
    var pct = Math.max(0, Math.min(100, (sum / ENVIO_GRATIS_DESDE) * 100));

    if (envio > 0) {
      /* Nunca 0 % con algo dentro: una barra a cero parece rota y no transmite que
         ya llevas parte del camino. */
      drawerShipBar.style.width = Math.max(6, pct) + '%';
      drawerShipBar.style.backgroundColor = '#111315';

      /* CUANDO COMPLETAR SALE MAS BARATO, SE DICE.

         Con 8 € en el carrito faltan 2 para el umbral y el boton cobra 10,99
         (8 + 2,99 de envio). Añadiendo esos 2 € el envio pasa a gratis y el total
         queda en 10: gastar mas deja pagando MENOS. Eso lo sabe el cajon y hasta
         ahora se lo callaba — decia «te faltan 2 €» y dejaba la resta al cliente.

         OJO, SOLO ES CIERTO SI LO QUE FALTA CUESTA MENOS QUE EL ENVIO. Con 5 € en
         el carrito faltan otros 5, y completar lleva de 7,99 a 10: se paga MAS. En
         ese caso se mantiene el aviso de siempre, que no promete ningun ahorro.
         Sin este limite el cajon estaria mintiendo justo donde pide dinero. */
      if (falta < ENVIO_IMPORTE) {
        drawerShipTxt.innerHTML = 'Añade <strong style="color:#111315">' + formatEur(falta) +
          '</strong> y pagas <strong style="color:#1a8f4a">' + formatEur(ENVIO_GRATIS_DESDE) +
          '</strong> en vez de ' + formatEur(sum + envio);
      } else {
        drawerShipTxt.innerHTML = 'Te faltan <strong style="color:#111315">' + formatEur(falta) +
          '</strong> para el envío gratis';
      }
    } else {
      drawerShipBar.style.width = '100%';
      drawerShipBar.style.backgroundColor = '#1a8f4a';
      drawerShipTxt.innerHTML = '<span style="color:#1a8f4a">Envío gratis conseguido</span>';
    }

    /* Dice SUBTOTAL y muestra el subtotal: llamarlo "Total" era mentir, porque en
       /pago todavía se suma la comisión del método de pago. El envío no se mete en
       la cifra por lo mismo —sería un total a medias—: quien lo cuenta es la línea
       de progreso de arriba, que ya dice cuánto falta para que salga gratis. */
    pintarTotal(sum + envio);
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
    /* El importe lo escribe `pintarEnvio`, que es quien conoce la rebaja del pack.
       Escribirlo tambien aqui dejaba el precio sin rebajar durante un frame. */
    pintarEnvio(sum, items.length);
    if (checkoutBtn) checkoutBtn.setAttribute('href', '/checkout?cart=1');
    if (drawerPanel) drawerPanel.classList.toggle('is-empty', !items.length);

    if (!drawerItems) return;

    if (items.length && patchDrawerItems(items)) return;

    if (!items.length) {
      /* EL ESTADO VACIO YA NO ES CONSTANTE. Antes lo era —siempre el mismo texto
         y el mismo enlace— y por eso bastaba con «si ya hay uno puesto, no se
         repinta». Desde que lleva (o no) la linea de «Deshacer», la pregunta no
         es «hay un estado vacio» sino «hay EL estado vacio que toca».

         Sin esto, el «Deshacer» se quedaba pegado: cerrar el cajon caducaba el
         dato pero el repintado salia por aqui sin tocar el marcado, y al reabrir
         seguia ofreciendo deshacer un vaciado que ya no se podia deshacer. */
      var first = drawerItems.firstElementChild;
      var quiereDeshacer = !!(deshacerVaciado && deshacerVaciado.length);
      var tieneDeshacer = !!drawerItems.querySelector('.ss-cart-deshacer');
      if (first && first.classList.contains('ss-cart-empty') &&
          tieneDeshacer === quiereDeshacer) return;

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
          '<a class="ss-cart-empty-cta" href="/patinetes/">Explorar productos</a>' +
          /* EL DESHACER VA DEBAJO Y EN TEXTO, no como boton negro.

             Estaba ocupando el sitio y el peso de la accion principal, que en un
             carrito vacio es explorar el catalogo, no arrepentirse. Y sobre todo:
             la palabra «Deshacer» sola no explica nada — ahora lleva delante lo
             que se deshace, asi que se entiende sin haber visto lo de antes.

             Los estilos van EN LINEA como el resto de este fichero: cart-runtime.js
             tiene revision propia, asi que el arreglo llega sin bumpear la version
             global ni redesplegar los 105 HTML. */
          (deshacerVaciado && deshacerVaciado.length
            ? '<p style="margin:2px 0 0;font-size:.82rem;color:#676b73">' +
                'Lo acabas de vaciar. ' +
                '<button type="button" id="ssCartUndo" class="ss-cart-deshacer" ' +
                  'style="border:0;padding:0;background:none;font:inherit;font-weight:800;' +
                  'color:#111315;text-decoration:underline;text-underline-offset:3px;cursor:pointer">' +
                  'Deshacer' +
                '</button>' +
              '</p>'
            : '') +
        '</div>';
      return;
    }

    var packActivo = packDeLineas(items);
    /* Si NO hay pack completo, se mira si hay uno a medias: es el aviso que se
       cuelga al final de la lista. Se calcula aqui, una vez, y no dentro del mapa. */
    var medias = packActivo ? null : packAMedias(items);
    var cuentaMedias = medias ? loQueBajaAlCompletar(items, medias) : null;
    drawerItems.innerHTML = items.map(function (item, i) {
      /* El precio de la linea DENTRO del pack, con el suelto tachado al lado.
         La suma de abajo ya descuenta la rebaja, asi que si las lineas siguieran
         diciendo el precio suelto no cuadraria con el total. */
      var lineTotal = textoDeLinea(item, packActivo, i);
      // Sin loading="lazy" a propósito: el panel está en display:none mientras
      // el carrito está cerrado, así que una imagen lazy NO llega a cargarse y
      // las miniaturas aparecían de golpe A MITAD de la animación de apertura.
      // fetchpriority="low" las mantiene fuera del camino crítico de la página.
      /* 70x70 en el cajon: la medida de 400 sobra, y ahorra bajar la foto
         entera de cada linea cada vez que alguien abre el carrito. */
      var foto = window.SCOOTSHOP_miniatura ? window.SCOOTSHOP_miniatura(item.image) : item.image;
      var img = item.image
        ? '<img src="' + escapeHtml(foto) + '" alt="' + escapeHtml(item.name) + '" width="70" height="70" decoding="async" fetchpriority="low" />'
        : '<div class="ss-cart-thumb-placeholder" aria-hidden="true"><i class="fa-solid fa-scooter"></i></div>';

      return '' +
        // data-cart-key en la fila: es lo que permite a patchDrawerItems()
        // reconocer que la lista sigue siendo la misma y limitarse a los números.
        '<article class="ss-cart-item" data-cart-key="' + escapeHtml(item.key) + '">' +
          '<a class="ss-cart-thumb" href="' + escapeHtml(item.url || '#') + '">' + img + '</a>' +
          '<div class="ss-cart-meta">' +
            '<button type="button" class="ss-cart-remove" data-cart-action="remove" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Quitar producto" title="Quitar">' +
            /* Papelera de trazo. Antes eran dos barras giradas en `::before` y
               `::after`, que dibujaban un aspa: una X dice «cerrar», y este boton
               BORRA una linea. */
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16"/><path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.5 7l.7 11.2A2 2 0 0 0 9.2 20h5.6a2 2 0 0 0 2-1.8L17.5 7"/><path d="M10.5 11v5M13.5 11v5"/></svg></button>' +
            '<a class="ss-cart-name" href="' + escapeHtml(item.url || '#') + '">' + escapeHtml(item.name) + '</a>' +
            /* Las variantes las escribe el NÚCLEO, no esta plantilla: dice "Modelo:
               VMP · Medida: 720 mm" según lo que declare el producto, en vez del
               "Color:" que se ponía pasara lo que pasara. Sin variantes se mantiene
               "Único", igual que checkout, /pago, /pedido y los correos, para que la
               fila no cambie de forma. */
            /* UNA SOLA LÍNEA SIEMPRE, con puntos suspensivos. Mismo tratamiento que
               .ss-cart-name justo encima: la píldora trae `width:fit-content`, así que
               un valor largo ("ACABADO: TORNASOL NEGRO · ALZA 25 MM", "MODELO: FLAT
               PLANO · MEDIDA: 720 MM") la hacía envolver a dos renglones y la fila
               crecía — con dos productos seguidos, alturas distintas y lista
               irregular. Va en línea y no en main.css porque el CSS obliga a bump
               global; el marcado de las filas lo escribe siempre este fichero. */
            /* EN UNA LINEA DE PACK, LA CHAPA ROJA OCUPA EL SITIO DE LA VARIANTE.
               Igual que en /checkout y /pago, que son esta misma pantalla un paso
               y dos pasos despues. Sin ella, la unica pista de que el pack estaba
               puesto era el precio tachado — y el patinete no lo tiene, porque
               dentro del pack vale lo de siempre: la pieza principal de la oferta
               parecia ajena a la oferta. */
            (packActivo && packActivo.lineas && packActivo.lineas[i] && packActivo.lineas[i].enPack
              ? '<div class="ss-cart-color ss-cart-color--pack">Pack de la semana</div>'
              : '<div class="ss-cart-color" style="max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' +
                  escapeHtml(describirVariantes(item)) +
                '</div>') +
            /* Sin precio unitario suelto: con una unidad decía exactamente lo mismo
               que el total de la línea, dos renglones más abajo, y con varias el
               cliente ya tiene la cuenta delante (cantidad × total). */
            '<div class="ss-cart-row">' +
              '<div class="ss-cart-qty">' +
                '<button type="button" data-cart-action="dec" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Reducir cantidad">−</button>' +
                '<span>' + sanitizeQty(item.qty) + '</span>' +
                '<button type="button" data-cart-action="inc" data-cart-key="' + escapeHtml(item.key) + '" aria-label="Aumentar cantidad">+</button>' +
              '</div>' +
              '<strong class="ss-cart-line-total">' + lineTotal + '</strong>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('') + avisoDePackRoto(medias, cuentaMedias);
  }

  /* EL AVISO DE PACK ROTO. Va al final de la lista y no en el pie: el pie es donde
     se paga y ahi no se meten mensajes; ademas asi cae justo debajo de las lineas
     que forman el pack a medias, que es de lo que esta hablando.

     Los estilos van en linea como el resto de este fichero — cart-runtime.js tiene
     revision propia, asi que llega sin bumpear la version global. */
  function avisoDePackRoto(medias, cuenta) {
    if (!medias || !cuenta || !(cuenta.baja > 0)) return '';

    var todos = window.SCOOTSHOP_PRODUCTS || [];
    var nombres = medias.faltan.map(function (f) {
      var nombre = f.sku;
      for (var i = 0; i < todos.length; i++) {
        if (String(todos[i].sku).toUpperCase() === String(f.sku).toUpperCase()) {
          nombre = todos[i].name; break;
        }
      }
      return f.cantidad > 1 ? (nombre + ' ×' + f.cantidad) : nombre;
    });
    var lista = nombres.length === 1
      ? escapeHtml(nombres[0])
      : escapeHtml(nombres.slice(0, -1).join(', ')) + ' y ' + escapeHtml(nombres[nombres.length - 1]);

    return '' +
      '<div class="ss-cart-pack-roto">' +
        '<p class="ss-cart-pack-roto__tit">Te falta ' + lista + ' para el pack</p>' +
        '<p class="ss-cart-pack-roto__txt">Añádelo y el carrito <strong>baja a ' +
          formatEur(cuenta.total) + '</strong>, ' + formatEur(cuenta.baja) + ' menos que ahora.</p>' +
        '<button type="button" class="ss-cart-pack-roto__btn">Recuperar el pack</button>' +
      '</div>';
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
  /* Aqui vivia `atScrollEdge()`: decidia si la lista estaba tocando su borde para
     bloquear el gesto justo ahi. Se ha ido con el bloqueo por fotograma — quien
     corta el encadenado es `overscroll-behavior:contain`, no un preventDefault. */

  function stop(event) {
    // preventDefault sobre un evento no cancelable (inercia de iOS) solo genera
    // ruido en consola.
    if (event.cancelable) event.preventDefault();
  }

  function blockWheel(event) {
    /* Si la rueda cae sobre la lista, se deja pasar entera: el encadenado al
       llegar al borde ya lo corta `overscroll-behavior:contain`. Bloquear ahi
       tambien era pisarle el gesto al cliente por partida doble. */
    if (!drawerScroller(event.target)) stop(event);
  }


  /* ── POR QUE AQUI NO SE MIRA EL BORDE ─────────────────────────────────────

     Un `preventDefault()` sobre un `touchmove` no cancela ese fotograma: cancela
     EL GESTO. En cuanto el navegador ve uno cancelado decide que ese arrastre no
     es un scroll y deja de desplazar hasta que el dedo se levanta. Por eso, al
     bloquear el fotograma en el que la lista tocaba fondo, el resto del arrastre
     se quedaba muerto — «al llegar a lo mas abajo ni siquiera se mueve»—, y por
     eso tampoco servia de nada afinar el delta: el problema no era CUANDO se
     bloqueaba, era que se bloqueara en mitad de un gesto que ya estaba scrolleando.

     Asi que la decision se toma UNA VEZ, al posar el dedo: si el gesto nace sobre
     la lista, no se toca nunca; lo que impide que arrastre la pagina de detras al
     llegar al borde es `overscroll-behavior:contain`, que esta puesto en el CSS y
     ademas en linea (`applyDrawerScrollIsolation`) y que existe exactamente para
     esto. Si el gesto nace en la cabecera, el pie o el velo —que no scrollean—,
     se bloquea entero, que es lo que evita que el fondo se mueva. */
  function blockTouchMove(event) {
    // Pellizco para hacer zoom: no lo tocamos (accesibilidad).
    if (event.touches && event.touches.length > 1) return;
    /* DENTRO DEL PANEL NO SE CANCELA NUNCA UN GESTO. Solo el velo.

       Un `preventDefault()` en un `touchmove` no cancela ese fotograma: cancela el
       arrastre entero, y el navegador deja de desplazar hasta que se levanta el
       dedo. Mientras esta regla mirase el borde de la lista, o una bandera puesta
       en `touchstart`, quedaba abierta la posibilidad de matar un gesto legitimo
       —y el sintoma era exactamente ese: llegas al fondo, intentas subir y la
       lista no responde hasta que sueltas y empiezas otro gesto compuesto.

       Asi que aqui ya no se decide nada sobre la lista: si el dedo esta sobre el
       panel, el navegador manda. Lo que impide que el arrastre se lleve la pagina
       de detras al tocar el borde es `overscroll-behavior:contain`, que esta en el
       CSS y ademas en linea, y que hace justo eso sin cancelar nada.

       El precio: arrastrar sobre la cabecera o el pie —que no tienen scroll— mueve
       la pagina del fondo. Se ve poco, porque el panel es `position:fixed` y no se
       mueve con ella, y es infinitamente preferible a que la lista se quede
       muerta. */
    if (drawerPanel && drawerPanel.contains(event.target)) return;
    stop(event);
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

  /* ── LOS OYENTES CUELGAN DEL CAJON, NO DE `window` ───────────────────────────

     Un `touchmove` NO PASIVO en `window` obliga al navegador a preguntarle a JS
     antes de mover un solo pixel de CUALQUIER scroll de la pagina: pierde el
     camino rapido del compositor y el arrastre pasa a ir a golpes. Y estaba
     puesto en window solo para que la pagina de detras no se moviera.

     No hace falta: mientras el cajon esta abierto, el VELO cubre la pantalla
     entera y cuelga del mismo `#ssCartDrawer` que el panel, asi que todo dedo que
     toque algo aterriza aqui dentro. Colgando los oyentes del cajon, el resto de
     la pagina conserva su scroll nativo y aqui dentro solo se bloquea lo que hay
     que bloquear.

     `touchstart` va en la fase de CAPTURA para que la bandera del gesto se fije
     antes de que nadie mas toque el evento. */
  function blockScroll() {
    if (scrollBlocked || !drawerRoot) return;
    drawerRoot.addEventListener('wheel', blockWheel, { passive: false });
    drawerRoot.addEventListener('touchmove', blockTouchMove, { passive: false });
    window.addEventListener('keydown', blockKeys, false);
    scrollBlocked = true;
  }

  function unblockScroll() {
    if (!scrollBlocked) return;
    if (drawerRoot) {
      drawerRoot.removeEventListener('wheel', blockWheel, { passive: false });
      drawerRoot.removeEventListener('touchmove', blockTouchMove, { passive: false });
    }
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
    if (drawerItems) {
      drawerItems.style.overscrollBehavior = 'contain';
      /* `touch-action:pan-y` le dice al navegador, ANTES de que haya un solo
         `touchmove`, que aqui el gesto vertical es un desplazamiento. Con eso
         puede llevarlo por el compositor sin esperar a que JS decida, que es lo
         que hacia que el arrastre fuera a tirones. */
      drawerItems.style.touchAction = 'pan-y';
    }
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
    /* LA BARRA DE DESPLAZAMIENTO DE LA PAGINA, apagada mientras el cajon esta
       abierto. El panel es `position:fixed`, asi que su canto derecho llega hasta
       el borde del AREA DE CONTENIDO y deja a su derecha los ~15 px de la barra
       nativa: con el fondo atenuado por el velo, esa franja clara se ve como una
       raya al lado del carrito.

       No se quita la barra —eso cambiaria el ancho y ya esta documentado arriba
       por que el fondo NO se bloquea con `overflow` ni fijando el body—: solo se
       le quita el color, en el CSS. Y no se pierde nada, porque mientras el cajon
       esta abierto el scroll de la pagina ya esta bloqueado por eventos: esa barra
       no responde a nadie. */
    document.documentElement.classList.add('ss-cart-abierto');
  }

  /* Al cerrar se olvida el estado anterior. Si no, abrir el cajon justo despues
     de cruzar el umbral repetiria la celebracion sin que haya pasado nada. */
  function closeDrawer() {
    primeraPintada = true;
    cortarCelebracion();
    /* EL DESHACER CADUCA AL CERRAR. «Lo acabas de vaciar» solo es verdad mientras
       el cajon sigue abierto: cerrar y volver a abrir dejaba un «Deshacer» colgado
       para un vaciado que ya no acaba de ocurrir, y sin nada que lo explicara.

       Y hay que REPINTAR, no basta con olvidar el dato: el estado vacio ya estaba
       escrito con su «Deshacer», y `openDrawer()` solo vuelca lo que estuviera
       pendiente — si entre cerrar y abrir no cambia el carrito, no hay nada
       pendiente y el cajon reaparece con el texto viejo. Se pinta con el panel ya
       cerrandose, asi que no se ve. */
    if (deshacerVaciado) {
      deshacerVaciado = null;
      try { renderDrawerNow(); } catch (_) {}
    }
    if (!drawerPanel || !drawerBackdrop) return;

    drawerBackdrop.classList.remove('is-open');
    drawerPanel.classList.remove('is-open');
    document.documentElement.classList.remove('ss-cart-abierto');
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

      // El selector .variant-axis pertenece a la ficha del producto que se
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
