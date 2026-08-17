/**
 * ANIMUS UI + question localization (English / Spanish).
 * Question text: AnimusI18n.Q_ES[] aligned by index with AnimusQuestions.Q[].
 */
(function (g) {
  'use strict';

  var SEC_ES = {
    Cognitive: 'Cognitivo',
    Enneagram: 'Eneagrama',
    Politics: 'Política',
    Philosophy: 'Filosofía',
    Ethics: 'Ética',
    Attachment: 'Apego',
    Instinct: 'Instinto',
    Temperament: 'Temperamento',
    Social: 'Social',
    Alone: 'Solo',
    Moral: 'Moral',
    Epistemology: 'Epistemología'
  };

  var NAV_ES = {
    Home: 'Inicio',
    Settings: 'Ajustes',
    Friends: 'Amigos',
    Notifications: 'Notificaciones',
    'Take Test': 'Hacer test',
    Compare: 'Comparar',
    Types: 'Tipos',
    People: 'Personas',
    Activity: 'Amigos',
    Figures: 'Personas',
    Profile: 'Perfil'
  };

  var RESULT_TABS_ES = {
    Overview: 'Resumen',
    Thinking: 'Pensar',
    Cognition: 'Pensar',
    Personality: 'Personalidad',
    Philosophy: 'Filosofía',
    Political: 'Política',
    Social: 'Social',
    People: 'Personas',
    Figures: 'Personas'
  };

  var PROFILE_TABS_ES = {
    Overview: 'Resumen',
    Thinking: 'Pensar',
    Cognition: 'Pensar',
    Personality: 'Personalidad',
    Philosophy: 'Filosofía',
    Political: 'Política',
    Social: 'Social',
    People: 'Personas',
    Figures: 'Personas'
  };

  var Q_ES = [];
  var Q_ES_BY_T = {};
  var Q_ES_BY_IDX = [];

  function getLang() {
    if (g.AnimusShared && g.AnimusShared.getResolvedLang) {
      return g.AnimusShared.getResolvedLang();
    }
    try {
      return localStorage.getItem('animus_lang') === 'es' ? 'es' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function bindQuestionEsIndex(questions, qEs) {
    Q_ES = Array.isArray(qEs) ? qEs : [];
    Q_ES_BY_T = {};
    Q_ES_BY_IDX = [];
    if (!Array.isArray(questions) || !Q_ES.length) return;
    questions.forEach(function (q, i) {
      if (Q_ES[i]) {
        Q_ES_BY_IDX[i] = Q_ES[i];
        Q_ES_BY_T[q.t] = Q_ES[i];
      }
    });
  }

  function applyDomI18n(root, lang) {
    lang = lang === 'es' ? 'es' : 'en';
    root = root || document;
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('[data-en]').forEach(function (el) {
      var en = el.getAttribute('data-en');
      if (!en) return;
      var es = el.getAttribute('data-es') || en;
      var text = lang === 'es' ? es : en;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.hasAttribute('placeholder')) el.placeholder = text;
      } else if (!el.children.length) {
        el.textContent = text;
      } else if (el.children.length === 1 && el.children[0].nodeType === 3) {
        el.childNodes[0].textContent = text;
      }
    });

    root.querySelectorAll('.nav-item, .nav-mobile-item').forEach(function (el) {
      var label = (el.textContent || '').trim();
      if (lang === 'es' && NAV_ES[label]) {
        var svg = el.querySelector('svg');
        if (svg) {
          el.textContent = '';
          el.appendChild(svg);
          el.appendChild(document.createTextNode(' ' + NAV_ES[label]));
        } else {
          el.textContent = NAV_ES[label];
        }
      }
    });

    root.querySelectorAll('.profile-tab').forEach(function (btn) {
      var en = (btn.textContent || '').trim();
      if (lang === 'es' && PROFILE_TABS_ES[en]) btn.textContent = PROFILE_TABS_ES[en];
    });

    root.querySelectorAll('.tab').forEach(function (btn) {
      var en = (btn.textContent || '').trim();
      if (lang === 'es' && RESULT_TABS_ES[en]) btn.textContent = RESULT_TABS_ES[en];
    });
  }

  function applyPageI18n(lang) {
    lang = lang === 'es' ? 'es' : 'en';
    if (document.documentElement) document.documentElement.lang = lang;
    applyDomI18n(document, lang);
  }

  function legacyEsEntry(legacyEs, q) {
    if (!legacyEs || !q) return null;
    return legacyEs[q.t] || null;
  }

  /**
   * Localize one question for display (stem, section, scale ends, MC choices, explain).
   */
  function localizeQuestion(q, lang, legacyEs, qIdx) {
    lang = lang === 'es' ? 'es' : 'en';
    if (!q) {
      return { sec: '', text: '', explain: '', lo: '', hi: '', choices: [] };
    }

    var sec = q.sec || '';
    if (lang === 'es' && SEC_ES[sec]) sec = SEC_ES[sec];

    var bundle = null;
    if (lang === 'es') {
      if (qIdx != null && qIdx >= 0 && Q_ES_BY_IDX[qIdx]) bundle = Q_ES_BY_IDX[qIdx];
      else bundle = Q_ES_BY_T[q.t] || null;
    }
    var legacy = lang === 'es' ? legacyEsEntry(legacyEs, q) : null;

    var text = q.t;
    if (lang === 'es') {
      if (bundle && bundle.t) text = bundle.t;
      else if (legacy && legacy.es_t) text = legacy.es_t;
      else if (q.es_t) text = q.es_t;
    }

    var explain = '';
    if (lang === 'es') {
      explain = (bundle && bundle.es) || (legacy && legacy.es) || q.es || q.e || '';
    } else {
      explain = q.e || '';
    }

    var lo = q.lo || '';
    var hi = q.hi || '';
    if (lang === 'es' && bundle) {
      if (bundle.lo) lo = bundle.lo;
      if (bundle.hi) hi = bundle.hi;
    }

    var choices = [];
    if (q.choices && q.choices.length) {
      choices = q.choices.map(function (c, ci) {
        var ct = c.t;
        if (lang === 'es') {
          if (bundle && bundle.c && bundle.c[ci]) ct = bundle.c[ci];
          else if (c.es_t) ct = c.es_t;
        }
        return { letter: c.l, text: ct, score: c.s };
      });
    }

    return { sec: sec, text: text, explain: explain, lo: lo, hi: hi, choices: choices };
  }

  g.AnimusI18n = {
    SEC_ES: SEC_ES,
    NAV_ES: NAV_ES,
    RESULT_TABS_ES: RESULT_TABS_ES,
    PROFILE_TABS_ES: PROFILE_TABS_ES,
    Q_ES: Q_ES,
    getLang: getLang,
    bindQuestionEsIndex: bindQuestionEsIndex,
    applyDomI18n: applyDomI18n,
    applyPageI18n: applyPageI18n,
    localizeQuestion: localizeQuestion
  };
})(typeof window !== 'undefined' ? window : globalThis);
