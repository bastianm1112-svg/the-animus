import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'psyche-complete.html'), 'utf8');

const m = html.match(/<script>\r?\n\(function\(\)\{\r?\n'use strict';([\s\S]*?)\r?\n\}\)\(\);\r?\n<\/script>/);
if (!m) throw new Error('engine script not found');
let engine = m[1];

const qm = engine.match(/var Q = \[([\s\S]*?)\r?\n\];\r?\n\r?\nvar ES = (\{[\s\S]*?\r?\n\});\r?\n\r?\n\r?\n/);
if (!qm) throw new Error('Q/ES block not found');

const questionsJs = `/* ANIMUS — question bank */
(function (g) {
  'use strict';
  var Q = [${qm[1]}
  ];
  var ES = ${qm[2]};
  g.AnimusQuestions = { Q: Q, ES: ES };
})(window);
`;

engine = engine.replace(/\/\/ ═+[\s\S]*?var Q = \[[\s\S]*?\r?\n\];\r?\n\r?\nvar ES = \{[\s\S]*?\r?\n\};\r?\n\r?\n\r?\n/, '');

// Remove intro init (handled by psyche-intro.js)
engine = engine.replace(/function initTestIntro\(\)[\s\S]*?^initTestIntro\(\);\r?\n/m, '');

const engineJs = `/* ANIMUS — test engine (scoring, quiz UI, results, save) */
(function (g) {
  'use strict';
  var Q = g.AnimusQuestions.Q;
  var ES = g.AnimusQuestions.ES;
${engine}
  g.AnimusPsyche = {
    startTest: startTest,
    resumeTest: resumeTestFromStorage,
    setTestMode: setTestMode,
    loadSavedTestMode: loadSavedTestMode
  };
  function syncIntro() {
    try { setTestMode(loadSavedTestMode()); showResumePromptIfNeeded(); } catch (e) {}
    if (g.AnimusIntro && g.AnimusIntro.onEngineReady) g.AnimusIntro.onEngineReady();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncIntro);
  else syncIntro();
})(window);
`;

const htmlOut = html.replace(
  /<script>\r?\n\(function\(\)\{\r?\n'use strict';[\s\S]*?\r?\n\}\)\(\);\r?\n<\/script>/,
  `<script src="/js/psyche-questions.js"></script>
<script src="/js/psyche-engine.js"></script>
<script src="/js/psyche-intro.js"></script>`
);

fs.mkdirSync(path.join(root, 'js'), { recursive: true });
fs.writeFileSync(path.join(root, 'js', 'psyche-questions.js'), questionsJs);
fs.writeFileSync(path.join(root, 'js', 'psyche-engine.js'), engineJs);
fs.writeFileSync(path.join(root, 'psyche-complete.html'), htmlOut);
console.log('questions', questionsJs.length, 'engine', engineJs.length);
