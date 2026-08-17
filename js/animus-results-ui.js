/**
 * Reusable result cards — structured data first, AI as interpretation.
 */
(function (g) {
  'use strict';

  function esc(s) {
    return g.AnimusShared && g.AnimusShared.escapeHTML
      ? g.AnimusShared.escapeHTML(s)
      : String(s || '').replace(/[&<>"]/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
      });
  }

  function card(opts) {
    opts = opts || {};
    var cls = 'animus-card' + (opts.kind ? ' animus-card--' + opts.kind : '');
    var why = opts.why
      ? '<details class="animus-why"><summary>Why?</summary><div class="animus-why-body">' + opts.why + '</div></details>'
      : '';
    var more = opts.more
      ? '<details class="animus-more"><summary>See more</summary><div class="animus-more-body">' + opts.more + '</div></details>'
      : '';
    return (
      '<article class="' + cls + '">' +
      (opts.kicker ? '<div class="animus-card-kicker">' + esc(opts.kicker) + '</div>' : '') +
      (opts.title ? '<h3 class="animus-card-title">' + opts.title + '</h3>' : '') +
      (opts.body ? '<div class="animus-card-body">' + opts.body + '</div>' : '') +
      why + more +
      '</article>'
    );
  }

  function scoreCard(label, value, hint) {
    return card({
      kind: 'score',
      kicker: label,
      title: esc(String(value)),
      body: hint ? '<p class="animus-muted">' + esc(hint) + '</p>' : ''
    });
  }

  function traitCard(name, score, blurb) {
    var w = Math.max(0, Math.min(100, Number(score) || 0));
    return card({
      kind: 'trait',
      title: esc(name),
      body:
        '<div class="animus-meter" role="img" aria-label="' + esc(name) + ' ' + w + '"><span style="width:' + w + '%"></span></div>' +
        (blurb ? '<p>' + esc(blurb) + '</p>' : '')
    });
  }

  function similarityCard(title, score, axes, extra) {
    var Pol = g.AnimusPolitical;
    var band = Pol ? Pol.similarityBand(score) : '';
    var label = Pol ? Pol.similarityLabel(score) : '';
    var axisHtml = (axes || []).map(function (ax) {
      return '<li><strong>' + esc(ax.label) + '</strong> Δ ' + Math.round(ax.delta) + '</li>';
    }).join('');
    return card({
      kind: 'similarity',
      kicker: title,
      title: Math.round(score) + '%',
      body: '<p>' + esc(label) + '</p><ul class="animus-axis-list">' + axisHtml + '</ul>' + (extra || ''),
      more: band === 'very-strong' && Pol && Pol.twinLanguageAllowed({ overall: score, axes: axes })
        ? '<p>Coordinates are very close. That still is not a guarantee of agreement on every issue.</p>'
        : ''
    });
  }

  function figureCard(fig) {
    fig = fig || {};
    var badge = fig.dataStatus
      ? '<span class="animus-badge animus-badge--' + esc(fig.dataStatus) + '">' + esc(fig.dataStatus) + '</span>'
      : '';
    var img = fig.image
      ? '<img class="animus-fig-img" alt="" src="' + esc(fig.image) + '" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false">'
      : '';
    var fallback = '<div class="animus-fig-fallback"' + (fig.image ? ' hidden' : '') + '>' + esc((fig.initials || fig.name || '?').slice(0, 2)) + '</div>';
    return card({
      kind: 'figure',
      title: esc(fig.name || 'Unknown') + ' ' + badge,
      body: img + fallback +
        '<p class="animus-muted">' + esc(fig.cat || fig.type || '') + '</p>' +
        (fig.note ? '<p>' + esc(fig.note) + '</p>' : '') +
        (fig.sourceNote ? '<p class="animus-fine">' + esc(fig.sourceNote) + '</p>' : '')
    });
  }

  function insightCard(title, text, isDeeper, locked) {
    if (locked) {
      return card({
        kind: 'deeper',
        kicker: title || 'Plus',
        title: esc(title || 'Plus'),
        body: '<p>Unlock Animus Plus for longer interpretation of contradictions, trait interactions, and unusual score combinations.</p><p><a class="animus-link" href="/shop">View Plus</a></p>'
      });
    }
    return card({
      kind: isDeeper ? 'deeper' : 'insight',
      kicker: isDeeper ? 'Deeper Insight' : 'Insight',
      title: esc(title || ''),
      body: '<div class="animus-prose">' + (text || '') + '</div>'
    });
  }

  function distributionCard(title, rows) {
    var html = (rows || []).map(function (r) {
      var w = Math.max(0, Math.min(100, r.pct || 0));
      return '<div class="animus-dist-row"><span>' + esc(r.label) + '</span><div class="animus-meter"><span style="width:' + w + '%"></span></div></div>';
    }).join('');
    return card({ kind: 'distribution', title: esc(title), body: html });
  }

  function groupDynamicCard(dyn) {
    dyn = dyn || {};
    if (dyn.emptyReason === 'one-member') {
      return card({ kind: 'group', title: 'Need another person', body: '<p>Group dynamics need at least two completed profiles.</p>' });
    }
    if (dyn.emptyReason) {
      return card({ kind: 'group', title: 'Not enough data', body: '<p>Add people who have finished a test.</p>' });
    }
    return card({
      kind: 'group',
      kicker: 'Group profile',
      title: 'Cohesion ' + (dyn.cohesion || '—') + ' · Diversity ' + (dyn.diversity || '—'),
      body:
        '<ul>' +
        '<li>Closest pair: ' + esc((dyn.closestPair && dyn.closestPair.names || []).join(' & ')) + '</li>' +
        '<li>Most contrasting: ' + esc((dyn.contrastingPair && dyn.contrastingPair.names || []).join(' & ')) + '</li>' +
        '<li>Most central: ' + esc(dyn.centralMember && dyn.centralMember.name) + '</li>' +
        '<li>Most distinctive: ' + esc(dyn.distinctiveMember && dyn.distinctiveMember.name) + '</li>' +
        '</ul>' +
        '<p class="animus-fine">' + esc(dyn.qualified) + '</p>',
      more: (dyn.axisNotes || []).map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('')
    });
  }

  function legacyNote(snap) {
    if (!snap) return '';
    if (snap.bankVersion && snap.scoringVersion) return '';
    return '<p class="animus-legacy">Scored under an earlier edition. Numbers were not re-run against the current question bank.</p>';
  }

  function compassSvg(polX, polY, extras) {
    extras = extras || [];
    var x = 100 + (Number(polX) || 0);
    var y = 100 - (Number(polY) || 0);
    var dots = extras.map(function (e, i) {
      var ex = 100 + (Number(e.polX) || 0);
      var ey = 100 - (Number(e.polY) || 0);
      return '<circle class="animus-compass-other" cx="' + ex + '" cy="' + ey + '" r="3" data-i="' + i + '"><title>' + esc(e.name || '') + '</title></circle>';
    }).join('');
    return (
      '<svg class="animus-compass" viewBox="0 0 200 200" role="img" aria-label="Political compass">' +
      '<rect x="1" y="1" width="198" height="198" class="animus-compass-bg"/>' +
      '<line x1="100" y1="8" x2="100" y2="192" class="animus-compass-axis"/>' +
      '<line x1="8" y1="100" x2="192" y2="100" class="animus-compass-axis"/>' +
      '<text x="100" y="14" text-anchor="middle" class="animus-compass-label">Auth</text>' +
      '<text x="100" y="196" text-anchor="middle" class="animus-compass-label">Lib</text>' +
      '<text x="8" y="96" class="animus-compass-label">Left</text>' +
      '<text x="168" y="96" class="animus-compass-label">Right</text>' +
      dots +
      '<circle class="animus-compass-dot" cx="' + x + '" cy="' + y + '" r="5" data-cx="' + x + '" data-cy="' + y + '"/>' +
      '</svg>'
    );
  }

  function culturalSlider(polZ) {
    var z = Number(polZ);
    if (!Number.isFinite(z)) return '';
    var pct = ((z + 100) / 200) * 100;
    return (
      '<div class="animus-cultural">' +
      '<div class="animus-card-kicker">Cultural axis · Animus Plus</div>' +
      '<div class="animus-cultural-track"><span style="left:' + pct + '%"></span></div>' +
      '<div class="animus-cultural-ends"><span>Traditional</span><span>Progressive</span></div>' +
      '<p>' + esc(g.AnimusPolitical ? g.AnimusPolitical.culturalLabel(z) : '') + ' · ' + Math.round(z) + '</p>' +
      '</div>'
    );
  }

  function leanWords(polX, polY) {
    var econ = polX > 12 ? 'more market-oriented on the economy' : polX < -12 ? 'more state-oriented on the economy' : 'near the economic center';
    var auth = polY > 12 ? 'more comfortable with strong authority' : polY < -12 ? 'more liberty-first on personal life' : 'middling on authority vs liberty';
    return { econ: econ, auth: auth };
  }

  function simpleMatchMeaning(name, polX, polY) {
    var w = leanWords(polX, polY);
    return 'In simple terms: you and ' + name + ' both sit ' + w.econ + ' and ' + w.auth +
      '. That is a location on this map — not proof you agree on every issue.';
  }

  function complexMatchMeaning(item) {
    var bits = (item.axes || []).map(function (ax) {
      return ax.label + ' gap ' + Math.round(ax.delta);
    }).join(' · ');
    return (item.label || 'Coordinate match') + ' (' + Math.round(item.similarity || 0) + '%). ' +
      (bits ? bits + '. ' : '') +
      'Ranked by distance on the axes we actually measured' +
      (item.axes && item.axes.length > 2 ? ', including cultural Z' : '') +
      '. Estimated placement, not a psychometric score for that person or country.';
  }

  function matchCardsHtml(list, mode, kind) {
    return (list || []).map(function (item) {
      var meaning = mode === 'complex'
        ? complexMatchMeaning(item)
        : simpleMatchMeaning(item.name, item.polX, item.polY);
      return card({
        kind: kind === 'country' ? 'country' : 'figure',
        kicker: kind === 'country' ? 'Country rhyme' : 'Figure rhyme',
        title: esc(item.name || '') +
          (item.dataStatus ? ' <span class="animus-badge animus-badge--estimated">estimated</span>' : ''),
        body: '<p>' + esc(meaning) + '</p>' +
          (mode === 'complex' && item.sourceNote ? '<p class="animus-fine">' + esc(item.sourceNote) + '</p>' : '')
      });
    }).join('');
  }

  function compass3dHtml(polX, polY, polZ) {
    var x = Number(polX) || 0;
    var y = Number(polY) || 0;
    var z = Number.isFinite(Number(polZ)) ? Number(polZ) : 0;
    var tx = (x / 100) * 70;
    var tz = (-y / 100) * 70;
    var ty = (-z / 100) * 55;
    return (
      '<div class="c3d-stage" data-c3d>' +
      '<div class="c3d-scene" style="--c3d-yaw:-28deg">' +
      '<div class="c3d-floor" aria-hidden="true">' +
      '<span class="c3d-lab c3d-lab-n">Auth</span><span class="c3d-lab c3d-lab-s">Lib</span>' +
      '<span class="c3d-lab c3d-lab-w">Left</span><span class="c3d-lab c3d-lab-e">Right</span>' +
      '</div>' +
      '<div class="c3d-z" aria-hidden="true"><span>Trad</span><span>Prog</span></div>' +
      '<div class="c3d-dot" style="transform:translate3d(' + tx + 'px,' + ty + 'px,' + tz + 'px)"></div>' +
      '</div>' +
      '<div class="c3d-orbit">' +
      '<button type="button" class="c3d-rot" data-rot="-18" aria-label="Rotate left">←</button>' +
      '<button type="button" class="c3d-rot" data-rot="18" aria-label="Rotate right">→</button>' +
      '</div>' +
      '<p class="animus-fine">X economic · Y authority · Z cultural (Plus). Drag-free orbit buttons.</p>' +
      '</div>'
    );
  }

  function compassBlockHtml(polX, polY, polZ, hasZ) {
    return (
      '<div class="animus-compass-block" data-compass-block>' +
      '<div class="animus-seg" role="group" aria-label="Compass view">' +
      '<button type="button" class="animus-seg-btn is-on" data-compass-view="2d">2D</button>' +
      '<button type="button" class="animus-seg-btn" data-compass-view="3d">3D</button>' +
      '</div>' +
      '<div class="animus-compass-pane" data-pane="2d">' + compassSvg(polX, polY) + '</div>' +
      '<div class="animus-compass-pane is-hidden" data-pane="3d">' + compass3dHtml(polX, polY, hasZ ? polZ : 0) + '</div>' +
      (hasZ ? culturalSlider(polZ) : '<p class="animus-fine">3D uses cultural Z from Animus Plus. Without Plus, Z sits at center.</p>') +
      '</div>'
    );
  }

  function collectMatches(profile, includeCultural, simpleLimit, complexLimit) {
    var figs = g.AnimusPoliticalFigures && g.AnimusPoliticalFigures.rankClosest
      ? g.AnimusPoliticalFigures.rankClosest(profile, { includeCultural: includeCultural, limit: complexLimit || 8 })
      : [];
    var countries = g.AnimusPoliticalCountries && g.AnimusPoliticalCountries.rankClosest
      ? g.AnimusPoliticalCountries.rankClosest(profile, { includeCultural: includeCultural, limit: complexLimit || 8 })
      : [];
    return {
      figuresSimple: figs.slice(0, simpleLimit || 3),
      figuresComplex: figs,
      countriesSimple: countries.slice(0, simpleLimit || 3),
      countriesComplex: countries
    };
  }

  function politicalPanelHtml(opts) {
    opts = opts || {};
    var data = opts.data || {};
    var ai = opts.ai || {};
    var plus = !!opts.plus;
    var polZ = data.polZ;
    var hasZ = plus && polZ != null && Number.isFinite(Number(polZ));
    var profile = { polX: data.polX, polY: data.polY, polZ: hasZ ? polZ : undefined };
    var m = collectMatches(profile, hasZ, 3, 8);
    var simpleFigs = matchCardsHtml(m.figuresSimple, 'simple', 'figure');
    var simpleCtry = matchCardsHtml(m.countriesSimple, 'simple', 'country');
    var complexFigs = matchCardsHtml(m.figuresComplex, 'complex', 'figure');
    var complexCtry = matchCardsHtml(m.countriesComplex, 'complex', 'country');

    function polList(arr) {
      if (!Array.isArray(arr) || !arr.length) return '';
      return '<ul class="animus-axis-list">' + arr.map(function (item) {
        return '<li>' + esc(item) + '</li>';
      }).join('') + '</ul>';
    }

    return (
      '<div class="animus-depth-bar" role="group" aria-label="Reading depth">' +
      '<button type="button" class="animus-seg-btn is-on" data-depth="simple">Simple</button>' +
      '<button type="button" class="animus-seg-btn" data-depth="complex">Complex</button>' +
      '</div>' +
      compassBlockHtml(data.polX, data.polY, polZ, hasZ) +
      '<section class="animus-pol-simple" data-depth-pane="simple">' +
      '<p class="panel-sub">Plain-language map of where your answers sit. Matches are coordinate rhymes, not endorsements.</p>' +
      '<div class="section-label">People you sit near</div>' + (simpleFigs || '<p class="animus-muted">No close figure matches on this map.</p>') +
      '<div class="section-label">Countries you sit near</div>' + (simpleCtry || '<p class="animus-muted">No close country matches on this map.</p>') +
      '</section>' +
      '<section class="animus-pol-complex is-hidden" data-depth-pane="complex">' +
      '<p class="panel-sub">Same simple cards, then the full stack: distances, more names, parties, and Plus interpretation.</p>' +
      '<div class="animus-card"><div class="animus-card-kicker">Still the simple read</div><p>Premium does not hide the free cards. Scroll for depth.</p></div>' +
      '<div class="section-label">People you sit near</div>' + (simpleFigs || '') +
      '<div class="section-label">Expanded figures</div>' + (complexFigs || '') +
      '<div class="section-label">Countries you sit near</div>' + (simpleCtry || '') +
      '<div class="section-label">Expanded countries</div>' + (complexCtry || '') +
      (ai.politicalThinkers && ai.politicalThinkers.length ? card({ kicker: 'Thinkers', title: 'Intellectual neighborhood', body: polList(ai.politicalThinkers) }) : '') +
      (ai.similarParties && ai.similarParties.length ? card({ kicker: 'Parties', title: 'Platform rhymes', body: polList(ai.similarParties) }) : '') +
      (ai.similarPoliticians && ai.similarPoliticians.length ? card({ kicker: 'Named politicians (AI)', title: 'Additional names', body: polList(ai.similarPoliticians) }) : '') +
      (ai.similarCountries && ai.similarCountries.length ? card({ kicker: 'Named countries (AI)', title: 'Additional countries', body: polList(ai.similarCountries) }) : '') +
      '<div id="culturalModule"></div>' +
      '<div id="deeperInsightMount"></div>' +
      '</section>'
    );
  }

  function bindCompassAndDepth(root) {
    if (!root) return;
    root.querySelectorAll('[data-depth]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var depth = btn.getAttribute('data-depth');
        root.querySelectorAll('[data-depth]').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        root.querySelectorAll('[data-depth-pane]').forEach(function (pane) {
          pane.classList.toggle('is-hidden', pane.getAttribute('data-depth-pane') !== depth);
        });
      });
    });
    var block = root.querySelector('[data-compass-block]');
    if (block) {
      block.querySelectorAll('[data-compass-view]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var view = btn.getAttribute('data-compass-view');
          block.querySelectorAll('[data-compass-view]').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
          block.querySelectorAll('[data-pane]').forEach(function (pane) {
            pane.classList.toggle('is-hidden', pane.getAttribute('data-pane') !== view);
          });
        });
      });
      var scene = block.querySelector('.c3d-scene');
      var yaw = -28;
      block.querySelectorAll('[data-rot]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          yaw += Number(btn.getAttribute('data-rot')) || 0;
          if (scene) scene.style.setProperty('--c3d-yaw', yaw + 'deg');
        });
      });
    }
  }

  g.AnimusResultsUI = {
    card: card,
    scoreCard: scoreCard,
    traitCard: traitCard,
    similarityCard: similarityCard,
    figureCard: figureCard,
    insightCard: insightCard,
    distributionCard: distributionCard,
    groupDynamicCard: groupDynamicCard,
    legacyNote: legacyNote,
    compassSvg: compassSvg,
    compassBlockHtml: compassBlockHtml,
    culturalSlider: culturalSlider,
    matchCardsHtml: matchCardsHtml,
    collectMatches: collectMatches,
    simpleMatchMeaning: simpleMatchMeaning,
    politicalPanelHtml: politicalPanelHtml,
    bindCompassAndDepth: bindCompassAndDepth
  };
})(typeof window !== 'undefined' ? window : globalThis);
