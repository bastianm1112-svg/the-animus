/* ANIMUS — test engine (scoring, quiz UI, results, save) */
(function (g) {
  'use strict';
  var Q = g.AnimusQuestions.Q;
  var ES = g.AnimusQuestions.ES;
  Q.forEach(function (q, i) { q._qIdx = i; });
  if (g.AnimusI18n && g.AnimusI18n.bindQuestionEsIndex) {
    g.AnimusI18n.bindQuestionEsIndex(Q, g.AnimusI18n.Q_ES);
  }
  var Cross = g.AnimusCross || {};
  if (Cross.applyChoicePatches) Cross.applyChoicePatches(Q);

  var _choiceIx = [];
  var escapeHTML = g.AnimusShared.escapeHTML;

  function sanitizeText(str, maxLen) {
    maxLen = maxLen || 500;
    if (!str) return '';
    var cleaned = String(str).replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '').trim();
    return cleaned.substring(0, maxLen);
  }

function setTestPhase(phase) {
  if (typeof g.setPagePhase === 'function') g.setPagePhase(phase);
  else if (g.AnimusApp && g.AnimusApp.setPagePhase) g.AnimusApp.setPagePhase(phase);
  if (phase === 'quiz') updateTestProgressChrome();
  else if (document.body) document.body.classList.remove('test-progress-on');
}

function isQuizPhase() {
  return document.body && document.body.classList.contains('phase-quiz');
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
    if (isQuizPhase() && typeof renderQ === 'function') {
      renderQ();
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'animus_lang') {
      refreshAnimusLang();
      updateIntroLang();
      var quizEl = document.getElementById('quiz');
      if (isQuizPhase() && typeof renderQ === 'function') {
        renderQ();
      }
    }
  });
})();

function updateIntroLang(){
  refreshAnimusLang();
  if (typeof AnimusI18n !== 'undefined' && AnimusI18n.applyDomI18n) {
    var intro = document.getElementById('intro');
    AnimusI18n.applyDomI18n(intro || document, lang);
  } else {
    document.querySelectorAll('[data-en]').forEach(function(el){
      el.textContent = lang==='es' ? (el.getAttribute('data-es')||el.getAttribute('data-en')) : el.getAttribute('data-en');
    });
  }
  var inp = document.getElementById('importInput') || document.getElementById('profileLinkInput');
  if(inp) inp.placeholder = lang==='es' ? 'Pegá un link de perfil acá...' : 'Paste a profile link here...';
  var fill = document.getElementById('fillInput');
  if(fill) fill.placeholder = lang==='es' ? 'Pegá un link incompleto acá...' : 'Paste incomplete profile link here...';
}

function localizedForQuestion(q, qIdx) {
  if (typeof AnimusI18n !== 'undefined' && AnimusI18n.localizeQuestion) {
    return AnimusI18n.localizeQuestion(q, lang, ES, qIdx);
  }
  var _esEntry = ES[q.t] || {};
  return {
    sec: q.sec || '',
    text: (lang==='es' && (_esEntry.es_t || q.es_t)) ? (_esEntry.es_t || q.es_t) : q.t,
    explain: lang==='es' ? (_esEntry.es || q.es || q.e || '') : (q.e || ''),
    lo: q.lo,
    hi: q.hi,
    choices: (q.choices || []).map(function(c){ return { letter: c.l, text: c.t, score: c.s }; })
  };
}

// Scale/agree option labels
var scaleLabels = {
  en: {lo:'Strongly Disagree', hi:'Strongly Agree',
       opts:['Strongly Disagree','Disagree','Slightly Disagree','Neutral','Slightly Agree','Agree','Strongly Agree']},
  es: {lo:'Muy en desacuerdo', hi:'Muy de acuerdo',
       opts:['Muy en desacuerdo','En desacuerdo','Algo en desacuerdo','Neutral','Algo de acuerdo','De acuerdo','Muy de acuerdo']}
};

var _quizNavDir = 1;
var _quizKeysBound = false;

function quizModeLabel() {
  if (typeof observerMode !== 'undefined' && observerMode) return lang === 'es' ? 'Observador' : 'Observer';
  if (testMode === 'quick') return lang === 'es' ? 'Rápido' : 'Quick';
  if (testMode === 'full') return lang === 'es' ? 'Detallado' : 'Detailed';
  if (testMode === 'estimator') return lang === 'es' ? 'Estimador' : 'Estimator';
  return lang === 'es' ? 'Corto' : 'Short';
}

function updateQuizHeader(sec) {
  var el = document.getElementById('qSection');
  if (!el) return;
  var mode = quizModeLabel();
  var section = (sec || '').trim();
  el.textContent = section ? (section + ' · ' + mode) : mode;
}

function quizPromptHint(isMc) {
  if (isMc) return lang === 'es' ? 'Elegí la opción más cercana' : 'Choose the closest fit';
  return lang === 'es' ? '¿Qué tan cierto es esto para vos?' : 'How true is this for you?';
}

function buildQuestionChrome(qText, loc, isMc) {
  var prompt = /[:?]$/.test(String(qText || '').trim());
  return '<div class="q-stage">'
    + '<p class="q-kicker"><span class="q-kicker-sec">' + escapeHTML(loc.sec || quizModeLabel()) + '</span>'
    + '<span class="q-kicker-dot" aria-hidden="true"></span>'
    + '<span class="q-kicker-hint">' + escapeHTML(quizPromptHint(isMc)) + '</span></p>'
    + '<div class="q-header-row"><div class="q-text' + (prompt ? ' q-text--prompt' : '') + '">' + escapeHTML(qText) + '</div></div>';
}

function buildLikertHtml(selected, loc, lbl) {
  var sel = selected == null ? 0 : selected;
  var lo = loc.lo || lbl.lo;
  var hi = loc.hi || lbl.hi;
  var html = '<div class="scale-wrap' + (sel ? ' is-set' : '') + '" style="--scale-n:' + sel + '">';
  html += '<div class="scale-track" aria-hidden="true"><div class="scale-track-fill"></div></div>';
  html += '<div class="scale-row" role="radiogroup" aria-label="' + escapeHTML(lbl.lo + ' — ' + lbl.hi) + '">';
  for (var i = 1; i <= 7; i++) {
    var word = lbl.opts[i - 1] || String(i);
    html += '<button type="button" class="scale-btn' + (sel === i ? ' sel' : '') + '" data-v="' + i + '" role="radio" aria-checked="' + (sel === i ? 'true' : 'false') + '" title="' + escapeHTML(word) + '">'
      + '<span class="scale-num">' + i + '</span>'
      + '<span class="scale-word">' + escapeHTML(word) + '</span>'
      + '</button>';
  }
  html += '</div><div class="scale-lbls"><span>' + escapeHTML(lo) + '</span><span>' + escapeHTML(hi) + '</span></div></div>';
  return html;
}

function applyChoiceChrome(root, v, ci) {
  if (!root) return;
  root.querySelectorAll('.mc-choice').forEach(function (el) {
    var on = ci !== null && ci !== undefined && ci !== '' && el.getAttribute('data-ci') === String(ci);
    el.classList.toggle('selected', on);
  });
  root.querySelectorAll('.scale-btn').forEach(function (el) {
    var on = parseInt(el.getAttribute('data-v'), 10) === v;
    el.classList.toggle('sel', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  var wrap = root.querySelector('.scale-wrap');
  if (wrap) {
    wrap.classList.add('is-set');
    wrap.style.setProperty('--scale-n', String(v || 0));
  }
  var nb = document.getElementById('nBtn');
  if (nb) {
    nb.disabled = false;
    nb.classList.remove('disabled');
    nb.classList.add('is-ready');
  }
}

function playQuestionEnter(body) {
  if (!body) return;
  var stage = body.querySelector('.q-stage') || body;
  stage.classList.remove('q-enter-next', 'q-enter-back');
  void stage.offsetWidth;
  stage.classList.add(_quizNavDir < 0 ? 'q-enter-back' : 'q-enter-next');
}

function bindQuizKeysOnce() {
  if (_quizKeysBound) return;
  _quizKeysBound = true;
  document.addEventListener('keydown', function (e) {
    if (!isQuizPhase()) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var q = (window._activeQ || Q)[cur];
    if (!q) return;
    var k = e.key;
    if (k === 'Enter' || k === 'ArrowRight') {
      var nb = document.getElementById('nBtn');
      if (nb && !nb.disabled) { e.preventDefault(); nb.click(); }
      return;
    }
    if (k === 'ArrowLeft') {
      var bb = document.getElementById('bBtn');
      if (bb && !bb.disabled) { e.preventDefault(); bb.click(); }
      return;
    }
    if (q.type === 'mc' && q.choices) {
      var letter = k.toUpperCase();
      if (letter >= 'A' && letter <= 'D') {
        var btn = document.querySelector('#qBody .mc-choice[data-ci="' + (letter.charCodeAt(0) - 65) + '"]');
        if (btn) { e.preventDefault(); btn.click(); }
      }
      return;
    }
    if (/^[1-7]$/.test(k)) {
      var sb = document.querySelector('#qBody .scale-btn[data-v="' + k + '"]');
      if (sb) { e.preventDefault(); sb.click(); }
    }
  });
}

// ── SHUFFLE (Fisher-Yates) ──
function shuffle(arr){
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
  }
  return arr;
}

// ── TEST MODE ──
var testMode = 'short';
var _introUserData = null;
var _introEntitlementsLoaded = false;
var _serverDraftByMode = {};
var _serverDraftSaveTimer = null;
var _milestonesShown = {};
var _milestoneHideTimer = null;

var MILESTONE_MSG_EN = [
  'Getting closer…',
  'A clearer image of who you are is taking shape.',
  'Your pattern is coming into focus.',
  'Keep going — your profile is building.',
  'Almost there — stay with it.',
  'Each answer sharpens the picture.'
];
var MILESTONE_MSG_ES = [
  'Cada vez más cerca…',
  'Se va formando una imagen más clara de quién sos.',
  'Tu patrón empieza a enfocarse.',
  'Seguí — tu perfil se está construyendo.',
  'Casi llegás — mantené el ritmo.',
  'Cada respuesta afina el retrato.'
];

function applyRouteTestMode() {
  var params = new URLSearchParams(window.location.search);
  var mode = params.get('mode');
  if (mode === 'detailed') testMode = 'full';
  else if (mode === 'estimator') testMode = 'estimator';
  else if (mode === 'quick') testMode = 'quick';
  else if (mode === 'main' || mode === 'short') testMode = 'short';
  if (mode === 'estimator') {
    var name = params.get('name');
    if (name) {
      observerMode = true;
      observerSubjectName = decodeURIComponent(name).substring(0, 64);
    }
    var estId = params.get('estimation');
    if (estId) {
      window._estimationId = String(estId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 128);
    }
  }
  return mode;
}

function entitlementGateForMode(userData) {
  if (typeof AnimusEntitlements === 'undefined') return null;
  if (testMode === 'full' && !AnimusEntitlements.hasEntitlement(userData, 'detailedTest')) {
    return 'Unlock the Detailed Test in the Shop to continue.';
  }
  if (testMode === 'estimator' && !AnimusEntitlements.hasEntitlement(userData, 'testEstimator')) {
    return 'Unlock the Test Estimator in the Shop to continue.';
  }
  return null;
}

function configureIntroForMode() {
  var mode = applyRouteTestMode();
  var intro = document.getElementById('intro');
  var modeTabs = document.getElementById('testModeTabs');
  if (modeTabs) modeTabs.style.display = mode === 'estimator' ? 'none' : '';
  if (!intro || !mode || mode === 'short') return;
  var title = intro.querySelector('.intro-subtitle');
  var label = intro.querySelector('.intro-main-label');
  var hint = intro.querySelector('.intro-shop-hint');
  if (mode === 'detailed') {
    if (title) title.textContent = 'Detailed Test';
    if (label) label.textContent = 'Detailed Test';
  } else if (mode === 'estimator') {
    if (title) title.textContent = 'What are they likely to do?';
    if (label) label.textContent = 'Behavioral Estimator';
    if (hint) hint.style.display = 'none';
    var desc = intro.querySelector('.intro-desc');
    if (desc) {
      var who = observerSubjectName || 'this person';
      desc.textContent =
        'Answer from what you have actually seen ' +
        who +
        ' do in real situations — not private thoughts you cannot know. Results are saved under Estimations, separate from your friends list.';
    }
    var meta = intro.querySelector('.intro-meta');
    if (meta) meta.style.display = 'none';
  }
  refreshIntroModeUI(_introUserData);
}

function setTestMode(mode) {
  if (mode === 'estimator') testMode = 'estimator';
  else if (mode === 'full' || mode === 'detailed') testMode = 'full';
  else if (mode === 'quick') testMode = 'quick';
  else testMode = 'short';
  try { localStorage.setItem(AnimusShared.KEYS.testMode, testMode); } catch(e){}
}

function progressStorageKey(mode) {
  var m = mode || testMode;
  if (m === 'full' || m === 'detailed') return AnimusShared.KEYS.testProgress + '_full';
  if (m === 'estimator') return AnimusShared.KEYS.testProgress + '_estimator';
  if (m === 'quick') return AnimusShared.KEYS.testProgress + '_quick';
  return AnimusShared.KEYS.testProgress + '_short';
}

function migrateLegacyProgress() {
  try {
    var legacy = sessionStorage.getItem(AnimusShared.KEYS.testProgress);
    if (!legacy) return;
    var data = JSON.parse(legacy);
    var key = progressStorageKey(data.testMode || 'short');
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, legacy);
    sessionStorage.removeItem(AnimusShared.KEYS.testProgress);
  } catch (e) {}
}

function readProgressForMode(mode) {
  var session = readProgressFromSession(mode);
  var docId =
    typeof AnimusShared !== 'undefined' && AnimusShared.testDraftDocId
      ? AnimusShared.testDraftDocId(mode)
      : mode === 'full'
        ? 'full'
        : mode === 'estimator'
          ? 'estimator'
          : 'short';
  var server = _serverDraftByMode[docId];
  var device = null;
  if (
    typeof firebase !== 'undefined' &&
    firebase.auth &&
    firebase.auth().currentUser &&
    typeof AnimusShared !== 'undefined' &&
    AnimusShared.readTestDraftLocal
  ) {
    device = AnimusShared.readTestDraftLocal(firebase.auth().currentUser.uid, mode);
  }
  if (typeof AnimusShared !== 'undefined' && AnimusShared.pickNewestTestProgress) {
    return AnimusShared.pickNewestTestProgress(session, device, server);
  }
  var best = session;
  [device, server].forEach(function (item) {
    if (!item) return;
    if (!best || (item.savedAt || 0) >= (best.savedAt || 0)) best = item;
  });
  return best;
}

function localSimplifyQuestion(text) {
  if (!text) return '';
  var t = String(text).replace(/\s+/g, ' ').trim();
  t = t.replace(/\([^)]{24,}\)/g, '').trim();
  if (t.length > 140) {
    var parts = t.split(/(?<=[.!?])\s+/);
    if (parts[0] && parts[0].length > 20) t = parts[0];
    else t = t.substring(0, 140).replace(/\s+\S*$/, '') + '…';
  }
  return t || String(text).trim();
}

function buildProgressPayload() {
  if (!window._activeQ || !answers) return null;
  var qKey = Cross.qKey || function (q) { return (q.fn || '') + '|' + (q.t || ''); };
  return {
    testMode: testMode,
    cur: cur,
    total: TOTAL,
    answers: answers.slice(),
    choiceIx: _choiceIx.slice(),
    activeKeys: window._activeQ.map(qKey),
    observerMode: !!observerMode,
    observerSubjectName: observerSubjectName || '',
    savedAt: Date.now()
  };
}

function writeProgressToSession(mode, data) {
  if (!data) return;
  try {
    sessionStorage.setItem(progressStorageKey(mode || data.testMode), JSON.stringify(data));
  } catch (e) {}
  if (
    typeof firebase !== 'undefined' &&
    firebase.auth &&
    firebase.auth().currentUser &&
    typeof AnimusShared !== 'undefined' &&
    AnimusShared.writeTestDraftLocal
  ) {
    AnimusShared.writeTestDraftLocal(firebase.auth().currentUser.uid, mode || data.testMode, data);
  }
}

function draftIsResumable(data) {
  if (!data || !data.answers || !data.total) return false;
  if (!data.activeKeys || !data.activeKeys.length) return false;
  if (typeof AnimusShared !== 'undefined' && AnimusShared.testDraftIsResumable) {
    return AnimusShared.testDraftIsResumable(data);
  }
  return data.cur >= 1;
}

function readProgressFromSession(mode) {
  migrateLegacyProgress();
  try {
    var raw = sessionStorage.getItem(progressStorageKey(mode));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function flushServerDraftSave(payload) {
  payload = payload || buildProgressPayload();
  if (!payload) return Promise.resolve(false);
  if (typeof AnimusShared !== 'undefined' && AnimusShared.testDraftCanSync && !AnimusShared.testDraftCanSync(payload)) {
    return Promise.resolve(false);
  }
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
    return Promise.resolve(false);
  }
  if (typeof AnimusShared === 'undefined' || !AnimusShared.saveTestDraftToFirestore) {
    return Promise.resolve(false);
  }
  var uid = firebase.auth().currentUser.uid;
  return AnimusShared.saveTestDraftToFirestore(uid, payload).then(function (ok) {
    if (ok) {
      var docId = AnimusShared.testDraftDocId(payload.testMode);
      _serverDraftByMode[docId] = payload;
    }
    return ok;
  });
}

function scheduleServerDraftSave(payload) {
  payload = payload || buildProgressPayload();
  if (!payload) return;
  if (typeof AnimusShared !== 'undefined' && AnimusShared.testDraftCanSync && !AnimusShared.testDraftCanSync(payload)) {
    return;
  }
  clearTimeout(_serverDraftSaveTimer);
  _serverDraftSaveTimer = setTimeout(function () {
    flushServerDraftSave(payload);
  }, 500);
}

function saveTestProgress() {
  var payload = buildProgressPayload();
  if (!payload) return;
  writeProgressToSession(testMode, payload);
  scheduleServerDraftSave(payload);
}

function clearTestProgress(mode) {
  var m = mode || testMode;
  try {
    sessionStorage.removeItem(progressStorageKey(m));
  } catch (e) {}
  if (typeof AnimusShared !== 'undefined' && AnimusShared.testDraftDocId) {
    delete _serverDraftByMode[AnimusShared.testDraftDocId(m)];
  }
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    var uid = firebase.auth().currentUser.uid;
    if (typeof AnimusShared !== 'undefined' && AnimusShared.clearTestDraftFromFirestore) {
      AnimusShared.clearTestDraftFromFirestore(uid, m);
    }
  }
}

function hydrateDraftsFromServer(drafts) {
  _serverDraftByMode = {};
  Object.keys(drafts || {}).forEach(function (modeKey) {
    var server = drafts[modeKey];
    if (!server) return;
    var docId =
      typeof AnimusShared !== 'undefined' && AnimusShared.testDraftDocId
        ? AnimusShared.testDraftDocId(modeKey)
        : modeKey;
    _serverDraftByMode[docId] = server;
    var merged = readProgressForMode(modeKey);
    if (merged && draftIsResumable(merged)) {
      writeProgressToSession(modeKey, merged);
    } else if (
      typeof AnimusShared !== 'undefined' &&
      AnimusShared.testDraftCanSync &&
      AnimusShared.testDraftCanSync(server)
    ) {
      writeProgressToSession(modeKey, server);
    }
  });
}

function refreshCloudDrafts(cb) {
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
    if (cb) cb();
    return;
  }
  if (typeof AnimusShared === 'undefined' || !AnimusShared.fetchAllTestDraftsFromFirestore) {
    if (cb) cb();
    return;
  }
  var uid = firebase.auth().currentUser.uid;
  AnimusShared.fetchAllTestDraftsFromFirestore(uid)
    .then(function (drafts) {
      hydrateDraftsFromServer(drafts);
      showResumePromptIfNeeded();
      if (isQuizPhase()) {
        var payload = buildProgressPayload();
        if (payload && AnimusShared.testDraftCanSync && AnimusShared.testDraftCanSync(payload)) {
          flushServerDraftSave(payload);
        }
      }
      if (cb) cb();
    })
    .catch(function () {
      if (cb) cb();
    });
}

function loadSavedTestMode() {
  var saved = null;
  try { saved = localStorage.getItem(AnimusShared.KEYS.testMode); } catch(e){}
  if(saved === 'short' || saved === 'full' || saved === 'estimator' || saved === 'quick') return saved;
  if(window.location.search.indexOf('mode=detailed') > -1) return 'full';
  if(window.location.search.indexOf('mode=estimator') > -1) return 'estimator';
  return 'short';
}

function resumePromptLabel(data) {
  var es = lang === 'es';
  if (!data || !data.total) {
    return es ? 'Continuar donde lo dejaste →' : 'Resume where you left off →';
  }
  var answered = 0;
  if (data.answers) {
    for (var i = 0; i < data.answers.length; i++) {
      if (data.answers[i] !== null && data.answers[i] !== undefined) answered++;
    }
  }
  var at = Math.min((data.cur || 0) + 1, data.total);
  var pct = Math.round((answered / data.total) * 100);
  if (es) {
    return 'Continuar · pregunta ' + at + ' de ' + data.total + ' (' + pct + '%) →';
  }
  return 'Resume · question ' + at + ' of ' + data.total + ' (' + pct + '%) →';
}

function showResumePromptIfNeeded() {
  var wrap = document.getElementById('resumeTestWrap');
  var btn = document.getElementById('resumeTestBtn');
  if (!wrap) return;
  var data = readProgressForMode(testMode);
  if (!draftIsResumable(data)) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  if (btn) btn.textContent = resumePromptLabel(data);
  refreshOtherModeResumeLink();
  updateQuizModeSwitch();
}

function otherTestMode() {
  if (testMode === 'full') return 'short';
  if (testMode === 'short') return 'full';
  return null;
}

function refreshOtherModeResumeLink() {
  var wrap = document.getElementById('otherModeResumeWrap');
  var btn = document.getElementById('otherModeResumeBtn');
  if (!wrap || !btn) return;
  var other = otherTestMode();
  if (!other || testMode === 'estimator') {
    wrap.style.display = 'none';
    return;
  }
  var data = readProgressForMode(other);
  if (!draftIsResumable(data)) {
    wrap.style.display = 'none';
    return;
  }
  var es = lang === 'es';
  var label = other === 'full'
    ? (es ? 'También podés continuar el Test Detallado →' : 'You may also continue the Detailed Test →')
    : (es ? 'También podés continuar el Test Principal →' : 'You may also continue the Main Test →');
  btn.textContent = label;
  wrap.style.display = 'block';
}

function updateQuizModeSwitch() {
  var btn = document.getElementById('quizModeSwitch');
  if (btn) {
    btn.style.display = 'none';
    btn.hidden = true;
    btn.onclick = null;
  }
}

function hasDetailedEntitlement(userData) {
  if (typeof AnimusEntitlements === 'undefined') return false;
  return AnimusEntitlements.hasDetailedTest
    ? AnimusEntitlements.hasDetailedTest(userData)
    : AnimusEntitlements.hasEntitlement(userData, 'detailedTest');
}

function hasAnimusPlusMembership(userData) {
  userData = userData || _introUserData || {};
  if (typeof AnimusEntitlements === 'undefined') return false;
  return !!(AnimusEntitlements.hasAnimusPlus && AnimusEntitlements.hasAnimusPlus(userData));
}

function wantsTestProgressBar(userData) {
  userData = userData || _introUserData || {};
  if (!hasAnimusPlusMembership(userData)) return false;
  var prefs = userData.prefs || {};
  return prefs.testProgressBar !== false;
}

function updateTestProgressChrome() {
  var live = isQuizPhase();
  var on = live && wantsTestProgressBar(_introUserData);
  if (document.body) {
    document.body.classList.toggle('test-progress-live', live);
    document.body.classList.toggle('test-progress-on', on);
  }
  var numEl = document.getElementById('qhdrNum');
  var fillEl = document.getElementById('testProgressFill');
  var labelEl = document.getElementById('testProgressLabel');
  var wrapEl = document.getElementById('testProgressWrap');
  if (!live) {
    if (numEl) numEl.setAttribute('aria-hidden', 'true');
    if (labelEl) labelEl.setAttribute('aria-hidden', 'true');
    if (wrapEl) wrapEl.setAttribute('aria-hidden', 'true');
    return;
  }
  var total = TOTAL || (window._activeQ && window._activeQ.length) || 1;
  var current = Math.min(cur + 1, total);
  var answered = 0;
  if (answers) {
    for (var i = 0; i < answers.length; i++) {
      if (answers[i] !== null && answers[i] !== undefined) answered++;
    }
  }
  var pct = Math.max(answered ? 3 : 0, Math.round((current / total) * 100));
  if (fillEl) fillEl.style.width = pct + '%';
  if (wrapEl) {
    wrapEl.setAttribute('aria-valuenow', String(pct));
    wrapEl.setAttribute('aria-valuemax', '100');
    wrapEl.setAttribute('aria-hidden', 'false');
  }
  if (!on) {
    if (numEl) numEl.setAttribute('aria-hidden', 'true');
    if (labelEl) labelEl.setAttribute('aria-hidden', 'true');
    return;
  }
  if (numEl) {
    numEl.textContent = current + ' / ' + total;
    numEl.setAttribute('aria-hidden', 'false');
  }
  if (labelEl) {
    labelEl.textContent = answered + ' answered · ' + pct + '%';
    labelEl.setAttribute('aria-hidden', 'false');
  }
}

function canSelectTestMode(mode, userData) {
  userData = userData || _introUserData || {};
  if (mode === 'full' || mode === 'detailed') return hasDetailedEntitlement(userData);
  if (mode === 'estimator') {
    return typeof AnimusEntitlements !== 'undefined' && AnimusEntitlements.hasTestEstimator
      ? AnimusEntitlements.hasTestEstimator(userData)
      : AnimusEntitlements.hasEntitlement(userData, 'testEstimator');
  }
  return true;
}

function loadIntroEntitlements(cb) {
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    _introEntitlementsLoaded = true;
    if (cb) cb(null);
    return;
  }
  var user = firebase.auth().currentUser;
  if (!user) {
    _introUserData = null;
    _introEntitlementsLoaded = true;
    if (cb) cb(null);
    return;
  }
  firebase
    .firestore()
    .collection('users')
    .doc(user.uid)
    .get()
    .then(function (doc) {
      _introUserData = doc.exists ? doc.data() : {};
      _introEntitlementsLoaded = true;
      return new Promise(function (resolve) {
        refreshCloudDrafts(function () {
          refreshIntroModeUI(_introUserData);
          if (cb) cb(_introUserData);
          resolve();
        });
      });
    })
    .catch(function () {
      _introEntitlementsLoaded = true;
      if (cb) cb(null);
    });
}

function refreshIntroModeUI(userData) {
  userData = userData || _introUserData || {};
  var es = lang === 'es';
  var hasDetailed = hasDetailedEntitlement(userData);
  var hint = document.getElementById('introShopHint');
  var entitledBanner = document.getElementById('introEntitledBanner');
  var durationEl = document.getElementById('introMetaDuration');
  var introShell = document.querySelector('.test-intro-shell');
  var tabs = document.querySelectorAll('#testModeTabs .intro-mode-btn');

  if (testMode === 'full' && !hasDetailed) {
    setTestMode('short');
  }

  tabs.forEach(function (tab) {
    var mode = tab.getAttribute('data-mode');
    var on = mode === testMode || (mode === 'short' && testMode === 'short');
    var locked = mode === 'full' && !hasDetailed;
    tab.classList.toggle('active', on);
    tab.classList.toggle('is-locked', locked);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.setAttribute('aria-disabled', locked ? 'true' : 'false');
    tab.title = locked
      ? es
        ? 'Desbloqueá el Test Detallado en la Tienda'
        : 'Unlock the Detailed Test in the Shop'
      : '';
    var badge = tab.querySelector('.intro-mode-badge');
    if (mode === 'full' && badge) {
      if (hasDetailed) {
        badge.textContent = es ? 'Desbloqueado' : 'Unlocked';
        badge.classList.add('is-owned');
        badge.style.display = 'inline-block';
      } else {
        badge.textContent = es ? 'Tienda' : 'Shop';
        badge.classList.remove('is-owned');
        badge.style.display = 'inline-block';
      }
    }
  });

  if (durationEl) {
    durationEl.textContent = testMode === 'full' ? '~45' : (testMode === 'quick' ? '~10' : '~20');
  }
  if (introShell) {
    introShell.classList.toggle('intro--detailed-owned', hasDetailed);
    introShell.classList.toggle('intro--detailed-locked', !hasDetailed && _introEntitlementsLoaded);
  }
  if (document.body) {
    document.body.classList.toggle('test-has-detailed', hasDetailed);
    document.body.classList.toggle('test-needs-detailed', !hasDetailed && _introEntitlementsLoaded);
    document.body.classList.toggle('test-intro-detailed-active', testMode === 'full');
    document.body.classList.toggle('test-intro-main-active', testMode !== 'full' && testMode !== 'estimator');
  }

  if (entitledBanner) {
    if (hasDetailed && testMode !== 'estimator') {
      entitledBanner.style.display = 'block';
      entitledBanner.textContent = es
        ? 'Test Detallado desbloqueado — acceso completo a ~45 min y resultados más profundos.'
        : 'Detailed Test unlocked — full ~45 min depth and richer results.';
    } else {
      entitledBanner.style.display = 'none';
    }
  }

  if (hint) {
    if (hasDetailed) {
      hint.style.display = 'none';
      hint.classList.add('is-hidden');
    } else if (testMode === 'full') {
      hint.style.display = 'block';
      hint.classList.remove('is-hidden');
      hint.innerHTML = es
        ? 'El Test Detallado requiere compra. <a href="/shop">Desbloquealo en la Tienda</a> para continuar.'
        : 'The Detailed Test requires purchase. <a href="/shop">Unlock it in the Shop</a> to continue.';
    } else {
      hint.style.display = 'block';
      hint.classList.remove('is-hidden');
      hint.innerHTML = es
        ? 'Para mayor precisión, desbloqueá el <a href="/shop">Test Detallado</a> en la Tienda (~$10).'
        : 'For greater accuracy, unlock the <a href="/shop">Detailed Test</a> in the Shop (~$10).';
    }
  }

  var startBtn = document.getElementById('startBtn');
  if (startBtn) {
    if (testMode === 'full' && hasDetailed) {
      startBtn.textContent = es ? 'COMENZAR TEST DETALLADO' : 'BEGIN DETAILED TEST';
    } else if (testMode === 'full' && !hasDetailed) {
      startBtn.textContent = es ? 'IR A LA TIENDA' : 'GO TO SHOP';
    } else {
      startBtn.textContent = es ? 'COMENZAR EVALUACIÓN' : 'BEGIN ASSESSMENT';
    }
  }

  showResumePromptIfNeeded();
}

function switchTestMode(newMode, resumeOther) {
  if (newMode === testMode) return;
  if (!canSelectTestMode(newMode, _introUserData)) {
    window.location.href = '/shop';
    return;
  }
  if (isQuizPhase()) saveTestProgress();
  setTestMode(newMode);
  if (resumeOther) {
    resumeTestFromStorage(newMode);
    return;
  }
  refreshIntroModeUI();
}

function applyQuizHeaderForMode() {
  var qSection = document.getElementById('qSection');
  if (observerMode && observerSubjectName) {
    var logo = document.querySelector('.qhdr-logo');
    if (logo) logo.innerHTML = 'ANI<span>MUS</span> <span class="qhdr-est">ESTIMATOR</span>';
    if (qSection) qSection.textContent = 'Estimating: ' + observerSubjectName;
    document.body.classList.remove('test-quiz-detailed');
    return;
  }
  if (testMode === 'full') {
    if (qSection) qSection.textContent = lang === 'es' ? 'Test Detallado' : 'Detailed Test';
    document.body.classList.add('test-quiz-detailed');
    var qhdr = document.querySelector('.qhdr');
    if (qhdr) qhdr.classList.add('qhdr--detailed');
  } else if (testMode === 'quick') {
    if (qSection) qSection.textContent = lang === 'es' ? 'Test rápido' : 'Quick Test';
    document.body.classList.remove('test-quiz-detailed');
  } else {
    if (qSection) qSection.textContent = lang === 'es' ? 'Test Principal' : 'Main Test';
    document.body.classList.remove('test-quiz-detailed');
    var qhdrMain = document.querySelector('.qhdr');
    if (qhdrMain) qhdrMain.classList.remove('qhdr--detailed');
  }
}

function restoreAnswersFromProgress(data) {
  var ans = Array.isArray(data.answers) ? data.answers.slice() : [];
  if (ans.length > TOTAL) ans = ans.slice(0, TOTAL);
  while (ans.length < TOTAL) ans.push(null);
  answers = ans;
  var ix = Array.isArray(data.choiceIx) ? data.choiceIx.slice() : [];
  if (ix.length > TOTAL) ix = ix.slice(0, TOTAL);
  _choiceIx = new Array(TOTAL).fill(-1);
  for (var i = 0; i < TOTAL; i++) {
    _choiceIx[i] = i < ix.length && typeof ix[i] === 'number' ? ix[i] : -1;
  }
  cur = Math.min(Math.max(0, parseInt(data.cur, 10) || 0), TOTAL - 1);
}

function buildQuestionLookup() {
  var qKey = Cross.qKey || function (q) { return (q.fn || '') + '|' + (q.t || ''); };
  var exact = {};
  var byPrefix = {};
  Q.forEach(function (q) {
    var full = qKey(q);
    exact[full] = q;
    var pre80 = full.substring(0, 80);
    if (!byPrefix[pre80]) byPrefix[pre80] = q;
    var pre512 = full.substring(0, 512);
    if (!byPrefix[pre512]) byPrefix[pre512] = q;
  });
  return { qKey: qKey, exact: exact, byPrefix: byPrefix };
}

function lookupQuestionByStoredKey(storedKey, lookup) {
  if (!storedKey || !lookup) return null;
  if (lookup.exact[storedKey]) return lookup.exact[storedKey];
  if (lookup.byPrefix[storedKey]) return lookup.byPrefix[storedKey];
  var i;
  for (i = 0; i < Q.length; i++) {
    var full = lookup.qKey(Q[i]);
    if (full.indexOf(storedKey) === 0) return Q[i];
    if (storedKey.indexOf(full) === 0) return Q[i];
  }
  return null;
}

function restoreActiveQFromDraft(data) {
  var keys = Array.isArray(data.activeKeys) ? data.activeKeys : [];
  var lookup = buildQuestionLookup();
  var activeQ = [];
  var alignedAnswers = [];
  var alignedIx = [];
  var i;
  for (i = 0; i < keys.length; i++) {
    var q = lookupQuestionByStoredKey(keys[i], lookup);
    if (!q) continue;
    activeQ.push(q);
    alignedAnswers.push(
      data.answers && i < data.answers.length ? data.answers[i] : null
    );
    alignedIx.push(
      data.choiceIx && i < data.choiceIx.length && typeof data.choiceIx[i] === 'number'
        ? data.choiceIx[i]
        : -1
    );
  }
  return {
    activeQ: activeQ,
    answers: alignedAnswers,
    choiceIx: alignedIx
  };
}

function resumeTestFromStorage(forceMode) {
  var mode = forceMode || testMode;
  var data = readProgressForMode(mode);
  if (!draftIsResumable(data)) {
    showToast(
      lang === 'es'
        ? 'No se encontró un progreso que se pueda continuar.'
        : 'No saved progress found to resume.'
    );
    return false;
  }

  if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser) {
    showToast(lang === 'es' ? 'Iniciá sesión para continuar.' : 'Sign in to resume your test.');
    var path = window.location.pathname + window.location.search;
    window.location.href =
      typeof AnimusShared !== 'undefined' && AnimusShared.buildLoginUrl
        ? AnimusShared.buildLoginUrl(path)
        : '/login?next=' + encodeURIComponent(path);
    return false;
  }

  setTestMode(data.testMode || mode || 'short');
  if (testMode === 'full' && !hasDetailedEntitlement(_introUserData)) {
    window.location.href = '/shop';
    return false;
  }

  observerMode = !!data.observerMode;
  observerSubjectName = data.observerSubjectName || '';
  var restored = restoreActiveQFromDraft(data);
  window._activeQ = restored.activeQ;

  if (!window._activeQ.length) {
    showToast(
      lang === 'es'
        ? 'El progreso guardado no es compatible. Empezá un test nuevo.'
        : 'Saved progress could not be restored. Please start a new test.'
    );
    return false;
  }

  var expectedTotal = parseInt(data.total, 10) || window._activeQ.length;
  if (window._activeQ.length < expectedTotal) {
    showToast(
      lang === 'es'
        ? 'Algunas preguntas no se pudieron restaurar. Empezá un test nuevo si los números no coinciden.'
        : 'Some questions could not be restored. Start a new test if your progress count looks wrong.'
    );
  }

  TOTAL = window._activeQ.length;
  data = Object.assign({}, data, {
    answers: restored.answers,
    choiceIx: restored.choiceIx,
    total: TOTAL
  });
  restoreAnswersFromProgress(data);
  resetTestMilestones();
  setTestPhase('quiz');
  applyQuizHeaderForMode();
  updateQuizModeSwitch();
  renderQ();
  updateTestProgressChrome();
  saveTestProgress();
  showToast(lang === 'es' ? 'Continuando tu test…' : 'Resuming your test…');
  return true;
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
    if (
      testMode === 'estimator' &&
      typeof AnimusEstimator !== 'undefined' &&
      !AnimusEstimator.isObservableQuestion(q)
    ) {
      continue;
    }
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
  if (testMode === 'short' || testMode === 'estimator' || testMode === 'quick') {
    var pools = buildTaggedPools();
    var byTag = pools.byTag;
    var qKey = pools.qKey;
    var used = {};
    activeQ = [];
    var alloc = testMode === 'estimator'
      ? ESTIMATOR_ALLOC
      : (testMode === 'quick' && typeof AnimusTestScore !== 'undefined'
        ? AnimusTestScore.QUICK_ALLOC
        : SHORT_ALLOC);
    Object.keys(alloc).forEach(function (fn) {
      var count = alloc[fn];
      var p = poolForAlloc(fn, byTag);
      var mcCount = Math.floor(count / 2);
      var sCount = count - mcCount;
      var gotMc = takeUniqueQuestions(p.mc, mcCount, used, qKey);
      var gotS = takeUniqueQuestions(p.s, sCount, used, qKey);
      activeQ = activeQ.concat(gotMc).concat(gotS);
      var need = count - gotMc.length - gotS.length;
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

var ESTIMATOR_ALLOC = {
  Ni: 3, Ne: 3, Ti: 3, Te: 3, Fi: 3, Fe: 3, Si: 2, Se: 2,
  E1: 1, E2: 1, E3: 1, E4: 1, E5: 1, E6: 1, E7: 1, E8: 1, E9: 1,
  PC_ECON_R: 2, PC_ECON_L: 2, PC_AUTH: 2, PC_LIB: 2,
  AT_SEC: 2, AT_ANX: 2, AT_AVO: 2, AT_DIS: 2,
  IV_SP: 1, IV_SOC: 1,
  TMP_CHO: 1, TMP_MEL: 1
};

function startTest() {
  if (testMode === 'full' && !hasDetailedEntitlement(_introUserData)) {
    window.location.href = '/shop';
    return;
  }
  function launch() {
    buildActiveQuestionSet();
    answers = new Array(TOTAL).fill(null);
    cur = 0;
    _explainCache = {};
    clearTestProgress();
    resetTestMilestones();
    setTestPhase('quiz');
    if (typeof g.AnimusAnalytics !== 'undefined' && g.AnimusAnalytics.track) {
      g.AnimusAnalytics.track('test_start', {
        test_mode: testMode || 'short',
        observer_mode: !!observerMode
      });
    }
    applyQuizHeaderForMode();
    renderQ();
    saveTestProgress();
  }

  function redirectToLoginForTest() {
    var path = window.location.pathname + window.location.search;
    var dest =
      typeof AnimusShared !== 'undefined' && AnimusShared.buildLoginUrl
        ? AnimusShared.buildLoginUrl(path)
        : '/login?next=' + encodeURIComponent(path);
    window.location.href = dest;
  }

  function noticeThenGo(msg, go) {
    if (typeof showToast === 'function') {
      showToast(msg);
      setTimeout(go, 1400);
    } else {
      alert(msg);
      go();
    }
  }

  if (typeof firebase === 'undefined' || !firebase.auth) {
    noticeThenGo('Sign in to save your results to your profile.', redirectToLoginForTest);
    return;
  }

  var authUser = firebase.auth().currentUser;
  if (!authUser) {
    noticeThenGo(
      'Sign in to take the test — your results are saved to your account when you finish.',
      redirectToLoginForTest
    );
    return;
  }

  firebase
    .firestore()
    .collection('users')
    .doc(authUser.uid)
    .get()
    .then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var gate = entitlementGateForMode(data);
      if (gate) {
        noticeThenGo(gate, function () {
          window.location.href = '/shop';
        });
        return;
      }
      launch();
    })
    .catch(function () {
      launch();
    });
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
      bar.classList.add('is-visible');
      document.getElementById('btnBackHome').addEventListener('click', function(){
        bar.classList.remove('is-visible');
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

configureIntroForMode();
if (applyRouteTestMode() === 'estimator' && observerSubjectName) {
  observerMode = true;
  window._observerMode = true;
  window._observerName = observerSubjectName;
}

function showResultsFromStoredSnapshot(snap, subjectName) {
  if (!snap || !snap.mbti) return;
  observerMode = true;
  window._observerMode = true;
  window._observerName = subjectName || snap.subjectName || '';
  var data = {
    cog: snap.cog || {},
    ennScores: snap.enn || {},
    attScores: snap.att2 || {},
    tmp: snap.tmp || {},
    iv: snap.iv || {},
    mf: snap.mf || {},
    eth: snap.eth || {},
    ep: snap.ep || {},
    phiScores: snap.phiS || {},
    soc: snap.soc || {},
    alone: snap.alone || {},
    polX: snap.polX || 0,
    polY: snap.polY || 0
  };
  var enn = {
    type: snap.ennType || '5',
    wing: snap.ennWing || '6',
    tritype: snap.ennTritype || '',
    scores: snap.enn || {}
  };
  var fnsSorted = Object.keys(data.cog).sort(function (a, b) {
    return (data.cog[b] || 0) - (data.cog[a] || 0);
  });
  var ai = {
    mbtiName: snap.mbtiName || '',
    tagline: snap.tagline || '',
    socionics: snap.socionics || '',
    keirsey: snap.keirsey || '',
    values: snap.values || [],
    figures: snap.figures || [],
    cogNarrative: snap.cogNarrative || '',
    ennNarrative: snap.ennNarrative || '',
    attNarrative: snap.attNarrative || '',
    phiNarrative: snap.phiNarrative || '',
    politicalNarrative: snap.politicalNarrative || '',
    politicalIdeology: snap.politicalIdeology || '',
    politicalIdeologyDesc: snap.politicalIdeologyDesc || '',
    politicalStrengths: snap.politicalStrengths || '',
    politicalWeaknesses: snap.politicalWeaknesses || '',
    politicalThinkers: snap.politicalThinkers || [],
    similarPoliticians: snap.similarPoliticians || [],
    similarParties: snap.similarParties || [],
    similarCountries: snap.similarCountries || [],
    aloneDesc: snap.aloneDesc || '',
    socialDesc: snap.socialDesc || '',
    shadowDesc: snap.shadowDesc || '',
    big5: snap.big5 || {}
  };
  setTestPhase('results');
  showResults(
    data,
    snap.mbti,
    enn,
    snap.att || 'AT_AVO',
    snap.phi || 'PH_NIE',
    snap.instStack || '',
    fnsSorted,
    ai,
    false
  );
  var heroEl = document.getElementById('resHero');
  if (heroEl && window._observerMode) {
    var banner = document.createElement('div');
    banner.style.cssText =
      'background:rgba(200,169,110,0.08);border:1px solid var(--accent2);padding:12px 20px;margin-bottom:16px;font-size:12px;color:var(--muted2);letter-spacing:0.05em;';
    banner.innerHTML =
      '◎ ESTIMATED PROFILE — <strong style="color:var(--text)">' +
      escapeHTML(window._observerName || 'Unknown') +
      '</strong> — Based on observed behavior only. <a href="/estimations" style="color:var(--accent)">← Estimations</a>';
    heroEl.insertBefore(banner, heroEl.firstChild);
  }
  document.getElementById('actionBar').classList.remove('is-visible');
}

function tryLoadEstimationView() {
  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    return;
  }
  if (params.get('mode') !== 'estimator' || params.get('view') !== '1') return;
  var estId = window._estimationId || params.get('estimation');
  if (!estId) return;
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  function loadForUser(user) {
    if (!user) {
      window.location.replace('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    firebase
      .firestore()
      .collection('users')
      .doc(user.uid)
      .collection('estimations')
      .doc(estId)
      .get()
      .then(function (doc) {
        if (!doc.exists || !doc.data().snapshot) {
          showToast('Estimation not found.');
          return;
        }
        var d = doc.data();
        showResultsFromStoredSnapshot(d.snapshot, d.subjectName);
      })
      .catch(function () {
        showToast('Could not load estimation.');
      });
  }

  var cur = firebase.auth().currentUser;
  if (cur) loadForUser(cur);
  else firebase.auth().onAuthStateChanged(loadForUser);
}

tryLoadEstimationView();

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

  setTestPhase('quiz');

  var missingLabel = missingDims.length + ' missing dimension' + (missingDims.length > 1 ? 's' : '');
  updateQuizHeader(lang === 'es' ? 'Completar' : 'Fill-in');

  function renderFill(){
    var q = filteredQ[fillCur];

    var loc = localizedForQuestion(q, q._qIdx != null ? q._qIdx : Q.indexOf(q));
    var qText = loc.text;
    var hasExplain = !!(loc.explain || q.e);
    var explainText = loc.explain || (q.e || '');
    var lbl = scaleLabels[lang] || scaleLabels['en'];
    var isMc = q.type === 'mc' && q.choices;

    updateQuizHeader(loc.sec || (lang === 'es' ? 'Completar' : 'Fill-in'));
    var html = buildQuestionChrome(qText, loc, isMc);
    if(hasExplain){
      html += '<button class="btn-explain" id="btnExplain"><span class="btn-explain-icon">◎</span>'
        + (lang==='es'?'SIMPLIFICAR PREGUNTA':'SIMPLIFY QUESTION') + '</button>';
      html += '<div class="explain-bubble" id="explainBubble">' + explainText + '</div>';
    }

    if(isMc){
      html += '<div class="mc-choices">';
      (loc.choices.length ? loc.choices : q.choices.map(function(c){ return { letter:c.l, text:c.t, score:c.s }; })).forEach(function(c, ci){
        var sel = fillAnswers[fillCur]===c.score ? ' selected' : '';
        html += '<button type="button" class="mc-choice'+sel+'" data-v="'+c.score+'" data-ci="'+ci+'">'
          + '<span class="mc-letter">'+c.letter+'</span>'
          + '<div class="mc-content"><span class="mc-text">'+escapeHTML(c.text)+'</span></div></button>';
      });
      html += '</div>';
    } else {
      html += buildLikertHtml(fillAnswers[fillCur], loc, lbl);
    }
    html += '</div>';

    var isLast = fillCur === filteredQ.length - 1;
    var hasAns = fillAnswers[fillCur] !== null;
    var backTxt  = lang==='es' ? '&#8592; ATRÁS' : '&#8592; BACK';
    var nextTxt  = lang==='es' ? 'SIGUIENTE &#8594;' : 'NEXT &#8594;';
    var resTxt   = lang==='es' ? 'VER RESULTADOS &#8594;' : 'SEE RESULTS &#8594;';
    html += '<div class="nav-row">'
      + '<button class="btn-sec" id="bBtn"'+(fillCur===0?' disabled':'')+'>'+backTxt+'</button>'
      + '<button class="btn-next'+(hasAns?' is-ready':' disabled')+'" id="nBtn"'+(hasAns?'':' disabled')+'>'
      + (isLast ? resTxt : nextTxt) + '</button></div>';

    var body = document.getElementById('qBody');
    body.innerHTML = html;
    playQuestionEnter(body);
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
        applyChoiceChrome(body, fillAnswers[fillCur], this.getAttribute('data-ci'));
      });
    });
    if(bBtn) bBtn.addEventListener('click', function(){ if(bBtn.disabled) return; _quizNavDir = -1; fillCur--; renderFill(); });
    if(nBtn) nBtn.addEventListener('click', function(){
      if(nBtn.disabled) return;
      if(isLast){ finishFill(filteredQ, fillAnswers, baseProfile); }
      else { _quizNavDir = 1; fillCur++; renderFill(); }
    });
  }

  renderFill();
}

function finishFill(filteredQ, fillAnswers, baseProfile){
  setTestPhase('loading');

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
    showResults(mergedData, mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE',
      baseProfile.instStack||'', fnsSorted, aiRes, false);
  }, function(){
    clearInterval(iv2);
    var fallback = buildFallbackNarrative(mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE', mergedData);
    showResults(mergedData, mbti, enn, baseProfile.att||'AT_AVO', baseProfile.phi||'PH_NIE',
      baseProfile.instStack||'', fnsSorted, fallback, true);
  });
}

function resetTestMilestones() {
  _milestonesShown = {};
  clearTimeout(_milestoneHideTimer);
  var el = document.getElementById('testMilestoneToast');
  if (el) {
    el.classList.remove('is-visible');
    el.hidden = true;
    el.textContent = '';
  }
}

function maybeShowQuestionMilestone() {
  if (!isQuizPhase() || TOTAL < 10) return;
  var qNum = cur + 1;
  if (qNum < 10 || qNum % 10 !== 0) return;
  if (_milestonesShown[qNum]) return;
  _milestonesShown[qNum] = true;
  var el = document.getElementById('testMilestoneToast');
  if (!el) return;
  var msgs = lang === 'es' ? MILESTONE_MSG_ES : MILESTONE_MSG_EN;
  var block = Math.floor(qNum / 10) - 1;
  var text = msgs[block % msgs.length] || msgs[0];
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('is-visible');
  void el.offsetWidth;
  el.classList.add('is-visible');
  clearTimeout(_milestoneHideTimer);
  _milestoneHideTimer = setTimeout(function () {
    el.classList.remove('is-visible');
    setTimeout(function () {
      if (!el.classList.contains('is-visible')) {
        el.hidden = true;
        el.textContent = '';
      }
    }, 400);
  }, 3200);
}

function renderQ(){
  refreshAnimusLang();
  bindQuizKeysOnce();
  var q=(window._activeQ||Q)[cur];
  var loc = localizedForQuestion(q, cur);
  if (observerMode && observerSubjectName && typeof AnimusEstimator !== 'undefined') {
    loc = AnimusEstimator.localizeObserver(loc, q, observerSubjectName);
  }
  updateQuizHeader(loc.sec);

  var qText = loc.text;
  var explainText = _explainCache[cur] || loc.explain || q.e || '';
  var lbl = scaleLabels[lang]||scaleLabels['en'];
  var isMc = q.type==='mc' && q.choices;

  var h = buildQuestionChrome(qText, loc, isMc);

  // Always show simplify button
  h += '<button class="btn-explain" id="btnExplain">&#9711; '+(lang==='es'?'Simplificar pregunta':'Simplify question')+'</button>';
  h += '<div class="explain-bubble" id="explainBubble">'+(explainText||'')+'</div>';

  if(isMc){
    h += '<div class="mc-choices">';
    (loc.choices.length ? loc.choices : q.choices.map(function(c){ return { letter:c.l, text:c.t, score:c.s }; })).forEach(function(c, ci){
      var sel = (_choiceIx[cur]===ci || (answers[cur]===c.score && _choiceIx[cur]===undefined)) ? ' selected' : '';
      h += '<button type="button" class="mc-choice'+sel+'" data-v="'+c.score+'" data-ci="'+ci+'">'
        + '<span class="mc-letter">'+c.letter+'</span>'
        + '<div class="mc-content"><span class="mc-text">'+escapeHTML(c.text)+'</span></div>'
        + '</button>';
    });
    h += '</div>';
  } else {
    h += buildLikertHtml(answers[cur], loc, lbl);
  }
  h += '</div>';

  var isLast = cur===TOTAL-1;
  var hasAns = answers[cur]!==null;
  h += '<div class="nav-row">'
    + '<button class="btn-sec" id="bBtn"'+(cur===0?' disabled':'')+'>&#8592; '+(lang==='es'?'ATRÁS':'BACK')+'</button>'
    + '<button class="btn-next'+(hasAns?' is-ready':' disabled')+'" id="nBtn"'+(hasAns?'':' disabled')+'>'
    + (isLast?(lang==='es'?'VER RESULTADOS &#8594;':'SEE RESULTS &#8594;'):(lang==='es'?'SIGUIENTE &#8594;':'NEXT &#8594;'))+'</button>'
    + '</div>';

  var body = document.getElementById('qBody');
  body.innerHTML = h;
  playQuestionEnter(body);
  window.scrollTo(0,0);

  var btnEx = document.getElementById('btnExplain');
  var bubbleEl = document.getElementById('explainBubble');
  if(btnEx && bubbleEl){
    btnEx.addEventListener('click', function(){
      var open = bubbleEl.classList.toggle('open');
      btnEx.innerHTML = (open?'&times; ':'&#9711; ')+(lang==='es'?(open?'Cerrar':'Simplificar pregunta'):(open?'Close':'Simplify question'));
      if(!open) return;
      var cached = _explainCache[cur];
      var baked = (loc.explain || q.e || '').trim();
      if(cached){
        bubbleEl.textContent = cached;
        return;
      }
      if(baked){
        _explainCache[cur] = baked;
        bubbleEl.textContent = baked;
        return;
      }
      var qText2 = loc.text || q.t;
      var fallback = localSimplifyQuestion(qText2);
      bubbleEl.textContent = fallback;
      _explainCache[cur] = fallback;
      if(typeof AnimusShared === 'undefined' || !AnimusShared.fetchApiPost) return;
      bubbleEl.textContent = lang==='es' ? 'Simplificando...' : 'Simplifying...';
      AnimusShared.fetchApiPost('/api/simplify', { question: qText2, lang: lang })
        .then(function(r){ if(!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function(d){
          var txt = (d.simplified || '').trim().replace(/^["']|["']$/g, '');
          if(txt){
            _explainCache[cur] = txt;
            bubbleEl.textContent = txt;
          } else {
            bubbleEl.textContent = fallback;
          }
        })
        .catch(function(){
          bubbleEl.textContent = fallback;
        });
    });
  }

  body.querySelectorAll('[data-v]').forEach(function(b){
    b.addEventListener('click', function(){
      answers[cur] = parseInt(this.getAttribute('data-v'), 10);
      var ci = this.getAttribute('data-ci');
      _choiceIx[cur] = ci !== null && ci !== '' ? parseInt(ci, 10) : -1;
      applyChoiceChrome(body, answers[cur], ci);
      saveTestProgress();
      updateQuizModeSwitch();
      updateTestProgressChrome();
    });
  });

  var bb = document.getElementById('bBtn');
  var nb = document.getElementById('nBtn');
  if(bb) bb.addEventListener('click', function(){ if(bb.disabled) return; _quizNavDir = -1; cur--; renderQ(); });
  if(nb) nb.addEventListener('click', function(){
    if(nb.disabled) return;
    if(isLast) finishQuiz(); else { _quizNavDir = 1; cur++; renderQ(); }
  });

  saveTestProgress();
  updateQuizModeSwitch();
  updateTestProgressChrome();
  maybeShowQuestionMilestone();
}

// ── FINISH QUIZ (called when user completes last question) ──
function finishQuiz(){
  resetTestMilestones();
  clearTimeout(_serverDraftSaveTimer);
  clearTestProgress();
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
    showResults(data, mbti, enn, att, phi, instStack, fnsSorted, aiRes, false);
  }, function(){
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
  if (typeof AnimusScoring !== 'undefined' && AnimusScoring.getMBTI) {
    return AnimusScoring.getMBTI(cog, answerFingerprint());
  }
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
    var val = (typeof AnimusTestScore !== 'undefined')
      ? AnimusTestScore.valFromRaw(q, raw)
      : ((raw - 1) / 6) * 100;
    if (val === null) return;
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
  if (typeof AnimusScoring !== 'undefined' && AnimusScoring.refineEnneagramForMbti) {
    ennResult = AnimusScoring.refineEnneagramForMbti(mbti, ennResult, eS);
  }
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
    +'IMPORTANT: Base ALL analysis on the actual numeric coordinates and scores. Do NOT treat everyone in a compass quadrant as the same. Distance on the axes matters. Do not call someone an ideological twin unless scores are extremely close. Do not invent quotes, votes, or biographical facts for figures. Label estimates as estimates.\n'
    +'This person is '+mbti+' type '+enn.type+'w'+enn.wing+'. Their dominant function is '+fnsSorted[0]+' (score '+data.cog[fnsSorted[0]]+'). '
    +'Be specific to THEIR actual profile — every narrative must match their actual scores.\n'
    +'Write for the person reading their own profile. Each narrative must explain THREE layers: '
    +'(1) WHAT they tend to do in practice (observable behavior), '
    +'(2) HOW their type/stack produces that pattern (mechanism), '
    +'(3) WHY it makes sense given their scores (not generic type boilerplate). '
    +'Use second person (you/your). Cite specific function scores and compass coordinates where relevant.\n\n'
    +'Return a JSON object with EXACTLY these keys:\n'
    +'{\n'
    +'"mbtiName":"archetype name 3-4 words — specific to '+mbti+', NOT generic",\n'
    +'"tagline":"one sentence capturing '+mbti+' type '+enn.type+'w'+enn.wing+' essence",\n'
    +'"cogNarrative":"3 paragraphs: (1) How dominant '+fnsSorted[0]+' ('+data.cog[fnsSorted[0]]+') and auxiliary '+fnsSorted[1]+' ('+data.cog[fnsSorted[1]]+') work together — what you DO, not just what the functions mean. (2) Mechanism: why this stack routes problems this way under normal vs stress conditions. (3) What others misunderstand about your thinking.",\n'
    +'"ennNarrative":"3 paragraphs on '+enn.type+'w'+enn.wing+': (1) observable behavior in work/love, (2) fear/desire mechanism and why the wing '+enn.wing+' modifies it, (3) how '+mbti+' cognitive style channels this motivation — tied to scores, not generic Enneagram copy.",\n'
    +'"attNarrative":"2 paragraphs on '+att+': (1) what you DO in closeness, conflict, and trust — concrete patterns. (2) why '+mbti+' + type '+enn.type+' makes this attachment style express the way it does.",\n'
    +'"phiNarrative":"2-3 paragraphs on '+phi+': ethical/meaning lens in daily decisions — mechanism (why you judge ideas this way) and behavior (what you actually do when values conflict).",\n'
    +'"politicalNarrative":"4 paragraphs: (1) What X='+data.polX+' Y='+data.polY+' in '+polQuadrant+' means in plain language — what you tend to support and oppose. (2) Economic values mechanism for these coordinates. (3) Social liberty vs order — behavioral pattern. (4) How '+mbti+' '+enn.type+'w'+enn.wing+' connects + honest blind spots.",\n'
    +'"politicalIdeology":"specific label — e.g. Classical Liberal, Paleolibertarian, National Conservative, Democratic Socialist, Left-Libertarian",\n'
    +'"politicalIdeologyDesc":"3 sentences on what this ideology believes and why it fits polX='+data.polX+' polY='+data.polY+'",\n'
    +'"similarCountries":["5 countries matching polX='+data.polX+' polY='+data.polY+' — format \'Country: specific reason\'"],\n'
    +'"similarPoliticians":["6 politicians matching this profile — format \'Name (Country): reason\' — include non-Western figures"],\n'
    +'"similarParties":["5 parties from 3+ countries — format \'Party (Country): reason\'"],\n'
    +'"politicalStrengths":"3 sentences on genuine strengths of this position",\n'
    +'"politicalWeaknesses":"3 sentences on genuine blind spots and failures",\n'
    +'"politicalThinkers":["4-5 thinkers resonant with polX='+data.polX+' polY='+data.polY+' AND '+phi+' philosophy — format \'Name: reason\'"],\n'
    +'"aloneDesc":"2-3 sentences: what '+mbti+' type '+enn.type+' actually DOES in solitude — processing style via '+fnsSorted[0]+', not a generic introvert line.",\n'
    +'"socialDesc":"2-3 sentences: how '+mbti+' type '+enn.type+' presents with others — behavior others see vs inner cost, tied to '+fnsSorted[0]+'/'+fnsSorted[1]+'.",\n'
    +'"shadowDesc":"2-3 sentences: shadow mechanism — how '+fnsSorted[0]+' dominance and type '+enn.type+' fear combine under stress into specific blind spots.",\n'
    +'"figures":[\n'
    +'  8 real or fictional figures who share '+mbti+' enn '+enn.type+'w'+enn.wing+' profile.\n'
    +'  Format: {"name":"Full Name","cat":"Historical|Celebrity|Pop Culture","type":"'+mbti+' '+enn.type+'w'+enn.wing+'","initials":"2-3 chars","note":"1 sentence why similar"}\n'
    +'  Include: 3 historical, 2 celebrity, 2 pop culture/fictional, 1 philosopher. Must match '+mbti+' — not INTJ defaults.\n'
    +'],\n'
    +'"values":["6 core values as short noun phrases for '+mbti+' type '+enn.type+'"],\n'
    +'"big5":{"Openness":0-100,"Conscientiousness":0-100,"Extraversion":0-100,"Agreeableness":0-100,"Neuroticism":0-100},\n'
    +'"socionics":"socionics type for '+mbti+'",\n'
    +'"keirsey":"one of: Analyst/Visionary/Steward/Operator"\n'
    +'}\n'
    +'Respond ONLY with raw JSON. No markdown, no explanation, no fences.';
}



function callAIWithRetry(prompt,retriesLeft,onSuccess,onFail,depth){
  var retryEl=document.getElementById('loadRetry');
  var attempt=4-retriesLeft;
  if(retryEl && attempt>0) retryEl.textContent='Retry '+attempt+' of 3...';

  var scoreFetch = (typeof AnimusShared !== 'undefined' && AnimusShared.fetchApiPost)
    ? AnimusShared.fetchApiPost('/api/score', { prompt: prompt, depth: depth || 'free' })
    : Promise.reject(new Error('auth_required'));

  scoreFetch
  .then(function(r){
    if(!r.ok) throw new Error('API error '+r.status);
    return r.json();
  })
  .then(function(d){
    var text=(d.content||[]).map(function(b){return b.type==='text'?b.text:'';}).join('').replace(/```json|```/g,'').trim();
    var parsed=JSON.parse(text);
    if (retryEl) retryEl.textContent='';
    onSuccess(parsed);
  })
  .catch(function(e){
    console.warn('AI attempt failed:',e.message);
    if(e.message === 'auth_required' || e.message === 'Sign in required'){
      if (retryEl) retryEl.textContent='';
      onFail();
      return;
    }
    // If CORS/network error, go straight to fallback (no point retrying)
    var isCORS = e.message && (e.message.indexOf('Failed to fetch')>=0 || e.message.indexOf('NetworkError')>=0 || e.message.indexOf('CORS')>=0);
    if(!isCORS && retriesLeft>1){
      setTimeout(function(){callAIWithRetry(prompt,retriesLeft-1,onSuccess,onFail,depth);},1500);
    } else {
      if (retryEl) retryEl.textContent='';
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

function insertDetailedTestUpsell() {
  var existing = document.getElementById('detailedTestUpsell');
  if (existing) existing.remove();
  if (testMode !== 'short' && testMode !== 'quick') return;
  var es = lang === 'es';
  function renderBanner(hasDetailedOwned) {
    var banner = document.createElement('div');
    banner.id = 'detailedTestUpsell';
    if (hasDetailedOwned && testMode === 'full') {
      banner.className = 'detailed-test-owned-badge';
      banner.textContent = es ? 'Test Detallado — resultados de profundidad completa' : 'Detailed Test — full-depth results';
    } else if (hasDetailedOwned) {
      return;
    } else {
      banner.className = 'detailed-test-upsell';
      banner.innerHTML = es
        ? 'Para mayor precisión, considerá el <a href="/shop">Test Detallado</a>.'
        : 'For greater accuracy, consider the <a href="/shop">Detailed Test</a>.';
    }
    var hero = document.getElementById('resHero');
    if (hero) hero.appendChild(banner);
  }
  var user = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
  if (user && typeof AnimusEntitlements !== 'undefined') {
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      renderBanner(AnimusEntitlements.hasEntitlement(data, 'detailedTest'));
    }).catch(function () { renderBanner(false); });
  } else {
    renderBanner(false);
  }
}

function bindDeeperInsight(data) {
  var mount = document.getElementById('deeperInsightMount');
  if (!mount || typeof AnimusResultsUI === 'undefined') return;
  function renderLocked() {
    mount.innerHTML = AnimusResultsUI.insightCard('Deeper Insight', '', true, true);
  }
  var user = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
  if (!user || typeof AnimusEntitlements === 'undefined') {
    renderLocked();
    return;
  }
  firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
    var ud = doc.exists ? doc.data() : {};
    if (!AnimusEntitlements.hasAnimusPlus(ud)) {
      renderLocked();
      return;
    }
    mount.innerHTML = AnimusResultsUI.card({
      kind: 'deeper',
      kicker: 'Deeper Insight',
      title: 'Plus',
      body: '<p>Longer interpretation of contradictions and unusual score combinations. This is commentary, not a diagnosis.</p><button type="button" class="btn-primary" id="deeperInsightBtn">Generate Deeper Insight</button><div id="deeperInsightOut" class="animus-prose"></div>'
    });
    var btn = document.getElementById('deeperInsightBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var extra = buildPrompt(data) +
        '\nAlso include "deeperInsight":"700-1100 words on contradictions, trait interactions, and unusual combinations. Do not invent quotes or votes. Label estimates as estimates."\n';
      callAIWithRetry(extra, 3, function (parsed) {
        var out = document.getElementById('deeperInsightOut');
        if (out) {
          out.textContent = parsed.deeperInsight || parsed.shadowDesc || parsed.politicalNarrative || 'Generated.';
        }
        btn.disabled = false;
      }, function () {
        btn.disabled = false;
        if (typeof showToast === 'function') showToast('Could not generate Deeper Insight.');
      }, 'deeper');
    });
  }).catch(renderLocked);
}

function showResults(data,mbti,enn,att,phi,instStack,fnsSorted,ai,isFallback){
  refreshAnimusLang();
  var es = lang === 'es';
  var res=document.getElementById('results');
  setTestPhase('results');
  window.scrollTo(0,0);

  // Hero
  var badge=isFallback
    ?'<div class="ai-badge"><div class="ai-dot" style="background:#333"></div>'+(es?'ANÁLISIS LOCAL':'LOCAL ANALYSIS')+'</div>'
    :'<div class="ai-badge"><div class="ai-dot" style="background:var(--accent)"></div>'+(es?'ANÁLISIS IA':'AI ANALYSIS')+'</div>';

  var phiNames={'PH_STO':es?'Estoico':'Stoic','PH_EPI':es?'Epicúreo':'Epicurean','PH_KAN':es?'Kantiano':'Kantian','PH_ARI':es?'Aristotélico':'Aristotelian','PH_NIE':es?'Nietzscheano':'Nietzschean','PH_EXI':es?'Existencialista':'Existentialist','PH_PRA':es?'Pragmatista':'Pragmatist','PH_SKE':es?'Escéptico':'Skeptic'};
  var attNames={'AT_SEC':es?'Seguro':'Secure','AT_ANX':es?'Ansioso-Preocupado':'Anxious-Preoccupied','AT_AVO':es?'Evitativo-Dismissivo':'Dismissive-Avoidant','AT_DIS':es?'Evitativo-Temeroso':'Fearful-Avoidant'};
  var polLabel=(data.polX>5?(es?'Libertad económica':'Econ Freedom'):(data.polX<-5?(es?'Economía estatal':'State Economy'):(es?'Mixto':'Mixed')))+'/'+(data.polY>5?(es?'Autoritario':'Authoritarian'):(data.polY<-5?(es?'Libertario':'Libertarian'):(es?'Moderado':'Moderate')));

  document.getElementById('resHero').innerHTML=badge
    +'<div class="res-eyebrow">'+(es?'Tu perfil completo':'Your Complete Profile')+'</div>'
    +'<div class="res-type">'+mbti+'</div>'
    +'<div class="res-archetype">'+(sanitizeText(ai.mbtiName,2000)||'')+'</div>'
    +'<p class="res-tagline">'+(sanitizeText(ai.tagline,2000)||'')+'</p>'
    +'<div class="res-chips">'
    +'<div class="chip"><strong>Type</strong>'+mbti+'</div>'
    +'<div class="chip"><strong>Enn</strong>'+enn.type+'w'+enn.wing+'</div>'
    +'<div class="chip"><strong>Tritype</strong>'+enn.tritype+'</div>'
    +'<div class="chip"><strong>Attachment</strong>'+attNames[att]+'</div>'
    +'<div class="chip"><strong>Philosophy</strong>'+(phiNames[phi]||phi)+'</div>'
    +'<div class="chip"><strong>Political</strong>'+(sanitizeText(ai.politicalIdeology,2000)||polLabel)+'</div>'
    +'<div class="chip"><strong>Instinct</strong>'+instStack+'</div>'
    +'<div class="chip"><strong>Socionics</strong>'+(sanitizeText(ai.socionics,2000)||'')+'</div>'
    +'<div class="chip"><strong>Temperament</strong>'+(sanitizeText(ai.keirsey,2000)||'')+'</div>'
    +'</div>';

  insertDetailedTestUpsell();

  // Build tabs
  var tabLbl = function (en, esKey) {
    if (!es) return en;
    return (typeof AnimusI18n !== 'undefined' && AnimusI18n.RESULT_TABS_ES && AnimusI18n.RESULT_TABS_ES[en]) || esKey || en;
  };
  var tabsHtml='';
  TABS.forEach(function(t,i){
    tabsHtml+='<div class="tab'+(i===0?' active':'')+'" data-tab="'+t.id+'">'+tabLbl(t.label, t.label)+'</div>';
  });
  document.getElementById('tabsBar').innerHTML=tabsHtml;

  // Build panels
  var panels='';

  // ── OVERVIEW PANEL ──
  panels+='<div class="panel active" id="panel-overview">'
    +'<div class="panel-title">Your Profile at a Glance</div>'
    +'<p class="panel-sub">Scan the cards, then open any tab for more. Full read: about 10 minutes.</p>'
    +(typeof AnimusResultsUI !== 'undefined' ? AnimusResultsUI.legacyNote({ bankVersion: data.bankVersion, scoringVersion: data.scoringVersion }) : '')
    +(typeof AnimusAds !== 'undefined' ? AnimusAds.slot('results.belowSummary', _introUserData) : '')
    +'<div class="animus-results-scan">'
    +(typeof AnimusResultsUI !== 'undefined' ? AnimusResultsUI.scoreCard('Type', mbti, enn.type + 'w' + enn.wing + ' · ' + fnsSorted[0]) : '')
    +(typeof AnimusResultsUI !== 'undefined' ? AnimusResultsUI.scoreCard('Compass', (data.polX > 0 ? '+' : '') + data.polX + ' / ' + (data.polY > 0 ? '+' : '') + data.polY, 'Actual coordinates — not just a quadrant') : '')
    +(typeof AnimusResultsUI !== 'undefined' ? AnimusResultsUI.compassSvg(data.polX, data.polY) : '')
    +'</div>'

    +'<div class="stat-grid">'
    +'<div class="stat-cell"><span class="stat-big">'+mbti+'</span><span class="stat-lbl">Cognitive type</span></div>'
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
    +'<div class="card2"><div class="card-title">Temperament cluster</div><p style="font-family:\'Cormorant Garamond\',serif;font-size:36px;font-weight:300;color:var(--text);">'+(sanitizeText(ai.keirsey,2000)||'—')+'</p></div>'
    +'</div>'
    +'</div>';

  // ── PERSONALITY PANEL ──
  var ennNames={1:'The Standard-bearer',2:'The Ally',3:'The Striver',4:'The Seeker',5:'The Sage',6:'The Sentinel',7:'The Spark',8:'The Vanguard',9:'The Harmonizer'};
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
    +'<div class="panel-title">Political spectrum</div>'
    +'<p class="panel-sub">Position uses exact coordinates. Nearby figures are ranked by distance, then popularity — not by sharing a quadrant.</p>'

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

    +(function () {
      if (typeof AnimusPoliticalFigures === 'undefined' || typeof AnimusResultsUI === 'undefined') return '';
      var ranked = AnimusPoliticalFigures.rankClosest({ polX: data.polX, polY: data.polY }, { limit: 5 });
      if (!ranked.length) return '';
      return '<div class="section-label">Closest political figures (estimated placements)</div>' +
        ranked.map(function (f) {
          return AnimusResultsUI.figureCard({
            name: f.name,
            dataStatus: f.dataStatus,
            note: f.label + ' · similarity ' + f.similarity,
            sourceNote: f.sourceNote
          });
        }).join('');
    })()
    +'<div id="deeperInsightMount"></div>'
    +'<p class="animus-fine">Cultural axis (Plus) is scored separately and is not stored on public profiles.</p>'

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
  bindDeeperInsight(data);

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
  document.getElementById('actionBar').classList.add('is-visible');

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
    cogNarrative:sanitizeText(ai.cogNarrative,4000)||'', ennNarrative:sanitizeText(ai.ennNarrative,4000)||'',
    attNarrative:sanitizeText(ai.attNarrative,4000)||'', phiNarrative:sanitizeText(ai.phiNarrative,4000)||'',
    politicalNarrative:sanitizeText(ai.politicalNarrative,4000)||'',
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
    snapshot.bankVersion = (typeof AnimusVersions !== 'undefined') ? AnimusVersions.BANK_VERSION : '2026.08.16';
    snapshot.scoringVersion = (typeof AnimusVersions !== 'undefined') ? AnimusVersions.SCORING_VERSION : '2026.08.16';
    snapshot.serverScored = false;
    var sessionId = 's' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    function submitAuthoritative() {
      if (observerMode || typeof AnimusShared === 'undefined' || !AnimusShared.fetchApiPost) {
        return Promise.resolve(null);
      }
      var activeQ = window._activeQ || [];
      var items = [];
      for (var i = 0; i < activeQ.length; i++) {
        var q = activeQ[i];
        if (!q) continue;
        items.push({
          id: q.id || ('q' + i),
          raw: answers[i],
          choiceIx: (_choiceIx && _choiceIx[i] >= 0) ? _choiceIx[i] : undefined
        });
      }
      return AnimusShared.fetchApiPost('/api/submit-test', {
        sessionId: sessionId,
        testMode: testMode,
        items: items
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || 'Submit failed');
          return j.snapshot;
        });
      }).catch(function (err) {
        var retry = document.getElementById('loadRetry');
        if (retry) {
          retry.innerHTML = '<button type="button" class="btn-primary" id="retrySubmitBtn">Retry save scores</button>';
          var btn = document.getElementById('retrySubmitBtn');
          if (btn) btn.addEventListener('click', function () {
            retry.innerHTML = '';
            submitAuthoritative().then(function (srv) {
              if (srv) Object.assign(snapshot, srv);
            });
          });
        }
        console.error('submit-test', err);
        return null;
      });
    }

    var meta = {
      testMode: observerMode ? 'estimator' : (testMode || 'short'),
      answerCount: Object.keys(answers || {}).length,
      completedAt: new Date().toISOString()
    };
    snapshot.completedAt = meta.completedAt;
    snapshot.testMode = meta.testMode;
    snapshot.answerCount = meta.answerCount;

    if (!observerMode && typeof AnimusShared !== 'undefined') {
      AnimusShared.saveLastResultLocal(
        AnimusShared.enrichProfileSnapshot(snapshot, data, meta)
      );
    }

    function setCloudSaveUi(state) {
      var btn = document.getElementById('btnSave');
      if (!btn) return;
      if (state === 'saved') {
        btn.innerHTML = '↓ SAVED ✓';
        btn.style.opacity = '0.7';
        btn.disabled = false;
      } else if (state === 'pending') {
        btn.innerHTML = '↓ SAVING…';
        btn.style.opacity = '1';
        btn.disabled = true;
      } else if (state === 'error') {
        btn.innerHTML = '↓ SAVE TO CLOUD';
        btn.style.opacity = '1';
        btn.disabled = false;
      }
    }

    function onCloudSaved() {
      window.__animusCloudSaveOk = true;
      setCloudSaveUi('saved');
      if (typeof g.AnimusAnalytics !== 'undefined' && g.AnimusAnalytics.track) {
        g.AnimusAnalytics.track('test_complete', {
          test_mode: meta.testMode || testMode || 'short',
          observer_mode: !!observerMode
        });
      }
      if (redirectAfter) {
        showToast('Profile saved to your account ✓');
        setTimeout(function () { window.location.href = '/profile'; }, 1200);
      } else {
        showToast('Saved to your profile automatically ✓');
      }
    }

    function onCloudSaveFailed(err) {
      window.__animusCloudSaveOk = false;
      setCloudSaveUi('error');
      console.error('Profile save:', err);
      var code = err && err.code ? String(err.code) : '';
      var msg =
        err && err.message
          ? err.message
          : 'Could not save to cloud';
      if (code === 'permission-denied') {
        msg =
          'Cloud save blocked (permissions). Sign out and back in, then tap Save to Cloud. If it persists, deploy the latest Firestore rules.';
      } else if (msg.indexOf('Not signed in') >= 0) {
        msg = 'Session expired — sign in again, then tap Save to Cloud.';
      }
      showToast(msg + ' — results kept on this device.');
    }

    function doSave(user) {
      if (!user || typeof AnimusShared === 'undefined') return Promise.resolve();

      if (observerMode && typeof AnimusEstimator !== 'undefined') {
        var estSnap = Object.assign({}, snapshot, {
          subjectName: observerSubjectName || '',
          estimationId: window._estimationId || ''
        });
        var saveChain = window._estimationId
          ? Promise.resolve(window._estimationId)
          : AnimusEstimator.createEstimation(
              firebase.firestore(),
              user.uid,
              observerSubjectName || 'Someone'
            ).then(function (newId) {
              window._estimationId = newId;
              return newId;
            });
        return saveChain
          .then(function (estId) {
            return AnimusEstimator.saveEstimationResult(
              firebase.firestore(),
              user.uid,
              estId,
              estSnap,
              {
                subjectName: observerSubjectName,
                completedAt: meta.completedAt,
                answerCount: meta.answerCount
              }
            );
          })
          .then(function () {
            if (typeof AnimusXp !== 'undefined') {
              return AnimusXp.awardXp(firebase.firestore(), user.uid, 'estimator_complete');
            }
          })
          .then(function () {
            showToast('Estimation saved — not added to your own profile ✓');
            setTimeout(function () {
              window.location.href =
                '/estimations?id=' + encodeURIComponent(window._estimationId);
            }, 1200);
          })
          .catch(function (e) {
            console.error('Estimation save:', e);
            showToast('Could not save estimation. Try Save again.');
          });
      }

      var activeQ = window._activeQ || Q;
      var choiceIx = _choiceIx ? _choiceIx.slice() : [];
      var answersCopy = answers ? answers.slice() : [];

      setCloudSaveUi('pending');

      return submitAuthoritative().then(function (srv) {
        if (srv && srv.mbti) {
          snapshot.mbti = srv.mbti;
          snapshot.polX = srv.polX;
          snapshot.polY = srv.polY;
          snapshot.cog = srv.cog || snapshot.cog;
          snapshot.att = srv.att || snapshot.att;
          snapshot.phi = srv.phi || snapshot.phi;
          snapshot.bankVersion = srv.bankVersion;
          snapshot.scoringVersion = srv.scoringVersion;
          snapshot.serverScored = true;
          if (srv.ennType) snapshot.ennType = srv.ennType;
          if (srv.ennWing) snapshot.ennWing = srv.ennWing;
        }
        return AnimusShared.saveProfileToFirestore(user.uid, snapshot, {
        rawData: data,
        testMode: meta.testMode,
        answerCount: meta.answerCount,
        completedAt: meta.completedAt
      })
        .then(function () {
          onCloudSaved();
          if (AnimusShared.saveTestSessionToFirestore) {
            AnimusShared.saveTestSessionToFirestore(user.uid, {
              activeQ: activeQ,
              answers: answersCopy,
              choiceIx: choiceIx,
              testMode: meta.testMode,
              completedAt: meta.completedAt,
              resultSummary: {
                mbti: snapshot.mbti,
                ennType: snapshot.ennType,
                ennWing: snapshot.ennWing,
                ennTritype: snapshot.ennTritype,
                att: snapshot.att,
                phi: snapshot.phi,
                polX: snapshot.polX,
                polY: snapshot.polY
              }
            }).catch(function (e) {
              console.warn('Test session save:', e);
            });
          }
          if (typeof AnimusXp !== 'undefined' && user) {
            var xpReason = observerMode ? 'estimator_complete' : 'test_complete';
            AnimusXp.awardXp(firebase.firestore(), user.uid, xpReason).catch(function (e) {
              console.warn('XP award:', e);
            });
          }
          if (AnimusShared.clearTestDraftFromFirestore) {
            AnimusShared.clearTestDraftFromFirestore(user.uid, meta.testMode).catch(function () {});
          }
          try {
            clearTestProgress(meta.testMode);
          } catch (e) {}
        })
        .catch(function (e) {
          onCloudSaveFailed(e);
          if (AnimusShared.markPendingCloudResult) {
            AnimusShared.markPendingCloudResult(user.uid, snapshot);
          }
          if (typeof AnimusShared !== 'undefined' && AnimusShared.trySyncLocalResultToFirestore) {
            return AnimusShared.trySyncLocalResultToFirestore(user).then(function (synced) {
              if (synced) onCloudSaved();
              return synced;
            });
          }
          return false;
        });
      });
    }

    function runCloudSave(user, attempt) {
      attempt = attempt || 0;
      return doSave(user).catch(function (e) {
        if (attempt >= 2 || observerMode) throw e;
        var prep =
          typeof AnimusShared !== 'undefined' && AnimusShared.prepareUserForProfileSave
            ? AnimusShared.prepareUserForProfileSave(user)
            : Promise.resolve(user);
        return prep
          .then(function () {
            return new Promise(function (r) {
              setTimeout(r, 500 + attempt * 500);
            });
          })
          .then(function () {
            return runCloudSave(user, attempt + 1);
          });
      });
    }

    var cur =
      typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser
        ? firebase.auth().currentUser
        : null;
    if (cur) {
      runCloudSave(cur);
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
      var unsub = firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          try {
            unsub();
          } catch (e) {}
          runCloudSave(user);
        }
      });
      setTimeout(function () {
        try {
          unsub();
        } catch (e) {}
        if (!window.__animusCloudSaveOk) {
          setCloudSaveUi('error');
          showToast('Sign in to save your results to the cloud, then tap Save to Cloud.');
        }
      }, 12000);
    } else {
      setCloudSaveUi('error');
      showToast('Sign in to save your results to your profile.');
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
    +'<div class="chip"><strong>Type</strong>'+mbti+'</div>'
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
    +'<div class="stat-cell"><span class="stat-big">'+mbti+'</span><span class="stat-lbl">Cognitive type</span></div>'
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
    +'<h2>Political spectrum</h2>'
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
  setTestPhase('compare');
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
    +'<div class="compare-row"><span class="compare-lbl">Temperament</span><span class="compare-val">'+(you.keirsey||'—')+'</span></div>'
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
    +'<div class="compare-row"><span class="compare-lbl">Temperament</span><span class="compare-val">'+(them.keirsey||'—')+'</span></div>'
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
    setTestPhase('results');
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
      ['intro','quiz','loading','results','compare'].forEach(function(p){
        document.body.classList.remove('phase-' + p);
      });
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
        setTestPhase('quiz');
        renderQ();
      });
    } catch(e){
      // Bad hash, just load normally
      setTestPhase('intro');
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
        cogNarrative:sanitizeText(ai.cogNarrative,4000)||'',ennNarrative:sanitizeText(ai.ennNarrative,4000)||'',
        attNarrative:sanitizeText(ai.attNarrative,4000)||'',phiNarrative:sanitizeText(ai.phiNarrative,4000)||'',
        politicalNarrative:sanitizeText(ai.politicalNarrative,4000)||'',
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
    loadSavedTestMode: loadSavedTestMode,
    switchTestMode: switchTestMode,
    refreshIntroModeUI: refreshIntroModeUI,
    loadIntroEntitlements: loadIntroEntitlements,
    canSelectTestMode: canSelectTestMode,
    hasDetailedEntitlement: hasDetailedEntitlement,
    readProgressForMode: readProgressForMode
  };
  function syncIntro() {
    try {
      migrateLegacyProgress();
      setTestMode(loadSavedTestMode());
      refreshIntroModeUI(_introUserData);
      loadIntroEntitlements();
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function (user) {
          if (user) loadIntroEntitlements();
          else {
            _introUserData = null;
            _introEntitlementsLoaded = true;
            refreshIntroModeUI(null);
          }
        });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') refreshCloudDrafts();
      });
    } catch (e) {}
    if (g.AnimusIntro && g.AnimusIntro.onEngineReady) g.AnimusIntro.onEngineReady();
  }
  window.addEventListener('pagehide', function () {
    clearTimeout(_serverDraftSaveTimer);
    var payload = buildProgressPayload();
    if (payload) writeProgressToSession(testMode, payload);
    flushServerDraftSave(payload);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncIntro);
  else syncIntro();
})(window);
