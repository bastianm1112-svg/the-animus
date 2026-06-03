/**
 * Client-side input/output safety helpers (XSS reduction, safe DOM updates).
 */
(function (g) {
  'use strict';
  function stripControlChars(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  }
  function escapeHTML(str) {
    if (g.AnimusShared && g.AnimusShared.escapeHTML) {
      return g.AnimusShared.escapeHTML(str);
    }
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }
  function safeText(str, maxLen) {
    var t = stripControlChars(str).replace(/<[^>]*>/g, '').trim();
    if (maxLen && t.length > maxLen) t = t.substring(0, maxLen);
    return t;
  }
  function safeExternalUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var u = url.trim();
    if (!/^https?:\/\//i.test(u)) return '';
    if (/^javascript:/i.test(u) || /^data:/i.test(u)) return '';
    return u.substring(0, 2048);
  }
  /** Allow only safe data-URI images from local file uploads (max ~4MB base64). */
  function safeDataUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var u = url.trim();
    if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(u)) return '';
    if (u.length > 5500000) return '';
    return u;
  }
  function safeImageUrl(url) {
    var data = safeDataUrl(url);
    if (data) return data;
    return safeExternalUrl(url);
  }
  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? '' : String(text);
  }
  /** Trusted static markup only — never pass user-controlled strings here. */
  function setHTML(el, html) {
    if (!el) return;
    el.textContent = '';
    el.insertAdjacentHTML('afterbegin', html == null ? '' : String(html));
  }
  function setAvatarPreview(el, src) {
    if (!el) return;
    var safe = safeImageUrl(src);
    if (!safe) {
      setText(el, '');
      return;
    }
    el.textContent = '';
    var img = document.createElement('img');
    img.src = safe;
    img.alt = 'Profile photo';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
    var overlay = document.createElement('div');
    overlay.className = 'avatar-overlay';
    overlay.textContent = 'Change';
    el.appendChild(img);
    el.appendChild(overlay);
  }
  function showUserError(message) {
    var msg = safeText(message, 240) || 'Something went wrong. Please try again.';
    var toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(function () {
        toast.classList.remove('show');
      }, 4200);
      return;
    }
    if (typeof g.alert === 'function') g.alert(msg);
  }
  function bindGlobalErrorHandlers() {
    if (g.__animusSafeBound) return;
    g.__animusSafeBound = true;
    g.addEventListener('error', function (ev) {
      console.error('Unhandled error:', ev.error || ev.message);
      showUserError('Something went wrong. Refresh the page if it continues.');
    });
    g.addEventListener('unhandledrejection', function (ev) {
      console.error('Unhandled rejection:', ev.reason);
      showUserError('Something went wrong. Please try again.');
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindGlobalErrorHandlers);
    } else {
      bindGlobalErrorHandlers();
    }
  }
  g.AnimusSafe = {
    stripControlChars: stripControlChars,
    escapeHTML: escapeHTML,
    safeText: safeText,
    safeExternalUrl: safeExternalUrl,
    safeDataUrl: safeDataUrl,
    safeImageUrl: safeImageUrl,
    setText: setText,
    setHTML: setHTML,
    setAvatarPreview: setAvatarPreview,
    showUserError: showUserError,
    bindGlobalErrorHandlers: bindGlobalErrorHandlers
  };
})(typeof window !== 'undefined' ? window : globalThis);
