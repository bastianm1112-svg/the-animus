/**
 * Admin profile editor — users/{uid}.isAdmin === true only.
 * Identity fields are the source of truth; JSON is advanced. Saves use adminSaveProfileToFirestore.
 */
(function (g) {
  'use strict';

  var auth = null;
  var db = null;
  var adminUid = null;
  var targetUid = null;
  var targetUser = null;
  var publishedSnap = null;
  var dirty = false;

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

  function setDirty(isDirty) {
    dirty = !!isDirty;
    var badge = document.getElementById('adminDirtyBadge');
    if (badge) badge.hidden = !dirty;
    var saveBtn = document.getElementById('adminSaveBtn');
    if (saveBtn) saveBtn.textContent = dirty ? 'Publish changes' : 'Save to Firestore';
  }

  function normalizeUsername(raw) {
    if (g.AnimusUsernamePolicy && g.AnimusUsernamePolicy.sanitize) {
      return g.AnimusUsernamePolicy.sanitize(raw);
    }
    return String(raw || '')
      .trim()
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .substring(0, 32)
      .toLowerCase();
  }

  function validateUsernameOrThrow(raw) {
    if (g.AnimusShared && g.AnimusShared.validateUsername) {
      var verdict = g.AnimusShared.validateUsername(raw);
      if (!verdict.ok) throw new Error(verdict.message || 'Invalid username');
      return verdict.username;
    }
    var un = normalizeUsername(raw);
    if (un.length < 3) throw new Error('Username must be at least 3 characters.');
    return un;
  }

  function showModerationPanel(show) {
    var panel = document.getElementById('adminModerationPanel');
    if (panel) panel.style.display = show ? 'block' : 'none';
  }

  function loadModerationIntoForm() {
    var status = document.getElementById('adminModerationStatus');
    var links = document.getElementById('adminModerationLinks');
    var unInput = document.getElementById('adminNewUsername');
    var reasonInput = document.getElementById('adminBanReason');
    if (!status || !targetUser) return;
    var banned = targetUser.banned === true;
    var un = targetUser.username ? '@' + targetUser.username : '(no username)';
    var edited = targetUser.bannedAt
      ? ' · banned ' + String(targetUser.bannedAt).slice(0, 19)
      : '';
    status.textContent =
      (banned ? 'Status: BANNED' : 'Status: active') +
      ' · ' +
      un +
      edited +
      (targetUser.banReason ? ' · ' + targetUser.banReason : '');
    status.className = 'admin-meta' + (banned ? ' admin-meta-banned' : '');
    if (unInput) unInput.value = targetUser.username || '';
    if (reasonInput) reasonInput.value = targetUser.banReason || '';
    if (links && g.AnimusShared) {
      var path = targetUser.username
        ? g.AnimusShared.profilePathForUsername(targetUser.username)
        : '/profile?uid=' + encodeURIComponent(targetUid);
      links.innerHTML =
        'Profile: <a href="' +
        path +
        '" target="_blank" rel="noopener">' +
        (g.AnimusShared.escapeHTML ? g.AnimusShared.escapeHTML(path) : path) +
        '</a> · UID lookup always works';
    }
    showModerationPanel(true);
  }

  function loadAccount() {
    setStatus('Loading account…');
    setDirty(false);
    return resolveTargetUid()
      .then(function (uid) {
        targetUid = uid;
        if (document.getElementById('adminUid')) {
          document.getElementById('adminUid').value = uid;
        }
        return db.collection('users').doc(uid).get();
      })
      .then(function (uDoc) {
        if (!uDoc.exists) throw new Error('User document not found');
        targetUser = uDoc.data();
        if (targetUser.username && document.getElementById('adminUsername')) {
          document.getElementById('adminUsername').value = targetUser.username;
        }
        loadModerationIntoForm();
        setStatus(
          'Loaded @' + (targetUser.username || '(none)') + '. Use moderation below or Load + profile editor.',
          'ok'
        );
      })
      .catch(function (e) {
        showModerationPanel(false);
        setStatus(e.message || 'Load failed', 'err');
      });
  }

  function banUser() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    if (targetUid === adminUid) {
      setStatus('You cannot ban your own admin account.', 'err');
      return;
    }
    var reasonEl = document.getElementById('adminBanReason');
    var reason = reasonEl && reasonEl.value ? reasonEl.value.trim().substring(0, 200) : '';
    if (!g.confirm('Ban this user? They will be signed out and cannot use the app.')) return;
    db.collection('users')
      .doc(targetUid)
      .set(
        {
          banned: true,
          bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
          bannedBy: adminUid || 'admin',
          banReason: reason
        },
        { merge: true }
      )
      .then(function () {
        targetUser.banned = true;
        targetUser.banReason = reason;
        loadModerationIntoForm();
        setStatus('User banned. They will be blocked on next request.', 'ok');
      })
      .catch(function (e) {
        setStatus(e.message || 'Ban failed', 'err');
      });
  }

  function unbanUser() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    db.collection('users')
      .doc(targetUid)
      .set(
        {
          banned: false,
          unbannedAt: firebase.firestore.FieldValue.serverTimestamp(),
          unbannedBy: adminUid || 'admin'
        },
        { merge: true }
      )
      .then(function () {
        targetUser.banned = false;
        loadModerationIntoForm();
        setStatus('User unbanned.', 'ok');
      })
      .catch(function (e) {
        setStatus(e.message || 'Unban failed', 'err');
      });
  }

  function changeUsername() {
    if (!targetUid || !targetUser) {
      setStatus('Load a user first', 'err');
      return;
    }
    var raw = document.getElementById('adminNewUsername') && document.getElementById('adminNewUsername').value;
    var newUsername;
    try {
      newUsername = validateUsernameOrThrow(raw);
    } catch (e) {
      setStatus(e.message || 'Invalid username', 'err');
      return;
    }
    var oldUsername = (targetUser.username || '').toLowerCase();
    if (newUsername === oldUsername) {
      setStatus('Username unchanged.', 'ok');
      return;
    }
    if (!g.confirm('Change @' + oldUsername + ' → @' + newUsername + '?')) return;

    setStatus('Updating username…');
    db.collection('usernames')
      .doc(newUsername)
      .get()
      .then(function (doc) {
        if (doc.exists && doc.data().uid && doc.data().uid !== targetUid) {
          throw new Error('@' + newUsername + ' is already taken.');
        }
        var batch = db.batch();
        var userPatch = { username: newUsername };
        if (oldUsername) {
          userPatch.previousUsernames = firebase.firestore.FieldValue.arrayUnion(oldUsername);
        }
        batch.set(db.collection('users').doc(targetUid), userPatch, { merge: true });
        batch.set(db.collection('usernames').doc(newUsername), { uid: targetUid });
        if (oldUsername && oldUsername !== newUsername) {
          batch.delete(db.collection('usernames').doc(oldUsername));
        }
        return batch.commit();
      })
      .then(function () {
        if (g.AnimusShared && g.AnimusShared.repairUsernameIndexForUser) {
          return g.AnimusShared.repairUsernameIndexForUser(db, targetUid, newUsername);
        }
      })
      .then(function () {
        return db.collection('users').doc(targetUid).get();
      })
      .then(function (doc) {
        if (doc.exists) targetUser = doc.data();
        targetUser.username = newUsername;
        if (document.getElementById('adminUsername')) {
          document.getElementById('adminUsername').value = newUsername;
        }
        if (document.getElementById('adminUid')) {
          document.getElementById('adminUid').value = targetUid;
        }
        updateTargetMeta();
        loadModerationIntoForm();
        var profilePath =
          g.AnimusShared && g.AnimusShared.profilePathForUsername
            ? g.AnimusShared.profilePathForUsername(newUsername)
            : '/' + encodeURIComponent(newUsername);
        setStatus(
          'Username updated to @' +
            newUsername +
            '. Profile URL: ' +
            profilePath +
            ' (old @' +
            oldUsername +
            ' no longer works).',
          'ok'
        );
      })
      .catch(function (e) {
        setStatus(e.message || 'Username change failed', 'err');
      });
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

    if (g.AnimusShared && g.AnimusShared.resolveUsernameToUid) {
      return g.AnimusShared.resolveUsernameToUid(db, username);
    }
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

  function parseEditorJson() {
    var ta = document.getElementById('adminJson');
    var rawJson = (ta && ta.value) || '';
    if (rawJson.length > MAX_ADMIN_JSON_CHARS) {
      throw new Error('JSON too large (max ' + MAX_ADMIN_JSON_CHARS + ' chars)');
    }
    var snap = JSON.parse(rawJson);
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) {
      throw new Error('JSON must be an object');
    }
    return snap;
  }

  function writeEditorJson(snap) {
    var ta = document.getElementById('adminJson');
    if (ta) ta.value = JSON.stringify(snap, null, 2);
  }

  function buildDraftFromEditor() {
    var snap = parseEditorJson();
    snap = applyQuickFieldsToSnapshot(snap);
    return normalizeDraft(snap);
  }

  function normalizeDraft(snap) {
    if (!snap.mbti) {
      throw new Error('Profile must include MBTI (e.g. INTJ)');
    }
    var mbtiUp = String(snap.mbti).toUpperCase().trim();
    if (!VALID_MBTI[mbtiUp]) {
      throw new Error('Invalid MBTI — use one of the 16 standard types');
    }
    snap.mbti = mbtiUp;
    if (typeof snap.polX === 'number') {
      snap.polX = Math.max(-100, Math.min(100, Math.round(snap.polX)));
    }
    if (typeof snap.polY === 'number') {
      snap.polY = Math.max(-100, Math.min(100, Math.round(snap.polY)));
    }
    snap._typesLocked = true;
    snap.adminEditedAt = snap.adminEditedAt || new Date().toISOString();
    if (g.AnimusShared && g.AnimusShared.stripCompareInternals) {
      snap = g.AnimusShared.stripCompareInternals(snap);
    }
    return snap;
  }

  function syncDraftPanels(snap) {
    if (g.AnimusShared && g.AnimusShared.applyIdentityPanelsSync) {
      snap = g.AnimusShared.applyIdentityPanelsSync(snap);
    }
    if (g.AnimusShared && g.AnimusShared.refreshSnapshotNarratives) {
      snap = g.AnimusShared.refreshSnapshotNarratives(snap, { force: true, skipReconcile: true });
    }
    return snap;
  }

  function updatePublishedBanner(profileDoc) {
    var el = document.getElementById('adminPublished');
    if (!el) return;
    var latest = profileDoc && profileDoc.latest ? profileDoc.latest : null;
    if (!latest || !latest.mbti) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    var lock =
      latest._typesLocked || latest.adminEditedAt || (g.AnimusShared && g.AnimusShared.profileHasAdminLock(profileDoc));
    var enn = (latest.ennType || '?') + 'w' + (latest.ennWing || '?');
    var edited = latest.adminEditedAt ? String(latest.adminEditedAt).slice(0, 19) : '—';
    el.innerHTML =
      '<span class="admin-published-label">Live on site</span> ' +
      '<strong>' +
      (g.AnimusShared ? g.AnimusShared.escapeHTML(String(latest.mbti)) : latest.mbti) +
      '</strong> · ' +
      enn +
      (lock ? ' · <span class="admin-lock">locked</span>' : '') +
      ' · edited ' +
      (g.AnimusShared ? g.AnimusShared.escapeHTML(edited) : edited);
  }

  function updateTargetMeta() {
    var meta = document.getElementById('adminTargetMeta');
    if (!meta || !targetUser) return;
    var un = targetUser.username
      ? '@' + (g.AnimusShared ? g.AnimusShared.escapeHTML(targetUser.username) : targetUser.username)
      : '';
    var name = g.AnimusShared
      ? g.AnimusShared.escapeHTML(targetUser.displayName || 'User')
      : String(targetUser.displayName || 'User');
    var safeUid = g.AnimusShared ? g.AnimusShared.escapeHTML(targetUid) : targetUid;
    var profileLink =
      g.AnimusShared && targetUser.username
        ? g.AnimusShared.profilePathForUsername(targetUser.username)
        : '/profile?uid=' + encodeURIComponent(targetUid);
    meta.innerHTML =
      'Editing <strong>' +
      name +
      '</strong> ' +
      un +
      ' · <code class="admin-uid">' +
      safeUid +
      '</code> · <a href="' +
      profileLink +
      '" target="_blank" rel="noopener">View profile</a>';
  }

  function loadSnapshotFromFirestore(pData) {
    if (pData.latest && pData.latest.mbti) {
      return Object.assign({}, pData.latest);
    }
    if (g.AnimusShared && g.AnimusShared.pickBestProfileSnapshot) {
      var picked = g.AnimusShared.pickBestProfileSnapshot(pData, { rawLatest: true });
      return picked ? Object.assign({}, picked) : null;
    }
    return pData.latest ? Object.assign({}, pData.latest) : null;
  }

  function prepareLoadedSnapshot(snap) {
    var locked = !!(snap._typesLocked || snap.adminEditedAt);
    if (!locked && g.AnimusShared && g.AnimusShared.hydrateSparseProfile) {
      snap = g.AnimusShared.hydrateSparseProfile(snap, { skipReconcile: false });
    } else if (locked && g.AnimusShared && g.AnimusShared.fillMbtiBasics) {
      snap = g.AnimusShared.fillMbtiBasics(Object.assign({}, snap));
    }
    return snap;
  }

  function loadProfile() {
    setStatus('Loading…');
    setDirty(false);
    return loadAccount()
      .then(function () {
        return Promise.all([
          db.collection('users').doc(targetUid).get(),
          db.collection('profiles').doc(targetUid).get()
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
        updatePublishedBanner(pData);

        var snap = loadSnapshotFromFirestore(pData);
        document.getElementById('adminEditor').style.display = 'block';
        updateTargetMeta();

        if (!snap || !snap.mbti) {
          snap = { mbti: '', _typesLocked: true };
          fillQuickFields(snap);
          writeEditorJson(snap);
          publishedSnap = null;
          setStatus(
            'No saved assessment yet. Set MBTI and identity below, click Update preview, then Publish.',
            'err'
          );
          return;
        }

        snap = prepareLoadedSnapshot(snap);
        publishedSnap = JSON.parse(JSON.stringify(snap));
        fillQuickFields(snap);
        writeEditorJson(snap);
        setDirty(false);

        var sparse =
          g.AnimusShared && g.AnimusShared.isSparseProfileSnapshot && g.AnimusShared.isSparseProfileSnapshot(snap);
        if (sparse) {
          setStatus(
            'Loaded partial profile. Set identity fields, use Update preview to fill charts/narratives, then Publish.',
            'err'
          );
        } else {
          setStatus('Loaded. Change identity → Update preview → Publish changes.', 'ok');
        }
        loadTestSessionsForTarget();
        loadEntitlementsIntoForm();
        loadModerationIntoForm();
      })
      .catch(function (e) {
        setStatus(e.message || 'Load failed', 'err');
      });
  }

  function formatSessionWhen(iso) {
    if (!iso) return '—';
    return String(iso).replace('T', ' ').slice(0, 19);
  }

  function renderTestSessions(sessions) {
    var wrap = document.getElementById('adminTestSessionsWrap');
    var list = document.getElementById('adminTestSessionsList');
    if (!wrap || !list) return;

    if (!sessions || !sessions.length) {
      wrap.hidden = false;
      list.innerHTML =
        '<p class="admin-hint">No saved test responses yet. They are stored when the user completes a test while signed in (after this deploy).</p>';
      return;
    }

    wrap.hidden = false;
    var html = '';
    sessions.forEach(function (sess, si) {
      var sum = sess.resultSummary || {};
      var label =
        formatSessionWhen(sess.completedAt) +
        ' · ' +
        (sess.testMode || 'test') +
        ' · ' +
        (sum.mbti || '?') +
        ' ' +
        (sum.ennType || '') +
        'w' +
        (sum.ennWing || '') +
        ' · ' +
        (sess.items ? sess.items.length : 0) +
        ' answers';
      html +=
        '<details class="admin-test-session"' +
        (si === 0 ? ' open' : '') +
        '><summary>' +
        (g.AnimusShared ? g.AnimusShared.escapeHTML(label) : label) +
        '</summary><ol class="admin-test-qa">';
      (sess.items || []).forEach(function (item) {
        var q = item.question || '(question)';
        var a =
          item.answerLabel != null && item.answerLabel !== ''
            ? item.answerLabel
            : item.answerRaw != null
              ? String(item.answerRaw)
              : '—';
        html +=
          '<li><span class="admin-test-q">' +
          (g.AnimusShared ? g.AnimusShared.escapeHTML(q) : q) +
          '</span><span class="admin-test-a">' +
          (g.AnimusShared ? g.AnimusShared.escapeHTML(String(a)) : a) +
          '</span></li>';
      });
      html += '</ol></details>';
    });
    list.innerHTML = html;
  }

  function loadTestSessionsForTarget() {
    if (!targetUid || !g.AnimusShared || !g.AnimusShared.fetchTestSessionsForAdmin) {
      return;
    }
    g.AnimusShared.fetchTestSessionsForAdmin(targetUid, 8)
      .then(renderTestSessions)
      .catch(function () {
        var wrap = document.getElementById('adminTestSessionsWrap');
        if (wrap) wrap.hidden = true;
      });
  }

  function loadMyProfile() {
    if (!adminUid) {
      setStatus('Sign in as admin first', 'err');
      return;
    }
    var uidEl = document.getElementById('adminUid');
    var userEl = document.getElementById('adminUsername');
    if (uidEl) uidEl.value = adminUid;
    if (userEl) userEl.value = '';
    loadProfile();
  }

  function updatePreview() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    try {
      var snap = buildDraftFromEditor();
      snap = syncDraftPanels(snap);
      fillQuickFields(snap);
      writeEditorJson(snap);
      setDirty(true);
      setStatus('Preview updated — charts and narratives match identity fields. Publish to go live.', 'ok');
    } catch (e) {
      setStatus(e.message || 'Preview failed', 'err');
    }
  }

  function verifyPublished(uid, expectedMbti) {
    return db
      .collection('profiles')
      .doc(uid)
      .get()
      .then(function (doc) {
        if (!doc.exists) {
          throw new Error('Verify failed: profile document missing');
        }
        var data = doc.data();
        var latest = data.latest;
        if (!latest || !latest.mbti) {
          throw new Error('Verify failed: latest snapshot missing');
        }
        var got = String(latest.mbti).toUpperCase().trim();
        var want = String(expectedMbti).toUpperCase().trim();
        if (got !== want) {
          throw new Error('Verify failed: Firestore has ' + got + ', expected ' + want);
        }
        if (!latest._typesLocked && !latest.adminEditedAt && !data.adminEditedAt) {
          throw new Error('Verify failed: types lock not stored');
        }
        updatePublishedBanner(data);
        publishedSnap = JSON.parse(JSON.stringify(latest));
        fillQuickFields(latest);
        writeEditorJson(latest);
        return latest;
      });
  }

  function saveProfile() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    var snap;
    try {
      snap = buildDraftFromEditor();
      snap = syncDraftPanels(snap);
    } catch (e) {
      setStatus(e.message || 'Cannot save', 'err');
      return;
    }

    if (!g.AnimusShared || !g.AnimusShared.adminSaveProfileToFirestore) {
      setStatus('Admin save unavailable — reload the page', 'err');
      return;
    }

    setStatus('Publishing to Firestore…');
    var btn = document.getElementById('adminSaveBtn');
    if (btn) btn.disabled = true;

    g.AnimusShared
      .adminSaveProfileToFirestore(targetUid, snap, {
        forceRefreshNarratives: true,
        completedAt: snap.completedAt || new Date().toISOString()
      })
      .then(function (saved) {
        return verifyPublished(targetUid, saved.mbti);
      })
      .then(function (verified) {
        setDirty(false);
        setStatus(
          'Published — verified ' +
            verified.mbti +
            ' on profiles.latest. Profile, compare, and friends will show this.',
          'ok'
        );
      })
      .catch(function (e) {
        setStatus(e.message || 'Save failed. Deploy firestore.rules if editing others.', 'err');
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function reconcileFromCog() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    if (!g.confirm || !g.confirm('Recompute MBTI/Enneagram from stored cognition scores? This removes the admin lock until you publish again.')) {
      return;
    }
    try {
      var snap = parseEditorJson();
      if (!snap.cog || typeof snap.cog !== 'object') {
        setStatus('No cognition scores in snapshot — user must retake the test.', 'err');
        return;
      }
      delete snap._typesLocked;
      delete snap.adminEditedAt;
      if (g.AnimusScoring && g.AnimusScoring.reconcileSnapshotTypes) {
        delete snap._compareDerivedCog;
        snap = g.AnimusScoring.reconcileSnapshotTypes(snap);
      }
      if (g.AnimusShared && g.AnimusShared.refreshSnapshotNarratives) {
        snap = g.AnimusShared.refreshSnapshotNarratives(snap, { force: true });
      }
      fillQuickFields(snap);
      writeEditorJson(snap);
      setDirty(true);
      setStatus(
        'Recomputed ' + snap.mbti + ' / ' + snap.ennType + 'w' + snap.ennWing + ' from cognition. Publish to save.',
        'ok'
      );
    } catch (e) {
      setStatus(e.message || 'Recompute failed', 'err');
    }
  }

  function unlockTypes() {
    try {
      var snap = parseEditorJson();
      delete snap._typesLocked;
      delete snap.adminEditedAt;
      writeEditorJson(snap);
      setDirty(true);
      setStatus('Lock removed in draft only — publish or re-lock before leaving if you want scores to stay fixed.', 'ok');
    } catch (e) {
      setStatus(e.message || 'Invalid JSON', 'err');
    }
  }

  function bindEditorDirtyTracking() {
    var ta = document.getElementById('adminJson');
    if (ta) {
      ta.addEventListener('input', function () {
        setDirty(true);
      });
    }
    [
      'adminMbti', 'adminMbtiName', 'adminEnnType', 'adminEnnWing', 'adminEnnTritype',
      'adminAtt', 'adminPhi', 'adminInst', 'adminSocionics', 'adminKeirsey', 'adminPolX', 'adminPolY'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { setDirty(true); });
    });
  }

  function boot(a, d) {
    auth = a;
    db = d;
    var denied = document.getElementById('adminDenied');
    var app = document.getElementById('adminApp');

    bindEditorDirtyTracking();

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
        adminUid = user.uid;
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

  function loadEntitlementsIntoForm() {
    if (!targetUid) return;
    db.collection('users')
      .doc(targetUid)
      .get()
      .then(function (doc) {
        var ent =
          g.AnimusEntitlements && doc.exists
            ? g.AnimusEntitlements.normalizeUserEntitlements(doc.data())
            : { detailedTest: false, testEstimator: false, animusPlus: false };
        var d = document.getElementById('adminEntDetailed');
        var e = document.getElementById('adminEntEstimator');
        var p = document.getElementById('adminEntPlus');
        if (d) d.checked = !!ent.detailedTest;
        if (e) e.checked = !!ent.testEstimator;
        if (p) p.checked = g.AnimusEntitlements && g.AnimusEntitlements.hasAnimusPlus(doc.data());
      });
  }

  function saveEntitlements() {
    if (!targetUid) {
      setStatus('Load a user first', 'err');
      return;
    }
    var ent = {
      detailedTest: document.getElementById('adminEntDetailed') && document.getElementById('adminEntDetailed').checked,
      testEstimator: document.getElementById('adminEntEstimator') && document.getElementById('adminEntEstimator').checked,
      animusPlus: document.getElementById('adminEntPlus') && document.getElementById('adminEntPlus').checked,
      animusPlusUntil: null
    };
    if (ent.animusPlus) {
      var until = new Date();
      until.setMonth(until.getMonth() + 1);
      ent.animusPlusUntil = until.toISOString();
    }
    db.collection('users')
      .doc(targetUid)
      .set(
        {
          entitlements: ent,
          entitlementsGrantedAt: firebase.firestore.FieldValue.serverTimestamp(),
          entitlementsGrantedBy: adminUid || 'admin'
        },
        { merge: true }
      )
      .then(function () {
        setStatus('Entitlements saved for user.', 'ok');
      })
      .catch(function (e) {
        setStatus(e.message || 'Could not save entitlements', 'err');
      });
  }

  g.AnimusAdmin = {
    boot: boot,
    loadAccount: loadAccount,
    loadProfile: loadProfile,
    loadMyProfile: loadMyProfile,
    updatePreview: updatePreview,
    saveProfile: saveProfile,
    reconcileFromCog: reconcileFromCog,
    unlockTypes: unlockTypes,
    saveEntitlements: saveEntitlements,
    banUser: banUser,
    unbanUser: unbanUser,
    changeUsername: changeUsername
  };
})(typeof window !== 'undefined' ? window : globalThis);
