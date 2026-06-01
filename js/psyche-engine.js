/* ANIMUS — test engine (scoring, quiz UI, results, save) */
(function (g) {
  'use strict';
  var Q = g.AnimusQuestions.Q;
  var ES = g.AnimusQuestions.ES;


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

// ── LANGUAGE ──
var _rawLang = localStorage.getItem('animus_lang'); var lang = (_rawLang==='es') ? 'es' : 'en';

// Language now set via settings page (localStorage)

// Auto-apply language on load
(function(){
  if(lang === 'es') updateIntroLang();
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
  try {
    sessionStorage.setItem(AnimusShared.KEYS.testProgress, JSON.stringify({
      testMode: testMode,
      cur: cur,
      total: TOTAL,
      answers: answers,
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
  buildActiveQuestionSet();
  if(data.answers.length === TOTAL){
    answers = data.answers.slice();
    cur = Math.min(data.cur, TOTAL - 1);
    document.getElementById('intro').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    if(observerMode && observerSubjectName){
      document.querySelector('.qhdr-logo').innerHTML = 'ANIMUS <span style="font-size:12px;color:var(--accent2);letter-spacing:0.1em">ESTIMATOR</span>';
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

// Short test allocation — 100 questions spread across all 14 dimensions
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
};;

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
  try { 
    var decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    // Validate it has at least the minimum expected shape
    if(typeof decoded !== 'object' || !decoded.mbti) return null;
    return decoded;
  }
  catch(e){ return null; }
}

document.getElementById('importBtn').addEventListener('click', function(){ doImport(); });
document.getElementById('importInput').addEventListener('keydown', function(e){ if(e.key==='Enter') doImport(); });

function doImport(){
  var raw = document.getElementById('importInput').value;
  var errEl = document.getElementById('importError');
  errEl.textContent = '';
  if(!raw.trim()){ errEl.textContent = 'Paste a profile link first.'; return; }
  var profile = parseProfileLink(raw);
  if(!profile || !profile.mbti){ errEl.textContent = 'Invalid link — could not read profile data.'; return; }

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
        document.getElementById('importInput').value='';
        document.getElementById('importError').textContent='';
      });
      document.getElementById('btnPDFImport').addEventListener('click', function(){
        downloadPDF(profile, syntheticData, profile.mbti, syntheticEnn,
          profile.att||'AT_AVO', profile.phi||'PH_NIE', profile.instStack||'', syntheticAI);
      });
    }
  }, 200);
}

// ── FILL GAPS ──
document.getElementById('fillBtn').addEventListener('click', function(){ doFillGaps(); });
document.getElementById('fillInput').addEventListener('keydown', function(e){ if(e.key==='Enter') doFillGaps(); });

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
  // Update header to show observer mode
  document.querySelector('.qhdr-logo').innerHTML = 'ANIMUS <span style="font-size:12px;color:var(--accent2);letter-spacing:0.1em">ESTIMATOR</span>';
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

function doFillGaps(){
  var raw = document.getElementById('fillInput').value;
  var errEl = document.getElementById('fillError');
  errEl.textContent = '';
  if(!raw.trim()){ errEl.textContent = 'Paste a profile link first.'; return; }
  var profile = parseProfileLink(raw);
  if(!profile || !profile.mbti){ errEl.textContent = 'Invalid link — could not read profile data.'; return; }

  // Detect which dimensions need filling
  var dims = Object.keys(DIM_FNS);
  var missingDims = dims.filter(function(d){ return isDimMissing(profile, d); });

  if(missingDims.length === 0){
    errEl.textContent = 'Profile looks complete — use VIEW instead.';
    return;
  }

  // Build filtered question set — only questions for missing dimensions
  var missingFns = [];
  missingDims.forEach(function(d){ missingFns = missingFns.concat(DIM_FNS[d]); });

  var filteredQ = Q.filter(function(q){ return missingFns.indexOf(q.fn) > -1; });

  // Shuffle filtered questions
  shuffle(filteredQ);

  // Store the base profile so we can merge after
  window._baseProfile = profile;
  window._fillQ = filteredQ;

  // Replace Q temporarily with filtered set
  window._fullQ = Q;
  // We'll run a mini quiz using the filtered set
  runFillQuiz(filteredQ, profile, missingDims);
}

function runFillQuiz(filteredQ, baseProfile, missingDims){
  var fillAnswers = new Array(filteredQ.length).fill(null);
  var fillCur = 0;

  document.getElementById('intro').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';

  // Update header
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
    q.choices.forEach(function(c){
      var sel = answers[cur]===c.s ? ' selected' : '';
      h += '<button class="mc-choice'+sel+'" data-v="'+c.s+'">'
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
  var w=[4,3,2,1], best=null, bestScore=-Infinity;
  Object.keys(stacks).forEach(function(type){
    var s=0; stacks[type].forEach(function(fn,i){ s+=(cog[fn]||0)*w[i]; });
    if(s>bestScore){ bestScore=s; best=type; }
  });
  return best||'INTP';
}

// ── HELPER: Derive Enneagram type/wing/tritype from scores ──
function getEnneagram(eS){
  var nums=['E1','E2','E3','E4','E5','E6','E7','E8','E9'];
  var type=nums.reduce(function(a,b){ return (eS[a]||0)>(eS[b]||0)?a:b; },nums[0]).replace('E','');
  var t=parseInt(type);
  var wL=t===1?9:t-1, wR=t===9?1:t+1;
  var wing=(eS['E'+wL]||0)>(eS['E'+wR]||0)?String(wL):String(wR);
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

function score(){
  // Returns a full data object with all dimension scores + derived types
  function avg(fn){
    var sum=0,cnt=0;
    (window._activeQ||Q).forEach(function(q,i){
      if(q.fn===fn){
        var raw=answers[i];
        if(raw===null||raw===undefined) return;
        // MC: raw is already 1-7 score; Likert: same format
        sum+=(raw-1)/6*100; cnt++;
      }
    });
    return cnt ? Math.round(sum/cnt) : 50;
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
    +'IMPORTANT: Base ALL analysis on the actual scores above. Do NOT default to INTJ assumptions. '
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

// ── FALLBACK NARRATIVE ──
var mbtiMeta={
  INTJ:{n:'The Strategic Visionary',t:'A mind built to see through the noise and reshape reality according to an internal standard nothing outside can compromise.'},
  INTP:{n:'The Analytical Architect',t:'A pure thinking engine that will not rest until every assumption has been examined and every model refined to precision.'},
  ENTJ:{n:'The Commanding Strategist',t:'A natural force of organization and will — you move systems, people, and history toward clearly defined ends.'},
  ENTP:{n:'The Dialectical Provocateur',t:'A restless intellect that finds certainty suspicious and contradiction generative.'},
  INFJ:{n:'The Prophetic Empath',t:'A rare synthesis of deep human understanding and long-range symbolic vision.'},
  INFP:{n:'The Idealistic Visionary',t:'An ocean of inner life governed by values so deep they feel less like beliefs and more like identity.'},
  ENFJ:{n:'The Transformative Catalyst',t:'A natural conductor of human potential — you read people, inspire them, and move them toward a better version of themselves.'},
  ENFP:{n:'The Radically Human',t:'Boundless curiosity, genuine warmth, and a refusal to accept that life is less alive than you know it can be.'},
  ISTJ:{n:'The Reliable Pillar',t:'The quiet architecture of civilization — you build, maintain, and uphold with unshakeable consistency.'},
  ISFJ:{n:'The Devoted Protector',t:'Your greatest strength is invisible to those it protects — and that is exactly how you prefer it.'},
  ESTJ:{n:'The Structural Authority',t:'You are most yourself when order is being built, standards are being upheld, and people are being held accountable.'},
  ESFJ:{n:'The Social Architect',t:'You build and maintain the relational fabric that holds communities together.'},
  ISTP:{n:'The Tactical Craftsman',t:'Cool precision, mastery in motion, and an aversion to anything that cannot be made to work.'},
  ISFP:{n:'The Quiet Composer',t:'A deeply private aesthetic and moral intelligence that rarely announces itself but permeates everything you create.'},
  ESTP:{n:'The Electric Operator',t:'Fully alive in the immediate moment — tactical, bold, and impossible to ignore.'},
  ESFP:{n:'The Radiant Presence',t:'You bring a quality of aliveness to every space you inhabit.'}
};

function buildFallbackNarrative(mbti,enn,att,phi,data){
  var mm = mbtiMeta[mbti] || {n:'The Unknown Archetype', t:'A unique configuration of mind and motivation that defies easy categorization.'};
  var fnsSorted = Object.keys(data.cog).sort(function(a,b){return data.cog[b]-data.cog[a];});
  var dom = fnsSorted[0] || 'Ti';
  var aux = fnsSorted[1] || 'Ni';

  // Cognitive narrative — based on actual dominant function
  var cogDesc = {
    'Ni': 'operates through long-range pattern recognition — you see trajectories and convergent meanings that others miss, and your thinking moves toward singular deep insights rather than broad exploration.',
    'Ne': 'operates through expansive possibility mapping — your mind constantly generates connections, alternatives, and hypotheticals, finding energy in the sheer generative range of ideas.',
    'Ti': 'operates through internal logical frameworks — you build precise models of how things work, holding everything to a standard of internal consistency that external authority cannot override.',
    'Te': 'operates through external systematization — you think in terms of efficiency, structure, and measurable results, and you naturally organize the world toward functional outcomes.',
    'Fi': 'operates through deep individual values — you have a rich interior moral compass that evaluates everything against principles felt as identity, not just as rules.',
    'Fe': 'operates through interpersonal harmony — you are attuned to the emotional atmosphere of groups and relationships, and naturally orient toward what people need.',
    'Si': 'operates through detailed sensory memory and established procedure — you build reliable frameworks from accumulated experience and find security in what has proven to work.',
    'Se': 'operates through immediate sensory engagement — you are fully present to physical reality and respond to it with speed and precision that others often cannot match.'
  };
  var cogNarr = 'Your dominant function, '+dom+', '+(cogDesc[dom]||'shapes your entire cognitive architecture.')+'\n\nYour auxiliary function, '+aux+', '+(cogDesc[aux]||'provides crucial support.')+' Together these two functions create a characteristic way of engaging with problems, people, and ideas that others around you likely recognize as distinctly yours.';

  // Social/alone — based on E/I
  var isIntro = 'INFJ,INTJ,INFP,INTP,ISFJ,ISTJ,ISFP,ISTP'.indexOf(mbti) >= 0;
  var isFeel  = 'Fe,Fi'.indexOf(dom) >= 0 || 'Fe,Fi'.indexOf(aux) >= 0;
  var aloneD  = isIntro
    ? 'In solitude you restore and clarify — your richest thinking happens in stillness, away from the noise of others\' demands and expectations. This is where your most essential self operates without filter.'
    : 'Even as an extravert, you need pockets of solitude to process and integrate — the stimulation of the social world energizes you but reflection is where you make sense of what you have gathered.';
  var socialD = isIntro
    ? 'To others you often appear more reserved than you feel internally. You are selective about where you invest social energy, which can create an impression of distance that masks considerable depth and genuine warmth on your own terms.'
    : 'You engage the social world with natural ease — your energy tends to draw others in and you find genuine stimulation in human contact. But you also have an inner life that the social face does not fully reveal.';
  var shadowD = 'Your greatest strengths cast specific shadows. '+dom+' dominance means that your '+(dom==='Ni'?'certainty in your own vision can make you dismissive of information that does not fit your internal model':dom==='Ne'?'generative range can make follow-through and sustained commitment genuinely difficult':dom==='Ti'?'rigorous internal logic can disconnect you from the emotional intelligence that human relationships require':dom==='Te'?'drive for efficiency can override sensitivity to the human costs of optimization':dom==='Fi'?'depth of individual values can create a moral certainty that is difficult for others to engage with':dom==='Fe'?'orientation toward others\' needs can suppress your own until they resurface in unpredictable ways':dom==='Si'?'reliance on established frameworks can create resistance to change even when change is clearly necessary':'orientation toward immediate experience can make long-term strategic thinking genuinely effortful')+'.';

  // Figures — based on MBTI type
  var figsByType = {
    'INTJ':[{name:'Friedrich Nietzsche',cat:'Historical',type:'INTJ 5w4',initials:'FN',note:'Lone visionary who built philosophy entirely from first principles.'},{name:'Isaac Newton',cat:'Historical',type:'INTJ 5w6',initials:'IN',note:'Systematizing genius who reshaped understanding of reality in solitude.'},{name:'Elon Musk',cat:'Celebrity',type:'INTJ 3w4',initials:'EM',note:'Visionary builder who uses strategic dominance to reshape industries.'},{name:'Walter White',cat:'Pop Culture',type:'INTJ 3w4',initials:'WW',note:'Shadow expression of strategic intelligence divorced from ethics.'},{name:'Batman',cat:'Pop Culture',type:'INTJ 5w6',initials:'Bm',note:'Lone, principled, strategic force operating from a private moral code.'},{name:'Hannibal Lecter',cat:'Pop Culture',type:'INTJ 5w4',initials:'HL',note:'Extreme Ti/Ni intelligence structured around aesthetic mastery.'},{name:'Carl Jung',cat:'Historical',type:'INTJ 5w4',initials:'CJ',note:'Built a complete psychological system from the inside out.'},{name:'Ayn Rand',cat:'Historical',type:'INTJ 1w2',initials:'AR',note:'Constructed a total philosophical system from rational first principles.'}],
    'INTP':[{name:'Albert Einstein',cat:'Historical',type:'INTP 5w4',initials:'AE',note:'Built revolutionary physical models by questioning foundational assumptions.'},{name:'Charles Darwin',cat:'Historical',type:'INTP 5w6',initials:'CD',note:'Constructed the framework of evolution through patient systematic observation.'},{name:'Immanuel Kant',cat:'Historical',type:'INTP 5w6',initials:'IK',note:'Built the most rigorous formal system in the history of Western philosophy.'},{name:'House (MD)',cat:'Pop Culture',type:'INTP 5w4',initials:'HM',note:'Ti-dominant diagnostician who treats logic as the highest value.'},{name:'Sherlock Holmes',cat:'Pop Culture',type:'INTP 5w6',initials:'SH',note:'Pure analytical engine who solves through systematic deduction.'},{name:'L (Death Note)',cat:'Pop Culture',type:'INTP 5w4',initials:'L',note:'Hyper-analytical detective who operates entirely from logical inference.'},{name:'Blaise Pascal',cat:'Historical',type:'INTP 5w6',initials:'BP',note:'Combined mathematical genius with deep philosophical uncertainty.'},{name:'Kurt Gödel',cat:'Historical',type:'INTP 5w4',initials:'KG',note:'Proved the limits of formal systems from within them.'}],
    'ENTJ':[{name:'Napoleon Bonaparte',cat:'Historical',type:'ENTJ 8w7',initials:'NB',note:'Systemic military genius who restructured entire nations by force of will.'},{name:'Julius Caesar',cat:'Historical',type:'ENTJ 3w4',initials:'JC',note:'Combined political acumen, military genius, and personal charisma into dominance.'},{name:'Steve Jobs',cat:'Celebrity',type:'ENTJ 1w2',initials:'SJ',note:'Visionary commander who reshaped multiple industries through strategic force.'},{name:'Frank Underwood',cat:'Pop Culture',type:'ENTJ 3w4',initials:'FU',note:'The shadow expression of strategic dominance and ruthless instrumentalism.'},{name:'Tywin Lannister',cat:'Pop Culture',type:'ENTJ 1w9',initials:'TL',note:'Master strategist who bends institutions to serve his long-term vision.'},{name:'Margaret Thatcher',cat:'Historical',type:'ENTJ 1w2',initials:'MT',note:'Commanding ideological force who remade British economic policy.'},{name:'Gordon Ramsay',cat:'Celebrity',type:'ENTJ 8w7',initials:'GR',note:'High-standards commander who drives excellence through demanding leadership.'},{name:'Jack Welch',cat:'Historical',type:'ENTJ 3w4',initials:'JW',note:'Te-dominant CEO who systematized GE into a performance machine.'}],
    'ENTP':[{name:'Leonardo da Vinci',cat:'Historical',type:'ENTP 7w6',initials:'LD',note:'Polymathic generator who moved fluidly across every domain of knowledge.'},{name:'Voltaire',cat:'Historical',type:'ENTP 7w8',initials:'Vo',note:'Provocateur who used wit and contradiction to dismantle orthodoxy.'},{name:'Robert Downey Jr.',cat:'Celebrity',type:'ENTP 7w8',initials:'RD',note:'Irreverent performer who improvises brilliantly within and around structure.'},{name:'Tony Stark',cat:'Pop Culture',type:'ENTP 3w4',initials:'TS',note:'Ne/Ti inventor-provocateur who constantly reframes problems as opportunities.'},{name:'The Joker (Ledger)',cat:'Pop Culture',type:'ENTP 7w8',initials:'JK',note:'Shadow expression: using contradiction and chaos as philosophical positions.'},{name:'Socrates',cat:'Historical',type:'ENTP 5w6',initials:'So',note:'The original dialectician — pursuing truth through relentless questioning.'},{name:'Benjamin Franklin',cat:'Historical',type:'ENTP 7w6',initials:'BF',note:'Polymathic inventor-diplomat who applied ingenuity to every domain.'},{name:'Mark Twain',cat:'Historical',type:'ENTP 7w8',initials:'MT',note:'Satirist who used humor to deliver devastating social critique.'}],
    'INFJ':[{name:'Carl Jung',cat:'Historical',type:'INFJ 4w5',initials:'CJ',note:'Mapped the depths of the unconscious through symbolic pattern recognition.'},{name:'Mahatma Gandhi',cat:'Historical',type:'INFJ 1w2',initials:'MG',note:'Channeled Ni/Fe into a vision of nonviolent transformation that changed history.'},{name:'Nelson Mandela',cat:'Historical',type:'INFJ 8w9',initials:'NM',note:'Long-range vision combined with strategic patience and moral authority.'},{name:'Atticus Finch',cat:'Pop Culture',type:'INFJ 1w2',initials:'AF',note:'The moral compass in human form — principled, warm, deeply visionary.'},{name:'Yoda',cat:'Pop Culture',type:'INFJ 5w4',initials:'Yo',note:'The archetypal Ni/Fe sage: sees patterns others miss and teaches through relationship.'},{name:'Martin Luther King Jr.',cat:'Historical',type:'INFJ 2w1',initials:'ML',note:'Synthesized prophetic vision and interpersonal warmth into transformative moral leadership.'},{name:'Dostoevsky',cat:'Historical',type:'INFJ 4w5',initials:'FD',note:'Explored the deepest recesses of human psychology through visionary fiction.'},{name:'Tolkien',cat:'Historical',type:'INFJ 5w4',initials:'JT',note:'Created entire worlds from a singular integrated mythological vision.'}],
    'INFP':[{name:'J.R.R. Tolkien',cat:'Historical',type:'INFP 4w5',initials:'JT',note:'Created Middle-earth from a deeply personal interior mythology.'},{name:'Virginia Woolf',cat:'Historical',type:'INFP 4w5',initials:'VW',note:'Stream-of-consciousness pioneer who made inner life the subject of art.'},{name:'Albert Camus',cat:'Historical',type:'INFP 4w5',initials:'AC',note:'Existentialist who combined philosophical depth with profound human warmth.'},{name:'Frodo Baggins',cat:'Pop Culture',type:'INFP 9w1',initials:'FB',note:'The reluctant hero whose internal moral clarity carries him through impossible terrain.'},{name:'Anne Frank',cat:'Historical',type:'INFP 4w3',initials:'AF',note:'Preserved profound interiority and human hope under the most crushing conditions.'},{name:'Sylvia Plath',cat:'Historical',type:'INFP 4w5',initials:'SP',note:'Gave voice to the inner world with devastating precision and unflinching honesty.'},{name:'William Shakespeare',cat:'Historical',type:'INFP 4w5',initials:'WS',note:'Explored the full range of human interiority through character and language.'},{name:'Vincent van Gogh',cat:'Historical',type:'INFP 4w5',initials:'VG',note:'Channeled intense personal vision into art that reshaped how humans see color.'}],
    'ENFJ':[{name:'Martin Luther King Jr.',cat:'Historical',type:'ENFJ 2w1',initials:'ML',note:'Fe-dominant leader who moved masses through moral vision and interpersonal warmth.'},{name:'Oprah Winfrey',cat:'Celebrity',type:'ENFJ 2w3',initials:'OW',note:'Natural catalyst for human growth who builds authentic connection at scale.'},{name:'Barack Obama',cat:'Historical',type:'ENFJ 3w2',initials:'BO',note:'Aspirational leader who inspires through vision, narrative, and interpersonal mastery.'},{name:'Michael Scott',cat:'Pop Culture',type:'ENFJ 2w3',initials:'MS',note:'Fe in overdrive — desperately wants connection and approval from his "family".'},{name:'Emma Woodhouse',cat:'Pop Culture',type:'ENFJ 3w2',initials:'EW',note:'Fe-dominant social orchestrator who means well but over-manages others lives.'},{name:'Nelson Mandela',cat:'Historical',type:'ENFJ 1w2',initials:'NM',note:'Used relational mastery and moral authority to reconcile a divided nation.'},{name:'Tony Robbins',cat:'Celebrity',type:'ENFJ 3w2',initials:'TR',note:'Peak-state catalyst who transforms audiences through emotional mobilization.'},{name:'Morpheus',cat:'Pop Culture',type:'ENFJ 1w2',initials:'Mo',note:'The archetypal mentor-catalyst who sees potential and calls it forth.'}],
    'ENFP':[{name:'Robin Williams',cat:'Celebrity',type:'ENFP 7w6',initials:'RW',note:'Ne/Fi in full expression — boundless creative range channeled through deep human warmth.'},{name:'Walt Disney',cat:'Historical',type:'ENFP 7w6',initials:'WD',note:'Visionary world-builder who created entirely new imaginative territories.'},{name:'Mark Twain',cat:'Historical',type:'ENFP 7w8',initials:'MT',note:'Restless adventurer whose warmth and wit captured the full range of American experience.'},{name:'Anne of Green Gables',cat:'Pop Culture',type:'ENFP 4w3',initials:'AG',note:'Ne/Fi archetype: imagination, warmth, and authentic self-expression against convention.'},{name:'Pippi Longstocking',cat:'Pop Culture',type:'ENFP 7w8',initials:'PL',note:'Joyful anarchist who refuses social constraint and lives entirely on her own terms.'},{name:'Carl Rogers',cat:'Historical',type:'ENFP 2w1',initials:'CR',note:'Founded person-centered therapy — the belief that human potential unfolds in genuine warmth.'},{name:'Ellen DeGeneres',cat:'Celebrity',type:'ENFP 7w6',initials:'ED',note:'Authentic entertainer who built connection through genuine warmth and irreverent humor.'},{name:'Elizabeth Bennet',cat:'Pop Culture',type:'ENFP 3w4',initials:'EB',note:'Witty, independent, emotionally perceptive — refuses to perform for social approval.'}]
  };

  // Default figures for types not in the map
  var defaultFigs = [
    {name:'Socrates',cat:'Historical',type:'Unknown',initials:'So',note:'Relentless questioner who pursued truth through dialogue and self-examination.'},
    {name:'Marcus Aurelius',cat:'Historical',type:'ISTJ 1w9',initials:'MA',note:'Philosopher-emperor who practiced disciplined self-governance under enormous pressure.'},
    {name:'Marie Curie',cat:'Historical',type:'INTJ 5w4',initials:'MC',note:'Pioneer scientist who combined systematic rigor with extraordinary personal determination.'},
    {name:'Atticus Finch',cat:'Pop Culture',type:'INFJ 1w2',initials:'AF',note:'The moral compass — principled, fair, and deeply committed to human dignity.'},
    {name:'Sherlock Holmes',cat:'Pop Culture',type:'INTP 5w6',initials:'SH',note:'Analytical detective who cuts through noise to essential truth.'},
    {name:'Tolkien',cat:'Historical',type:'INFJ 5w4',initials:'JT',note:'Visionary world-builder who created from a singular integrated imagination.'},
    {name:'Albert Camus',cat:'Historical',type:'INFP 4w5',initials:'AC',note:'Existentialist who combined philosophical seriousness with profound human warmth.'},
    {name:'Hannah Arendt',cat:'Historical',type:'INTP 5w6',initials:'HA',note:'Political philosopher who analyzed power, freedom, and human action with rare precision.'}
  ];

  var figures = figsByType[mbti] || defaultFigs;

  // Values — based on type
  var valuesByType = {
    'INTJ':['Intellectual Mastery','Autonomy','Strategic Excellence','Authentic Vision','Moral Integrity','Independence'],
    'INTP':['Logical Precision','Theoretical Depth','Intellectual Freedom','Epistemic Honesty','Originality','Competence'],
    'ENTJ':['Strategic Power','Organizational Excellence','Results','Leadership','Competence','Decisive Action'],
    'ENTP':['Intellectual Stimulation','Creative Freedom','Originality','Debate','Conceptual Range','Autonomy'],
    'INFJ':['Deep Meaning','Human Flourishing','Authenticity','Visionary Purpose','Integrity','Connection'],
    'INFP':['Authentic Self','Creative Expression','Deep Values','Moral Purity','Idealism','Inner Freedom'],
    'ENFJ':['Human Growth','Relational Depth','Shared Vision','Service','Authenticity','Community'],
    'ENFP':['Authentic Connection','Creative Freedom','Human Potential','Enthusiasm','Personal Growth','Meaning'],
    'ISTJ':['Duty','Reliability','Order','Competence','Tradition','Integrity'],
    'ISFJ':['Care','Devotion','Security','Community','Loyalty','Service'],
    'ESTJ':['Order','Standards','Results','Leadership','Accountability','Tradition'],
    'ESFJ':['Harmony','Care','Community','Belonging','Loyalty','Service'],
    'ISTP':['Mastery','Efficiency','Independence','Precision','Freedom','Pragmatism'],
    'ISFP':['Aesthetic Truth','Authentic Expression','Freedom','Compassion','Present Moment','Individual Integrity'],
    'ESTP':['Action','Impact','Skill','Freedom','Challenge','Boldness'],
    'ESFP':['Joy','Connection','Present Experience','Warmth','Creative Expression','Authenticity']
  };
  var values = valuesByType[mbti] || ['Authenticity','Excellence','Freedom','Depth','Growth','Integrity'];

  // Big5 — derived from actual cog scores
  var big5 = {
    Openness:        Math.round(data.cog['Ne']*0.35 + data.cog['Ni']*0.35 + data.cog['Ti']*0.15 + data.cog['Fi']*0.15),
    Conscientiousness:Math.round(data.cog['Te']*0.35 + data.cog['Si']*0.35 + data.cog['Fi']*0.15 + data.cog['Ni']*0.15),
    Extraversion:    Math.round(data.cog['Se']*0.3  + data.cog['Fe']*0.35 + data.cog['Ne']*0.35),
    Agreeableness:   Math.round(data.cog['Fe']*0.45 + data.cog['Fi']*0.3  + data.cog['Si']*0.25),
    Neuroticism:     Math.round((100-data.cog['Te'])*0.25 + (100-data.cog['Ti'])*0.25 + data.cog['Fi']*0.25 + (100-data.cog['Si'])*0.25)
  };

  var polX = data.polX||0, polY = data.polY||0;
  var polQuad = polX>0&&polY<0?'lib-right':polX>0&&polY>0?'auth-right':polX<0&&polY<0?'lib-left':'auth-left';
  var polNarr = {
    'lib-right':'Your economic and social positions combine to place you in the libertarian-right quadrant — favoring market freedom while skeptical of state authority over personal life.',
    'auth-right':'You combine market-oriented economics with a preference for social order, tradition, and strong institutions — a conservative synthesis that values both economic freedom and social cohesion.',
    'lib-left':'You combine economic progressivism with strong civil libertarianism — skeptical of both state power and concentrated private power, standing in the left-libertarian tradition.',
    'auth-left':'You favor collective economic management with strong institutional authority to enforce it — standing in the social democratic or democratic socialist tradition.'
  };
  var polIdeology = (polX>50&&polY<-30)?'Paleolibertarian / Classical Liberal':(polX>30&&polY<-10)?'Classical Liberal / Libertarian':(polX>10&&polY<-5)?'Centre-Right / Fusionist':(polX>30&&polY>20)?'National Conservative':(polX>10&&polY>10)?'Neoconservative':(polX<-50&&polY<-20)?'Left-Libertarian / Libertarian Socialist':(polX<-30&&polY<-10)?'Progressive Libertarian':(polX<-50&&polY>20)?'Democratic Socialist / Marxist':(polX<-20&&polY>10)?'Social Democrat':(polX<-10)?'Centre-Left':(polX>10)?'Centre-Right':'Centrist';

  var socionicsByMBTI = {INTJ:'LII',INTP:'ILI',ENTJ:'LSE',ENTP:'ILE',INFJ:'EII',INFP:'IEI',ENFJ:'ESE',ENFP:'IEE',ISTJ:'LSI',ISFJ:'ESI',ESTJ:'SLE',ESFJ:'SEE',ISTP:'SLI',ISFP:'SEI',ESTP:'LSE',ESFP:'SEE'};
  var keirseyByMBTI = {INTJ:'Rational',INTP:'Rational',ENTJ:'Rational',ENTP:'Rational',INFJ:'Idealist',INFP:'Idealist',ENFJ:'Idealist',ENFP:'Idealist',ISTJ:'Guardian',ISFJ:'Guardian',ESTJ:'Guardian',ESFJ:'Guardian',ISTP:'Artisan',ISFP:'Artisan',ESTP:'Artisan',ESFP:'Artisan'};

  return {
    mbtiName: mm.n,
    tagline: mm.t,
    cogNarrative: cogNarr,
    ennNarrative: 'Type '+enn.type+' is driven by a core fear and desire that shapes every major life decision, even when invisible. The '+enn.type+'w'+enn.wing+' wing configuration adds specific texture to how this motivation expresses itself.\n\nYour tritype of '+enn.tritype+' reflects how your head, heart, and gut centers each operate with their own characteristic pattern. This three-number code gives a more complete picture of motivation than the single type alone.',
    attNarrative: 'Your attachment pattern shapes how you seek and experience closeness — the invisible architecture that determines what feels safe, what feels threatening, and what you do when vulnerability is required.',
    phiNarrative: 'Your philosophical alignment toward '+phi.replace('PH_','')+' reflects a structural orientation that goes beyond intellectual preference — it shapes how you interpret knowledge, ethics, and the nature of reality.',
    aloneDesc: aloneD,
    socialDesc: socialD,
    shadowDesc: shadowD,
    figures: figures,
    values: values,
    big5: big5,
    politicalNarrative: polNarr[polQuad]+' Your political position at X='+polX+' Y='+polY+' reflects both your direct answers to political questions and the underlying value structure your personality has developed.',
    politicalIdeology: polIdeology,
    politicalIdeologyDesc: 'This position reflects a specific tradition with its own intellectual history, strengths, and genuine blind spots. Explore the political tab for a full analysis.',
    politicalStrengths: 'This position has genuine intellectual coherence and real historical achievements. Its strongest moments tend to come when it operates within its core assumptions about human nature and the proper role of institutions.',
    politicalWeaknesses: 'Every political position has blind spots that become visible under pressure. This position is most vulnerable when its foundational assumptions about human nature or institutional behavior prove incorrect in specific contexts.',
    politicalThinkers: ['Key thinkers in this tradition have shaped its most coherent arguments. See the political tab for personalized recommendations based on your exact profile.'],
    similarCountries: ['Country analysis requires full AI processing — take the test and save results to see personalized comparisons.'],
    similarPoliticians: ['Politician comparisons require full AI processing — take the test and save results to see personalized matches.'],
    similarParties: ['Party comparisons require full AI processing — take the test and save results.'],
    socionics: socionicsByMBTI[mbti] || '—',
    keirsey: keirseyByMBTI[mbti] || 'Rational'
  };
}
// ── RENDER RESULTS ──
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
    +(Array.isArray(ai.values)?ai.values.map(function(v){return '<div class="value-tag"><div class="value-dot"></div>'+v+'</div>';}).join(''):'')
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
        +'<div><div style="font-size:12px;color:var(--text);font-weight:500;margin-bottom:1px">'+label+'</div>'
        +(desc?'<div style="font-size:11px;color:var(--muted2);line-height:1.7">'+desc+'</div>':'')
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
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.soc.dom)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.dom)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Introversion</strong><span>Inward orientation</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.soc.introvert)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.introvert)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Warmth</strong><span>Openness to others</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.soc.warmth)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.warmth)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Directness</strong><span>Communication style</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.soc.direct)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.soc.direct)+'</div></div>'
    +'</div>'

    +'<div class="card" style="margin-top:12px"><div class="card-title">Alone Self</div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Intellectual</strong><span>Inner analytical drive</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill" style="width:0%" data-w="'+Math.max(5,data.alone.intellectual)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.alone.intellectual)+'</div></div>'
    +'<div class="bar-row"><div class="bar-label"><strong>Sensitive</strong><span>Private emotional depth</span></div>'
    +'<div class="bar-wrap"><div class="bar-fill dim" style="width:0%" data-w="'+Math.max(5,data.alone.sensitive)+'"></div></div>'
    +'<div class="bar-num">'+Math.max(5,data.alone.sensitive)+'</div></div>'
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
    // Type labels
    mbti:mbti, ennType:enn.type, ennWing:enn.wing, ennTritype:enn.tritype,
    att:att, phi:phi, instStack:instStack,
    polX:data.polX, polY:data.polY,
    // All score dimensions
    cog:data.cog, enn:data.ennScores, att2:data.attScores, tmp:data.tmp, iv:data.iv,
    mf:data.mf, eth:data.eth, ep:data.ep, phiS:data.phiScores,
    soc:data.soc, alone:data.alone,
    // AI output
    big5:ai.big5||{}, values:ai.values||[],
    mbtiName:sanitizeText(ai.mbtiName,2000)||'', tagline:sanitizeText(ai.tagline,2000)||'',
    socionics:sanitizeText(ai.socionics,2000)||'', keirsey:sanitizeText(ai.keirsey,2000)||'',
    figures:ai.figures||[],
    cogNarrative:sanitizeText(ai.cogNarrative,2000)||'', ennNarrative:sanitizeText(ai.ennNarrative,2000)||'',
    attNarrative:sanitizeText(ai.attNarrative,2000)||'', phiNarrative:sanitizeText(ai.phiNarrative,2000)||'',
    politicalNarrative:sanitizeText(ai.politicalNarrative,2000)||'',
    aloneDesc:sanitizeText(ai.aloneDesc,2000)||'', socialDesc:sanitizeText(ai.socialDesc,2000)||'',
    shadowDesc:sanitizeText(ai.shadowDesc,2000)||''
  };

  // Save to localStorage
  // Auto-save to Firestore when results render (if signed in)
(function(){
  var _saved=false;
  var _unsub = firebase.auth().onAuthStateChanged(function(user){
    if(!user||_saved) return;
    _saved=true; _unsub();
    var _snap = Object.assign({},snapshot,{completedAt:new Date().toISOString(),testMode:TOTAL<=100?'short':'full'});
    var _ref = firebase.firestore().collection('profiles').doc(user.uid);
    _ref.get().then(function(doc){
      var h=doc.exists?(doc.data().history||[]):[];
      h.push({snapshot:_snap,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
      if(h.length>10)h=h.slice(-10);
      return _ref.set({latest:_snap,history:h,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }).then(function(){
      var btn=document.getElementById('btnSave');
      if(btn){btn.innerHTML='↓ SAVED ✓';btn.style.opacity='0.7';}
    }).catch(function(e){console.error('Auto-save:',e);});
  });
})();

document.getElementById('btnSave').addEventListener('click',function(){
    try { localStorage.setItem('animus_last_result', JSON.stringify(snapshot)); } catch(e){}
    var _btnU=firebase.auth().onAuthStateChanged(function(user){
      _btnU();
      if(!user){
        showToast('Sign in to save your profile permanently');
        setTimeout(function(){ window.location.href='/login'; },2000);
        return;
      }
      var snapshotWithMeta = Object.assign({},snapshot,{
        completedAt: new Date().toISOString(),
        testMode: TOTAL<=100?'short':'full'
      });
      var profileRef = firebase.firestore().collection('profiles').doc(user.uid);
      profileRef.get().then(function(doc){
        var history = doc.exists?(doc.data().history||[]):[];
        history.push({snapshot:snapshotWithMeta,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
        if(history.length>10) history=history.slice(-10);
        return profileRef.set({latest:snapshotWithMeta,history:history,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      }).then(function(){
        showToast('Profile saved ✓');
        setTimeout(function(){ window.location.href='/profile'; },1800);
      }).catch(function(e){
        console.error('Save error:',e);
        showToast('Save failed — check connection and try again');
      });
    });
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

  document.getElementById('btnCompare').addEventListener('click',function(){
    document.getElementById('shareModal').classList.add('open');
    document.getElementById('compareUrlInput').focus();
  });

  document.getElementById('btnLoadCompare').addEventListener('click',function(){
    var input=document.getElementById('compareUrlInput').value.trim();
    var hash=input.indexOf('#profile=')>-1?input.split('#profile=')[1]:input;
    if(!hash){showToast('Please paste a valid profile link');return;}
    try{
      var them=safeAtob(hash);
      if(!them) throw new Error('invalid');
      document.getElementById('shareModal').classList.remove('open');
      showComparison(snapshot, them);
    } catch(e){ showToast('Invalid profile link — could not decode'); }
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
    +'<div style="margin-bottom:16px">'+values.map(function(v){return '<div class="value-tag"><div class="vdot"></div>'+v+'</div>';}).join('')+'</div>'

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
    banner.innerHTML = '◎ ESTIMATED PROFILE — <strong style="color:var(--text)">'+(window._observerName||'Unknown')+'</strong> — Based on observed behaviors, not self-report. Results may differ from a self-administered test.';
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
        cog:data.cog,enn:data.enn,att2:data.att,tmp:data.tmp,iv:data.iv,
        mf:data.mf,eth:data.eth,ep:data.ep,phiS:data.phi,soc:data.soc,alone:data.alone,
        big5:ai.big5||{},values:ai.values||[],figures:ai.figures||[],
        mbtiName:sanitizeText(ai.mbtiName,2000)||'',socionics:sanitizeText(ai.socionics,2000)||'',keirsey:sanitizeText(ai.keirsey,2000)||'',
        cogNarrative:sanitizeText(ai.cogNarrative,2000)||'',ennNarrative:sanitizeText(ai.ennNarrative,2000)||'',
        attNarrative:sanitizeText(ai.attNarrative,2000)||'',phiNarrative:sanitizeText(ai.phiNarrative,2000)||'',
        politicalNarrative:sanitizeText(ai.politicalNarrative,2000)||'',
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
