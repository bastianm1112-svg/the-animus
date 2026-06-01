/* Rich, uniform profile section copy + bar population */
(function (g) {
  'use strict';

  var PHI_LABELS = {
    PH_STO: 'Stoic', PH_EPI: 'Epicurean', PH_KAN: 'Kantian', PH_ARI: 'Aristotelian',
    PH_NIE: 'Nietzschean', PH_EXI: 'Existentialist', PH_PRA: 'Pragmatist', PH_SKE: 'Skeptic'
  };

  var PHI_ORDER = ['PH_NIE', 'PH_EXI', 'PH_ARI', 'PH_KAN', 'PH_STO', 'PH_PRA', 'PH_SKE', 'PH_EPI'];

  var PHI_ROW_LABELS = ['Nietzschean', 'Existentialist', 'Aristotelian', 'Kantian', 'Stoic', 'Pragmatist', 'Skeptic', 'Epicurean'];

  var ATT_LABELS = {
    AT_SEC: 'Secure', AT_ANX: 'Anxious-Preoccupied', AT_AVO: 'Fearful-Avoidant', AT_DIS: 'Dismissive-Avoidant'
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
    var econ = x > 12 ? 'economically right' : x < -12 ? 'economically left' : 'economically centrist';
    var soc = y > 12 ? 'socially authoritarian' : y < -12 ? 'socially libertarian' : 'socially moderate';
    return econ + ', ' + soc;
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
          ['MBTI', snap.mbti],
          ['Dom', domFn],
          ['Socionics', snap.socionics || '—']
        ]
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
        ]
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
        ]
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
        metrics: [
          ['Economic', typeof snap.polX === 'number' ? (snap.polX > 0 ? 'Right' : 'Left') : '—'],
          ['Social', typeof snap.polY === 'number' ? (snap.polY > 0 ? 'Auth' : 'Lib') : '—'],
          ['Keirsey', snap.keirsey || '—']
        ]
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
        ]
      },
      {
        kicker: 'Shadow',
        title: p.poss + ' blind spots',
        body: narr(
          snap.shadowDesc ||
          p.subj + ' growth edge lives where ' + p.possL + ' weakest functions and repressed traits meet habit. ' +
          'Under stress, ' + p.subjL + ' may overuse ' + domFn + ' until it becomes rigidity rather than strength.'
        ),
        metrics: [
          ['Stress', snap.ennType ? 'Type ' + snap.ennType : '—'],
          ['Values', snap.values && snap.values.length ? snap.values.length + ' core' : '—'],
          ['Figures', snap.figures && snap.figures.length ? snap.figures.length + ' matches' : '—']
        ]
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
        return '<span class="insight-metric"><strong>' + m[0] + '</strong>' + m[1] + '</span>';
      }).join('');
      return '<article class="insight-block">' +
        '<div class="insight-kicker">' + b.kicker + '</div>' +
        '<div class="insight-title">' + b.title + '</div>' +
        '<div class="insight-body">' + b.body.replace(/<strong>/g, '<strong style="color:var(--white);font-weight:500">') + '</div>' +
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
        ? narr(p.subj + ' process the world primarily through <strong>' + (topKey(snap.cog) || '—') + '</strong>. The scores below rank all eight functions — higher bars mean more natural, reliable access.')
        : '',
      panelPersonalityLead: snap.ennType
        ? narr('Enneagram scores show relative intensity across all nine types — not just ' + p.possL + ' core type. Peaks reveal motivation, fear, and adaptive strategy.')
        : '',
      panelPhilosophyLead: snap.phi || snap.phiS
        ? narr('Philosophical schools are scored in parallel — ' + p.subjL + ' rarely embody one school alone, but the distribution shows where ' + p.possL + ' moral reasoning anchors.')
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
      g.AnimusProfileVisuals.renderAll(snap, isOwner, voice);
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
