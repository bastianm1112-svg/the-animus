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

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCc7icLCWC9beMexLfP5rKPgFr5WX1oHIg',
    authDomain: 'animus-b3d83.firebaseapp.com',
    projectId: 'animus-b3d83',
    storageBucket: 'animus-b3d83.firebasestorage.app',
    messagingSenderId: '681221615050',
    appId: '1:681221615050:web:1d037cd07a8381c91b3333'
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

  function sanitizePlainText(str, maxLen) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/<[^>]*>/g, '').trim().substring(0, maxLen || 500);
  }

  function sanitizeStringArray(arr, maxLen, maxItems) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxItems || 12).map(function (item) {
      return sanitizePlainText(item, maxLen || 500);
    }).filter(Boolean);
  }

  function sanitizeFigures(figures) {
    if (!Array.isArray(figures)) return [];
    return figures.slice(0, 24).map(function (f) {
      if (!f || typeof f !== 'object') return null;
      return {
        name: sanitizePlainText(f.name, 120),
        type: sanitizePlainText(f.type, 32),
        note: sanitizePlainText(f.note, 400),
        initials: sanitizePlainText(f.initials, 4),
        cat: sanitizePlainText(f.cat, 40)
      };
    }).filter(function (f) { return f && f.name; });
  }

  function safeInternalHref(href) {
    if (!href || typeof href !== 'string') return '';
    var h = href.trim();
    if (h.indexOf('//') === 0 || /^https?:/i.test(h) || /^javascript:/i.test(h) || /^data:/i.test(h)) {
      return '';
    }
    if (h.charAt(0) !== '/') return '';
    return h.substring(0, 200);
  }

  var PROFILE_TEXT_KEYS = [
    'mbtiName', 'tagline', 'socionics', 'keirsey', 'cogNarrative', 'ennNarrative',
    'attNarrative', 'phiNarrative', 'politicalNarrative', 'politicalIdeology',
    'politicalIdeologyDesc', 'politicalStrengths', 'politicalWeaknesses',
    'aloneDesc', 'socialDesc', 'shadowDesc'
  ];
  var PROFILE_NARRATIVE_MAX = 4000;
  var PROFILE_SHORT_TEXT_MAX = 2000;

  var MBTI_ALL_TYPES = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'
  ];

  function narrativeIdentityKey(snap) {
    if (!snap) return '';
    return [
      String(snap.mbti || '').toUpperCase(),
      String(snap.ennType || '').replace(/\D/g, ''),
      String(snap.ennWing || '').replace(/\D/g, ''),
      String(snap.ennTritype || ''),
      String(snap.att || ''),
      String(snap.phi || ''),
      typeof snap.polX === 'number' ? snap.polX : '',
      typeof snap.polY === 'number' ? snap.polY : ''
    ].join('|');
  }

  function narrativeTextBlob(snap) {
    if (!snap) return '';
    return PROFILE_TEXT_KEYS.map(function (k) {
      return snap[k] || '';
    }).join('\n');
  }

  function narrativesReferenceWrongIdentity(snap) {
    if (!snap || !snap.mbti) return false;
    var mbti = String(snap.mbti).toUpperCase().trim();
    var blob = narrativeTextBlob(snap);
    var i;
    for (i = 0; i < MBTI_ALL_TYPES.length; i++) {
      if (MBTI_ALL_TYPES[i] !== mbti && blob.indexOf(MBTI_ALL_TYPES[i]) >= 0) {
        return true;
      }
    }
    var enn = String(snap.ennType || '').replace(/\D/g, '');
    if (enn) {
      var typeRe = /(?:Type|Enneagram)\s+(\d)/gi;
      var m;
      while ((m = typeRe.exec(blob)) !== null) {
        if (m[1] !== enn) return true;
      }
    }
    return false;
  }

  function shouldRefreshNarratives(snap, opts) {
    opts = opts || {};
    if (!snap || !snap.mbti) return false;
    if (opts.force) return true;
    if (
      (snap.cogNarrative && snap.cogNarrative.length < 520) ||
      (snap.phiNarrative && snap.phiNarrative.length < 280) ||
      (snap.politicalNarrative && snap.politicalNarrative.length < 400)
    ) {
      return true;
    }
    if (narrativesReferenceWrongIdentity(snap)) return true;
    if (opts.previousLatest && narrativeIdentityKey(opts.previousLatest) !== narrativeIdentityKey(snap)) {
      return true;
    }
    if (snap._narrativeIdentity && snap._narrativeIdentity !== narrativeIdentityKey(snap)) {
      return true;
    }
    return false;
  }

  function shouldSkipCogReconcile(snap, opts) {
    opts = opts || {};
    if (opts.skipReconcile) return true;
    if (snap && (snap._typesLocked || snap.adminEditedAt)) return true;
    return false;
  }

  /** Align charts + dimension scores with declared MBTI / Enneagram (admin overrides). */
  function applyIdentityPanelsSync(snap) {
    snap = Object.assign({}, snap || {});
    var mbti = snap.mbti ? String(snap.mbti).toUpperCase().trim() : '';
    if (!mbti) return snap;

    var CN = global.AnimusCompareNormalize;
    if (CN && CN.MBTI_COG && CN.MBTI_COG[mbti]) {
      snap.cog = Object.assign({}, CN.MBTI_COG[mbti]);
      snap._hasRealCog = true;
      delete snap._compareDerivedCog;
    }

    if (CN && CN.spreadEnn) {
      snap.enn = CN.spreadEnn(snap);
    }
    if (CN && CN.spreadPhiS) {
      snap.phiS = CN.spreadPhiS(snap);
    }
    if (CN && CN.spreadIv) {
      snap.iv = CN.spreadIv(snap);
    }
    if (CN && CN.spreadAtt2) {
      snap.att2 = CN.spreadAtt2(snap);
    }
    if (CN && CN.deriveBig5FromCog && snap.cog) {
      snap.big5 = CN.deriveBig5FromCog(snap.cog);
    }

    snap = fillMbtiBasics(snap);
    snap._identitySyncedAt = new Date().toISOString();
    return snap;
  }

  function refreshSnapshotNarratives(snap, opts) {
    opts = opts || {};
    snap = Object.assign({}, snap || {});
    if (!snap.mbti) return snap;

    if (!shouldRefreshNarratives(snap, opts)) {
      if (!snap._narrativeIdentity) snap._narrativeIdentity = narrativeIdentityKey(snap);
      return snap;
    }

    if (opts.syncPanels !== false && (opts.force || snap._typesLocked || snap.adminEditedAt)) {
      snap = applyIdentityPanelsSync(snap);
    }

    snap = fillMbtiBasics(Object.assign({}, snap));
    if (global.AnimusCompareNormalize && global.AnimusCompareNormalize.normalizeProfileForDisplay) {
      snap = global.AnimusCompareNormalize.normalizeProfileForDisplay(snap) || snap;
    }
    if (
      !shouldSkipCogReconcile(snap, opts) &&
      global.AnimusScoring &&
      global.AnimusScoring.reconcileSnapshotTypes &&
      snap.cog &&
      !snap._compareDerivedCog
    ) {
      snap = global.AnimusScoring.reconcileSnapshotTypes(snap);
      snap = fillMbtiBasics(snap);
    }
    var PN = global.ProfileNarratives;
    if (!PN || !PN.buildFallbackNarrative) {
      snap._narrativeIdentity = narrativeIdentityKey(snap);
      return snap;
    }

    var mbti = String(snap.mbti).toUpperCase().trim();
    var enn = {
      type: String(snap.ennType || '9').replace(/\D/g, '') || '9',
      wing: String(snap.ennWing || '1').replace(/\D/g, '') || '1',
      tritype: snap.ennTritype || ''
    };
    var att = snap.att || 'AT_SEC';
    var phi = snap.phi || 'PH_STO';
    var cog = snap.cog && typeof snap.cog === 'object' ? snap.cog : {};
    var data = {
      cog: cog,
      polX: typeof snap.polX === 'number' ? snap.polX : 0,
      polY: typeof snap.polY === 'number' ? snap.polY : 0
    };
    var built = PN.buildFallbackNarrative(mbti, enn, att, phi, data);

    PROFILE_TEXT_KEYS.forEach(function (k) {
      if (built[k] != null && built[k] !== '') snap[k] = built[k];
    });
    if (built.figures && built.figures.length) snap.figures = built.figures;
    if (built.values && built.values.length) snap.values = built.values;
    if (built.big5 && typeof built.big5 === 'object') snap.big5 = built.big5;
    if (built.politicalThinkers) snap.politicalThinkers = built.politicalThinkers;
    if (built.similarCountries) snap.similarCountries = built.similarCountries;
    if (built.similarPoliticians) snap.similarPoliticians = built.similarPoliticians;
    if (built.similarParties) snap.similarParties = built.similarParties;
    if (built.socionics) snap.socionics = built.socionics;
    if (built.keirsey) snap.keirsey = built.keirsey;

    snap._narrativeIdentity = narrativeIdentityKey(snap);
    snap._narrativesRefreshedAt = new Date().toISOString();
    return snap;
  }

  function sanitizeProfileSnapshot(snapshot) {
    var snap = Object.assign({}, snapshot || {});
    PROFILE_TEXT_KEYS.forEach(function (k) {
      if (snap[k] == null) return;
      var maxLen =
        k.indexOf('Narrative') >= 0 || k === 'politicalIdeologyDesc' || k === 'politicalStrengths' || k === 'politicalWeaknesses'
          ? PROFILE_NARRATIVE_MAX
          : PROFILE_SHORT_TEXT_MAX;
      snap[k] = sanitizePlainText(snap[k], maxLen);
    });
    if (snap.values) snap.values = sanitizeStringArray(snap.values, 80, 24);
    if (snap.politicalThinkers) snap.politicalThinkers = sanitizeStringArray(snap.politicalThinkers, 500, 8);
    if (snap.similarPoliticians) snap.similarPoliticians = sanitizeStringArray(snap.similarPoliticians, 500, 8);
    if (snap.similarParties) snap.similarParties = sanitizeStringArray(snap.similarParties, 500, 8);
    if (snap.similarCountries) snap.similarCountries = sanitizeStringArray(snap.similarCountries, 500, 8);
    if (snap.figures) snap.figures = sanitizeFigures(snap.figures);
    return snap;
  }

  function getResolvedLang(pref) {
    var raw = pref;
    if (raw === undefined || raw === null || raw === '') {
      try {
        raw = localStorage.getItem(KEYS.lang);
      } catch (e) {
        raw = 'en';
      }
    }
    return String(raw).toLowerCase().trim() === 'es' ? 'es' : 'en';
  }

  function setResolvedLang(lang) {
    lang = getResolvedLang(lang);
    try {
      localStorage.setItem(KEYS.lang, lang);
    } catch (e) {}
    if (global.document && global.document.documentElement) {
      global.document.documentElement.lang = lang;
    }
    if (global.AnimusI18n && global.AnimusI18n.applyPageI18n) {
      global.AnimusI18n.applyPageI18n(lang);
    }
    try {
      global.dispatchEvent(new CustomEvent('animus-lang-change', { detail: { lang: lang } }));
    } catch (e) {}
    return lang;
  }

  function getSavedTestMode() {
    try {
      var m = localStorage.getItem(KEYS.testMode);
      return m === 'short' ? 'short' : 'full';
    } catch (e) {
      return 'full';
    }
  }

  function setSavedTestMode(mode) {
    mode = mode === 'short' ? 'short' : 'full';
    try {
      localStorage.setItem(KEYS.testMode, mode);
    } catch (e) {}
    return mode;
  }

  function sanitizeUserProfileFields(data) {
    data = data || {};
    return {
      displayName: sanitizePlainText(data.displayName, 48),
      bio: sanitizePlainText(data.bio, 160),
      username: normalizeUsername(data.username),
      language: getResolvedLang(data.language),
      email: sanitizePlainText(data.email, 256)
    };
  }

  function safePhotoUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      var u = new URL(url.trim());
      if (u.protocol !== 'https:') return '';
      var host = u.hostname.toLowerCase();
      if (host.indexOf('googleusercontent.com') !== -1 ||
          host === 'firebasestorage.googleapis.com' ||
          host.indexOf('firebasestorage.app') !== -1) {
        return u.href;
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  var PROFILE_ROUTE_RESERVED = {
    dashboard: 1,
    login: 1,
    settings: 1,
    test: 1,
    compare: 1,
    friends: 1,
    admin: 1,
    types: 1,
    profile: 1,
    group: 1,
    api: 1,
    _vercel: 1,
    favicon: 1,
    index: 1,
    '404': 1,
    landing: 1
  };

  function normalizeUsername(username) {
    return String(username || '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '')
      .substring(0, 32);
  }

  var LOGIN_REDIRECT_PREFIXES = [
    '/profile',
    '/compare',
    '/friends',
    '/notifications',
    '/settings',
    '/admin'
  ];

  /**
   * Safe post-login redirect — blocks open redirects and strips dangerous query params.
   */
  function safeLoginRedirectPath(next) {
    if (!next || typeof next !== 'string') return '/';
    var raw = next.trim();
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
    if (/^https?:/i.test(raw) || /^javascript:/i.test(raw) || /^data:/i.test(raw)) return '/';
    if (/[\u0000-\u001f\s\\]/.test(raw)) return '/';

    var pathQuery = raw.split('#')[0];
    var qIdx = pathQuery.indexOf('?');
    var pathOnly = qIdx >= 0 ? pathQuery.slice(0, qIdx) : pathQuery;
    var query = qIdx >= 0 ? pathQuery.slice(qIdx + 1) : '';

    if (pathOnly === '/test') {
      var safeQ = '';
      if (query) {
        try {
          if (new URLSearchParams(query).get('mode') === 'short') safeQ = '?mode=short';
        } catch (e) {}
      }
      return '/test' + safeQ;
    }

    if (pathOnly === '/profile') {
      if (!query) return '/profile';
      try {
        var pp = new URLSearchParams(query);
        var uid = pp.get('uid');
        if (uid) {
          uid = String(uid).replace(/[^a-zA-Z0-9]/g, '').substring(0, 128);
          if (uid) return '/profile?uid=' + encodeURIComponent(uid);
        }
        var un = normalizeUsername(pp.get('u'));
        if (un) return '/profile?u=' + encodeURIComponent(un);
      } catch (e) {}
      return '/profile';
    }

    var i;
    for (i = 0; i < LOGIN_REDIRECT_PREFIXES.length; i++) {
      var prefix = LOGIN_REDIRECT_PREFIXES[i];
      if (pathOnly === prefix) return pathOnly;
    }

    if (/^\/[a-z0-9_]{3,32}$/.test(pathOnly)) return pathOnly;
    return '/';
  }

  function buildLoginUrl(returnPath) {
    var safe = safeLoginRedirectPath(returnPath);
    if (safe === '/') return '/login';
    return '/login?next=' + encodeURIComponent(safe);
  }

  function readNextParam(loc) {
    loc = loc || (global && global.location ? global.location : null);
    if (!loc) return '';
    try {
      return new URLSearchParams(loc.search || '').get('next') || '';
    } catch (e) {
      return '';
    }
  }

  function testPageReturnPath(loc) {
    loc = loc || (global && global.location ? global.location : null);
    if (!loc) return '/test';
    try {
      if (new URLSearchParams(loc.search || '').get('mode') === 'short') return '/test?mode=short';
    } catch (e) {}
    return '/test';
  }

  /** Redirect anonymous users away from the assessment (safe to call from <head>). */
  function guardTestPageAuth(auth) {
    if (!auth || !global || !global.document) return;
    var returnPath = testPageReturnPath();
    var started = false;

    function onAuth(user) {
      var body = global.document.body;
      if (!body) return;
      if (!user) {
        global.location.replace(buildLoginUrl(returnPath));
        return;
      }
      body.classList.remove('test-auth-pending');
      body.classList.add('test-auth-ok');
    }

    function start() {
      if (started) return;
      started = true;
      var body = global.document.body;
      if (body) body.classList.add('test-auth-pending');
      auth.onAuthStateChanged(onAuth);
    }

    if (global.document.body) start();
    else if (global.document.addEventListener) {
      global.document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  /**
   * Resolve whose profile to load from URL (query or clean /username path).
   * Vercel rewrites /name → profile.html?u=name but the browser often keeps /name with no search string.
   */
  function resolveProfileRoute(loc) {
    loc = loc || (global && global.location ? global.location : null);
    if (!loc) return { kind: 'self' };

    var params = new URLSearchParams(loc.search || '');
    var uidParam = params.get('uid');
    if (uidParam) {
      return {
        kind: 'uid',
        uid: String(uidParam).replace(/[^a-zA-Z0-9]/g, '').substring(0, 128)
      };
    }

    var uParam = params.get('u');
    if (uParam) {
      var fromQuery = normalizeUsername(uParam);
      if (fromQuery) return { kind: 'username', username: fromQuery };
    }

    var segment = decodeURIComponent(String(loc.pathname || '').replace(/^\/+/, '')).split('/')[0];
    if (!segment || segment === 'profile' || /\.html$/i.test(segment)) {
      return { kind: 'self' };
    }
    if (PROFILE_ROUTE_RESERVED[segment.toLowerCase()]) {
      return { kind: 'self' };
    }

    var fromPath = normalizeUsername(segment);
    if (fromPath) return { kind: 'username', username: fromPath };
    return { kind: 'self' };
  }

  function profilePathForUsername(username) {
    var u = normalizeUsername(username);
    return u ? '/' + encodeURIComponent(u) : '/profile';
  }

  function profileHrefForUser(userOrUsername, uid) {
    if (userOrUsername && typeof userOrUsername === 'object') {
      uid = userOrUsername.uid;
      userOrUsername = userOrUsername.username;
    }
    var path = profilePathForUsername(userOrUsername);
    if (path !== '/profile') return path;
    if (uid) return '/profile?uid=' + encodeURIComponent(String(uid).replace(/[^a-zA-Z0-9]/g, '').substring(0, 128));
    return '/profile';
  }

  /** Economic/social labels aligned with compare-pair (±10 center band). */
  function polShortLabel(polX, polY) {
    var px = typeof polX === 'number' ? polX : 0;
    var py = typeof polY === 'number' ? polY : 0;
    var econ = px > 10 ? 'Right' : px < -10 ? 'Left' : 'Center';
    var auth = py > 10 ? 'Auth' : py < -10 ? 'Lib' : 'Mod';
    return { econ: econ, auth: auth, short: econ + ' · ' + auth };
  }

  function toggleThemeGlobal() {
    var isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem(KEYS.theme, isLight ? 'light' : 'dark');
    if (typeof global.AnimusApp !== 'undefined' && global.AnimusApp.syncThemeButton) {
      global.AnimusApp.syncThemeButton();
      return;
    }
    var btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.innerHTML = isLight
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  }

  function initialsFromName(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return (parts[0] || '?').charAt(0).toUpperCase();
  }

  function applyNavAvatar(el, user, userDoc) {
    if (!el) return;
    if (!user) {
      el.href = '/login';
      el.textContent = '';
      el.removeAttribute('title');
      el.className = 'nav-avatar';
      el.style.display = 'flex';
      el.innerHTML = 'Sign In';
      el.setAttribute('aria-label', 'Sign in');
      return;
    }

    var doc = userDoc || {};
    var photo = safePhotoUrl(doc.photoURL || user.photoURL || '');
    var name = doc.displayName || user.displayName || 'User';

    el.href = '/profile';
    el.title = name;
    el.className = 'nav-avatar';
    el.style.display = 'flex';
    el.removeAttribute('aria-label');

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
    var photo = safePhotoUrl(doc.photoURL || user.photoURL || '');
    var name = doc.displayName || user.displayName || '';
    if (photo) {
      el.innerHTML =
        '<img src="' + escapeHTML(photo) + '" alt="" referrerpolicy="no-referrer" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
    } else {
      el.textContent = initialsFromName(name);
    }
  }

  /** Nav avatar always reflects the signed-in user, never a profile being viewed. */
  function applyNavAvatarForSession(el, authUser) {
    if (!el) return Promise.resolve();
    if (!authUser) {
      applyNavAvatar(el, null);
      return Promise.resolve();
    }
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      applyNavAvatar(el, authUser);
      return Promise.resolve();
    }
    return firebase.firestore()
      .collection('users')
      .doc(authUser.uid)
      .get()
      .then(function (doc) {
        applyNavAvatar(el, authUser, doc.exists ? doc.data() : {});
      })
      .catch(function () {
        applyNavAvatar(el, authUser);
      });
  }

  function bindNavAuth(avatarId) {
    var el = document.getElementById(avatarId || 'navAvatar');
    if (!el || typeof firebase === 'undefined' || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(function (user) {
      applyNavAvatarForSession(el, user);
    });
  }

  function initFirebaseApp(config) {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    return firebase;
  }

  function sanitizeForFirestore(obj) {
    return JSON.parse(JSON.stringify(obj, function (_k, v) {
      return v === undefined ? null : v;
    }));
  }

  function parseHistoryTimestamp(ts) {
    if (!ts) return null;
    if (typeof ts === 'string') return new Date(ts);
    if (typeof ts === 'number') return new Date(ts);
    if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return null;
  }

  function socDisplayFromRaw(soc) {
    soc = soc || {};
    return {
      dom: Math.round(soc.SOC_DOM != null ? soc.SOC_DOM : soc.dom || 0),
      introvert: Math.round(soc.SOC_INT != null ? soc.SOC_INT : soc.introvert || 0),
      warmth: Math.round(soc.SOC_WAR != null ? soc.SOC_WAR : soc.warmth || 0),
      direct: Math.round(soc.SOC_DIR != null ? soc.SOC_DIR : soc.direct || 0),
      SOC_DOM: Math.round(soc.SOC_DOM || soc.dom || 0),
      SOC_INT: Math.round(soc.SOC_INT || soc.introvert || 0),
      SOC_WAR: Math.round(soc.SOC_WAR || soc.warmth || 0),
      SOC_DIR: Math.round(soc.SOC_DIR || soc.direct || 0)
    };
  }

  function aloneDisplayFromRaw(alone) {
    alone = alone || {};
    return {
      intellectual: Math.round(alone.AL_INT != null ? alone.AL_INT : alone.intellectual || 0),
      sensory: Math.round(alone.AL_SEN != null ? alone.AL_SEN : alone.sensory || 0),
      AL_INT: Math.round(alone.AL_INT || alone.intellectual || 0),
      AL_SEN: Math.round(alone.AL_SEN || alone.sensory || 0)
    };
  }

  function buildExportCategories(snap) {
    snap = snap || {};
    return {
      meta: {
        completedAt: snap.completedAt || null,
        testMode: snap.testMode || null,
        mbti: snap.mbti || null,
        answerCount: snap.answerCount || null
      },
      personality: {
        mbti: snap.mbti,
        mbtiName: snap.mbtiName,
        tagline: snap.tagline,
        cog: snap.cog,
        enn: snap.enn,
        ennType: snap.ennType,
        ennWing: snap.ennWing,
        ennTritype: snap.ennTritype,
        att: snap.att,
        att2: snap.att2,
        instStack: snap.instStack,
        big5: snap.big5,
        values: snap.values,
        socionics: snap.socionics,
        keirsey: snap.keirsey,
        tmp: snap.tmp,
        iv: snap.iv
      },
      philosophy: {
        phi: snap.phi,
        phiS: snap.phiS,
        eth: snap.eth,
        ep: snap.ep
      },
      political: {
        polX: snap.polX,
        polY: snap.polY,
        mf: snap.mf,
        politicalIdeology: snap.politicalIdeology,
        politicalIdeologyDesc: snap.politicalIdeologyDesc,
        politicalNarrative: snap.politicalNarrative,
        politicalStrengths: snap.politicalStrengths,
        politicalWeaknesses: snap.politicalWeaknesses,
        politicalThinkers: snap.politicalThinkers,
        similarPoliticians: snap.similarPoliticians,
        similarParties: snap.similarParties,
        similarCountries: snap.similarCountries
      },
      social: {
        soc: snap.soc,
        alone: snap.alone,
        socialDesc: snap.socialDesc,
        aloneDesc: snap.aloneDesc
      },
      narratives: {
        cogNarrative: snap.cogNarrative,
        ennNarrative: snap.ennNarrative,
        attNarrative: snap.attNarrative,
        phiNarrative: snap.phiNarrative,
        shadowDesc: snap.shadowDesc
      },
      figures: snap.figures || []
    };
  }

  var MBTI_BASICS = {
    INTJ: { mbtiName: 'The Strategic Visionary', socionics: 'LII', keirsey: 'Rational' },
    INTP: { mbtiName: 'The Analytical Architect', socionics: 'ILI', keirsey: 'Rational' },
    ENTJ: { mbtiName: 'The Commanding Strategist', socionics: 'LSE', keirsey: 'Rational' },
    ENTP: { mbtiName: 'The Dialectical Provocateur', socionics: 'ILE', keirsey: 'Rational' },
    INFJ: { mbtiName: 'The Prophetic Empath', socionics: 'EII', keirsey: 'Idealist' },
    INFP: { mbtiName: 'The Idealistic Visionary', socionics: 'IEI', keirsey: 'Idealist' },
    ENFJ: { mbtiName: 'The Transformative Catalyst', socionics: 'ESE', keirsey: 'Idealist' },
    ENFP: { mbtiName: 'The Radically Human', socionics: 'IEE', keirsey: 'Idealist' },
    ISTJ: { mbtiName: 'The Reliable Pillar', socionics: 'LSI', keirsey: 'Guardian' },
    ISFJ: { mbtiName: 'The Devoted Protector', socionics: 'ESI', keirsey: 'Guardian' },
    ESTJ: { mbtiName: 'The Structural Authority', socionics: 'SLE', keirsey: 'Guardian' },
    ESFJ: { mbtiName: 'The Social Architect', socionics: 'SEE', keirsey: 'Guardian' },
    ISTP: { mbtiName: 'The Tactical Craftsman', socionics: 'SLI', keirsey: 'Artisan' },
    ISFP: { mbtiName: 'The Quiet Composer', socionics: 'SEI', keirsey: 'Artisan' },
    ESTP: { mbtiName: 'The Electric Operator', socionics: 'LSE', keirsey: 'Artisan' },
    ESFP: { mbtiName: 'The Radiant Presence', socionics: 'SEE', keirsey: 'Artisan' }
  };

  function cogScoreSum(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.keys(obj).reduce(function (s, k) {
      return s + (Number(obj[k]) || 0);
    }, 0);
  }

  function profileSnapshotScore(snap) {
    if (!snap || typeof snap !== 'object') return 0;
    var mbti = snap.mbti || (snap.categories && snap.categories.meta && snap.categories.meta.mbti);
    if (!mbti) return 0;
    var score = 10;
    if (snap.mbtiName) score += 4;
    if (snap.cogNarrative) score += 28;
    if (snap.ennNarrative) score += 12;
    if (snap.attNarrative) score += 8;
    if (snap.phiNarrative) score += 8;
    if (snap.politicalNarrative) score += 8;
    if (snap.figures && snap.figures.length) score += 14;
    if (snap.values && snap.values.length) score += 6;
    if (cogScoreSum(snap.cog) > 0) score += 22;
    else if (snap.categories && snap.categories.personality && cogScoreSum(snap.categories.personality.cog) > 0) {
      score += 18;
    }
    if (snap.ennType || snap.ennTritype) score += 6;
    if (snap.att) score += 4;
    if (snap.phi) score += 4;
    if (typeof snap.polX === 'number' && typeof snap.polY === 'number') score += 4;
    return score;
  }

  function pickBestProfileSnapshot(profileDocData, opts) {
    opts = opts || {};
    if (!profileDocData || typeof profileDocData !== 'object') return null;

    var latest = profileDocData.latest;
    if (latest && typeof latest === 'object' && latest.mbti) {
      latest = sanitizeProfileSnapshot(Object.assign({}, latest));
      if (!opts.rawLatest) {
        latest = refreshSnapshotNarratives(latest, {
          skipReconcile: shouldSkipCogReconcile(latest, opts)
        });
      }
      return latest;
    }

    var candidates = [];
    (profileDocData.history || []).forEach(function (entry) {
      if (entry && entry.snapshot && typeof entry.snapshot === 'object' && entry.snapshot.mbti) {
        candidates.push(entry.snapshot);
      }
    });
    var best = null;
    var bestScore = 0;
    candidates.forEach(function (snap) {
      var sc = profileSnapshotScore(snap);
      if (sc > bestScore) {
        bestScore = sc;
        best = snap;
      }
    });
    if (best) {
      best = sanitizeProfileSnapshot(Object.assign({}, best));
      if (!opts.rawLatest) {
        best = refreshSnapshotNarratives(best, { skipReconcile: shouldSkipCogReconcile(best, opts) });
      }
    }
    return best;
  }

  function isSparseProfileSnapshot(snap) {
    return profileSnapshotScore(snap) < 45;
  }

  function fillMbtiBasics(snap) {
    snap = Object.assign({}, snap || {});
    var mbti = snap.mbti ? String(snap.mbti).toUpperCase().trim() : '';
    if (!mbti || !MBTI_BASICS[mbti]) return snap;
    snap.mbti = mbti;
    var basics = MBTI_BASICS[mbti];
    if (!snap.mbtiName) snap.mbtiName = basics.mbtiName;
    if (!snap.socionics) snap.socionics = basics.socionics;
    if (!snap.keirsey) snap.keirsey = basics.keirsey;
    return snap;
  }

  function stripCompareInternals(snap) {
    if (!snap || typeof snap !== 'object') return snap;
    delete snap._hasRealCog;
    delete snap._compareDerivedCog;
    return snap;
  }

  function hydrateSparseProfile(snap, opts) {
    opts = opts || {};
    snap = fillMbtiBasics(Object.assign({}, snap || {}));
    if (global.AnimusCompareNormalize && global.AnimusCompareNormalize.normalizeProfileForDisplay) {
      snap = global.AnimusCompareNormalize.normalizeProfileForDisplay(snap) || snap;
    }
    if (
      !shouldSkipCogReconcile(snap, opts) &&
      global.AnimusScoring &&
      global.AnimusScoring.reconcileSnapshotTypes &&
      snap &&
      snap.cog &&
      !snap._compareDerivedCog
    ) {
      snap = global.AnimusScoring.reconcileSnapshotTypes(snap);
      snap = fillMbtiBasics(snap);
    }
    return stripCompareInternals(snap);
  }

  function enrichProfileSnapshot(snapshot, rawData, meta) {
    meta = meta || {};
    var snap = sanitizeProfileSnapshot(Object.assign({}, snapshot));
    var data = rawData || {};
    if (meta.adminEdit) {
      snap._typesLocked = true;
      snap.adminEditedAt = snap.adminEditedAt || new Date().toISOString();
      snap = applyIdentityPanelsSync(snap);
    }
    snap.soc = socDisplayFromRaw(snap.soc || data.soc);
    snap.alone = aloneDisplayFromRaw(snap.alone || data.alone);
    snap.completedAt = meta.completedAt || snap.completedAt || new Date().toISOString();
    snap.testMode = meta.testMode || snap.testMode || 'full';
    snap.answerCount = meta.answerCount || snap.answerCount || null;
    snap = refreshSnapshotNarratives(snap, {
      force: !!meta.forceRefreshNarratives,
      previousLatest: meta.previousLatest,
      skipReconcile: shouldSkipCogReconcile(snap, meta),
      syncPanels: meta.adminEdit ? true : undefined
    });
    snap.categories = buildExportCategories(snap);
    return sanitizeForFirestore(snap);
  }

  function saveLastResultLocal(snapshot) {
    try {
      localStorage.setItem(KEYS.lastResult, JSON.stringify(snapshot));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadLastResultLocal() {
    try {
      var raw = localStorage.getItem(KEYS.lastResult);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** Always prefer Firestore profiles.latest (admin edits, retakes). Local fallback only for own uid when missing. */
  function fetchLatestProfile(uid, options) {
    options = options || {};
    if (!uid || typeof firebase === 'undefined' || !firebase.firestore) {
      return Promise.resolve(null);
    }
    return firebase
      .firestore()
      .collection('profiles')
      .doc(uid)
      .get()
      .then(function (doc) {
        var latest = doc.exists && doc.data().latest ? doc.data().latest : null;
        if (latest) {
          latest = sanitizeProfileSnapshot(Object.assign({}, latest));
          latest = refreshSnapshotNarratives(latest, {
            skipReconcile: shouldSkipCogReconcile(latest, {})
          });
        }
        if (latest && latest.mbti) return latest;
        var authUser = firebase.auth && firebase.auth().currentUser;
        if (options.allowLocalFallback !== false && authUser && authUser.uid === uid) {
          var local = loadLastResultLocal();
          if (local && local.mbti) return local;
        }
        return latest;
      });
  }

  function defaultUsernameForUser(user, pending) {
    if (pending && pending.username) return pending.username;
    var base = (user.displayName || (user.email ? user.email.split('@')[0] : '') || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    return base || 'user' + Date.now().toString().slice(-6);
  }

  function normalizedFriendRequests(fr) {
    if (!fr || typeof fr !== 'object' || Array.isArray(fr)) {
      return { sent: [], received: [] };
    }
    return {
      sent: Array.isArray(fr.sent) ? fr.sent : [],
      received: Array.isArray(fr.received) ? fr.received : []
    };
  }

  function friendRequestsNeedsRepair(fr) {
    if (fr === undefined || fr === null) return false;
    if (typeof fr !== 'object' || Array.isArray(fr)) return true;
    if (fr.sent !== undefined && !Array.isArray(fr.sent)) return true;
    if (fr.received !== undefined && !Array.isArray(fr.received)) return true;
    return false;
  }

  /** Create users/{uid} if missing (e.g. after failed signup batch or skipped home). */
  function ensureUserDocument(db, user) {
    if (!user || !db) return Promise.resolve(null);
    return db
      .collection('users')
      .doc(user.uid)
      .get()
      .then(function (doc) {
        if (doc.exists) {
          var data = doc.data() || {};
          if (friendRequestsNeedsRepair(data.friendRequests)) {
            return db
              .collection('users')
              .doc(user.uid)
              .set({ friendRequests: normalizedFriendRequests(data.friendRequests) }, { merge: true })
              .then(function () {
                data.friendRequests = normalizedFriendRequests(data.friendRequests);
                return data;
              });
          }
          return data;
        }
        var pending = null;
        try {
          pending = JSON.parse(localStorage.getItem(KEYS.pendingDoc) || 'null');
        } catch (e) {}
        var userData = {
          displayName: (pending && pending.displayName) || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          username: defaultUsernameForUser(user, pending),
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          friends: [],
          friendRequests: { sent: [], received: [] },
          language: localStorage.getItem(KEYS.lang) || 'en'
        };
        return db
          .collection('users')
          .doc(user.uid)
          .set(userData)
          .then(function () {
            return db.collection('usernames').doc(userData.username).set({ uid: user.uid });
          })
          .then(function () {
            try {
              localStorage.removeItem(KEYS.pendingDoc);
            } catch (e) {}
            return userData;
          });
      });
  }

  function isUserAdmin(uid) {
    if (!uid || typeof firebase === 'undefined' || !firebase.firestore) {
      return Promise.resolve(false);
    }
    return firebase
      .firestore()
      .collection('users')
      .doc(uid)
      .get()
      .then(function (doc) {
        return !!(doc.exists && doc.data() && doc.data().isAdmin === true);
      })
      .catch(function () {
        return false;
      });
  }

  function profileHasAdminLock(profileDocOrSnap) {
    if (!profileDocOrSnap || typeof profileDocOrSnap !== 'object') return false;
    if (profileDocOrSnap.adminEditedAt) return true;
    var latest = profileDocOrSnap.latest || profileDocOrSnap;
    return !!(latest && (latest._typesLocked || latest.adminEditedAt));
  }

  function writeProfileDoc(userId, snap, meta) {
    meta = meta || {};
    var nowIso = new Date().toISOString();
    var ref = firebase.firestore().collection('profiles').doc(userId);
    return firebase.firestore().runTransaction(function (tx) {
      return tx.get(ref).then(function (doc) {
        var previousLatest = doc.exists && doc.data().latest ? doc.data().latest : null;
        var skipReconcile = shouldSkipCogReconcile(snap, meta);
        snap = refreshSnapshotNarratives(snap, {
          force: !!meta.forceRefreshNarratives,
          previousLatest: previousLatest,
          skipReconcile: skipReconcile,
          syncPanels: meta.adminEdit ? true : undefined
        });
        var history = doc.exists ? (doc.data().history || []) : [];
        var entry = { snapshot: snap, timestamp: nowIso };
        if (meta.adminEdit) entry.source = 'admin-edit';
        history.push(entry);
        if (history.length > 10) history = history.slice(-10);
        var payload = {
          latest: snap,
          history: history,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (meta.adminEdit) {
          payload.adminEditedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        tx.set(ref, payload, { merge: true });
      });
    });
  }

  function saveProfileToFirestore(userId, snapshot, options) {
    options = options || {};
    if (!userId || typeof firebase === 'undefined' || !firebase.firestore) {
      return Promise.reject(new Error('Firestore unavailable'));
    }
    var authUser = firebase.auth && firebase.auth().currentUser;
    if (!authUser) {
      return Promise.reject(new Error('Not signed in'));
    }
    var isAdminSave = !!options.adminEdit;
    var snap = enrichProfileSnapshot(snapshot, options.rawData, {
      completedAt: options.completedAt || snapshot.completedAt || new Date().toISOString(),
      testMode: options.testMode || snapshot.testMode || 'full',
      answerCount: options.answerCount || snapshot.answerCount,
      forceRefreshNarratives: options.forceRefreshNarratives,
      adminEdit: isAdminSave,
      skipReconcile: !!(isAdminSave || snapshot._typesLocked || snapshot.adminEditedAt)
    });

    function finishWrite(adminEdit) {
      var writeMeta = {
        adminEdit: !!adminEdit,
        skipReconcile: shouldSkipCogReconcile(snap, {
          skipReconcile: adminEdit || isAdminSave
        }),
        forceRefreshNarratives: !!options.forceRefreshNarratives
      };
      return writeProfileDoc(userId, snap, writeMeta).then(function () {
        if (authUser.uid === userId) {
          saveLastResultLocal(snap);
        }
        return snap;
      });
    }

    if (isAdminSave) {
      return isUserAdmin(authUser.uid).then(function (admin) {
        if (!admin) {
          return Promise.reject(new Error('Only admins can save admin edits'));
        }
        return finishWrite(true);
      });
    }

    if (authUser.uid === userId) {
      return finishWrite(false);
    }

    return isUserAdmin(authUser.uid).then(function (admin) {
      if (!admin) {
        return Promise.reject(new Error('Only admins can edit other profiles'));
      }
      return finishWrite(true);
    });
  }

  /** Admin UI: always persists with adminEdit + types lock (works for own profile too). */
  function adminSaveProfileToFirestore(userId, snapshot, options) {
    options = options || {};
    snapshot = Object.assign({}, snapshot || {});
    snapshot._typesLocked = true;
    snapshot.adminEditedAt = snapshot.adminEditedAt || new Date().toISOString();
    return saveProfileToFirestore(userId, snapshot, {
      testMode: options.testMode || 'admin',
      adminEdit: true,
      forceRefreshNarratives: options.forceRefreshNarratives !== false,
      completedAt: options.completedAt || snapshot.completedAt || new Date().toISOString(),
      answerCount: options.answerCount || snapshot.answerCount,
      rawData: options.rawData
    });
  }

  function trySyncLocalResultToFirestore(user) {
    if (!user || !user.uid) return Promise.resolve(false);
    var local = loadLastResultLocal();
    if (!local || !local.mbti) return Promise.resolve(false);
    return firebase.firestore().collection('profiles').doc(user.uid).get().then(function (doc) {
      var remote = doc.exists ? doc.data() : null;
      if (remote && remote.latest && remote.latest.mbti) return false;
      if (profileHasAdminLock(remote)) return false;
      if (local._typesLocked || local.adminEditedAt) return false;
      return saveProfileToFirestore(user.uid, local, {
        testMode: local.testMode,
        completedAt: local.completedAt
      }).then(function () { return true; });
    });
  }

  global.toggleThemeGlobal = toggleThemeGlobal;

  global.AnimusShared = {
    KEYS: KEYS,
    FIREBASE_CONFIG: FIREBASE_CONFIG,
    escapeHTML: escapeHTML,
    sanitizePlainText: sanitizePlainText,
    sanitizeStringArray: sanitizeStringArray,
    sanitizeFigures: sanitizeFigures,
    safePhotoUrl: safePhotoUrl,
    safeInternalHref: safeInternalHref,
    sanitizeProfileSnapshot: sanitizeProfileSnapshot,
    sanitizeUserProfileFields: sanitizeUserProfileFields,
    normalizeUsername: normalizeUsername,
    safeLoginRedirectPath: safeLoginRedirectPath,
    buildLoginUrl: buildLoginUrl,
    readNextParam: readNextParam,
    testPageReturnPath: testPageReturnPath,
    guardTestPageAuth: guardTestPageAuth,
    resolveProfileRoute: resolveProfileRoute,
    profilePathForUsername: profilePathForUsername,
    profileHrefForUser: profileHrefForUser,
    polShortLabel: polShortLabel,
    toggleThemeGlobal: toggleThemeGlobal,
    initialsFromName: initialsFromName,
    applyNavAvatar: applyNavAvatar,
    applyNavAvatarForSession: applyNavAvatarForSession,
    applyProfilePhoto: applyProfilePhoto,
    bindNavAuth: bindNavAuth,
    initFirebaseApp: initFirebaseApp,
    sanitizeForFirestore: sanitizeForFirestore,
    parseHistoryTimestamp: parseHistoryTimestamp,
    socDisplayFromRaw: socDisplayFromRaw,
    aloneDisplayFromRaw: aloneDisplayFromRaw,
    buildExportCategories: buildExportCategories,
    enrichProfileSnapshot: enrichProfileSnapshot,
    saveLastResultLocal: saveLastResultLocal,
    loadLastResultLocal: loadLastResultLocal,
    fetchLatestProfile: fetchLatestProfile,
    isUserAdmin: isUserAdmin,
    ensureUserDocument: ensureUserDocument,
    profileSnapshotScore: profileSnapshotScore,
    pickBestProfileSnapshot: pickBestProfileSnapshot,
    applyIdentityPanelsSync: applyIdentityPanelsSync,
    refreshSnapshotNarratives: refreshSnapshotNarratives,
    narrativeIdentityKey: narrativeIdentityKey,
    isSparseProfileSnapshot: isSparseProfileSnapshot,
    fillMbtiBasics: fillMbtiBasics,
    hydrateSparseProfile: hydrateSparseProfile,
    stripCompareInternals: stripCompareInternals,
    saveProfileToFirestore: saveProfileToFirestore,
    adminSaveProfileToFirestore: adminSaveProfileToFirestore,
    profileHasAdminLock: profileHasAdminLock,
    trySyncLocalResultToFirestore: trySyncLocalResultToFirestore,
    getResolvedLang: getResolvedLang,
    setResolvedLang: setResolvedLang,
    getSavedTestMode: getSavedTestMode,
    setSavedTestMode: setSavedTestMode
  };
})(typeof window !== 'undefined' ? window : this);
