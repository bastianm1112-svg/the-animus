/**
 * Node scoring mirror for psyche-engine (bias tests / CI).
 * Keep in sync with js/psyche-engine.js getMBTI + scoreContributionBuckets.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/psyche-questions.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/psyche-cross.js'), 'utf8'), ctx);
const Q = ctx.window.AnimusQuestions.Q;
const Cross = ctx.window.AnimusCross || {};
if (Cross.applyChoicePatches) Cross.applyChoicePatches(Q);

const MBTI_STACKS = {
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
const STACK_W = [4, 3, 2, 1];
const MBTI_TIE_EPS = 0.5;
const MBTI_STACK_TIE_GAP = 0.5;
const MBTI_BLUR_PRIOR_BONUS = 0.35;
const POPULAR_MBTI = 'ISFJ';
const ENN_TYPE_TIE_GAP = 2;
const ENN_WING_TIE_GAP = 1.5;
const ENN_BLUR_PRIOR_BONUS = 0.5;
const POPULAR_ENN_TYPE = '9';
const POPULAR_ENN_WING = '1';

function answerFingerprint(answers) {
  let h = 2166136261;
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] !== null && answers[i] !== undefined) {
      h ^= answers[i] + i * 17;
      h = Math.imul(h, 16777619);
    }
  }
  return Math.abs(h);
}

function mbtiFromDichotomies(cog, fp) {
  const I = ((cog.Si || 50) + (cog.Ni || 50)) / 2;
  const E = ((cog.Se || 50) + (cog.Ne || 50)) / 2;
  const N = ((cog.Ni || 50) + (cog.Ne || 50)) / 2;
  const S = ((cog.Si || 50) + (cog.Se || 50)) / 2;
  const T = ((cog.Ti || 50) + (cog.Te || 50)) / 2;
  const F = ((cog.Fi || 50) + (cog.Fe || 50)) / 2;
  const J = ((cog.Te || 50) + (cog.Fe || 50) + (cog.Si || 50)) / 3;
  const P = ((cog.Ti || 50) + (cog.Fi || 50) + (cog.Ne || 50) + (cog.Se || 50)) / 4;

  function letter(high, low, pos, neg, bit, preferOnBlur) {
    const diff = high - low;
    const ad = Math.abs(diff);
    if (ad >= MBTI_TIE_EPS) return diff > 0 ? pos : neg;
    if (ad < 0.12) return preferOnBlur;
    if (ad >= 0.28) return diff > 0 ? pos : neg;
    const bucket = (fp >> bit) & 9;
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
  const fns = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
  const sorted = fns.slice().sort((a, b) => (cog[b] || 50) - (cog[a] || 50));
  const top = cog[sorted[0]] || 50;
  const second = cog[sorted[1]] || 50;
  return { topFn: sorted[0], secondFn: sorted[1], margin: top - second };
}

function stackDomConflicts(userDom, typeDom) {
  if ((userDom === 'Se' || userDom === 'Si') && (typeDom === 'Ne' || typeDom === 'Ni')) return true;
  if ((userDom === 'Ne' || userDom === 'Ni') && (typeDom === 'Se' || typeDom === 'Si')) return true;
  if ((userDom === 'Te' || userDom === 'Ti') && (typeDom === 'Fe' || typeDom === 'Fi')) return true;
  if ((userDom === 'Fe' || userDom === 'Fi') && (typeDom === 'Te' || typeDom === 'Ti')) return true;
  return false;
}

function getMBTI(cog, fp) {
  const domInfo = cogDominantMargin(cog);
  const lead = domInfo.topFn;
  const isSensing = lead === 'Se' || lead === 'Si';
  const isIntuitive = lead === 'Ne' || lead === 'Ni';
  const isThinking = lead === 'Te' || lead === 'Ti';
  const isFeeling = lead === 'Fe' || lead === 'Fi';
  let domBoost = domInfo.margin >= 10 ? 52 : domInfo.margin >= 6 ? 34 : domInfo.margin >= 3 ? 22 : 0;
  if ((isSensing || isIntuitive) && domInfo.margin >= 3) domBoost = Math.max(domBoost, 38);
  if ((isThinking || isFeeling) && domInfo.margin >= 3) domBoost = Math.max(domBoost, 30);
  const ranked = [];
  Object.keys(MBTI_STACKS).forEach((type) => {
    const stack = MBTI_STACKS[type];
    let s = 0;
    stack.forEach((fn, i) => {
      s += (cog[fn] || 50) * STACK_W[i];
    });
    if (domBoost > 0) {
      if (stack[0] === domInfo.topFn) s += domBoost;
      else if (stack[1] === domInfo.secondFn && !stackDomConflicts(domInfo.topFn, stack[0])) {
        s += Math.round(domBoost * 0.22);
      } else if (stackDomConflicts(domInfo.topFn, stack[0])) {
        s -= Math.round(domBoost * 0.85);
      }
    }
    ranked.push({ type, score: s });
  });
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked[0].score;
  const tied = ranked.filter((r) => r.score >= top - MBTI_STACK_TIE_GAP);
  if (tied.length === 1) {
    return { mbti: tied[0].type, tied: false, ranked: ranked.slice(0, 4) };
  }
  const dich = mbtiFromDichotomies(cog, fp);
  const hit = tied.find((t) => t.type === dich);
  if (hit) return { mbti: hit.type, tied: true, dich, ranked: ranked.slice(0, 4) };
  const withPrior = tied
    .map((r) => ({
      type: r.type,
      raw: r.score,
      adj: r.score + (r.type === POPULAR_MBTI ? MBTI_BLUR_PRIOR_BONUS : 0)
    }))
    .sort((a, b) => b.adj - a.adj || b.raw - a.raw);
  return {
    mbti: withPrior[0].type,
    tied: true,
    dich,
    ranked: ranked.slice(0, 4)
  };
}

function getEnneagram(eS) {
  const nums = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'];
  let max = -1;
  nums.forEach((k) => {
    max = Math.max(max, eS[k] || 0);
  });
  const leaders = nums.filter((k) => (eS[k] || 0) >= max - ENN_TYPE_TIE_GAP);
  let typeKey;
  if (leaders.length === 1) {
    typeKey = leaders[0];
  } else {
    typeKey = leaders[0];
    let bestAdj = -1;
    leaders.forEach((k) => {
      const adj = (eS[k] || 0) + (k === 'E' + POPULAR_ENN_TYPE ? ENN_BLUR_PRIOR_BONUS : 0);
      if (adj > bestAdj) {
        bestAdj = adj;
        typeKey = k;
      }
    });
  }
  const type = typeKey.replace('E', '');
  const t = parseInt(type, 10);
  const wL = t === 1 ? 9 : t - 1;
  const wR = t === 9 ? 1 : t + 1;
  const wLScore = eS['E' + wL] || 0;
  const wRScore = eS['E' + wR] || 0;
  let wing;
  if (Math.abs(wLScore - wRScore) < ENN_WING_TIE_GAP) {
    if (t === parseInt(POPULAR_ENN_TYPE, 10)) wing = POPULAR_ENN_WING;
    else wing = wLScore >= wRScore ? String(wL) : String(wR);
  } else {
    wing = wLScore > wRScore ? String(wL) : String(wR);
  }
  return { type, wing };
}

function getAttachment(atS) {
  const types = ['AT_SEC', 'AT_ANX', 'AT_AVO', 'AT_DIS'];
  let best = types[0];
  let bestVal = atS[best] || 0;
  types.forEach((k) => {
    const v = atS[k] || 0;
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  });
  if (best !== 'AT_SEC' && bestVal - (atS.AT_SEC || 0) < 8) return 'AT_SEC';
  return best;
}

function valFromRaw(raw) {
  return ((raw - 1) / 6) * 100;
}

function scoreContributionBuckets(activeQ, answers, choiceIx) {
  const buckets = {};
  const FN_ALSO = Cross.FN_ALSO || {};
  const DERIVED_FN = Cross.DERIVED_FN || {};

  function add(fn, val, weight) {
    if (val === null || val === undefined || Number.isNaN(val)) return;
    weight = weight || 1;
    if (!buckets[fn]) buckets[fn] = { sum: 0, w: 0 };
    buckets[fn].sum += val * weight;
    buckets[fn].w += weight;
  }

  activeQ.forEach((q, i) => {
    const raw = answers[i];
    if (raw === null || raw === undefined) return;
    const val = valFromRaw(raw);
    add(q.fn, val, 1);
    if (q.also) {
      Object.keys(q.also).forEach((k) => add(k, val, q.also[k]));
    }
    (FN_ALSO[q.fn] || []).forEach((x) => add(x.fn, val, x.w));
    if (q.type === 'mc' && q.choices && choiceIx[i] >= 0) {
      const choice = q.choices[choiceIx[i]];
      if (choice && choice.also) {
        Object.keys(choice.also).forEach((k) => add(k, valFromRaw(choice.also[k]), 0.7));
      }
    }
  });

  function finalize(fn) {
    if (!buckets[fn] || buckets[fn].w < 0.01) {
      const derived = DERIVED_FN[fn];
      if (derived) {
        derived.forEach((x) => {
          if (buckets[x.fn] && buckets[x.fn].w > 0) {
            add(fn, buckets[x.fn].sum / buckets[x.fn].w, x.w);
          }
        });
      }
    }
    if (!buckets[fn] || buckets[fn].w < 0.01) return 50;
    return Math.round(buckets[fn].sum / buckets[fn].w);
  }

  return { finalize };
}

function scoreFull(activeQ, answers, choiceIx) {
  const scored = scoreContributionBuckets(activeQ, answers, choiceIx || []);
  const avg = (fn) => scored.finalize(fn);
  const cog = {};
  ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'].forEach((f) => {
    cog[f] = avg(f);
  });
  const eS = {};
  ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'].forEach((e) => {
    eS[e] = avg(e);
  });
  const atS = {};
  ['AT_SEC', 'AT_ANX', 'AT_AVO', 'AT_DIS'].forEach((a) => {
    atS[a] = avg(a);
  });
  const fp = answerFingerprint(answers);
  const mbtiResult = getMBTI(cog, fp);
  const enn = getEnneagram(eS);
  const att = getAttachment(atS);
  const econL = avg('PC_ECON_L');
  const econR = avg('PC_ECON_R');
  const auth = avg('PC_AUTH');
  const lib = avg('PC_LIB');
  const polX = Math.max(-100, Math.min(100, Math.round(econR - econL)));
  const polY = Math.max(-100, Math.min(100, Math.round(auth - lib)));

  return {
    mbti: mbtiResult.mbti,
    mbtiMeta: mbtiResult,
    cog,
    enn,
    ennScores: eS,
    att,
    polX,
    polY,
    fp
  };
}

function shuffle(arr, seed) {
  let s = seed != null ? seed : Date.now();
  function rnd() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SHORT_ALLOC = {
  Ni: 4,
  Ne: 4,
  Ti: 4,
  Te: 4,
  Fi: 4,
  Fe: 4,
  Si: 4,
  Se: 4,
  E1: 1,
  E2: 1,
  E3: 1,
  E4: 1,
  E5: 1,
  E6: 1,
  E7: 1,
  E8: 1,
  E9: 1,
  PC_ECON_R: 3,
  PC_ECON_L: 3,
  PC_AUTH: 3,
  PC_LIB: 3,
  PH_NIE: 1,
  PH_STO: 1,
  PH_KAN: 1,
  PH_ARI: 1,
  PH_EXI: 1,
  PH_EPI: 1,
  PH_PRA: 1,
  PH_SKE: 1,
  ET_VIR: 1,
  ET_CON: 1,
  ET_DEO: 1,
  ET_EGO: 1,
  AT_SEC: 3,
  AT_ANX: 3,
  AT_AVO: 3,
  AT_DIS: 3,
  IV_SP: 1,
  IV_SOC: 1,
  IV_SX: 1,
  EP_RAT: 1,
  EP_EMP: 1,
  EP_INT: 1,
  EP_SKP: 1,
  MF_CARE: 1,
  MF_FAIR: 1,
  MF_LOY: 1,
  MF_AUTH: 1,
  MF_PUR: 1,
  MF_LIB: 1,
  TMP_CHO: 1,
  TMP_MEL: 1,
  TMP_SAN: 1,
  TMP_PHL: 1,
  SOC_DOM: 1,
  SOC_INT: 1,
  SOC_WAR: 1,
  SOC_DIR: 1,
  AL_INT: 1,
  AL_SEN: 1
};

function buildShortActiveQ(seed) {
  const byFnMC = {};
  const byFnS = {};
  Q.forEach((q) => {
    if (q.type === 'mc') {
      if (!byFnMC[q.fn]) byFnMC[q.fn] = [];
      byFnMC[q.fn].push(q);
    } else {
      if (!byFnS[q.fn]) byFnS[q.fn] = [];
      byFnS[q.fn].push(q);
    }
  });
  let activeQ = [];
  Object.keys(SHORT_ALLOC).forEach((fn) => {
    const alloc = SHORT_ALLOC[fn];
    const mcPool = (byFnMC[fn] || []).slice();
    shuffle(mcPool, seed);
    const sPool = (byFnS[fn] || []).slice();
    shuffle(sPool, seed + 1);
    const mcCount = Math.floor(alloc / 2);
    const sCount = alloc - mcCount;
    activeQ = activeQ.concat(mcPool.slice(0, mcCount));
    activeQ = activeQ.concat(sPool.slice(0, sCount));
  });
  shuffle(activeQ, (seed || 0) + 2);
  return activeQ;
}

function pickForTargets(q, targets, defaultScore) {
  defaultScore = defaultScore == null ? 4 : defaultScore;
  const want = targets[q.fn];
  const low = targets['!' + q.fn];
  if (q.type === 'mc' && q.choices && q.choices.length) {
    let bestIx = 0;
    let bestScore = -Infinity;
    q.choices.forEach((c, ci) => {
      let sc = 0;
      if (want != null) sc += (7 - Math.abs((c.s || 4) - want)) * 10;
      else if (low != null) sc += Math.abs((c.s || 4) - low) * 10;
      else sc = -(Math.abs((c.s || 4) - defaultScore));
      if (c.also) {
        Object.keys(c.also).forEach((k) => {
          const w = targets[k];
          if (w != null) sc += (7 - Math.abs(c.also[k] - w)) * 5;
        });
      }
      if (targets[q.fn] != null) sc += (7 - Math.abs((c.s || 4) - targets[q.fn])) * 3;
      if (sc > bestScore) {
        bestScore = sc;
        bestIx = ci;
      }
    });
    return q.choices[bestIx].s;
  }
  if (want != null) return want;
  if (low != null) return low;
  return defaultScore;
}

function buildFullActiveQ() {
  return shuffle(Q.slice());
}

function runPattern(activeQ, pickAnswer) {
  const answers = [];
  const choiceIx = [];
  activeQ.forEach((q, i) => {
    const raw = pickAnswer(q, i);
    answers.push(raw);
    if (q.type === 'mc' && q.choices && q.choices.length) {
      let ix = q.choices.findIndex((c) => c.s === raw);
      if (ix < 0) {
        ix = 0;
        let best = -1;
        q.choices.forEach((c, ci) => {
          if (c.s > best) {
            best = c.s;
            ix = ci;
          }
        });
      }
      choiceIx.push(ix);
    } else {
      choiceIx.push(-1);
    }
  });
  return scoreFull(activeQ, answers, choiceIx);
}

const ESFP_TARGET = { Se: 7, Fi: 7, Te: 6, Ni: 1, Ne: 3, Si: 4, Fe: 5, Ti: 2 };

function pickEsfp(q) {
  if (q.type === 'mc' && q.choices && q.choices.length) {
    let bestIx = 0;
    let bestScore = -Infinity;
    q.choices.forEach((c, ci) => {
      let sc = c.s || 0;
      if (ESFP_TARGET[q.fn]) sc += ESFP_TARGET[q.fn];
      if (c.also) {
        Object.keys(c.also).forEach((k) => {
          if (ESFP_TARGET[k]) sc += ESFP_TARGET[k] * 0.5;
        });
      }
      if (sc > bestScore) {
        bestScore = sc;
        bestIx = ci;
      }
    });
    return q.choices[bestIx].s;
  }
  if (ESFP_TARGET[q.fn]) return ESFP_TARGET[q.fn];
  return 4;
}

module.exports = {
  Q,
  scoreFull,
  runPattern,
  buildShortActiveQ,
  buildFullActiveQ,
  pickEsfp,
  pickForTargets,
  getMBTI,
  mbtiFromDichotomies,
  answerFingerprint
};
