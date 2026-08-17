/**
 * Compare page UI: tabs, bar animation, score visibility.
 */
(function (g) {
  'use strict';

  function animateCompareBars(scope) {
    scope = scope || document.getElementById('comparePanels') || document;
    var bars = scope.querySelectorAll('.dual-bar-you, .dual-bar-them');
    bars.forEach(function (el) {
      el.style.width = '0%';
    });
    var fill = scope.querySelector ? scope.querySelector('.compat-fill') : document.querySelector('.compat-fill');
    if (!fill && scope !== document) {
      fill = document.querySelector('.compat-fill');
    }
    if (fill) fill.style.width = '0%';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bars.forEach(function (el) {
          var w = el.getAttribute('data-w');
          if (w !== null && w !== '') {
            el.style.width = w + '%';
          }
        });
        if (fill && fill.getAttribute('data-w')) {
          fill.style.width = fill.getAttribute('data-w') + '%';
        }
      });
    });
  }

  function switchTab(panelId) {
    var tabs = document.querySelectorAll('#compareTabs .compare-tab');
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-panel') === panelId;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('#comparePanels .c-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    var panel = document.getElementById('c-panel-' + panelId);
    if (panel) {
      panel.classList.add('active', 'panel-enter');
      panel.addEventListener(
        'animationend',
        function () {
          panel.classList.remove('panel-enter');
        },
        { once: true }
      );
    }
    if (g.AnimusComparePair && g.AnimusComparePair.refreshCharts) {
      g.AnimusComparePair.refreshCharts();
    }
    animateCompareBars(panel);
  }

  function initTabs() {
    var tabsEl = document.getElementById('compareTabs');
    if (!tabsEl) return;
    tabsEl.querySelectorAll('.compare-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(tab.getAttribute('data-panel'));
      });
    });
  }

  function syncCompareModeBarHeight() {
    var bar = document.querySelector('.compare-mode-bar');
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--compare-mode-h', h + 'px');
  }

  function initStickyOffsets() {
    syncCompareModeBarHeight();
    var bar = document.querySelector('.compare-mode-bar');
    if (bar && typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        syncCompareModeBarHeight();
      });
      ro.observe(bar);
    } else {
      g.addEventListener('resize', syncCompareModeBarHeight);
    }
  }

  g.animateCompareBars = animateCompareBars;
  g.AnimusComparePage = {
    initTabs: initTabs,
    switchTab: switchTab,
    animateCompareBars: animateCompareBars,
    initStickyOffsets: initStickyOffsets,
    syncCompareModeBarHeight: syncCompareModeBarHeight
  };
})(typeof window !== 'undefined' ? window : globalThis);
