/**
 * Optional analytics — set window.ANIMUS_GA_MEASUREMENT_ID before this script loads,
 * or add <meta name="animus-ga-id" content="G-XXXXXXXX"> in the page head.
 */
(function (g) {
  'use strict';

  function readMeasurementId() {
    if (g.ANIMUS_GA_MEASUREMENT_ID) return String(g.ANIMUS_GA_MEASUREMENT_ID).trim();
    var meta = document.querySelector('meta[name="animus-ga-id"]');
    return meta ? (meta.getAttribute('content') || '').trim() : '';
  }

  function boot() {
    var id = readMeasurementId();
    if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  g.AnimusAnalytics = { boot: boot, readMeasurementId: readMeasurementId };
})(typeof window !== 'undefined' ? window : globalThis);
