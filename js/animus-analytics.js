/**
 * GA4 funnel events — set meta animus-ga-id, window.ANIMUS_GA_MEASUREMENT_ID,
 * or Vercel env ANIMUS_GA_MEASUREMENT_ID (via /api/site-config).
 */
(function (g) {
  'use strict';

  var queue = [];
  var ready = false;

  function readMeasurementId() {
    if (g.ANIMUS_GA_MEASUREMENT_ID) return String(g.ANIMUS_GA_MEASUREMENT_ID).trim();
    var meta = document.querySelector('meta[name="animus-ga-id"]');
    return meta ? (meta.getAttribute('content') || '').trim() : '';
  }

  function initGtag(id) {
    if (!id || !/^G-[A-Z0-9]+$/i.test(id) || ready) return;
    ready = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);

    g.dataLayer = g.dataLayer || [];
    function gtag() {
      g.dataLayer.push(arguments);
    }
    g.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true, send_page_view: true });

    queue.forEach(function (item) {
      gtag('event', item[0], item[1] || {});
    });
    queue = [];
  }

  function track(eventName, params) {
    var name = String(eventName || '').trim();
    if (!name) return;
    var payload = params && typeof params === 'object' ? params : {};
    if (typeof g.gtag === 'function') {
      g.gtag('event', name, payload);
      return;
    }
    queue.push([name, payload]);
  }

  function boot() {
    var id = readMeasurementId();
    if (id) {
      initGtag(id);
      return;
    }
    fetch('/api/site-config', { credentials: 'same-origin' })
      .then(function (r) {
        return r.ok ? r.json() : {};
      })
      .then(function (cfg) {
        if (cfg && cfg.gaMeasurementId) initGtag(String(cfg.gaMeasurementId).trim());
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  g.AnimusAnalytics = {
    boot: boot,
    track: track,
    readMeasurementId: readMeasurementId
  };
})(typeof window !== 'undefined' ? window : globalThis);
