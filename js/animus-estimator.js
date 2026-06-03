/**
 * Profile estimator — observable behavior only, third-person framing.
 * Results live in users/{uid}/estimations/{id}, not the user's own profile.
 */
(function (g) {
  'use strict';

  var INNER_PATTERNS = [
    /\binner critic\b/i,
    /\binner emotional\b/i,
    /\binner sense\b/i,
    /\binner world\b/i,
    /\bvisceral\b/i,
    /\bwhen you'?re alone\b/i,
    /\byour ideal intellectual\b/i,
    /\brelationship with your personal energy\b/i,
    /\bwho you truly are\b/i,
    /\bwhat you personally value\b/i,
    /\byour inner\b/i,
    /\bhow do you feel\b/i,
    /\bwhat drives you most\b/i,
    /\bfeels like:\b/i,
    /\bideal life has\b/i,
    /\bidentify most with\b/i,
    /\ba place you'?ve been\b/i,
    /\byour strongest predictions\b/i,
    /\bhow your insights\b/i,
    /\bsomething is wrong but you can'?t explain\b/i,
    /\bauthenticity to you\b/i,
    /\bmeaningful to you is\b/i,
    /\bviolates your values\b/i,
    /\bsense of right and wrong comes\b/i,
    /\bbeing liked by others\b/i,
    /\byour memory works\b/i,
    /\brich with layered memories\b/i
  ];

  var OBSERVABLE_FNS = {
    Ni: 1,
    Ne: 1,
    Ti: 1,
    Te: 1,
    Fi: 1,
    Fe: 1,
    Si: 1,
    Se: 1,
    E1: 1,
    E2: 1,
    E3: 1,
    E4: 1,
    E5: 1,
    E6: 1,
    E7: 1,
    E8: 1,
    E9: 1,
    PC_ECON_R: 1,
    PC_ECON_L: 1,
    PC_AUTH: 1,
    PC_LIB: 1,
    AT_SEC: 1,
    AT_ANX: 1,
    AT_AVO: 1,
    AT_DIS: 1,
    IV_SP: 1,
    IV_SOC: 1,
    TMP_CHO: 1,
    TMP_MEL: 1,
    TMP_SAN: 1,
    TMP_PHL: 1
  };

  var escapeHTML = g.AnimusShared.escapeHTML;

  function questionBlob(q) {
    var parts = [q.t || ''];
    if (q.choices) {
      q.choices.forEach(function (c) {
        parts.push(c.t || '');
      });
    }
    return parts.join(' ');
  }

  function isObservableQuestion(q) {
    if (!q || !q.fn || !OBSERVABLE_FNS[q.fn]) return false;
    var blob = questionBlob(q);
    for (var i = 0; i < INNER_PATTERNS.length; i++) {
      if (INNER_PATTERNS[i].test(blob)) return false;
    }
    return true;
  }

  function displayName(name) {
    var n = (name || '').trim();
    return n || 'this person';
  }

  function reframeChoice(text, name) {
    var t = text || '';
    t = t.replace(/\bI\b/g, name);
    t = t.replace(/\bI'm\b/g, name + ' is');
    t = t.replace(/\bI've\b/g, name + ' has');
    t = t.replace(/\bI'd\b/g, name + ' would');
    t = t.replace(/\bmy\b/gi, function (m, off) {
      return off === 0 || /[\s(]/.test(t.charAt(off - 1)) ? name + "'s" : "their";
    });
    t = t.replace(/\bme\b/gi, 'them');
    t = t.replace(/\byou\b/gi, 'them');
    t = t.replace(/\byour\b/gi, 'their');
    return t;
  }

  function reframePrompt(text, name) {
    var subj = displayName(name);
    var t = (text || '').trim();
    if (!t) return t;

    t = t
      .replace(/^When you\b/i, 'When ' + subj)
      .replace(/^How do you\b/i, 'How likely is ' + subj + ' to')
      .replace(/^You tend to\b/i, subj + ' tends to')
      .replace(/^You (feel|trust|prefer|identify|walk|naturally|are more likely)\b/i, subj + ' $1')
      .replace(/^Your\b/i, subj + "'s")
      .replace(/^In a conversation, you\b/i, 'In conversation, ' + subj)
      .replace(/^In an argument\b/i, 'In disagreements, ' + subj)
      .replace(/^Starting something new versus finishing\b/i, subj + ' — starting vs finishing')
      .replace(/^Two unrelated topics\b/i, 'When two unrelated topics come up, ' + subj)
      .replace(/^When someone\b/i, 'When someone interacts with ' + subj + ', they');

    t = reframeChoice(t, subj);

    if (t.indexOf('How likely is') !== 0 && t.indexOf('When ' + subj) !== 0) {
      t = 'Based on what you have seen, how likely is ' + subj + ' to: ' + t.charAt(0).toLowerCase() + t.slice(1);
    }
    if (t.charAt(t.length - 1) !== '?') t += '?';
    return t;
  }

  function localizeObserver(loc, q, subjectName) {
    var out = {
      text: reframePrompt(loc.text || q.t, subjectName),
      explain: loc.explain ? reframePrompt(loc.explain, subjectName) : '',
      sec: loc.sec || q.sec,
      lo: loc.lo,
      hi: loc.hi,
      opts: loc.opts ? loc.opts.slice() : loc.opts,
      choices: []
    };
    var src = loc.choices && loc.choices.length ? loc.choices : null;
    if (src) {
      out.choices = src.map(function (c) {
        return {
          letter: c.letter,
          text: reframeChoice(c.text, displayName(subjectName)),
          score: c.score
        };
      });
    } else if (q.choices) {
      out.choices = q.choices.map(function (c) {
        return {
          letter: c.l,
          text: reframeChoice(c.t, displayName(subjectName)),
          score: c.s
        };
      });
    }
    return out;
  }

  function createEstimation(db, uid, subjectName) {
    var ref = db.collection('users').doc(uid).collection('estimations').doc();
    var payload = {
      subjectName: String(subjectName || '').trim().substring(0, 64) || 'Someone',
      status: 'draft',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return ref.set(payload).then(function () {
      return ref.id;
    });
  }

  function saveEstimationResult(db, uid, estId, snapshot, meta) {
    meta = meta || {};
    var ref = db.collection('users').doc(uid).collection('estimations').doc(estId);
    var summary = {
      mbti: snapshot.mbti || '',
      ennType: snapshot.ennType || '',
      ennWing: snapshot.ennWing || '',
      att: snapshot.att || '',
      phi: snapshot.phi || '',
      tagline: snapshot.tagline || '',
      mbtiName: snapshot.mbtiName || ''
    };
    return ref.set(
      {
        subjectName: meta.subjectName || snapshot.subjectName || '',
        status: 'complete',
        snapshot: snapshot,
        summary: summary,
        completedAt: meta.completedAt || snapshot.completedAt || new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        answerCount: meta.answerCount || snapshot.answerCount || 0,
        testMode: 'estimator'
      },
      { merge: true }
    );
  }

  function listEstimations(db, uid, limit) {
    limit = limit || 40;
    return db
      .collection('users')
      .doc(uid)
      .collection('estimations')
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();
  }

  function testUrl(estId, subjectName) {
    var q =
      '/test?mode=estimator&estimation=' +
      encodeURIComponent(estId) +
      '&name=' +
      encodeURIComponent(String(subjectName || '').trim().substring(0, 64));
    return q;
  }

  g.AnimusEstimator = {
    isObservableQuestion: isObservableQuestion,
    localizeObserver: localizeObserver,
    reframePrompt: reframePrompt,
    createEstimation: createEstimation,
    saveEstimationResult: saveEstimationResult,
    listEstimations: listEstimations,
    testUrl: testUrl,
    escapeHTML: escapeHTML,
    displayName: displayName
  };
})(typeof window !== 'undefined' ? window : globalThis);
