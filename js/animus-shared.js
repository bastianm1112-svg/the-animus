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
    var snap = Object.assign({}, snapshot);
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

  function saveProfileToFirestore(userId, snapshot, options) {
    options = options || {};
    if (!userId || typeof firebase === 'undefined' || !firebase.firestore) {
      return Promise.reject(new Error('Firestore unavailable'));
    }
    var snap = enrichProfileSnapshot(snapshot, options.rawData, {
      completedAt: options.completedAt,
      testMode: options.testMode,
      answerCount: options.answerCount
    });
    var nowIso = new Date().toISOString();
    var ref = firebase.firestore().collection('profiles').doc(userId);
    return ref.get().then(function (doc) {
      var history = doc.exists ? (doc.data().history || []) : [];
      history.push({ snapshot: snap, timestamp: nowIso });
      if (history.length > 10) history = history.slice(-10);
      return ref.set({
        latest: snap,
        history: history,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function () {
      saveLastResultLocal(snap);
      return snap;
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

  global.AnimusShared = {
    KEYS: KEYS,
    escapeHTML: escapeHTML,
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
    saveProfileToFirestore: saveProfileToFirestore,
    trySyncLocalResultToFirestore: trySyncLocalResultToFirestore
  };
})(typeof window !== 'undefined' ? window : this);
