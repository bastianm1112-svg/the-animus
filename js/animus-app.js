/**
 * ANIMUS app bootstrap — theme, nav, mobile menu (all app shells).
 */
(function (g) {
  'use strict';

  function syncThemeButton() {
    var btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    var isLight = document.body.classList.contains('light-mode');
    btn.innerHTML = isLight
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  }

  function initTheme() {
    if (localStorage.getItem('animus_theme') === 'light') {
      document.body.classList.add('light-mode');
    }
    syncThemeButton();
  }

  function initMobileNav() {
    var menu = document.getElementById('navMobileMenu');
    var btn = document.getElementById('navHamburger');
    if (!menu || !btn) return;

    if (!g.toggleMobileMenu) {
      g.toggleMobileMenu = function () {
        var open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
    }

    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'navMobileMenu');
    if (!menu.id) menu.id = 'navMobileMenu';

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    menu.querySelectorAll('.nav-mobile-item').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initSmartLogo() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    try {
      firebase.auth().onAuthStateChanged(function (user) {
        document.querySelectorAll('a.nav-logo, a.panel-logo, a.footer-logo, a.mobile-logo').forEach(function (el) {
          el.href = user ? '/' : '/';
        });
      });
    } catch (e) { /* ignore */ }
  }

  function syncMbnNotifBadge(visible) {
    var mbn = document.getElementById('mbnNotifBadge');
    if (!mbn) return;
    if (visible) mbn.classList.add('visible');
    else mbn.classList.remove('visible');
  }

  function setPagePhase(phase) {
    var phases = ['intro', 'quiz', 'loading', 'results', 'compare'];
    phases.forEach(function (p) {
      document.body.classList.remove('phase-' + p);
    });
    if (phase) document.body.classList.add('phase-' + phase);
    ['intro', 'quiz', 'loading', 'results', 'compareView'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    var actionBar = document.getElementById('actionBar');
    if (actionBar) {
      if (phase !== 'results') actionBar.classList.remove('is-visible');
      actionBar.style.display = '';
    }
  }

  function initGlobalErrorFallback() {
    if (g.__animusErrorsBound) return;
    g.__animusErrorsBound = true;
    var strip = document.getElementById('animusErrorStrip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'animusErrorStrip';
      strip.className = 'animus-error-strip';
      strip.setAttribute('role', 'alert');
      document.body.appendChild(strip);
    }
    function showStrip(msg) {
      strip.textContent = msg;
      strip.classList.add('visible');
      setTimeout(function () {
        strip.classList.remove('visible');
      }, 6000);
    }
    g.addEventListener('error', function () {
      if (typeof g.AnimusSafe !== 'undefined') {
        g.AnimusSafe.showUserError('Something went wrong loading this page.');
      } else {
        showStrip('Something went wrong. Please refresh.');
      }
    });
    g.addEventListener('unhandledrejection', function () {
      if (typeof g.AnimusSafe !== 'undefined') {
        g.AnimusSafe.showUserError('A network request failed. Check your connection.');
      }
    });
  }

  function initPageReveal() {
    var main =
      document.getElementById('main-content') ||
      document.querySelector('.member-home') ||
      document.querySelector('main');
    if (!main || main.classList.contains('animus-reveal')) return;
    main.classList.add('animus-reveal');
    main.querySelectorAll('section, .app-section, .home-actions, .home-action-card, .activity-estimator').forEach(function (el, i) {
      if (i < 4) el.classList.add('animus-reveal', 'animus-reveal-delay-' + (i + 1));
    });
  }

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/og-image.svg';
    document.head.appendChild(link);
  }

  function initSeoAndPerf() {
    ensureFavicon();
    if (typeof g.AnimusSeo !== 'undefined') {
      g.AnimusSeo.initLazyImages();
      var desc = document.querySelector('meta[name="description"]');
      g.AnimusSeo.applyPageSeo({
        description: desc ? desc.getAttribute('content') : ''
      });
    }
  }

  function ensureAnalytics() {
    if (g.AnimusAnalytics || document.querySelector('script[data-animus-analytics]')) return;
    var s = document.createElement('script');
    s.src = '/js/animus-analytics.js?v=20260608';
    s.defer = true;
    s.setAttribute('data-animus-analytics', '1');
    document.head.appendChild(s);
  }

  function boot() {
    initTheme();
    initMobileNav();
    ensureAnalytics();
    initGlobalErrorFallback();
    initPageReveal();
    initSeoAndPerf();
    if (typeof g.AnimusPageShell !== 'undefined' && g.AnimusPageShell.boot) {
      g.AnimusPageShell.boot();
    }
    if (typeof g.AnimusShared !== 'undefined') {
      g.AnimusShared.bindNavAuth('navAvatar');
    }
    initSmartLogo();
    if (document.body.classList.contains('page-test') && !document.body.classList.contains('phase-quiz')) {
      setPagePhase('intro');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  g.AnimusApp = {
    boot: boot,
    initTheme: initTheme,
    syncThemeButton: syncThemeButton,
    syncMbnNotifBadge: syncMbnNotifBadge,
    setPagePhase: setPagePhase
  };

  g.setPagePhase = setPagePhase;
})(typeof window !== 'undefined' ? window : globalThis);
