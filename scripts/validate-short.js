const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/psyche-questions.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/psyche-cross.js'), 'utf8'), ctx);

const Q = ctx.window.AnimusQuestions.Q;
const Cross = ctx.window.AnimusCross;
Cross.applyChoicePatches(Q);

const SHORT_ALLOC = {
  Ni: 5, Ne: 5, Ti: 5, Te: 5, Fi: 5, Fe: 5, Si: 4, Se: 4,
  E1: 2, E2: 2, E3: 2, E4: 2, E5: 2, E6: 2, E7: 3, E8: 2, E9: 2,
  PC_ECON_R: 3, PC_ECON_L: 3, PC_AUTH: 3, PC_LIB: 3,
  PH_NIE: 1, PH_STO: 1, PH_KAN: 1, PH_ARI: 1, PH_EXI: 1, PH_EPI: 1, PH_PRA: 1, PH_SKE: 1,
  ET_VIR: 1, ET_CON: 1, ET_DEO: 1, ET_EGO: 1,
  AT_SEC: 3, AT_ANX: 3, AT_AVO: 3, AT_DIS: 3,
  IV_SP: 1, IV_SOC: 1, IV_SX: 1,
  TMP_CHO: 1, TMP_MEL: 1, TMP_SAN: 1, TMP_PHL: 1
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const byTag = {};
Q.forEach((q) => {
  Cross.questionTags(q).forEach((tag) => {
    if (!byTag[tag]) byTag[tag] = { mc: [], s: [] };
    if (q.type === 'mc') byTag[tag].mc.push(q);
    else byTag[tag].s.push(q);
  });
});

function poolForAlloc(fn) {
  const tags = Cross.SHORT_POOL_TAGS[fn] || [fn];
  let mc = [], s = [];
  tags.forEach((tag) => {
    const p = byTag[tag];
    if (!p) return;
    mc = mc.concat(p.mc);
    s = s.concat(p.s);
  });
  return { mc, s };
}

function takeUnique(pool, n, used) {
  shuffle(pool);
  const out = [];
  for (const q of pool) {
    if (out.length >= n) break;
    const k = Cross.qKey(q);
    if (used[k]) continue;
    used[k] = true;
    out.push(q);
  }
  return out;
}

const used = {};
let activeQ = [];
Object.keys(SHORT_ALLOC).forEach((fn) => {
  const alloc = SHORT_ALLOC[fn];
  const p = poolForAlloc(fn);
  const mcCount = Math.floor(alloc / 2);
  const sCount = alloc - mcCount;
  const gotMc = takeUnique(p.mc, mcCount, used);
  const gotS = takeUnique(p.s, sCount, used);
  activeQ = activeQ.concat(gotMc, gotS);
  const need = alloc - gotMc.length - gotS.length;
  if (need > 0) activeQ = activeQ.concat(takeUnique(p.mc.concat(p.s), need, used));
});

console.log('Short test unique questions:', activeQ.length);
console.log('Alloc target:', Object.values(SHORT_ALLOC).reduce((a, b) => a + b, 0));
if (activeQ.length !== 100) process.exitCode = 1;
