/**
 * Touch pull-to-refresh for app pages (Activity).
 */
(function (g) {
  'use strict';

  function attach(options) {
    var root = options && options.root;
    var onRefresh = options && options.onRefresh;
    if (!root || typeof onRefresh !== 'function') return;

    var indicator = document.createElement('div');
    indicator.className = 'pull-refresh-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML =
      '<span class="pull-refresh-spinner"></span><span class="pull-refresh-label">Pull to refresh</span>';
    root.insertBefore(indicator, root.firstChild);

    var startY = 0;
    var pulling = false;
    var refreshing = false;
    var threshold = 72;

    function atTop() {
      return (window.scrollY || document.documentElement.scrollTop || 0) <= 2;
    }

    function setPull(distance) {
      var d = Math.max(0, Math.min(distance, threshold * 1.4));
      root.style.setProperty('--pull-offset', d + 'px');
      indicator.classList.toggle('is-visible', d > 12);
      indicator.classList.toggle('is-ready', d >= threshold);
      var label = indicator.querySelector('.pull-refresh-label');
      if (label) {
        label.textContent = d >= threshold ? 'Release to refresh' : 'Pull to refresh';
      }
    }

    function resetPull() {
      root.classList.remove('is-pulling');
      root.style.removeProperty('--pull-offset');
      indicator.classList.remove('is-visible', 'is-ready', 'is-loading');
    }

    root.addEventListener(
      'touchstart',
      function (e) {
        if (refreshing || !atTop() || !e.touches || !e.touches.length) return;
        startY = e.touches[0].clientY;
        pulling = true;
      },
      { passive: true }
    );

    root.addEventListener(
      'touchmove',
      function (e) {
        if (!pulling || refreshing || !e.touches || !e.touches.length) return;
        var dy = e.touches[0].clientY - startY;
        if (dy <= 0) {
          resetPull();
          return;
        }
        if (!atTop()) {
          pulling = false;
          resetPull();
          return;
        }
        root.classList.add('is-pulling');
        setPull(dy * 0.45);
        if (dy > 10 && e.cancelable) e.preventDefault();
      },
      { passive: false }
    );

    function finishRefresh() {
      refreshing = false;
      resetPull();
    }

    function endPull() {
      if (!pulling) return;
      pulling = false;
      var offset = parseFloat(root.style.getPropertyValue('--pull-offset') || '0');
      if (offset >= threshold && !refreshing) {
        refreshing = true;
        indicator.classList.add('is-loading', 'is-visible');
        var label = indicator.querySelector('.pull-refresh-label');
        if (label) label.textContent = 'Refreshing…';
        Promise.resolve(onRefresh())
          .catch(function () {})
          .then(function () {
            setTimeout(finishRefresh, 350);
          });
      } else {
        resetPull();
      }
    }

    root.addEventListener('touchend', endPull, { passive: true });
    root.addEventListener('touchcancel', endPull, { passive: true });
  }

  g.AnimusPullRefresh = { attach: attach };
})(typeof window !== 'undefined' ? window : globalThis);
