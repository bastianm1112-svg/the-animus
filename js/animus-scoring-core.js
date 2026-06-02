/**
 * Shared MBTI / Enneagram scoring (browser + Node). Single source of truth.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AnimusScoring = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MBTI_STACKS = {
    INTJ: ['Ni', 'Te', 'Fi', 'Se'],
    INTP: ['Ti', 'Ne', 'Si', 'Fe'],
    INFJ: ['Ni', 'Fe', 'Ti', 'Se'],
    INFP: ['Fi', 'Ne', 'Si', 'Te'],
    ENTJ: ['Te', 'Ni', 'Se', 'Fi'],
    ENTP: ['Ne', 'Ti', 'Fe', 'Si'],
    ENFJ: ['Fe', 'Ni', 'Se', 'Ti'],
    ENFP: ['Ne', 'Fi', 'Te', 'Si'],
    ISTJ: ['Si', 'Te', 'Fi', 'Ne'],
    ISFJ: ['Si', 'Fe', 'Ti', 'Ne'],
    ESTJ: ['Te', 'Si', 'Ne', 'Fi'],
    ESFJ: ['Fe', 'Si', 'Ne', 'Ti'],
    ISTP: ['Ti', 'Se', 'Ni', 'Fe'],
    ISFP: ['Fi', 'Se', 'Ni', 'Te'],
    ESTP: ['Se', 'Ti', 'Fe', 'Ni'],
    ESFP: ['Se', 'Fi', 'Te', 'Ni']
  };
  var STACK_W = [4, 3, 2, 1];

  var POPULAR_MBTI = 'ISFJ';
  var POPULAR_ENN_TYPE = '9';
  var POPULAR_ENN_WING = '1';
  var MBTI_TIE_EPS = 0.5;
  var MBTI_STACK_TIE_GAP = 2.5;
  var MBTI_BLUR_PRIOR_BONUS = 0.35;
  /** On near-flat cognition, avoid NT analyst types winning arbitrary ties. */
  var MBTI_BLUR_COG_SPREAD_MAX = 14;
  var MBTI_TIE_NT_PENALTY = 1.2;
  var MBTI_TIE_NT_TYPES = { INTJ: 1, INTP: 1 };
  var ENN_TYPE_TIE_GAP = 2;
  var ENN_WING_TIE_GAP = 1.5;
  var ENN_BLUR_PRIOR_BONUS = 0.35;

  /** Common Enneagram cores per MBTI (research consensus — used only on near-ties). */
  var ENN_PRIORS_BY_MBTI = {
    INTJ: ['5', '1', '3', '6'],
    INTP: ['5', '9', '6', '4'],
    ENTJ: ['8', '3', '1', '5'],
    ENTP: ['7', '8', '3', '5'],
    INFJ: ['4', '1', '2', '5'],
    INFP: ['4', '9', '5', '6'],
    ENFJ: ['2', '3', '1', '9'],
    ENFP: ['7', '4', '2', '3'],
    ISTJ: ['1', '6', '5', '9'],
    ISFJ: ['2', '6', '9', '1'],
    ESTJ: ['1', '3', '8', '6'],
    ESFJ: ['2', '3', '6', '9'],
    ISTP: ['5', '9', '8', '6'],
    ISFP: ['9', '4', '6', '2'],
    ESTP: ['7', '8', '3', '2'],
    ESFP: ['7', '2', '3', '9']
  };

  function mbtiFromDichotomies(cog, fp) {
    var I = ((cog.Si || 50) + (cog.Ni || 50)) / 2;
    var E = ((cog.Se || 50) + (cog.Ne || 50)) / 2;
    var N = ((cog.Ni || 50) + (cog.Ne || 50)) / 2;
    var S = ((cog.Si || 50) + (cog.Se || 50)) / 2;
    var T = ((cog.Ti || 50) + (cog.Te || 50)) / 2;
    var F = ((cog.Fi || 50) + (cog.Fe || 50)) / 2;
    var J = ((cog.Te || 50) + (cog.Fe || 50)) / 2;
    var P = ((cog.Ne || 50) + (cog.Se || 50)) / 2;
    fp = fp || 0;

    function letter(high, low, pos, neg, bit, preferOnBlur) {
      var diff = high - low;
      var ad = Math.abs(diff);
      if (ad >= MBTI_TIE_EPS) return diff > 0 ? pos : neg;
      if (ad < 0.15) return preferOnBlur;
      if (ad >= 0.32) return diff > 0 ? pos : neg;
      var bucket = (fp >> bit) & 9;
      if (bucket < 3) return preferOnBlur;
      return diff >= 0 ? pos : neg;
    }

    return (
      letter(E, I, 'E', 'I', 0, 'I') +
      letter(N, S, 'N', 'S', 1, 'S') +
      letter(T, F, 'T', 'F', 2, 'F') +
      letter(J, P, 'J', 'P', 3, 'J')
    );
  }

  function cogDominantMargin(cog) {
    var fns = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
    var sorted = fns.slice().sort(function (a, b) {
      return (cog[b] || 50) - (cog[a] || 50);
    });
    return {
      topFn: sorted[0],
      secondFn: sorted[1],
      margin: (cog[sorted[0]] || 50) - (cog[sorted[1]] || 50)
    };
  }

  function stackDomConflicts(userDom, typeDom) {
    if ((userDom === 'Se' || userDom === 'Si') && (typeDom === 'Ne' || typeDom === 'Ni')) return true;
    if ((userDom === 'Ne' || userDom === 'Ni') && (typeDom === 'Se' || typeDom === 'Si')) return true;
    if ((userDom === 'Te' || userDom === 'Ti') && (typeDom === 'Fe' || typeDom === 'Fi')) return true;
    if ((userDom === 'Fe' || userDom === 'Fi') && (typeDom === 'Te' || typeDom === 'Ti')) return true;
    return false;
  }

  function domBoostAmount(margin) {
    if (margin < 5) return 0;
    if (margin >= 14) return 12;
    if (margin >= 9) return 8;
    return 4;
  }

  function cogSpread(cog) {
    var vals = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'].map(function (k) {
      return cog[k] != null ? Number(cog[k]) : 50;
    });
    var min = vals[0];
    var max = vals[0];
    vals.forEach(function (v) {
      if (v < min) min = v;
      if (v > max) max = v;
    });
    return max - min;
  }

  function mbtiTieAdjust(type, cog) {
    var adj = type === POPULAR_MBTI ? MBTI_BLUR_PRIOR_BONUS : 0;
    if (cogSpread(cog) < MBTI_BLUR_COG_SPREAD_MAX && MBTI_TIE_NT_TYPES[type]) {
      adj -= MBTI_TIE_NT_PENALTY;
    }
    return adj;
  }

  function getMBTI(cog, fp, withMeta) {
    var domInfo = cogDominantMargin(cog);
    var domBoost = domBoostAmount(domInfo.margin);
    var ranked = [];

    Object.keys(MBTI_STACKS).forEach(function (type) {
      var stack = MBTI_STACKS[type];
      var s = 0;
      stack.forEach(function (fn, i) {
        s += (cog[fn] || 50) * STACK_W[i];
      });
      if (domBoost > 0) {
        if (stack[0] === domInfo.topFn) s += domBoost;
        else if (stack[1] === domInfo.secondFn && !stackDomConflicts(domInfo.topFn, stack[0])) {
          s += Math.round(domBoost * 0.25);
        } else if (stackDomConflicts(domInfo.topFn, stack[0])) {
          s -= Math.round(domBoost * 0.7);
        }
      }
      ranked.push({ type: type, score: s });
    });

    ranked.sort(function (a, b) {
      return b.score - a.score;
    });
    var top = ranked[0].score;
    var tied = ranked.filter(function (r) {
      return r.score >= top - MBTI_STACK_TIE_GAP;
    });

    var mbti;
    var tiedFlag = false;
    var dich;

    if (tied.length === 1) {
      mbti = tied[0].type;
    } else {
      tiedFlag = true;
      dich = mbtiFromDichotomies(cog, fp);
      var hit = null;
      for (var j = 0; j < tied.length; j++) {
        if (tied[j].type === dich) {
          hit = dich;
          break;
        }
      }
      if (hit) mbti = hit;
      else {
        var withPrior = tied.map(function (r) {
          return {
            type: r.type,
            raw: r.score,
            adj: r.score + mbtiTieAdjust(r.type, cog)
          };
        });
        withPrior.sort(function (a, b) {
          return b.adj - a.adj || b.raw - a.raw;
        });
        mbti = withPrior[0].type;
      }
    }

    if (withMeta) {
      return {
        mbti: mbti,
        tied: tiedFlag,
        dich: dich,
        ranked: ranked.slice(0, 5),
        domInfo: domInfo
      };
    }
    return mbti;
  }

  function getEnneagram(eS) {
    var nums = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'];
    var maxVal = -1;
    nums.forEach(function (k) {
      maxVal = Math.max(maxVal, eS[k] || 0);
    });
    var leaders = nums.filter(function (k) {
      return (eS[k] || 0) >= maxVal - ENN_TYPE_TIE_GAP;
    });
    var typeKey;
    if (leaders.length === 1) {
      typeKey = leaders[0];
    } else {
      typeKey = leaders[0];
      var bestAdj = -1;
      leaders.forEach(function (k) {
        var adj = (eS[k] || 0) + (k === 'E' + POPULAR_ENN_TYPE ? ENN_BLUR_PRIOR_BONUS : 0);
        if (adj > bestAdj) {
          bestAdj = adj;
          typeKey = k;
        }
      });
    }
    var type = typeKey.replace('E', '');
    var t = parseInt(type, 10);
    var wL = t === 1 ? 9 : t - 1;
    var wR = t === 9 ? 1 : t + 1;
    var wLScore = eS['E' + wL] || 0;
    var wRScore = eS['E' + wR] || 0;
    var wing;
    if (Math.abs(wLScore - wRScore) < ENN_WING_TIE_GAP) {
      if (t === parseInt(POPULAR_ENN_TYPE, 10)) wing = POPULAR_ENN_WING;
      else wing = wLScore >= wRScore ? String(wL) : String(wR);
    } else {
      wing = wLScore > wRScore ? String(wL) : String(wR);
    }
    var gut = ['E8', 'E9', 'E1'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var heart = ['E2', 'E3', 'E4'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var head = ['E5', 'E6', 'E7'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var tri = [gut, heart, head];
    var mi = tri.indexOf(type);
    if (mi > 0) {
      tri.splice(mi, 1);
      tri.unshift(type);
    }
    return { type: type, wing: wing, tritype: tri.join(''), scores: eS };
  }

  function refineEnneagramForMbti(mbti, enn, eS) {
    mbti = String(mbti || '').toUpperCase();
    enn = enn || { type: '9', wing: '1', tritype: '963' };
    eS = eS || enn.scores || {};
    var priors = ENN_PRIORS_BY_MBTI[mbti];
    if (!priors || priors.indexOf(enn.type) >= 0) return enn;

    var currentScore = eS['E' + enn.type] || 0;
    var bestType = priors[0];
    var bestScore = eS['E' + bestType] || 0;

    priors.forEach(function (p) {
      var sc = eS['E' + p] || 0;
      if (sc > bestScore) {
        bestType = p;
        bestScore = sc;
      }
    });

    var marginToKeepRaw = 4;
    if (enn.type === '2' && priors.indexOf('2') < 0) {
      marginToKeepRaw = 2;
    }
    if (currentScore > bestScore + marginToKeepRaw) {
      return enn;
    }
    if (bestType === enn.type) return enn;

    var t = parseInt(bestType, 10);
    var wL = t === 1 ? 9 : t - 1;
    var wR = t === 9 ? 1 : t + 1;
    var wLScore = eS['E' + wL] || 0;
    var wRScore = eS['E' + wR] || 0;
    var wing =
      Math.abs(wLScore - wRScore) < ENN_WING_TIE_GAP
        ? wLScore >= wRScore
          ? String(wL)
          : String(wR)
        : wLScore > wRScore
          ? String(wL)
          : String(wR);

    var gut = ['E8', 'E9', 'E1'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var heart = ['E2', 'E3', 'E4'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var head = ['E5', 'E6', 'E7'].reduce(function (a, b) {
      return (eS[a] || 0) > (eS[b] || 0) ? a : b;
    }).replace('E', '');
    var tri = [gut, heart, head];
    var mi = tri.indexOf(bestType);
    if (mi > 0) {
      tri.splice(mi, 1);
      tri.unshift(bestType);
    }

    return {
      type: bestType,
      wing: wing,
      tritype: tri.join(''),
      scores: eS,
      _refinedFrom: enn.type + 'w' + enn.wing
    };
  }

  function reconcileSnapshotTypes(snap) {
    if (!snap || !snap.cog || typeof snap.cog !== 'object') return snap;
    var cog = snap.cog;
    var sum = 0;
    var keys = 0;
    ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'].forEach(function (k) {
      if (cog[k] != null) {
        sum += Number(cog[k]) || 0;
        keys++;
      }
    });
    if (keys < 4 || sum < 80) return snap;

    var fp = 0;
    var mbti = getMBTI(cog, fp, false);
    var eS = snap.enn || snap.ennScores || {};
    if (typeof eS === 'object' && Object.keys(eS).length) {
      var enn = getEnneagram(eS);
      enn = refineEnneagramForMbti(mbti, enn, eS);
      snap.mbti = mbti;
      snap.ennType = enn.type;
      snap.ennWing = enn.wing;
      snap.ennTritype = enn.tritype;
      snap._typesReconciledAt = new Date().toISOString();
    } else {
      snap.mbti = mbti;
      snap._typesReconciledAt = new Date().toISOString();
    }
    return snap;
  }

  function pickMcScoreForRaw(q, raw) {
    if (!q.choices || !q.choices.length) return raw;
    var exact = -1;
    for (var i = 0; i < q.choices.length; i++) {
      if (q.choices[i].s === raw) return q.choices[i].s;
    }
    var bestIx = 0;
    var bestDist = 999;
    q.choices.forEach(function (c, ci) {
      var d = Math.abs((c.s || 4) - raw);
      if (d < bestDist) {
        bestDist = d;
        bestIx = ci;
      }
    });
    return q.choices[bestIx].s;
  }

  return {
    MBTI_STACKS: MBTI_STACKS,
    getMBTI: getMBTI,
    getEnneagram: getEnneagram,
    refineEnneagramForMbti: refineEnneagramForMbti,
    reconcileSnapshotTypes: reconcileSnapshotTypes,
    mbtiFromDichotomies: mbtiFromDichotomies,
    pickMcScoreForRaw: pickMcScoreForRaw,
    POPULAR_MBTI: POPULAR_MBTI,
    MBTI_STACK_TIE_GAP: MBTI_STACK_TIE_GAP
  };
});
