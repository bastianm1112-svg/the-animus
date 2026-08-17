/**
 * Inline ad slots only. Never quiz, never overlays, never autoplay.
 * Free users: slots can render when site-config enables a provider.
 * Animus Plus: always empty.
 */
(function (g) {
  'use strict';

  var cfg = {
    enabled: false,
    provider: null,
    placements: {
      'home.footer': true,
      'results.belowSummary': true,
      'profile.footer': true
    }
  };
  var lastUserData = null;

  var BLOCKED = [
    'test.question',
    'test.item',
    'quiz',
    'sticky',
    'overlay',
    'interstitial',
    'video',
    'popup'
  ];

  function viewerIsPlus(userData) {
    return !!(g.AnimusEntitlements && g.AnimusEntitlements.hasAnimusPlus
      ? g.AnimusEntitlements.hasAnimusPlus(userData)
      : false);
  }

  function shouldShowAds(userData) {
    if (g.AnimusEntitlements && g.AnimusEntitlements.shouldShowAds) {
      return g.AnimusEntitlements.shouldShowAds(userData);
    }
    return !viewerIsPlus(userData);
  }

  function isBlocked(placementId) {
    var id = String(placementId || '').toLowerCase();
    return BLOCKED.some(function (p) {
      return id === p || id.indexOf(p + '.') === 0 || id.indexOf(p) === 0;
    });
  }

  function slot(placementId, userData) {
    if (!cfg.enabled) return '';
    if (!shouldShowAds(userData)) return '';
    if (isBlocked(placementId)) return '';
    if (cfg.placements && cfg.placements[placementId] === false) return '';
    if (!cfg.provider) return '';
    var safe = String(placementId).replace(/[^a-z0-9._-]/gi, '');
    var html = '';
    if (g.AnimusAds && g.AnimusAds.providerInterface && typeof g.AnimusAds.providerInterface.render === 'function') {
      html = g.AnimusAds.providerInterface.render(safe, userData) || '';
    }
    if (!html) return '';
    return '<aside class="animus-ad-slot" data-ad-slot="' + safe + '" aria-label="Advertisement">' + html + '</aside>';
  }

  function fillHosts(userData) {
    if (typeof document === 'undefined') return;
    if (userData !== undefined) lastUserData = userData;
    document.querySelectorAll('[data-ad-placement]').forEach(function (el) {
      var id = el.getAttribute('data-ad-placement');
      el.innerHTML = slot(id, lastUserData);
      el.hidden = !el.innerHTML;
    });
  }

  function configure(next) {
    cfg = Object.assign({}, cfg, next || {});
    if (next && next.placements) {
      cfg.placements = Object.assign({}, cfg.placements, next.placements);
    }
    fillHosts(lastUserData);
  }

  function bindUser() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      fillHosts(null);
      return;
    }
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user || !firebase.firestore) {
        fillHosts(null);
        return;
      }
      firebase.firestore().collection('users').doc(user.uid).get()
        .then(function (doc) {
          fillHosts(doc.exists ? doc.data() : {});
        })
        .catch(function () {
          fillHosts(null);
        });
    });
  }

  g.AnimusAds = {
    configure: configure,
    slot: slot,
    fillHosts: fillHosts,
    shouldShowAds: shouldShowAds,
    providerInterface: {
      name: null,
      render: function () { return ''; }
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUser);
    } else {
      bindUser();
    }
  }

  if (typeof fetch === 'function') {
    fetch('/api/site-config')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ads) configure(d.ads);
      })
      .catch(function () {});
  }
})(typeof window !== 'undefined' ? window : globalThis);
