const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'psyche-complete.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptStart = html.indexOf('<script>\n(function(){\n\'use strict\';');
const scriptEnd = html.indexOf('\n})();\n</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Main script block not found');

const before = html.slice(0, scriptStart);
const after = html.slice(scriptEnd + '\n})();\n</script>'.length);
let body = html.slice(scriptStart + '<script>'.length, scriptEnd);

const qStart = body.indexOf('var Q = [');
const qEnd = body.indexOf('\n\n\nvar TOTAL = Q.length;');
if (qStart < 0 || qEnd < 0) throw new Error('Q array bounds not found');

const langStart = body.indexOf('var LANG_OVERRIDES = {', qEnd);
const langEnd = langStart > 0 ? body.indexOf('\n};\n\n\nvar TOTAL', langStart) : -1;

let questionsPart = body.slice(qStart, qEnd).trim();
const enginePart = body.slice(qEnd).trim();

if (langStart > 0 && langEnd > 0) {
  const langPart = body.slice(langStart, langEnd + 3).trim();
  questionsPart = questionsPart + '\n\n' + langPart;
  const engine2 = body.slice(langEnd + 4).trim();
  // enginePart already from qEnd - recompute
}

const questionsJs =
  '/* ANIMUS question bank — auto-split from psyche-complete.html */\n' +
  '(function(g){\n' +
  "'use strict';\n" +
  questionsPart.replace(/^var Q/, 'var Q').replace(/^var LANG/, 'var LANG_OVERRIDES') +
  '\n  g.AnimusQuestions = { Q: Q, LANG_OVERRIDES: typeof LANG_OVERRIDES !== "undefined" ? LANG_OVERRIDES : {} };\n' +
  '})(window);\n';

// Fix engine: remove duplicate Q/lang, use AnimusQuestions, wrap in DOMContentLoaded
let engine = enginePart.replace(/^\s*var TOTAL = Q\.length[\s\S]*?^\/\/ ── LANGUAGE ──[\s\S]*?^\}\)\(\);?\s*$/m, '').trim();

engine = engine
  .replace(/\binitTestIntro\(\);?\s*\n/g, '')
  .replace(/function initTestIntro\(\)[\s\S]*?^}\s*$/m, '')
  .replace(/function setTestMode[\s\S]*?^}\s*$/m, '')
  .replace(/function saveTestProgress[\s\S]*?^}\s*$/m, '')
  .replace(/function clearTestProgress[\s\S]*?^}\s*$/m, '')
  .replace(/function loadSavedTestMode[\s\S]*?^}\s*$/m, '')
  .replace(/function showResumePromptIfNeeded[\s\S]*?^}\s*$/m, '')
  .replace(/function resumeTestFromStorage[\s\S]*?^}\s*$/m, '')
  .replace(/function buildActiveQuestionSet[\s\S]*?^}\s*$/m, '')
  .replace(/function startTest\(\)[\s\S]*?^}\s*$/m, '')
  .replace(/var SHORT_ALLOC[\s\S]*?;;\s*/m, '');

const engineHeader =
  '/* ANIMUS test engine */\n(function(g){\n\'use strict\';\n' +
  'var Q = g.AnimusQuestions.Q;\n' +
  'var LANG_OVERRIDES = g.AnimusQuestions.LANG_OVERRIDES || {};\n';

const engineFooter =
  '\n  g.AnimusPsyche = {\n' +
  '    startTest: startTest,\n' +
  '    setTestMode: function(m){ testMode = m === "short" ? "short" : "full"; try{localStorage.setItem("animus_test_mode",testMode);}catch(e){} },\n' +
  '    getTestMode: function(){ return testMode; },\n' +
  '    resumeTest: resumeTestFromStorage,\n' +
  '    buildQuestions: buildActiveQuestionSet\n' +
  '  };\n' +
  '  function boot(){\n' +
  '    testMode = loadSavedTestMode();\n' +
  '    showResumePromptIfNeeded();\n' +
  '    if(typeof g.AnimusIntro !== "undefined" && g.AnimusIntro.refresh) g.AnimusIntro.refresh();\n' +
  '  }\n' +
  '  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n' +
  '  else boot();\n' +
  '})(window);\n';

// Re-add essential test mode functions before engine body - insert after shuffle function
const testModeBlock = `
var testMode = 'full';
var SHORT_ALLOC = {
  Ni:4,Ne:4,Ti:4,Te:4,Fi:4,Fe:4,Si:4,Se:4,
  E1:1,E2:1,E3:1,E4:1,E5:1,E6:1,E7:1,E8:1,E9:1,
  PC_ECON_R:3,PC_ECON_L:3,PC_AUTH:3,PC_LIB:3,
  PH_NIE:1,PH_STO:1,PH_KAN:1,PH_ARI:1,PH_EXI:1,PH_EPI:1,PH_PRA:1,PH_SKE:1,
  ET_VIR:1,ET_CON:1,ET_DEO:1,ET_EGO:1,
  AT_SEC:3,AT_ANX:3,AT_AVO:3,AT_DIS:3,
  IV_SP:1,IV_SOC:1,IV_SX:1,
  EP_RAT:1,EP_EMP:1,EP_INT:1,EP_SKP:1,
  MF_CARE:1,MF_FAIR:1,MF_LOY:1,MF_AUTH:1,MF_PUR:1,MF_LIB:1,
  TMP_CHO:1,TMP_MEL:1,TMP_SAN:1,TMP_PHL:1,
  SOC_DOM:1,SOC_INT:1,SOC_WAR:1,SOC_DIR:1,
  AL_INT:1,AL_SEN:1
};
var TOTAL = Q.length;
var answers = new Array(TOTAL).fill(null);
var cur = 0;

function setTestMode(mode) {
  testMode = mode === 'short' ? 'short' : 'full';
  try { localStorage.setItem('animus_test_mode', testMode); } catch(e){}
  var fullBtn = document.getElementById('modeFull');
  var shortBtn = document.getElementById('modeShort');
  if(fullBtn){ fullBtn.classList.toggle('active', testMode === 'full'); fullBtn.setAttribute('aria-pressed', testMode === 'full' ? 'true' : 'false'); }
  if(shortBtn){ shortBtn.classList.toggle('active', testMode === 'short'); shortBtn.setAttribute('aria-pressed', testMode === 'short' ? 'true' : 'false'); }
  var metaQ = document.getElementById('metaQ');
  var metaMin = document.getElementById('metaMin');
  if(metaQ) metaQ.textContent = testMode === 'full' ? '280' : '100';
  if(metaMin) metaMin.textContent = testMode === 'full' ? '~30' : '~12';
}
function saveTestProgress() {
  if(!window._activeQ || !answers) return;
  try {
    sessionStorage.setItem('animus_test_progress', JSON.stringify({
      testMode: testMode, cur: cur, total: TOTAL, answers: answers,
      observerMode: !!observerMode, observerSubjectName: observerSubjectName || '', savedAt: Date.now()
    }));
  } catch(e){}
}
function clearTestProgress() { try { sessionStorage.removeItem('animus_test_progress'); } catch(e){} }
function loadSavedTestMode() {
  var saved = null;
  try { saved = localStorage.getItem('animus_test_mode'); } catch(e){}
  if(saved === 'short' || saved === 'full') return saved;
  if(window.location.search.indexOf('mode=short') > -1) return 'short';
  return 'full';
}
function showResumePromptIfNeeded() {
  var wrap = document.getElementById('resumeTestWrap');
  if(!wrap) return;
  try {
    var raw = sessionStorage.getItem('animus_test_progress');
    if(!raw) return;
    var data = JSON.parse(raw);
    if(!data || !data.answers || data.cur < 1) return;
    wrap.style.display = 'block';
  } catch(e){}
}
function resumeTestFromStorage() {
  var raw;
  try { raw = sessionStorage.getItem('animus_test_progress'); } catch(e){ return; }
  if(!raw) return;
  var data;
  try { data = JSON.parse(raw); } catch(e){ return; }
  if(!data || !data.answers) return;
  setTestMode(data.testMode || 'full');
  observerMode = !!data.observerMode;
  observerSubjectName = data.observerSubjectName || '';
  buildActiveQuestionSet();
  if(data.answers.length === TOTAL){
    answers = data.answers.slice();
    cur = Math.min(data.cur, TOTAL - 1);
    document.getElementById('intro').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    if(observerMode && observerSubjectName){
      var logo = document.querySelector('.qhdr-logo');
      if(logo) logo.innerHTML = 'ANIMUS <span style="font-size:12px;color:var(--accent2);letter-spacing:0.1em">ESTIMATOR</span>';
      document.getElementById('qSection').textContent = 'Estimating: ' + observerSubjectName;
    }
    renderQ();
  }
}
function buildActiveQuestionSet() {
  var activeQ;
  if(testMode === 'short') {
    var byFnMC = {}, byFnS = {};
    Q.forEach(function(q){
      if(q.type==='mc'){ if(!byFnMC[q.fn]) byFnMC[q.fn]=[]; byFnMC[q.fn].push(q); }
      else { if(!byFnS[q.fn]) byFnS[q.fn]=[]; byFnS[q.fn].push(q); }
    });
    activeQ = [];
    Object.keys(SHORT_ALLOC).forEach(function(fn){
      var alloc = SHORT_ALLOC[fn];
      var mcPool = (byFnMC[fn]||[]).slice(); shuffle(mcPool);
      var sPool  = (byFnS[fn]||[]).slice();  shuffle(sPool);
      var mcCount = Math.floor(alloc/2);
      var sCount  = alloc - mcCount;
      activeQ = activeQ.concat(mcPool.slice(0,mcCount));
      activeQ = activeQ.concat(sPool.slice(0,sCount));
    });
    shuffle(activeQ);
  } else {
    activeQ = Q.slice();
    shuffle(activeQ);
  }
  window._activeQ = activeQ;
  TOTAL = activeQ.length;
  if(!answers || answers.length !== TOTAL) answers = new Array(TOTAL).fill(null);
}
function startTest() {
  buildActiveQuestionSet();
  answers = new Array(TOTAL).fill(null);
  cur = 0;
  _explainCache = {};
  clearTestProgress();
  document.getElementById('intro').style.display='none';
  document.getElementById('quiz').style.display='block';
  renderQ();
  saveTestProgress();
}
`;

// Find LANG_OVERRIDES in questions part
const langMatch = body.match(/var LANG_OVERRIDES = \{[\s\S]*?\n\};/);
const finalQuestionsJs = '/* ANIMUS question bank */\n(function(g){\n\'use strict\';\n' +
  questionsPart + (langMatch ? '\n' + langMatch[0] : '') +
  '\ng.AnimusQuestions = { Q: Q, LANG_OVERRIDES: typeof LANG_OVERRIDES !== \'undefined\' ? LANG_OVERRIDES : {} };\n})(window);\n';

// Engine: remove var TOTAL block at start of enginePart and LANG section if duplicated
let eng = enginePart;
const langInEngine = eng.indexOf('var LANG_OVERRIDES');
if (langInEngine >= 0) {
  const langClose = eng.indexOf('\n};\n\n\nvar TOTAL', langInEngine);
  if (langClose >= 0) eng = eng.slice(0, langInEngine) + eng.slice(langClose + 5);
}

eng = eng.replace(/^var TOTAL = Q\.length;[\s\S]*?updateIntroLang\(\);\s*\}\)\(\);\s*/m, '');

const finalEngineJs = engineHeader + testModeBlock + eng + engineFooter;

const newHtml = before +
  '<script src="/js/psyche-questions.js"></script>\n' +
  '<script src="/js/psyche-engine.js"></script>\n' +
  '<script src="/js/psyche-intro.js"></script>\n' +
  after;

fs.writeFileSync(path.join(__dirname, '..', 'js', 'psyche-questions.js'), finalQuestionsJs);
fs.writeFileSync(path.join(__dirname, '..', 'js', 'psyche-engine.js'), finalEngineJs);
fs.writeFileSync(path.join(__dirname, '..', 'psyche-complete.new.html'), newHtml);
console.log('Wrote js/psyche-questions.js', finalQuestionsJs.length);
console.log('Wrote js/psyche-engine.js', finalEngineJs.length);
console.log('Wrote psyche-complete.new.html');
