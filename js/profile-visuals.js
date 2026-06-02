/* Political, Social, and Figures profile panels — rich visuals */
(function (g) {
  'use strict';

  var MF_META = [
    { key: 'MF_CARE', label: 'Care', angle: -90 },
    { key: 'MF_FAIR', label: 'Fairness', angle: -30 },
    { key: 'MF_LIB', label: 'Liberty', angle: 30 },
    { key: 'MF_LOY', label: 'Loyalty', angle: 90 },
    { key: 'MF_AUTH', label: 'Authority', angle: 150 },
    { key: 'MF_PUR', label: 'Sanctity', angle: 210 }
  ];

  var ATT_STYLES = {
    AT_SEC: { label: 'Secure', short: 'SEC', x: 1, y: 0, color: '#4a9e6a' },
    AT_ANX: { label: 'Anxious', short: 'ANX', x: 1, y: 1, color: '#c8a96e' },
    AT_AVO: { label: 'Avoidant', short: 'AVO', x: 0, y: 1, color: '#7c5cbf' },
    AT_DIS: { label: 'Dismissive', short: 'DIS', x: 0, y: 0, color: '#5a7a9a' }
  };

  var SOC_LABELS = {
    SOC_DOM: 'Dominant', SOC_INT: 'Influential', SOC_WAR: 'Warm', SOC_DIR: 'Direct'
  };

  var AL_LABELS = {
    AL_INT: 'Introspective', AL_SEN: 'Sensitive'
  };

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
      possL: isOwner ? 'your' : 'their',
      verb: isOwner ? 'sit' : 'sits',
      lean: isOwner ? 'lean' : 'leans'
    };
  }

  function narr(voice, text, isOwner) {
    if (!text) return '';
    return voice && voice.narrativeForViewer ? voice.narrativeForViewer(text, isOwner) : text;
  }

  function quadrantInfo(polX, polY) {
    var econ = polX > 10 ? 'Right' : polX < -10 ? 'Left' : 'Center';
    var auth = polY > 10 ? 'Authoritarian' : polY < -10 ? 'Libertarian' : 'Moderate';
    var slug = (auth + ' ' + econ).trim();
    var colors = {
      'Libertarian Left': '#3d6b8a',
      'Libertarian Right': '#4a7a5a',
      'Authoritarian Left': '#8a3d3d',
      'Authoritarian Right': '#8a6f3e',
      'Moderate Center': '#6b6259',
      'Libertarian Center': '#4a6a7a',
      'Authoritarian Center': '#7a5a5a',
      'Moderate Left': '#5a6a8a',
      'Moderate Right': '#6a7a5a'
    };
    return {
      title: slug === 'Moderate Center' || slug === 'Authoritarian Center' || slug === 'Libertarian Center'
        ? 'Political Center'
        : slug,
      econ: econ,
      auth: auth,
      color: colors[slug] || 'var(--gold2)'
    };
  }

  function buildCompassSvg(polX, polY) {
    var cx = Math.max(12, Math.min(188, 100 + (polX || 0)));
    var cy = Math.max(12, Math.min(188, 100 - (polY || 0)));
    return ''
      + '<svg class="pol-compass-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<defs><radialGradient id="polDotGlow"><stop offset="0%" stop-color="#f0d090" stop-opacity="0.9"/>'
      + '<stop offset="100%" stop-color="#c8a96e" stop-opacity="0"/></radialGradient></defs>'
      + '<rect width="200" height="200" fill="var(--surface2)"/>'
      + '<rect x="0" y="0" width="100" height="100" fill="rgba(140,50,50,0.22)"/>'
      + '<rect x="100" y="0" width="100" height="100" fill="rgba(160,120,40,0.18)"/>'
      + '<rect x="0" y="100" width="100" height="100" fill="rgba(40,80,130,0.22)"/>'
      + '<rect x="100" y="100" width="100" height="100" fill="rgba(40,100,60,0.22)"/>'
      + '<line x1="100" y1="8" x2="100" y2="192" stroke="var(--border2)" stroke-width="1"/>'
      + '<line x1="8" y1="100" x2="192" y2="100" stroke="var(--border2)" stroke-width="1"/>'
      + '<text x="100" y="16" text-anchor="middle" fill="var(--muted)" font-size="7" letter-spacing="1.2">AUTHORITARIAN</text>'
      + '<text x="100" y="196" text-anchor="middle" fill="var(--muted)" font-size="7" letter-spacing="1.2">LIBERTARIAN</text>'
      + '<text x="14" y="104" fill="var(--muted)" font-size="7">LEFT</text>'
      + '<text x="168" y="104" fill="var(--muted)" font-size="7">RIGHT</text>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="22" fill="url(#polDotGlow)" opacity="0.5"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="16" fill="none" stroke="rgba(200,169,110,0.35)" stroke-width="1"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#c8a96e" stroke="#f0ece4" stroke-width="1.5"/>'
      + '</svg>';
  }

  function buildMfRadar(mf) {
    if (!mf) return '';
    var cx = 120;
    var cy = 120;
    var maxR = 72;
    var points = [];
    var labels = [];
    MF_META.forEach(function (m) {
      var v = Math.max(0, Math.min(100, mf[m.key] || 0));
      var rad = (m.angle * Math.PI) / 180;
      var r = (v / 100) * maxR;
      var x = cx + Math.cos(rad) * r;
      var y = cy + Math.sin(rad) * r;
      points.push(x.toFixed(1) + ',' + y.toFixed(1));
      var lx = cx + Math.cos(rad) * (maxR + 18);
      var ly = cy + Math.sin(rad) * (maxR + 18);
      labels.push(
        '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" dominant-baseline="middle" '
        + 'fill="var(--muted2)" font-size="9" letter-spacing="0.05em">' + escapeHTML(m.label) + '</text>'
      );
    });
    var grid = [0.33, 0.66, 1].map(function (scale) {
      var gp = MF_META.map(function (m) {
        var rad = (m.angle * Math.PI) / 180;
        var r = maxR * scale;
        return (cx + Math.cos(rad) * r).toFixed(1) + ',' + (cy + Math.sin(rad) * r).toFixed(1);
      }).join(' ');
      return '<polygon points="' + gp + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
    }).join('');
    return ''
      + '<svg class="mf-radar-svg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">'
      + grid
      + '<polygon points="' + points.join(' ') + '" fill="rgba(200,169,110,0.18)" stroke="#c8a96e" stroke-width="1.5"/>'
      + labels.join('')
      + '</svg>';
  }

  var COUNTRY_FLAGS = {
    'USA': '🇺🇸', 'United States': '🇺🇸', 'US': '🇺🇸',
    'UK': '🇬🇧', 'United Kingdom': '🇬🇧', 'Britain': '🇬🇧',
    'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Italy': '🇮🇹',
    'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
    'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹',
    'Poland': '🇵🇱', 'Hungary': '🇭🇺', 'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
    'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'China': '🇨🇳', 'Japan': '🇯🇵',
    'India': '🇮🇳', 'South Korea': '🇰🇷', 'Taiwan': '🇹🇼', 'Singapore': '🇸🇬',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿', 'Canada': '🇨🇦', 'Mexico': '🇲🇽',
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
    'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Egypt': '🇪🇬',
    'Israel': '🇮🇱', 'Turkey': '🇹🇷', 'Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦',
    'Greece': '🇬🇷', 'Portugal': '🇵🇹', 'Ireland': '🇮🇪', 'Iceland': '🇮🇸'
  };

  function stripPolPrefix(item) {
    var s = String(item || '');
    var m = s.match(/^Profile axis[^:]*:\s*/i);
    return m ? s.slice(m[0].length).trim() : s.trim();
  }

  function parsePolEntry(item) {
    var s = stripPolPrefix(item);
    var colon = s.indexOf(':');
    var label = colon >= 0 ? s.slice(0, colon).trim() : s;
    var reason = colon >= 0 ? s.slice(colon + 1).trim() : '';
    var name = label;
    var country = '';
    var paren = label.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (paren) {
      name = paren[1].trim();
      country = paren[2].trim();
    }
    return { name: name, country: country, reason: reason };
  }

  function countryFlag(name, country) {
    var key = country || name;
    return COUNTRY_FLAGS[key] || COUNTRY_FLAGS[name] || '🌐';
  }

  function ensurePoliticalAlignments(snap) {
    var out = {
      countries: Array.isArray(snap.similarCountries) ? snap.similarCountries.slice() : [],
      parties: Array.isArray(snap.similarParties) ? snap.similarParties.slice() : [],
      politicians: Array.isArray(snap.similarPoliticians) ? snap.similarPoliticians.slice() : [],
      thinkers: Array.isArray(snap.politicalThinkers) ? snap.politicalThinkers.slice() : []
    };
    var need = !out.countries.length || !out.parties.length || !out.politicians.length;
    if (need && typeof g.AnimusCross !== 'undefined' && g.AnimusCross.buildPoliticalComparisons) {
      var cmp = g.AnimusCross.buildPoliticalComparisons(snap.polX, snap.polY);
      if (!out.countries.length) out.countries = cmp.similarCountries || [];
      if (!out.parties.length) out.parties = cmp.similarParties || [];
      if (!out.politicians.length) out.politicians = cmp.similarPoliticians || [];
      if (!out.thinkers.length) out.thinkers = cmp.politicalThinkers || [];
    }
    return out;
  }

  function buildPolAlignSection(title, subtitle, items, kind) {
    if (!items || !items.length) return '';
    var cards = items.slice(0, 8).map(function (item, i) {
      var p = parsePolEntry(item);
      var icon = '';
      if (kind === 'country') {
        icon = '<span class="pol-align-flag" aria-hidden="true">' + countryFlag(p.name, p.country) + '</span>';
      } else if (kind === 'party') {
        icon = '<span class="pol-align-icon pol-align-icon-party" aria-hidden="true">'
          + escapeHTML((p.country || p.name).charAt(0)) + '</span>';
      } else if (kind === 'thinker') {
        icon = '<span class="pol-align-icon pol-align-icon-thinker" aria-hidden="true">'
          + escapeHTML(p.name.charAt(0)) + '</span>';
      } else {
        icon = '<span class="pol-align-icon pol-align-icon-person" aria-hidden="true">'
          + escapeHTML(p.name.charAt(0)) + '</span>';
      }
      return '<article class="pol-align-card" style="--pol-card-delay:' + (i * 50) + 'ms">'
        + icon
        + '<div class="pol-align-body">'
        + '<div class="pol-align-name">' + escapeHTML(p.name)
        + (p.country ? '<span class="pol-align-meta">' + escapeHTML(p.country) + '</span>' : '')
        + '</div>'
        + (p.reason ? '<p class="pol-align-reason">' + escapeHTML(p.reason) + '</p>' : '')
        + '</div></article>';
    }).join('');
    return '<div class="card pol-align-section pol-align-' + kind + '">'
      + '<div class="card-title">' + escapeHTML(title) + '</div>'
      + (subtitle ? '<p class="pol-align-sub">' + escapeHTML(subtitle) + '</p>' : '')
      + '<div class="pol-align-grid">' + cards + '</div></div>';
  }

  function axisTrack(label, value, negativeLabel, positiveLabel) {
    var v = Math.max(-100, Math.min(100, value || 0));
    var markerLeft = 50 + (v / 2);
    var fillW = Math.abs(v) / 2;
    var fillSide = v >= 0 ? 'right' : 'left';
    return ''
      + '<div class="pol-axis-row">'
      + '<div class="pol-axis-labels"><span>' + escapeHTML(negativeLabel) + '</span><span>' + escapeHTML(label) + '</span><span>' + escapeHTML(positiveLabel) + '</span></div>'
      + '<div class="pol-axis-track"><div class="pol-axis-mid"></div>'
      + '<div class="pol-axis-fill pol-axis-fill-' + fillSide + '" style="width:' + fillW + '%"></div>'
      + '<div class="pol-axis-marker" style="left:' + markerLeft + '%"></div></div>'
      + '<div class="pol-axis-val">' + Math.round(v) + '</div></div>';
  }

  function renderPolitical(snap, isOwner, voice) {
    var root = document.getElementById('politicalPanelRoot');
    if (!root) return;
    var p = pron(isOwner);

    if (!snap || !snap.mbti || typeof snap.polX !== 'number') {
      var polEmpty = isOwner
        ? 'Complete the assessment to map your economic and social position.'
        : 'Political compass data will appear after they complete the assessment.';
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Political compass</div>'
        + '<p>' + polEmpty + '</p></div>';
      return;
    }

    var q = quadrantInfo(snap.polX, snap.polY);
    var polText = snap.politicalNarrative
      ? narr(voice, snap.politicalNarrative, isOwner)
      : narr(voice, p.subj + ' ' + p.verb + ' in the <strong>' + q.title + '</strong> quadrant — '
        + p.lean + ' ' + q.auth.toLowerCase() + ' on authority and ' + q.econ.toLowerCase() + ' on economics.', isOwner);

    root.innerHTML = ''
      + '<div class="pol-hero" style="--pol-accent:' + q.color + '">'
      + '<div class="pol-hero-kicker">Political identity</div>'
      + '<div class="pol-hero-title">' + escapeHTML(q.title) + '</div>'
      + '<div class="pol-hero-chips">'
      + '<span class="pol-chip">' + escapeHTML(q.auth) + '</span>'
      + '<span class="pol-chip">' + escapeHTML(q.econ) + '</span></div></div>'
      + (polText ? '<div class="narrative pol-narrative"><div class="narrative-title">What this means for you</div><div class="narrative-sub">Political compass</div><div class="narrative-text">' + polText + '</div></div>' : '')
      + '<div class="pol-layout">'
      + '<div class="card pol-compass-card"><div class="card-title">Compass position</div>'
      + '<div class="pol-compass-wrap">' + buildCompassSvg(snap.polX, snap.polY) + '</div>'
      + '<div class="pol-quad-legend">'
      + '<span class="pol-quad tl">Auth Left</span><span class="pol-quad tr">Auth Right</span>'
      + '<span class="pol-quad bl">Lib Left</span><span class="pol-quad br">Lib Right</span>'
      + '</div></div>'
      + '<div class="card pol-axes-card"><div class="card-title">Axis intensity</div>'
      + axisTrack('Economic', snap.polX, 'Left', 'Right')
      + axisTrack('Social', snap.polY, 'Libertarian', 'Authoritarian')
      + '</div></div>'
      + (snap.mf ? '<div class="card pol-mf-card"><div class="card-title">Moral foundations</div>'
        + '<div class="pol-mf-layout"><div class="mf-radar-wrap">' + buildMfRadar(snap.mf) + '</div>'
        + '<div class="mf-bar-list">' + MF_META.map(function (m) {
          var v = Math.round(snap.mf[m.key] || 0);
          return '<div class="mf-bar-item"><span>' + escapeHTML(m.label) + '</span>'
            + '<div class="mf-mini-track"><div class="mf-mini-fill" data-w="' + v + '"></div></div>'
            + '<strong>' + v + '</strong></div>';
        }).join('') + '</div></div></div>' : '');

    var align = ensurePoliticalAlignments(snap);
    var alignLead = narr(voice,
      'Beyond the compass, these parallels show where ' + p.possL + ' position rhymes globally — regimes, parties, and public figures, not endorsements.',
      isOwner);

    root.innerHTML += ''
      + '<div class="pol-align-wrap">'
      + '<p class="section-lead pol-align-lead">' + alignLead + '</p>'
      + buildPolAlignSection(
        'Similar countries',
        'Governance and policy cultures that echo ' + p.possL + ' economic and social axes.',
        align.countries,
        'country'
      )
      + buildPolAlignSection(
        'Political parties worldwide',
        'Parties from multiple regions whose platforms align with this profile.',
        align.parties,
        'party'
      )
      + buildPolAlignSection(
        'Political figures',
        'Historical and contemporary leaders with comparable positions.',
        align.politicians,
        'person'
      )
      + buildPolAlignSection(
        'Political thinkers',
        'Theorists whose arguments resonate with this orientation.',
        align.thinkers,
        'thinker'
      )
      + '</div>';
  }

  function buildAttachmentMap(att) {
    var cells = Object.keys(ATT_STYLES).map(function (k) {
      var s = ATT_STYLES[k];
      var active = att === k ? ' att-cell-active' : '';
      return '<div class="att-cell' + active + '" style="--att-color:' + s.color + '">'
        + '<span class="att-cell-label">' + escapeHTML(s.label) + '</span>'
        + (active ? '<span class="att-cell-badge">Core style</span>' : '')
        + '</div>';
    }).join('');
    return '<div class="att-map">' + cells + '</div>';
  }

  function dimBars(title, data, labels) {
    if (!data || !Object.keys(data).length) return '';
    var keys = Object.keys(labels);
    return '<div class="soc-dim-card"><div class="soc-dim-title">' + escapeHTML(title) + '</div>'
      + keys.map(function (k) {
        var v = Math.min(100, Math.max(0, Math.round(data[k] || 0)));
        return '<div class="soc-dim-row"><span>' + escapeHTML(labels[k]) + '</span>'
          + '<div class="soc-dim-track"><div class="soc-dim-fill" data-w="' + v + '"></div></div>'
          + '<em>' + v + '</em></div>';
      }).join('') + '</div>';
  }

  function renderSocial(snap, isOwner, voice) {
    var root = document.getElementById('socialPanelRoot');
    if (!root) return;
    var p = pron(isOwner);

    if (!snap || !snap.mbti) {
      var socEmpty = isOwner
        ? 'Complete the assessment to see how you show up alone vs with others.'
        : 'Social profile data will appear after they complete the assessment.';
      root.innerHTML = '<div class="viz-empty"><div class="viz-empty-title">Social profile</div>'
        + '<p>' + socEmpty + '</p></div>';
      return;
    }

    var att = snap.att || '';
    var attInfo = ATT_STYLES[att] || { label: '—', color: 'var(--gold)' };
    var aloneText = snap.aloneDesc ? escapeHTML(narr(voice, snap.aloneDesc, isOwner)) : '';
    var socialText = snap.socialDesc ? escapeHTML(narr(voice, snap.socialDesc, isOwner)) : '';
    var attText = snap.attNarrative ? escapeHTML(narr(voice, snap.attNarrative, isOwner)) : '';

    var aloneSum = 0;
    var socSum = 0;
    if (snap.alone) {
      aloneSum += (snap.alone.AL_INT || 0) + (snap.alone.AL_SEN || 0);
    }
    if (snap.soc) {
      socSum += (snap.soc.SOC_DOM || 0) + (snap.soc.SOC_INT || 0)
        + (snap.soc.SOC_WAR || 0) + (snap.soc.SOC_DIR || 0);
    }
    var total = aloneSum + socSum || 1;
    var alonePct = Math.round((aloneSum / total) * 100);
    var socPct = 100 - alonePct;

    root.innerHTML = ''
      + '<p class="section-lead">' + narr(voice, p.poss + ' social pattern spans inner life, public presence, and attachment — three lenses on the same person.', isOwner) + '</p>'
      + '<div class="social-energy card">'
      + '<div class="card-title">Alone vs with others</div>'
      + '<div class="social-energy-bar">'
      + '<div class="social-energy-alone" style="width:' + alonePct + '%"><span>Alone ' + alonePct + '%</span></div>'
      + '<div class="social-energy-with" style="width:' + socPct + '%"><span>With others ' + socPct + '%</span></div>'
      + '</div></div>'
      + '<div class="social-duo">'
      + '<div class="social-mode-card social-mode-alone">'
      + '<div class="social-mode-icon" aria-hidden="true">'
      + '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="24" cy="14" r="6"/>'
      + '<path d="M12 40c0-8 5-14 12-14s12 6 12 14"/></svg></div>'
      + '<div class="social-mode-head">Inner world</div>'
      + '<p class="social-mode-text">' + (aloneText || 'No alone-context narrative yet.') + '</p></div>'
      + '<div class="social-mode-card social-mode-with">'
      + '<div class="social-mode-icon" aria-hidden="true">'
      + '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2">'
      + '<circle cx="16" cy="16" r="5"/><circle cx="32" cy="16" r="5"/>'
      + '<path d="M6 38c0-6 4-10 10-10s10 4 10 10M22 38c0-6 4-10 10-10s10 4 10 10"/></svg></div>'
      + '<div class="social-mode-head">With others</div>'
      + '<p class="social-mode-text">' + (socialText || 'No social-context narrative yet.') + '</p></div>'
      + '</div>'
      + '<div class="card att-card"><div class="card-title">Attachment style</div>'
      + '<div class="att-layout">'
      + buildAttachmentMap(att)
      + '<div class="att-detail"><div class="att-detail-title" style="color:' + attInfo.color + '">'
      + escapeHTML(attInfo.label) + '</div>'
      + '<p class="att-detail-text">' + (attText || p.subj + ' tend toward ' + attInfo.label.toLowerCase() + ' bonding patterns in close relationships.') + '</p>'
      + '</div></div></div>'
      + '<div class="social-dims">' + dimBars('Alone tendencies', snap.alone, AL_LABELS)
      + dimBars('Social presence', snap.soc, SOC_LABELS) + '</div>';
  }

  function renderFigures(snap, isOwner, voice, displayName) {
    var root = document.getElementById('figuresPanelRoot');
    if (!root) return;
    var p = pron(isOwner);
    var name = (displayName || '').trim() || 'This person';
    var figures = (snap && snap.figures) ? snap.figures.slice() : [];

    if (!figures.length) {
      root.innerHTML = '<div class="viz-empty figures-empty">'
        + '<div class="figures-empty-orbit" aria-hidden="true"></div>'
        + '<div class="viz-empty-title">Similar figures</div>'
        + '<p>' + (isOwner
          ? 'Complete the assessment to see historical, cultural, and fictional mirrors of your profile.'
          : 'Figures will appear here after ' + escapeHTML(name) + ' completes the assessment.') + '</p></div>';
      return;
    }

    var catOrder = ['Historical', 'Celebrity', 'Pop Culture', 'Philosopher'];
    var byCat = {};
    figures.forEach(function (f) {
      var c = f.cat || 'Historical';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(f);
    });

    var hero = figures[0];
    var heroInit = escapeHTML((hero.initials || (hero.name || '?').charAt(0)).toUpperCase());
    var heroHtml = ''
      + '<div class="fig-hero card">'
      + '<div class="fig-hero-glow" aria-hidden="true"></div>'
      + '<div class="fig-hero-avatar">' + heroInit + '</div>'
      + '<div class="fig-hero-body">'
      + '<div class="fig-hero-kicker">Closest mirror</div>'
      + '<div class="fig-hero-name">' + escapeHTML(hero.name || '') + '</div>'
      + '<div class="fig-hero-type">' + escapeHTML(hero.type || snap.mbti || '') + '</div>'
      + (hero.note ? '<p class="fig-hero-note">' + escapeHTML(hero.note) + '</p>' : '')
      + '</div></div>';

    var sectionsHtml = '';
    catOrder.forEach(function (cat) {
      var list = byCat[cat];
      if (!list || !list.length) return;
      var listFiltered = list.filter(function (f) {
        return !hero || f.name !== hero.name;
      });
      if (!listFiltered.length) return;
      sectionsHtml += '<div class="fig-category"><div class="fig-cat-title">' + escapeHTML(cat) + '</div>'
        + '<div class="figures-mosaic">' + listFiltered.map(function (f, i) {
          var init = escapeHTML((f.initials || (f.name || '?').charAt(0)).toUpperCase());
          return '<article class="fig-tile" style="--fig-delay:' + (i * 40) + 'ms">'
            + '<div class="fig-tile-avatar">' + init + '</div>'
            + '<div class="fig-tile-name">' + escapeHTML(f.name || '') + '</div>'
            + '<div class="fig-tile-type">' + escapeHTML(f.type || '') + '</div>'
            + (f.note ? '<div class="fig-tile-note">' + escapeHTML(f.note) + '</div>' : '')
            + '</article>';
        }).join('') + '</div></div>';
    });

    root.innerHTML = ''
      + '<p class="section-lead">' + narr(voice, 'These figures echo ' + p.possL + ' cognitive and personality signature — archetypes, not endorsements.', isOwner) + '</p>'
      + heroHtml
      + '<div class="fig-stats">'
      + '<div class="fig-stat"><strong>' + figures.length + '</strong><span>Matches</span></div>'
      + '<div class="fig-stat"><strong>' + Object.keys(byCat).length + '</strong><span>Categories</span></div>'
      + '<div class="fig-stat"><strong>' + escapeHTML(snap.mbti || '') + '</strong><span>Core type</span></div>'
      + '</div>'
      + sectionsHtml;
  }

  function animateVisualBars() {
    document.querySelectorAll('#politicalPanelRoot [data-w], #socialPanelRoot [data-w]').forEach(function (el) {
      var w = el.getAttribute('data-w');
      if (w !== null) el.style.width = w + (el.classList.contains('mf-mini-fill') || el.classList.contains('soc-dim-fill') ? '%' : '%');
    });
    document.querySelectorAll('.pol-axis-fill').forEach(function (el) {
      var w = el.style.width;
      if (w) el.style.width = w;
    });
  }

  function renderAll(snap, isOwner, voice, displayName) {
    renderPolitical(snap, isOwner, voice);
    renderSocial(snap, isOwner, voice);
    renderFigures(snap, isOwner, voice, displayName);
    setTimeout(animateVisualBars, 120);
    if (typeof g.animateBars === 'function') setTimeout(g.animateBars, 180);
  }

  g.AnimusProfileVisuals = {
    renderPolitical: renderPolitical,
    renderSocial: renderSocial,
    renderFigures: renderFigures,
    renderAll: renderAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
