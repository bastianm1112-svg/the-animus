/**
 * Legal copy version + signup acceptance helpers + shared site footer markup.
 */
(function (g) {
  'use strict';

  var TERMS_VERSION = '2026-06-01';
  var STORAGE_KEY = 'animus_terms_accept_v1';

  function termsFields(method) {
    var out = {
      termsVersion: TERMS_VERSION,
      termsAcceptanceMethod: method || 'web-signup'
    };
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
      out.termsAcceptedAt = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      out.termsAcceptedAt = new Date().toISOString();
    }
    return out;
  }

  function markAcceptedLocally() {
    try {
      localStorage.setItem(STORAGE_KEY, TERMS_VERSION);
    } catch (e) { /* ignore */ }
  }

  function hasAcceptedLocally() {
    try {
      return localStorage.getItem(STORAGE_KEY) === TERMS_VERSION;
    } catch (e) {
      return false;
    }
  }

  function applyToUserData(userData, method) {
    var fields = termsFields(method);
    Object.keys(fields).forEach(function (k) {
      userData[k] = fields[k];
    });
    return userData;
  }

  function isCheckboxChecked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function bindAcceptance(id, onChange) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      if (el.checked) markAcceptedLocally();
      if (onChange) onChange();
    });
  }

  function updateSignupControls(mode) {
    var isSignup = mode === 'signup' || (!mode && isSignupMode());
    var block = document.getElementById('legalAcceptMainWrap');
    if (block) block.hidden = !isSignup;

    var btn = document.getElementById('btnSubmit');
    var google = document.getElementById('btnGoogle');
    var accepted = isCheckboxChecked('legalAcceptMain') || (!isSignup);

    if (btn && isSignup) {
      btn.disabled = !accepted;
    } else if (btn) {
      btn.disabled = false;
    }
    if (google) {
      google.disabled = isSignup && !accepted;
    }
  }

  function updateSetupControls() {
    var btn = document.querySelector('#screenSetup .btn-submit');
    var accepted = isCheckboxChecked('legalAcceptSetup');
    if (btn) btn.disabled = !accepted;
  }

  function isSignupMode() {
    var tab = document.getElementById('tabSignup');
    return !!(tab && tab.classList.contains('active'));
  }

  function requireMainAccept() {
    if (!isSignupMode()) return true;
    if (isCheckboxChecked('legalAcceptMain')) return true;
    var err = document.getElementById('errBox');
    if (err) {
      err.textContent =
        'You must read and accept the Terms & Conditions before creating an account.';
      err.classList.add('show');
    }
    return false;
  }

  function requireSetupAccept() {
    if (isCheckboxChecked('legalAcceptSetup')) return true;
    var err = document.getElementById('setupErr');
    if (err) {
      err.textContent =
        'You must accept the Terms & Conditions before finishing account setup.';
      err.classList.add('show');
    }
    return false;
  }

  function buildFooterHtml() {
    return buildAppFooterHtml(false);
  }

  function buildAppFooterHtml(signedIn) {
    var links = signedIn
      ? '<a href="/">Home</a>' +
        '<a href="/test">Assessment</a>' +
        '<a href="/profile">Profile</a>' +
        '<a href="/shop">Upgrades</a>' +
        '<a href="/about">About</a>' +
        '<a href="/about#terms">Terms</a>'
      : '<a href="/about">About</a>' +
        '<a href="/about#disclaimer">Disclaimer</a>' +
        '<a href="/about#terms">Terms</a>' +
        '<a href="/test">Test</a>' +
        '<a href="/login">Sign In</a>';
    return (
      '<footer class="site-legal-footer">' +
      '<a href="/" class="footer-logo">ANI<span>MUS</span></a>' +
      '<div class="footer-copy">&copy; 2026 ANIMUS &mdash; Know thyself completely</div>' +
      '<div class="footer-links">' +
      links +
      '</div>' +
      '<p class="footer-legal-note">Independent personality atlas. Not affiliated with MBTI&reg; or Myers-Briggs&reg; publishers. ' +
      '<a href="/about#disclaimer">Legal notice</a></p>' +
      '</footer>'
    );
  }

  function mountFooter(rootId, signedIn) {
    var root = document.getElementById(rootId);
    if (!root) return;
    if (signedIn && typeof buildAppFooterHtml === 'function') {
      root.innerHTML = '<div class="app-site-footer-wrap">' + buildAppFooterHtml(true) + '</div>';
      return;
    }
    root.innerHTML = buildFooterHtml();
  }

  function initLogin() {
    bindAcceptance('legalAcceptMain', function () {
      updateSignupControls(typeof mode !== 'undefined' ? mode : 'signin');
    });
    bindAcceptance('legalAcceptSetup', updateSetupControls);

    var main = document.getElementById('legalAcceptMain');
    var setup = document.getElementById('legalAcceptSetup');
    if (main && hasAcceptedLocally()) {
      main.checked = true;
    }
    if (setup && hasAcceptedLocally()) {
      setup.checked = true;
    }
    updateSetupControls();
  }

  g.AnimusLegal = {
    TERMS_VERSION: TERMS_VERSION,
    termsFields: termsFields,
    applyToUserData: applyToUserData,
    markAcceptedLocally: markAcceptedLocally,
    hasAcceptedLocally: hasAcceptedLocally,
    buildFooterHtml: buildFooterHtml,
    buildAppFooterHtml: buildAppFooterHtml,
    mountFooter: mountFooter,
    initLogin: initLogin,
    updateSignupControls: updateSignupControls,
    updateSetupControls: updateSetupControls,
    requireMainAccept: requireMainAccept,
    requireSetupAccept: requireSetupAccept,
    isSignupMode: isSignupMode
  };
})(typeof window !== 'undefined' ? window : globalThis);
