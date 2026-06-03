/**
 * Shared SEO & performance helpers — meta sync, JSON-LD, lazy images, resource hints.
 */
(function (g) {
  'use strict';
  var SITE_ORIGIN = 'https://animustest.com';
  var DEFAULT_OG_IMAGE = SITE_ORIGIN + '/og-image.svg';
  var DEFAULT_OG_ALT = 'ANIMUS — Know Yourself Completely';
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
  function upsertLink(rel, href, extra) {
    if (!href) return;
    var sel = 'link[rel="' + rel + '"]' + (extra && extra.crossOrigin ? '[crossorigin]' : '');
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      if (extra && extra.crossOrigin) el.crossOrigin = extra.crossOrigin;
      document.head.appendChild(el);
    }
    el.href = href;
  }
  function metaContent(attr, key) {
    var el = document.querySelector('meta[' + attr + '="' + key + '"]');
    return el ? el.getAttribute('content') || '' : '';
  }
  function applyPageSeo(opts) {
    opts = opts || {};
    var path = g.location.pathname || '/';
    if (path.endsWith('.html')) path = path.replace(/\.html$/i, '') || '/';
    var url = SITE_ORIGIN + (path === '/index' ? '/' : path);
    var title = opts.title || document.title;
    var description = opts.description || metaContent('name', 'description');
    var ogType = opts.type || metaContent('property', 'og:type') || 'website';
    var image = opts.image || metaContent('property', 'og:image') || DEFAULT_OG_IMAGE;
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
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', opts.imageAlt || DEFAULT_OG_ALT);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:image', image);
    if (!metaContent('name', 'theme-color')) {
      upsertMeta('name', 'theme-color', '#080808');
    }
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }
  function ensureResourceHints() {
    upsertLink('preconnect', 'https://fonts.googleapis.com', {});
    upsertLink('preconnect', 'https://fonts.gstatic.com', { crossOrigin: 'anonymous' });
    if (document.querySelector('script[src*="gstatic.com"]')) {
      var dp = 'link[rel="dns-prefetch"][href="https://www.gstatic.com"]';
      if (!document.querySelector(dp)) {
        var d = document.createElement('link');
        d.rel = 'dns-prefetch';
        d.href = 'https://www.gstatic.com';
        document.head.appendChild(d);
      }
    }
  }
  function injectJsonLd(data, id) {
    if (!data) return;
    var scriptId = id || 'animus-jsonld';
    var existing = document.getElementById(scriptId);
    if (existing) existing.remove();
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = scriptId;
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }
  function schemaForPath(path) {
    var base = {
      '@context': 'https://schema.org',
      url: SITE_ORIGIN + (path === '/' || path === '/index.html' ? '' : path.replace(/\.html$/i, ''))
    };
    if (path === '/' || path === '/index.html' || path === '/landing.html') {
      return Object.assign({}, base, {
        '@type': 'WebApplication',
        name: 'ANIMUS',
        description: 'Comprehensive personality assessment across 14 dimensions with AI narrative, compare, and shareable profiles.',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web'
      });
    }
    if (path === '/types' || path === '/types.html') {
      return Object.assign({}, base, {
        '@type': 'WebPage',
        name: 'ANIMUS Type Reference',
        description: 'Reference for cognitive types, Enneagram, philosophy, politics, and other systems ANIMUS measures.',
        isPartOf: { '@type': 'WebSite', name: 'ANIMUS', url: SITE_ORIGIN }
      });
    }
    if (path === '/about' || path === '/about.html') {
      return Object.assign({}, base, {
        '@type': 'WebPage',
        name: 'About ANIMUS',
        description: 'Legal notice, trademark disclaimer, and terms of use for ANIMUS.'
      });
    }
    if (path === '/test' || path === '/psyche-complete.html') {
      return Object.assign({}, base, {
        '@type': 'WebApplication',
        name: 'ANIMUS Personality Assessment',
        description: 'Multi-dimensional personality assessment with AI-generated narrative.',
        applicationCategory: 'LifestyleApplication'
      });
    }
    if (path === '/compare' || path === '/compare.html') {
      return Object.assign({}, base, {
        '@type': 'WebPage',
        name: 'ANIMUS Compare',
        description: 'Compare personality profiles for compatibility across cognition, values, and politics.'
      });
    }
    return Object.assign({}, base, {
      '@type': 'WebPage',
      name: document.title,
      description: metaContent('name', 'description') || 'ANIMUS personality atlas.'
    });
  }
  function initLazyImages() {
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function (img, index) {
      if (img.getAttribute('loading')) return;
      var rect = img.getBoundingClientRect();
      var inView = rect.top < (g.innerHeight || 800) && rect.bottom > 0;
      img.setAttribute('loading', index === 0 && inView ? 'eager' : 'lazy');
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
    });
  }
  function deferScriptsMarked() {
    document.querySelectorAll('script[data-defer-load]').forEach(function (node) {
      if (node.src && !node.defer) {
        var clone = document.createElement('script');
        clone.src = node.src;
        clone.defer = true;
        if (node.type) clone.type = node.type;
        node.parentNode.replaceChild(clone, node);
      }
    });
  }
  function readHtmlSeoHints() {
    var html = document.documentElement;
    var schemaType = html.getAttribute('data-seo-schema');
    if (!schemaType) return null;
    try {
      return JSON.parse(html.getAttribute('data-seo-json') || 'null');
    } catch (e) {
      return null;
    }
  }
  function hasExistingJsonLd() {
    return !!document.querySelector('script[type="application/ld+json"]');
  }
  function boot() {
    ensureResourceHints();
    applyPageSeo({});
    initLazyImages();
    deferScriptsMarked();
    if (!hasExistingJsonLd()) {
      var custom = readHtmlSeoHints();
      var path = g.location.pathname || '/';
      injectJsonLd(custom || schemaForPath(path), 'animus-jsonld-auto');
    }
  }
  function initLazyImagesPublic() {
    initLazyImages();
  }
  g.AnimusSeo = {
    SITE_ORIGIN: SITE_ORIGIN,
    DEFAULT_OG_IMAGE: DEFAULT_OG_IMAGE,
    applyPageSeo: applyPageSeo,
    initLazyImages: initLazyImagesPublic,
    injectJsonLd: injectJsonLd,
    ensureResourceHints: ensureResourceHints,
    boot: boot
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
