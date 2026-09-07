    (function(){
      'use strict';

      var LOCAL_API_BASE = '/api';
      var SUPPORT_MAIL = 'info@scootshop.co';
      var IS_LOCAL_DEV = window.__TEST_NO_LOCAL ? false : /^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname);

      // Año
      var y = document.getElementById('y');
      if(y) y.textContent = new Date().getFullYear();

      function getParam(k){
        try{ return new URLSearchParams(location.search).get(k); }
        catch(e){ return null; }
      }
      function safeText(s){ return (s ? String(s).replace(/\s+/g,' ').trim() : ''); }
      function readStorageValue(key){
        try {
          var fromSession = sessionStorage.getItem(key);
          if (fromSession) return fromSession;
        } catch(e) {}
        try {
          return localStorage.getItem(key);
        } catch(e) {
          return null;
        }
      }
      function writeStorageValue(key, value){
        try { sessionStorage.setItem(key, value); } catch(e) {}
        try { localStorage.setItem(key, value); } catch(e) {}
      }
      function removeStorageValue(key){
        try { sessionStorage.removeItem(key); } catch(e) {}
        try { localStorage.removeItem(key); } catch(e) {}
      }
      function escapeHtml(value){
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      function compactKey(s){ return safeText(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

      /* ── Descripción de variantes: SIEMPRE por el núcleo ──────────────────────
         Antes esta página escribía "Color: " + colorLabel en tres sitios, así que un
         patinete elegido por MODELO aparecía en el resumen del pedido como si fuera un
         color. El núcleo (js/product-attributes.js) resuelve el rótulo del eje y la
         etiqueta de la opción desde el catálogo, entiende las líneas antiguas sin
         `attrs` y cae al valor guardado si esa opción ya no existe — un pedido de hace
         meses se sigue leyendo aunque el catálogo haya cambiado.
         Devuelve '' cuando la línea no tiene variantes: quien pinta decide si eso es
         "Único" o no mostrar nada. */
      function productoDeLinea(item){
        if(!item) return null;
        try {
          var lista = window.SCOOTSHOP_PRODUCTS ||
            (window.SCOOTSHOP_CATALOG && window.SCOOTSHOP_CATALOG.products) || [];
          var sinBarra = function(v){ return String(v || '').replace(/\/+$/, ''); };
          var url = sinBarra(item.url || item.href);
          var skuItem = String(item.sku || '');
          for (var i = 0; i < lista.length; i++) {
            if ((skuItem && lista[i].sku === skuItem) || (url && sinBarra(lista[i].href) === url)) {
              return lista[i];
            }
          }
        } catch(_){}
        return null;
      }
      function describirVariantes(item){
        if(!item) return '';
        var producto = productoDeLinea(item);
        if (window.SS_ATTRS && typeof window.SS_ATTRS.describirTexto === 'function') {
          return window.SS_ATTRS.describirTexto(item, producto);
        }
        // Sin núcleo: NO se inventa que el eje es color. Solo una línea legacy de
        // verdad —sin `attrs`— se lee como color.
        if (item.attrs) {
          var partes = [];
          for (var k in item.attrs) {
            if (Object.prototype.hasOwnProperty.call(item.attrs, k)) {
              var t = String(k).replace(/[_-]+/g, ' ').trim();
              partes.push(t.charAt(0).toUpperCase() + t.slice(1) + ': ' + item.attrs[k]);
            }
          }
          if (partes.length) return partes.join(' · ');
        }
        var etiqueta = item.colorLabel || item.color || '';
        return etiqueta ? ('Color: ' + etiqueta) : '';
      }
      function loadCheckoutShipping(){
        try {
          var raw = readStorageValue('ss_checkout_shipping');
          return raw ? JSON.parse(raw) : null;
        } catch(e) {
          return null;
        }
      }
      /* Atributos con nombre de una línea ({ model: 'vmp' }). Se copian TAL CUAL del
         carrito: sin ellos la línea se lee como legacy —y legacy significa color—, que
         es lo que hacía que el resumen dijera "Color: G2 PRO VMP" aunque el núcleo y el
         catálogo estuvieran cargados. */
      function sanitizeAttrs(raw){
        if(!raw || typeof raw !== 'object') return null;
        var out = {};
        var hay = false;
        for (var k in raw) {
          if(!Object.prototype.hasOwnProperty.call(raw, k)) continue;
          var clave = safeText(k);
          var valor = safeText(raw[k]);
          if(clave && valor){ out[clave] = valor; hay = true; }
        }
        return hay ? out : null;
      }
      function loadCheckoutCart(){
        try {
          var raw = readStorageValue('ss_checkout_cart_snapshot') || readStorageValue('ss_cart_v1');
          if(!raw) return [];
          var parsed = JSON.parse(raw);
          if(!Array.isArray(parsed)) return [];
          return parsed.map(function(item){
            var qty = parseInt(item && item.qty, 10);
            qty = Number.isFinite(qty) && qty > 0 ? qty : 1;
            var price = parseFloat(item && item.price);
            price = Number.isFinite(price) && price > 0 ? price : 0;
            var sku = safeText(item && item.sku);
            var name = safeText(item && item.name);
            if(!name || price <= 0) return null;
            return {
              sku: sku,
              name: name,
              qty: qty,
              price: Number(price.toFixed(2)),
              url: normalizePath(item && (item.url || item.href) || '/'),
              image: safeText(item && item.image),
              color: safeText(item && item.color),
              colorLabel: safeText(item && item.colorLabel),
              attrs: sanitizeAttrs(item && item.attrs)
            };
          }).filter(Boolean);
        } catch(e) {
          return [];
        }
      }
      function cartSubtotal(items){
        var list = Array.isArray(items) ? items : [];
        var total = 0;
        for(var i = 0; i < list.length; i++) total += list[i].price * list[i].qty;
        return Number(total.toFixed(2));
      }
      function normalizePath(path){
        var value = safeText(path);
        if(!value) return '';
        if(/^https?:\/\//i.test(value)){
          try{
            var full = new URL(value, location.origin);
            return full.pathname || '';
          }catch(e){
            return value;
          }
        }
        return value.charAt(0) === '/' ? value : '/' + value;
      }
      function withAssetVersion(path){
        var meta = document.querySelector('meta[name="asset-version"]');
        var ver = meta ? safeText(meta.getAttribute('content')) : '';
        if(!ver) return path;
        return path + (path.indexOf('?') > -1 ? '&' : '?') + 'v=' + encodeURIComponent(ver);
      }

      var catalogPromise = null;
      function loadProductCatalog(){
        if(Array.isArray(window.SCOOTSHOP_PRODUCTS)) return Promise.resolve(window.SCOOTSHOP_PRODUCTS);
        if(catalogPromise) return catalogPromise;

        catalogPromise = new Promise(function(resolve){
          var existing = document.querySelector('script[data-products-catalog="true"]');
          if(existing){
            existing.addEventListener('load', function(){ resolve(window.SCOOTSHOP_PRODUCTS || []); }, { once:true });
            existing.addEventListener('error', function(){ resolve([]); }, { once:true });
            return;
          }

          var script = document.createElement('script');
          // La capa operativa (precio/stock del panel) antes del catálogo.
          if (!document.querySelector('script[data-product-overrides="true"]')) {
            var over = document.createElement('script');
            over.src = withAssetVersion('/data/product-overrides.js');
            over.async = false;
            over.dataset.productOverrides = 'true';
            document.head.appendChild(over);
          }
          script.src = withAssetVersion('/data/products.js');
          script.async = false;
          script.defer = true;
          script.dataset.productsCatalog = 'true';
          script.addEventListener('load', function(){ resolve(window.SCOOTSHOP_PRODUCTS || []); }, { once:true });
          script.addEventListener('error', function(){ resolve([]); }, { once:true });
          document.head.appendChild(script);
        });

        return catalogPromise;
      }

      function findCatalogProduct(products, params){
        if(!Array.isArray(products) || !products.length) return null;

        var skuKey = compactKey(params.sku);
        var nameKey = compactKey(params.name);
        var paypalKey = safeText(params.paypal);
        var pathKey = normalizePath(params.url);

        if(skuKey){
          for(var i = 0; i < products.length; i++){
            var sku = compactKey(products[i] && products[i].sku);
            if(sku && sku === skuKey) return products[i];
          }
        }

        if(paypalKey){
          for(var j = 0; j < products.length; j++){
            var paypalId = safeText(products[j] && products[j].paypalId);
            if(paypalId && paypalId === paypalKey) return products[j];
          }
        }

        if(pathKey){
          for(var k = 0; k < products.length; k++){
            var href = normalizePath(products[k] && products[k].href);
            if(href && href === pathKey) return products[k];
          }
        }

        if(nameKey){
          for(var n = 0; n < products.length; n++){
            var product = products[n];
            var productName = compactKey(product && product.name);
            if(productName && (productName === nameKey || productName.indexOf(nameKey) > -1 || nameKey.indexOf(productName) > -1)) {
              return product;
            }
          }
        }

        return null;
      }

      function toIndexList(variant, total){
        var indexes = [];
        if(!variant) return indexes;

        if(Array.isArray(variant.images) && variant.images.length){
          for(var i = 0; i < variant.images.length; i++){
            var raw = variant.images[i];
            var parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
            if(Number.isFinite(parsed) && parsed >= 1 && parsed <= total) indexes.push(parsed);
          }
          return indexes;
        }

        var start = null;
        var end = null;
        if(Array.isArray(variant.range) && variant.range.length >= 2){
          start = parseInt(variant.range[0], 10);
          end = parseInt(variant.range[1], 10);
        } else if(variant.from !== undefined || variant.to !== undefined){
          start = parseInt(variant.from, 10);
          end = parseInt(variant.to, 10);
        } else if(variant.start !== undefined || variant.end !== undefined){
          start = parseInt(variant.start, 10);
          end = parseInt(variant.end, 10);
        }

        if(!Number.isFinite(start) || !Number.isFinite(end)) return indexes;
        if(start > end){ var swap = start; start = end; end = swap; }

        for(var j = start; j <= end; j++){
          if(j >= 1 && j <= total) indexes.push(j);
        }

        return indexes;
      }

      function normalizeAssetPath(value){
        return safeText(value).split('?')[0].split('#')[0];
      }

      function resolveColorVariantMeta(product, selectedColorKey, selectedColorLabel, selectedImage){
        if(!product) return null;
        /* Las opciones salen del NUCLEO: da igual que el eje sea color, modelo o medida,
           y da igual como las declare el catalogo. Antes se leia `colorVariants`, que
           solo existia si el eje era de color. */
        var variants = [];
        if (window.SS_ATTRS) {
          var ejesProd = window.SS_ATTRS.ejes(product);
          for (var ep = 0; ep < ejesProd.length; ep++) variants = variants.concat(ejesProd[ep].options);
        }
        var gallery = Array.isArray(product.gallery) ? product.gallery : [];
        if(!variants.length || !gallery.length) return null;

        var keyMatch = compactKey(selectedColorKey);
        var labelMatch = compactKey(selectedColorLabel);
        var imageMatch = normalizeAssetPath(selectedImage);
        var variant = null;

        for(var i = 0; i < variants.length; i++){
          var key = compactKey(variants[i] && variants[i].key);
          var label = compactKey(variants[i] && variants[i].label);
          if((keyMatch && key === keyMatch) || (labelMatch && label === labelMatch)){
            variant = variants[i];
            break;
          }
        }

        if(!variant && imageMatch){
          for(var k = 0; k < variants.length; k++){
            var indexesByImage = toIndexList(variants[k], gallery.length);
            var firstByImage = indexesByImage.length ? indexesByImage[0] : 1;
            var galleryByImage = gallery[firstByImage - 1] || gallery[0];
            var srcByImage = normalizeAssetPath(galleryByImage && galleryByImage.src);
            if(srcByImage && srcByImage === imageMatch){
              variant = variants[k];
              break;
            }
          }
        }

        if(!variant) return null;
        var indexes = toIndexList(variant, gallery.length);
        var firstIndex = indexes.length ? indexes[0] : 1;
        var galleryItem = gallery[firstIndex - 1] || gallery[0];
        return {
          key: safeText(variant && variant.key),
          label: safeText(variant && variant.label),
          image: galleryItem && galleryItem.src ? safeText(galleryItem.src) : ''
        };
      }

      var checkoutMetaPromise = null;
      function resolveCheckoutMeta(){
        if(checkoutMetaPromise) return checkoutMetaPromise;

        if(isCartMode && cartItems.length){
          checkoutMetaPromise = Promise.resolve({
            name: name,
            sku: sku,
            productUrl: productUrl,
            productImage: productImage,
            paypalId: paypalId,
            category: 'cart',
            colorKey: colorKey,
            colorLabel: colorLabel,
            cartItems: cartItemsForRequest()
          });
          return checkoutMetaPromise;
        }

        checkoutMetaPromise = loadProductCatalog().then(function(products){
          var product = findCatalogProduct(products, {
            sku: sku,
            name: name,
            paypal: paypalId,
            url: productUrl
          });

          var resolved = {
            name: name,
            sku: sku,
            productUrl: productUrl,
            productImage: productImage,
            paypalId: paypalId,
            category: '',
            colorKey: colorKey,
            colorLabel: colorLabel
          };

          if(product){
            if(!resolved.name && product.name) resolved.name = safeText(product.name);
            if(!resolved.sku && product.sku) resolved.sku = safeText(product.sku);
            if(!resolved.productUrl && product.href) resolved.productUrl = normalizePath(product.href);
            if(!resolved.productImage && product.image) resolved.productImage = safeText(product.image);
            if(!resolved.paypalId && product.paypalId) resolved.paypalId = safeText(product.paypalId);
            if(!resolved.category && (product.categoryKey || product.category)) {
              resolved.category = safeText(product.categoryKey || product.category);
            }

            var colorMeta = resolveColorVariantMeta(product, resolved.colorKey, resolved.colorLabel, resolved.productImage);
            if(colorMeta){
              if(!resolved.colorKey && colorMeta.key) resolved.colorKey = colorMeta.key;
              if(!resolved.colorLabel && colorMeta.label) resolved.colorLabel = colorMeta.label;
              if(colorMeta.image) resolved.productImage = colorMeta.image;
            }
          }

          if(sumName && resolved.name) sumName.textContent = resolved.name;

          // Mostrar thumbnail del producto
          if(sumThumb && resolved.productImage){
            sumThumb.src = resolved.productImage;
            sumThumb.alt = resolved.name || name || 'Producto';
            sumThumb.hidden = false;
          }

          var descResolved = describirVariantes(resolved);
          if(sumColor && descResolved){
            sumColor.textContent = descResolved;
            sumColor.style.display = 'block';
            sumColor.style.fontSize = '.75rem';
            sumColor.style.color = '#68707f';
            sumColor.style.marginTop = '4px';
          }

          colorKey = resolved.colorKey || colorKey;
          colorLabel = resolved.colorLabel || colorLabel;

          updatePaypalPreview(resolved);
          return resolved;
        }).catch(function(){
          var fallback = {
            name: name,
            sku: sku,
            productUrl: productUrl,
            productImage: productImage,
            paypalId: paypalId,
            category: '',
            colorKey: colorKey,
            colorLabel: colorLabel
          };
          updatePaypalPreview(fallback);
          return fallback;
        });

        return checkoutMetaPromise;
      }

      function updatePaypalPreview(meta){}

      function showErr(id, msg){
        var el = document.getElementById(id);
        if(!el) return;
        el.style.display = 'block';
        el.textContent = msg;
      }
      function clearErr(id){
        var el = document.getElementById(id);
        if(!el) return;
        el.style.display = 'none';
        el.textContent = '';
      }

      // Datos URL
      var name = safeText(getParam('name')) || 'Producto SCOOT SHOP';
      var sku  = safeText(getParam('sku'))  || safeText(getParam('ref')) || '';
      var productUrl = normalizePath(getParam('url')) || '';
      var productImage = safeText(getParam('image')) || '';
      var paypalId = safeText(getParam('paypal')) || safeText(getParam('hid')) || '';
      var colorKey = safeText(getParam('color')) || '';
      var colorLabel = safeText(getParam('colorLabel')) || '';
      var priceRaw = safeText(getParam('price')) || '';
      var priceNum = null;
      var resumeOrderIdParam = safeText(getParam('order')) || safeText(getParam('existingOrderId')) || '';
      var isCartMode = getParam('cart') === '1';
      var cartItems = isCartMode ? loadCheckoutCart() : [];
      /* ── LO QUE VIAJA AL PEDIDO ───────────────────────────────────────────────
         `attrs` es la verdad estructurada de la línea ({ model:'vmp', size:'720' }):
         claves estables de eje y de opción, que es lo que puede reinterpretar
         cualquiera más adelante. `variant_text` es la representación que el cliente
         vio al comprar, escrita por el núcleo y por nadie más.

         Van las DOS a propósito. Solo con `attrs`, un pedido de hace un año se
         releería con el catálogo de hoy y podría cambiar de texto —o quedarse mudo si
         se retiró la opción—. Solo con el texto, el pedido no sería consultable por
         máquina. Así el servidor no tiene que interpretar ejes: guarda y devuelve.
         `color`/`colorLabel` se mantienen porque son la identidad histórica de la
         línea y hay pedidos vivos que solo tienen eso. */
      var cartItemsPayload = cartItems.map(function(item){
        return {
          sku: item.sku,
          qty: item.qty,
          price: item.price,
          name: item.name,
          image: item.image || '',
          url: item.url || '',
          color: item.color || '',
          colorKey: item.color || '',
          colorLabel: item.colorLabel || '',
          attrs: item.attrs || null,
          variant_text: ''
        };
      });

      /* El texto se sella lo más tarde posible: al construir el payload el núcleo y el
         catálogo pueden no haber llegado todavía, y sellar "Modelo: vmp" —la clave
         cruda— dejaría eso escrito en el pedido para siempre. Todo envío pasa por
         aquí. */
      function cartItemsForRequest(){
        for(var i = 0; i < cartItemsPayload.length; i++){
          var texto = describirVariantes(cartItems[i]);
          if(texto) cartItemsPayload[i].variant_text = texto;
        }
        return cartItemsPayload;
      }

      // Lo mismo para la compra directa, que no tiene línea de carrito detrás.
      function singleVariantText(){
        return describirVariantes(lineaCompraDirecta());
      }
      function lineaCompraDirecta(){
        return { sku: sku, url: productUrl, color: colorKey || colorLabel, colorLabel: colorLabel };
      }
      /* La compra directa llega por URL con un solo valor (`?color=vmp`) y sin decir de
         qué eje es. El núcleo ya sabe resolverlo contra el catálogo, así que se le
         pide la lectura estructurada y de ahí salen los atributos nombrados: el pedido
         se guarda con { model:'vmp' } aunque el enlace siga hablando de "color". */
      function singleAttrs(){
        try {
          if(!window.SS_ATTRS || typeof window.SS_ATTRS.describir !== 'function') return null;
          var linea = lineaCompraDirecta();
          var partes = window.SS_ATTRS.describir(linea, productoDeLinea(linea));
          if(!partes.length) return null;
          var out = {};
          for(var i = 0; i < partes.length; i++) out[partes[i].key] = partes[i].value;
          return out;
        } catch(_){ return null; }
      }
      var savedShipping = loadCheckoutShipping();

      if(priceRaw){
        var cleaned = priceRaw.replace(/[^\d.,]/g,'').replace(',', '.');
        var n = Number(cleaned);
        if(Number.isFinite(n) && n > 0) priceNum = n;
      }

      if(isCartMode && cartItems.length){
        var cartUnits = 0;
        for(var ci = 0; ci < cartItems.length; ci++) cartUnits += cartItems[ci].qty;
        var firstCartItem = cartItems[0];
        var cartBaseTotal = cartSubtotal(cartItems);

        name = 'Carrito SCOOT SHOP (' + cartUnits + (cartUnits === 1 ? ' artículo)' : ' artículos)');
        sku = firstCartItem.sku || 'CART';
        productUrl = firstCartItem.url || productUrl;
        productImage = firstCartItem.image || productImage;
        if(Number.isFinite(cartBaseTotal) && cartBaseTotal > 0) {
          priceNum = cartBaseTotal;
          priceRaw = cartBaseTotal.toFixed(2);
        }
      }

      var priceLabel = priceNum ? fmtEur(priceNum) : (priceRaw ? priceRaw : '€');

      // -- Comisiones Stripe por método de pago --
      // Fórmula inversa: total = (base + fixedFee) / (1 - pct)
      // Así Stripe cobra su % del total y a nosotros nos llegan los €base limpios.
      var PAYMENT_FEES = {
        card:    { pct: 0.015,  fixed: 0.25, label: 'Comisión pago online' },
        klarna:  { pct: 0.05,   fixed: 0.40, label: 'Comisión Klarna' },
        scalapay:{ pct: 0.05,   fixed: 0.30, label: 'Comisión Scalapay' },
        paypal:  { pct: 0.0209, fixed: 0.29, label: 'Comisión PayPal' },
        bizum:   null,
        bank:    null
      };

      function calcSurcharge(basePrice, method){
        var fee = PAYMENT_FEES[method];
        if(!fee || !basePrice) return { surcharge: 0, total: basePrice || 0 };
        var total = (basePrice + fee.fixed) / (1 - fee.pct);
        total = Math.ceil(total * 100) / 100; // redondear al céntimo arriba
        var surcharge = +(total - basePrice).toFixed(2);
        return { surcharge: surcharge, total: total };
      }

      var currentPaymentMethod = '';
      var SESSION_DISCOUNT_KEY = 'ss_checkout_discount';
      var LOCAL_DEMO_DISCOUNT_CODE = 'QA10';
      var appliedDiscountCode = '';
      var currentPricingSnapshot = null;
      var pricingRequestToken = 0;
      var checkoutMetaState = null;
      var discountFeatureEnabled = false;
      var discountFeatureProbePromise = null;
      var discountCodeState = 'idle'; // idle | valid | invalid
      var appliedDiscountMeta = null;

      function effectivePaymentMethod(method){
        return method === 'bank' ? 'transfer' : (method || 'card');
      }

      /* EL DINERO SE ESCRIBE COMO EN TODO EL SITIO: coma decimal y los enteros
         sin decimales — «10 €», no «10.00 €»; «32,99 €», no «32.99 €». Es la misma
         regla que `formatMoney()` en /checkout, y esta pagina era la unica que
         ponia punto y arrastraba dos ceros: el cliente pasa de una pantalla a la
         otra en un clic y las cifras cambiaban de forma por el camino.

         Solo para ENSEÑAR. Lo que viaja en una URL o en una peticion sigue siendo
         `toFixed(2)`, que es formato de maquina. */
      function fmtEur(value){
        var num = Number(value);
        if(!Number.isFinite(num)) return '—';
        var txt = Number.isInteger(num) ? String(num) : num.toFixed(2).replace('.', ',');
        return txt + ' €';
      }

      function parseMoney(value){
        var num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      }

      /* Envío por umbral. Espejo de SHIPPING_FREE_FROM / SHIPPING_FEE en
         api/index.php: aquí solo sirve para ENSEÑAR el importe mientras el cliente
         elige método; el que cobra es el backend, que lo recalcula desde el
         catálogo y se queda con el mayor. Si cambian los números, se cambian en
         los dos sitios y manda el de PHP.
         Ojo al orden: la comisión de pasarela se calcula sobre el neto SIN envío
         —igual que calc_discount_engine— y el envío se suma después. */
      var ENVIO_GRATIS_DESDE = 10;
      var ENVIO_IMPORTE = 2.99;
      function envioPorUmbral(subtotal){
        var s = Number(subtotal);
        if (!Number.isFinite(s) || s <= 0) return 0;
        return s >= ENVIO_GRATIS_DESDE ? 0 : ENVIO_IMPORTE;
      }

      function localBreakdown(method){
        var base = Number.isFinite(priceNum) ? priceNum : 0;
        var surcharge = calcSurcharge(base, method);
        var envio = envioPorUmbral(base);
        return {
          subtotal_amount: base.toFixed(2),
          discount_amount: '0.00',
          amount_after_discount: base.toFixed(2),
          payment_fee_amount: (surcharge.surcharge || 0).toFixed(2),
          shipping_amount: envio.toFixed(2),
          total_amount: (+((surcharge.total || base) + envio).toFixed(2)).toFixed(2)
        };
      }

      function localDemoDiscountBreakdown(method, code){
        if(safeText(code).toUpperCase() !== LOCAL_DEMO_DISCOUNT_CODE) {
          return null;
        }

        var base = Number.isFinite(priceNum) ? priceNum : 0;
        var surcharge = calcSurcharge(base, method);
        var discount = +(base * 0.10).toFixed(2);
        var amountAfterDiscount = +(Math.max(0, base - discount)).toFixed(2);
        var fee = +(surcharge.surcharge || 0).toFixed(2);
        var envio = envioPorUmbral(base);
        var total = +(amountAfterDiscount + fee + envio).toFixed(2);

        return {
          subtotal_amount: base.toFixed(2),
          discount_amount: discount.toFixed(2),
          amount_after_discount: amountAfterDiscount.toFixed(2),
          payment_fee_amount: fee.toFixed(2),
          shipping_amount: envio.toFixed(2),
          total_amount: total.toFixed(2)
        };
      }

      /* ── LOS PACKS ─────────────────────────────────────────────────────
         Una oferta de pack cambia lo que cuesta cada linea cuando estan
         TODAS. La regla la declara el catalogo (`SCOOTSHOP_resolverPacks`) y
         la aplica el backend al tarifar; aqui solo se pinta lo mismo.

         Antes esto lo hacia un codigo de descuento y el resumen decia
         «Descuento -36,99 €» en vez de enseñar la bolsa a cero y el manillar
         a 32,99, que es lo que el cliente vio en la oferta.

         `null` mientras el catalogo no ha llegado: entonces cada linea vale
         lo que trae, que es su precio de catalogo. Se recalcula en cuanto
         `SS_READY` se cumple.  */
      var packResuelto = null;

      function resolverPacksDelCarrito(){
        try{
          if(!isCartMode || !cartItems.length) return null;
          if(typeof window.SCOOTSHOP_resolverPacks !== 'function') return null;
          var r = window.SCOOTSHOP_resolverPacks(cartItems);
          return (r && r.packs && r.packs.length) ? r : null;
        }catch(e){ return null; }
      }

      /* Lo que vale la linea `i` y, si el pack la rebaja, lo que se tacha. */
      function importeDeLinea(i){
        var item = cartItems[i] || {};
        var suelto = +(((Number(item.price) || 0) * (Number(item.qty) || 1)).toFixed(2));
        var l = packResuelto && packResuelto.lineas && packResuelto.lineas[i];
        if(!l) return { ahora: suelto, antes: 0, enPack: false };
        return { ahora: l.importe, antes: l.importeSuelto || 0, enPack: !!l.enPack };
      }

      function textoDeLinea(i){
        var v = importeDeLinea(i);
        var tachado = v.antes ? ('<s class="order-summary__product-was">' + fmtEur(v.antes) + '</s>') : '';
        if(v.ahora <= 0) return '<span class="order-summary__product-free">Gratis</span>' + tachado;
        return fmtEur(v.ahora) + tachado;
      }

      function buildCartLinePricing(method){
        var lines = [];
        var subtotal = 0;
        var discountTotal = 0;
        var type = safeText(appliedDiscountMeta && appliedDiscountMeta.type).toLowerCase();
        var rawValue = Number(String((appliedDiscountMeta && appliedDiscountMeta.value) == null ? '' : appliedDiscountMeta.value).replace(',', '.'));
        var discountValue = Number.isFinite(rawValue) ? rawValue : 0;

        for (var i = 0; i < cartItems.length; i++) {
          var item = cartItems[i] || {};
          var qty = Number(item.qty) || 1;
          var lineBase = importeDeLinea(i).ahora;

          /* Cada linea, a su precio de catalogo. Aqui se marcaba cual era
             «elegible» para el codigo y se le restaba su parte; ya no, porque el
             backend no reparte nada por lineas: la rebaja es una sola cifra sobre
             el subtotal y asi se guarda en el pedido. */
          lines.push({
            base: lineBase,
            discounted: lineBase,
            discount: 0,
            qty: qty
          });
          subtotal += lineBase;
        }

        subtotal = +subtotal.toFixed(2);

        /* LA MISMA CUENTA QUE LA CAJA, Y NO OTRA.

           El backend (`calc_discount_engine`) trata el subtotal entero como
           importe elegible —«V1: eligible = subtotal completo»— y resta UNA vez:
           un porcentaje sobre todo el subtotal, o un importe fijo acotado a el.
           `applies_to` decide si el codigo SE PUEDE usar, no sobre cuanto.

           Aqui se repartia el importe fijo POR LINEA y POR UNIDAD. Con el pack de
           la semana —cinco SKU elegibles, uno de ellos con 3 unidades— eso son
           36,99 x 7 = 258,93 EUR de rebaja donde la caja resta 36,99: la pantalla
           prometia mucho menos de lo que se cobra, que es el peor lado del error.
           Y con un porcentaje pasaba lo contrario, se quedaba corta, porque solo
           contaba las lineas elegibles.

           Las lineas se quedan a su precio de catalogo y la rebaja va en su propia
           fila, igual que en /checkout. Repartirla por lineas seria inventarse un
           reparto que el pedido no guarda. */
        if (appliedDiscountCode && appliedDiscountMeta && discountValue > 0) {
          if (type === 'percent') {
            discountTotal = +(subtotal * (discountValue / 100)).toFixed(2);
          } else if (type === 'amount') {
            discountTotal = +Math.min(discountValue, subtotal).toFixed(2);
          }
          discountTotal = Math.max(0, discountTotal);
        }
        discountTotal = +discountTotal.toFixed(2);
        var net = +(Math.max(0, subtotal - discountTotal)).toFixed(2);
        var surcharge = calcSurcharge(net, method);
        var fee = +(surcharge.surcharge || 0).toFixed(2);
        /* El umbral se mide sobre el SUBTOTAL, no sobre el neto: igual que en el
           backend, un descuento no debe hacer aparecer un gasto de envío que el
           cliente no veía al añadir al carrito. */
        var envio = envioPorUmbral(subtotal);
        var total = +(net + fee + envio).toFixed(2);

        return {
          lines: lines,
          breakdown: {
            subtotal_amount: subtotal.toFixed(2),
            discount_amount: discountTotal.toFixed(2),
            amount_after_discount: net.toFixed(2),
            payment_fee_amount: fee.toFixed(2),
            shipping_amount: envio.toFixed(2),
            total_amount: total.toFixed(2)
          }
        };
      }

      function applyCartLinePriceStyles(method){
        if(!isCartMode) return;
        var list = document.getElementById('sumCartItemsList');
        if(!list) return;

        var pricing = buildCartLinePricing(method || currentPaymentMethod || 'card');
        var priceEls = list.querySelectorAll('.sum-cart-item__total');
        for (var i = 0; i < priceEls.length; i++) {
          priceEls[i].innerHTML = textoDeLinea(i);
          priceEls[i].classList.toggle('is-discounted', importeDeLinea(i).antes > 0);
        }

        /* Y la chapa: «Ref: ACC-BAG» pasa a ser la chapa roja del pack. La misma
           caja, solo cambia clase y texto — igual que en /checkout, que es esta
           misma pantalla un paso antes. */
        var infos = list.querySelectorAll('.order-summary__product-info');
        for (var k = 0; k < infos.length && k < cartItems.length; k++) {
          var chapa = infos[k].querySelector('.order-summary__product-meta--ref, .order-summary__product-meta--pack');
          if (!chapa) continue;
          if (importeDeLinea(k).enPack) {
            chapa.className = 'order-summary__product-meta order-summary__product-meta--pack';
            chapa.textContent = 'Pack de la semana';
          } else {
            chapa.className = 'order-summary__product-meta order-summary__product-meta--ref';
            chapa.textContent = 'Ref: ' + (cartItems[k].sku || '');
          }
        }
      }

      function setDiscountFeatureEnabled(enabled){
        var box = document.getElementById('discountBox');
        var value = !!enabled;
        discountFeatureEnabled = value;
        if(box) {
          box.hidden = !value;
          box.classList.toggle('is-force-hidden', !value);
        }

        // Keep the summary clean if the feature is off.
        if(!value){
          var sumDiscountRowEl = document.getElementById('sumDiscountRow');
          var sumDiscountEl = document.getElementById('sumDiscount');
          var input = document.getElementById('discountCodeInput');

          appliedDiscountCode = '';
          appliedDiscountMeta = null;
          discountCodeState = 'idle';
          /* AQUI NO SE BORRA LO GUARDADO.

             Esta funcion se llama con `false` como *valor por defecto seguro*
             antes de preguntarle al backend si los descuentos estan encendidos
             (initDiscountUi), y tambien ante un error de red pasajero. Borrar
             `ss_checkout_discount` ahi se llevaba por delante el codigo que la
             portada acababa de dejar: la sonda contestaba «si» un instante
             despues, `loadDiscountFromSession()` leia y no habia nada.

             Medido: el pack de la semana llegaba a /pago sin su -36,99 EUR y el
             cliente veia 863,18 EUR donde el carrito y el checkout decian 812,99.
             Quien SI debe borrar es el que sabe que el codigo ya no vale: el
             cliente al quitarlo (clearDiscountCode) o el backend al decir
             `feature_disabled` o `valid:false`. Los tres lo hacen a mano. */
          if(input) input.value = '';
          updateDiscountControls();
          setDiscountMessage('', '');

          if(sumDiscountRowEl) sumDiscountRowEl.hidden = true;
          if(sumDiscountEl) sumDiscountEl.textContent = '—';

          applyCartLinePriceStyles(currentPaymentMethod || 'card');
        }
      }

      function probeDiscountFeatureAvailability(method){
        if(discountFeatureProbePromise) return discountFeatureProbePromise;

        discountFeatureProbePromise = resolveCheckoutMeta().then(function(meta){
          checkoutMetaState = meta || checkoutMetaState;

          var payload = {
            code: '__FEATURE_PROBE__',
            sku: sku || name,
            currency: 'EUR',
            payment_method: effectivePaymentMethod(method || 'card'),
            customer_email: safeText(savedShipping && savedShipping.email).toLowerCase(),
            frontend_base_amount: priceNum ? priceNum.toFixed(2) : '0.00',
            category: safeText(checkoutMetaState && checkoutMetaState.category),
            cart_items: isCartMode ? cartItemsForRequest() : []
          };

          return fetch(LOCAL_API_BASE + '/index.php?route=discount_validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
          }).then(function(res){
            return res.json().catch(function(){ return {}; }).then(function(data){
              var featureDisabled = (res.status === 503 && data && data.error === 'feature_disabled');
              if(featureDisabled) return false;

              // On localhost we keep the UI available as a fallback, but prefer
              // the backend whenever the endpoint responds correctly.
              if(res.ok) return true;
              if(IS_LOCAL_DEV) return true;
              return false;
            });
          });
        }).catch(function(){
          return false;
        }).then(function(enabled){
          setDiscountFeatureEnabled(enabled);
          return enabled;
        });

        return discountFeatureProbePromise;
      }

      function saveDiscountInSession(code){
        try{
          if(!code){
            removeStorageValue(SESSION_DISCOUNT_KEY);
            return;
          }
          writeStorageValue(SESSION_DISCOUNT_KEY, JSON.stringify({
            code: code,
            sku: sku || ''
          }));
        }catch(e){}
      }

      /* Espera a que haya metodo de pago y entonces revalida el codigo que venia
         guardado, con el mismo camino que si el cliente lo hubiera tecleado. El
         tope son 4 s: si en ese tiempo no hay metodo, no hay nada que tarifar. */
      function reaplicarCodigoGuardado(){
        var intentos = 0;
        (function espera(){
          if(currentPaymentMethod){ applyDiscountCode(); return; }
          if(++intentos > 40) return;
          setTimeout(espera, 100);
        })();
      }

      function loadDiscountFromSession(){
        try{
          var raw = readStorageValue(SESSION_DISCOUNT_KEY);
          if(!raw) return '';
          var data = JSON.parse(raw);
          var storedCode = safeText(data && data.code).toUpperCase();
          var storedSku = safeText(data && data.sku);
          if(!storedCode) return '';
          if(storedSku && sku && storedSku !== sku) return '';
          return storedCode;
        }catch(e){
          return '';
        }
      }

      function discountMessageFromReason(reason, fallbackMessage){
        var map = {
          CODE_NOT_FOUND: 'Código inexistente.',
          CODE_EXPIRED: 'Código caducado.',
          CODE_INACTIVE: 'Código inactivo.',
          PRODUCT_NOT_ELIGIBLE: 'Este producto no es elegible para el código.',
          CATEGORY_NOT_ELIGIBLE: 'Este producto no aplica para el código.',
          MIN_ORDER_NOT_REACHED: 'No se alcanza el mínimo para aplicar este código.',
          MAX_REDEMPTIONS_REACHED: 'Este código alcanzó su límite de usos.',
          MAX_REDEMPTIONS_PER_EMAIL_REACHED: 'Este código ya fue usado el máximo permitido para tu email.',
          CODE_NOT_STARTED: 'Este código todavía no está activo.'
        };
        if(reason && map[reason]) return map[reason];
        return fallbackMessage || 'No se pudo aplicar el código.';
      }

      function normalizeBreakdownResponse(data){
        var src = data && data.breakdown ? data.breakdown : data;
        return {
          subtotal_amount: (src && src.subtotal_amount != null) ? String(src.subtotal_amount) : '0.00',
          discount_amount: (src && src.discount_amount != null) ? String(src.discount_amount) : '0.00',
          amount_after_discount: (src && src.amount_after_discount != null) ? String(src.amount_after_discount) : '0.00',
          payment_fee_amount: (src && src.payment_fee_amount != null) ? String(src.payment_fee_amount) : '0.00',
          shipping_amount: (src && src.shipping_amount != null) ? String(src.shipping_amount) : '0.00',
          total_amount: (src && src.total_amount != null) ? String(src.total_amount) : '0.00'
        };
      }

      /* LA COMISION DE CADA METODO, SOBRE LO QUE SE VA A COBRAR.

         Cada fila de metodo lleva su «+13,20 €» para que se pueda comparar antes
         de elegir. Se calculaba sobre `priceNum` —el subtotal— y con un codigo
         aplicado eso deja dos cifras distintas para la MISMA comision en la misma
         pantalla: la fila decia +13,20 y el resumen +12,64. Ahora la base es el
         neto tras el descuento, que es sobre lo que la pasarela cobra.

         Se llama desde `renderSummaryFromBreakdown()` y no en el arranque: asi se
         repinta sola cada vez que cambia el precio (aplicar o quitar un codigo,
         cambiar de metodo) sin que nadie tenga que acordarse. */
      function pintarComisionesDeMetodo(base){
        var neto = Number(base);
        if(!Number.isFinite(neto) || neto <= 0){
          neto = (currentPricingSnapshot && Number.isFinite(currentPricingSnapshot.net))
            ? currentPricingSnapshot.net
            : (Number.isFinite(priceNum) ? priceNum : 0);
        }
        if(!neto) return;
        var casillas = document.querySelectorAll('.tab-fee[data-fee-method]');
        for(var f = 0; f < casillas.length; f++){
          var metodo = casillas[f].getAttribute('data-fee-method');
          var r = calcSurcharge(neto, metodo);
          casillas[f].textContent = r.surcharge > 0
            ? ('+' + fmtEur(r.surcharge))
            : 'sin comisión';
        }
      }

      function renderSummaryFromBreakdown(method, breakdown){
        var sumFeeRow = document.getElementById('sumFeeRow');
        var sumFeeLabel = document.getElementById('sumFeeLabel');
        var sumFee = document.getElementById('sumFee');
        var sumTotalEl = document.getElementById('sumTotal');
        var sumDiscountRowEl = document.getElementById('sumDiscountRow');
        var sumDiscountEl = document.getElementById('sumDiscount');

        var subtotal = parseMoney(breakdown && breakdown.subtotal_amount);
        var discount = parseMoney(breakdown && breakdown.discount_amount);
        var fee = parseMoney(breakdown && breakdown.payment_fee_amount);
        var shipping = parseMoney(breakdown && breakdown.shipping_amount);
        var total = parseMoney(breakdown && breakdown.total_amount);

        if(sumPrice) sumPrice.textContent = fmtEur(subtotal);

        if(sumDiscountRowEl) sumDiscountRowEl.hidden = !(discount > 0);
        if(sumDiscountEl) sumDiscountEl.textContent = discount > 0 ? ('- ' + fmtEur(discount)) : '—';

        if(sumFeeLabel) {
          var feeConfig = PAYMENT_FEES[method];
          sumFeeLabel.textContent = feeConfig ? feeConfig.label : 'Comisión método de pago';
        }
        if(sumFeeRow) sumFeeRow.hidden = !(fee > 0);
        if(sumFee) sumFee.textContent = fee > 0 ? ('+ ' + fmtEur(fee)) : '—';
        if(sumShipping) {
          if(shipping > 0) {
            sumShipping.textContent = fmtEur(shipping);
            sumShipping.style.color = '#111315';
            sumShipping.style.fontWeight = '700';
          } else {
            sumShipping.textContent = 'Gratis';
            sumShipping.style.color = '#1a8f4a';
            sumShipping.style.fontWeight = '800';
          }
        }
        if(sumTotalEl) sumTotalEl.textContent = fmtEur(total);

        currentPricingSnapshot = {
          method: effectivePaymentMethod(method),
          subtotal: subtotal,
          discount: discount,
          net: parseMoney(breakdown && breakdown.amount_after_discount),
          fee: fee,
          shipping: shipping,
          total: total
        };

        pintarComisionesDeMetodo(currentPricingSnapshot.net);
        refreshManualConceptTexts();
        refreshSupportContactLinks();
      }

      function getManualConceptAmount(){
        if(currentPricingSnapshot && Number.isFinite(currentPricingSnapshot.net)) {
          var shipping = Number.isFinite(currentPricingSnapshot.shipping) ? currentPricingSnapshot.shipping : 0;
          return +(currentPricingSnapshot.net + shipping).toFixed(2);
        }
        return Number.isFinite(priceNum) ? +priceNum.toFixed(2) : 0;
      }

      function refreshManualConceptTexts(){
        var bizumConceptEl = document.getElementById('bizumConcept');
        var bankConceptEl = document.getElementById('bankConcept');
        if(!bizumConceptEl && !bankConceptEl) return;

        var amountLabel = fmtEur(getManualConceptAmount());
        var baseConcept = ref + ' — ' + name + ' — ' + amountLabel;
        var bizumMax = 35;
        var bizumText = baseConcept.length > bizumMax ? (ref + ' — ' + amountLabel) : baseConcept;

        if(bizumConceptEl) bizumConceptEl.textContent = bizumText;
        if(bankConceptEl) bankConceptEl.textContent = baseConcept;
      }

      function setDiscountMessage(text, kind){
        var msg = document.getElementById('discountMsg');
        if(!msg) return;
        msg.textContent = text || '';
        if(text) msg.hidden = false;
        msg.classList.remove('is-ok', 'is-error');
        if(text && kind === 'ok') msg.classList.add('is-ok');
        if(text && kind === 'error') msg.classList.add('is-error');
      }

      function setDiscountButtonsLoading(isLoading){
        var applyBtn = document.getElementById('discountApplyBtn');
        var removeBtn = document.getElementById('discountRemoveBtn');
        var chipRemove = document.getElementById('discountChipRemove');
        var input = document.getElementById('discountCodeInput');
        if(applyBtn) {
          applyBtn.disabled = !!isLoading;
          if(isLoading){
            applyBtn.setAttribute('aria-busy', 'true');
            applyBtn.innerHTML = '<span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
          } else {
            applyBtn.removeAttribute('aria-busy');
            applyBtn.textContent = 'Aplicar';
          }
        }
        if(removeBtn) removeBtn.disabled = !!isLoading;
        if(chipRemove) chipRemove.disabled = !!isLoading;
        if(input) input.disabled = !!isLoading;
      }

      // El importe del descuento ya tiene su propia fila en el resumen; la fila
      // verde solo muestra el código, así no se repite la misma cifra dos veces.
      function updateDiscountControls(){
        var input = document.getElementById('discountCodeInput');
        var controls = document.getElementById('discountControls');
        var applied = document.getElementById('discountApplied');
        var removeBtn = document.getElementById('discountRemoveBtn');
        var msg = document.getElementById('discountMsg');
        var inputValue = safeText(input && input.value);
        if(input && appliedDiscountCode && !safeText(input.value)) {
          input.value = appliedDiscountCode;
          inputValue = safeText(input.value);
        }

        var isApplied = (discountCodeState === 'valid' && !!appliedDiscountCode);

        // Estado aplicado: el campo colapsa en un chip de éxito.
        if(controls) controls.hidden = isApplied;
        if(applied) applied.hidden = !isApplied;
        if(msg) msg.hidden = isApplied;

        if(isApplied){
          var codeEl = document.getElementById('discountAppliedCode');
          if(codeEl) codeEl.textContent = appliedDiscountCode;
        }

        // ✕ en línea: solo cuando hay un código erróneo que limpiar.
        if(removeBtn) {
          var canShowRemove = !!inputValue && discountCodeState === 'invalid';
          removeBtn.hidden = !canShowRemove;
          removeBtn.style.display = canShowRemove ? 'inline-flex' : 'none';
        }
      }

      function previewPricingRequest(method, discountCode){
        var payload = {
          sku: sku || name,
          currency: 'EUR',
          payment_method: effectivePaymentMethod(method),
          discount_code: discountCode || '',
          customer_email: safeText(savedShipping && savedShipping.email).toLowerCase(),
          category: safeText(checkoutMetaState && checkoutMetaState.category),
          cart_items: isCartMode ? cartItemsForRequest() : [],
          // Al reanudar un pedido, el backend recupera de él el envío guardado
          // (recargos manuales de admin). Sin esto el resumen mostraría el precio
          // de catálogo y no coincidiría con lo que se cobra.
          order_id: resumeOrderIdParam || getSessionOrderId() || ''
        };

        return fetch(LOCAL_API_BASE + '/index.php?route=order_pricing_preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(data){
            return { ok: res.ok, status: res.status, data: data || {} };
          });
        });
      }

      function validateDiscountRequest(method, code){
        var payload = {
          code: code,
          sku: sku || name,
          currency: 'EUR',
          payment_method: effectivePaymentMethod(method),
          customer_email: safeText(savedShipping && savedShipping.email).toLowerCase(),
          frontend_base_amount: priceNum ? priceNum.toFixed(2) : '0.00',
          category: safeText(checkoutMetaState && checkoutMetaState.category),
          cart_items: isCartMode ? cartItemsForRequest() : []
        };

        return fetch(LOCAL_API_BASE + '/index.php?route=discount_validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(data){
            return { ok: res.ok, status: res.status, data: data || {} };
          });
        });
      }

      function refreshPricingForMethod(method, opts){
        opts = opts || {};
        currentPaymentMethod = method || '';

        if(!priceNum || !method){
          renderSummaryFromBreakdown(method, localBreakdown(method));
          applyCartLinePriceStyles(method || 'card');
          return Promise.resolve();
        }

        if(isCartMode){
          var cartPricing = buildCartLinePricing(method);
          renderSummaryFromBreakdown(method, cartPricing.breakdown);
          applyCartLinePriceStyles(method);
          return Promise.resolve();
        }

        if(IS_LOCAL_DEV && !discountFeatureEnabled){
          var localDemo = localDemoDiscountBreakdown(method, appliedDiscountCode);
          if(localDemo){
            renderSummaryFromBreakdown(method, localDemo);
          } else {
            renderSummaryFromBreakdown(method, localBreakdown(method));
            if(appliedDiscountCode && opts.showFeatureMessage){
              setDiscountMessage('Descuentos no disponibles en modo local sin backend.', 'error');
            }
          }
          return Promise.resolve();
        }

        var token = ++pricingRequestToken;
        return resolveCheckoutMeta().then(function(meta){
          checkoutMetaState = meta || checkoutMetaState;
          return previewPricingRequest(method, appliedDiscountCode);
        }).then(function(result){
          if(token !== pricingRequestToken) return;

          if(!result.ok){
            if(result.status === 503 && result.data && result.data.error === 'feature_disabled') {
              setDiscountFeatureEnabled(false);
              if(appliedDiscountCode){
                appliedDiscountCode = '';
                saveDiscountInSession('');
                updateDiscountControls();
              }
              if(opts.showFeatureMessage){
                setDiscountMessage('Los descuentos están temporalmente desactivados.', 'error');
              }
              renderSummaryFromBreakdown(method, localBreakdown(method));
              return;
            }
            if(opts.showNetworkMessage){
              setDiscountMessage('Error de red al calcular el precio. Inténtalo de nuevo.', 'error');
            }
            setDiscountFeatureEnabled(false);
            renderSummaryFromBreakdown(method, localBreakdown(method));
            return;
          }

          var data = result.data || {};
          if(appliedDiscountCode && data.discount_valid === false){
            appliedDiscountCode = '';
            saveDiscountInSession('');
            updateDiscountControls();
            if(opts.showInvalidMessage){
              setDiscountMessage('El código ya no es válido para este producto o método.', 'error');
            }
          }

          renderSummaryFromBreakdown(method, normalizeBreakdownResponse(data));
        }).catch(function(){
          if(token !== pricingRequestToken) return;
          if(opts.showNetworkMessage){
            setDiscountMessage('Error de red al calcular el precio. Inténtalo de nuevo.', 'error');
          }
          setDiscountFeatureEnabled(false);
          renderSummaryFromBreakdown(method, localBreakdown(method));
        });
      }

      function updateSummaryFee(method){
        refreshPricingForMethod(method, {
          showInvalidMessage: true,
          showNetworkMessage: false,
          showFeatureMessage: false
        });
      }

      function getAdjustedPrice(method){
        var normalized = effectivePaymentMethod(method);
        if(currentPricingSnapshot && currentPricingSnapshot.method === normalized && Number.isFinite(currentPricingSnapshot.total)) {
          return currentPricingSnapshot.total;
        }
        var local = localBreakdown(normalized);
        return parseMoney(local.total_amount);
      }

      // Ref estable: hash de los params para que no cambie al recargar
      var refSrc = (name + '|' + priceRaw + '|' + sku).toLowerCase();
      var refHash = 0;
      for(var i=0;i<refSrc.length;i++) refHash = ((refHash << 5) - refHash + refSrc.charCodeAt(i)) | 0;
      var ref = 'SS-' + (refHash >>> 0).toString(36).toUpperCase();

      // Pintar resumen
      var sumName = document.getElementById('sumName');
      var sumSku = document.getElementById('sumSku');
      var sumColor = document.getElementById('sumColor');
      var sumPrice = document.getElementById('sumPrice');
      var sumShipping = document.getElementById('sumShipping');
      var sumTotal = document.getElementById('sumTotal');
      var sumThumb = document.getElementById('sumThumb');
      var sumAddress = document.getElementById('sumAddress');
      var sumAddressText = document.getElementById('sumAddressText');
      var payTitle = document.getElementById('payTitle');
      var emptyState = document.getElementById('emptyState');
      var summaryCard = document.getElementById('summaryCard');
      var methodsCard = document.getElementById('methodsCard');
      var methodDetailCard = document.getElementById('methodDetailCard');


      function buildCheckoutStepUrl(){
        try {
          var url = new URL('/checkout', location.origin);
          var params = new URLSearchParams(location.search || '');
          params.delete('session_id');
          params.delete('cancelled');
          params.delete('method');
          // Marca de "vuelvo a editar este pedido": el checkout la usa para
          // recuperar la nota de entrega, que en una visita nueva no se restaura.
          params.set('edit', '1');
          url.search = params.toString();
          return url.pathname + (url.search || '');
        } catch(e) {
          return '/checkout';
        }
      }

      if(sumAddress){
        sumAddress.addEventListener('click', function(){
          location.href = buildCheckoutStepUrl();
        });
      }

      // Estado vacío: si no hay nombre ni precio, mostrar pantalla vacía
      var hasProduct = (safeText(getParam('name')) || safeText(getParam('price')) || safeText(getParam('sku')) || (isCartMode && cartItems.length));
      /* Sin direccion no se paga, VENGA DE DONDE VENGA. Antes esta comprobacion se
         saltaba si la URL traia `checkout=1` —la que escribe /checkout—, dando por
         hecho que quien la lleva ya rellenó el formulario. Pero la direccion vive en
         sessionStorage y la URL sobrevive a la sesion: pestana restaurada tras cerrar
         el navegador, enlace reabierto, Safari purgando la sesion. En esos casos se
         pagaba con `shipping` vacio y el pedido nacia sin nombre, sin correo y sin
         direccion. La marca `checkout=1` dice de donde vienes, no que tengas datos. */
      function faltanDatosDeEnvio(){
        if(!savedShipping) return true;
        return !savedShipping.fullName || !savedShipping.email || !savedShipping.addressLine1
            || !savedShipping.postalCode || !savedShipping.city;
      }
      if(hasProduct && faltanDatosDeEnvio()) {
        location.replace(buildCheckoutStepUrl());
        return;
      }
      if(!hasProduct){
        if(emptyState) emptyState.hidden = false;
        if(summaryCard) summaryCard.hidden = true;
        if(methodsCard) methodsCard.hidden = true;
        if(methodDetailCard) methodDetailCard.hidden = true;
      } else {
        if(sumName) sumName.textContent = name;
        if(sumSku && sku) {
          sumSku.textContent = isCartMode
            ? (cartItems.length + (cartItems.length === 1 ? ' producto en carrito' : ' productos en carrito'))
            : ('Ref: ' + sku);
        }
        /* La línea de una compra directa se arma con SKU y ruta: sin ellos el núcleo no
           llega al producto, y sin producto no hay forma de saber que "vmp" es un
           MODELO y no un color. La clave (`color`) manda sobre la etiqueta. */
        function lineaResumen(){
          return (isCartMode && cartItems.length === 1)
            ? cartItems[0]
            : { sku: sku, url: productUrl, color: colorKey || colorLabel, colorLabel: colorLabel };
        }
        var descLinea = describirVariantes(lineaResumen());
        if(sumColor && descLinea) {
          sumColor.textContent = descLinea;
          sumColor.style.display = 'block';
          sumColor.style.fontSize = '.75rem';
          sumColor.style.color = '#68707f';
          sumColor.style.marginTop = '4px';
        }
        if(sumPrice) sumPrice.textContent = priceLabel;
        if(sumTotal) sumTotal.textContent = priceLabel;

        if(isCartMode && summaryCard && cartItems.length && !document.getElementById('sumCartItemsList')){
          var sumProduct = document.getElementById('sumProduct');
          if(sumProduct){
            sumProduct.hidden = true;
            sumProduct.style.display = 'none';

            var list = document.createElement('div');
            list.id = 'sumCartItemsList';
            list.className = 'order-summary__product-list';

            list.innerHTML = cartItems.map(function(item, indiceLinea){
              var itemName = escapeHtml(item.name || 'Producto');
              var itemRef = item.sku ? ('<span class="order-summary__product-meta order-summary__product-meta--ref">Ref: ' + escapeHtml(item.sku) + '</span>') : '';
              /* Regla global: una linea sin variantes muestra "Unico" (el chip --color
                 va en mayusculas por CSS) para igualar la fuerza visual de las que si
                 tienen. Lo que cambia es que el TEXTO lo escribe el nucleo: un patinete
                 elegido por modelo dice "Modelo: G2 PRO VMP", no "Color: vmp". */
              var itemColorText = describirVariantes(item);
              var itemColor = '<span class="order-summary__product-meta order-summary__product-meta--color">' + (itemColorText ? escapeHtml(itemColorText) : 'Único') + '</span>';
              var itemQty = (Number(item.qty) > 1) ? ('<span class="order-summary__product-meta order-summary__product-meta--qty">Cant: ' + escapeHtml(item.qty) + '</span>') : '';
              var lineTotal = textoDeLinea(indiceLinea);
              var itemImage = item.image
                ? ('<img class="order-summary__product-image" src="' + escapeHtml(window.SCOOTSHOP_miniatura ? window.SCOOTSHOP_miniatura(item.image) : item.image) + '" alt="' + itemName + '" loading="lazy" decoding="async" />')
                : ('<div class="order-summary__product-image" aria-hidden="true"></div>');

              return '' +
                '<article class="order-summary__product sum-cart-item">' +
                  '<div class="sum-cart-item__main">' +
                    itemImage +
                    '<div class="order-summary__product-info">' +
                      '<span class="order-summary__product-title">' + itemName + '</span>' +
                      itemRef +
                      itemColor +
                    '</div>' +
                  '</div>' +
                  '<div class="sum-cart-item__side">' +
                    '<strong class="sum-cart-item__total">' + lineTotal + '</strong>' +
                    itemQty +
                  '</div>' +
                '</article>';
            }).join('');

            sumProduct.parentNode.insertBefore(list, sumProduct.nextSibling);
            applyCartLinePriceStyles(currentPaymentMethod || 'card');
          }
        }

        /* REPINTADO ÚNICO en cuanto el núcleo puede resolver el catálogo. El resumen se
           escribe nada más cargar la página y el núcleo llega diferido: con red lenta el
           chip se quedaba con el respaldo ("Color: …") para siempre porque nadie volvía a
           escribirlo. Se engancha a `SS_ATTRS.ready` —la puerta única de readiness, la
           misma que usa el cajón del carrito—, nunca a un temporizador.
           Solo se reescribe el TEXTO: rehacer el HTML de la lista volvería a descargar
           las fotos (los duplicados que vigila check-image-dupes.js). */
        var repintarVariantes = function(){
          try {
            var desc = describirVariantes(lineaResumen());
            if(sumColor && desc) sumColor.textContent = desc;
            var lista = document.getElementById('sumCartItemsList');
            if(!lista) return;
            var chips = lista.querySelectorAll('.order-summary__product-meta--color');
            for(var i = 0; i < chips.length && i < cartItems.length; i++){
              chips[i].textContent = describirVariantes(cartItems[i]) || 'Único';
            }
          } catch(_){}
        };
        try {
          /* La promesa se coge o se crea: esta página puede correr antes que el núcleo. */
          if(!window.SS_READY && typeof Promise === 'function'){
            window.SS_READY = new Promise(function(res){ window.__ssResolverReady = res; });
          }
          /* Y con el catalogo ya cargado se resuelven los packs: hasta aqui las
             lineas valian su precio de catalogo, que es lo unico verdadero que se
             puede decir sin catalogo. */
          var repintarPrecios = function(){
            packResuelto = resolverPacksDelCarrito();
            refreshPricingForMethod(currentPaymentMethod || 'card', { showNetworkMessage: false });
          };
          if(window.SS_READY) window.SS_READY.then(function(){ repintarVariantes(); repintarPrecios(); });
          else { repintarVariantes(); repintarPrecios(); }
        } catch(_){}

        pintarComisionesDeMetodo();

        if (savedShipping && sumAddressText) {
          var fullAddress = [
            safeText(savedShipping.addressLine1),
            safeText(savedShipping.addressLine2)
          ].filter(Boolean).join(', ');
          var shippingSummary = [
            [safeText(savedShipping.postalCode), safeText(savedShipping.city)].filter(Boolean).join(' '),
            safeText(savedShipping.province),
            safeText(savedShipping.country)
          ].filter(Boolean).join(' — ');
          var locationLine = shippingSummary || 'Dirección completada';
          if (fullAddress) {
            sumAddressText.innerHTML = '';
            var line1 = document.createElement('span');
            line1.textContent = fullAddress;
            var line2 = document.createElement('span');
            line2.textContent = locationLine;
            line2.style.cssText = 'display:block;font-size:.76rem;color:#8b95a5;margin-top:2px';
            sumAddressText.appendChild(line1);
            sumAddressText.appendChild(line2);
          } else {
            sumAddressText.textContent = locationLine;
          }
          if(sumAddress) sumAddress.hidden = false;
        }

        // Imagen del producto (si viene por URL)
        if(sumThumb && productImage){
          sumThumb.src = productImage;
          sumThumb.alt = name || 'Producto';
          sumThumb.hidden = false;
        }
      }

      function applyDiscountCode(){
        var input = document.getElementById('discountCodeInput');
        var rawCode = safeText(input && input.value).toUpperCase();
        if(IS_LOCAL_DEV && !discountFeatureEnabled){
          if(!rawCode){
            discountCodeState = 'idle';
            updateDiscountControls();
            setDiscountMessage('Introduce un código para aplicarlo.', 'error');
            return;
          }

          var localDemo = localDemoDiscountBreakdown(currentPaymentMethod || 'card', rawCode);
          if(!localDemo){
            appliedDiscountCode = '';
            appliedDiscountMeta = null;
            discountCodeState = 'invalid';
            saveDiscountInSession('');
            updateDiscountControls();
            setDiscountMessage(discountMessageFromReason('CODE_NOT_FOUND', 'Código inexistente.'), 'error');
            refreshPricingForMethod(currentPaymentMethod, { showNetworkMessage: false });
            return;
          }

          appliedDiscountCode = rawCode;
          appliedDiscountMeta = { type: 'percent', value: '10', appliesTo: 'all', targetSkus: [] };
          discountCodeState = 'valid';
          if(input) input.value = appliedDiscountCode;
          saveDiscountInSession(appliedDiscountCode);
          updateDiscountControls();
          setDiscountMessage('', '');
          renderSummaryFromBreakdown(currentPaymentMethod || 'card', localDemo);
          applyCartLinePriceStyles(currentPaymentMethod || 'card');
          return;
        }
        if(!discountFeatureEnabled){
          return;
        }
        if(!rawCode){
          discountCodeState = 'idle';
          updateDiscountControls();
          setDiscountMessage('Introduce un código para aplicarlo.', 'error');
          return;
        }
        if(!currentPaymentMethod){
          setDiscountMessage('Selecciona primero un método de pago.', 'error');
          return;
        }
        setDiscountButtonsLoading(true);
        resolveCheckoutMeta().then(function(meta){
          checkoutMetaState = meta || checkoutMetaState;
          return validateDiscountRequest(currentPaymentMethod, rawCode);
        }).then(function(result){
          if(!result.ok){
            if(result.status === 503 && result.data && result.data.error === 'feature_disabled') {
              setDiscountFeatureEnabled(false);
              appliedDiscountCode = '';
              appliedDiscountMeta = null;
              discountCodeState = 'idle';
              saveDiscountInSession('');
              updateDiscountControls();
              setDiscountMessage('Los descuentos están temporalmente desactivados.', 'error');
              return refreshPricingForMethod(currentPaymentMethod, { showNetworkMessage: false });
            }
            setDiscountFeatureEnabled(false);
            setDiscountMessage('Error de red al validar el código.', 'error');
            return;
          }

          var data = result.data || {};
          if(!data.valid){
            appliedDiscountCode = '';
            appliedDiscountMeta = null;
            discountCodeState = 'invalid';
            saveDiscountInSession('');
            updateDiscountControls();
            setDiscountMessage(discountMessageFromReason(data.reason_code, data.message), 'error');
            return refreshPricingForMethod(currentPaymentMethod, { showNetworkMessage: false }).then(function(){
              if(currentPaymentMethod === 'card' || currentPaymentMethod === 'klarna' || currentPaymentMethod === 'paypal') {
                reloadStripeCheckout(currentPaymentMethod);
              }
              if(currentPaymentMethod === 'bizum' || currentPaymentMethod === 'bank') {
                ensureManualOrder(currentPaymentMethod);
              }
            });
          }

          appliedDiscountCode = safeText(data.code || rawCode).toUpperCase();
          appliedDiscountMeta = {
            type: safeText(data.discount_type),
            value: safeText(data.discount_value),
            appliesTo: safeText(data.applies_to),
            targetSkus: Array.isArray(data.target_skus) ? data.target_skus : []
          };
          discountCodeState = 'valid';
          if(input) input.value = appliedDiscountCode;
          saveDiscountInSession(appliedDiscountCode);
          updateDiscountControls();
          setDiscountMessage('', '');
          if(isCartMode){
            var cartPricingOnApply = buildCartLinePricing(currentPaymentMethod);
            renderSummaryFromBreakdown(
              effectivePaymentMethod(currentPaymentMethod),
              cartPricingOnApply.breakdown
            );
            applyCartLinePriceStyles(currentPaymentMethod);
          } else {
            renderSummaryFromBreakdown(effectivePaymentMethod(currentPaymentMethod), normalizeBreakdownResponse(data));
          }
          if(currentPaymentMethod === 'card' || currentPaymentMethod === 'klarna' || currentPaymentMethod === 'paypal') {
            reloadStripeCheckout(currentPaymentMethod);
          }
          if(currentPaymentMethod === 'bizum' || currentPaymentMethod === 'bank') {
            ensureManualOrder(currentPaymentMethod);
          }
        }).catch(function(){
          setDiscountFeatureEnabled(false);
          setDiscountMessage('Error de red al validar el código.', 'error');
        }).finally(function(){
          setDiscountButtonsLoading(false);
        });
      }

      function clearDiscountCode(){
        if(!discountFeatureEnabled){
          return;
        }
        var input = document.getElementById('discountCodeInput');
        appliedDiscountCode = '';
        appliedDiscountMeta = null;
        discountCodeState = 'idle';
        if(input) input.value = '';
        saveDiscountInSession('');
        updateDiscountControls();
        setDiscountMessage('', '');
        refreshPricingForMethod(currentPaymentMethod, { showNetworkMessage: false });
        if(currentPaymentMethod === 'card' || currentPaymentMethod === 'klarna' || currentPaymentMethod === 'paypal') {
          reloadStripeCheckout(currentPaymentMethod);
        }
        if(currentPaymentMethod === 'bizum' || currentPaymentMethod === 'bank') {
          ensureManualOrder(currentPaymentMethod);
        }
      }

      (function initDiscountUi(){
        var box = document.getElementById('discountBox');
        var input = document.getElementById('discountCodeInput');
        var applyBtn = document.getElementById('discountApplyBtn');
        var removeBtn = document.getElementById('discountRemoveBtn');
        if(!box || !input || !applyBtn || !removeBtn) return;

        // Do not probe discount endpoints when payment page has no selected product.
        if(!hasProduct){
          setDiscountFeatureEnabled(false);
          return;
        }

        // Secure default: hidden until backend confirms discounts are available.
        // In local direct mode we keep a demo coupon visible for QA.
        setDiscountFeatureEnabled(IS_LOCAL_DEV);

        probeDiscountFeatureAvailability(currentPaymentMethod || 'card').then(function(enabled){
          if(!enabled) return;

          appliedDiscountCode = loadDiscountFromSession();
          if(appliedDiscountCode) {
            input.value = appliedDiscountCode;
            discountCodeState = 'valid';
            /* Y SE REVALIDA. El codigo a secas no descuenta nada: en modo
               carrito quien calcula es `buildCartLinePricing()`, y necesita
               `appliedDiscountMeta` —tipo, valor— que solo sabe el backend.
               Antes se restauraba el nombre del codigo y se dejaba la caja
               puesta, pero el resumen seguia sumando el precio entero.
               `applyDiscountCode()` pide el metodo de pago elegido, y quien lo
               elige (setActiveTab) tambien va por su cuenta, asi que se espera
               a que exista en vez de dar por hecho un orden. */
            reaplicarCodigoGuardado();
          }
          updateDiscountControls();
        });

        applyBtn.addEventListener('click', applyDiscountCode);
        removeBtn.addEventListener('click', clearDiscountCode);
        var chipRemove = document.getElementById('discountChipRemove');
        if(chipRemove) chipRemove.addEventListener('click', clearDiscountCode);
        input.addEventListener('keydown', function(evt){
          if(evt.key === 'Enter'){
            evt.preventDefault();
            applyDiscountCode();
          }
        });
        input.addEventListener('input', function(){
          // Editing the field requires re-validation before showing clear action again.
          discountCodeState = 'idle';
          if(!safeText(input.value)) {
            appliedDiscountCode = '';
            saveDiscountInSession('');
            setDiscountMessage('', '');
          }
          updateDiscountControls();
        });
      })();

      updatePaypalPreview({ name: name, productImage: productImage });
      resolveCheckoutMeta();

      // Conceptos Bizum/Transferencia: importe siempre sincronizado con resumen (incluye descuento).
      refreshManualConceptTexts();

      function refreshSupportContactLinks(){
        var amountLabel = fmtEur(getManualConceptAmount());
        var msg =
          'Hola, adjunto comprobante.\n' +
          'Producto: ' + name + '\n' +
          'Importe: ' + amountLabel + '\n' +
          'Referencia: ' + ref + '\n';

        var waLink = 'https://wa.me/34666318747?text=' + encodeURIComponent(msg);
        ['waBizum','waBank'].forEach(function(id){
          var el = document.getElementById(id);
          if(el) el.href = waLink;
        });

        var mailSubject = 'Comprobante de pago — ' + ref;
        var mailBody = msg + '\nGracias.';
        var mailto = 'mailto:' + SUPPORT_MAIL + '?subject=' + encodeURIComponent(mailSubject) + '&body=' + encodeURIComponent(mailBody);
        ['mailBizum','mailBank'].forEach(function(id){
          var el = document.getElementById(id);
          if(el) el.href = mailto;
        });
      }

      // Links WhatsApp y Mail (sincronizados con el importe actual del resumen)
      refreshSupportContactLinks();

      function buildStripeReturnPath(methodKey){
        var chosenMethod = methodKey || 'card';
        try{
          var url = new URL(location.href);
          url.searchParams.set('method', chosenMethod);
          url.searchParams.delete('cancelled');
          return url.pathname + url.search;
        }catch(e){
          return '/pago?method=' + encodeURIComponent(chosenMethod);
        }
      }

      // Copiar
      document.querySelectorAll('[data-copy]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var sel = btn.getAttribute('data-copy');
          var el = sel ? document.querySelector(sel) : null;
          if(!el) return;

          var text = (el.textContent || '').trim();
          if(!text) return;

          function toast(ok){
            btn.setAttribute('data-copy-state', ok ? 'done' : 'error');
            btn.setAttribute('aria-label', ok ? 'Copiado' : 'Error al copiar');
            btn.setAttribute('title', ok ? 'Copiado' : 'Error al copiar');
            setTimeout(function(){
              btn.removeAttribute('data-copy-state');
              var hiddenText = btn.querySelector('.visually-hidden');
              var label = hiddenText ? hiddenText.textContent : 'Copiar';
              btn.setAttribute('aria-label', label);
              btn.setAttribute('title', label);
            }, 900);
          }

          if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(text).then(function(){ toast(true); }).catch(function(){ toast(false); });
          }else{
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try{ toast(document.execCommand('copy')); }catch(e){ toast(false); }
            document.body.removeChild(ta);
          }
        });
      });

      // Tabs
      var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-pay-tab]'));
      var methodEmpty = document.getElementById('methodEmpty');
      var panels = {
        card:   document.getElementById('panel-card'),
        klarna: document.getElementById('panel-klarna'),
        scalapay: document.getElementById('panel-scalapay'),
        paypal: document.getElementById('panel-paypal'),
        bizum:  document.getElementById('panel-bizum'),
        bank:   document.getElementById('panel-bank')
      };
      var paypalLoading = document.getElementById('paypalLoading');

      function ensurePaypalButtons(){
        clearErr('paypalErr');
        if(paypalWrap) paypalWrap.hidden = false;
        if(paypalInfo){
          paypalInfo.textContent = 'Pago seguro con PayPal a través de Stripe.';
        }
        return ensureStripeButtons('paypal');
      }
      var stripeInfo = document.getElementById('stripeInfo');
      var stripeLoading = document.getElementById('stripeLoading');
      var stripeMount = document.getElementById('stripe-embedded-checkout');
      var klarnaInfo = document.getElementById('klarnaInfo');
      var klarnaLoading = document.getElementById('klarnaLoading');
      var klarnaMount = document.getElementById('stripe-klarna-checkout');
      var klarnaWrap = document.getElementById('klarna-wrap');
      var scalapayInfo = document.getElementById('scalapayInfo');
      var scalapayLoading = document.getElementById('scalapayLoading');
      var scalapayMount = document.getElementById('stripe-scalapay-checkout');
      var scalapayWrap = document.getElementById('scalapay-wrap');
      var paypalInfo = document.getElementById('paypalInfo');
      var paypalMount = document.getElementById('stripe-paypal-checkout');
      var paypalWrap = document.getElementById('paypal-wrap');
      var stripeInstance = null;
      var stripeCheckout = null;
      var stripeInitPromise = null;
      var stripeSessionMeta = null;
      var stripeConfigPromise = null;
      var stripeCurrentMode = '';

      // --- Persistent order ID across payment method switches ---
      var SESSION_ORDER_KEY = 'ss_active_order';

      function shippingContextFingerprint(){
        if(!savedShipping) return '';
        return [
          safeText(savedShipping.fullName),
          safeText(savedShipping.email),
          safeText(savedShipping.phone),
          safeText(savedShipping.addressLine1),
          safeText(savedShipping.addressLine2),
          safeText(savedShipping.postalCode),
          safeText(savedShipping.city),
          safeText(savedShipping.province),
          safeText(savedShipping.country)
        ].join('|');
      }

      function checkoutSessionFingerprint(){
        var baseAmount = Number.isFinite(priceNum) ? priceNum.toFixed(2) : '';
        var cartFingerprint = isCartMode
          ? cartItemsPayload.map(function(item){ return [safeText(item.sku), Number(item.qty)||0, Number(item.price)||0].join('|'); }).join('||')
          : '';
        return [
          isCartMode ? 'cart' : 'single',
          safeText(sku || name),
          safeText(name),
          baseAmount,
          cartFingerprint,
          shippingContextFingerprint()
        ].join('::');
      }

      function getSessionOrderId(){
        try {
          var raw = readStorageValue(SESSION_ORDER_KEY);
          if(!raw) return null;
          var data = JSON.parse(raw);
          var currentFingerprint = checkoutSessionFingerprint();
          if(data && data.orderId && data.fingerprint && data.fingerprint === currentFingerprint) {
            return data.orderId;
          }
          // Context changed (different cart/product/shipping): do not reuse stale pending order.
          removeStorageValue(SESSION_ORDER_KEY);
          return null;
        } catch(e){ return null; }
      }

      function saveSessionOrderId(orderId){
        try {
          writeStorageValue(SESSION_ORDER_KEY, JSON.stringify({
            orderId: orderId,
            fingerprint: checkoutSessionFingerprint()
          }));
        } catch(e){}
      }

      if(resumeOrderIdParam && /^SS-[A-Z0-9\-]+$/i.test(resumeOrderIdParam)){
        saveSessionOrderId(resumeOrderIdParam);
      }

      // Keep manual payment order sync deterministic when switching tabs quickly.
      var manualOrderSync = {
        desiredMethod: '',
        inflight: false,
        lastSyncedMethod: '',
        lastSyncedKey: ''
      };

      function manualShippingFingerprint(){
        if(!savedShipping) return '';
        return [
          safeText(savedShipping.fullName),
          safeText(savedShipping.email),
          safeText(savedShipping.phone),
          safeText(savedShipping.addressLine1),
          safeText(savedShipping.addressLine2),
          safeText(savedShipping.postalCode),
          safeText(savedShipping.city),
          safeText(savedShipping.province),
          safeText(savedShipping.country),
          safeText(savedShipping.notes)
        ].join('|');
      }

      function buildManualSyncKey(method, amountText, meta, existingOrderId){
        var cartFingerprint = isCartMode
          ? cartItemsPayload.map(function(item){ return [item.sku, item.qty, item.price].join('|'); }).join('||')
          : '';
        return [
          method,
          amountText,
          appliedDiscountCode || '',
          existingOrderId || '',
          (meta && meta.sku) || sku || name || '',
          (meta && meta.colorKey) || colorKey || '',
          (meta && meta.colorLabel) || colorLabel || '',
          cartFingerprint,
          manualShippingFingerprint()
        ].join('::');
      }

      function flushManualOrderSync(){
        if(manualOrderSync.inflight) return;
        if(manualOrderSync.desiredMethod !== 'bizum' && manualOrderSync.desiredMethod !== 'bank') return;
        if(!priceNum) return;

        var method = manualOrderSync.desiredMethod;

        manualOrderSync.inflight = true;

        resolveCheckoutMeta().then(function(meta){
          var existingOrderId = getSessionOrderId();
          var adjustedPrice = getAdjustedPrice(method);
          if(!Number.isFinite(adjustedPrice) || adjustedPrice <= 0) adjustedPrice = priceNum;
          var amountText = adjustedPrice.toFixed(2);
          var syncKey = buildManualSyncKey(method, amountText, meta, existingOrderId);

          if(syncKey === manualOrderSync.lastSyncedKey){
            manualOrderSync.lastSyncedMethod = method;
            return;
          }

          return fetch(LOCAL_API_BASE + '/orders/manual-create', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: meta.name || name,
              sku: meta.sku || sku || name,
              price: amountText,
              currency: 'EUR',
              discount_code: appliedDiscountCode || undefined,
              frontend_base_amount: priceNum ? priceNum.toFixed(2) : undefined,
              shipping_amount: (currentPricingSnapshot && Number.isFinite(currentPricingSnapshot.shipping)) ? currentPricingSnapshot.shipping.toFixed(2) : '0.00',
              cart_items: isCartMode ? cartItemsForRequest() : undefined,
              ref: ref,
              productUrl: meta.productUrl || productUrl || undefined,
              productImageUrl: meta.productImage || productImage || undefined,
              productColor: meta.colorKey || colorKey || undefined,
              productAttrs: singleAttrs() || undefined,
              productVariantText: singleVariantText() || undefined,
              productColorLabel: meta.colorLabel || colorLabel || undefined,
              paymentMethod: method,
              shipping: savedShipping || undefined,
              existingOrderId: existingOrderId || undefined
            })
          }).then(function(res){
            return res.json().catch(function(){ return {}; }).then(function(data){
              if(res.ok && data && data.ok && data.orderId){
                saveSessionOrderId(data.orderId);
                manualOrderSync.lastSyncedMethod = method;
                manualOrderSync.lastSyncedKey = buildManualSyncKey(method, amountText, meta, data.orderId);
              }
            });
          });
        }).catch(function(){
          // Silent: static manual instructions remain visible.
        }).finally(function(){
          manualOrderSync.inflight = false;
          if(manualOrderSync.desiredMethod && manualOrderSync.desiredMethod !== manualOrderSync.lastSyncedMethod){
            flushManualOrderSync();
          }
        });
      }

      function ensureManualOrder(method){
        if(method !== 'bizum' && method !== 'bank') return;
        if(!priceNum) return; // no valid price -> nothing to register
        manualOrderSync.desiredMethod = method;
        flushManualOrderSync();
      }

      function stripeUiFor(mode){
        if(mode === 'klarna'){
          return {
            loading: klarnaLoading,
            info: klarnaInfo,
            mount: klarnaMount,
            mountSelector: '#stripe-klarna-checkout',
            errorId: 'klarnaErr',
            label: 'Klarna'
          };
        }
        if(mode === 'scalapay'){
          return {
            loading: scalapayLoading,
            info: scalapayInfo,
            mount: scalapayMount,
            mountSelector: '#stripe-scalapay-checkout',
            errorId: 'scalapayErr',
            label: 'Scalapay'
          };
        }
        if(mode === 'paypal'){
          return {
            loading: paypalLoading,
            info: paypalInfo,
            mount: paypalMount,
            mountSelector: '#stripe-paypal-checkout',
            errorId: 'paypalErr',
            label: 'PayPal'
          };
        }
        return {
          loading: stripeLoading,
          info: stripeInfo,
          mount: stripeMount,
          mountSelector: '#stripe-embedded-checkout',
          errorId: 'cardErr',
          label: 'Stripe'
        };
      }

      function setStripeLoading(mode, message, keepVisible){
        var ui = stripeUiFor(mode);
        if(!ui.loading) return;
        var label = ui.loading.querySelector('[data-loading-label]');
        var sr = ui.loading.querySelector('[data-loading-sr]');
        if(label) label.textContent = message || ui.label;
        if(sr) sr.textContent = mode === 'klarna'
          ? 'Cargando checkout de Klarna'
          : (mode === 'paypal' ? 'Cargando checkout de PayPal' : 'Cargando checkout de Stripe');
        ui.loading.hidden = !keepVisible;
      }

      function buildStripeDoneUrl(orderId, token){
        var doneUrl = '/pedido/?order=' + encodeURIComponent(orderId || '');
        doneUrl += '&status=' + encodeURIComponent('paid');
        // Token de acceso al pedido: imprescindible para que un invitado (sin sesión)
        // pueda ver su pedido recién pagado. Sin él, /pedido muestra "caducado".
        var t = safeText(token) || safeText(getParam('t')) || safeText(getParam('token'));
        if (t) doneUrl += '&t=' + encodeURIComponent(t);
        doneUrl += '&method=' + encodeURIComponent('stripe');
        doneUrl += '&name=' + encodeURIComponent(name || 'Producto SCOOT SHOP');
        doneUrl += '&amount=' + encodeURIComponent(priceNum ? priceNum.toFixed(2) : '');
        doneUrl += '&currency=' + encodeURIComponent('EUR');
        return doneUrl;
      }

      function loadStripeConfig(){
        if(stripeConfigPromise) return stripeConfigPromise;

        stripeConfigPromise = fetch(LOCAL_API_BASE + '/stripe/config', { headers:{ 'Accept':'application/json' } })
          .then(function(res){
            return res.json().catch(function(){ return {}; }).then(function(data){
              if(!res.ok || !data.publishableKey){
                throw new Error('Stripe no está configurado correctamente en el servidor.');
              }
              return data.publishableKey;
            });
          });

        return stripeConfigPromise;
      }

      function resolveReturnedStripeSession(){
        var sessionId = safeText(getParam('session_id'));
        var orderId = safeText(getParam('order'));
        var returnedMethod = safeText(getParam('method')).toLowerCase();
        var errorTarget = returnedMethod === 'klarna' ? 'klarnaErr'
          : (returnedMethod === 'paypal' ? 'paypalErr'
          : (returnedMethod === 'scalapay' ? 'scalapayErr' : 'cardErr'));
        if(!sessionId) return Promise.resolve(false);

        return fetch(LOCAL_API_BASE + '/stripe/session-status?session_id=' + encodeURIComponent(sessionId), {
          headers:{ 'Accept':'application/json' }
        }).then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(data){
            if(!res.ok || !data.ok) return false;

            if(data.status === 'complete' || data.payment_status === 'paid'){
              // Clear session order on successful payment
              removeStorageValue(SESSION_ORDER_KEY);
              try { sessionStorage.removeItem('ss_checkout_shipping'); localStorage.removeItem('ss_checkout_shipping'); } catch(e){}
              location.href = buildStripeDoneUrl(data.orderId || orderId, data.token);
              return true;
            }

            showErr(errorTarget, data.failureMessage || 'El pago con Stripe no se completo. Puedes intentarlo de nuevo desde esta misma seccion.');
            if(window.history && typeof window.history.replaceState === 'function'){
              var cleanUrl = new URL(location.href);
              cleanUrl.searchParams.delete('session_id');
              window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
            }
            return false;
          });
        }).catch(function(){
          return false;
        });
      }

      function setActiveTab(key){
        var hasSelection = !!(key && panels[key]);
        var titleMap = {
          card: 'Pagar online',
          klarna: 'Pagar con Klarna',
          scalapay: 'Pagar con Scalapay',
          paypal: 'Pagar con PayPal',
          bizum: 'Pagar con Bizum',
          bank: 'Pagar por transferencia'
        };

        tabs.forEach(function(t){
          var k = t.getAttribute('data-pay-tab');
          var on = hasSelection && (k === key);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });

        if(methodEmpty) methodEmpty.hidden = hasSelection;
        if(payTitle) payTitle.textContent = hasSelection ? (titleMap[key] || 'Pagar') : 'Pagar';

        Object.keys(panels).forEach(function(k){
          if(panels[k]) panels[k].hidden = !hasSelection || (k !== key);
        });

        // Update surcharge in summary
        updateSummaryFee(hasSelection ? key : '');

        if(!hasSelection) return;
        if(key === 'card'){ ensureCardButtons(); }
        if(key === 'klarna'){ ensureKlarnaButtons(); }
        if(key === 'scalapay'){ ensureScalapayButtons(); }
        if(key === 'paypal'){ ensurePaypalButtons(); }
        if(key === 'bizum' || key === 'bank'){ ensureManualOrder(key); }
      }

      tabs.forEach(function(t){
        t.addEventListener('click', function(){
          setActiveTab(t.getAttribute('data-pay-tab'));
          if(methodDetailCard && typeof methodDetailCard.scrollIntoView === 'function'){
            methodDetailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        t.addEventListener('keydown', function(e){
          if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          var idx = tabs.indexOf(t);
          var next = (e.key === 'ArrowRight') ? idx + 1 : idx - 1;
          if(next < 0) next = tabs.length - 1;
          if(next >= tabs.length) next = 0;
          tabs[next].focus();
          tabs[next].click();
        });
      });

      // Esperar a que el SDK de Stripe (async) está disponible
      var stripeSdkReady = null;
      function waitForStripeSdk(){
        if(stripeSdkReady) return stripeSdkReady;
        if(window.Stripe) { stripeSdkReady = Promise.resolve(); return stripeSdkReady; }

        stripeSdkReady = new Promise(function(resolve, reject){
          var script = document.getElementById('stripe-js');
          if(!script){ reject(new Error('No se encontró el script de Stripe.')); return; }

          // If the script already finished loading (load/error already fired before we listen)
          // Check for readyState or the presence of window.Stripe after a microtask
          function checkAlreadyDone(){
            if(window.Stripe){ resolve(); return true; }
            // HTMLScriptElement doesn't always have readyState, but if load event already fired
            // and Stripe is still not set, the script failed or hasn't executed yet
            return false;
          }

          if(checkAlreadyDone()) return;

          var settled = false;
          function onLoad(){ if(!settled){ settled = true; resolve(); } }
          function onError(){ if(!settled){ settled = true; reject(new Error('No se pudo cargar el SDK de Stripe.')); } }

          script.addEventListener('load', onLoad, { once: true });
          script.addEventListener('error', onError, { once: true });

          // Fallback: if neither event fires within 15s, check and reject
          setTimeout(function(){
            if(settled) return;
            if(window.Stripe){ onLoad(); }
            else { onError(); }
          }, 15000);

          // Quick recheck after a microtask in case the script loaded between our check and adding listeners
          Promise.resolve().then(function(){ if(!settled && window.Stripe) onLoad(); });
        });
        return stripeSdkReady;
      }

      // ? STRIPE embebido
      function ensureCardButtons(){
        return ensureStripeButtons('card');
      }

      function ensureKlarnaButtons(){
        clearErr('klarnaErr');
        if(klarnaWrap) klarnaWrap.hidden = false;
        if(klarnaInfo){
          klarnaInfo.textContent = 'Financiación sujeta a aprobación.';
        }
        return ensureStripeButtons('klarna');
      }

      function ensureScalapayButtons(){
        clearErr('scalapayErr');
        if(scalapayWrap) scalapayWrap.hidden = false;
        if(scalapayInfo){
          scalapayInfo.textContent = 'Paga en 3 plazos sin intereses. Sujeto a aprobación de Scalapay.';
        }
        return ensureStripeButtons('scalapay');
      }

      // ── Checkout HOSTED para métodos por redirección (Klarna / PayPal) ──────────
      // El checkout embebido corre dentro de un iframe; cuando Klarna/PayPal exigen
      // redirección, el iframe no logra romper hacia la ventana superior en navegadores
      // in-app (Instagram, Gmail, app de Google…) y el pago queda colgado en
      // `requires_action` sin completarse. El flujo hosted redirige la página entera a
      // checkout.stripe.com, que gestiona la ida y vuelta de forma fiable.
      function startHostedStripeCheckout(mode, btn, originalLabel){
        var ui = stripeUiFor(mode);
        resolveCheckoutMeta().then(function(meta){
          var existingOrderId = getSessionOrderId();
          var adjustedPrice = getAdjustedPrice(mode);
          return fetch(LOCAL_API_BASE + '/stripe/checkout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: meta.name || name,
              sku: meta.sku || sku || name,
              price: adjustedPrice.toFixed(2),
              currency: 'EUR',
              discount_code: appliedDiscountCode || undefined,
              frontend_base_amount: priceNum ? priceNum.toFixed(2) : undefined,
              shipping_amount: (currentPricingSnapshot && Number.isFinite(currentPricingSnapshot.shipping)) ? currentPricingSnapshot.shipping.toFixed(2) : '0.00',
              cart_items: isCartMode ? cartItemsForRequest() : undefined,
              ref: ref,
              productUrl: meta.productUrl || productUrl || undefined,
              productImageUrl: meta.productImage || productImage || undefined,
              productColor: meta.colorKey || colorKey || undefined,
              productAttrs: singleAttrs() || undefined,
              productVariantText: singleVariantText() || undefined,
              productColorLabel: meta.colorLabel || colorLabel || undefined,
              checkoutPath: buildStripeReturnPath(mode),
              paymentMethodMode: mode,
              paymentUiMode: 'hosted',
              shipping: savedShipping || undefined,
              existingOrderId: existingOrderId || undefined
            })
          }).then(function(res){
            return res.json().catch(function(){ return {}; }).then(function(data){
              if(!res.ok || !data.checkoutUrl){
                var unavailableMsg = {
                  klarna: 'Klarna no está disponible para este importe o comprador. Prueba con Pago online o PayPal.',
                  paypal: 'PayPal no está disponible ahora mismo en Stripe. Prueba con Pago online o Klarna.',
                  scalapay: 'Scalapay no está disponible para este importe o comprador. Prueba con Pago online.'
                };
                throw new Error(unavailableMsg[mode] || 'Este método no está disponible ahora mismo. Prueba con Pago online.');
              }
              if(data.orderId) saveSessionOrderId(data.orderId);
              // Redirección de página completa a la pasarela hosted de Stripe.
              window.location.assign(data.checkoutUrl);
            });
          });
        }).catch(function(err){
          console.error(err);
          if(btn){
            btn.disabled = false;
            var lblEl = btn.querySelector('.btn-hosted-label');
            if(lblEl) lblEl.textContent = originalLabel; else btn.textContent = originalLabel;
          }
          showErr(ui.errorId, err && err.message ? err.message : 'No se pudo iniciar el pago.');
        });
      }

      function renderHostedCheckoutButton(mode){
        var ui = stripeUiFor(mode);

        if(!priceNum){
          showErr(ui.errorId, 'Precio inválido. Vuelve al producto e inténtalo de nuevo.');
          return;
        }
        if(!ui.mount){
          showErr(ui.errorId, mode === 'klarna' ? 'No se pudo cargar Klarna en esta página.' : 'No se pudo cargar PayPal en esta página.');
          return;
        }

        clearErr('cardErr');
        clearErr('klarnaErr');
        clearErr('paypalErr');
        setStripeLoading(mode, '', false);

        // Limpia cualquier checkout embebido previo (p. ej. al venir de la pestaña tarjeta).
        if(stripeCheckout && typeof stripeCheckout.destroy === 'function'){
          try { stripeCheckout.destroy(); } catch(e) {}
          stripeCheckout = null;
        }
        stripeInitPromise = null;
        stripeCurrentMode = mode;
        if(stripeMount) stripeMount.innerHTML = '';
        if(klarnaMount && mode !== 'klarna') klarnaMount.innerHTML = '';
        if(paypalMount && mode !== 'paypal') paypalMount.innerHTML = '';

        var labelMap = { klarna: 'Continuar con Klarna', paypal: 'Continuar con PayPal', scalapay: 'Continuar con Scalapay' };
        var logoMap = { klarna: '/img/pago/klarna.webp', paypal: '/img/pago/paypal-svgrepo-com.svg', scalapay: '/img/pago/scalapay.svg' };
        var label = labelMap[mode] || 'Continuar con el pago';
        var logoSrc = logoMap[mode] || '';

        ui.mount.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'hosted-checkout';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-hosted-pay btn-hosted-pay--' + mode;

        if(logoSrc){
          var logo = document.createElement('img');
          logo.className = 'btn-hosted-logo';
          logo.src = logoSrc;
          logo.alt = '';
          logo.setAttribute('aria-hidden', 'true');
          logo.loading = 'lazy';
          logo.decoding = 'async';
          btn.appendChild(logo);
        }

        var lbl = document.createElement('span');
        lbl.className = 'btn-hosted-label';
        lbl.textContent = label;

        btn.appendChild(lbl);
        btn.addEventListener('click', function(){
          if(btn.disabled) return;
          btn.disabled = true;
          lbl.textContent = 'Redirigiendo…';
          startHostedStripeCheckout(mode, btn, label);
        });

        wrap.appendChild(btn);

        ui.mount.appendChild(wrap);
        // El flujo hosted solo monta un botón: libera el min-height reservado
        // para el checkout embebido para que no quede un hueco vacío enorme.
        ui.mount.classList.add('mount--hosted');

        if(ui.info){
          ui.info.textContent = mode === 'klarna'
            ? 'Paga a plazos con Klarna. Te llevaremos a la pasarela segura de Stripe para completar el pago.'
            : 'Te llevaremos a la pasarela segura de Stripe para completar el pago con PayPal.';
        }
      }

      function ensureStripeButtons(mode){
        var ui = stripeUiFor(mode);

        if(stripeInitPromise && stripeCurrentMode === mode) return;

        if(!priceNum){
          showErr(ui.errorId, 'Precio inválido. Vuelve al producto e inténtalo de nuevo.');
          return;
        }

        if(!ui.mount){
          showErr(ui.errorId, mode === 'klarna' ? 'No se pudo cargar Klarna en esta página.' : 'No se pudo cargar Stripe en esta página.');
          return;
        }

        if(IS_LOCAL_DEV){
          clearErr('cardErr');
          clearErr('klarnaErr');
          clearErr('paypalErr');
          setStripeLoading(mode, '', false);
          if(ui.mount){
            ui.mount.innerHTML = '';
            var box = document.createElement('div');
            box.className = 'method-empty';

            var title = document.createElement('strong');
            title.textContent = mode === 'klarna'
              ? 'Modo local: simulador Klarna'
              : (mode === 'paypal' ? 'Modo local: simulador PayPal' : 'Modo local: simulador Stripe');

            var copy = document.createElement('p');
            copy.textContent = 'Aquí no se procesa cobro real. Puedes completar el flujo con un pago simulado para pruebas visuales y funcionales.';

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-back';
            btn.style.marginTop = '6px';
            btn.textContent = 'Simular pago completado';
            btn.addEventListener('click', function(){
              removeStorageValue(SESSION_ORDER_KEY);
              try { sessionStorage.removeItem('ss_checkout_shipping'); localStorage.removeItem('ss_checkout_shipping'); } catch(e){}
              var doneUrl = '/pedido/?order=' + encodeURIComponent(ref || 'LOCAL')
                + '&status=' + encodeURIComponent('paid')
                + '&method=' + encodeURIComponent(mode)
                + '&name=' + encodeURIComponent(name || 'Producto SCOOT SHOP')
                + '&amount=' + encodeURIComponent((getAdjustedPrice(mode) || priceNum || 0).toFixed ? (getAdjustedPrice(mode) || priceNum || 0).toFixed(2) : String(priceLabel))
                + '&currency=EUR';
              location.href = doneUrl;
            });

            box.appendChild(title);
            box.appendChild(copy);
            box.appendChild(btn);
            ui.mount.appendChild(box);
          }
          if(ui.info){
            ui.info.textContent = 'Modo local activo: simulación sin cobro real.';
          }
          return;
        }

        // Klarna / PayPal → checkout HOSTED (página completa). El embebido (iframe) no
        // completa la redirección de estos métodos en navegadores in-app. Tarjeta sigue
        // embebida porque no necesita salir de la página.
        if(mode === 'klarna' || mode === 'paypal' || mode === 'scalapay'){
          renderHostedCheckoutButton(mode);
          return;
        }

        clearErr('cardErr');
        clearErr('klarnaErr');
        clearErr('paypalErr');

        if(stripeCheckout && typeof stripeCheckout.destroy === 'function'){
          try { stripeCheckout.destroy(); } catch(e) {}
        }
        if(stripeMount) stripeMount.innerHTML = '';
        if(klarnaMount) klarnaMount.innerHTML = '';
        if(paypalMount) paypalMount.innerHTML = '';

        stripeCurrentMode = mode;
        setStripeLoading(mode, ui.label, true);

        stripeInitPromise = Promise.all([
          waitForStripeSdk(),
          loadStripeConfig(),
          resolveCheckoutMeta()
        ]).then(function(values){
          var publishableKey = values[1];
          var meta = values[2];

          if(!stripeInstance){
            stripeInstance = window.Stripe(publishableKey);
          }

          return stripeInstance.initEmbeddedCheckout({
            fetchClientSecret: function(){
              var existingOrderId = getSessionOrderId();
              var adjustedPrice = getAdjustedPrice(mode);
              return fetch(LOCAL_API_BASE + '/stripe/checkout', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: meta.name || name,
                  sku: meta.sku || sku || name,
                  price: adjustedPrice.toFixed(2),
                  currency: 'EUR',
                  discount_code: appliedDiscountCode || undefined,
                  frontend_base_amount: priceNum ? priceNum.toFixed(2) : undefined,
                  shipping_amount: (currentPricingSnapshot && Number.isFinite(currentPricingSnapshot.shipping)) ? currentPricingSnapshot.shipping.toFixed(2) : '0.00',
                  cart_items: isCartMode ? cartItemsForRequest() : undefined,
                  ref: ref,
                  productUrl: meta.productUrl || productUrl || undefined,
                  productImageUrl: meta.productImage || productImage || undefined,
                  productColor: meta.colorKey || colorKey || undefined,
                  productAttrs: singleAttrs() || undefined,
                  productVariantText: singleVariantText() || undefined,
                  productColorLabel: meta.colorLabel || colorLabel || undefined,
                  checkoutPath: buildStripeReturnPath(mode === 'klarna' ? 'klarna' : (mode === 'paypal' ? 'paypal' : (mode === 'scalapay' ? 'scalapay' : 'card'))),
                  paymentMethodMode: mode === 'klarna' ? 'klarna' : (mode === 'paypal' ? 'paypal' : (mode === 'scalapay' ? 'scalapay' : 'dynamic')),
                  shipping: savedShipping || undefined,
                  existingOrderId: existingOrderId || undefined
                })
              }).then(function(res){
                return res.json().catch(function(){ return {}; }).then(function(data){
                  if(!res.ok || !data.clientSecret){
                    throw new Error(mode === 'klarna'
                      ? 'Klarna no está disponible para este importe o comprador. Prueba con Pago online o PayPal.'
                      : (mode === 'paypal'
                        ? 'PayPal no está disponible ahora mismo en Stripe. Prueba con Pago online o Klarna.'
                        : (data && data.error === 'stripe_not_configured'
                          ? 'Stripe no está disponible ahora mismo.'
                          : 'No se pudo iniciar el checkout de Stripe.')));
                  }

                  // Save orderId so switching tabs reuses the same order
                  if(data.orderId) saveSessionOrderId(data.orderId);

                  stripeSessionMeta = {
                    orderId: data.orderId || '',
                    sessionId: data.sessionId || '',
                    name: meta.name || name || 'Producto SCOOT SHOP'
                  };

                  return data.clientSecret;
                });
              });
            },
            onComplete: function(){
              if(stripeCheckout && typeof stripeCheckout.destroy === 'function'){
                stripeCheckout.destroy();
              }
              // Clear session order on successful payment
              removeStorageValue(SESSION_ORDER_KEY);
              try { sessionStorage.removeItem('ss_checkout_shipping'); localStorage.removeItem('ss_checkout_shipping'); } catch(e){}
              var doneUrl = buildStripeDoneUrl(stripeSessionMeta && stripeSessionMeta.orderId ? stripeSessionMeta.orderId : '');
              var sid = stripeSessionMeta && stripeSessionMeta.sessionId;
              if(sid){
                fetch(LOCAL_API_BASE + '/stripe/session-status?session_id=' + encodeURIComponent(sid), { headers:{ 'Accept':'application/json' } })
                  .catch(function(){})
                  .then(function(){ location.href = doneUrl; });
              } else {
                location.href = doneUrl;
              }
            }
          });
        }).then(function(checkout){
          stripeCheckout = checkout;
          stripeCheckout.mount(ui.mountSelector);
          setStripeLoading(mode, '', false);
          if(ui.info){
            // La pestaña de tarjeta no lleva nota: los métodos ya se ven en la lista.
            var infoText = mode === 'klarna'
              ? 'Financiación sujeta a aprobación.'
              : (mode === 'paypal' ? 'Pago seguro con PayPal a través de Stripe.' : '');
            ui.info.textContent = infoText;
            ui.info.hidden = !infoText;
          }
        }).catch(function(err){
          console.error(err);
          setStripeLoading(mode, '', false);
          showErr(ui.errorId, err && err.message ? err.message : (mode === 'klarna' ? 'No se pudo preparar Klarna.' : (mode === 'paypal' ? 'No se pudo preparar PayPal en Stripe.' : 'No se pudo cargar el checkout de Stripe.')));
          stripeInitPromise = null;
          stripeSdkReady = null;
        });
      }

      function reloadStripeCheckout(mode){
        stripeInitPromise = null;
        ensureStripeButtons(mode);
      }

      // Default: Stripe (o método solicitado por URL)
      var methodFromUrl = safeText(getParam('method')).toLowerCase();
      var hasSessionReturn = !!safeText(getParam('session_id'));
      var defaultMethod = 'card';
      if(hasSessionReturn || getParam('cancelled') === '1'){
        defaultMethod = (methodFromUrl === 'klarna' || methodFromUrl === 'paypal' || methodFromUrl === 'scalapay') ? methodFromUrl : 'card';
      } else if(methodFromUrl === 'paypal' || methodFromUrl === 'card' || methodFromUrl === 'klarna' || methodFromUrl === 'scalapay' || methodFromUrl === 'bizum' || methodFromUrl === 'bank'){
        defaultMethod = methodFromUrl;
      }

      if(hasSessionReturn){
        // Esperar a verificar la sesión antes de mostrar tabs (evita flash del checkout embebido)
        resolveReturnedStripeSession().then(function(redirected){
          if(!redirected) setActiveTab(defaultMethod);
        });
      } else {
        setActiveTab(defaultMethod);
      }

      if(getParam('cancelled') === '1'){
        showErr(methodFromUrl === 'klarna' ? 'klarnaErr' : (methodFromUrl === 'paypal' ? 'paypalErr' : (methodFromUrl === 'scalapay' ? 'scalapayErr' : 'cardErr')), 'Has cancelado el pago con Stripe. Puedes intentarlo de nuevo cuando quieras.');
      }
    })();
