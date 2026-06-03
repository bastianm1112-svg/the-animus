/**
 * Shared SEO helpers — canonical URL, Open Graph URL, document title suffix.
 */
(function (g) {
  'use strict';

  var SITE_ORIGIN = 'https://animustest.com';

  function upsertMeta(attr, key, content) {
    if (!content) return;
    var sel = 'meta[' + attr + '="' + key + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function applyPageSeo(opts) {
    opts = opts || {};
    var path = g.location.pathname || '/';
    var url = SITE_ORIGIN + path;
    var title = opts.title || document.title;
    var description = opts.description || '';
    var ogType = opts.type || 'website';

    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:site_name', 'ANIMUS');
    upsertMeta('name', 'twitter:card', 'summary_large_image');

    var link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function initLazyImages() {
    document.querySelectorAll('img:not([loading])').forEach(function (img) {
      if (img.getAttribute('loading')) return;
      img.setAttribute('loading', 'lazy');
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.getAttribute('alt')) img.setAttribute('alt', '');
    });
  }

  g.AnimusSeo = {
    SITE_ORIGIN: SITE_ORIGIN,
    applyPageSeo: applyPageSeo,
    initLazyImages: initLazyImages
  };
})(typeof window !== 'undefined' ? window : globalThis);
