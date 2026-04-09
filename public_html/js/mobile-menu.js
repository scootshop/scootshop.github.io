// Mobile Menu - Versión ultra-simplificada con delegación pura
(function() {
  'use strict';

  var win = (typeof window !== 'undefined') ? window : null;

  // Funciones de manipulación directa del DOM
  function openMenu() {
    var burger = document.getElementById('burger');
    var backdrop = document.getElementById('mmBackdrop');
    var panel = document.getElementById('mobileMenu');
    
    if (!burger || !backdrop || !panel) return false;
    
    backdrop.classList.add('active');
    panel.classList.add('active');
    document.body.style.overflow = 'hidden';
    burger.setAttribute('aria-expanded', 'true');
    return true;
  }

  function closeMenu() {
    var burger = document.getElementById('burger');
    var backdrop = document.getElementById('mmBackdrop');
    var panel = document.getElementById('mobileMenu');
    var productsBtn = document.getElementById('mmProductsToggle');
    var productsSub = document.getElementById('mmProductsSub');
    
    if (!burger || !backdrop || !panel) return false;
    
    backdrop.classList.remove('active');
    panel.classList.remove('active');
    document.body.style.overflow = '';
    burger.setAttribute('aria-expanded', 'false');

    // Cerrar submenús
    if (productsBtn && productsSub) {
      productsBtn.setAttribute('aria-expanded', 'false');
      productsSub.classList.remove('active');
    }

    var allSeriesBtns = document.querySelectorAll('[data-series]');
    var allSeriesContent = document.querySelectorAll('[data-series-content]');
    for (var i = 0; i < allSeriesBtns.length; i++) {
      allSeriesBtns[i].classList.remove('active');
    }
    for (var j = 0; j < allSeriesContent.length; j++) {
      allSeriesContent[j].classList.remove('active');
    }

    return true;
  }

  function toggleProducts() {
    var productsBtn = document.getElementById('mmProductsToggle');
    var productsSub = document.getElementById('mmProductsSub');
    
    if (!productsBtn || !productsSub) return false;
    
    var isOpen = productsSub.classList.contains('active');
    productsBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    productsSub.classList.toggle('active');
    return true;
  }

  function toggleSeries(btn) {
    if (!btn) return false;
    
    var seriesName = btn.getAttribute('data-series');
    var seriesContent = document.querySelector('[data-series-content="' + seriesName + '"]');
    
    if (!seriesContent) return false;

    var isActive = btn.classList.contains('active');
    
    // Cerrar otras series si se está abriendo esta
    if (!isActive) {
      var allSeriesBtns = document.querySelectorAll('[data-series]');
      var allSeriesContent = document.querySelectorAll('[data-series-content]');
      for (var i = 0; i < allSeriesBtns.length; i++) {
        allSeriesBtns[i].classList.remove('active');
      }
      for (var j = 0; j < allSeriesContent.length; j++) {
        allSeriesContent[j].classList.remove('active');
      }
    }

    btn.classList.toggle('active');
    seriesContent.classList.toggle('active');
    return true;
  }

  function isMenuOpen() {
    var panel = document.getElementById('mobileMenu');
    return panel && panel.classList.contains('active');
  }

  // Event delegation - se instala UNA SOLA VEZ y funciona aunque el HTML llegue tarde
  if (win && !win.MM_DELEGATED) {
    win.MM_DELEGATED = true;

    document.addEventListener('click', function(e) {
      // Burger toggle
      var burger = e.target.closest('#burger');
      if (burger) {
        e.preventDefault();
        e.stopPropagation();
        if (isMenuOpen()) {
          closeMenu();
        } else {
          openMenu();
        }
        return;
      }

      // Close button
      var closeBtn = e.target.closest('#mmClose');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      }

      // Backdrop
      var backdrop = e.target.closest('#mmBackdrop');
      if (backdrop && backdrop.classList.contains('active')) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      }

      // Products toggle
      var productsToggle = e.target.closest('#mmProductsToggle');
      if (productsToggle) {
        e.preventDefault();
        e.stopPropagation();
        toggleProducts();
        return;
      }

      // Series toggle
      var seriesBtn = e.target.closest('[data-series]');
      if (seriesBtn && !e.target.closest('a')) {
        e.preventDefault();
        e.stopPropagation();
        toggleSeries(seriesBtn);
        return;
      }

      // Close menu on link click
      var link = e.target.closest('a.mm-link:not(.mm-link--toggle), a.mm-sub2-link');
      if (link && isMenuOpen()) {
        setTimeout(function() { closeMenu(); }, 100);
      }
    }, true); // useCapture = true para capturar antes que otros handlers

    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen()) {
        e.preventDefault();
        closeMenu();
      }
    });

    // Exponer funciones globales por si se necesitan desde otro script
    if (win) {
      win.MM_openMenu = openMenu;
      win.MM_closeMenu = closeMenu;
      win.MM_toggleProducts = toggleProducts;
      win.MM_toggleSeries = toggleSeries;
    }
  }

  // Log de inicialización
  if (win && win.console && win.console.log) {
    win.console.log('[MOBILE MENU] Delegated handlers installed (v20260214-2)');
  }

})();
