/**
 * ANIMUS XP & levels — lightweight retention loop.
 */
(function (g) {
  'use strict';

  var LEVEL_THRESHOLDS = [0, 50, 120, 220, 350, 520, 750, 1050, 1400, 1800, 2300];

  var XP_AWARDS = {
    daily_insight: 5,
    compare: 15,
    test_complete: 40,
    estimator_complete: 25,
    friend_accept: 10,
    friend_request: 5
  };

  function levelFromTotal(total) {
    var level = 1;
    for (var i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      if (total >= LEVEL_THRESHOLDS[i]) level = i + 1;
      else break;
    }
    return Math.min(level, LEVEL_THRESHOLDS.length);
  }

  function xpProgress(total) {
    var level = levelFromTotal(total);
    var floor = LEVEL_THRESHOLDS[level - 1] || 0;
    var ceiling = LEVEL_THRESHOLDS[level] || floor + 500;
    var span = Math.max(1, ceiling - floor);
    return {
      level: level,
      total: total,
      floor: floor,
      ceiling: ceiling,
      pct: Math.min(100, Math.round(((total - floor) / span) * 100))
    };
  }

  function normalizeXp(userData) {
    var xp = (userData && userData.xp) || { total: 0, level: 1 };
    var total = xp.total || 0;
    return { total: total, level: levelFromTotal(total) };
  }

  function awardXp(db, uid, reason, amount) {
    if (!db || !uid) return Promise.resolve(null);
    amount = amount != null ? amount : XP_AWARDS[reason] || 0;
    if (amount <= 0) return Promise.resolve(null);
    var ref = db.collection('users').doc(uid);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (doc) {
        var data = doc.exists ? doc.data() : {};
        var xp = normalizeXp(data);
        var nextTotal = xp.total + amount;
        var next = { total: nextTotal, level: levelFromTotal(nextTotal) };
        tx.set(ref, { xp: next, lastXpReason: reason, lastXpAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return next;
      });
    });
  }

  function renderXpBar(rootEl, userData) {
    if (!rootEl) return;
    var prog = xpProgress(normalizeXp(userData).total);
    rootEl.innerHTML =
      '<div class="xp-bar-wrap">' +
      '<div class="xp-bar-meta"><span class="xp-level">Level ' + prog.level + '</span>' +
      '<span class="xp-points">' + prog.total + ' XP</span></div>' +
      '<div class="xp-bar-track"><div class="xp-bar-fill" style="width:' + prog.pct + '%"></div></div>' +
      '</div>';
  }

  function awardDailyInsightIfNew(db, uid, userData) {
    var today = new Date().toISOString().slice(0, 10);
    if (userData && userData.lastDailyInsight === today) return Promise.resolve();
    return db
      .collection('users')
      .doc(uid)
      .set({ lastDailyInsight: today }, { merge: true })
      .then(function () {
        return awardXp(db, uid, 'daily_insight', 5);
      });
  }

  g.AnimusXp = {
    XP_AWARDS: XP_AWARDS,
    levelFromTotal: levelFromTotal,
    xpProgress: xpProgress,
    normalizeXp: normalizeXp,
    awardXp: awardXp,
    awardDailyInsightIfNew: awardDailyInsightIfNew,
    renderXpBar: renderXpBar
  };
})(typeof window !== 'undefined' ? window : globalThis);
