/**
 * Methodology fixtures: reverse keys invert, Quick allocation size,
 * all-agree does not collapse to one celebrity NT type.
 */
const path = require('path');
const vm = require('vm');
const fs = require('fs');
const root = path.join(__dirname, '..');
const ctx = { window: {}, globalThis: {} };
ctx.globalThis = ctx.window;
vm.createContext(ctx);
function run(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx);
}
run('js/animus-versions.js');
run('js/animus-scoring-core.js');
run('js/psyche-questions.js');
run('js/psyche-question-patches.js');
run('js/psyche-quick-extra.js');
run('js/psyche-cross.js');
run('js/animus-test-score.js');

const Q = ctx.window.AnimusQuestions.Q;
const Score = ctx.window.AnimusTestScore;
const Cross = ctx.window.AnimusCross;
Score.ensureIds(Q);
if (Cross.applyChoicePatches) Cross.applyChoicePatches(Q);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL', msg);
  } else {
    console.log('ok', msg);
  }
}

const rev = Q.filter((q) => q.rev);
assert(rev.length >= 10, 'at least 10 reverse items (' + rev.length + ')');

Q.forEach((q) => {
  assert(!!q.fn, 'item has dimension ' + q.id);
  assert(!!q.id, 'item has id');
});

const q = rev[0];
const a = Score.valFromRaw(q, 7);
const b = Score.valFromRaw(Object.assign({}, q, { rev: false }), 7);
assert(a < 5 && b > 95, 'reverse inverts high agree');

const byFn = {};
Q.forEach((item) => {
  byFn[item.fn] = (byFn[item.fn] || 0) + 1;
});
Object.keys(Score.QUICK_ALLOC).forEach((fn) => {
  assert((byFn[fn] || 0) >= Score.QUICK_ALLOC[fn], 'enough items for Quick ' + fn);
});
const quickTotal = Object.keys(Score.QUICK_ALLOC).reduce((s, k) => s + Score.QUICK_ALLOC[k], 0);
assert(quickTotal === 50, 'Quick alloc sums to 50, got ' + quickTotal);

function pickAll(raw) {
  const answers = Q.map(() => raw);
  const choiceIx = Q.map((item) => (item.type === 'mc' ? 0 : -1));
  return Score.scoreFull(Q, answers, choiceIx, Cross);
}
const all7 = pickAll(7);
const all1 = pickAll(1);
assert(/^[EI][NS][TF][JP]$/.test(all7.mbti) && /^[EI][NS][TF][JP]$/.test(all1.mbti), 'extremes still produce MBTI codes');
assert(['INTJ', 'INTP', 'ENTJ', 'ENTP'].indexOf(all7.mbti) === -1 || all7.mbti !== all1.mbti, 'all-agree is not a silent NT default vs all-disagree');

const missing = Score.scoreFull(Q.slice(0, 8), [null, null, 4, 4, 4, 4, 4, 4], [-1, -1, -1, -1, -1, -1, -1, -1], Cross);
assert(Array.isArray(missing.incomplete), 'incomplete dimensions flagged');

run('js/animus-political.js');
run('js/political-figures.js');
run('js/animus-group-dynamics.js');

const Pol = ctx.window.AnimusPolitical;
const sameZ = Pol.overallSimilarity({ polX: 0, polY: 0, polZ: 0 }, { polX: 0, polY: 0, polZ: 100 }, { includeCultural: true });
const sameX = Pol.overallSimilarity({ polX: 0, polY: 0, polZ: 0 }, { polX: 100, polY: 0, polZ: 0 }, { includeCultural: true });
assert(Math.abs(sameZ.overall - sameX.overall) <= 1, 'normalized Z does not dominate X');
const withZ = Pol.overallSimilarity({ polX: 10, polY: 10, polZ: 0 }, { polX: 10, polY: 10, polZ: 80 }, { includeCultural: true });
const withoutZ = Pol.overallSimilarity({ polX: 10, polY: 10, polZ: 0 }, { polX: 10, polY: 10, polZ: 80 }, { includeCultural: false });
assert(withZ.overall < withoutZ.overall, 'cultural axis changes 3D similarity when both have Z');

const figs = ctx.window.AnimusPoliticalFigures.rankClosest({ polX: -70, polY: -20 }, { limit: 3 });
assert(figs.length >= 1, 'political figures rank returns matches');
assert(figs.every(function (f) { return f.dataStatus === 'estimated'; }), 'political figures labeled estimated');

const Dyn = ctx.window.AnimusGroupDynamics.analyze([
  { uid: 'a', displayName: 'A', mbti: 'INTJ', polX: -40, polY: -10 },
  { uid: 'b', displayName: 'B', mbti: 'ESFP', polX: 50, polY: 20 },
  { uid: 'c', displayName: 'C', mbti: 'INTJ', polX: -35, polY: -8 }
]);
assert(Dyn.closestPair && Dyn.contrastingPair, 'group dynamics finds pairs');
assert(Dyn.centroid && Dyn.centroid.note.indexOf('not') >= 0, 'centroid is not a type');

const bank = require(path.join(root, 'api/_cultural-bank.js'));
assert(bank.length >= 12 && bank.length <= 16, 'cultural bank 12-16 items');
assert(!fs.readFileSync(path.join(root, 'js/psyche-questions.js'), 'utf8').includes('cult-fam-01'), 'cultural items not in public bank');

if (failed) {
  console.error(failed + ' failures');
  process.exit(1);
}
console.log('methodology fixtures passed');
