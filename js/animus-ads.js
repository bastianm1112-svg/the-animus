/**
 * Ad placement abstraction. No provider is wired.
 * Free → future ads; Plus → never.
 */
(function (g) {
  'use strict';

  var cfg = { enabled: false, provider: null, placements: {} };

  function fillHosts(userData) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-ad-placement]').forEach(function (el) {
      el.innerHTML = slot(el.getAttribute('data-ad-placement'), userData);
    });
  }

  function configure(next) {
    cfg = Object.assign({}, cfg, next || {});
    fillHosts();
  }

  function viewerIsPlus(userData) {
    return !!(g.AnimusEntitlements && g.AnimusEntitlements.hasAnimusPlus(userData));
  }

  function slot(placementId, userData) {
    if (!cfg.enabled || cfg.provider == null) return '';
    if (viewerIsPlus(userData)) return '';
    if (cfg.placements && cfg.placements[placementId] === false) return '';
    if (placementId.indexOf('test.question') === 0) return '';
    return '<aside class="animus-ad-slot" data-ad-slot="' + String(placementId).replace(/[^a-z0-9._-]/gi, '') + '" hidden></aside>';
  }

  g.AnimusAds = {
    configure: configure,
    slot: slot,
    fillHosts: fillHosts,
    providerInterface: {
      name: null,
      render: function () {}
    }
  };

  if (typeof fetch === 'function') {
    fetch('/api/site-config')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ads) configure(d.ads);
      })
      .catch(function () {});
  }
})(typeof window !== 'undefined' ? window : globalThis);
