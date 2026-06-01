// Simulate scoring for neutrality and axis extremes (short test allocation)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const qPath = path.join(__dirname, '../js/psyche-questions.js');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(qPath, 'utf8'), ctx);
const Q = ctx.window.AnimusQuestions.Q;

const SHORT_ALLOC = {
  Ni: 4, Ne: 4, Ti: 4, Te: 4, Fi: 4, Fe: 4, Si: 4, Se: 4,
  E1: 1, E2: 1, E3: 1, E4: 1, E5: 1, E6: 1, E7: 1, E8: 1, E9: 1,
  PC_ECON_R: 3, PC_ECON_L: 3, PC_AUTH: 3, PC_LIB: 3,
  PH_NIE: 1, PH_STO: 1, PH_KAN: 1, PH_ARI: 1, PH_EXI: 1, PH_EPI: 1, PH_PRA: 1, PH_SKE: 1,
  ET_VIR: 1, ET_CON: 1, ET_DEO: 1, ET_EGO: 1,
  AT_SEC: 3, AT_ANX: 3, AT_AVO: 3, AT_DIS: 3,
  IV_SP: 1, IV_SOC: 1, IV_SX: 1,
  EP_RAT: 1, EP_EMP: 1, EP_INT: 1, EP_SKP: 1,
  MF_CARE: 1, MF_FAIR: 1, MF_LOY: 1, MF_AUTH: 1, MF_PUR: 1, MF_LIB: 1,
  TMP_CHO: 1, TMP_MEL: 1, TMP_SAN: 1, TMP_PHL: 1,
  SOC_DOM: 1, SOC_INT: 1, SOC_WAR: 1, SOC_DIR: 1,
  AL_INT: 1, AL_SEN: 1
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildShort() {
  const byFnMC = {}, byFnS = {};
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
    shuffle(mcPool);
    const sPool = (byFnS[fn] || []).slice();
    shuffle(sPool);
    const mcCount = Math.floor(alloc / 2);
    const sCount = alloc - mcCount;
    activeQ = activeQ.concat(mcPool.slice(0, mcCount));
    activeQ = activeQ.concat(sPool.slice(0, sCount));
  });
  shuffle(activeQ);
  return activeQ;
}

function scoreActive(activeQ, pickAnswer) {
  const answers = activeQ.map((q, i) => pickAnswer(q, i));
  function avg(fn) {
    let sum = 0, cnt = 0;
    activeQ.forEach((q, i) => {
      if (q.fn !== fn) return;
      const raw = answers[i];
      if (raw == null) return;
      sum += ((raw - 1) / 6) * 100;
      cnt++;
    });
    return cnt ? Math.round(sum / cnt) : 50;
  }
  const econL = avg('PC_ECON_L');
  const econR = avg('PC_ECON_R');
  const auth = avg('PC_AUTH');
  const lib = avg('PC_LIB');
  const polX = Math.max(-100, Math.min(100, Math.round(econR - econL)));
  const polY = Math.max(-100, Math.min(100, Math.round(auth - lib)));
  return { polX, polY, econL, econR, auth, lib, n: activeQ.length };
}

const activeQ = buildShort();
console.log('Short test question count:', activeQ.length);

const neutral = scoreActive(activeQ, () => 4);
console.log('All neutral (4):', neutral);

const maxRight = scoreActive(activeQ, (q) => {
  if (q.fn === 'PC_ECON_R' || q.fn === 'PC_AUTH') return 7;
  if (q.fn === 'PC_ECON_L' || q.fn === 'PC_LIB') return 1;
  return 4;
});
console.log('Max econ-right + auth:', maxRight);

const maxLeft = scoreActive(activeQ, (q) => {
  if (q.fn === 'PC_ECON_L' || q.fn === 'PC_LIB') return 7;
  if (q.fn === 'PC_ECON_R' || q.fn === 'PC_AUTH') return 1;
  return 4;
});
console.log('Max econ-left + lib:', maxLeft);

// MC: always pick highest-scoring choice for that question's fn
const mcMaxFn = scoreActive(activeQ, (q) => {
  if (q.type === 'mc' && q.choices && q.choices.length) {
    const target = q.fn.startsWith('PC_') ? q.fn : null;
    if (target) {
      const best = q.choices.reduce((a, b) => (b.s > a.s ? b : a));
      return best.s;
    }
  }
  return 4;
});
console.log('MC always max score on political Q:', mcMaxFn);
