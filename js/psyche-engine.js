/* ANIMUS — test engine (scoring, quiz UI, results, save) */
(function (g) {
  'use strict';
  var Q = g.AnimusQuestions.Q;
  var ES = g.AnimusQuestions.ES;
  var Cross = g.AnimusCross || {};
  if (Cross.applyChoicePatches) Cross.applyChoicePatches(Q);

  var _choiceIx = [];


// ── SECURITY UTILITIES ──
function escapeHTML(str){
  if(str===null||str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;')
    .replace(/`/g,'&#96;');
}

function sanitizeText(str,maxLen){
  maxLen = maxLen||500;
  if(!str) return '';
  // Strip any HTML tags from AI-generated text
  var cleaned = String(str).replace(/<[^>]*>/g,'').replace(/&[a-z]+;/gi,'').trim();
  return cleaned.substring(0,maxLen);
}

function setTestPhase(phase) {
  if (typeof g.setPagePhase === 'function') g.setPagePhase(phase);
  else if (g.AnimusApp && g.AnimusApp.setPagePhase) g.AnimusApp.setPagePhase(phase);
}

function profileLinkField() {
  return document.getElementById('profileLinkInput') || document.getElementById('importInput');
}

function profileLinkErrorEl() {
  return document.getElementById('profileLinkError') || document.getElementById('importError');
}

function sanitizeSnapshot(obj){
  // Whitelist only known safe keys and types from decoded profile data
  if(!obj||typeof obj!=='object') return null;
  var allowed = {
    mbti:'string',ennType:'string',ennWing:'string',ennTritype:'string',
    att:'string',phi:'string',instStack:'string',
    polX:'number',polY:'number',
    cog:'object',enn:'object',att2:'object',tmp:'object',iv:'object',
    mf:'object',eth:'object',ep:'object',phiS:'object',soc:'object',alone:'object',
    big5:'object',values:'array',figures:'array',
    mbtiName:'string',tagline:'string',socionics:'string',keirsey:'string',
    cogNarrative:'string',ennNarrative:'string',attNarrative:'string',
    phiNarrative:'string',politicalNarrative:'string',
    politicalIdeology:'string',politicalIdeologyDesc:'string',
    politicalStrengths:'string',politicalWeaknesses:'string',
    politicalThinkers:'array',similarPoliticians:'array',
    similarParties:'array',similarCountries:'array',
    aloneDesc:'string',socialDesc:'string',shadowDesc:'string'
  };
  var safe = {};
  Object.keys(allowed).forEach(function(k){
    if(!(k in obj)) return;
    var t = allowed[k];
    if(t==='string') safe[k] = sanitizeText(obj[k], 2000);
    else if(t==='number') safe[k] = typeof obj[k]==='number'?Math.round(obj[k]):0;
    else if(t==='object'&&typeof obj[k]==='object'&&!Array.isArray(obj[k])) safe[k] = obj[k];
    else if(t==='array'&&Array.isArray(obj[k])) safe[k] = obj[k].map(function(v){
      return typeof v==='string'?sanitizeText(v,500):
             (v&&typeof v==='object'?v:null);
    }).filter(Boolean);
  });
  return safe;
}

// Rate limiting for atob/profile decodes (prevent abuse)
var _decodeCount = 0;
var _decodeReset = Date.now();
function safeAtob(encoded){
  var now = Date.now();
  if(now - _decodeReset > 60000){ _decodeCount=0; _decodeReset=now; }
  if(++_decodeCount > 20) { console.warn('Rate limit: too many profile decodes'); return null; }
  try {
    var obj = JSON.parse(decodeURIComponent(escape(atob(encoded.trim()))));
    return sanitizeSnapshot(obj);
  } catch(e){ return null; }
}


var TOTAL = Q.length;
var answers = new Array(TOTAL).fill(null);
var cur = 0;

// ── LANGUAGE (reads localStorage; updates on settings save + storage events) ──
function getAnimusLang() {
  if (typeof AnimusShared !== 'undefined' && AnimusShared.getResolvedLang) {
    return AnimusShared.getResolvedLang();
  }
  try {
    return localStorage.getItem('animus_lang') === 'es' ? 'es' : 'en';
  } catch (e) {
    return 'en';
  }
}
var lang = getAnimusLang();

function refreshAnimusLang() {
  lang = getAnimusLang();
}

(function () {
  refreshAnimusLang();
  if (lang === 'es') updateIntroLang();
  window.addEventListener('animus-lang-change', function () {
    refreshAnimusLang();
    updateIntroLang();
    var quiz = document.getElementById('quiz');
    if (quiz && quiz.style.display !== 'none' && typeof renderQ === 'function') {
      renderQ();
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'animus_lang') {
      refreshAnimusLang();
      updateIntroLang();
      var quizEl = document.getElementById('quiz');
      if (quizEl && quizEl.style.display !== 'none' && typeof renderQ === 'function') {
        renderQ();
      }
    }
  });
})();

function updateIntroLang(){
  document.querySelectorAll('[data-en]').forEach(function(el){
    el.textContent = lang==='es' ? (el.getAttribute('data-es')||el.getAttribute('data-en')) : el.getAttribute('data-en');
  });
  // Translate import input placeholder
  var inp = document.getElementById('importInput');
  if(inp) inp.placeholder = lang==='es' ? 'Pegá un link de perfil acá...' : 'Paste a profile link here...';
  var fill = document.getElementById('fillInput');
  if(fill) fill.placeholder = lang==='es' ? 'Pegá un link incompleto acá...' : 'Paste incomplete profile link here...';
}

// Scale/agree option labels
var scaleLabels = {
  en: {lo:'Strongly Disagree', hi:'Strongly Agree',
       opts:['Strongly Disagree','Disagree','Slightly Disagree','Neutral','Slightly Agree','Agree','Strongly Agree']},
  es: {lo:'Muy en desacuerdo', hi:'Muy de acuerdo',
       opts:['Muy en desacuerdo','En desacuerdo','Algo en desacuerdo','Neutral','Algo de acuerdo','De acuerdo','Muy de acuerdo']}
};

// ── SHUFFLE (Fisher-Yates) ──
function shuffle(arr){
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
  }
  return arr;
}

// ── TEST MODE ──
var testMode = 'full';

function setTestMode(mode) {
  testMode = mode === 'short' ? 'short' : 'full';
  try { localStorage.setItem(AnimusShared.KEYS.testMode, testMode); } catch(e){}
  var fullBtn = document.getElementById('modeFull');
  var shortBtn = document.getElementById('modeShort');
  if(fullBtn){
    fullBtn.classList.toggle('active', testMode === 'full');
    fullBtn.setAttribute('aria-pressed', testMode === 'full' ? 'true' : 'false');
  }
  if(shortBtn){
    shortBtn.classList.toggle('active', testMode === 'short');
    shortBtn.setAttribute('aria-pressed', testMode === 'short' ? 'true' : 'false');
  }
  var metaQ = document.getElementById('metaQ');
  var metaMin = document.getElementById('metaMin');
  if(metaQ) metaQ.textContent = testMode === 'full' ? '280' : '100';
  if(metaMin) metaMin.textContent = testMode === 'full' ? '~30' : '~12';
}

function saveTestProgress() {
  if(!window._activeQ || !answers) return;
  var qKey = Cross.qKey || function (q) { return (q.fn || '') + '|' + (q.t || ''); };
  try {
    sessionStorage.setItem(AnimusShared.KEYS.testProgress, JSON.stringify({
      testMode: testMode,
      cur: cur,
      total: TOTAL,
      answers: answers,
      choiceIx: _choiceIx.slice(),
      activeKeys: window._activeQ.map(qKey),
      observerMode: !!observerMode,
      observerSubjectName: observerSubjectName || '',
      savedAt: Date.now()
    }));
  } catch(e){}
}

function clearTestProgress() {
  try { sessionStorage.removeItem(AnimusShared.KEYS.testProgress); } catch(e){}
}

function loadSavedTestMode() {
  var saved = null;
  try { saved = localStorage.getItem(AnimusShared.KEYS.testMode); } catch(e){}
  if(saved === 'short' || saved === 'full') return saved;
  if(window.location.search.indexOf('mode=short') > -1) return 'short';
  return 'full';
}

function showResumePromptIfNeeded() {
  var wrap = document.getElementById('resumeTestWrap');
  if(!wrap) return;
  try {
    var raw = sessionStorage.getItem(AnimusShared.KEYS.testProgress);
    if(!raw) return;
    var data = JSON.parse(raw);
    if(!data || !data.answers || data.cur < 1) return;
    wrap.style.display = 'block';
  } catch(e){}
}

function resumeTestFromStorage() {
  var raw;
  try { raw = sessionStorage.getItem(AnimusShared.KEYS.testProgress); } catch(e){ return; }
  if(!raw) return;
  var data;
  try { data = JSON.parse(raw); } catch(e){ return; }
  if(!data || !data.answers) return;
  setTestMode(data.testMode || 'full');
  observerMode = !!data.observerMode;
  observerSubjectName = data.observerSubjectName || '';
  var qKey = Cross.qKey || function (q) { return (q.fn || '') + '|' + (q.t || ''); };
  if (data.activeKeys && data.activeKeys.length) {
    var keyToQ = {};
    Q.forEach(function (q) { keyToQ[qKey(q)] = q; });
    window._activeQ = data.activeKeys.map(function (k) { return keyToQ[k]; }).filter(Boolean);
    TOTAL = window._activeQ.length;
    if (!answers || answers.length !== TOTAL) answers = new Array(TOTAL).fill(null);
  } else {
    buildActiveQuestionSet();
  }
  if(data.answers.length === TOTAL){
    answers = data.answers.slice();
    _choiceIx = (data.choiceIx && data.choiceIx.length === TOTAL) ? data.choiceIx.slice() : new Array(TOTAL).fill(-1);
    cur = Math.min(data.cur, TOTAL - 1);
    document.getElementById('intro').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    setTestPhase('quiz');
    if(observerMode && observerSubjectName){
      document.querySelector('.qhdr-logo').innerHTML = 'ANI<span>MUS</span> <span class="qhdr-est">ESTIMATOR</span>';
      document.getElementById('qSection').textContent = 'Estimating: ' + observerSubjectName;
    }
    renderQ();
  }
}

function buildTaggedPools() {
  var byTag = {};
  var qKey = Cross.qKey || function (q) { return (q.fn || '') + '|' + (q.t || ''); };
  var questionTags = Cross.questionTags || function (q) { return [q.fn]; };
  Q.forEach(function (q) {
    questionTags(q).forEach(function (tag) {
      if (!byTag[tag]) byTag[tag] = { mc: [], s: [] };
      if (q.type === 'mc') byTag[tag].mc.push(q);
      else byTag[tag].s.push(q);
    });
  });
  return { byTag: byTag, qKey: qKey };
}

function takeUniqueQuestions(pool, n, used, qKey) {
  shuffle(pool);
  var out = [];
  for (var i = 0; i < pool.length && out.length < n; i++) {
    var q = pool[i];
    var k = qKey(q);
    if (used[k]) continue;
    used[k] = true;
    out.push(q);
  }
  return out;
}

function poolForAlloc(fn, byTag) {
  var tags = [fn];
  if (Cross.SHORT_POOL_TAGS && Cross.SHORT_POOL_TAGS[fn]) {
    tags = Cross.SHORT_POOL_TAGS[fn];
  }
  var mc = [], s = [];
  tags.forEach(function (tag) {
    var p = byTag[tag];
    if (!p) return;
    mc = mc.concat(p.mc);
    s = s.concat(p.s);
  });
  return { mc: mc, s: s };
}

function buildActiveQuestionSet() {
  var activeQ;
  _choiceIx = [];
  if (testMode === 'short') {
    var pools = buildTaggedPools();
    var byTag = pools.byTag;
    var qKey = pools.qKey;
    var used = {};
    activeQ = [];
    Object.keys(SHORT_ALLOC).forEach(function (fn) {
      var alloc = SHORT_ALLOC[fn];
      var p = poolForAlloc(fn, byTag);
      var mcCount = Math.floor(alloc / 2);
      var sCount = alloc - mcCount;
      var gotMc = takeUniqueQuestions(p.mc, mcCount, used, qKey);
      var gotS = takeUniqueQuestions(p.s, sCount, used, qKey);
      activeQ = activeQ.concat(gotMc).concat(gotS);
      var need = alloc - gotMc.length - gotS.length;
      if (need > 0) {
        activeQ = activeQ.concat(takeUniqueQuestions(p.mc.concat(p.s), need, used, qKey));
      }
    });
    shuffle(activeQ);
  } else {
    activeQ = Q.slice();
    shuffle(activeQ);
  }
  window._activeQ = activeQ;
  TOTAL = activeQ.length;
  if (!answers || answers.length !== TOTAL) answers = new Array(TOTAL).fill(null);
}

// Short test: 100 unique questions (all dimensions in bank; cross-scoring fills EP/MF/SOC/AL)
var SHORT_ALLOC = {
  Ni: 5, Ne: 5, Ti: 5, Te: 5, Fi: 5, Fe: 5, Si: 4, Se: 4,
  E1: 2, E2: 2, E3: 2, E4: 2, E5: 2, E6: 2, E7: 3, E8: 2, E9: 2,
  PC_ECON_R: 3, PC_ECON_L: 3, PC_AUTH: 3, PC_LIB: 3,
  PH_NIE: 1, PH_STO: 1, PH_KAN: 1, PH_ARI: 1, PH_EXI: 1, PH_EPI: 1, PH_PRA: 1, PH_SKE: 1,
  ET_VIR: 1, ET_CON: 1, ET_DEO: 1, ET_EGO: 1,
  AT_SEC: 3, AT_ANX: 3, AT_AVO: 3, AT_DIS: 3,
  IV_SP: 1, IV_SOC: 1, IV_SX: 1,
  TMP_CHO: 1, TMP_MEL: 1, TMP_SAN: 1, TMP_PHL: 1
};

function startTest() {
  buildActiveQuestionSet();
  answers = new Array(TOTAL).fill(null);
  cur = 0;
  _explainCache = {};
  clearTestProgress();
  document.getElementById('intro').style.display='none';
  document.getElementById('quiz').style.display='block';
  setTestPhase('quiz');
  renderQ();
  saveTestProgress();
}


// ── IMPORT PROFILE ──
function parseProfileLink(raw){
  if(typeof raw !== 'string') return null;
  raw = raw.trim();
  // Strip any potential script injection from the URL
  if(/[<>'"]/g.test(raw.replace(/[A-Za-z0-9+/=.:#?&%_-]/g,''))) return null;
  var encoded = '';
  if(raw.indexOf('#profile=') > -1){ encoded = raw.split('#profile=')[1]; }
  else if(raw.indexOf('profile=') > -1){ encoded = raw.split('profile=')[1]; }
  else { encoded = raw; }
  encoded = encoded.trim().replace(/[^A-Za-z0-9+/=]/g,''); // strict base64 chars only
  if(encoded.length < 20) return null; // too short to be a valid profile
  return safeAtob(encoded);
}

var _profileLinkBtn = document.getElementById('profileLinkBtn') || document.getElementById('importBtn');
if (_profileLinkBtn) _profileLinkBtn.addEventListener('click', function () { openProfileLink(); });
var _profileLinkInput = profileLinkField();
if (_profileLinkInput) {
  _profileLinkInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') openProfileLink(); });
}

function openProfileLink() {
  var raw = (_profileLinkInput && _profileLinkInput.value) || '';
  var errEl = profileLinkErrorEl();
  if (errEl) errEl.textContent = '';
  if (!raw.trim()) {
    if (errEl) errEl.textContent = 'Paste a profile link first.';
    return;
  }
  var profile = parseProfileLink(raw);
  if (!profile || !profile.mbti) {
    if (errEl) errEl.textContent = 'Invalid link — could not read profile data.';
    return;
  }
  var missingDims = Object.keys(DIM_FNS).filter(function (d) { return isDimMissing(profile, d); });
  if (missingDims.length > 0) {
    doFillGapsFromProfile(profile, missingDims);
  } else {
    doImportFromProfile(profile);
  }
}

function doImport() {
  openProfileLink();
}

function doImportFromProfile(profile) {
  var syntheticData = {
    cog:  profile.cog  || {},
    enn:  profile.enn  || {},
    att:  profile.att2 || {},
    phi:  profile.phiS || {},
    ep:   profile.ep   || {},
    eth:  profile.eth  || {},
    mf:   profile.mf   || {},
    tmp:  profile.tmp  || {},
    iv:   profile.iv   || {},
    soc:  profile.soc  || {dom:50, introvert:50, warmth:50, direct:50},
    alone:profile.alone|| {intellectual:50, sensitive:50},
    polX: profile.polX || 0,
    polY: profile.polY || 0
  };
  var syntheticEnn = {
    type:    profile.ennType    || '5',
    wing:    profile.ennWing    || '6',
    tritype: profile.ennTritype || '5/1/6',
    scores:  profile.enn        || {}
  };
  var syntheticAI = {
    mbtiName:          profile.mbtiName          || '',
    tagline:           profile.tagline           || '',
    cogNarrative:      profile.cogNarrative      || '',
    ennNarrative:      profile.ennNarrative      || '',
    attNarrative:      profile.attNarrative      || '',
    phiNarrative:      profile.phiNarrative      || '',
    politicalNarrative:profile.politicalNarrative|| '',
    aloneDesc:         profile.aloneDesc         || '',
    socialDesc:        profile.socialDesc        || '',
    shadowDesc:        profile.shadowDesc        || '',
    figures:           profile.figures           || [],
    values:            profile.values            || [],
    big5:              profile.big5              || {},
    socionics:         profile.socionics         || '',
    keirsey:           profile.keirsey           || ''
  };
  var fnsSorted = Object.keys(syntheticData.cog).sort(function(a,b){ return syntheticData.cog[b]-syntheticData.cog[a]; });

  document.getElementById('intro').style.display='none';
  setTestPhase('results');
  showResults(syntheticData, profile.mbti, syntheticEnn, profile.att||'AT_AVO',
    profile.phi||'PH_NIE', profile.instStack||'', fnsSorted, syntheticAI, true);

  setTimeout(function(){
    var badge = document.querySelector('.ai-badge');
    if(badge) badge.innerHTML = '<div class="ai-dot" style="background:var(--accent);border-radius:50%"></div>IMPORTED PROFILE';

    var bar = document.getElementById('actionBar');
    if(bar){
      bar.innerHTML = '<button class="btn-action" id="btnBackHome">&#8592; BACK TO HOME</button>'
        +'<button class="btn-action" id="btnPDFImport"><span class="btn-action-icon">&#9113;</span> DOWNLOAD PDF</button>';
      bar.style.display = 'flex';
      document.getElementById('btnBackHome').addEventListener('click', function(){
        document.getElementById('results').style.display='none';
        bar.style.display='none';
        document.getElementById('intro').style.display='flex';
        setTestPhase('intro');
        var inp = profileLinkField();
        if (inp) inp.value = '';
        var err = profileLinkErrorEl();
        if (err) err.textContent = '';
      });
      document.getElementById('btnPDFImport').addEventListener('click', function(){
        downloadPDF(profile, syntheticData, profile.mbti, syntheticEnn,
          profile.att||'AT_AVO', profile.phi||'PH_NIE', profile.instStack||'', syntheticAI);
      });
    }
  }, 200);
}

// ── FILL GAPS ──
function doFillGapsFromProfile(profile, missingDims) {
  if (!missingDims || !missingDims.length) {
    doImportFromProfile(profile);
    return;
  }
  var missingFns = [];
  missingDims.forEach(function (d) { missingFns = missingFns.concat(DIM_FNS[d]); });
  var filteredQ = Q.filter(function (q) { return missingFns.indexOf(q.fn) > -1; });
  shuffle(filteredQ);
  window._baseProfile = profile;
  window._fillQ = filteredQ;
  window._fullQ = Q;
  runFillQuiz(filteredQ, profile, missingDims);
}

// ── OBSERVER / ESTIMATOR MODE ──
var observerMode = false;
var observerSubjectName = '';

document.getElementById('observerBtn').addEventListener('click', function(){
  var wrap = document.getElementById('observerNameWrap');
  var isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'flex';
  if(!isOpen) document.getElementById('observerName').focus();
});

document.getElementById('startObserverBtn').addEventListener('click', function(){
  var name = document.getElementById('observerName').value.trim();
  if(!name){ document.getElementById('observerName').style.borderColor='var(--red)'; return; }
  observerMode = true;
  observerSubjectName = name;
  // Start the test in full mode for the observer
  var activeQ = Q.slice();
  shuffle(activeQ);
  window._activeQ = activeQ;
  window._observerMode = true;
  window._observerName = name;
  TOTAL = activeQ.length;
  answers = new Array(TOTAL).fill(null);
  cur = 0;
  _explainCache = {};
  document.getElementById('intro').style.display='none';
  document.getElementById('quiz').style.display='block';
  setTestPhase('quiz');
  document.querySelector('.qhdr-logo').innerHTML = 'ANI<span>MUS</span> <span class="qhdr-est">ESTIMATOR</span>';
  document.getElementById('qSection').textContent = 'Estimating: ' + name;
  renderQ();
});

// Which fn codes belong to which dimension
var DIM_FNS = {
  mf:   ['MF_CARE','MF_FAIR','MF_LOY','MF_AUTH','MF_PUR','MF_LIB'],
  phi:  ['PH_STO','PH_EPI','PH_KAN','PH_ARI','PH_NIE','PH_EXI','PH_PRA','PH_SKE'],
  ep:   ['EP_RAT','EP_EMP','EP_INT','EP_SKP'],
  eth:  ['ET_VIR','ET_CON','ET_DEO','ET_EGO'],
  att:  ['AT_SEC','AT_ANX','AT_AVO','AT_DIS'],
  cog:  ['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'],
  enn:  ['E1','E2','E3','E4','E5','E6','E7','E8','E9'],
  tmp:  ['TMP_CHO','TMP_MEL','TMP_SAN','TMP_PHL'],
  iv:   ['IV_SP','IV_SOC','IV_SX'],
  soc:  ['SOC_DOM','SOC_INT','SOC_WAR','SOC_DIR'],
  alone:['AL_INT','AL_SEN'],
  pol:  ['PC_ECON_L','PC_ECON_R','PC_AUTH','PC_LIB']
};

function isDimMissing(profile, dim){
  // A dimension is "missing" if its data object is absent, empty, or all values are exactly 50
  var map = {
    mf:'mf', phi:'phiS', ep:'ep', eth:'eth',
    att:'att2', cog:'cog', enn:'enn', tmp:'tmp',
    iv:'iv', pol:null, soc:'soc', alone:'alone'
  };
  var key = map[dim];
  if(dim === 'pol') return (profile.polX === undefined || profile.polX === null);
  if(!key) return false;
  var obj = profile[key];
  if(!obj || Object.keys(obj).length === 0) return true;
  var vals = Object.values(obj);
  return vals.every(function(v){ return v === 50 || v === undefined; });
}

function runFillQuiz(filteredQ, baseProfile, missingDims){
  var fillAnswers = new Array(filteredQ.length).fill(null);
  var fillCur = 0;

  document.getElementById('intro').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
  setTestPhase('quiz');

  var missingLabel = missingDims.length + ' missing dimension' + (missingDims.length > 1 ? 's' : '');
  document.getElementById('qSection').textContent = '';

  function renderFill(){
    var q = filteredQ[fillCur];
    var pct = Math.round((fillCur / filteredQ.length) * 100);
    document.getElementById('pbarFill').style.width = pct + '%';
    document.getElementById('qNum').textContent = (fillCur + 1) + ' / ' + filteredQ.length + ' (' + missingLabel + ')';

    var _esEntry = ES[q.t] || {};
    var qText = (lang==='es' && (_esEntry.es_t || q.es_t)) ? (_esEntry.es_t || q.es_t) : q.t;
    var hasExplain = !!(q.e || _esEntry.es);
    var explainText = lang==='es' ? (_esEntry.es || q.es || q.e || '') : (q.e || '');
    var lbl = scaleLabels[lang] || scaleLabels['en'];

    var html = '<div class="q-header-row"><div class="q-text">' + qText + '</div></div>';
    if(hasExplain){
      html += '<button class="btn-explain" id="btnExplain"><span class="btn-explain-icon">◎</span>'
        + (lang==='es'?'SIMPLIFICAR PREGUNTA':'SIMPLIFY QUESTION') + '</button>';
      html += '<div class="explain-bubble" id="explainBubble">' + explainText + '</div>';
    }

    if(q.type === 's'){
      html += '<div class="scale-wrap"><div class="scale-row">';
      for(var i=1;i<=7;i++){
        var c = fillAnswers[fillCur]===i ? 'scale-btn sel' : 'scale-btn';
        html += '<button class="'+c+'" data-v="'+i+'">'+i+'</button>';
      }
      html += '</div><div class="scale-lbls"><span>'+lbl.lo+'</span><span>'+lbl.hi+'</span></div></div>';
    } else {
      html += '<div class="agree-grid">';
      for(var j=0;j<lbl.opts.length;j++){
        var v = j+1;
        var c2 = fillAnswers[fillCur]===v ? 'agree-btn sel' : 'agree-btn';
        html += '<button class="'+c2+'" data-v="'+v+'"><span class="agree-lbl">'+String.fromCharCode(65+j)+'</span>'+lbl.opts[j]+'</button>';
      }
      html += '</div>';
    }

    var isLast = fillCur === filteredQ.length - 1;
    var hasAns = fillAnswers[fillCur] !== null;
    var backTxt  = lang==='es' ? '&#8592; ATRÁS' : '&#8592; BACK';
    var nextTxt  = lang==='es' ? 'SIGUIENTE &#8594;' : 'NEXT &#8594;';
    var resTxt   = lang==='es' ? 'VER RESULTADOS &#8594;' : 'SEE RESULTS &#8594;';
    html += '<div class="nav-row">'
      + '<button class="btn-sec" id="bBtn"'+(fillCur===0?' disabled':'')+'>'+backTxt+'</button>'
      + '<button class="btn-next'+(hasAns?'':' disabled')+'" id="nBtn"'+(hasAns?'':' disabled')+'>'
      + (isLast ? resTxt : nextTxt) + '</button></div>';

    var body = document.getElementById('qBody');
    body.innerHTML = html;
    window.scrollTo(0,0);

    var bBtn = document.getElementById('bBtn');
    var nBtn = document.getElementById('nBtn');
    var btnEx = document.getElementById('btnExplain');
    var bubbleEl = document.getElementById('explainBubble');

    if(btnEx && bubbleEl){
      btnEx.addEventListener('click', function(){
        bubbleEl.classList.toggle('open');
        var isOpen = bubbleEl.classList.contains('open');
        btnEx.innerHTML = '<span class="btn-explain-icon">'+(isOpen?'×':'◎')+'</span>'
          +(isOpen?(lang==='es'?'CERRAR EXPLICACIÓN':'CLOSE EXPLANATION'):(lang==='es'?'SIMPLIFICAR PREGUNTA':'SIMPLIFY QUESTION'));
      });
    }
    body.querySelectorAll('[data-v]').forEach(function(btn){
      btn.addEventListener('click', function(){
        fillAnswers[fillCur] = parseInt(this.getAttribute('data-v'), 10);
        renderFill();
      });
    });
    if(bBtn && !bBtn.disabled) bBtn.addEventListener('click', function(){ fillCur--; renderFill(); });
    if(nBtn && !nBtn.disabled) nBtn.addEventListener('click', function(){
      if(isLast){ finishFill(filteredQ, fillAnswers, baseProfile); }
      else { fillCur++; renderFill(); }
    });
  }

  renderFill();
}

function finishFill(filteredQ, fillAnswers, baseProfile){
  document.getElementById('quiz').style.display = 'none';
  document.getElementById('loading').style.display = 'flex';

  // Score just the answered questions
  var newScores = {};
  filteredQ.forEach(function(q, i){
    if(!newScores[q.fn]) newScores[q.fn] = {sum:0,cnt:0};
    newScores[q.fn].sum += ((fillAnswers[i]||4)-1)/6*100;
    newScores[q.fn].cnt++;
  });
  var averaged = {};
  Object.keys(newScores).forEach(function(fn){
    averaged[fn] = Math.round(newScores[fn].sum / newScores[fn].cnt);
  });

  // Merge into base profile data — new answers override missing dimensions
  var mergedCog  = Object.assign({}, baseProfile.cog  || {});
  var mergedEnn  = Object.assign({}, baseProfile.enn  || {});
  var mergedAtt  = Object.assign({}, baseProfile.att2 || {});
  var mergedMf   = Object.assign({}, baseProfile.mf   || {});
  var mergedPhi  = Object.assign({}, baseProfile.phiS || {});
  var mergedEp   = Object.assign({}, baseProfile.ep   || {});
  var mergedEth  = Object.assign({}, baseProfile.eth  || {});
  var mergedTmp  = Object.assign({}, baseProfile.tmp  || {});
  var mergedIv   = Object.assign({}, baseProfile.iv   || {});
  var mergedSoc  = Object.assign({}, baseProfile.soc  || {dom:50,introvert:50,warmth:50,direct:50});
  var mergedAlone= Object.assign({}, baseProfile.alone|| {intellectual:50,sensitive:50});

  Object.keys(averaged).forEach(function(fn){
    var v = averaged[fn];
    if(fn in mergedCog || ['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'].indexOf(fn)>-1) mergedCog[fn]=v;
    else if(/^E\d$/.test(fn)) mergedEnn[fn]=v;
    else if(fn.indexOf('AT_')===0) mergedAtt[fn]=v;
    else if(fn.indexOf('MF_')===0) mergedMf[fn]=v;
    else if(fn.indexOf('PH_')===0) mergedPhi[fn]=v;
    else if(fn.indexOf('EP_')===0) mergedEp[fn]=v;
    else if(fn.indexOf('ET_')===0) mergedEth[fn]=v;
    else if(fn.indexOf('TMP_')===0) mergedTmp[fn]=v;
    else if(fn.indexOf('IV_')===0) mergedIv[fn]=v;
    else if(fn.indexOf('SOC_')===0){ /* soc handled by score() */ }
    else if(fn.indexOf('AL_')===0){ /* alone handled by score() */ }
  });

  // Build full data object
  var mergedData = {
    cog:mergedCog, enn:mergedEnn, att:mergedAtt,
    phi:mergedPhi, ep:mergedEp, eth:mergedEth, mf:mergedMf,
    tmp:mergedTmp, iv:mergedIv,
    soc: mergedSoc, alone: mergedAlone,
    polX: baseProfile.polX||0, polY: baseProfile.polY||0
  };

  // If political questions were in the fill set, recalculate polX/polY
  var hasPol = filteredQ.some(function(q){ return q.fn && q.fn.indexOf('PC_')===0; });
  if(hasPol){
    // use averaged directly for pol recalc
    var econL = averaged['PC_ECON_L']||50;
    var econR = averaged['PC_ECON_R']||50;
    var auth  = averaged['PC_AUTH']  ||50;
    var lib   = averaged['PC_LIB']   ||50;
    mergedData.polX = Math.max(-100, Math.min(100, Math.round(econR-econL)));
    mergedData.polY = Math.max(-100, Math.min(100, Math.round(auth-lib)));
  }

  var mbti = baseProfile.mbti;
  var fnsSorted = Object.keys(mergedData.cog).sort(function(a,b){ return mergedData.cog[b]-mergedData.cog[a]; });
  var enn = { type:baseProfile.ennType||'5', wing:baseProfile.ennWing||'6', tritype:baseProfile.ennTritype||'', scores:mergedEnn };

  var steps=['Merging data...','Computing updated scores...','Generating narrative...'];
  var si=0;
  var iv2=setInterval(function(){ si++; if(si<steps.length) document.getElementById('loadStatus').textContent=steps[si]; },1200);

  var prompt = buildPrompt({mbti:mbti, ennResult:enn, att:baseProfile.att||'AT_AVO', phi:baseProfile.phi||'PH_NIE', instStack:baseProfile.instStack||'', cog:mergedData.cog, polX:mergedData.polX||0, polY:mergedData.polY||0});

  callAIWithRetry(prompt, 3, function(aiRes){
    clearInterval(iv2);
    document.getElementById('loading').style.display='none';
    showResults(mergedData, mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE',
      baseProfile.instStack||'', fnsSorted, aiRes, false);
  }, function(){
    clearInterval(iv2);
    document.getElementById('loading').style.display='none';
    var fallback = buildFallbackNarrative(mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE', mergedData);
    showResults(mergedData, mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE',
      baseProfile.instStack||'', fnsSorted, fallback, true);
  });
}

function renderQ(){
  refreshAnimusLang();
  var q=(window._activeQ||Q)[cur];
  var pct=Math.round((cur/TOTAL)*100);
  document.getElementById('pbarFill').style.width=pct+'%';
  document.getElementById('qNum').textContent=(cur+1)+' / '+TOTAL;
  document.getElementById('qSection').textContent=q.sec||'';

  var _esEntry = ES[q.t] || {};
  var qText = (lang==='es' && (_esEntry.es_t || q.es_t)) ? (_esEntry.es_t || q.es_t) : q.t;
  var explainText = lang==='es'
    ? (_esEntry.es || q.es || q.e || '')
    : (q.e || _explainCache[cur] || '');
  var lbl = scaleLabels[lang]||scaleLabels['en'];

  var h = '<div class="q-header-row"><div class="q-text">'+qText+'</div></div>';

  // Always show simplify button
  h += '<button class="btn-explain" id="btnExplain">&#9711; '+(lang==='es'?'Simplificar pregunta':'Simplify question')+'</button>';
  h += '<div class="explain-bubble" id="explainBubble">'+(explainText||'')+'</div>';

  if(q.type==='mc' && q.choices){
    h += '<div class="mc-choices">';
    q.choices.forEach(function(c, ci){
      var sel = (_choiceIx[cur]===ci || (answers[cur]===c.s && _choiceIx[cur]===undefined)) ? ' selected' : '';
      h += '<button class="mc-choice'+sel+'" data-v="'+c.s+'" data-ci="'+ci+'">'
        + '<span class="mc-letter">'+c.l+'</span>'
        + '<div class="mc-content"><span class="mc-text">'+escapeHTML(c.t)+'</span></div>'
        + '</button>';
    });
    h += '</div>';
  } else if(q.type==='s'){
    h += '<div class="scale-wrap"><div class="scale-row">';
    for(var i=1;i<=7;i++){
      var sc = answers[cur]===i ? 'scale-btn sel' : 'scale-btn';
      h += '<button class="'+sc+'" data-v="'+i+'">'+i+'</button>';
    }
    h += '</div><div class="scale-lbls"><span>'+lbl.lo+'</span><span>'+lbl.hi+'</span></div></div>';
  } else {
    var opts = lbl.opts;
    h += '<div class="agree-grid">';
    for(var j=0;j<opts.length;j++){
      var v = j+1;
      var sel2 = answers[cur]===v ? ' sel' : '';
      var letter = String.fromCharCode(65+j);
      h += '<button class="agree-btn'+sel2+'" data-v="'+v+'">'
        + '<span class="agree-letter">'+letter+'</span>'
        + '<span class="agree-label">'+opts[j]+'</span>'
        + '</button>';
    }
    h += '</div>';
  }

  var isLast = cur===TOTAL-1;
  var hasAns = answers[cur]!==null;
  h += '<div class="nav-row">'
    + '<button class="btn-sec" id="bBtn"'+(cur===0?' disabled':'')+'>&#8592; '+(lang==='es'?'ATRÁS':'BACK')+'</button>'
    + '<button class="btn-next'+(hasAns?'':' disabled')+'" id="nBtn"'+(hasAns?'':' disabled')+'>'
    + (isLast?(lang==='es'?'VER RESULTADOS &#8594;':'SEE RESULTS &#8594;'):(lang==='es'?'SIGUIENTE &#8594;':'NEXT &#8594;'))+'</button>'
    + '</div>';

  var body = document.getElementById('qBody');
  body.innerHTML = h;
  window.scrollTo(0,0);

  var btnEx = document.getElementById('btnExplain');
  var bubbleEl = document.getElementById('explainBubble');
  if(btnEx && bubbleEl){
    btnEx.addEventListener('click', function(){
      var open = bubbleEl.classList.toggle('open');
      btnEx.innerHTML = (open?'&times; ':'&#9711; ')+(lang==='es'?(open?'Cerrar':'Simplificar pregunta'):(open?'Close':'Simplify question'));
      // If opening and no cached explanation, call Anthropic directly
      if(open && !_explainCache[cur] && !bubbleEl.textContent.trim()){
        bubbleEl.textContent = lang==='es' ? 'Simplificando...' : 'Simplifying...';
        var qText2 = (window._activeQ||Q)[cur].t;
        fetch('/api/simplify',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({question:qText2, lang:lang})
        }).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(d){
          var txt=(d.simplified||'').trim().replace(/^["']|["']$/g,'');
          if(txt){ _explainCache[cur]=txt; bubbleEl.textContent=txt; }
          else { bubbleEl.textContent=lang==='es'?'No disponible':'Unavailable'; }
        }).catch(function(e){
          console.warn('Simplify failed:',e);
          bubbleEl.textContent=lang==='es'?'No disponible':'Simplification unavailable';
        });
      }
    });
  }

  body.querySelectorAll('[data-v]').forEach(function(b){
    b.addEventListener('click', function(){
      answers[cur] = parseInt(this.getAttribute('data-v'), 10);
      var ci = this.getAttribute('data-ci');
      _choiceIx[cur] = ci !== null && ci !== '' ? parseInt(ci, 10) : -1;
      renderQ();
    });
  });

  var bb = document.getElementById('bBtn');
  var nb = document.getElementById('nBtn');
  if(bb && !bb.disabled) bb.addEventListener('click', function(){ cur--; renderQ(); });
  if(nb && !nb.disabled) nb.addEventListener('click', function(){
    if(isLast) finishQuiz(); else { cur++; renderQ(); }
  });

  saveTestProgress();
}

// ── FINISH QUIZ (called when user completes last question) ──
function finishQuiz(){
  clearTestProgress();
  document.getElementById('quiz').style.display='none';
  document.getElementById('loading').style.display='flex';
  setTestPhase('loading');
  document.getElementById('loadStatus').textContent='Scoring your responses...';

  var data = score();
  var mbti = data.mbti;
  var enn  = data.ennResult;
  var att  = data.att;
  var phi  = data.phi;
  var instStack = data.instStack;
  var fnsSorted = Object.keys(data.cog).sort(function(a,b){return data.cog[b]-data.cog[a];});

  document.getElementById('loadStatus').textContent='Generating your profile...';
  var prompt = buildPrompt(data);

  callAIWithRetry(prompt, 3, function(aiRes){
    document.getElementById('loading').style.display='none';
    showResults(data, mbti, enn, att, phi, instStack, fnsSorted, aiRes, false);
  }, function(){
    document.getElementById('loading').style.display='none';
    var fallback = buildFallbackNarrative(mbti, enn, att, phi, data);
    showResults(data, mbti, enn, att, phi, instStack, fnsSorted, fallback, true);
  });
}


// ── HELPER: Attachment dominant type ──

// ── HELPER: Derive MBTI from cognitive function scores ──
function answerFingerprint(){
  var h = 2166136261;
  if (!answers) return 0;
  for (var i = 0; i < answers.length; i++) {
    if (answers[i] !== null && answers[i] !== undefined) {
      h ^= (answers[i] + i * 17);
      h = Math.imul(h, 16777619);
    }
  }
  return Math.abs(h);
}

// Population priors used only when dimension scores are ambiguous — never override a clear lead.
var POPULAR_MBTI = 'ISFJ';
var POPULAR_ENN_TYPE = '9';
var POPULAR_ENN_WING = '1';
var MBTI_TIE_EPS = 0.5;
var MBTI_STACK_TIE_GAP = 0.5;
var MBTI_BLUR_PRIOR_BONUS = 0.35;
var ENN_TYPE_TIE_GAP = 2;
var ENN_WING_TIE_GAP = 1.5;
var ENN_BLUR_PRIOR_BONUS = 0.5;

function mbtiFromDichotomies(cog, fp){
  var I = ((cog.Si || 50) + (cog.Ni || 50)) / 2;
  var E = ((cog.Se || 50) + (cog.Ne || 50)) / 2;
  var N = ((cog.Ni || 50) + (cog.Ne || 50)) / 2;
  var S = ((cog.Si || 50) + (cog.Se || 50)) / 2;
  var T = ((cog.Ti || 50) + (cog.Te || 50)) / 2;
  var F = ((cog.Fi || 50) + (cog.Fe || 50)) / 2;
  var J = ((cog.Te || 50) + (cog.Fe || 50) + (cog.Si || 50)) / 3;
  var P = ((cog.Ti || 50) + (cog.Fi || 50) + (cog.Ne || 50) + (cog.Se || 50)) / 4;
  fp = fp || 0;
  function letter(high, low, pos, neg, bit, preferOnBlur){
    var diff = high - low;
    var ad = Math.abs(diff);
    if (ad >= MBTI_TIE_EPS) return diff > 0 ? pos : neg;
    if (ad < 0.12) return preferOnBlur;
    if (ad >= 0.28) return diff > 0 ? pos : neg;
    var bucket = (fp >> bit) & 9;
    if (bucket < 3) return preferOnBlur;
    return diff >= 0 ? pos : neg;
  }
  return letter(E, I, 'E', 'I', 0, 'I')
    + letter(N, S, 'N', 'S', 1, 'S')
    + letter(T, F, 'T', 'F', 2, 'F')
    + letter(J, P, 'J', 'P', 3, 'J');
}

function cogDominantMargin(cog){
  var fns=['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'];
  var sorted=fns.slice().sort(function(a,b){ return (cog[b]||50)-(cog[a]||50); });
  var top=cog[sorted[0]]||50;
  var second=cog[sorted[1]]||50;
  return { topFn:sorted[0], secondFn:sorted[1], margin:top-second };
}

function stackDomConflicts(userDom, typeDom){
  if((userDom==='Se'||userDom==='Si')&&(typeDom==='Ne'||typeDom==='Ni')) return true;
  if((userDom==='Ne'||userDom==='Ni')&&(typeDom==='Se'||typeDom==='Si')) return true;
  if((userDom==='Te'||userDom==='Ti')&&(typeDom==='Fe'||typeDom==='Fi')) return true;
  if((userDom==='Fe'||userDom==='Fi')&&(typeDom==='Te'||typeDom==='Ti')) return true;
  return false;
}

function getMBTI(cog){
  var stacks={
    INTJ:['Ni','Te','Fi','Se'], INTP:['Ti','Ne','Si','Fe'],
    INFJ:['Ni','Fe','Ti','Se'], INFP:['Fi','Ne','Si','Te'],
    ENTJ:['Te','Ni','Se','Fi'], ENTP:['Ne','Ti','Fe','Si'],
    ENFJ:['Fe','Ni','Se','Ti'], ENFP:['Ne','Fi','Te','Si'],
    ISTJ:['Si','Te','Fi','Ne'], ISFJ:['Si','Fe','Ti','Ne'],
    ESTJ:['Te','Si','Ne','Fi'], ESFJ:['Fe','Si','Ne','Ti'],
    ISTP:['Ti','Se','Ni','Fe'], ISFP:['Fi','Se','Ni','Te'],
    ESTP:['Se','Ti','Fe','Ni'], ESFP:['Se','Fi','Te','Ni']
  };
  var w=[4,3,2,1];
  var domInfo=cogDominantMargin(cog);
  var lead=domInfo.topFn;
  var isSensing=lead==='Se'||lead==='Si';
  var isIntuitive=lead==='Ne'||lead==='Ni';
  var isThinking=lead==='Te'||lead==='Ti';
  var isFeeling=lead==='Fe'||lead==='Fi';
  var domBoost=domInfo.margin>=10?52:(domInfo.margin>=6?34:(domInfo.margin>=3?22:0));
  if((isSensing||isIntuitive)&&domInfo.margin>=3) domBoost=Math.max(domBoost,38);
  if((isThinking||isFeeling)&&domInfo.margin>=3) domBoost=Math.max(domBoost,30);
  var ranked=[];
  Object.keys(stacks).forEach(function(type){
    var stack=stacks[type];
    var s=0;
    stack.forEach(function(fn,i){ s+=(cog[fn]||50)*w[i]; });
    if(domBoost>0){
      if(stack[0]===domInfo.topFn) s+=domBoost;
      else if(stack[1]===domInfo.secondFn&&!stackDomConflicts(domInfo.topFn,stack[0])) s+=Math.round(domBoost*0.22);
      else if(stackDomConflicts(domInfo.topFn,stack[0])) s-=Math.round(domBoost*0.85);
    }
    ranked.push({ type: type, score: s });
  });
  ranked.sort(function(a,b){ return b.score - a.score; });
  var top = ranked[0].score;
  var tied = ranked.filter(function(r){ return r.score >= top - MBTI_STACK_TIE_GAP; });
  if (tied.length === 1) return tied[0].type;
  var fp = answerFingerprint();
  var dich = mbtiFromDichotomies(cog, fp);
  for (var j = 0; j < tied.length; j++) {
    if (tied[j].type === dich) return dich;
  }
  var withPrior = tied.map(function (r) {
    return {
      type: r.type,
      raw: r.score,
      adj: r.score + (r.type === POPULAR_MBTI ? MBTI_BLUR_PRIOR_BONUS : 0)
    };
  });
  withPrior.sort(function (a, b) {
    return b.adj - a.adj || b.raw - a.raw;
  });
  if (withPrior[0].type === POPULAR_MBTI && withPrior[0].raw >= top - MBTI_STACK_TIE_GAP) {
    return POPULAR_MBTI;
  }
  return withPrior[0].type;
}

// ── HELPER: Derive Enneagram type/wing/tritype from scores ──
function getEnneagram(eS){
  var nums=['E1','E2','E3','E4','E5','E6','E7','E8','E9'];
  var maxVal = -1;
  nums.forEach(function(k){ maxVal = Math.max(maxVal, eS[k] || 0); });
  var leaders = nums.filter(function(k){ return (eS[k] || 0) >= maxVal - ENN_TYPE_TIE_GAP; });
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
  var type = typeKey.replace('E','');
  var t=parseInt(type,10);
  var wL=t===1?9:t-1, wR=t===9?1:t+1;
  var wLScore = eS['E' + wL] || 0;
  var wRScore = eS['E' + wR] || 0;
  var wing;
  if (Math.abs(wLScore - wRScore) < ENN_WING_TIE_GAP) {
    if (t === parseInt(POPULAR_ENN_TYPE, 10)) wing = POPULAR_ENN_WING;
    else wing = wLScore >= wRScore ? String(wL) : String(wR);
  } else {
    wing = wLScore > wRScore ? String(wL) : String(wR);
  }
  var gut=['E8','E9','E1'].reduce(function(a,b){ return (eS[a]||0)>(eS[b]||0)?a:b; }).replace('E','');
  var heart=['E2','E3','E4'].reduce(function(a,b){ return (eS[a]||0)>(eS[b]||0)?a:b; }).replace('E','');
  var head=['E5','E6','E7'].reduce(function(a,b){ return (eS[a]||0)>(eS[b]||0)?a:b; }).replace('E','');
  var tri=[gut,heart,head];
  var mi=tri.indexOf(type); if(mi>0){ tri.splice(mi,1); tri.unshift(type); }
  return {type:type, wing:wing, tritype:tri.join(''), scores:eS};
}

function getAttachment(atS){
  var types = ['AT_SEC','AT_ANX','AT_AVO','AT_DIS'];
  var best = types.reduce(function(a,b){ return atS[a]>=atS[b]?a:b; }, types[0]);
  if(best!=='AT_SEC' && ((atS[best]||0)-(atS['AT_SEC']||0))<8) return 'AT_SEC';
  return best;
}

// ── HELPER: Philosophy dominant school ──
function getPhilosophy(phS){
  var types = ['PH_STO','PH_EPI','PH_KAN','PH_ARI','PH_NIE','PH_EXI','PH_PRA','PH_SKE'];
  return types.reduce(function(a,b){ return phS[a]>=phS[b]?a:b; }, types[0]);
}

// ── HELPER: Instinctual stack (SP/SOC/SX ordered by score) ──
function getInstinctStack(ivS){
  var order = Object.keys(ivS).sort(function(a,b){ return ivS[b]-ivS[a]; });
  return order.map(function(k){ return k.replace('IV_',''); }).join('/');
}

// ── MC CHOICE SELECTION ──
function pickMC(btn, score){
  answers[cur] = score;
  // Update visual state
  document.querySelectorAll('.mc-choice').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  // Enable next button
  var nb = document.getElementById('nBtn');
  if(nb){ nb.disabled=false; nb.classList.remove('disabled'); }
}

// ── SCORING ──
var _scoreCache = null;
var _explainCache = {}; // per-question simplified text cache

function scoreContributionBuckets(activeQ){
  var buckets = {};
  var FN_ALSO = Cross.FN_ALSO || {};
  var DERIVED_FN = Cross.DERIVED_FN || {};

  function add(fn, val, weight){
    if (val === null || val === undefined || isNaN(val)) return;
    weight = weight || 1;
    if (!buckets[fn]) buckets[fn] = { sum: 0, w: 0 };
    buckets[fn].sum += val * weight;
    buckets[fn].w += weight;
  }

  function valFromRaw(raw){
    return ((raw - 1) / 6) * 100;
  }

  activeQ.forEach(function (q, i) {
    var raw = answers[i];
    if (raw === null || raw === undefined) return;
    var val = valFromRaw(raw);
    add(q.fn, val, 1);
    if (q.also) {
      Object.keys(q.also).forEach(function (k) {
        add(k, val, q.also[k]);
      });
    }
    (FN_ALSO[q.fn] || []).forEach(function (x) {
      add(x.fn, val, x.w);
    });
    if (q.type === 'mc' && q.choices && _choiceIx[i] >= 0) {
      var choice = q.choices[_choiceIx[i]];
      if (choice && choice.also) {
        Object.keys(choice.also).forEach(function (k) {
          add(k, valFromRaw(choice.also[k]), 0.7);
        });
      }
    }
  });

  function finalize(fn){
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

  return { buckets: buckets, finalize: finalize };
}

function score(){
  var activeQ = window._activeQ || Q;
  var scored = scoreContributionBuckets(activeQ);
  function avg(fn){
    return scored.finalize(fn);
  }

  // Cognitive functions
  var cog={};
  ['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'].forEach(function(f){ cog[f]=avg(f); });

  // Enneagram
  var eS={};
  ['E1','E2','E3','E4','E5','E6','E7','E8','E9'].forEach(function(e){ eS[e]=avg(e); });

  // Attachment
  var atS={};
  ['AT_SEC','AT_ANX','AT_AVO','AT_DIS'].forEach(function(a){ atS[a]=avg(a); });

  // Philosophy
  var phS={};
  ['PH_STO','PH_EPI','PH_KAN','PH_ARI','PH_NIE','PH_EXI','PH_PRA','PH_SKE'].forEach(function(p){ phS[p]=avg(p); });

  // Epistemology
  var epS={};
  ['EP_RAT','EP_EMP','EP_INT','EP_SKP'].forEach(function(e){ epS[e]=avg(e); });

  // Ethics
  var etS={};
  ['ET_VIR','ET_CON','ET_DEO','ET_EGO'].forEach(function(e){ etS[e]=avg(e); });

  // Moral foundations
  var mfS={};
  ['MF_CARE','MF_FAIR','MF_LOY','MF_AUTH','MF_PUR','MF_LIB'].forEach(function(m){ mfS[m]=avg(m); });

  // Temperament
  var tmpS={};
  ['TMP_CHO','TMP_MEL','TMP_SAN','TMP_PHL'].forEach(function(t){ tmpS[t]=avg(t); });

  // Instinct
  var ivS={};
  ['IV_SP','IV_SOC','IV_SX'].forEach(function(v){ ivS[v]=avg(v); });

  // Social
  var socS={};
  ['SOC_DOM','SOC_INT','SOC_WAR','SOC_DIR'].forEach(function(s){ socS[s]=avg(s); });

  // Alone
  var alS={};
  ['AL_INT','AL_SEN'].forEach(function(a){ alS[a]=avg(a); });

  // ── DERIVED TYPES ──
  var mbti = getMBTI(cog);
  var ennResult = getEnneagram(eS);
  var att = getAttachment(atS);
  var phi = getPhilosophy(phS);
  var instStack = getInstinctStack(ivS);

  // ── POLITICAL (direct only — no compression) ──
  var econL = avg('PC_ECON_L');
  var econR = avg('PC_ECON_R');
  var auth  = avg('PC_AUTH');
  var lib   = avg('PC_LIB');
  var polX = Math.max(-100, Math.min(100, Math.round(econR - econL)));
  var polY = Math.max(-100, Math.min(100, Math.round(auth  - lib)));

  var data = {
    // Raw dimension scores (objects)
    cog: cog, ennScores: eS, attScores: atS, phiScores: phS,
    ep: epS, eth: etS, mf: mfS, tmp: tmpS, iv: ivS, soc: socS, alone: alS,
    // Derived type labels (strings)
    mbti: mbti,
    ennResult: ennResult,  // {type, wing, tritype, scores}
    att: att,              // e.g. 'AT_AVO'
    phi: phi,              // e.g. 'PH_NIE'
    instStack: instStack,  // e.g. 'SP/SX/SOC'
    polX: polX, polY: polY
  };

  _scoreCache = data;
  return data;
}

// ── BUILD AI PROMPT ──
function buildPrompt(data){
  var mbti = data.mbti;
  var enn  = data.ennResult;
  var att  = data.att;
  var phi  = data.phi;
  var inst = data.instStack;
  var fnsSorted = Object.keys(data.cog).sort(function(a,b){return data.cog[b]-data.cog[a];});
  var cogStr = fnsSorted.map(function(f,i){ return f+':'+data.cog[f]+(i<4?'(pos'+(i+1)+')':''); }).join(', ');

  var polQuadrant = (Math.abs(data.polX)<10&&Math.abs(data.polY)<10)?'True Centrist':
                    data.polX>0&&data.polY<0?'Lib-Right':
                    data.polX>0&&data.polY>0?'Auth-Right':
                    data.polX<0&&data.polY<0?'Lib-Left':'Auth-Left';

  return 'You are an expert in MBTI, Enneagram, Jungian psychology, political philosophy, and ethics.\n\n'
    +'SCORES:\n'
    +'Cognitive functions: '+cogStr+'\n'
    +'MBTI: '+mbti+', Enneagram: '+enn.type+'w'+enn.wing+' (tritype '+enn.tritype+')\n'
    +'Attachment: '+att+', Philosophy: '+phi+', Instinctual stack: '+inst+'\n'
    +'Political compass: X='+data.polX+' (positive=economic right, negative=economic left) '
    +'Y='+data.polY+' (positive=authoritarian, negative=libertarian)\n'
    +'Quadrant: '+polQuadrant+'\n'
    +'Economic interpretation: '+(data.polX>60?'Hard libertarian-right':data.polX>30?'Classical liberal / libertarian':data.polX>10?'Centre-right':data.polX>-10?'True centrist':data.polX>-30?'Centre-left / social democrat':data.polX>-60?'Democratic socialist':'Hard left')+'\n'
    +'Social interpretation: '+(data.polY<-60?'Strong libertarian / near-anarchist':data.polY<-30?'Libertarian':data.polY<-10?'Centre-libertarian':data.polY<10?'Moderate':data.polY<30?'Centre-authoritarian':data.polY<60?'Authoritarian':'Hard authoritarian')+'\n\n'
    +'IMPORTANT: Base ALL analysis on the actual scores above. Do NOT default to stereotype assumptions (INTJ, ENTJ, etc.). '
    +'This person is '+mbti+' type '+enn.type+'w'+enn.wing+'. Their dominant function is '+fnsSorted[0]+'. '
    +'Be specific to THEIR actual profile — every narrative must match their actual scores.\n\n'
    +'Return a JSON object with EXACTLY these keys:\n'
    +'{\n'
    +'"mbtiName":"archetype name 3-4 words — specific to '+mbti+', NOT generic",\n'
    +'"tagline":"one sentence capturing '+mbti+' type '+enn.type+'w'+enn.wing+' essence",\n'
    +'"cogNarrative":"2-3 paragraphs on '+mbti+' cognitive style — must reference '+fnsSorted[0]+' as dominant function and '+fnsSorted[1]+' as auxiliary. Describe how THEY think, not how INTJs think.",\n'
    +'"ennNarrative":"2 paragraphs on type '+enn.type+'w'+enn.wing+' motivation and pattern — specific to this type, not generic enneagram text",\n'
    +'"attNarrative":"1-2 paragraphs on '+att+' attachment pattern in relationships",\n'
    +'"phiNarrative":"1-2 paragraphs on '+phi+' philosophical orientation",\n'
    +'"politicalNarrative":"3 paragraphs: (1) Exact position for quadrant '+polQuadrant+' with X='+data.polX+' Y='+data.polY+' — name the specific ideology. (2) How their personality type '+mbti+' enn '+enn.type+'w'+enn.wing+' connects to this politics. (3) Genuine tensions and blind spots of this position.",\n'
    +'"politicalIdeology":"specific label — e.g. Classical Liberal, Paleolibertarian, National Conservative, Democratic Socialist, Left-Libertarian",\n'
    +'"politicalIdeologyDesc":"3 sentences on what this ideology believes and why it fits polX='+data.polX+' polY='+data.polY+'",\n'
    +'"similarCountries":["5 countries matching polX='+data.polX+' polY='+data.polY+' — format \'Country: specific reason\'"],\n'
    +'"similarPoliticians":["6 politicians matching this profile — format \'Name (Country): reason\' — include non-Western figures"],\n'
    +'"similarParties":["5 parties from 3+ countries — format \'Party (Country): reason\'"],\n'
    +'"politicalStrengths":"3 sentences on genuine strengths of this position",\n'
    +'"politicalWeaknesses":"3 sentences on genuine blind spots and failures",\n'
    +'"politicalThinkers":["4-5 thinkers resonant with polX='+data.polX+' polY='+data.polY+' AND '+phi+' philosophy — format \'Name: reason\'"],\n'
    +'"aloneDesc":"2 sentences on how '+mbti+' type '+enn.type+' experiences solitude",\n'
    +'"socialDesc":"2 sentences on how '+mbti+' type '+enn.type+' presents socially",\n'
    +'"shadowDesc":"2 sentences on the shadow side of '+fnsSorted[0]+' dominance",\n'
    +'"figures":[\n'
    +'  8 real or fictional figures who share '+mbti+' enn '+enn.type+'w'+enn.wing+' profile.\n'
    +'  Format: {"name":"Full Name","cat":"Historical|Celebrity|Pop Culture","type":"'+mbti+' '+enn.type+'w'+enn.wing+'","initials":"2-3 chars","note":"1 sentence why similar"}\n'
    +'  Include: 3 historical, 2 celebrity, 2 pop culture/fictional, 1 philosopher. Must match '+mbti+' — not INTJ defaults.\n'
    +'],\n'
    +'"values":["6 core values as short noun phrases for '+mbti+' type '+enn.type+'"],\n'
    +'"big5":{"Openness":0-100,"Conscientiousness":0-100,"Extraversion":0-100,"Agreeableness":0-100,"Neuroticism":0-100},\n'
    +'"socionics":"socionics type for '+mbti+'",\n'
    +'"keirsey":"one of: Rational/Idealist/Guardian/Artisan"\n'
    +'}\n'
    +'Respond ONLY with raw JSON. No markdown, no explanation, no fences.';
}



function callAIWithRetry(prompt,retriesLeft,onSuccess,onFail){
  var retryEl=document.getElementById('loadRetry');
  var attempt=4-retriesLeft;
  if(attempt>0) retryEl.textContent='Retry '+attempt+' of 3...';

  fetch('/api/score',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt:prompt})
  })
  .then(function(r){
    if(!r.ok) throw new Error('API error '+r.status);
    return r.json();
  })
  .then(function(d){
    var text=(d.content||[]).map(function(b){return b.type==='text'?b.text:'';}).join('').replace(/```json|```/g,'').trim();
    var parsed=JSON.parse(text);
    retryEl.textContent='';
    onSuccess(parsed);
  })
  .catch(function(e){
    console.warn('AI attempt failed:',e.message);
    // If CORS/network error, go straight to fallback (no point retrying)
    var isCORS = e.message && (e.message.indexOf('Failed to fetch')>=0 || e.message.indexOf('NetworkError')>=0 || e.message.indexOf('CORS')>=0);
    if(!isCORS && retriesLeft>1){
      setTimeout(function(){callAIWithRetry(prompt,retriesLeft-1,onSuccess,onFail);},1500);
    } else {
      retryEl.textContent='';
      onFail();
    }
  });
}

// ── FALLBACK NARRATIVE (implementation in profile-narratives.js) ──
function buildFallbackNarrative(mbti, enn, att, phi, data) {
  if (typeof ProfileNarratives !== 'undefined' && ProfileNarratives.buildFallbackNarrative) {
    return ProfileNarratives.buildFallbackNarrative(mbti, enn, att, phi, data);
  }
  return {
    mbtiName: mbti,
    tagline: '',
    cogNarrative: '',
    ennNarrative: '',
    attNarrative: '',
    phiNarrative: '',
    aloneDesc: '',
    socialDesc: '',
    shadowDesc: '',
    figures: [],
    values: [],
    big5: {},
    politicalNarrative: '',
    politicalIdeology: 'Centrist',
    politicalIdeologyDesc: '',
    politicalStrengths: '',
    politicalWeaknesses: '',
    politicalThinkers: [],
    similarCountries: [],
    similarPoliticians: [],
    similarParties: [],
    socionics: '',
    keirsey: ''
  };
}
// ── RENDER RESULTS ──// ── RENDER RESULTS ──
var TABS=[
  {id:'overview',label:'Overview'},
  {id:'cognitive',label:'Cognition'},
  {id:'personality',label:'Personality'},
  {id:'philosophy',label:'Philosophy'},
  {id:'political',label:'Political'},
  {id:'social',label:'Social'},
  {id:'figures',label:'Figures'}
];

function showResults(data,mbti,enn,att,phi,instStack,fnsSorted,ai,isFallback){
  var res=document.getElementById('results');
  res.style.display='block';
  setTestPhase('results');
  window.scrollTo(0,0);

  // Hero
  var badge=isFallback
    ?'<div class="ai-badge"><div class="ai-dot" style="background:#333"></div>LOCAL ANALYSIS</div>'
    :'<div class="ai-badge"><div class="ai-dot" style="background:var(--accent)"></div>AI ANALYSIS</div>';

  var phiNames={'PH_STO':'Stoic','PH_EPI':'Epicurean','PH_KAN':'Kantian','PH_ARI':'Aristotelian','PH_NIE':'Nietzschean','PH_EXI':'Existentialist','PH_PRA':'Pragmatist','PH_SKE':'Skeptic'};
  var attNames={'AT_SEC':'Secure','AT_ANX':'Anxious-Preoccupied','AT_AVO':'Dismissive-Avoidant','AT_DIS':'Fearful-Avoidant'};
  var polLabel=(data.polX>5?'Econ Freedom':(data.polX<-5?'State Economy':'Mixed'))+'/'+(data.polY>5?'Authoritarian':(data.polY<-5?'Libertarian':'Moderate'));

  document.getElementById('resHero').innerHTML=badge
    +'<div class="res-eyebrow">Your Complete Profile</div>'
    +'<div class="res-type">'+mbti+'</div>'
    +'<div class="res-archetype">'+(sanitizeText(ai.mbtiName,2000)||'')+'</div>'
    +'<p class="res-tagline">'+(sanitizeText(ai.tagline,2000)||'')+'</p>'
    +'<div class="res-chips">'
    +'<div class="chip"><strong>MBTI</strong>'+mbti+'</div>'
    +'<div class="chip"><strong>Enn</strong>'+enn.type+'w'+enn.wing+'</div>'
    +'<div class="chip"><strong>Tritype</strong>'+enn.tritype+'</div>'
    +'<div class="chip"><strong>Attachment</strong>'+attNames[att]+'</div>'
    +'<div class="chip"><strong>Philosophy</strong>'+(phiNames[phi]||phi)+'</div>'
    +'<div class="chip"><strong>Political</strong>'+(sanitizeText(ai.politicalIdeology,2000)||polLabel)+'</div>'
    +'<div class="chip"><strong>Instinct</strong>'+instStack+'</div>'
    +'<div class="chip"><strong>Socionics</strong>'+(sanitizeText(ai.socionics,2000)||'')+'</div>'
    +'<div class="chip"><strong>Keirsey</strong>'+(sanitizeText(ai.keirsey,2000)||'')+'</div>'
    +'</div>';

  // Build tabs
  var tabsHtml='';
  TABS.forEach(function(t,i){
    tabsHtml+='<div class="tab'+(i===0?' active':'')+'" data-tab="'+t.id+'">'+t.label+'</div>';
  });
  document.getElementById('tabsBar').innerHTML=tabsHtml;

  // Build panels
  var panels='';

  // ── OVERVIEW PANEL ──
  panels+='<div class="panel active" id="panel-overview">'
    +'<div class="panel-title">Your Profile at a Glance</div>'
    +'<p class="panel-sub">A complete summary of who you are across every dimension measured.</p>'

    +'<div class="stat-grid">'
    +'<div class="stat-cell"><span class="stat-big">'+mbti+'</span><span class="stat-lbl">MBTI Type</span></div>'
    +'<div class="stat-cell"><span class="stat-big">'+enn.type+'w'+enn.wing+'</span><span class="stat-lbl">Enneagram</span></div>'
    +'<div class="stat-cell"><span class="stat-big">'+fnsSorted[0]+'</span><span class="stat-lbl">Dominant Fn</span></div>'
    +'</div>'

    +'<div class="grid2">'
    +'<div class="card2"><div class="card-title">Alone — Inner World</div><p style="font-size:11px;color:var(--muted2);line-height:1.9;">'+(sanitizeText(ai.aloneDesc,2000)||'')+'</p></div>'
    +'<div class="card2"><div class="card-title">With Others — Social Presence</div><p style="font-size:11px;color:var(--muted2);line-height:1.9;">'+(sanitizeText(ai.socialDesc,2000)||'')+'</p></div>'
    +'</div>'

    +'<div class="card"><div class="card-title">Shadow & Blind Spots</div><p style="font-size:11px;color:var(--muted2);line-height:1.9;">'+(sanitizeText(ai.shadowDesc,2000)||'')+'</p></div>'

    +'<div class="section-label">Core Values</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px;">'
    +(Array.isArray(ai.values)?ai.values.map(function(v){return '<div class="value-tag"><div class="value-dot"></div>'+escapeHTML(v)+'</div>';}).join(''):'')
    +'</div>'
    +'</div>';

  // ── COGNITIVE PANEL ──
  var fnLbls={Ni:'Introverted Intuition',Ne:'Extroverted Intuition',Ti:'Introverted Thinking',Te:'Extroverted Thinking',Fi:'Introverted Feeling',Fe:'Extroverted Feeling',Si:'Introverted Sensing',Se:'Extroverted Sensing'};
  var stackPos=['Dominant','Auxiliary','Tertiary','Inferior'];

  panels+='<div class="panel" id="panel-cognitive">'
    +'<div class="panel-title">Cognitive Architecture</div>'
    +'<p class="panel-sub">Your function stack — the 8 Jungian cognitive functions scored and ranked. The top 4 form your type\'s characteristic way of processing reality.</p>'
    +(sanitizeText(ai.cogNarrative,2000)?'<div class="narrative-block"><div class="narrative-title">Analysis</div><div class="narrative-text">'+sanitizeText(ai.cogNarrative,2000).split('\n\n').join('</div><div class="narrative-text" style="margin-top:12px">')+'</div></div>':'')
    +'<div class="card"><div class="card-title">All 8 Functions</div>'
    +fnsSorted.map(function(fn,i){
      var s=data.cog[fn];
      var bc=i<2?'':(i<4?'dim':'low');
      var pos=i<4?' <span class="pos-badge">'+stackPos[i]+'</span>':'';
      return '<div class="bar-row">'
        +'<div class="bar-label"><strong>'+fn+pos+'</strong><span>'+fnLbls[fn]+'</span></div>'
        +'<div class="bar-wrap"><div class="bar-fill '+bc+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')
    +'</div>'

    +'<div class="section-label">Big Five</div>'
    +'<div class="card">'
    +Object.entries(ai.big5||{}).map(function(e){
      var v=Math.max(5,Math.min(95,e[1]));
      return '<div class="trait-slider"><div class="trait-header"><span class="trait-l">'+e[0]+'</span><span class="trait-r">'+v+'%</span></div>'
        +'<div class="trait-track"><div class="trait-thumb" style="width:0%" data-w="'+v+'"></div></div></div>';
    }).join('')
    +'</div>'
    +'<div class="grid2" style="margin-top:12px">'
    +'<div class="card2"><div class="card-title">Socionics Type</div><p style="font-family:\'Cormorant Garamond\',serif;font-size:36px;font-weight:300;color:var(--text);">'+(sanitizeText(ai.socionics,2000)||'—')+'</p></div>'
    +'<div class="card2"><div class="card-title">Keirsey Temperament</div><p style="font-family:\'Cormorant Garamond\',serif;font-size:36px;font-weight:300;color:var(--text);">'+(sanitizeText(ai.keirsey,2000)||'—')+'</p></div>'
    +'</div>'
    +'</div>';

  // ── PERSONALITY PANEL ──
  var ennNames={1:'The Perfectionist',2:'The Helper',3:'The Achiever',4:'The Individualist',5:'The Investigator',6:'The Loyalist',7:'The Enthusiast',8:'The Challenger',9:'The Peacemaker'};
  var tmpNames={TMP_CHO:'Choleric',TMP_MEL:'Melancholic',TMP_SAN:'Sanguine',TMP_PHL:'Phlegmatic'};
  var sortedTmp=Object.keys(data.tmp).sort(function(a,b){return data.tmp[b]-data.tmp[a];});
  var sortedEnn=Object.keys(data.ennScores||{}).sort(function(a,b){return data.ennScores[b]-data.ennScores[a];});
  var attLabels={AT_SEC:'Secure',AT_ANX:'Anxious',AT_AVO:'Avoidant',AT_DIS:'Disorganized'};
  var ivLabels={IV_SP:'Self-Preservation',IV_SOC:'Social',IV_SX:'Sexual/Intimate'};
  var sortedIV=Object.keys(data.iv).sort(function(a,b){return data.iv[b]-data.iv[a];});

  panels+='<div class="panel" id="panel-personality">'
    +'<div class="panel-title">Personality Systems</div>'
    +'<p class="panel-sub">Enneagram, attachment style, temperament, instinctual variants, and four temperaments.</p>'

    +'<div class="section-label">Enneagram</div>'
    +(sanitizeText(ai.ennNarrative,2000)?'<div class="narrative-block"><div class="narrative-title">Type '+enn.type+'w'+enn.wing+' &mdash; '+ennNames[parseInt(enn.type)]+'</div><div class="narrative-text">'+sanitizeText(ai.ennNarrative,2000).split('\n\n').join('</div><div class="narrative-text" style="margin-top:12px">')+'</div></div>':'')
    +'<div class="grid2">'
    +'<div class="card2"><div class="card-title">Type, Wing & Tritype</div>'
    +'<p style="font-family:\'Cormorant Garamond\',serif;font-size:48px;font-weight:300;color:var(--text);line-height:1">'+enn.type+'<span style="color:var(--accent);font-size:28px">w'+enn.wing+'</span></p>'
    +'<p style="font-size:11px;color:var(--muted2);margin-top:8px">'+ennNames[parseInt(enn.type)]+'</p>'
    +'<p style="font-size:10px;color:var(--muted);margin-top:12px;letter-spacing:0.1em">TRITYPE: '+enn.tritype+'</p>'
    +'</div>'
    +'<div class="card2"><div class="card-title">All 9 Types Scored</div>'
    +sortedEnn.map(function(e){
      var n=e.replace('E','');
      var s=data.ennScores[e];
      return '<div class="bar-row" style="margin-bottom:8px">'
        +'<div class="bar-label" style="min-width:24px"><strong>'+n+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(e===sortedEnn[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')
    +'</div></div>'

    +'<div class="section-label">Instinctual Variants</div>'
    +'<div class="card"><div class="card-title">Stack: '+instStack+'</div>'
    +sortedIV.map(function(iv){
      var s=data.iv[iv];
      return '<div class="bar-row"><div class="bar-label"><strong>'+iv.replace('IV_','')+'</strong><span>'+ivLabels[iv]+'</span></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(iv===sortedIV[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'

    +'<div class="section-label">Attachment Style</div>'
    +(sanitizeText(ai.attNarrative,2000)?'<div class="narrative-block"><div class="narrative-title">'+attLabels[att]+'</div><div class="narrative-text">'+sanitizeText(ai.attNarrative,2000)+'</div></div>':'')
    +'<div class="card"><div class="card-title">All Styles Scored</div>'
    +Object.keys(data.attScores||data.att||{}).sort(function(a,b){return (data.attScores||data.att||{})[b]-(data.attScores||data.att||{})[a];}).map(function(a){
      var s=(data.attScores||{})[a];
      return '<div class="bar-row"><div class="bar-label"><strong>'+attLabels[a]+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(a===att?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'

    +'<div class="section-label">Four Temperaments</div>'
    +'<div class="card">'
    +sortedTmp.map(function(t){
      var s=data.tmp[t];
      return '<div class="bar-row"><div class="bar-label"><strong>'+tmpNames[t]+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(t===sortedTmp[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'
    +'</div>';

  // ── PHILOSOPHY PANEL ──
  var phiNames2={'PH_STO':'Stoicism','PH_EPI':'Epicureanism','PH_KAN':'Kantianism','PH_ARI':'Aristotelianism','PH_NIE':'Nietzscheanism','PH_EXI':'Existentialism','PH_PRA':'Pragmatism','PH_SKE':'Skepticism'};
  var epNames={'EP_RAT':'Rationalism','EP_EMP':'Empiricism','EP_INT':'Intuitionism','EP_SKP':'Skepticism'};
  var etNames={'ET_VIR':'Virtue Ethics','ET_CON':'Consequentialism','ET_DEO':'Deontology','ET_EGO':'Rational Egoism'};
  var sortedPhi=Object.keys(data.phi).sort(function(a,b){return data.phi[b]-data.phi[a];});
  var sortedEp=Object.keys(data.ep).sort(function(a,b){return data.ep[b]-data.ep[a];});
  var sortedEt=Object.keys(data.eth).sort(function(a,b){return data.eth[b]-data.eth[a];});
  var mfLabels={'MF_CARE':'Care / Harm','MF_FAIR':'Fairness','MF_LOY':'Loyalty','MF_AUTH':'Authority','MF_PUR':'Sanctity','MF_LIB':'Liberty'};
  var sortedMF=Object.keys(data.mf).sort(function(a,b){return data.mf[b]-data.mf[a];});

  panels+='<div class="panel" id="panel-philosophy">'
    +'<div class="panel-title">Philosophical & Moral Orientation</div>'
    +'<p class="panel-sub">Your philosophical school alignment, epistemological style, ethical framework, and moral foundations.</p>'

    +(sanitizeText(ai.phiNarrative,2000)?'<div class="narrative-block"><div class="narrative-title">'+(phiNames2[phi]||phi)+'</div><div class="narrative-text">'+sanitizeText(ai.phiNarrative,2000)+'</div></div>':'')

    +'<div class="section-label">Philosophical School</div>'
    +'<div class="card">'
    +sortedPhi.map(function(p){
      var s=data.phi[p];
      return '<div class="bar-row"><div class="bar-label"><strong>'+(phiNames2[p]||p)+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(p===sortedPhi[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'

    +'<div class="section-label">Epistemology — How You Know</div>'
    +'<div class="card">'
    +sortedEp.map(function(e){
      var s=data.ep[e];
      return '<div class="bar-row"><div class="bar-label"><strong>'+epNames[e]+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(e===sortedEp[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'

    +'<div class="section-label">Ethical Framework</div>'
    +'<div class="card">'
    +sortedEt.map(function(e){
      var s=data.eth[e];
      return '<div class="bar-row"><div class="bar-label"><strong>'+etNames[e]+'</strong></div>'
        +'<div class="bar-wrap"><div class="bar-fill'+(e===sortedEt[0]?'':' dim')+'" style="width:0%" data-w="'+s+'"></div></div>'
        +'<div class="bar-num">'+s+'</div></div>';
    }).join('')+'</div>'

    +'<div class="section-label">Moral Foundations</div>'
    +'<div class="card">'
    +sortedMF.map(function(m){
      var s=Math.max(5,Math.min(99,data.mf[m]));
      return '<div class="moral-row"><span class="moral-name">'+mfLabels[m]+'</span>'
        +'<div class="moral-bar-wrap"><div class="moral-bar-fill" style="width:0%" data-w="'+s+'"></div></div>'
        +'<span class="moral-num">'+s+'</span></div>';
    }).join('')+'</div>'
    +'</div>';

  // ── POLITICAL PANEL ──
  // polX: positive=right(economic freedom), negative=left
  // polY: positive=authoritarian(up on SVG = low dotY), negative=libertarian(down = high dotY)
  var px=data.polX, py=data.polY;
  var dotX = Math.round(100 + (px / 100) * 44);
  var dotY = Math.round(100 - (py / 100) * 44);
  dotX = Math.max(8, Math.min(192, dotX));
  dotY = Math.max(8, Math.min(192, dotY));

  var econLabel  = px >  5 ? 'Economic Freedom' : (px < -5 ? 'State Economy' : 'Mixed Economy');
  var socialLabel= py >  5 ? 'Authoritarian'    : (py < -5 ? 'Libertarian'   : 'Moderate');

  // Helper to build list items from AI array fields
  function polList(arr, labelColor){
    if(!Array.isArray(arr)||!arr.length) return '<p style="font-size:11px;color:var(--muted)">—</p>';
    return arr.map(function(item){
      var parts = item.split(':');
      var label = parts[0].trim();
      var desc  = parts.slice(1).join(':').trim();
      return '<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">'
        +'<div style="min-width:6px;margin-top:6px"><div style="width:4px;height:4px;background:'+(labelColor||'var(--accent)')+'"></div></div>'
        +'<div><div style="font-size:12px;color:var(--text);font-weight:500;margin-bottom:1px">'+escapeHTML(label)+'</div>'
        +(desc?'<div style="font-size:11px;color:var(--muted2);line-height:1.7">'+escapeHTML(desc)+'</div>':'')
        +'</div></div>';
    }).join('');
  }

  panels+='<div class="panel" id="panel-political">'
    +'<div class="panel-title">Political Compass</div>'
    +'<p class="panel-sub">Up = Authoritarian &nbsp;|&nbsp; Down = Libertarian &nbsp;|&nbsp; Right = Economic Freedom &nbsp;|&nbsp; Left = State Control</p>'

    // Compass + axis cards
    +'<div class="grid2" style="align-items:start;margin-bottom:16px">'
    +'<div class="compass-wrap">'
    +'<svg class="compass-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
    +'<rect width="200" height="200" fill="#0d0d0d"/>'
    +'<rect x="0"   y="0"   width="100" height="100" fill="rgba(120,30,30,0.18)"/>'
    +'<rect x="100" y="0"   width="100" height="100" fill="rgba(100,75,20,0.18)"/>'
    +'<rect x="0"   y="100" width="100" height="100" fill="rgba(26,58,92,0.18)"/>'
    +'<rect x="100" y="100" width="100" height="100" fill="rgba(26,74,42,0.18)"/>'
    +'<line x1="100" y1="2"   x2="100" y2="198" stroke="#252525" stroke-width="1"/>'
    +'<line x1="2"   y1="100" x2="198" y2="100" stroke="#252525" stroke-width="1"/>'
    +'<text x="100" y="10"  text-anchor="middle" fill="#555" font-size="6.5" font-family="IBM Plex Mono" letter-spacing="1">AUTHORITARIAN</text>'
    +'<text x="100" y="197" text-anchor="middle" fill="#555" font-size="6.5" font-family="IBM Plex Mono" letter-spacing="1">LIBERTARIAN</text>'
    +'<text x="4"   y="103" fill="#555" font-size="6.5" font-family="IBM Plex Mono" letter-spacing="0.5">STATE</text>'
    +'<text x="148" y="103" fill="#555" font-size="6.5" font-family="IBM Plex Mono" letter-spacing="0.5">FREEDOM</text>'
    +'<text x="4"   y="20" fill="#3a2a2a" font-size="5.5" font-family="IBM Plex Mono">AUTH-LEFT</text>'
    +'<text x="118" y="20" fill="#3a3020" font-size="5.5" font-family="IBM Plex Mono">AUTH-RIGHT</text>'
    +'<text x="4"   y="194" fill="#1a2a3a" font-size="5.5" font-family="IBM Plex Mono">LIB-LEFT</text>'
    +'<text x="118" y="194" fill="#1a2a1a" font-size="5.5" font-family="IBM Plex Mono">LIB-RIGHT</text>'
    +'<circle cx="'+dotX+'" cy="'+dotY+'" r="16" fill="none" stroke="var(--accent)" stroke-width="0.4" opacity="0.25"/>'
    +'<circle class="compass-dot" cx="100" cy="100" r="0" fill="var(--accent)" data-cx="'+dotX+'" data-cy="'+dotY+'"/>'
    +'</svg>'
    +'</div>'
    +'<div>'
    +'<div class="card2" style="margin-bottom:8px"><div class="card-title">Economic Axis</div>'
    +'<p style="font-size:22px;font-family:\'Cormorant Garamond\',serif;color:var(--text);">'+econLabel+'</p>'
    +'<p style="font-size:10px;color:var(--muted);margin-top:4px">Score: '+(px>0?'+':'')+px+'</p></div>'
    +'<div class="card2"><div class="card-title">Social Axis</div>'
    +'<p style="font-size:22px;font-family:\'Cormorant Garamond\',serif;color:var(--text);">'+socialLabel+'</p>'
    +'<p style="font-size:10px;color:var(--muted);margin-top:4px">Score: '+(py>0?'+':'')+py+'</p></div>'
    +'</div>'
    +'</div>'

    // Ideology label — big prominent display
    +(sanitizeText(ai.politicalIdeology,2000) ? (
      '<div class="card" style="margin-bottom:16px">'
      +'<div class="card-title">Your Ideology</div>'
      +'<p style="font-family:\'Cormorant Garamond\',serif;font-size:clamp(24px,4vw,36px);font-weight:300;color:var(--text);line-height:1.1;margin-bottom:10px">'+sanitizeText(ai.politicalIdeology,2000)+'</p>'
      +(sanitizeText(ai.politicalIdeologyDesc,2000) ? '<p style="font-size:12px;color:var(--muted2);line-height:1.8">'+sanitizeText(ai.politicalIdeologyDesc,2000)+'</p>' : '')
      +'</div>'
    ) : '')

    // AI narrative
    +(sanitizeText(ai.politicalNarrative,2000)
      ? sanitizeText(ai.politicalNarrative,2000).split('\n\n').map(function(para,i){
          var titles=['Your Position','Psychological Roots','Tensions & Contradictions'];
          return '<div class="narrative-block"><div class="narrative-title">'+(titles[i]||'Analysis')+'</div>'
            +'<div class="narrative-text">'+para+'</div></div>';
        }).join('')
      : '')

    // Strengths & weaknesses
    +(sanitizeText(ai.politicalStrengths,2000)||sanitizeText(ai.politicalWeaknesses,2000) ? (
      '<div class="grid2" style="margin-top:4px">'
      +(sanitizeText(ai.politicalStrengths,2000) ? '<div class="card2"><div class="card-title" style="color:#4a7a5a">What This Position Gets Right</div><p style="font-size:12px;color:var(--muted2);line-height:1.8">'+sanitizeText(ai.politicalStrengths,2000)+'</p></div>' : '')
      +(sanitizeText(ai.politicalWeaknesses,2000) ? '<div class="card2"><div class="card-title" style="color:#7a4a4a">Blind Spots & Failures</div><p style="font-size:12px;color:var(--muted2);line-height:1.8">'+sanitizeText(ai.politicalWeaknesses,2000)+'</p></div>' : '')
      +'</div>'
    ) : '')

    // Intellectual influences
    +(Array.isArray(ai.politicalThinkers)&&ai.politicalThinkers.length ? (
      '<div class="card" style="margin-top:12px">'
      +'<div class="card-title">Intellectual Influences</div>'
      +'<p style="font-size:11px;color:var(--muted);margin-bottom:10px">Thinkers and theorists whose work most resonates with your political orientation.</p>'
      +polList(ai.politicalThinkers,'var(--accent)')
      +'</div>'
    ) : '')

    // Similar politicians
    +(Array.isArray(ai.similarPoliticians)&&ai.similarPoliticians.length ? (
      '<div class="card" style="margin-top:12px">'
      +'<div class="card-title">Politicians With Similar Views</div>'
      +'<p style="font-size:11px;color:var(--muted);margin-bottom:10px">Historical and contemporary political figures whose positions most closely align with yours.</p>'
      +polList(ai.similarPoliticians,'var(--accent)')
      +'</div>'
    ) : '')

    // Similar parties
    +(Array.isArray(ai.similarParties)&&ai.similarParties.length ? (
      '<div class="card" style="margin-top:12px">'
      +'<div class="card-title">Political Parties That Represent You</div>'
      +'<p style="font-size:11px;color:var(--muted);margin-bottom:10px">Parties from around the world whose platforms best match your position.</p>'
      +polList(ai.similarParties,'var(--accent2)')
      +'</div>'
    ) : '')

    // Similar countries
    +(Array.isArray(ai.similarCountries)&&ai.similarCountries.length ? (
      '<div class="card" style="margin-top:12px">'
      +'<div class="card-title">Countries With Similar Political Culture</div>'
      +'<p style="font-size:11px;color:var(--muted);margin-bottom:10px">Nations whose dominant political values and institutions most closely reflect your orientation.</p>'
      +polList(ai.similarCountries,'var(--accent2)')
      +'</div>'
    ) : '')

    +'</div>';

  // ── SOCIAL PANEL ──
  panels+='<div class="panel" id="panel-social">'
    +'<div class="panel-title">Social & Interpersonal Self</div>'
    +'<p class="panel-sub">How you operate with and without others — your presence, style, inner world alone, and interpersonal patterns.</p>'

    +'<div class="grid2">'
    +'<div class="narrative-block" style="margin-bottom:0"><div class="narrative-title">Alone</div><div class="narrative-text">'+(sanitizeText(ai.aloneDesc,2000)||'')+'</div></div>'
    +'<div class="narrative-block" style="margin-bottom:0"><div class="narrative-title">With Others</div><div class="narrative-text">'+(sanitizeText(ai.socialDesc,2000)||'')+'</div></div>'
    +'</div><br>'

    +'<div class="card"><div class="card-title">Social Dimensions</div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Dominance</strong><span>Social assertiveness</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.soc.SOC_DOM||data.soc.dom||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.SOC_DOM||data.soc.dom||0)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Introversion</strong><span>Inward orientation</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.soc.SOC_INT||data.soc.introvert||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.SOC_INT||data.soc.introvert||0)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Warmth</strong><span>Openness to others</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.soc.SOC_WAR||data.soc.warmth||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.SOC_WAR||data.soc.warmth||0)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Directness</strong><span>Communication style</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.soc.SOC_DIR||data.soc.direct||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.SOC_DIR||data.soc.direct||0)+'</div></div>'
    +'</div>'

    +'<div class="card" style="margin-top:12px"><div class="card-title">Alone Self</div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Intellectual</strong><span>Inner analytical drive</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.alone.AL_INT||data.alone.intellectual||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.alone.AL_INT||data.alone.intellectual||0)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Sensitive</strong><span>Private emotional depth</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.alone.AL_SEN||data.alone.sensitive||0)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.alone.AL_SEN||data.alone.sensitive||0)+'</div></div>'
    +'</div>'
    +'</div>';

  // ── FIGURES PANEL ──
  var figures=Array.isArray(ai.figures)?ai.figures:[];
  var catOrder=['Historical','Celebrity','Pop Culture','Philosopher'];
  var figBycat={};
  figures.forEach(function(f){
    var c=f.cat||'Historical';
    if(!figBycat[c])figBycat[c]=[];
    figBycat[c].push(f);
  });

  var figsHtml='';
  catOrder.forEach(function(cat){
    if(figBycat[cat]&&figBycat[cat].length){
      figsHtml+='<div class="section-label">'+cat+'</div><div class="figures-grid">';
      figBycat[cat].forEach(function(f){
        figsHtml+='<div class="fig-card">'
          +'<div class="fig-init">'+escapeHTML(f.initials||'')+'</div>'
          +'<div class="fig-name">'+escapeHTML(f.name||'')+'</div>'
          +'<div class="fig-type">'+escapeHTML(f.type||'')+'</div>'
          +'<div class="fig-note">'+escapeHTML(f.note||'')+'</div>'
          +'</div>';
      });
      figsHtml+='</div>';
    }
  });
  // Any remaining
  figures.forEach(function(f){
    if(!catOrder.includes(f.cat)){
      figsHtml+='<div class="fig-card">'
        +'<div class="fig-init">'+escapeHTML(f.initials||'')+'</div>'
        +'<div class="fig-name">'+escapeHTML(f.name||'')+'</div>'
        +'<div class="fig-type">'+escapeHTML(f.type||'')+'</div>'
        +'<div class="fig-note">'+escapeHTML(f.note||'')+'</div>'
        +'</div>';
    }
  });

  panels+='<div class="panel" id="panel-figures">'
    +'<div class="panel-title">Similar Figures</div>'
    +'<p class="panel-sub">Historical figures, contemporary celebrities, pop culture archetypes, and philosophers who share your cognitive and personality profile.</p>'
    +figsHtml
    +'<div class="restart-wrap"><button class="btn-restart" id="restartBtn">&#8635; RETAKE ASSESSMENT</button></div>'
    +'</div>';

  document.getElementById('tabPanels').innerHTML=panels;

  // Tab switching
  document.getElementById('tabsBar').querySelectorAll('.tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      var id=this.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
      document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
      this.classList.add('active');
      var panel=document.getElementById('panel-'+id);
      if(panel)panel.classList.add('active');
      window.scrollTo(0,document.querySelector('.tabs-wrap').offsetTop-10);
    });
  });

  // Restart
  document.getElementById('restartBtn').addEventListener('click',function(){
    answers=new Array(TOTAL).fill(null);
    cur=0;
    window._activeQ = null;
    TOTAL = Q.length;
    res.style.display='none';
    document.getElementById('intro').style.display='flex';
    setTestPhase('intro');
    window.scrollTo(0,0);
  });

  // Animate bars
  setTimeout(function(){
    res.querySelectorAll('[data-w]').forEach(function(el){el.style.width=el.getAttribute('data-w')+'%';});
    var dot=res.querySelector('.compass-dot');
    if(dot){
      var cx=dot.getAttribute('data-cx'),cy=dot.getAttribute('data-cy');
      setTimeout(function(){dot.setAttribute('r','5');dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);},300);
    }
    res.querySelectorAll('.moral-bar-fill').forEach(function(el){el.style.width=(el.getAttribute('data-w')||'0')+'%';});
  },200);

  // Show action bar and wire buttons
  document.getElementById('actionBar').style.display='flex';

  // Build shareable snapshot — full data so imports are complete
  var snapshot={
    mbti:mbti, ennType:enn.type, ennWing:enn.wing, ennTritype:enn.tritype,
    att:att, phi:phi, instStack:instStack,
    polX:data.polX, polY:data.polY,
    cog:data.cog, enn:data.ennScores, att2:data.attScores, tmp:data.tmp, iv:data.iv,
    mf:data.mf, eth:data.eth, ep:data.ep, phiS:data.phiScores,
    soc:data.soc, alone:data.alone,
    big5:ai.big5||{},
    values:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.values,80,24):(ai.values||[])),
    mbtiName:sanitizeText(ai.mbtiName,2000)||'', tagline:sanitizeText(ai.tagline,2000)||'',
    socionics:sanitizeText(ai.socionics,2000)||'', keirsey:sanitizeText(ai.keirsey,2000)||'',
    figures:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeFigures(ai.figures):(ai.figures||[])),
    cogNarrative:sanitizeText(ai.cogNarrative,2000)||'', ennNarrative:sanitizeText(ai.ennNarrative,2000)||'',
    attNarrative:sanitizeText(ai.attNarrative,2000)||'', phiNarrative:sanitizeText(ai.phiNarrative,2000)||'',
    politicalNarrative:sanitizeText(ai.politicalNarrative,2000)||'',
    politicalIdeology:sanitizeText(ai.politicalIdeology,2000)||'',
    politicalIdeologyDesc:sanitizeText(ai.politicalIdeologyDesc,2000)||'',
    politicalStrengths:sanitizeText(ai.politicalStrengths,2000)||'',
    politicalWeaknesses:sanitizeText(ai.politicalWeaknesses,2000)||'',
    politicalThinkers:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.politicalThinkers,500,8):(Array.isArray(ai.politicalThinkers)?ai.politicalThinkers:[])),
    similarPoliticians:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarPoliticians,500,8):(Array.isArray(ai.similarPoliticians)?ai.similarPoliticians:[])),
    similarParties:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarParties,500,8):(Array.isArray(ai.similarParties)?ai.similarParties:[])),
    similarCountries:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarCountries,500,8):(Array.isArray(ai.similarCountries)?ai.similarCountries:[])),
    aloneDesc:sanitizeText(ai.aloneDesc,2000)||'', socialDesc:sanitizeText(ai.socialDesc,2000)||'',
    shadowDesc:sanitizeText(ai.shadowDesc,2000)||''
  };
  if (typeof AnimusShared !== 'undefined' && AnimusShared.narrativeIdentityKey) {
    snapshot._narrativeIdentity = AnimusShared.narrativeIdentityKey(snapshot);
  }

  function persistProfileSnapshot(redirectAfter) {
    var meta = {
      testMode: TOTAL <= 100 ? 'short' : 'full',
      answerCount: Object.keys(answers || {}).length,
      completedAt: new Date().toISOString()
    };
    snapshot.completedAt = meta.completedAt;
    snapshot.testMode = meta.testMode;
    snapshot.answerCount = meta.answerCount;

    if (typeof AnimusShared !== 'undefined') {
      AnimusShared.saveLastResultLocal(
        AnimusShared.enrichProfileSnapshot(snapshot, data, meta)
      );
    }

    function onCloudSaved() {
      var btn = document.getElementById('btnSave');
      if (btn) {
        btn.innerHTML = '↓ SAVED ✓';
        btn.style.opacity = '0.7';
      }
      if (redirectAfter) {
        showToast('Profile saved to your account ✓');
        setTimeout(function () { window.location.href = '/profile'; }, 1200);
      } else {
        showToast('Saved to your profile automatically ✓');
      }
    }

    function doSave(user) {
      if (!user || typeof AnimusShared === 'undefined') return;
      AnimusShared.saveProfileToFirestore(user.uid, snapshot, {
        rawData: data,
        testMode: meta.testMode,
        answerCount: meta.answerCount,
        completedAt: meta.completedAt
      })
        .then(onCloudSaved)
        .catch(function (e) {
          console.error('Profile save:', e);
          showToast('Could not save to cloud — results kept on this device. Tap Save again.');
        });
    }

    var cur =
      typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser
        ? firebase.auth().currentUser
        : null;
    if (cur) {
      doSave(cur);
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
      var unsub = firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          try {
            unsub();
          } catch (e) {}
          doSave(user);
        }
      });
      setTimeout(function () {
        try {
          unsub();
        } catch (e) {}
      }, 45000);
    }
  }

  // Auto-save to local storage + Firestore (test page requires sign-in)
  persistProfileSnapshot(false);

  document.getElementById('btnSave').addEventListener('click', function () {
    var user = firebase.auth().currentUser;
    if (!user) {
      showToast('Sign in to save your profile permanently');
      setTimeout(function () { window.location.href = '/login'; }, 2000);
      return;
    }
    persistProfileSnapshot(true);
  });

  // Share: encode snapshot into URL hash
  document.getElementById('btnShare').addEventListener('click',function(){
    var encoded;
    try{ encoded=btoa(unescape(encodeURIComponent(JSON.stringify(snapshot)))); }
    catch(e){ encoded=''; }
    var shareUrl=window.location.href.split('#')[0]+'#profile='+encoded;
    document.getElementById('shareUrlDisplay').textContent=shareUrl;
    document.getElementById('shareModal').classList.add('open');
  });

  document.getElementById('btnCopyUrl').addEventListener('click',function(){
    var url=document.getElementById('shareUrlDisplay').textContent;
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){showToast('Link copied ✓');});
    } else {
      var ta=document.createElement('textarea');
      ta.value=url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Link copied ✓');
    }
  });

  document.getElementById('closeShareModal').addEventListener('click',function(){
    document.getElementById('shareModal').classList.remove('open');
  });

  // PDF download
  document.getElementById('btnPDF').addEventListener('click',function(){
    downloadPDF(snapshot, data, mbti, enn, att, phi, instStack, ai);
  });
}

// ── PDF GENERATION ──
function downloadPDF(snap, data, mbti, enn, att, phi, instStack, ai){
  var fnOrder=['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'];
  var fnFull={Ni:'Introverted Intuition',Ne:'Extroverted Intuition',Ti:'Introverted Thinking',Te:'Extroverted Thinking',Fi:'Introverted Feeling',Fe:'Extroverted Feeling',Si:'Introverted Sensing',Se:'Extroverted Sensing'};
  var stackPos=['Dominant','Auxiliary','Tertiary','Inferior'];
  var sortedFns=fnOrder.slice().sort(function(a,b){return data.cog[b]-data.cog[a];});
  var attNames={AT_SEC:'Secure',AT_ANX:'Anxious-Preoccupied',AT_AVO:'Dismissive-Avoidant',AT_DIS:'Fearful-Avoidant'};
  var phiNames={PH_STO:'Stoic',PH_EPI:'Epicurean',PH_KAN:'Kantian',PH_ARI:'Aristotelian',PH_NIE:'Nietzschean',PH_EXI:'Existentialist',PH_PRA:'Pragmatist',PH_SKE:'Skeptic'};
  var etNames={ET_VIR:'Virtue Ethics',ET_CON:'Consequentialism',ET_DEO:'Deontology',ET_EGO:'Rational Egoism'};
  var sortedEth=Object.keys(data.eth).sort(function(a,b){return data.eth[b]-data.eth[a];});
  var polEcon=data.polX>5?'Economic Freedom':(data.polX<-5?'State Economy':'Mixed Economy');
  var polSoc=data.polY>5?'Authoritarian':(data.polY<-5?'Libertarian':'Moderate');
  var values=Array.isArray(ai.values)?ai.values:[];
  var big5=ai.big5||{};
  var figures=Array.isArray(ai.figures)?ai.figures:[];

  function bar(val,color){
    val=Math.max(2,Math.min(98,val||0));
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +'<div style="flex:1;height:5px;background:#222;border-radius:2px">'
      +'<div style="width:'+val+'%;height:100%;background:'+color+';border-radius:2px"></div>'
      +'</div>'
      +'<span style="font-size:10px;color:#888;min-width:24px;text-align:right">'+val+'</span>'
      +'</div>';
  }

  var fnRows=sortedFns.map(function(fn,i){
    var pos=i<4?' <span style="font-size:9px;color:#8a7048;margin-left:4px">'+stackPos[i]+'</span>':'';
    var col=i<2?'#c8a96e':(i<4?'#8a7048':'#2a2a2a');
    return '<div style="margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-bottom:3px">'
      +'<span style="color:#ddd"><strong>'+fn+'</strong>'+pos+' <span style="color:#555;font-size:10px">'+fnFull[fn]+'</span></span>'
      +'<span>'+data.cog[fn]+'</span></div>'
      +bar(data.cog[fn],col)
      +'</div>';
  }).join('');

  var b5rows=Object.keys(big5).map(function(k){
    return '<div style="margin-bottom:8px">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-bottom:2px">'
      +'<span>'+k+'</span><span>'+big5[k]+'%</span></div>'
      +bar(big5[k],'#c8a96e')
      +'</div>';
  }).join('');

  var moralRows=Object.keys(data.mf).sort(function(a,b){return data.mf[b]-data.mf[a];}).map(function(k){
    var labels={MF_CARE:'Care / Harm',MF_FAIR:'Fairness',MF_LOY:'Loyalty',MF_AUTH:'Authority',MF_PUR:'Sanctity',MF_LIB:'Liberty'};
    var v=Math.max(5,Math.min(99,data.mf[k]));
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #1e1e1e;font-size:11px;">'
      +'<span style="color:#ddd">'+(labels[k]||k)+'</span><span style="color:#c8a96e">'+v+'</span></div>';
  }).join('');

  var figRows=figures.slice(0,6).map(function(f){
    return '<div style="background:#0f0f0f;border:1px solid #1e1e1e;padding:12px;text-align:center">'
      +'<div style="font-size:22px;color:#c8a96e;font-style:italic;margin-bottom:4px">'+f.initials+'</div>'
      +'<div style="font-size:10px;color:#ddd;margin-bottom:2px">'+escapeHTML(f.name||'')+'</div>'
      +'<div style="font-size:9px;color:#555">'+f.type+'</div>'
      +'</div>';
  }).join('');

  var html='<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<style>'
    +'@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Mono:wght@300;400&display=swap");'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{background:#060606;color:#ddd;font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.6;padding:40px}'
    +'h1{font-family:"Cormorant Garamond",serif;font-weight:300;color:#ddd}'
    +'h2{font-family:"Cormorant Garamond",serif;font-weight:300;font-size:18px;color:#c8a96e;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #1e1e1e}'
    +'.header{text-align:center;padding-bottom:32px;border-bottom:1px solid #1e1e1e;margin-bottom:32px}'
    +'.type{font-size:72px;line-height:1;letter-spacing:0.05em;margin-bottom:6px}'
    +'.archetype{font-style:italic;color:#c8a96e;font-size:20px;margin-bottom:16px}'
    +'.tagline{color:#555;font-size:12px;max-width:560px;margin:0 auto 20px;line-height:1.8}'
    +'.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:8px}'
    +'.chip{padding:4px 12px;border:1px solid #1e1e1e;font-size:10px;color:#666}'
    +'.chip strong{color:#c8a96e;margin-right:4px}'
    +'.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}'
    +'.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}'
    +'.card{background:#0f0f0f;border:1px solid #1e1e1e;padding:20px;margin-bottom:12px}'
    +'.card-title{font-size:9px;letter-spacing:0.3em;color:#8a7048;text-transform:uppercase;margin-bottom:14px}'
    +'.narrative{border-left:2px solid #8a7048;padding:12px 16px;background:#0f0f0f;margin-bottom:12px}'
    +'.narrative-title{font-style:italic;color:#c8a96e;font-size:14px;margin-bottom:6px;font-family:"Cormorant Garamond",serif}'
    +'.narrative-text{font-size:11px;color:#666;line-height:1.8}'
    +'.enn-big{font-family:"Cormorant Garamond",serif;font-size:48px;font-weight:300;color:#ddd;line-height:1}'
    +'.enn-wing{font-family:"Cormorant Garamond",serif;font-size:22px;color:#c8a96e;font-style:italic}'
    +'.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#1e1e1e;margin-bottom:16px}'
    +'.stat-cell{background:#0f0f0f;padding:18px;text-align:center}'
    +'.stat-big{font-family:"Cormorant Garamond",serif;font-size:30px;font-weight:300;color:#ddd;display:block;margin-bottom:2px}'
    +'.stat-lbl{font-size:9px;color:#555;letter-spacing:0.15em;text-transform:uppercase}'
    +'.value-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #1e1e1e;font-size:10px;margin:3px}'
    +'.vdot{width:4px;height:4px;background:#c8a96e}'
    +'.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #1e1e1e;font-size:10px;color:#333;letter-spacing:0.2em}'
    +'@media print{'
    +'body{background:#060606!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'h2{page-break-after:avoid}.card{page-break-inside:avoid}'
    +'}'
    +'</style></head><body>'

    // HEADER
    +'<div class="header">'
    +'<h1 class="type">'+mbti+'</h1>'
    +'<div class="archetype">'+(sanitizeText(ai.mbtiName,2000)||'')+'</div>'
    +'<p class="tagline">'+(sanitizeText(ai.tagline,2000)||'')+'</p>'
    +'<div class="chips">'
    +'<div class="chip"><strong>MBTI</strong>'+mbti+'</div>'
    +'<div class="chip"><strong>Enneagram</strong>'+enn.type+'w'+enn.wing+'</div>'
    +'<div class="chip"><strong>Tritype</strong>'+enn.tritype+'</div>'
    +'<div class="chip"><strong>Attachment</strong>'+(attNames[att]||att)+'</div>'
    +'<div class="chip"><strong>Philosophy</strong>'+(phiNames[phi]||phi)+'</div>'
    +'<div class="chip"><strong>Instinct</strong>'+instStack+'</div>'
    +'<div class="chip"><strong>Socionics</strong>'+(sanitizeText(ai.socionics,2000)||'—')+'</div>'
    +'<div class="chip"><strong>Keirsey</strong>'+(sanitizeText(ai.keirsey,2000)||'—')+'</div>'
    +'<div class="chip"><strong>Political</strong>'+polEcon+' / '+polSoc+'</div>'
    +'</div></div>'

    // STAT STRIP
    +'<div class="stat-grid">'
    +'<div class="stat-cell"><span class="stat-big">'+mbti+'</span><span class="stat-lbl">MBTI Type</span></div>'
    +'<div class="stat-cell"><span class="stat-big">'+enn.type+'w'+enn.wing+'</span><span class="stat-lbl">Enneagram</span></div>'
    +'<div class="stat-cell"><span class="stat-big">'+sortedFns[0]+'</span><span class="stat-lbl">Dominant Function</span></div>'
    +'</div>'

    // COGNITIVE
    +'<h2>Cognitive Architecture</h2>'
    +(sanitizeText(ai.cogNarrative,2000)?'<div class="narrative"><div class="narrative-title">Analysis</div><div class="narrative-text">'+sanitizeText(ai.cogNarrative,2000).replace(/\n\n/g,'<br><br>')+'</div></div>':'')
    +'<div class="card"><div class="card-title">Function Stack — All 8 Scored</div>'+fnRows+'</div>'

    // PERSONALITY
    +'<h2>Enneagram</h2>'
    +(sanitizeText(ai.ennNarrative,2000)?'<div class="narrative"><div class="narrative-title">Type '+enn.type+'w'+enn.wing+'</div><div class="narrative-text">'+sanitizeText(ai.ennNarrative,2000).replace(/\n\n/g,'<br><br>')+'</div></div>':'')
    +'<div class="card" style="display:inline-block;width:100%">'
    +'<span class="enn-big">'+enn.type+'</span> <span class="enn-wing">w'+enn.wing+' &middot; Tritype '+enn.tritype+'</span>'
    +'</div>'

    // ATTACHMENT + PHILOSOPHY
    +'<h2>Attachment &amp; Philosophy</h2>'
    +'<div class="grid2">'
    +'<div class="card"><div class="card-title">Attachment Style</div><p style="font-size:16px;font-family:Cormorant Garamond,serif;color:#ddd;margin-bottom:8px">'+(attNames[att]||att)+'</p>'
    +(sanitizeText(ai.attNarrative,2000)?'<p style="font-size:11px;color:#666;line-height:1.8">'+sanitizeText(ai.attNarrative,2000)+'</p>':'')+'</div>'
    +'<div class="card"><div class="card-title">Philosophical Alignment</div><p style="font-size:16px;font-family:Cormorant Garamond,serif;color:#ddd;margin-bottom:8px">'+(phiNames[phi]||phi)+'</p>'
    +(sanitizeText(ai.phiNarrative,2000)?'<p style="font-size:11px;color:#666;line-height:1.8">'+sanitizeText(ai.phiNarrative,2000)+'</p>':'')+'</div>'
    +'</div>'

    // BIG 5 + MORAL
    +'<h2>Traits &amp; Moral Foundations</h2>'
    +'<div class="grid2">'
    +'<div class="card"><div class="card-title">Big Five</div>'+b5rows+'</div>'
    +'<div class="card"><div class="card-title">Moral Foundations</div>'+moralRows+'</div>'
    +'</div>'

    // POLITICAL
    +'<h2>Political Compass</h2>'
    +'<div class="card">'
    +'<div style="display:flex;gap:24px;margin-bottom:12px">'
    +'<div><span style="font-size:9px;color:#8a7048;letter-spacing:0.2em;text-transform:uppercase;display:block;margin-bottom:4px">Economic</span>'
    +'<span style="font-size:20px;font-family:Cormorant Garamond,serif;color:#ddd">'+polEcon+'</span></div>'
    +'<div><span style="font-size:9px;color:#8a7048;letter-spacing:0.2em;text-transform:uppercase;display:block;margin-bottom:4px">Social</span>'
    +'<span style="font-size:20px;font-family:Cormorant Garamond,serif;color:#ddd">'+polSoc+'</span></div>'
    +'</div>'
    +(sanitizeText(ai.politicalNarrative,2000)?'<p style="font-size:11px;color:#666;line-height:1.8">'+sanitizeText(ai.politicalNarrative,2000).replace(/\n\n/g,'<br><br>')+'</p>':'')
    +'</div>'

    // SOCIAL
    +'<h2>Social Self</h2>'
    +'<div class="grid2">'
    +'<div class="narrative"><div class="narrative-title">Alone</div><div class="narrative-text">'+(sanitizeText(ai.aloneDesc,2000)||'')+'</div></div>'
    +'<div class="narrative"><div class="narrative-title">With Others</div><div class="narrative-text">'+(sanitizeText(ai.socialDesc,2000)||'')+'</div></div>'
    +'</div>'
    +(sanitizeText(ai.shadowDesc,2000)?'<div class="narrative"><div class="narrative-title">Shadow &amp; Blind Spots</div><div class="narrative-text">'+sanitizeText(ai.shadowDesc,2000)+'</div></div>':'')

    // VALUES
    +'<h2>Core Values</h2>'
    +'<div style="margin-bottom:16px">'+values.map(function(v){return '<div class="value-tag"><div class="vdot"></div>'+escapeHTML(v)+'</div>';}).join('')+'</div>'

    // FIGURES
    +(figures.length?'<h2>Similar Figures</h2><div class="grid3">'+figRows+'</div>':'')

    // FOOTER
    +'<div class="footer">ANIMUS — COMPLETE PERSONALITY ATLAS &nbsp;&nbsp;·&nbsp;&nbsp; Generated '
    +new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
    +'</div>'
    +'</body></html>';

  // Open print window
  var win=window.open('','_blank','width=900,height=700');
  if(!win){ showToast('Allow popups to download PDF'); return; }
  win.document.write(html);
  win.document.close();
  win.onload=function(){
    setTimeout(function(){
      win.focus();
      win.print();
    },600);
  };
}

// ── TOAST ──
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2400);
}

// ── COMPARISON VIEW ──
function showComparison(you, them){
  document.getElementById('results').style.display='none';
  document.getElementById('compareView').style.display='block';
  window.scrollTo(0,0);

  var fnOrder=['Ni','Ne','Ti','Te','Fi','Fe','Si','Se'];
  var fnLabels2={Ni:'Introverted Intuition',Ne:'Extroverted Intuition',Ti:'Introverted Thinking',Te:'Extroverted Thinking',Fi:'Introverted Feeling',Fe:'Extroverted Feeling',Si:'Introverted Sensing',Se:'Extroverted Sensing'};

  function fnBarsCompare(youCog, themCog){
    return fnOrder.map(function(fn){
      var y=youCog[fn]||0, t2=themCog[fn]||0;
      return '<div class="compare-fn-row">'
        +'<div class="compare-fn-lbl">'+fn+'</div>'
        +'<div class="compare-fn-bars">'
        +'<div class="compare-bar-you" style="width:0%" data-w="'+y+'"></div>'
        +'<div class="compare-bar-them" style="width:0%" data-w="'+t2+'"></div>'
        +'</div>'
        +'<div class="compare-fn-num" style="color:var(--accent)">'+y+'</div>'
        +'<div style="color:var(--muted);font-size:9px;min-width:6px">/</div>'
        +'<div class="compare-fn-num" style="color:#5a8a6a">'+t2+'</div>'
        +'</div>';
    }).join('');
  }

  function b5Row(label, yv, tv){
    var y=Math.max(2,yv||0), t2=Math.max(2,tv||0);
    return '<div style="margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted2);margin-bottom:4px">'
      +'<span>'+label+'</span><span style="color:var(--accent)">'+y+'</span><span>/</span><span style="color:#5a8a6a">'+t2+'</span></div>'
      +'<div style="height:3px;background:var(--border);margin-bottom:2px"><div class="compare-bar-you" style="width:0%" data-w="'+y+'"></div></div>'
      +'<div style="height:3px;background:var(--border)"><div class="compare-bar-them" style="width:0%" data-w="'+t2+'"></div></div>'
      +'</div>';
  }

  var youB5=you.big5||{}, themB5=them.big5||{};
  var b5Keys=['Openness','Conscientiousness','Extraversion','Agreeableness','Neuroticism'];

  // Political quadrant labels
  function polQuadLabel(px,py){
    var e=px>5?'Free Market':(px<-5?'State Economy':'Mixed');
    var s=py>5?'Auth':(py<-5?'Lib':'Moderate');
    return e+' / '+s;
  }

  var html='<div class="compare-header">'
    +'<div class="compare-title">Profile Comparison</div>'
    +'<p class="compare-sub">Side-by-side analysis across all dimensions</p>'
    +'<div class="compare-legend">'
    +'<span><span class="compare-legend-dot" style="background:var(--accent)"></span>You</span>'
    +'<span><span class="compare-legend-dot" style="background:#5a8a6a"></span>Them</span>'
    +'</div></div>'

    // Types header
    +'<div class="compare-grid">'
    +'<div class="compare-col">'
    +'<div class="compare-col-head"><div class="compare-type">'+you.mbti+'</div><div class="compare-name">'+(you.mbtiName||'')+'</div></div>'
    +'<div class="compare-row"><span class="compare-lbl">Enn</span><span class="compare-val">'+you.ennType+'w'+you.ennWing+' · Tritype '+you.ennTritype+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Attach</span><span class="compare-val">'+({AT_SEC:'Secure',AT_ANX:'Anxious',AT_AVO:'Avoidant',AT_DIS:'Disorganized'}[you.att]||you.att)+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Instinct</span><span class="compare-val">'+you.instStack+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Political</span><span class="compare-val">'+polQuadLabel(you.polX,you.polY)+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Socionics</span><span class="compare-val">'+(you.socionics||'—')+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Keirsey</span><span class="compare-val">'+(you.keirsey||'—')+'</span></div>'
    +'<div class="compare-section-title">Cognitive Functions</div>'+fnBarsCompare(you.cog,them.cog)
    +'<div class="compare-section-title">Big Five</div>'+b5Keys.map(function(k){return b5Row(k,youB5[k],themB5[k]);}).join('')
    +'</div>'

    +'<div class="compare-col">'
    +'<div class="compare-col-head"><div class="compare-type">'+them.mbti+'</div><div class="compare-name">'+(them.mbtiName||'')+'</div></div>'
    +'<div class="compare-row"><span class="compare-lbl">Enn</span><span class="compare-val">'+them.ennType+'w'+them.ennWing+' · Tritype '+them.ennTritype+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Attach</span><span class="compare-val">'+({AT_SEC:'Secure',AT_ANX:'Anxious',AT_AVO:'Avoidant',AT_DIS:'Disorganized'}[them.att]||them.att||'—')+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Instinct</span><span class="compare-val">'+(them.instStack||'—')+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Political</span><span class="compare-val">'+polQuadLabel(them.polX||0,them.polY||0)+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Socionics</span><span class="compare-val">'+(them.socionics||'—')+'</span></div>'
    +'<div class="compare-row"><span class="compare-lbl">Keirsey</span><span class="compare-val">'+(them.keirsey||'—')+'</span></div>'
    +'<div class="compare-section-title">Cognitive Functions</div>'+fnBarsCompare(them.cog,you.cog)
    +'<div class="compare-section-title">Big Five</div>'+b5Keys.map(function(k){return b5Row(k,themB5[k],youB5[k]);}).join('')
    +'</div></div>'

    // Values comparison
    +'<div class="card" style="margin-bottom:12px"><div class="card-title">Core Values</div>'
    +'<div class="grid2">'
    +'<div><p style="font-size:9px;color:var(--accent);letter-spacing:0.2em;margin-bottom:8px">YOU</p>'
    +(you.values||[]).map(function(v){return '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--text)">'+v+'</div>';}).join('')+'</div>'
    +'<div><p style="font-size:9px;color:#5a8a6a;letter-spacing:0.2em;margin-bottom:8px">THEM</p>'
    +(them.values||[]).map(function(v){return '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--text)">'+v+'</div>';}).join('')+'</div>'
    +'</div></div>'

    +'<div style="text-align:center;padding:32px 0">'
    +'<button class="btn-action" id="backToResults">← BACK TO YOUR RESULTS</button>'
    +'</div>';

  document.getElementById('compareView').innerHTML=html;

  document.getElementById('backToResults').addEventListener('click',function(){
    document.getElementById('compareView').style.display='none';
    document.getElementById('results').style.display='block';
  if(window._observerMode){
    var heroEl = document.getElementById('resHero');
    var banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(200,169,110,0.08);border:1px solid var(--accent2);padding:12px 20px;margin-bottom:16px;font-size:12px;color:var(--muted2);letter-spacing:0.05em;';
    banner.innerHTML = '◎ ESTIMATED PROFILE — <strong style="color:var(--text)">'+escapeHTML(window._observerName||'Unknown')+'</strong> — Based on observed behaviors, not self-report. Results may differ from a self-administered test.';
    heroEl.insertBefore(banner, heroEl.firstChild);
  }
    window.scrollTo(0,0);
  });

  // Animate bars
  setTimeout(function(){
    document.getElementById('compareView').querySelectorAll('[data-w]').forEach(function(el){
      el.style.width=el.getAttribute('data-w')+'%';
    });
  },200);
}

// ── CHECK URL HASH ON LOAD (load shared profile) ──
(function checkSharedProfile(){
  var hash=window.location.hash;
  if(hash && hash.indexOf('#profile=')===0){
    var encoded=hash.replace('#profile=','');
    try{
      var shared=safeAtob(encoded);
      if(!shared) throw new Error('invalid');
      // Show a prompt to compare — they loaded someone's profile link
      document.getElementById('intro').style.display='none';
      // Show shared profile read-only summary then prompt to take test for comparison
      var notice=document.createElement('div');
      notice.style.cssText='min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;';
      notice.innerHTML='<div style="font-size:9px;letter-spacing:0.4em;color:var(--accent2);text-transform:uppercase;margin-bottom:20px">Shared Profile Loaded</div>'
        +'<div style="font-family:Cormorant Garamond,serif;font-size:72px;font-weight:300;color:var(--text);line-height:1;margin-bottom:8px">'+shared.mbti+'</div>'
        +'<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:var(--accent);font-style:italic;margin-bottom:32px">'+(shared.mbtiName||'')+'</div>'
        +'<p style="max-width:480px;color:var(--muted2);font-size:12px;line-height:1.9;margin-bottom:40px">Someone shared their ANIMUS profile with you. Complete the assessment yourself and their results will be waiting for comparison at the end.</p>'
        +'<button class="btn-primary" id="takeTestForCompare">TAKE THE TEST →</button>';
      document.body.insertBefore(notice, document.getElementById('quiz'));

      document.getElementById('takeTestForCompare').addEventListener('click',function(){
        notice.style.display='none';
        // Store their data for comparison after test
        window._sharedProfile=shared;
        shuffle(Q);
        answers=new Array(TOTAL).fill(null);
        cur=0;
        document.getElementById('quiz').style.display='block';
        renderQ();
      });
    } catch(e){
      // Bad hash, just load normally
      document.getElementById('intro').style.display='flex';
    }
  }
})();

// After finishing quiz, if there's a shared profile waiting, auto-trigger comparison
var _origShowResults=showResults;
showResults=function(data,mbti,enn,att,phi,instStack,fnsSorted,ai,isFallback){
  _origShowResults(data,mbti,enn,att,phi,instStack,fnsSorted,ai,isFallback);
  if(window._sharedProfile){
    setTimeout(function(){
      var snap={
        mbti:mbti,ennType:enn.type,ennWing:enn.wing,ennTritype:enn.tritype,
        att:att,phi:phi,instStack:instStack,polX:data.polX,polY:data.polY,
        cog:data.cog,enn:data.ennScores,att2:data.attScores,tmp:data.tmp,iv:data.iv,
        mf:data.mf,eth:data.eth,ep:data.ep,phiS:data.phiScores,
        soc:data.soc,alone:data.alone,
        big5:ai.big5||{},
        values:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.values,80,24):(ai.values||[])),
        figures:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeFigures(ai.figures):(ai.figures||[])),
        mbtiName:sanitizeText(ai.mbtiName,2000)||'',socionics:sanitizeText(ai.socionics,2000)||'',keirsey:sanitizeText(ai.keirsey,2000)||'',
        cogNarrative:sanitizeText(ai.cogNarrative,2000)||'',ennNarrative:sanitizeText(ai.ennNarrative,2000)||'',
        attNarrative:sanitizeText(ai.attNarrative,2000)||'',phiNarrative:sanitizeText(ai.phiNarrative,2000)||'',
        politicalNarrative:sanitizeText(ai.politicalNarrative,2000)||'',
        politicalThinkers:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.politicalThinkers,500,8):[]),
        similarPoliticians:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarPoliticians,500,8):[]),
        similarParties:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarParties,500,8):[]),
        similarCountries:(typeof AnimusShared!=='undefined'?AnimusShared.sanitizeStringArray(ai.similarCountries,500,8):[]),
        aloneDesc:sanitizeText(ai.aloneDesc,2000)||'',socialDesc:sanitizeText(ai.socialDesc,2000)||'',shadowDesc:sanitizeText(ai.shadowDesc,2000)||''
      };
      showToast('Shared profile found — loading comparison...');
      setTimeout(function(){showComparison(snap,window._sharedProfile);},1200);
      window._sharedProfile=null;
    },800);
  }
};

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
