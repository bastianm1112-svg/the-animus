/**
 * Admin profile editor — only users with users/{uid}.isAdmin === true.
 */
(function (g) {
  'use strict';

  var auth = null;
  var db = null;
  var targetUid = null;
  var targetUser = null;
  var VALID_MBTI = {
    INTJ: 1, INTP: 1, ENTJ: 1, ENTP: 1, INFJ: 1, INFP: 1, ENFJ: 1, ENFP: 1,
    ISTJ: 1, ISFJ: 1, ESTJ: 1, ESFJ: 1, ISTP: 1, ISFP: 1, ESTP: 1, ESFP: 1
  };
  var MAX_ADMIN_JSON_CHARS = 120000;

  function setStatus(msg, kind) {
    var el = document.getElementById('adminStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'admin-status' + (kind ? ' ' + kind : '');
  }

  function normalizeUsername(raw) {
    return String(raw || '')
      .trim()
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .substring(0, 32)
      .toLowerCase();
  }

  function resolveTargetUid() {
    var username = normalizeUsername(
      document.getElementById('adminUsername') && document.getElementById('adminUsername').value
    );
    var uidRaw =
      document.getElementById('adminUid') && document.getElementById('adminUid').value.trim();
    var uid = uidRaw ? uidRaw.replace(/[^a-zA-Z0-9]/g, '').substring(0, 128) : '';

    if (uid) return Promise.resolve(uid);
    if (!username) return Promise.reject(new Error('Enter a username or UID'));

    return db
      .collection('usernames')
      .doc(username)
      .get()
      .then(function (doc) {
        if (!doc.exists || !doc.data().uid) {
          throw new Error('Username not found');
        }
        return doc.data().uid;
      });
  }

  function fillQuickFields(snap) {
    snap = snap || {};
    var map = {
      adminMbti: snap.mbti,
      adminMbtiName: snap.mbtiName,
      adminEnnType: snap.ennType,
      adminEnnWing: snap.ennWing,
      adminEnnTritype: snap.ennTritype,
      adminAtt: snap.att,
      adminPhi: snap.phi,
      adminInst: snap.instStack,
      adminSocionics: snap.socionics,
      adminKeirsey: snap.keirsey,
      adminPolX: snap.polX,
      adminPolY: snap.polY
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var v = map[id];
      el.value = v === undefined || v === null ? '' : String(v);
    });
  }

  function applyQuickFieldsToSnapshot(snap) {
    snap = snap || {};
    function val(id) {
      var el = document.getElementById(id);
      if (!el) return undefined;
      var s = el.value.trim();
      return s === '' ? undefined : s;
    }
    function numVal(id) {
      var el = document.getElementById(id);
      if (!el || el.value.trim() === '') return undefined;
      var n = parseFloat(el.value);
      return isNaN(n) ? undefined : n;
    }

    var mbti = val('adminMbti');
    if (mbti) snap.mbti = mbti.toUpperCase().substring(0, 8);
    var mbtiName = val('adminMbtiName');
    if (mbtiName) snap.mbtiName = mbtiName;
    var ennType = val('adminEnnType');
    if (ennType) snap.ennType = ennType;
    var ennWing = val('adminEnnWing');
    if (ennWing) snap.ennWing = ennWing;
    var ennTritype = val('adminEnnTritype');
    if (ennTritype) snap.ennTritype = ennTritype;
    var att = val('adminAtt');
    if (att) snap.att = att;
    var phi = val('adminPhi');
    if (phi) snap.phi = phi;
    var inst = val('adminInst');
    if (inst) snap.instStack = inst;
    var soc = val('adminSocionics');
    if (soc) snap.socionics = soc;
    var keirsey = val('adminKeirsey');
    if (keirsey) snap.keirsey = keirsey;
    var polX = numVal('adminPolX');
    if (polX !== undefined) snap.polX = polX;
    var polY = numVal('adminPolY');
    if (polY !== undefined) snap.polY = polY;

    return snap;
  }

  function updateTargetMeta() {
    var meta = document.getElementById('adminTargetMeta');
    if (!meta || !targetUser) return;
    var un = targetUser.username ? '@' + targetUser.username : '';
    var name = g.AnimusShared
      ? g.AnimusShared.escapeHTML(targetUser.displayName || 'User')
      : String(targetUser.displayName || 'User');
    var safeUid = g.AnimusShared ? g.AnimusShared.escapeHTML(targetUid) : targetUid;
    meta.innerHTML =
      'Editing <strong>' + name + '</strong> ' + un + ' · <code style="font-size:11px;color:var(--muted)">' + safeUid + '</code>';
  }

  function loadProfile() {
    setStatus('Loading…');
    return resolveTargetUid()
      .then(function (uid) {
        targetUid = uid;
        return Promise.all([
          db.collection('users').doc(uid).get(),
          db.collection('profiles').doc(uid).get()
        ]);
      })
      .then(function (res) {
        var uDoc = res[0];
        var pDoc = res[1];
        if (!uDoc.exists) {
          throw new Error('User document not found');
        }
        targetUser = uDoc.data();
        var pData = pDoc.exists ? pDoc.data() : {};
        var snap =
          g.AnimusShared && g.AnimusShared.pickBestProfileSnapshot
            ? g.AnimusShared.pickBestProfileSnapshot(pData)
            : pData.latest || null;
        if (!snap || !snap.mbti) {
          snap = {};
          fillQuickFields(snap);
          var taEmpty = document.getElementById('adminJson');
          if (taEmpty) taEmpty.value = '{\n  "mbti": ""\n}';
          updateTargetMeta();
          document.getElementById('adminEditor').style.display = 'block';
          setStatus(
            'No assessment saved for this user yet. They need to finish the test (signed in), or paste a full JSON snapshot below.',
            'err'
          );
          return;
        }
        if (g.AnimusShared && g.AnimusShared.hydrateSparseProfile) {
          snap = g.AnimusShared.hydrateSparseProfile(snap);
        }
        fillQuickFields(snap);
        var ta = document.getElementById('adminJson');
        if (ta) ta.value = JSON.stringify(snap, null, 2);
        updateTargetMeta();
        document.getElementById('adminEditor').style.display = 'block';
        var sparse =
          g.AnimusShared && g.AnimusShared.isSparseProfileSnapshot && g.AnimusShared.isSparseProfileSnapshot(snap);
        if (sparse) {
          setStatus(
            'Loaded partial profile (often only MBTI). Chart defaults were filled where possible; narratives/figures may still be empty until they retake the test or you paste a full JSON export.',
            'err'
          );
        } else {
          setStatus('Profile loaded. Edit fields and save.', 'ok');
        }
      })
      .catch(function (e) {
        setStatus(e.message || 'Load failed', 'err');
      });
  }

  function saveProfile() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    var snap;
    try {
      var ta = document.getElementById('adminJson');
      var rawJson = ta.value || '';
      if (rawJson.length > MAX_ADMIN_JSON_CHARS) {
        throw new Error('JSON too large (max ' + MAX_ADMIN_JSON_CHARS + ' chars)');
      }
      snap = JSON.parse(rawJson);
      if (!snap || typeof snap !== 'object' || Array.isArray(snap)) {
        throw new Error('JSON must be an object');
      }
    } catch (e) {
      setStatus('Invalid JSON: ' + e.message, 'err');
      return;
    }

    snap = applyQuickFieldsToSnapshot(snap);
    if (!snap.mbti) {
      setStatus('Profile must include mbti (e.g. INTJ)', 'err');
      return;
    }
    var mbtiUp = String(snap.mbti).toUpperCase().trim();
    if (!VALID_MBTI[mbtiUp]) {
      setStatus('Invalid MBTI — use one of the 16 standard types (e.g. ESFP)', 'err');
      return;
    }
    snap.mbti = mbtiUp;
    if (g.AnimusShared && g.AnimusShared.hydrateSparseProfile) {
      snap = g.AnimusShared.hydrateSparseProfile(snap);
    }
    if (g.AnimusShared && g.AnimusShared.stripCompareInternals) {
      snap = g.AnimusShared.stripCompareInternals(snap);
    }
    if (typeof snap.polX === 'number') {
      snap.polX = Math.max(-100, Math.min(100, Math.round(snap.polX)));
    }
    if (typeof snap.polY === 'number') {
      snap.polY = Math.max(-100, Math.min(100, Math.round(snap.polY)));
    }

    setStatus('Saving…');
    var btn = document.getElementById('adminSaveBtn');
    if (btn) btn.disabled = true;

    g.AnimusShared.saveProfileToFirestore(targetUid, snap, {
      testMode: 'admin',
      completedAt: snap.completedAt || new Date().toISOString()
    })
      .then(function () {
        setStatus('Saved — profile, compare, and friends will use this data.', 'ok');
        var ta = document.getElementById('adminJson');
        if (ta) ta.value = JSON.stringify(snap, null, 2);
      })
      .catch(function (e) {
        setStatus(e.message || 'Save failed. Deploy firestore.rules if editing others.', 'err');
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function syncJsonFromQuick() {
    if (!targetUid) return;
    var ta = document.getElementById('adminJson');
    if (!ta) return;
    try {
      var snap = JSON.parse(ta.value || '{}');
      if (typeof snap !== 'object' || Array.isArray(snap)) snap = {};
      snap = applyQuickFieldsToSnapshot(snap);
      ta.value = JSON.stringify(snap, null, 2);
      setStatus('Quick fields merged into JSON', 'ok');
    } catch (e) {
      setStatus('Fix JSON before merging quick fields', 'err');
    }
  }

  function boot(a, d) {
    auth = a;
    db = d;
    var denied = document.getElementById('adminDenied');
    var app = document.getElementById('adminApp');

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        g.location.href =
          typeof g.AnimusShared !== 'undefined' && g.AnimusShared.buildLoginUrl
            ? g.AnimusShared.buildLoginUrl('/admin')
            : '/login?next=' + encodeURIComponent('/admin');
        return;
      }

      g.AnimusShared.isUserAdmin(user.uid).then(function (admin) {
        if (!admin) {
          if (denied) denied.style.display = 'block';
          if (app) app.style.display = 'none';
          return;
        }
        if (denied) denied.style.display = 'none';
        if (app) app.style.display = 'block';
        g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, null);
        db.collection('users')
          .doc(user.uid)
          .get()
          .then(function (doc) {
            if (doc.exists) {
              g.AnimusShared.applyNavAvatar(document.getElementById('navAvatar'), user, doc.data());
            }
          });
        if (typeof g.AnimusSocial !== 'undefined') {
          g.AnimusSocial.init(auth, db);
          g.AnimusSocial.loadNotifs(user.uid);
        }
      });
    });
  }

  function hydrateEditorFromMbti() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    var ta = document.getElementById('adminJson');
    if (!ta) return;
    try {
      var snap = JSON.parse(ta.value || '{}');
      if (typeof snap !== 'object' || Array.isArray(snap)) snap = {};
      snap = applyQuickFieldsToSnapshot(snap);
      if (!snap.mbti) {
        setStatus('Set MBTI in quick fields or JSON first', 'err');
        return;
      }
      if (g.AnimusShared && g.AnimusShared.hydrateSparseProfile) {
        snap = g.AnimusShared.hydrateSparseProfile(snap);
      }
      fillQuickFields(snap);
      ta.value = JSON.stringify(snap, null, 2);
      setStatus('Chart/score defaults applied from MBTI. Add narratives manually or have them retake the test.', 'ok');
    } catch (e) {
      setStatus('Invalid JSON: ' + e.message, 'err');
    }
  }

  g.AnimusAdmin = {
    boot: boot,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    syncJsonFromQuick: syncJsonFromQuick,
    hydrateEditorFromMbti: hydrateEditorFromMbti
  };
})(typeof window !== 'undefined' ? window : globalThis);
