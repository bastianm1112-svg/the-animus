/**
 * Shared test scoring (browser + Node). Reverse keys, missing answers,
 * version stamps. Client may preview; persisted results should come from
 * POST /api/submit-test.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusTestScore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var QUICK_ALLOC = {
    Ni: 3, Ne: 3, Ti: 3, Te: 3, Fi: 3, Fe: 3, Si: 3, Se: 3,
    PC_ECON_R: 3, PC_ECON_L: 3, PC_AUTH: 3, PC_LIB: 3,
    AT_SEC: 2, AT_ANX: 2, AT_AVO: 1, AT_DIS: 1,
    E1: 1, E2: 1, E3: 1, E4: 1, E5: 1, E6: 1, E7: 1, E9: 1
  };

  var MIN_ITEMS_PER_FN = 1;

  function versions() {
    if (typeof AnimusVersions !== 'undefined') return AnimusVersions;
    try {
      return require('./animus-versions.js');
    } catch (e) {
      return { BANK_VERSION: '2026.08.16', SCORING_VERSION: '2026.08.16' };
    }
  }

  function scoringCore() {
    if (typeof AnimusScoring !== 'undefined') return AnimusScoring;
    try {
      return require('./animus-scoring-core.js');
    } catch (e) {
      return null;
    }
  }

  function ensureIds(questions) {
    (questions || []).forEach(function (q, i) {
      if (!q.id) q.id = 'q' + i;
    });
    return questions;
  }

  function valFromRaw(q, raw) {
    if (raw === null || raw === undefined) return null;
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 7) return null;
    var val = ((n - 1) / 6) * 100;
    if (q && q.rev) val = 100 - val;
    return val;
  }

  function answerFingerprint(answers) {
    var h = 2166136261;
    for (var i = 0; i < answers.length; i++) {
      if (answers[i] !== null && answers[i] !== undefined) {
        h ^= answers[i] + i * 17;
        h = Math.imul(h, 16777619);
      }
    }
    return Math.abs(h);
  }

  function scoreContributionBuckets(activeQ, answers, choiceIx, cross) {
    var buckets = {};
    var counts = {};
    var FN_ALSO = (cross && cross.FN_ALSO) || {};
    var DERIVED_FN = (cross && cross.DERIVED_FN) || {};

    function add(fn, val, weight) {
      if (val === null || val === undefined || isNaN(val)) return;
      weight = weight || 1;
      if (!buckets[fn]) buckets[fn] = { sum: 0, w: 0 };
      buckets[fn].sum += val * weight;
      buckets[fn].w += weight;
    }

    (activeQ || []).forEach(function (q, i) {
      var raw = answers[i];
      if (raw === null || raw === undefined) return;
      var val = valFromRaw(q, raw);
      if (val === null) return;
      counts[q.fn] = (counts[q.fn] || 0) + 1;
      add(q.fn, val, 1);
      if (q.also) {
        Object.keys(q.also).forEach(function (k) {
          add(k, val, q.also[k]);
        });
      }
      (FN_ALSO[q.fn] || []).forEach(function (x) {
        add(x.fn, val, x.w);
      });
      if (q.type === 'mc' && q.choices && choiceIx && choiceIx[i] >= 0) {
        var choice = q.choices[choiceIx[i]];
        if (choice && choice.also) {
          Object.keys(choice.also).forEach(function (k) {
            add(k, valFromRaw({ rev: false }, choice.also[k]), 0.7);
          });
        }
      }
    });

    function finalize(fn) {
      if (!buckets[fn] || buckets[fn].w < 0.01) {
        var derived = DERIVED_FN[fn];
        if (derived) {
          derived.forEach(function (x) {
            if (buckets[x.fn] && buckets[x.fn].w > 0) {
              add(fn, buckets[x.fn].sum / buckets[x.fn].w, x.w);
            }
          });
        }
      }
      if (!buckets[fn] || buckets[fn].w < 0.01) return 50;
      return Math.round(buckets[fn].sum / buckets[fn].w);
    }

    return { buckets: buckets, counts: counts, finalize: finalize };
  }

  function clampPol(n) {
    return Math.max(-100, Math.min(100, Math.round(n)));
  }

  function getAttachment(atS) {
    var types = ['AT_SEC', 'AT_ANX', 'AT_AVO', 'AT_DIS'];
    var best = types[0];
    var bestVal = atS[best] || 0;
    types.forEach(function (k) {
      var v = atS[k] || 0;
      if (v > bestVal) {
        bestVal = v;
        best = k;
      }
    });
    if (best !== 'AT_SEC' && bestVal - (atS.AT_SEC || 0) < 8) return 'AT_SEC';
    return best;
  }

  function getPhilosophy(phS) {
    var types = ['PH_STO', 'PH_EPI', 'PH_KAN', 'PH_ARI', 'PH_NIE', 'PH_EXI', 'PH_PRA', 'PH_SKE'];
    return types.reduce(function (a, b) {
      return (phS[a] || 0) >= (phS[b] || 0) ? a : b;
    }, types[0]);
  }

  function getInstinctStack(ivS) {
    var order = Object.keys(ivS).sort(function (a, b) {
      return (ivS[b] || 0) - (ivS[a] || 0);
    });
    return order.map(function (k) {
      return k.replace('IV_', '');
    }).join('/');
  }

  function scoreFull(activeQ, answers, choiceIx, cross) {
    var Scoring = scoringCore();
    var scored = scoreContributionBuckets(activeQ, answers, choiceIx || [], cross || {});
    function avg(fn) {
      return scored.finalize(fn);
    }
    var incomplete = [];
    Object.keys(scored.counts).forEach(function () {});
    var needed = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se', 'PC_ECON_L', 'PC_ECON_R', 'PC_AUTH', 'PC_LIB'];
    needed.forEach(function (fn) {
      if ((scored.counts[fn] || 0) < MIN_ITEMS_PER_FN) incomplete.push(fn);
    });

    var cog = {};
    ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'].forEach(function (f) {
      cog[f] = avg(f);
    });
    var eS = {};
    ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'].forEach(function (e) {
      eS[e] = avg(e);
    });
    var atS = {};
    ['AT_SEC', 'AT_ANX', 'AT_AVO', 'AT_DIS'].forEach(function (a) {
      atS[a] = avg(a);
    });
    var phS = {};
    ['PH_STO', 'PH_EPI', 'PH_KAN', 'PH_ARI', 'PH_NIE', 'PH_EXI', 'PH_PRA', 'PH_SKE'].forEach(function (p) {
      phS[p] = avg(p);
    });
    var ivS = {};
    ['IV_SP', 'IV_SOC', 'IV_SX'].forEach(function (v) {
      ivS[v] = avg(v);
    });
    var epS = {};
    ['EP_RAT', 'EP_EMP', 'EP_INT', 'EP_SKP'].forEach(function (e) {
      epS[e] = avg(e);
    });
    var etS = {};
    ['ET_VIR', 'ET_CON', 'ET_DEO', 'ET_EGO'].forEach(function (e) {
      etS[e] = avg(e);
    });
    var mfS = {};
    ['MF_CARE', 'MF_FAIR', 'MF_LOY', 'MF_AUTH', 'MF_PUR', 'MF_LIB'].forEach(function (m) {
      mfS[m] = avg(m);
    });
    var tmpS = {};
    ['TMP_CHO', 'TMP_MEL', 'TMP_SAN', 'TMP_PHL'].forEach(function (t) {
      tmpS[t] = avg(t);
    });
    var socS = {};
    ['SOC_DOM', 'SOC_INT', 'SOC_WAR', 'SOC_DIR'].forEach(function (s) {
      socS[s] = avg(s);
    });
    var alS = {};
    ['AL_INT', 'AL_SEN'].forEach(function (a) {
      alS[a] = avg(a);
    });

    var fp = answerFingerprint(answers);
    var mbtiResult = Scoring && Scoring.getMBTI
      ? Scoring.getMBTI(cog, fp, true)
      : { mbti: 'ISFJ' };
    var mbti = typeof mbtiResult === 'string' ? mbtiResult : mbtiResult.mbti;
    var enn = Scoring && Scoring.getEnneagram ? Scoring.getEnneagram(eS) : { type: '9', wing: '1' };
    if (Scoring && Scoring.refineEnneagramForMbti) {
      enn = Scoring.refineEnneagramForMbti(mbti, enn, eS);
    }
    var ver = versions();
    return {
      cog: cog,
      ennScores: eS,
      attScores: atS,
      phiScores: phS,
      ep: epS,
      eth: etS,
      mf: mfS,
      tmp: tmpS,
      iv: ivS,
      soc: socS,
      alone: alS,
      mbti: mbti,
      ennResult: enn,
      att: getAttachment(atS),
      phi: getPhilosophy(phS),
      instStack: getInstinctStack(ivS),
      polX: clampPol(avg('PC_ECON_R') - avg('PC_ECON_L')),
      polY: clampPol(avg('PC_AUTH') - avg('PC_LIB')),
      incomplete: incomplete,
      bankVersion: ver.BANK_VERSION,
      scoringVersion: ver.SCORING_VERSION,
      fp: fp
    };
  }

  function questionIndex(questions) {
    var map = {};
    ensureIds(questions).forEach(function (q) {
      map[q.id] = q;
    });
    return map;
  }

  function validatePayload(questions, items, testMode) {
    var byId = questionIndex(questions);
    var allowedModes = { quick: 1, short: 1, full: 1, estimator: 1 };
    if (!allowedModes[testMode]) return { error: 'Invalid test mode' };
    if (!Array.isArray(items) || !items.length) return { error: 'Missing answers' };
    if (items.length > 320) return { error: 'Too many answers' };
    var seen = {};
    var activeQ = [];
    var answers = [];
    var choiceIx = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var id = String(it.id || '');
      if (!id || !byId[id]) return { error: 'Unknown question', id: id };
      if (seen[id]) return { error: 'Duplicate question', id: id };
      seen[id] = true;
      var q = byId[id];
      var raw = it.raw;
      if (raw === null || raw === undefined) {
        activeQ.push(q);
        answers.push(null);
        choiceIx.push(-1);
        continue;
      }
      var n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 7) return { error: 'Invalid answer', id: id };
      activeQ.push(q);
      answers.push(n);
      var ci = it.choiceIx;
      if (q.type === 'mc') {
        if (ci == null || ci < 0 || !q.choices || ci >= q.choices.length) {
          return { error: 'Invalid choice', id: id };
        }
        choiceIx.push(ci);
      } else {
        choiceIx.push(-1);
      }
    }
    return { activeQ: activeQ, answers: answers, choiceIx: choiceIx };
  }

  return {
    QUICK_ALLOC: QUICK_ALLOC,
    ensureIds: ensureIds,
    valFromRaw: valFromRaw,
    scoreContributionBuckets: scoreContributionBuckets,
    scoreFull: scoreFull,
    validatePayload: validatePayload,
    questionIndex: questionIndex,
    answerFingerprint: answerFingerprint
  };
});
