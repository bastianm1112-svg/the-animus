/**
 * Unified signed-in app chrome — footers, loading affordances, page polish.
 */
(function (g) {
  'use strict';

  var ASSET_VER = '20260608';

  function mountAppFooter(rootId) {
    var root = document.getElementById(rootId || 'appFooterMount');
    if (!root) return;
    function render() {
      var html =
        g.AnimusLegal && typeof g.AnimusLegal.buildAppFooterHtml === 'function'
          ? g.AnimusLegal.buildAppFooterHtml(true)
          : g.AnimusLegal && g.AnimusLegal.buildFooterHtml
            ? g.AnimusLegal.buildFooterHtml()
            : '';
      root.innerHTML = '<div class="app-site-footer-wrap">' + html + '</div>';
    }
    if (g.AnimusLegal && typeof g.AnimusLegal.buildAppFooterHtml === 'function') {
      render();
      return;
    }
    var existing = document.querySelector('script[data-animus-legal]');
    if (existing) {
      existing.addEventListener('load', render);
      return;
    }
    if (!document.querySelector('link[href*="animus-legal.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/animus-legal.css?v=' + ASSET_VER;
      document.head.appendChild(link);
    }
    var s = document.createElement('script');
    s.src = '/js/animus-legal.js?v=' + ASSET_VER;
    s.setAttribute('data-animus-legal', '1');
    s.onload = render;
    s.onerror = function () {
      root.innerHTML = '';
    };
    document.head.appendChild(s);
  }

  function polishLoadingNodes() {
    var fact = document.getElementById('dailyFactText');
    if (fact && !fact.classList.contains('animus-skeleton') && !(fact.textContent || '').trim()) {
      fact.classList.add('animus-skeleton');
      fact.setAttribute('aria-busy', 'true');
    }

    var notifList = document.getElementById('notifPageList');
    if (notifList) {
      var only = notifList.querySelector('.notif-page-empty');
      if (only && /loading/i.test(only.textContent)) {
        only.classList.add('app-loading-block');
        only.innerHTML =
          '<span class="app-loading-block-title">Checking requests</span>' +
          '<span class="app-loading-block-sub">One moment</span>';
      }
    }

    document.querySelectorAll('.shop-plus-status.is-loading').forEach(function (el) {
      if (!el.textContent.trim() || /loading/i.test(el.textContent)) {
        el.innerHTML =
          '<span class="app-loading-block-title">Your plan</span>' +
          '<span class="app-loading-block-sub">Loading allowance…</span>';
        el.classList.add('app-loading-block--inline');
      }
    });
  }

  function boot() {
    if (document.body.classList.contains('has-app-nav')) {
      mountAppFooter('appFooterMount');
    }
    polishLoadingNodes();
  }

  g.AnimusPageShell = {
    ASSET_VER: ASSET_VER,
    boot: boot,
    mountAppFooter: mountAppFooter
  };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(boot);
})(typeof window !== 'undefined' ? window : globalThis);
