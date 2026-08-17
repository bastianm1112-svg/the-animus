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
        kicker: 'Deeper Insight',
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
      '<div class="animus-card-kicker">Cultural axis (Plus)</div>' +
      '<div class="animus-cultural-track"><span style="left:' + pct + '%"></span></div>' +
      '<div class="animus-cultural-ends"><span>Traditional</span><span>Progressive</span></div>' +
      '<p>' + esc(g.AnimusPolitical ? g.AnimusPolitical.culturalLabel(z) : '') + ' · ' + Math.round(z) + '</p>' +
      '</div>'
    );
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
    culturalSlider: culturalSlider
  };
})(typeof window !== 'undefined' ? window : globalThis);
