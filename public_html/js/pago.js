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
      function loadCheckoutShipping(){
        try {
          var raw = readStorageValue('ss_checkout_shipping');
          return raw ? JSON.parse(raw) : null;
        } catch(e) {
          return null;
        }
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
              colorLabel: safeText(item && item.colorLabel)
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
          script.src = withAssetVersion('/data/products.js');
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
        var variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
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
            cartItems: cartItemsPayload
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

          if(sumColor && resolved.colorLabel){
            sumColor.textContent = 'Color: ' + resolved.colorLabel;
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
      var checkoutCompleted = getParam('checkout') === '1';
      var resumeOrderIdParam = safeText(getParam('order')) || safeText(getParam('existingOrderId')) || '';
      var isCartMode = getParam('cart') === '1';
      var cartItems = isCartMode ? loadCheckoutCart() : [];
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
          colorLabel: item.colorLabel || ''
        };
      });
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

      var priceLabel = priceNum ? (priceNum.toFixed(2) + ' €') : (priceRaw ? priceRaw : '€');

      // -- Comisiones Stripe por método de pago --
      // Fórmula inversa: total = (base + fixedFee) / (1 - pct)
      // Así Stripe cobra su % del total y a nosotros nos llegan los €base limpios.
      var PAYMENT_FEES = {
        card:    { pct: 0.009,  fixed: 0.15, label: 'Comisión pago online' },
        klarna:  { pct: 0.0359, fixed: 0.15, label: 'Comisión Klarna' },
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

      function fmtEur(value){
        var num = Number(value);
        if(!Number.isFinite(num)) return '—';
        return num.toFixed(2) + ' €';
      }

      function parseMoney(value){
        var num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
      }

      function localBreakdown(method){
        var base = Number.isFinite(priceNum) ? priceNum : 0;
        var surcharge = calcSurcharge(base, method);
        return {
          subtotal_amount: base.toFixed(2),
          discount_amount: '0.00',
          amount_after_discount: base.toFixed(2),
          payment_fee_amount: (surcharge.surcharge || 0).toFixed(2),
          shipping_amount: '0.00',
          total_amount: (surcharge.total || base).toFixed(2)
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
        var total = +(amountAfterDiscount + fee).toFixed(2);

        return {
          subtotal_amount: base.toFixed(2),
          discount_amount: discount.toFixed(2),
          amount_after_discount: amountAfterDiscount.toFixed(2),
          payment_fee_amount: fee.toFixed(2),
          shipping_amount: '0.00',
          total_amount: total.toFixed(2)
        };
      }

      function buildCartLinePricing(method){
        var lines = [];
        var subtotal = 0;
        var discountTotal = 0;
        var type = safeText(appliedDiscountMeta && appliedDiscountMeta.type).toLowerCase();
        var rawValue = Number(String((appliedDiscountMeta && appliedDiscountMeta.value) == null ? '' : appliedDiscountMeta.value).replace(',', '.'));
        var discountValue = Number.isFinite(rawValue) ? rawValue : 0;
        var appliesTo = safeText(appliedDiscountMeta && appliedDiscountMeta.appliesTo).toLowerCase();
        var targetSkus = Array.isArray(appliedDiscountMeta && appliedDiscountMeta.targetSkus)
          ? appliedDiscountMeta.targetSkus.map(function(s){ return safeText(s).toUpperCase(); }).filter(Boolean)
          : [];

        for (var i = 0; i < cartItems.length; i++) {
          var item = cartItems[i] || {};
          var qty = Number(item.qty) || 1;
          var unitPrice = Number(item.price) || 0;
          var lineBase = +(unitPrice * qty).toFixed(2);
          var skuKey = safeText(item.sku).toUpperCase();
          var eligible = false;

          if (appliedDiscountCode && appliedDiscountMeta) {
            if (!appliesTo || appliesTo === 'all') {
              eligible = true;
            } else if (appliesTo === 'selected_products') {
              eligible = targetSkus.length ? (targetSkus.indexOf(skuKey) > -1) : true;
            }
          }

          lines.push({
            base: lineBase,
            discounted: lineBase,
            discount: 0,
            eligible: eligible,
            qty: qty
          });
          subtotal += lineBase;
        }

        subtotal = +subtotal.toFixed(2);

        if (appliedDiscountCode && appliedDiscountMeta && discountValue > 0) {
          if (type === 'percent') {
            for (var p = 0; p < lines.length; p++) {
              if (!lines[p].eligible) continue;
              lines[p].discount = +(lines[p].base * (discountValue / 100)).toFixed(2);
              lines[p].discounted = +(Math.max(0, lines[p].base - lines[p].discount)).toFixed(2);
              discountTotal += lines[p].discount;
            }
          } else if (type === 'amount') {
            // selected_products/selected_categories: fixed amount is applied per unit on each eligible line.
            if (appliesTo === 'selected_products' || appliesTo === 'selected_categories') {
              for (var a = 0; a < lines.length; a++) {
                if (!lines[a].eligible) continue;
                var perLine = +(discountValue * (Number(lines[a].qty) || 1)).toFixed(2);
                var take = +Math.min(lines[a].base, perLine).toFixed(2);
                lines[a].discount = take;
                lines[a].discounted = +(Math.max(0, lines[a].base - take)).toFixed(2);
                discountTotal += take;
              }
            } else {
              var remaining = +discountValue.toFixed(2);
              for (var r = 0; r < lines.length; r++) {
                if (!lines[r].eligible || remaining <= 0) continue;
                var takeRemaining = +Math.min(lines[r].base, remaining).toFixed(2);
                lines[r].discount = takeRemaining;
                lines[r].discounted = +(Math.max(0, lines[r].base - takeRemaining)).toFixed(2);
                remaining = +(remaining - takeRemaining).toFixed(2);
                discountTotal += takeRemaining;
              }
            }
          }
        }

        discountTotal = +discountTotal.toFixed(2);
        var net = +(Math.max(0, subtotal - discountTotal)).toFixed(2);
        var surcharge = calcSurcharge(net, method);
        var fee = +(surcharge.surcharge || 0).toFixed(2);
        var total = +(net + fee).toFixed(2);

        return {
          lines: lines,
          breakdown: {
            subtotal_amount: subtotal.toFixed(2),
            discount_amount: discountTotal.toFixed(2),
            amount_after_discount: net.toFixed(2),
            payment_fee_amount: fee.toFixed(2),
            shipping_amount: '0.00',
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
          var line = pricing.lines[i] || { discounted: 0, discount: 0 };
          priceEls[i].textContent = line.discounted.toFixed(2) + ' €';
          priceEls[i].classList.toggle('is-discounted', line.discount > 0);
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
          saveDiscountInSession('');
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
            cart_items: isCartMode ? cartItemsPayload : []
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
        msg.classList.remove('is-ok', 'is-error');
        if(text && kind === 'ok') msg.classList.add('is-ok');
        if(text && kind === 'error') msg.classList.add('is-error');
      }

      function setDiscountButtonsLoading(isLoading){
        var applyBtn = document.getElementById('discountApplyBtn');
        var removeBtn = document.getElementById('discountRemoveBtn');
        var input = document.getElementById('discountCodeInput');
        if(applyBtn) applyBtn.disabled = !!isLoading;
        if(removeBtn) removeBtn.disabled = !!isLoading;
        if(input) input.disabled = !!isLoading;
      }

      function updateDiscountControls(){
        var input = document.getElementById('discountCodeInput');
        var removeBtn = document.getElementById('discountRemoveBtn');
        var inputValue = safeText(input && input.value);
        if(input && appliedDiscountCode && !safeText(input.value)) {
          input.value = appliedDiscountCode;
          inputValue = safeText(input.value);
        }
        if(removeBtn) {
          var canShowRemove = !!inputValue && (discountCodeState === 'valid' || discountCodeState === 'invalid');
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
          cart_items: isCartMode ? cartItemsPayload : []
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
          cart_items: isCartMode ? cartItemsPayload : []
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
      var securityBadge = document.getElementById('securityBadge');


      function buildCheckoutStepUrl(){
        try {
          var url = new URL('/checkout', location.origin);
          var params = new URLSearchParams(location.search || '');
          params.delete('session_id');
          params.delete('cancelled');
          params.delete('method');
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
      if(hasProduct && !checkoutCompleted && (!savedShipping || !savedShipping.fullName || !savedShipping.addressLine1 || !savedShipping.postalCode || !savedShipping.city)) {
        location.replace(buildCheckoutStepUrl());
      }
      if(!hasProduct){
        if(emptyState) emptyState.hidden = false;
        if(summaryCard) summaryCard.hidden = true;
        if(methodsCard) methodsCard.hidden = true;
        if(methodDetailCard) methodDetailCard.hidden = true;
        if(securityBadge) securityBadge.style.display = 'none';
      } else {
        if(sumName) sumName.textContent = name;
        if(sumSku && sku) {
          sumSku.textContent = isCartMode
            ? (cartItems.length + (cartItems.length === 1 ? ' producto en carrito' : ' productos en carrito'))
            : ('Ref: ' + sku);
        }
        if(sumColor && colorLabel) {
          sumColor.textContent = 'Color: ' + colorLabel;
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

            list.innerHTML = cartItems.map(function(item){
              var itemName = escapeHtml(item.name || 'Producto');
              var itemRef = item.sku ? ('<span class="order-summary__product-meta order-summary__product-meta--ref">Ref: ' + escapeHtml(item.sku) + '</span>') : '';
              var itemColorText = item.colorLabel || item.color || '';
              var itemColor = itemColorText ? ('<span class="order-summary__product-meta order-summary__product-meta--color">Color: ' + escapeHtml(itemColorText) + '</span>') : '';
              var itemQty = (Number(item.qty) > 1) ? ('<span class="order-summary__product-meta order-summary__product-meta--qty">Cant: ' + escapeHtml(item.qty) + '</span>') : '';
              var lineTotal = ((Number(item.price) || 0) * (Number(item.qty) || 1)).toFixed(2) + ' €';
              var itemImage = item.image
                ? ('<img class="order-summary__product-image" src="' + escapeHtml(item.image) + '" alt="' + itemName + '" loading="lazy" decoding="async" />')
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

        // Populate fee hints in tabs
        if(priceNum){
          var feeSpans = document.querySelectorAll('.tab-fee[data-fee-method]');
          for(var f = 0; f < feeSpans.length; f++){
            var fMethod = feeSpans[f].getAttribute('data-fee-method');
            var fResult = calcSurcharge(priceNum, fMethod);
            if(fResult.surcharge > 0){
              feeSpans[f].textContent = '+' + fResult.surcharge.toFixed(2) + ' €';
            } else {
              feeSpans[f].textContent = 'sin comisión';
            }
          }
        }

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
          setDiscountMessage('Código aplicado correctamente (modo local).', 'ok');
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
          setDiscountMessage(data.message || 'Código aplicado correctamente.', 'ok');
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
          }
          updateDiscountControls();
        });

        applyBtn.addEventListener('click', applyDiscountCode);
        removeBtn.addEventListener('click', clearDiscountCode);
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
        paypal: document.getElementById('panel-paypal'),
        bizum:  document.getElementById('panel-bizum'),
        bank:   document.getElementById('panel-bank')
      };
      var paypalLoading = document.getElementById('paypalLoading');

      function setPaypalLoading(message, keepVisible){
        if(!paypalLoading) return;
        var label = paypalLoading.querySelector('[data-loading-label]');
        var sr = paypalLoading.querySelector('[data-loading-sr]');
        if(label) label.textContent = message || 'PayPal';
        if(sr) sr.textContent = 'Cargando PayPal';
        paypalLoading.hidden = !keepVisible;
      }

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
              cart_items: isCartMode ? cartItemsPayload : undefined,
              ref: ref,
              productUrl: meta.productUrl || productUrl || undefined,
              productImageUrl: meta.productImage || productImage || undefined,
              productColor: meta.colorKey || colorKey || undefined,
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

      function buildStripeDoneUrl(orderId){
        var doneUrl = '/pedido/?order=' + encodeURIComponent(orderId || '');
        doneUrl += '&status=' + encodeURIComponent('paid');
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
        var errorTarget = returnedMethod === 'klarna'
          ? 'klarnaErr'
          : (returnedMethod === 'paypal' ? 'paypalErr' : 'cardErr');
        if(!sessionId) return Promise.resolve(false);

        return fetch(LOCAL_API_BASE + '/stripe/session-status?session_id=' + encodeURIComponent(sessionId), {
          headers:{ 'Accept':'application/json' }
        }).then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(data){
            if(!res.ok || !data.ok) return false;

            if(data.status === 'complete' || data.payment_status === 'paid'){
              // Clear session order on successful payment
              removeStorageValue(SESSION_ORDER_KEY);
              try { sessionStorage.removeItem('ss_checkout_shipping'); } catch(e){}
              location.href = buildStripeDoneUrl(data.orderId || orderId);
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
              try { sessionStorage.removeItem('ss_checkout_shipping'); } catch(e){}
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
                  cart_items: isCartMode ? cartItemsPayload : undefined,
                  ref: ref,
                  productUrl: meta.productUrl || productUrl || undefined,
                  productImageUrl: meta.productImage || productImage || undefined,
                  productColor: meta.colorKey || colorKey || undefined,
                  productColorLabel: meta.colorLabel || colorLabel || undefined,
                  checkoutPath: buildStripeReturnPath(mode === 'klarna' ? 'klarna' : (mode === 'paypal' ? 'paypal' : 'card')),
                  paymentMethodMode: mode === 'klarna' ? 'klarna' : (mode === 'paypal' ? 'paypal' : 'dynamic'),
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
              try { sessionStorage.removeItem('ss_checkout_shipping'); } catch(e){}
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
            ui.info.textContent = mode === 'klarna'
              ? 'Financiación sujeta a aprobación.'
              : (mode === 'paypal'
                ? 'Pago seguro con PayPal a través de Stripe.'
                : 'Tarjeta y métodos rápidos, sin Klarna ni PayPal.');
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
        defaultMethod = (methodFromUrl === 'klarna' || methodFromUrl === 'paypal') ? methodFromUrl : 'card';
      } else if(methodFromUrl === 'paypal' || methodFromUrl === 'card' || methodFromUrl === 'klarna' || methodFromUrl === 'bizum' || methodFromUrl === 'bank'){
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
        showErr(methodFromUrl === 'klarna' ? 'klarnaErr' : (methodFromUrl === 'paypal' ? 'paypalErr' : 'cardErr'), 'Has cancelado el pago con Stripe. Puedes intentarlo de nuevo cuando quieras.');
      }
    })();
