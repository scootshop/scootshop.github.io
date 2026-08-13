(function () {
  'use strict';

  var API_BASE = '/api/index.php?route=';
  var state = {
    config: null,
    user: null,
    orders: [],
    uiState: 'guest',
    googleReady: false,
    loginBusy: false,
    booted: false,
    eventsBound: false,
    observer: null,
    observerStarted: false,
    resumeBound: false,
    googleClientId: '',
    googleRenderAttempts: 0,
    googleRenderTimer: null,
  };
  var PREVIEW_ACTIVE = false;
  try {
    PREVIEW_ACTIVE = new URLSearchParams(window.location.search).get('preview_active') === '1';
  } catch (_) {
    PREVIEW_ACTIVE = false;
  }

  function $(id) { return document.getElementById(id); }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function closeMobileMenuIfOpen() {
    if (window.MM_closeMenu && typeof window.MM_closeMenu === 'function') {
      window.MM_closeMenu();
      return;
    }

    var burger = $('burger');
    if (burger && burger.getAttribute('aria-expanded') === 'true') {
      burger.click();
    }
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

  function renderGoogleTargets() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      return { total: 0, pending: 0 };
    }

    var targets = qsa('[data-google-login-target]');
    var pending = 0;
    targets.forEach(function (container) {
      if (!container) return;
      if (container.dataset.rendered === 'true') return;
      try {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          locale: 'es',
        });
        container.dataset.rendered = 'true';
      } catch (_) {
        pending += 1;
      }
    });

    if (targets.length > 0) {
      var missing = targets.filter(function (container) {
        return !container || container.dataset.rendered !== 'true';
      }).length;
      pending = Math.max(pending, missing);
    }

    return { total: targets.length, pending: pending };
  }

  function scheduleGoogleRenderRetry(clientId) {
    if (state.googleRenderAttempts >= 10) {
      return;
    }
    state.googleRenderAttempts += 1;
    if (state.googleRenderTimer) {
      clearTimeout(state.googleRenderTimer);
    }
    var delay = Math.min(300 + (state.googleRenderAttempts * 150), 1500);
    state.googleRenderTimer = setTimeout(function () {
      setupGoogleButtons(clientId);
    }, delay);
  }

  function resolveUiState(user) {
    return (user && user.email) ? 'logged_in' : 'guest';
  }

  function stateText(uiState, user) {
    if (uiState === 'logged_in' && user && user.email) return 'Comprando como ' + user.email;
    if (uiState === 'expired') return 'Sesión caducada. Puedes comprar como invitado.';
    return 'Puedes comprar como invitado.';
  }

  function stateLabel(uiState) {
    if (uiState === 'logged_in') return 'Sesión iniciada';
    if (uiState === 'expired') return 'Sesión caducada';
    return 'Invitado';
  }

  function setPanelMessage(text, kind) {
    qsa('[data-auth-message]').forEach(function (node) {
      node.className = 'account-quick-message' + (kind === 'error' ? ' is-error' : kind === 'success' ? ' is-success' : '');
      node.textContent = text || '';
      node.hidden = !text;
    });

    var checkoutNote = $('checkoutAuthState');
    if (checkoutNote && !checkoutNote.dataset.manualMessage) {
      checkoutNote.textContent = text || stateText(state.uiState, state.user);
    }
  }

  function ensureHeaderAccountIcon(btn) {
    if (!btn) return;
    if (btn.querySelector('.header-account-icon') && btn.querySelector('.header-account-dot') && btn.querySelector('.header-account-label')) return;
    var dot = btn.querySelector('.header-account-dot');
    var dotHtml = dot ? dot.outerHTML : '<span class="header-account-dot" id="headerAccountDot" hidden aria-hidden="true"></span>';
    btn.innerHTML = [
      '<svg class="header-account-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
      '  <path d="M12 12C14.4853 12 16.5 9.98528 16.5 7.5C16.5 5.01472 14.4853 3 12 3C9.51472 3 7.5 5.01472 7.5 7.5C7.5 9.98528 9.51472 12 12 12Z"></path>',
      '  <path d="M4.5 20.25C4.5 16.9363 7.18629 14.25 10.5 14.25H13.5C16.8137 14.25 19.5 16.9363 19.5 20.25"></path>',
      '</svg>',
      '<span class="header-account-label">Cuenta</span>'
    ].join('') + dotHtml;
  }

  /* Aquí había un renderAvatar(targetId, user) que no llamaba nadie: el avatar de la
     cuenta lo pinta el suyo propio en account.js. */

  function formatOrderStatus(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'paid') return 'Pagado';
    if (value === 'pending_payment') return 'Pendiente';
    if (value === 'processing') return 'En preparación';
    if (value === 'shipped') return 'Enviado';
    if (value === 'delivered') return 'Entregado';
    if (value === 'cancelled') return 'Cancelado';
    if (value === 'error') return 'Error';
    return status || 'Pedido';
  }

  function renderOrders() {
    var list = $('accountQuickOrders');
    var empty = $('accountQuickOrdersState');
    if (!list || !empty) return;

    if (!state.user) {
      list.innerHTML = '';
      empty.textContent = state.uiState === 'expired' ? 'Tu sesión anterior caducó. Vuelve a entrar para ver pedidos.' : 'Inicia sesión para ver tus pedidos recientes.';
      empty.hidden = false;
      return;
    }

    if (!state.orders.length) {
      list.innerHTML = '';
      empty.textContent = 'Todavía no hay pedidos vinculados a esta cuenta.';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.innerHTML = state.orders.slice(0, 3).map(function (order) {
      var link = '/pedido/?order=' + encodeURIComponent(String(order.id || ''));
      return [
        '<a class="account-quick-order" href="' + esc(link) + '">',
        '  <span class="account-quick-order-top">',
        '    <strong>' + esc(order.product || order.name || 'Pedido') + '</strong>',
        '    <span>' + esc(formatOrderStatus(order.status)) + '</span>',
        '  </span>',
        '  <span class="account-quick-order-bottom">',
        '    <span>' + esc(order.id || '') + '</span>',
        '    <strong>' + esc(formatMoney(order.total_amount || order.amount, order.currency)) + '</strong>',
        '  </span>',
        '</a>',
      ].join('');
    }).join('');
  }

  function renderDesktopPanel() {
    var btn = $('headerAccountToggle');
    var dot = $('headerAccountDot');

    if (btn) {
      ensureHeaderAccountIcon(btn);
      btn.setAttribute('aria-label', stateText(state.uiState, state.user));
      btn.dataset.authState = state.uiState;
      btn.setAttribute('aria-expanded', 'false');
    }

    if (dot) {
      dot.hidden = false;
      dot.className = 'header-account-dot header-account-dot--' + state.uiState;
    }
  }

  function renderCheckoutState() {
    var el = $('checkoutAuthState');
    if (!el) return;
    el.className = 'ck-auth-state ck-auth-state--' + state.uiState;
    el.textContent = stateText(state.uiState, state.user);
  }

  function renderAccountPageState() {
    if (PREVIEW_ACTIVE) return;
    if (document.body && document.body.classList && document.body.classList.contains('account-page')) return;
    var el = $('accountSessionState');
    if (!el) return;
    el.className = 'account-session-state account-session-state--' + state.uiState;
    el.textContent = stateLabel(state.uiState);
  }

  function renderAll() {
    renderDesktopPanel();
    renderCheckoutState();
    renderAccountPageState();
  }

  function loadOrders() {
    if (!state.user) {
      state.orders = [];
      renderOrders();
      return Promise.resolve([]);
    }

    return apiFetch('account_orders', { method: 'GET' }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) {
        state.orders = [];
        renderOrders();
        return [];
      }
      state.user = res.data.user || state.user;
      state.orders = Array.isArray(res.data.orders) ? res.data.orders : [];
      renderAll();
      return state.orders;
    }).catch(function () {
      state.orders = [];
      renderOrders();
      return [];
    });
  }

  function onCredential(response) {
    if (!response || !response.credential) {
      setPanelMessage('No se pudo obtener el token de Google.', 'error');
      return;
    }
    state.loginBusy = true;
    setPanelMessage('Verificando tu sesión de Google...', '');

    apiFetch('auth_google_login', {
      method: 'POST',
      body: JSON.stringify({ id_token: response.credential }),
    }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error((res.data && (res.data.error || res.data.detail)) || 'google_login_failed');
      }
      state.user = res.data.user || null;
      state.uiState = resolveUiState(state.user);
      // La sesion acaba de cambiar: lo cacheado ya no vale.
      invalidateStatus();
      statusResolvedOnce = true;
      renderAll();
      setPanelMessage('Sesión iniciada correctamente.', 'success');
      return loadOrders();
    }).catch(function (err) {
      var message = 'No se pudo iniciar sesión con Google.';
      if (err && err.message === 'google_not_configured') {
        message = 'Google Login no está disponible en este entorno.';
      }
      invalidateStatus();
      state.user = null;
      state.uiState = 'guest';
      setPanelMessage(message, 'error');
      renderAll();
    }).finally(function () {
      state.loginBusy = false;
    });
  }

  function setupGoogleButtons(clientId) {
    // No cargar la libreria GSI de Google (~89 KB) si no hay ningun boton de
    // login que pintar. El header solo enlaza a /cuenta (que usa account.js),
    // asi que en fichas / home / checkout no existe ningun
    // [data-google-login-target] y GSI seria peso muerto. Si en el futuro se
    // añade un target, esta funcion se vuelve a llamar (boot / render) y carga.
    if (!document.querySelector('[data-google-login-target]')) {
      return;
    }

    var normalizedClientId = String(clientId || '').trim();
    var host = String((window.location && window.location.hostname) || '').toLowerCase();
    var isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (isLocalHost) {
      setPanelMessage('Google Login se habilita solo en dominio público autorizado. En local puedes comprar como invitado.', '');
      qsa('[data-google-login-target]').forEach(function (container) {
        if (!container) return;
        container.innerHTML = '';
        container.dataset.rendered = 'false';
      });
      state.googleReady = false;
      return;
    }

    if (state.googleClientId !== normalizedClientId) {
      state.googleClientId = normalizedClientId;
      state.googleRenderAttempts = 0;
      if (state.googleRenderTimer) {
        clearTimeout(state.googleRenderTimer);
        state.googleRenderTimer = null;
      }
    }

    var validClientId = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(normalizedClientId);
    if (!validClientId) {
      setPanelMessage('Google Login no está configurado. Puedes seguir comprando como invitado.', 'error');
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
          callback: onCredential,
          cancel_on_tap_outside: true,
          auto_select: false,
        });
        window.SS_GOOGLE_GSI_STATE = {
          clientId: normalizedClientId,
          owner: 'auth-ui'
        };
      }

      var renderState = renderGoogleTargets();
      state.googleReady = renderState.total > 0 && renderState.pending === 0;

      if (!state.googleReady) {
        scheduleGoogleRenderRetry(normalizedClientId);
      }

      if (!state.user) {
        setPanelMessage('', '');
      }
    }).catch(function (err) {
      var reason = err && err.message ? String(err.message) : 'unknown';
      if ((reason === 'google_gsi_unavailable' || reason === 'script_load_failed') && state.googleRenderAttempts < 10) {
        scheduleGoogleRenderRetry(normalizedClientId);
        return;
      }
      setPanelMessage('No se pudo cargar el botón de Google.', 'error');
    });
  }

  function openPanel() {
    closeMobileMenuIfOpen();
    window.location.href = '/cuenta/';
    return true;
  }

  function closePanel() {
    return false;
  }

  function bindEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('#headerAccountToggle,[data-account-open]') : null;
      if (!target) return;
      event.preventDefault();
      openPanel();
    }, true);

    // Delegated click handlers above cover both static and dynamically injected targets.

  }

  // Fuente unica del estado de sesion.
  // En una carga normal auth_status se pedia DOS veces con la misma URL y las
  // mismas credenciales: boot() lo llama tras auth_config, y `pageshow` —que
  // tambien se dispara en la carga inicial, no solo al volver desde bfcache—
  // disparaba refreshOnResume() con una segunda llamada identica.
  // Mientras hay una peticion en vuelo (o acaba de resolverse) se comparte la
  // MISMA promesa, asi que todos los que la esperan reciben el mismo resultado.
  // La ventana es corta a proposito: no queremos cachear la sesion, solo fundir
  // las llamadas que ocurren a la vez.
  var statusCache = { promise: null, at: 0 };
  var STATUS_DEDUPE_MS = 3000;
  var statusResolvedOnce = false;

  function invalidateStatus() {
    statusCache.promise = null;
    statusCache.at = 0;
  }

  // auth_config es configuracion estatica (client id de Google): no cambia en la
  // vida de la pagina. En las fichas el header se inyecta tarde y
  // SS_AUTH_UI.refresh() re-arranca el modulo, con lo que boot() volvia a
  // pedirla: 2 veces en ficha, y una mas por cada refresh posterior.
  // Cacheamos la PETICION, no sus efectos: el .then de boot() se sigue
  // ejecutando en cada arranque para volver a montar los botones de Google
  // sobre el DOM nuevo.
  var configPromise = null;

  function fetchConfig() {
    if (!configPromise) {
      configPromise = apiFetch('auth_config', { method: 'GET' }).catch(function (err) {
        // Un fallo no debe quedar cacheado para siempre: el siguiente arranque
        // lo reintenta.
        configPromise = null;
        throw err;
      });
    }
    return configPromise;
  }

  function loadStatus(options) {
    var force = !!(options && options.force);
    if (!force && statusCache.promise && (Date.now() - statusCache.at) < STATUS_DEDUPE_MS) {
      return statusCache.promise;
    }

    statusCache.at = Date.now();
    statusCache.promise = apiFetch('auth_status', { method: 'GET' }).then(function (res) {
      if (!res.ok || !res.data || !res.data.ok) {
        state.user = null;
        state.uiState = 'guest';
      } else {
        state.user = res.data.user || null;
        state.uiState = resolveUiState(state.user);
      }
      statusResolvedOnce = true;
      renderAll();
      return state.user;
    }).catch(function () {
      // Un fallo de red NO es un cierre de sesion. Si ya teniamos una respuesta
      // buena, la conservamos: antes, un corte momentaneo al recuperar el foco
      // mandaba al usuario a "invitado" en el header. Solo caemos a invitado si
      // nunca hemos llegado a saber el estado.
      invalidateStatus();
      if (!statusResolvedOnce) {
        state.user = null;
        state.uiState = 'guest';
        renderAll();
      }
      return state.user || null;
    });

    return statusCache.promise;
  }

  function refreshOnResume(event) {
    if (!hasTargets()) return;
    if (document.hidden) return;
    // Volver desde bfcache (atras/adelante) SI justifica releer: la pagina puede
    // llevar minutos congelada y la sesion haber cambiado en otra pestana.
    var fromBfcache = !!(event && event.persisted);
    loadStatus({ force: fromBfcache }).then(function () {
      return loadOrders();
    });
  }

  function boot() {
    if (state.booted) return;
    state.booted = true;
    bindEvents();

    fetchConfig().then(function (res) {
      state.config = (res.data && res.data.ok) ? res.data : null;
      if (state.config && state.config.googleConfigured && state.config.googleClientId) {
        setupGoogleButtons(state.config.googleClientId);
      } else {
        setPanelMessage('Google Login no está disponible en este entorno.', 'error');
      }
    }).catch(function () {
      setPanelMessage('No se pudo cargar la configuración de la cuenta.', 'error');
    }).finally(function () {
      loadStatus().then(function () {
        return loadOrders();
      });
    });

    if (!state.resumeBound) {
      window.addEventListener('pageshow', refreshOnResume);
      window.addEventListener('focus', refreshOnResume);
      state.resumeBound = true;
    }
  }

  function hasTargets() {
    return !!($('headerAccountToggle') || $('checkoutAuthState') || $('accountSessionState'));
  }

  function startObserver() {
    if (state.observerStarted || hasTargets()) return;
    state.observerStarted = true;
    state.observer = new MutationObserver(function () {
      if (hasTargets()) {
        try { state.observer.disconnect(); } catch (_) { /* ignore */ }
        state.observer = null;
        boot();
      }
    });
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      if (!state.observer) return;
      try { state.observer.disconnect(); } catch (_) { /* ignore */ }
      state.observer = null;
    }, 15000);
  }

  function start() {
    if (document.body && document.body.classList && document.body.classList.contains('account-page')) {
      return;
    }
    if (hasTargets()) {
      boot();
      return;
    }
    startObserver();
  }

  window.SS_AUTH_UI = {
    refresh: function () {
      if (document.body && document.body.classList && document.body.classList.contains('account-page')) {
        return;
      }
      state.booted = false;
      start();
    },
    openPanel: openPanel,
    closePanel: closePanel,
    loadStatus: loadStatus,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
