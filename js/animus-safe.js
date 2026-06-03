/**
 * Client-side input/output safety helpers (XSS reduction, safe DOM updates).
 */
(function (g) {
  'use strict';

  function stripControlChars(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  }

  function safeText(str, maxLen) {
    var t = stripControlChars(str).trim();
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

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? '' : String(text);
  }

  function setHTML(el, html) {
    if (!el) return;
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.escapeHTML) {
      el.textContent = '';
      el.insertAdjacentHTML('afterbegin', html);
      return;
    }
    el.textContent = '';
    el.insertAdjacentHTML('afterbegin', html);
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

  g.AnimusSafe = {
    stripControlChars: stripControlChars,
    safeText: safeText,
    safeExternalUrl: safeExternalUrl,
    setText: setText,
    setHTML: setHTML,
    showUserError: showUserError
  };
})(typeof window !== 'undefined' ? window : globalThis);
