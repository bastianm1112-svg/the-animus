/** Load public question bank in Node via the same browser IIFEs. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cached = null;

function loadQuestions() {
  if (cached) return cached;
  const root = path.join(__dirname, '..');
  const ctx = { window: {} };
  ctx.globalThis = ctx.window;
  vm.createContext(ctx);
  ctx.window = ctx.window;
  function run(rel) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx);
  }
  run('js/animus-versions.js');
  run('js/animus-scoring-core.js');
  run('js/psyche-questions.js');
  try { run('js/psyche-question-patches.js'); } catch (e) {}
  try { run('js/psyche-quick-extra.js'); } catch (e) {}
  run('js/psyche-cross.js');
  run('js/animus-test-score.js');
  const Q = ctx.window.AnimusQuestions.Q;
  const Cross = ctx.window.AnimusCross || {};
  if (Cross.applyChoicePatches) Cross.applyChoicePatches(Q);
  if (ctx.window.AnimusTestScore && ctx.window.AnimusTestScore.ensureIds) {
    ctx.window.AnimusTestScore.ensureIds(Q);
  }
  cached = {
    Q: Q,
    Cross: Cross,
    TestScore: ctx.window.AnimusTestScore,
    Versions: ctx.window.AnimusVersions,
    Scoring: ctx.window.AnimusScoring
  };
  return cached;
}

module.exports = { loadQuestions };
