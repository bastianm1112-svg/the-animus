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

  function sanitizeProfileSnapshot(snapshot) {
    var snap = Object.assign({}, snapshot || {});
    PROFILE_TEXT_KEYS.forEach(function (k) {
      if (snap[k] != null) snap[k] = sanitizePlainText(snap[k], 2000);
    });
    if (snap.values) snap.values = sanitizeStringArray(snap.values, 80, 24);
    if (snap.politicalThinkers) snap.politicalThinkers = sanitizeStringArray(snap.politicalThinkers, 500, 8);
    if (snap.similarPoliticians) snap.similarPoliticians = sanitizeStringArray(snap.similarPoliticians, 500, 8);
    if (snap.similarParties) snap.similarParties = sanitizeStringArray(snap.similarParties, 500, 8);
    if (snap.similarCountries) snap.similarCountries = sanitizeStringArray(snap.similarCountries, 500, 8);
    if (snap.figures) snap.figures = sanitizeFigures(snap.figures);
    return snap;
  }

  function sanitizeUserProfileFields(data) {
    data = data || {};
    return {
      displayName: sanitizePlainText(data.displayName, 48),
      bio: sanitizePlainText(data.bio, 160),
      username: normalizeUsername(data.username),
      language: sanitizePlainText(data.language, 16),
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

  function enrichProfileSnapshot(snapshot, rawData, meta) {
    var snap = sanitizeProfileSnapshot(Object.assign({}, snapshot));
    var data = rawData || {};
    snap.soc = socDisplayFromRaw(snap.soc || data.soc);
    snap.alone = aloneDisplayFromRaw(snap.alone || data.alone);
    snap.completedAt = (meta && meta.completedAt) || snap.completedAt || new Date().toISOString();
    snap.testMode = (meta && meta.testMode) || snap.testMode || 'full';
    snap.answerCount = (meta && meta.answerCount) || snap.answerCount || null;
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
        if (latest) latest = sanitizeProfileSnapshot(latest);
        if (latest && latest.mbti) return latest;
        var authUser = firebase.auth && firebase.auth().currentUser;
        if (options.allowLocalFallback !== false && authUser && authUser.uid === uid) {
          var local = loadLastResultLocal();
          if (local && local.mbti) return local;
        }
        return latest;
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

  function writeProfileDoc(userId, snap, meta) {
    meta = meta || {};
    var nowIso = new Date().toISOString();
    var ref = firebase.firestore().collection('profiles').doc(userId);
    return firebase.firestore().runTransaction(function (tx) {
      return tx.get(ref).then(function (doc) {
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
    var snap = enrichProfileSnapshot(snapshot, options.rawData, {
      completedAt: options.completedAt || snapshot.completedAt || new Date().toISOString(),
      testMode: options.testMode || snapshot.testMode || 'full',
      answerCount: options.answerCount || snapshot.answerCount
    });

    function finishWrite(adminEdit) {
      return writeProfileDoc(userId, snap, { adminEdit: !!adminEdit }).then(function () {
        if (authUser.uid === userId) {
          saveLastResultLocal(snap);
        }
        return snap;
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

  function trySyncLocalResultToFirestore(user) {
    if (!user || !user.uid) return Promise.resolve(false);
    var local = loadLastResultLocal();
    if (!local || !local.mbti) return Promise.resolve(false);
    return firebase.firestore().collection('profiles').doc(user.uid).get().then(function (doc) {
      if (doc.exists && doc.data().latest && doc.data().latest.mbti) return false;
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
    saveProfileToFirestore: saveProfileToFirestore,
    trySyncLocalResultToFirestore: trySyncLocalResultToFirestore
  };
})(typeof window !== 'undefined' ? window : this);
