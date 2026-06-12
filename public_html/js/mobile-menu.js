// Mobile Menu — Drawer + Drill-down (v20260409)
(function() {
  'use strict';

  var win = (typeof window !== 'undefined') ? window : null;
  var mmLockedScrollY = 0;

  function lockBackgroundScroll() {
    var body = document.body;
    if (!body || body.classList.contains('mm-lock-scroll')) return;
    mmLockedScrollY = win ? (win.scrollY || win.pageYOffset || 0) : 0;
    body.classList.add('mm-lock-scroll');
    body.style.top = '-' + mmLockedScrollY + 'px';
  }

  function unlockBackgroundScroll() {
    var body = document.body;
    if (!body || !body.classList.contains('mm-lock-scroll')) return;
    var docEl = document.documentElement;
    var prevScrollBehavior = docEl ? docEl.style.scrollBehavior : '';
    body.classList.remove('mm-lock-scroll');
    body.style.top = '';
    if (docEl) docEl.style.scrollBehavior = 'auto';
    if (win) win.scrollTo(0, mmLockedScrollY || 0);
    if (docEl) docEl.style.scrollBehavior = prevScrollBehavior;
    mmLockedScrollY = 0;
  }

  function openMenu() {
    var burger = document.getElementById('burger');
    var backdrop = document.getElementById('mmBackdrop');
    var panel = document.getElementById('mobileMenu');
    if (!burger || !backdrop || !panel) return false;

    backdrop.classList.add('active');
    panel.classList.add('active');
    lockBackgroundScroll();
    burger.setAttribute('aria-expanded', 'true');

    // Focus first focusable element
    var first = panel.querySelector('a[href], button');
    if (first) first.focus();
    return true;
  }

  function closeMenu() {
    var burger = document.getElementById('burger');
    var backdrop = document.getElementById('mmBackdrop');
    var panel = document.getElementById('mobileMenu');
    var viewport = document.getElementById('mmViewport');
    if (!burger || !backdrop || !panel) return false;

    backdrop.classList.remove('active');
    panel.classList.remove('active');
    unlockBackgroundScroll();
    burger.setAttribute('aria-expanded', 'false');

    // Reset drill-down
    if (viewport) viewport.classList.remove('mm-drilled');

    // Close all series
    resetSeries();

    // Return focus to burger
    burger.focus();
    return true;
  }

  function drillToProducts() {
    var viewport = document.getElementById('mmViewport');
    var productsBtn = document.getElementById('mmProductsToggle');
    if (!viewport) return false;
    viewport.classList.add('mm-drilled');
    if (productsBtn) productsBtn.setAttribute('aria-expanded', 'true');
    return true;
  }

  function drillBack() {
    var viewport = document.getElementById('mmViewport');
    var productsBtn = document.getElementById('mmProductsToggle');
    if (!viewport) return false;
    viewport.classList.remove('mm-drilled');
    if (productsBtn) productsBtn.setAttribute('aria-expanded', 'false');
    resetSeries();
    return true;
  }

  function toggleSeries(btn) {
    if (!btn) return false;
    var seriesName = btn.getAttribute('data-series');
    var seriesContent = document.querySelector('[data-series-content="' + seriesName + '"]');
    if (!seriesContent) return false;

    var isActive = btn.classList.contains('active');

    // Close other series if opening this one
    if (!isActive) {
      var allBtns = document.querySelectorAll('[data-series]');
      var allContent = document.querySelectorAll('[data-series-content]');
      for (var i = 0; i < allBtns.length; i++) {
        allBtns[i].classList.remove('active');
        allBtns[i].setAttribute('aria-expanded', 'false');
      }
      for (var j = 0; j < allContent.length; j++) {
        allContent[j].classList.remove('active');
      }
    }

    btn.classList.toggle('active');
    seriesContent.classList.toggle('active');
    btn.setAttribute('aria-expanded', btn.classList.contains('active') ? 'true' : 'false');
    return true;
  }

  function resetSeries() {
    var allBtns = document.querySelectorAll('[data-series]');
    var allContent = document.querySelectorAll('[data-series-content]');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].classList.remove('active');
      allBtns[i].setAttribute('aria-expanded', 'false');
    }
    for (var j = 0; j < allContent.length; j++) {
      allContent[j].classList.remove('active');
    }
  }

  function isMenuOpen() {
    var panel = document.getElementById('mobileMenu');
    return panel && panel.classList.contains('active');
  }

  // Focus trap
  function trapFocus(e) {
    if (!isMenuOpen()) return;
    var panel = document.getElementById('mobileMenu');
    if (!panel) return;

    var focusable = panel.querySelectorAll(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Swipe-to-close (right swipe on drawer)
  var touchStartX = 0;
  var touchCurrentX = 0;
  var isSwiping = false;

  if (win && !win.MM_DELEGATED) {
    win.MM_DELEGATED = true;

    document.addEventListener('click', function(e) {
      // Burger toggle
      if (e.target.closest('#burger')) {
        e.preventDefault();
        e.stopPropagation();
        if (isMenuOpen()) closeMenu();
        else openMenu();
        return;
      }

      // Close button
      if (e.target.closest('#mmClose')) {
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

      // Products drill-down
      if (e.target.closest('#mmProductsToggle')) {
        e.preventDefault();
        e.stopPropagation();
        drillToProducts();
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

      // Close on any navigation link click
      var link = e.target.closest('.mm-panel a[href]');
      if (link && isMenuOpen()) {
        setTimeout(function() { closeMenu(); }, 120);
      }
    }, true);

    // Keyboard
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen()) {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === 'Tab' && isMenuOpen()) {
        trapFocus(e);
      }
    });

    // Swipe to navigate (swipe right → back from products, otherwise close drawer)
    document.addEventListener('touchstart', function(e) {
      if (!isMenuOpen()) return;
      var panel = document.getElementById('mobileMenu');
      if (!panel || !panel.contains(e.target)) return;
      touchStartX = e.touches[0].clientX;
      touchCurrentX = touchStartX;
      isSwiping = true;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;
      touchCurrentX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', function() {
      if (!isSwiping) return;
      var diff = touchCurrentX - touchStartX;
      if (diff > 70) {
        var viewport = document.getElementById('mmViewport');
        if (viewport && viewport.classList.contains('mm-drilled')) drillBack();
        else closeMenu();
      }
      isSwiping = false;
      touchStartX = 0;
      touchCurrentX = 0;
    }, { passive: true });

    // Expose globals
    if (win) {
      win.MM_openMenu = openMenu;
      win.MM_closeMenu = closeMenu;
      win.MM_toggleProducts = drillToProducts;
      win.MM_drillToProducts = drillToProducts;
      win.MM_drillBack = drillBack;
      win.MM_toggleSeries = toggleSeries;
    }
  }


})();
