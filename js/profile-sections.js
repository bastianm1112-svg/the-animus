/* Rich, uniform profile section copy + bar population */
(function (g) {
  'use strict';

  var PHI_LABELS = {
    PH_STO: 'Stoic', PH_EPI: 'Epicurean', PH_KAN: 'Kantian', PH_ARI: 'Aristotelian',
    PH_NIE: 'Nietzschean', PH_EXI: 'Existentialist', PH_PRA: 'Pragmatist', PH_SKE: 'Skeptic'
  };

  var PHI_ORDER = ['PH_NIE', 'PH_EXI', 'PH_ARI', 'PH_KAN', 'PH_STO', 'PH_PRA', 'PH_SKE', 'PH_EPI'];

  var PHI_ROW_LABELS = ['Nietzschean', 'Existentialist', 'Aristotelian', 'Kantian', 'Stoic', 'Pragmatist', 'Skeptic', 'Epicurean'];

  function esc(s) {
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.escapeHTML) {
      return g.AnimusShared.escapeHTML(s);
    }
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var ATT_LABELS = {
    AT_SEC: 'Secure', AT_ANX: 'Anxious-Preoccupied', AT_AVO: 'Dismissive-Avoidant', AT_DIS: 'Fearful-Avoidant'
  };

  var ETH_LABELS = {
    ET_VIR: 'Virtue ethics', ET_CON: 'Consequentialist', ET_DEO: 'Deontological', ET_EGO: 'Egoist'
  };

  var FN_DESC = {
    Ni: 'long-range pattern recognition and strategic vision',
    Ne: 'lateral ideation and possibility-mapping',
    Ti: 'internal logical frameworks and precision',
    Te: 'external systems, efficiency, and execution',
    Fi: 'deep personal values and authenticity',
    Fe: 'interpersonal attunement and group harmony',
    Si: 'experiential memory and procedural stability',
    Se: 'present-moment awareness and sensory mastery'
  };

  function topKey(obj) {
    if (!obj) return null;
    var keys = Object.keys(obj);
    if (!keys.length) return null;
    return keys.sort(function (a, b) { return (obj[b] || 0) - (obj[a] || 0); })[0];
  }

  function pron(isOwner) {
    return {
      subj: isOwner ? 'You' : 'They',
      subjL: isOwner ? 'you' : 'they',
      poss: isOwner ? 'Your' : 'Their',
      possL: isOwner ? 'your' : 'their',
      be: isOwner ? 'are' : 'are',
      have: isOwner ? 'have' : 'have'
    };
  }

  function setBarRows(container, order, scores, keyFn) {
    if (!container) return;
    var rows = container.querySelectorAll('.bar-row');
    order.forEach(function (key, i) {
      var row = rows[i];
      if (!row) return;
      var k = keyFn ? keyFn(key) : key;
      var v = Math.round(scores[k] || scores[key] || 0);
      var fill = row.querySelector('.bar-fill');
      var num = row.querySelector('.bar-num');
      if (fill) fill.setAttribute('data-w', v);
      if (num) num.textContent = v;
    });
  }

  function polLabel(x, y) {
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.polShortLabel) {
      var pl = g.AnimusShared.polShortLabel(x, y);
      var econ = pl.econ === 'Right' ? 'economically right' : pl.econ === 'Left' ? 'economically left' : 'economically centrist';
      var soc = pl.auth === 'Auth' ? 'socially authoritarian' : pl.auth === 'Lib' ? 'socially libertarian' : 'socially moderate';
      return econ + ', ' + soc;
    }
    var econ = x > 10 ? 'economically right' : x < -10 ? 'economically left' : 'economically centrist';
    var soc = y > 10 ? 'socially authoritarian' : y < -10 ? 'socially libertarian' : 'socially moderate';
    return econ + ', ' + soc;
  }

  function plainField(text, maxLen) {
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.sanitizePlainText) {
      return g.AnimusShared.sanitizePlainText(text, maxLen || 2000);
    }
    return text || '';
  }

  function buildInsights(snap, isOwner, name, voice) {
    var p = pron(isOwner);
    var narr = voice && voice.narrativeForViewer
      ? function (t) { return voice.narrativeForViewer(t, isOwner); }
      : function (t) { return t; };

    if (!snap || !snap.mbti) return [];

    var cog = snap.cog || {};
    var domFn = topKey(cog) || '—';
    var auxFn = Object.keys(cog).sort(function (a, b) { return cog[b] - cog[a]; })[1] || '';
    var phiKey = snap.phi || topKey(snap.phiS);
    var phiName = PHI_LABELS[phiKey] || phiKey || '—';
    var attName = ATT_LABELS[snap.att] || '—';

    var blocks = [
      {
        kicker: 'Cognition',
        title: p.poss + ' mental architecture',
        body: narr(
          p.subj + ' ' + p.be + ' wired around <strong>' + domFn + '</strong>' +
          (auxFn ? ' with <strong>' + auxFn + '</strong> as a supporting lens' : '') +
          '. ' + p.poss + ' dominant function leans toward ' + (FN_DESC[domFn] || 'a distinct processing style') +
          ', which shapes how ' + p.subjL + ' frame problems, learn, and make decisions under pressure.'
        ),
        metrics: [
          ['Cognitive type', snap.mbti],
          ['Dom', domFn],
          ['Socionics', snap.socionics || '—']
        ],
        simple: 'In simple terms: ' + p.subjL + ' usually solve problems with ' + (FN_DESC[domFn] || 'a favorite thinking style') + '. That is a habit, not a cage.'
      },
      {
        kicker: 'Personality',
        title: p.poss + ' core type pattern',
        body: narr(
          (snap.ennType
            ? p.subj + ' center on Enneagram <strong>' + snap.ennType + 'w' + (snap.ennWing || '?') + '</strong>'
              + (snap.ennTritype ? ' with tritype <strong>' + snap.ennTritype + '</strong>' : '') + '. '
            : '') +
          (snap.instStack ? p.poss + ' instinct stack reads <strong>' + snap.instStack + '</strong> — ' : '') +
          'this combination explains motivation loops, stress behavior, and what ' + p.subjL + ' reach for when challenged.'
        ),
        metrics: [
          ['Ennea', (snap.ennType || '—') + 'w' + (snap.ennWing || '')],
          ['Tritype', snap.ennTritype || '—'],
          ['Instinct', snap.instStack || '—']
        ],
        simple: 'In simple terms: this is the emotional engine — what ' + p.subjL + ' want when things get hard, and how ' + p.subjL + ' try to feel okay again.'
      },
      {
        kicker: 'Philosophy',
        title: p.poss + ' worldview',
        body: narr(
          (snap.phiNarrative
            ? snap.phiNarrative
            : p.subj + ' gravitate toward a <strong>' + phiName + '</strong> orientation — ' +
              'meaning ' + p.subjL + ' tend to justify choices through that school\'s logic first, ' +
              'then stress-test against experience and ethics.')
        ),
        metrics: [
          ['School', phiName],
          ['Ethics', ETH_LABELS[topKey(snap.eth)] || '—'],
          ['Temperament', snap.tmp ? (topKey(snap.tmp) || '').replace('TMP_', '') : '—']
        ],
        simple: 'In simple terms: when ' + p.subjL + ' decide what is true or good, a ' + phiName + ' lens usually speaks first.'
      },
      {
        kicker: 'Political',
        title: p.poss + ' compass position',
        body: narr(
          (snap.politicalNarrative
            ? snap.politicalNarrative
            : (typeof snap.polX === 'number' && typeof snap.polY === 'number'
              ? p.subj + ' sit <strong>' + polLabel(snap.polX, snap.polY) + '</strong> on the compass. ' +
                'This is less a party label than a tension between freedom, authority, and economic preference.'
              : p.poss + ' political profile will appear after the assessment maps economic and social axes.'))
        ),
        metrics: (function () {
          var pl = (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.polShortLabel &&
            typeof snap.polX === 'number' && typeof snap.polY === 'number')
            ? g.AnimusShared.polShortLabel(snap.polX, snap.polY)
            : null;
          return [
            ['Economic', pl ? pl.econ : '—'],
            ['Social', pl ? pl.auth : '—'],
            ['Keirsey', snap.keirsey || '—']
          ];
        })(),
        simple: (typeof snap.polX === 'number'
          ? 'In simple terms: ' + p.subjL + ' sit ' + polLabel(snap.polX, snap.polY) + ' on a map of money vs the state, and rules vs personal freedom. Nearby names are map rhymes, not copies of ' + p.possL + ' whole politics.'
          : 'In simple terms: a political map appears after the test.')
      },
      {
        kicker: 'Social',
        title: p.poss + ' relational pattern',
        body: narr(
          (snap.socialDesc || snap.aloneDesc
            ? [snap.aloneDesc, snap.socialDesc].filter(Boolean).join(' ')
            : p.subj + ' show <strong>' + attName + '</strong> attachment tendencies — ' +
              'a lens for how closeness, distance, and trust show up in close relationships and groups.')
        ),
        metrics: [
          ['Attachment', attName],
          ['Alone', snap.aloneDesc ? 'Mapped' : '—'],
          ['With others', snap.socialDesc ? 'Mapped' : '—']
        ],
        simple: 'In simple terms: this is how close ' + p.subjL + ' like people to get, and what happens when someone pulls away or leans in.'
      },
      {
        kicker: 'Shadow',
        title: p.poss + ' blind spots',
        body: narr(
          plainField(snap.shadowDesc, 2000) ||
          p.subj + ' growth edge lives where ' + p.possL + ' weakest functions and repressed traits meet habit. ' +
          'Under stress, ' + p.subjL + ' may overuse ' + domFn + ' until it becomes rigidity rather than strength.'
        ),
        metrics: [
          ['Stress', snap.ennType ? 'Type ' + snap.ennType : '—'],
          ['Values', snap.values && snap.values.length ? snap.values.length + ' core' : '—'],
          ['Figures', snap.figures && snap.figures.length ? snap.figures.length + ' matches' : '—']
        ],
        simple: 'In simple terms: under stress, the same strength can get loud and clumsy. That is a pattern to notice, not a verdict.'
      }
    ];

    return blocks;
  }

  function renderInsightsGrid(snap, isOwner, displayName, voice) {
    var grid = document.getElementById('profileInsightsGrid');
    if (!grid) return;
    var blocks = buildInsights(snap, isOwner, displayName, voice);
    if (!blocks.length) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      return;
    }
    grid.style.display = '';
    grid.innerHTML = blocks.map(function (b) {
      var metrics = b.metrics.map(function (m) {
        return '<span class="insight-metric"><strong>' + esc(m[0]) + '</strong>' + esc(m[1]) + '</span>';
      }).join('');
      var body = esc(b.body).replace(/&lt;strong&gt;/g, '<strong style="color:var(--white);font-weight:500">').replace(/&lt;\/strong&gt;/g, '</strong>');
      return '<article class="insight-block">' +
        '<div class="insight-kicker">' + esc(b.kicker) + '</div>' +
        '<div class="insight-title">' + esc(b.title) + '</div>' +
        (b.simple ? '<p class="insight-simple">' + esc(b.simple) + '</p>' : '') +
        '<div class="insight-body">' + body + '</div>' +
        '<div class="insight-metrics">' + metrics + '</div>' +
        '</article>';
    }).join('');
  }

  function populatePhilosophyBars(snap) {
    if (!snap.phiS) return;
    var card = document.querySelector('#panel-philosophy .card');
    if (!card) return;
    setBarRows(card, PHI_ORDER, snap.phiS, null);
  }

  function fixPersonalityBars(snap) {
    if (snap.enn) {
      var ennWrap = document.querySelector('#panel-personality .enn-bars-wrap');
      if (ennWrap) {
        var ennOrder = ['E1', 'E6', 'E5', 'E8', 'E2', 'E3', 'E4', 'E7', 'E9'];
        setBarRows(ennWrap, ennOrder, snap.enn, null);
      }
    }
    if (snap.tmp) {
      var tmpWrap = document.querySelector('#panel-personality .tmp-bars-wrap');
      if (tmpWrap) {
        var tmpOrder = ['TMP_MEL', 'TMP_CHO', 'TMP_PHL', 'TMP_SAN'];
        setBarRows(tmpWrap, tmpOrder, snap.tmp, null);
      }
    }
  }

  function fillSectionLeads(snap, isOwner, voice) {
    var p = pron(isOwner);
    var narr = voice && voice.narrativeForViewer
      ? function (t) { return voice.narrativeForViewer(t, isOwner); }
      : function (t) { return t; };

    var leads = {
      panelCognitionLead: snap.mbti
        ? narr('<p class="insight-simple">In simple terms: some thinking moves come easy; others take more effort. The bars are that ranking — not a grade.</p>' + p.subj + ' process the world primarily through <strong>' + esc(topKey(snap.cog) || '—') + '</strong>. Higher bars mean more natural access.')
        : '',
      panelPersonalityLead: snap.ennType
        ? narr('<p class="insight-simple">In simple terms: Enneagram is the emotional engine — what ' + p.subjL + ' want when things get hard.</p>Scores show relative intensity across all nine types — not just ' + p.possL + ' core type.')
        : '',
      panelPhilosophyLead: snap.phi || snap.phiS
        ? narr('<p class="insight-simple">In simple terms: this is the lens ' + p.subjL + ' use first when deciding what is true or good.</p>Schools are scored in parallel — ' + p.subjL + ' rarely embody one school alone.')
        : ''
    };

    Object.keys(leads).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && leads[id]) {
        el.innerHTML = leads[id];
        el.style.display = '';
      }
    });
  }

  function fixPoliticalStat(snap) {
    if (typeof snap.polX !== 'number') return;
    var spEl = document.getElementById('statPolitical');
    if (!spEl) return;
    var econ = snap.polX > 10 ? 'Right' : snap.polX < -10 ? 'Left' : 'Center';
    var auth = snap.polY > 10 ? 'Auth' : snap.polY < -10 ? 'Lib' : 'Mod';
    spEl.textContent = econ + ' · ' + auth;
  }

  function hideEmptyEnnNarrative(snap) {
    var block = document.querySelector('#panel-personality .narrative');
    if (!block) return;
    if (!snap.ennNarrative) block.style.display = 'none';
    else block.style.display = '';
  }

  function setPolNarrativeTitle(snap) {
    if (!snap.politicalNarrative) return;
    var t = document.getElementById('polNarrativeTitle');
    if (t) t.textContent = 'Political posture';
  }

  function renderAll(snap, isOwner, voice, displayName) {
    if (typeof g.AnimusProfilePanels !== 'undefined') {
      g.AnimusProfilePanels.renderAll(snap, isOwner, voice, displayName);
    } else {
      renderInsightsGrid(snap, isOwner, displayName, voice);
      populatePhilosophyBars(snap);
      fixPersonalityBars(snap);
      fillSectionLeads(snap, isOwner, voice);
      hideEmptyEnnNarrative(snap);
    }

    fixPoliticalStat(snap);

    if (typeof g.AnimusProfileVisuals !== 'undefined') {
      g.AnimusProfileVisuals.renderAll(snap, isOwner, voice, displayName);
    }

    if (typeof g.animateBars === 'function') {
      setTimeout(g.animateBars, 200);
    }
  }

  g.AnimusProfileSections = {
    renderAll: renderAll,
    buildInsights: buildInsights
  };
})(typeof window !== 'undefined' ? window : globalThis);
