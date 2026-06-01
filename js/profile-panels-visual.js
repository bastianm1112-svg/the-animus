/* Overview, Cognition, Personality, Philosophy — visual profile panels */
(function (g) {
  'use strict';

  var FN_ORDER = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
  var FN_CLASS = { Ni: 'fn-ni', Ne: 'fn-ne', Ti: 'fn-ti', Te: 'fn-te', Fi: 'fn-fi', Fe: 'fn-fe', Si: 'fn-si', Se: 'fn-se' };
  var FN_TIP = {
    Ni: 'Pattern recognition · long-range vision',
    Ne: 'Possibilities · lateral connections',
    Ti: 'Internal logic · precision',
    Te: 'Systems · efficiency',
    Fi: 'Personal values · authenticity',
    Fe: 'Harmony · social attunement',
    Si: 'Memory · procedure',
    Se: 'Present moment · sensory mastery'
  };

  var PHI_ORDER = ['PH_NIE', 'PH_EXI', 'PH_ARI', 'PH_KAN', 'PH_STO', 'PH_PRA', 'PH_SKE', 'PH_EPI'];
  var PHI_LABELS = {
    PH_STO: 'Stoic', PH_EPI: 'Epicurean', PH_KAN: 'Kantian', PH_ARI: 'Aristotelian',
    PH_NIE: 'Nietzschean', PH_EXI: 'Existentialist', PH_PRA: 'Pragmatist', PH_SKE: 'Skeptic'
  };

  var ETH_LABELS = { ET_VIR: 'Virtue', ET_CON: 'Consequentialist', ET_DEO: 'Deontological', ET_EGO: 'Egoist' };
  var TMP_LABELS = { TMP_MEL: 'Melancholic', TMP_CHO: 'Choleric', TMP_PHL: 'Phlegmatic', TMP_SAN: 'Sanguine' };
  var ENN_ORDER = ['E1', 'E6', 'E5', 'E8', 'E2', 'E3', 'E4', 'E7', 'E9'];

  function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pron(isOwner) {
    return {
      subj: isOwner ? 'You' : 'They',
      subjL: isOwner ? 'you' : 'they',
      poss: isOwner ? 'Your' : 'Their',
      possL: isOwner ? 'your' : 'their'
    };
  }

  function narr(voice, text, isOwner) {
    if (!text) return '';
    return voice && voice.narrativeForViewer ? voice.narrativeForViewer(text, isOwner) : text;
  }

  function topKey(obj) {
    if (!obj) return null;
    return Object.keys(obj).sort(function (a, b) { return (obj[b] || 0) - (obj[a] || 0); })[0];
  }

  function buildFnWheel(cog) {
    if (!cog) return '';
    var sorted = FN_ORDER.slice().sort(function (a, b) { return (cog[b] || 0) - (cog[a] || 0); });
    var slices = FN_ORDER.map(function (fn, i) {
      var v = Math.min(100, Math.max(0, Math.round(cog[fn] || 0)));
      var angle = (i / 8) * 360;
      return '<div class="fn-wheel-spoke" style="--spoke-angle:' + angle + 'deg;--spoke-val:' + v + '%">'
        + '<div class="fn-wheel-bar ' + (FN_CLASS[fn] || '') + '"></div>'
        + '<span class="fn-wheel-label">' + fn + '</span></div>';
    }).join('');
    var center = '<div class="fn-wheel-center"><span class="fn-wheel-dom">' + escapeHTML(sorted[0]) + '</span>'
      + '<span class="fn-wheel-sub">dominant</span></div>';
    return '<div class="fn-wheel-wrap">' + center + '<div class="fn-wheel-ring">' + slices + '</div></div>';
  }

  function buildBig5Visual(big5) {
    if (!big5) return '';
    var keys = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
    var short = ['O', 'C', 'E', 'A', 'N'];
    return '<div class="b5-pentagon">' + keys.map(function (k, i) {
      var v = Math.round(big5[k] || 0);
      return '<div class="b5-cell"><div class="b5-letter">' + short[i] + '</div>'
        + '<div class="b5-track"><div class="b5-fill" data-w="' + v + '"></div></div>'
        + '<div class="b5-name">' + escapeHTML(k) + '</div><div class="b5-val">' + v + '</div></div>';
    }).join('') + '</div>';
  }

  function buildEnnRing(enn, coreType, wing) {
    var nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var cells = nums.map(function (n) {
      var key = 'E' + n;
      var v = enn && enn[key] !== undefined ? Math.round(enn[key]) : 0;
      var isCore = String(coreType) === String(n);
      var isWing = String(wing) === String(n);
      var cls = 'enn-ring-cell' + (isCore ? ' enn-ring-core' : '') + (isWing ? ' enn-ring-wing' : '');
      return '<div class="' + cls + '"><span class="enn-ring-num">' + n + '</span>'
        + '<div class="enn-ring-bar"><div class="enn-ring-fill" data-w="' + v + '"></div></div></div>';
    }).join('');
    return '<div class="enn-ring-grid">' + cells + '</div>';
  }

  function buildPhiRadar(phiS) {
    if (!phiS) return '';
    var cx = 110;
    var cy = 110;
    var maxR = 68;
    var points = PHI_ORDER.map(function (k, i) {
      var angle = (-90 + i * 45) * Math.PI / 180;
      var r = ((phiS[k] || 0) / 100) * maxR;
      return (cx + Math.cos(angle) * r).toFixed(1) + ',' + (cy + Math.sin(angle) * r).toFixed(1);
    }).join(' ');
    return '<svg class="phi-radar-svg" viewBox="0 0 220 220"><polygon points="' + points
      + '" fill="rgba(200,169,110,0.2)" stroke="#c8a96e" stroke-width="1.5"/>'
      + PHI_ORDER.map(function (k, i) {
        var angle = (-90 + i * 45) * Math.PI / 180;
        var lx = cx + Math.cos(angle) * 82;
        var ly = cy + Math.sin(angle) * 82;
        return '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="9" fill="var(--muted2)">'
          + escapeHTML(PHI_LABELS[k]) + '</text>';
      }).join('') + '</svg>';
  }

  function renderOverview(snap, isOwner, voice, displayName) {
    var root = document.getElementById('overviewPanelRoot');
    if (!root) return;
    var p = pron(isOwner);

    if (!snap || !snap.mbti) {
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Overview</div>'
        + '<p>Complete the assessment to unlock ' + p.possL + ' full profile.</p></div>';
      return;
    }

    var cog = snap.cog || {};
    var domFn = topKey(cog) || '—';
    var insightsHtml = '';
    if (typeof g.AnimusProfileSections !== 'undefined') {
      var blocks = g.AnimusProfileSections.buildInsights(snap, isOwner, displayName, voice);
      insightsHtml = blocks.length ? '<div class="insights-grid">' + blocks.map(function (b) {
        return '<article class="insight-block"><div class="insight-kicker">' + escapeHTML(b.kicker) + '</div>'
          + '<div class="insight-title">' + escapeHTML(b.title) + '</div>'
          + '<div class="insight-body">' + b.body.replace(/<strong>/g, '<strong style="color:var(--white)">') + '</div>'
          + '<div class="insight-metrics">' + b.metrics.map(function (m) {
            return '<span class="insight-metric"><strong>' + escapeHTML(m[0]) + '</strong>' + escapeHTML(m[1]) + '</span>';
          }).join('') + '</div></article>';
      }).join('') + '</div>' : '';
    }

    var valuesHtml = (snap.values && snap.values.length)
      ? '<div class="values-cloud">' + snap.values.map(function (v) {
        return '<span class="value-pill">' + escapeHTML(v) + '</span>';
      }).join('') + '</div>' : '';

    root.innerHTML = ''
      + '<div class="overview-hero-stats">'
      + '<div class="oh-stat"><span class="oh-big">' + escapeHTML(snap.mbti) + '</span><span class="oh-lbl">MBTI</span></div>'
      + '<div class="oh-stat"><span class="oh-big">' + escapeHTML((snap.ennType || '—') + 'w' + (snap.ennWing || '')) + '</span><span class="oh-lbl">Enneagram</span></div>'
      + '<div class="oh-stat"><span class="oh-big">' + escapeHTML(domFn) + '</span><span class="oh-lbl">Dominant Fn</span></div>'
      + '</div>'
      + insightsHtml
      + '<div class="card"><div class="card-title">Tagline</div>'
      + '<p class="overview-tagline">' + escapeHTML(narr(voice, snap.tagline || '', isOwner)) + '</p></div>'
      + '<div class="overview-trio">'
      + '<div class="overview-story-card"><div class="overview-story-icon alone-icon"></div><div class="card-title" data-voice-title-you="Alone — YOUR Inner World" data-voice-title-they="Alone — Their Inner World">Inner world</div>'
      + '<p>' + escapeHTML(narr(voice, snap.aloneDesc || '—', isOwner)) + '</p></div>'
      + '<div class="overview-story-card"><div class="overview-story-icon social-icon"></div><div class="card-title" data-voice-title-you="With Others — YOUR Social Presence" data-voice-title-they="With Others — Their Social Presence">With others</div>'
      + '<p>' + escapeHTML(narr(voice, snap.socialDesc || '—', isOwner)) + '</p></div>'
      + '<div class="overview-story-card shadow-card"><div class="overview-story-icon shadow-icon"></div><div class="card-title" data-voice-title-you="YOUR Shadow" data-voice-title-they="Their Shadow">Shadow</div>'
      + '<p>' + escapeHTML(narr(voice, snap.shadowDesc || '—', isOwner)) + '</p></div>'
      + '</div>'
      + (valuesHtml ? '<div class="card"><div class="card-title">Core values</div>' + valuesHtml + '</div>' : '');

    if (typeof g.AnimusProfileVoice !== 'undefined') {
      g.AnimusProfileVoice.applyProfileVoice(isOwner, displayName);
    }
  }

  function renderCognition(snap, isOwner, voice, displayName) {
    var root = document.getElementById('cognitionPanelRoot');
    if (!root) return;
    var p = pron(isOwner);
    var name = (displayName || '').trim() || 'This person';

    if (!snap || !snap.mbti) {
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Cognition</div><p>'
        + (isOwner ? 'Complete the assessment to see your cognitive profile.' : name + ' has not completed an assessment for this section.') + '</p></div>';
      return;
    }

    var cog = snap.cog || {};
    var sorted = FN_ORDER.slice().sort(function (a, b) { return cog[b] - cog[a]; });
    var stackLabels = ['Dominant', 'Auxiliary', 'Tertiary', 'Inferior'];

    root.innerHTML = ''
      + '<p class="section-lead">' + escapeHTML(narr(voice, p.subj + ' process reality through <strong>' + sorted[0] + '</strong> first — the function stack below ranks all eight cognitive tools.', isOwner)) + '</p>'
      + (snap.cogNarrative ? '<div class="narrative"><div class="narrative-title">Cognitive analysis</div><div class="narrative-text">'
        + escapeHTML(narr(voice, snap.cogNarrative, isOwner)) + '</div></div>' : '')
      + '<div class="cog-layout">'
      + '<div class="card"><div class="card-title">Function wheel</div>' + buildFnWheel(cog) + '</div>'
      + '<div class="card"><div class="card-title">Stack</div><div class="stack-ladder">'
      + sorted.slice(0, 4).map(function (fn, i) {
        return '<div class="stack-rung"><span class="stack-rank">' + stackLabels[i] + '</span>'
          + '<span class="stack-fn ' + (FN_CLASS[fn] || '') + '">' + fn + '</span>'
          + '<span class="stack-score">' + Math.round(cog[fn] || 0) + '</span></div>';
      }).join('') + '</div></div></div>'
      + '<div class="card"><div class="card-title">Big Five</div>' + buildBig5Visual(snap.big5) + '</div>'
      + '<div class="cog-badges">'
      + '<div class="type-badge-lg"><span class="tb-label">Socionics</span><strong>' + escapeHTML(snap.socionics || '—') + '</strong></div>'
      + '<div class="type-badge-lg"><span class="tb-label">Keirsey</span><strong>' + escapeHTML(snap.keirsey || '—') + '</strong></div>'
      + '</div>'
      + '<div class="card"><div class="card-title">All functions — ranked</div><div class="fn-bar-list">'
      + sorted.map(function (fn) {
        var v = Math.round(cog[fn] || 0);
        return '<div class="fn-bar-row"><span class="fn-bar-name ' + (FN_CLASS[fn] || '') + '">' + fn + '</span>'
          + '<div class="fn-bar-track"><div class="fn-bar-fill ' + (FN_CLASS[fn] || '') + '" data-w="' + v + '"></div></div>'
          + '<span class="fn-bar-num">' + v + '</span>'
          + '<span class="fn-bar-tip">' + escapeHTML(FN_TIP[fn] || '') + '</span></div>';
      }).join('') + '</div></div>';
  }

  function renderPersonality(snap, isOwner, voice, displayName) {
    var root = document.getElementById('personalityPanelRoot');
    if (!root) return;
    var p = pron(isOwner);
    var name = (displayName || '').trim() || 'This person';

    if (!snap || !snap.mbti) {
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Personality</div><p>'
        + (isOwner ? 'Complete the assessment to see your enneagram and temperament profile.' : name + ' has not completed an assessment for this section.') + '</p></div>';
      return;
    }

    var attLabels = { AT_SEC: 'Secure', AT_ANX: 'Anxious', AT_AVO: 'Avoidant', AT_DIS: 'Dismissive' };

    root.innerHTML = ''
      + '<p class="section-lead">' + escapeHTML(narr(voice, 'Enneagram intensity across all nine types — peaks show motivation, not just the core type.', isOwner)) + '</p>'
      + (snap.ennNarrative ? '<div class="narrative"><div class="narrative-title">Enneagram</div><div class="narrative-text">'
        + escapeHTML(narr(voice, snap.ennNarrative, isOwner)) + '</div></div>' : '')
      + '<div class="enn-hero card">'
      + '<div class="enn-hero-type"><span class="enn-hero-big">' + escapeHTML(snap.ennType || '—') + '</span>'
      + '<span class="enn-hero-wing">w' + escapeHTML(snap.ennWing || '') + '</span></div>'
      + '<div class="enn-hero-meta"><div><span class="meta-lbl">Tritype</span><strong>' + escapeHTML(snap.ennTritype || '—') + '</strong></div>'
      + '<div><span class="meta-lbl">Instinct</span><strong>' + escapeHTML(snap.instStack || '—') + '</strong></div>'
      + '<div><span class="meta-lbl">Attachment</span><strong>' + escapeHTML(attLabels[snap.att] || '—') + '</strong></div></div></div>'
      + '<div class="pers-layout">'
      + '<div class="card"><div class="card-title">Type intensity map</div>' + buildEnnRing(snap.enn, snap.ennType, snap.ennWing) + '</div>'
      + '<div class="card"><div class="card-title">Temperament blend</div><div class="tmp-visual">'
      + (snap.tmp ? Object.keys(TMP_LABELS).map(function (k) {
        var v = Math.round(snap.tmp[k] || 0);
        return '<div class="tmp-row"><span>' + escapeHTML(TMP_LABELS[k]) + '</span>'
          + '<div class="tmp-track"><div class="tmp-fill" data-w="' + v + '"></div></div><em>' + v + '</em></div>';
      }).join('') : '<p class="muted">—</p>') + '</div></div></div>'
      + (snap.attNarrative ? '<div class="card"><div class="card-title">Attachment</div><p class="att-blurb">'
        + escapeHTML(narr(voice, snap.attNarrative, isOwner)) + '</p></div>' : '');
  }

  function renderPhilosophy(snap, isOwner, voice, displayName) {
    var root = document.getElementById('philosophyPanelRoot');
    if (!root) return;
    var p = pron(isOwner);
    var name = (displayName || '').trim() || 'This person';

    if (!snap || !snap.mbti) {
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Philosophy</div><p>'
        + (isOwner ? 'Complete the assessment to see your philosophical orientation.' : name + ' has not completed an assessment for this section.') + '</p></div>';
      return;
    }

    var phiTop = snap.phiS ? topKey(snap.phiS) : snap.phi;
    var phiName = PHI_LABELS[phiTop] || (phiTop || '').replace('PH_', '') || '—';

    root.innerHTML = ''
      + '<p class="section-lead">' + escapeHTML(
        isOwner
          ? 'Philosophical schools scored in parallel — the shape shows where your moral reasoning anchors.'
          : 'Philosophical schools scored in parallel — the shape shows where ' + name + "'s moral reasoning anchors."
      ) + '</p>'
      + (snap.phiNarrative ? '<div class="narrative"><div class="narrative-title">' + escapeHTML(phiName) + ' orientation</div><div class="narrative-text">'
        + escapeHTML(narr(voice, snap.phiNarrative, isOwner)) + '</div></div>' : '')
      + '<div class="phi-layout">'
      + '<div class="card phi-radar-card"><div class="card-title">School radar</div>'
      + '<div class="phi-radar-wrap">' + buildPhiRadar(snap.phiS) + '</div>'
      + '<div class="phi-dominant">Dominant: <strong>' + escapeHTML(phiName) + '</strong></div></div>'
      + '<div class="card"><div class="card-title">School scores</div><div class="phi-bars">'
      + PHI_ORDER.map(function (k) {
        var v = snap.phiS ? Math.round(snap.phiS[k] || 0) : 0;
        return '<div class="phi-bar-row"><span>' + escapeHTML(PHI_LABELS[k]) + '</span>'
          + '<div class="phi-track"><div class="phi-fill" data-w="' + v + '"></div></div><em>' + v + '</em></div>';
      }).join('') + '</div></div></div>'
      + (snap.eth ? '<div class="card"><div class="card-title">Ethics</div><div class="eth-bars">'
        + Object.keys(ETH_LABELS).map(function (k) {
          var v = Math.round(snap.eth[k] || 0);
          return '<div class="eth-row"><span>' + escapeHTML(ETH_LABELS[k]) + '</span>'
            + '<div class="eth-track"><div class="eth-fill" data-w="' + v + '"></div></div><em>' + v + '</em></div>';
        }).join('') + '</div></div>' : '')
      + (snap.mf ? '<div class="card"><div class="card-title">Moral foundations (overview)</div><div class="mf-mini-grid">'
        + ['MF_CARE', 'MF_FAIR', 'MF_LIB', 'MF_LOY', 'MF_AUTH', 'MF_PUR'].map(function (k) {
          var labels = { MF_CARE: 'Care', MF_FAIR: 'Fair', MF_LIB: 'Liberty', MF_LOY: 'Loyalty', MF_AUTH: 'Authority', MF_PUR: 'Sanctity' };
          var v = Math.round(snap.mf[k] || 0);
          return '<div class="mf-mini"><span>' + escapeHTML(labels[k]) + '</span><div class="mf-mini-track"><div class="mf-mini-fill" data-w="' + v + '"></div></div></div>';
        }).join('') + '</div></div>' : '');
  }

  function renderAll(snap, isOwner, voice, displayName) {
    renderOverview(snap, isOwner, voice, displayName);
    renderCognition(snap, isOwner, voice, displayName);
    renderPersonality(snap, isOwner, voice, displayName);
    renderPhilosophy(snap, isOwner, voice, displayName);
    setTimeout(function () {
      if (typeof g.animateBars === 'function') g.animateBars();
      document.querySelectorAll('[data-w]').forEach(function (el) {
        if (el.classList.contains('b5-fill') || el.classList.contains('fn-bar-fill') || el.classList.contains('phi-fill')
          || el.classList.contains('eth-fill') || el.classList.contains('tmp-fill') || el.classList.contains('enn-ring-fill')) {
          el.style.width = el.getAttribute('data-w') + '%';
        }
      });
    }, 150);
  }

  g.AnimusProfilePanels = { renderAll: renderAll };
})(typeof window !== 'undefined' ? window : globalThis);
