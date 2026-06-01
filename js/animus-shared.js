/**
 * ANIMUS shared client utilities — nav avatar, theme keys, cross-page persistence.
 */
(function (global) {
  'use strict';

  var KEYS = {
    theme: 'animus_theme',
    lang: 'animus_lang',
    testMode: 'animus_test_mode',
    lastResult: 'animus_last_result',
    pendingDoc: 'animus_pending_doc',
    testProgress: 'animus_test_progress'
  };

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initialsFromName(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return (parts[0] || '?').charAt(0).toUpperCase();
  }

  function isTestPage() {
    var p = (global.location && global.location.pathname) || '';
    return p.indexOf('/test') !== -1 || p.indexOf('psyche-complete') !== -1;
  }

  function applyNavAvatar(el, user, userDoc) {
    if (!el) return;
    var onTest = isTestPage();
    if (!user) {
      el.href = '/login';
      el.textContent = 'Sign In';
      el.removeAttribute('title');
      el.className = onTest ? 'test-nav-signin' : 'nav-avatar';
      el.style.display = onTest ? '' : '';
      el.innerHTML = 'Sign In';
      return;
    }

    var doc = userDoc || {};
    var photo = doc.photoURL || user.photoURL || '';
    var name = doc.displayName || user.displayName || 'User';

    el.href = '/profile';
    el.title = name;
    el.className = onTest ? 'test-nav-avatar' : 'nav-avatar';
    el.style.display = 'flex';

    if (photo) {
      el.innerHTML =
        '<img src="' + escapeHTML(photo) + '" alt="" referrerpolicy="no-referrer" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
    } else {
      el.textContent = initialsFromName(name);
    }
  }

  function applyProfilePhoto(el, user, userDoc) {
    if (!el || !user) return;
    var doc = userDoc || {};
    var photo = doc.photoURL || user.photoURL || '';
    var name = doc.displayName || user.displayName || '';
    if (photo) {
      el.innerHTML =
        '<img src="' + escapeHTML(photo) + '" alt="" referrerpolicy="no-referrer" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
    } else {
      el.textContent = initialsFromName(name);
    }
  }

  function bindNavAuth(avatarId) {
    var el = document.getElementById(avatarId || 'navAvatar');
    if (!el || typeof firebase === 'undefined' || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        applyNavAvatar(el, null);
        return;
      }
      if (!firebase.firestore) {
        applyNavAvatar(el, user);
        return;
      }
      firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .get()
        .then(function (doc) {
          applyNavAvatar(el, user, doc.exists ? doc.data() : {});
        })
        .catch(function () {
          applyNavAvatar(el, user);
        });
    });
  }

  function initFirebaseApp(config) {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    return firebase;
  }

  global.AnimusShared = {
    KEYS: KEYS,
    escapeHTML: escapeHTML,
    initialsFromName: initialsFromName,
    applyNavAvatar: applyNavAvatar,
    applyProfilePhoto: applyProfilePhoto,
    bindNavAuth: bindNavAuth,
    initFirebaseApp: initFirebaseApp
  };
})(typeof window !== 'undefined' ? window : this);
