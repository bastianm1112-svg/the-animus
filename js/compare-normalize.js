/* Normalize profile snapshots for compare charts + offline analysis copy */
(function (g) {
  'use strict';

  var MBTI_COG = {
    INTJ: { Ni: 88, Te: 78, Fi: 52, Se: 28, Ne: 42, Ti: 58, Fe: 22, Si: 36 },
    INTP: { Ti: 90, Ne: 82, Si: 48, Fe: 30, Te: 55, Ni: 62, Se: 28, Fi: 44 },
    ENTJ: { Te: 88, Ni: 75, Se: 55, Fi: 38, Ti: 58, Ne: 52, Fe: 42, Si: 32 },
    ENTP: { Ne: 90, Ti: 78, Fe: 48, Si: 32, Te: 58, Ni: 55, Se: 42, Fi: 38 },
    INFJ: { Ni: 88, Fe: 72, Ti: 55, Se: 28, Ne: 48, Fi: 65, Te: 38, Si: 40 },
    INFP: { Fi: 90, Ne: 78, Si: 52, Te: 28, Ni: 58, Fe: 55, Se: 32, Ti: 42 },
    ENFJ: { Fe: 88, Ni: 72, Se: 52, Ti: 38, Ne: 55, Fi: 62, Te: 48, Si: 36 },
    ENFP: { Ne: 90, Fi: 78, Te: 42, Si: 35, Fe: 68, Ni: 52, Se: 48, Ti: 38 },
    ISTJ: { Si: 88, Te: 75, Fi: 42, Ne: 28, Ti: 55, Se: 48, Fe: 32, Ni: 38 },
    ISFJ: { Si: 88, Fe: 72, Ti: 42, Ne: 28, Fi: 58, Te: 38, Se: 45, Ni: 35 },
    ESTJ: { Te: 88, Si: 75, Ne: 32, Fi: 35, Se: 55, Ti: 48, Fe: 42, Ni: 30 },
    ESFJ: { Fe: 88, Si: 72, Ne: 38, Ti: 32, Se: 52, Fi: 55, Te: 45, Ni: 28 },
    ISTP: { Ti: 90, Se: 78, Ni: 45, Fe: 28, Te: 52, Si: 55, Ne: 38, Fi: 35 },
    ISFP: { Fi: 90, Se: 72, Ni: 42, Te: 28, Si: 58, Fe: 48, Ne: 45, Ti: 35 },
    ESTP: { Se: 90, Ti: 72, Fe: 42, Ne: 48, Te: 55, Fi: 35, Si: 52, Ni: 32 },
    ESFP: { Se: 90, Fi: 75, Fe: 68, Te: 35, Ne: 52, Si: 48, Ti: 30, Ni: 32 }
  };

  var PHI_KEYS = ['PH_NIE', 'PH_EXI', 'PH_PRA', 'PH_STO', 'PH_EPI', 'PH_KAN', 'PH_ARI', 'PH_SKE'];

  function cogSum(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.keys(obj).reduce(function (s, k) {
      return s + (Number(obj[k]) || 0);
    }, 0);
  }

  function hasRealCog(snap) {
    return !!(snap && snap._hasRealCog);
  }

  function deriveBig5FromCog(cog) {
    cog = cog || {};
    return {
      Openness: Math.round(
        (cog.Ne || 0) * 0.35 + (cog.Ni || 0) * 0.35 + (cog.Ti || 0) * 0.15 + (cog.Fi || 0) * 0.15
      ),
      Conscientiousness: Math.round(
        (cog.Te || 0) * 0.35 + (cog.Si || 0) * 0.35 + (cog.Fi || 0) * 0.15 + (cog.Ni || 0) * 0.15
      ),
      Extraversion: Math.round((cog.Se || 0) * 0.3 + (cog.Fe || 0) * 0.35 + (cog.Ne || 0) * 0.35),
      Agreeableness: Math.round((cog.Fe || 0) * 0.45 + (cog.Fi || 0) * 0.3 + (cog.Si || 0) * 0.25),
      Neuroticism: Math.round(
        (100 - (cog.Te || 0)) * 0.25 +
          (100 - (cog.Ti || 0)) * 0.25 +
          (cog.Fi || 0) * 0.25 +
          (100 - (cog.Si || 0)) * 0.25
      )
    };
  }

  function spreadEnn(snap) {
    var enn = snap.enn && typeof snap.enn === 'object' ? Object.assign({}, snap.enn) : {};
    if (cogSum(enn) > 0) return enn;
    var t = parseInt(snap.ennType, 10);
    if (!t || t < 1 || t > 9) return enn;
    var i;
    for (i = 1; i <= 9; i++) {
      enn['E' + i] = i === t ? 72 : Math.max(12, 28 - Math.abs(i - t) * 3);
    }
    return enn;
  }

  function spreadPhiS(snap) {
    var phiS = snap.phiS && typeof snap.phiS === 'object' ? Object.assign({}, snap.phiS) : {};
    if (cogSum(phiS) > 0) return phiS;
    var primary = snap.phi || '';
    PHI_KEYS.forEach(function (k) {
      phiS[k] = k === primary ? 70 : 12;
    });
    return phiS;
  }

  function spreadIv(snap) {
    var iv = snap.iv && typeof snap.iv === 'object' ? Object.assign({}, snap.iv) : {};
    if (cogSum(iv) > 0) return iv;
    var stack = (snap.instStack || 'SP/SO/SX').split('/');
    var map = { SP: 'IV_SP', SO: 'IV_SOC', SX: 'IV_SX', SOC: 'IV_SOC' };
    var scores = [58, 32, 22];
    stack.forEach(function (part, idx) {
      var key = map[part.trim().toUpperCase()];
      if (key) iv[key] = scores[idx] !== undefined ? scores[idx] : 20;
    });
    if (cogSum(iv) < 1) {
      iv.IV_SP = 40;
      iv.IV_SOC = 35;
      iv.IV_SX = 30;
    }
    return iv;
  }

  function spreadAtt2(snap) {
    var att2 = snap.att2 && typeof snap.att2 === 'object' ? Object.assign({}, snap.att2) : {};
    if (cogSum(att2) > 0) return att2;
    var primary = snap.att || 'AT_SEC';
    ['AT_SEC', 'AT_ANX', 'AT_AVO', 'AT_DIS'].forEach(function (k) {
      att2[k] = k === primary ? 65 : 15;
    });
    return att2;
  }

  function spreadEth(snap) {
    var eth = snap.eth && typeof snap.eth === 'object' ? Object.assign({}, snap.eth) : {};
    if (cogSum(eth) > 0) return eth;
    ['ET_VIR', 'ET_CON', 'ET_DEO', 'ET_EGO'].forEach(function (k, i) {
      eth[k] = 40 - i * 8;
    });
    return eth;
  }

  function pickScore(obj, primary, fallback) {
    if (!obj) return 0;
    if (obj[primary] != null && obj[primary] !== '') return Math.round(Number(obj[primary]) || 0);
    if (fallback && obj[fallback] != null) return Math.round(Number(obj[fallback]) || 0);
    return 0;
  }

  function mapLegacyProfileFields(snap) {
    var out = Object.assign({}, snap);
    var catPers = out.categories && out.categories.personality;
    var catPhil = out.categories && out.categories.philosophy;
    var catPol = out.categories && out.categories.political;
    var catSoc = out.categories && out.categories.social;

    if (cogSum(out.cog) < 1 && catPers && catPers.cog) out.cog = Object.assign({}, catPers.cog);
    if (cogSum(out.enn) < 1 && out.ennScores) out.enn = Object.assign({}, out.ennScores);
    if (cogSum(out.enn) < 1 && catPers && catPers.enn) out.enn = Object.assign({}, catPers.enn);
    if (cogSum(out.phiS) < 1 && out.phiScores) out.phiS = Object.assign({}, out.phiScores);
    if (cogSum(out.phiS) < 1 && catPhil && catPhil.phiS) out.phiS = Object.assign({}, catPhil.phiS);
    if (cogSum(out.att2) < 1 && out.attScores) out.att2 = Object.assign({}, out.attScores);
    if (cogSum(out.att2) < 1 && catPers && catPers.att2) out.att2 = Object.assign({}, catPers.att2);
    if (cogSum(out.tmp) < 1 && catPers && catPers.tmp) out.tmp = Object.assign({}, catPers.tmp);
    if (cogSum(out.iv) < 1 && catPers && catPers.iv) out.iv = Object.assign({}, catPers.iv);
    if (cogSum(out.big5) < 1 && catPers && catPers.big5) out.big5 = Object.assign({}, catPers.big5);
    if (cogSum(out.eth) < 1 && catPhil && catPhil.eth) out.eth = Object.assign({}, catPhil.eth);
    if (cogSum(out.ep) < 1 && catPhil && catPhil.ep) out.ep = Object.assign({}, catPhil.ep);
    if (cogSum(out.mf) < 1 && catPol && catPol.mf) out.mf = Object.assign({}, catPol.mf);
    if (!out.soc || !Object.keys(out.soc).length) {
      if (catSoc && catSoc.soc) out.soc = Object.assign({}, catSoc.soc);
    }
    if (!out.alone || !Object.keys(out.alone).length) {
      if (catSoc && catSoc.alone) out.alone = Object.assign({}, catSoc.alone);
    }
    return out;
  }

  function canonicalSocAlone(snap) {
    var soc = snap.soc || {};
    var alone = snap.alone || {};
    return {
      soc: {
        SOC_DOM: pickScore(soc, 'SOC_DOM', 'dom'),
        SOC_INT: pickScore(soc, 'SOC_INT', 'introvert'),
        SOC_WAR: pickScore(soc, 'SOC_WAR', 'warmth'),
        SOC_DIR: pickScore(soc, 'SOC_DIR', 'direct')
      },
      alone: {
        AL_INT: pickScore(alone, 'AL_INT', 'intellectual'),
        AL_SEN: pickScore(alone, 'AL_SEN', 'sensory')
      }
    };
  }

  function allValuesEqual(obj, sentinel) {
    if (!obj || typeof obj !== 'object') return false;
    var vals = Object.keys(obj).map(function (k) { return obj[k]; });
    if (!vals.length) return false;
    return vals.every(function (v) { return Math.round(Number(v) || 0) === sentinel; });
  }

  /** Hydrate snapshots for profile display (Firestore, friends, shared links). */
  function normalizeProfileForDisplay(snap) {
    if (!snap) return null;
    var out = mapLegacyProfileFields(snap);
    out = normalizeProfileForCompare(out) || out;
    var canon = canonicalSocAlone(out);
    out.soc = canon.soc;
    out.alone = canon.alone;
    if (allValuesEqual(out.soc, 50)) {
      out.soc = { SOC_DOM: 0, SOC_INT: 0, SOC_WAR: 0, SOC_DIR: 0 };
    }
    if (allValuesEqual(out.alone, 50)) {
      out.alone = { AL_INT: 0, AL_SEN: 0 };
    }
    if (typeof g.AnimusShared !== 'undefined' && g.AnimusShared.sanitizeProfileSnapshot) {
      out = g.AnimusShared.sanitizeProfileSnapshot(out);
    }
    return out;
  }

  function topFn(cog) {
    if (!cog || typeof cog !== 'object') return '—';
    return (
      Object.keys(cog).sort(function (a, b) {
        return (Number(cog[b]) || 0) - (Number(cog[a]) || 0);
      })[0] || '—'
    );
  }

  function topFnList(cog, n) {
    if (!cog || typeof cog !== 'object') return [];
    return Object.keys(cog)
      .sort(function (a, b) {
        return (Number(cog[b]) || 0) - (Number(cog[a]) || 0);
      })
      .slice(0, n || 4);
  }

  function formatScoreLine(obj, keys) {
    if (!obj) return 'none';
    keys = keys || Object.keys(obj);
    return keys
      .map(function (k) {
        return k + ':' + Math.round(Number(obj[k]) || 0);
      })
      .join(', ');
  }

  function normalizeProfileForCompare(snap) {
    if (!snap) return null;
    var out = mapLegacyProfileFields(snap);
    var rawCog = out.cog && typeof out.cog === 'object' ? Object.assign({}, out.cog) : {};
    out._hasRealCog = cogSum(rawCog) > 0;

    var cog = rawCog;
    if (!out._hasRealCog && out.mbti && MBTI_COG[out.mbti]) {
      cog = Object.assign({}, MBTI_COG[out.mbti]);
      out._compareDerivedCog = true;
    }
    out.cog = cog;

    if (!out.big5 || cogSum(out.big5) < 1) {
      out.big5 = deriveBig5FromCog(cog);
    }
    out.enn = spreadEnn(out);
    out.phiS = spreadPhiS(out);
    out.iv = spreadIv(out);
    out.att2 = spreadAtt2(out);
    out.eth = spreadEth(out);
    if (typeof out.polX !== 'number') out.polX = 0;
    if (typeof out.polY !== 'number') out.polY = 0;
    return out;
  }

  function hasRichCompareData(snap) {
    return !!(snap && snap.mbti && snap.cog && cogSum(snap.cog) > 0);
  }

  function canShowCompatScore(my, them) {
    if (!my || !them || !my.mbti || !them.mbti) return false;
    return cogSum(my.cog) > 0 && cogSum(them.cog) > 0;
  }

  var ATT_LABELS = {
    AT_SEC: 'Secure',
    AT_ANX: 'Anxious-Preoccupied',
    AT_AVO: 'Dismissive-Avoidant',
    AT_DIS: 'Fearful-Avoidant'
  };

  var PHI_LABELS = {
    PH_NIE: 'Nietzschean',
    PH_STO: 'Stoic',
    PH_EPI: 'Epicurean',
    PH_KAN: 'Kantian',
    PH_ARI: 'Aristotelian',
    PH_EXI: 'Existentialist',
    PH_PRA: 'Pragmatist',
    PH_SKE: 'Skeptic'
  };

  function labelAtt(code) {
    return ATT_LABELS[code] || String(code || '').replace('AT_', '') || '—';
  }

  function labelPhi(code) {
    return PHI_LABELS[code] || String(code || '').replace('PH_', '') || '—';
  }

  function polSummary(snap) {
    if (typeof snap.polX !== 'number') return '—';
    var econ = snap.polX > 10 ? 'economically right' : snap.polX < -10 ? 'economically left' : 'economically centrist';
    var soc = snap.polY > 10 ? 'socially authoritarian' : snap.polY < -10 ? 'socially libertarian' : 'socially moderate';
    return econ + ', ' + soc;
  }

  function topEnnType(enn) {
    if (!enn || typeof enn !== 'object') return null;
    var best = null;
    var bestScore = -1;
    for (var i = 1; i <= 9; i++) {
      var k = 'E' + i;
      var s = Number(enn[k]) || 0;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    return best;
  }

  function cogGapInsight(my, them, myName, themName) {
    var keys = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
    var gaps = keys
      .map(function (fn) {
        var y = my.cog && my.cog[fn];
        var t = them.cog && them.cog[fn];
        if (y == null || t == null) return null;
        return { fn: fn, d: Math.abs(Math.round(y) - Math.round(t)), y: Math.round(y), t: Math.round(t) };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.d - a.d;
      });
    if (!gaps.length || gaps[0].d < 14) return '';
    var g = gaps[0];
    return (
      'Largest cognitive gap: ' +
      g.fn +
      ' (' +
      myName +
      ' ' +
      g.y +
      ' vs ' +
      themName +
      ' ' +
      g.t +
      ') — expect different defaults on planning depth, emotional tone, or sensory engagement.'
    );
  }

  function big5GapNote(my, them) {
    var keys = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
    var gaps = keys
      .map(function (k) {
        var y = my.big5 && my.big5[k];
        var t = them.big5 && them.big5[k];
        if (y == null || t == null) return null;
        return { k: k, d: Math.abs(Math.round(y) - Math.round(t)), y: Math.round(y), t: Math.round(t) };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.d - a.d;
      });
    if (!gaps.length || gaps[0].d < 12) return '';
    var g = gaps[0];
    return (
      'Big Five gap: ' +
      g.k +
      ' (' +
      g.y +
      ' vs ' +
      g.t +
      ') — expect different defaults on pace, structure, or emotional bandwidth.'
    );
  }

  function buildComparePrompt(my, them, myName, themName, scores) {
    scores = scores || {};
    var cogKeys = ['Ni', 'Ne', 'Ti', 'Te', 'Fi', 'Fe', 'Si', 'Se'];
    var b5Keys = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
    var myEnnDom = topEnnType(my.enn);
    var themEnnDom = topEnnType(them.enn);
    return (
      'You are an expert personality analyst (MBTI cognitive functions, Enneagram, attachment, philosophy, political temperament). ' +
      'Write a specific compatibility brief for two real people. Rules:\n' +
      '- Name both people in every section; quote MBTI codes, dominant functions, Enneagram types, attachment styles, and numeric scores.\n' +
      '- Reference at least two concrete score contrasts (cog, Big Five, or Enneagram) per section.\n' +
      '- Ban vague lines like "you balance each other", "opposites attract", "great chemistry", or "communication is key" without tying them to a measured trait.\n' +
      '- Describe conflict as predictable triggers (function grip, attachment protest, philosophy proof standards), not moral failure.\n' +
      '- Tone: direct, psychologically literate, no horoscope fluff.\n\n' +
      'Person 1 — ' +
      myName +
      ': MBTI ' +
      (my.mbti || '?') +
      (my.mbtiName ? ' (' + my.mbtiName + ')' : '') +
      ', dominant ' +
      topFn(my.cog) +
      ', stack ' +
      topFnList(my.cog, 4).join('>') +
      '; cog [' +
      formatScoreLine(my.cog, cogKeys) +
      ']; Big5 [' +
      formatScoreLine(my.big5, b5Keys) +
      ']; Enneagram ' +
      (my.ennType || '?') +
      'w' +
      (my.ennWing || '?') +
      (my.ennTritype ? ', tritype ' + my.ennTritype : '') +
      (myEnnDom ? ', enn score peak E' + myEnnDom : '') +
      '; attachment ' +
      labelAtt(my.att) +
      ' (' +
      (my.att || '?') +
      '); instincts ' +
      (my.instStack || '?') +
      '; philosophy ' +
      labelPhi(my.phi) +
      ' (' +
      (my.phi || '?') +
      '); political ' +
      polSummary(my) +
      '; political X=' +
      (my.polX || 0) +
      ' Y=' +
      (my.polY || 0) +
      (my.tagline ? '; tagline "' + my.tagline + '"' : '') +
      '.\n' +
      'Person 2 — ' +
      themName +
      ': MBTI ' +
      (them.mbti || '?') +
      (them.mbtiName ? ' (' + them.mbtiName + ')' : '') +
      ', dominant ' +
      topFn(them.cog) +
      ', stack ' +
      topFnList(them.cog, 4).join('>') +
      '; cog [' +
      formatScoreLine(them.cog, cogKeys) +
      ']; Big5 [' +
      formatScoreLine(them.big5, b5Keys) +
      ']; Enneagram ' +
      (them.ennType || '?') +
      'w' +
      (them.ennWing || '?') +
      (them.ennTritype ? ', tritype ' + them.ennTritype : '') +
      (themEnnDom ? ', enn score peak E' + themEnnDom : '') +
      '; attachment ' +
      labelAtt(them.att) +
      ' (' +
      (them.att || '?') +
      '); instincts ' +
      (them.instStack || '?') +
      '; philosophy ' +
      labelPhi(them.phi) +
      ' (' +
      (them.phi || '?') +
      '); political ' +
      polSummary(them) +
      '; political X=' +
      (them.polX || 0) +
      ' Y=' +
      (them.polY || 0) +
      (them.tagline ? '; tagline "' + them.tagline + '"' : '') +
      '.\n' +
      (scores.overall
        ? '\nComputed compatibility ~' +
          scores.overall +
          '% (cognition ' +
          (scores.cog || '?') +
          '%, values ' +
          (scores.blend || '?') +
          '%, philosophy ' +
          (scores.phi || '?') +
          '%, political ' +
          (scores.pol || '?') +
          '%, attachment ' +
          (scores.att || '?') +
          '%, rapport ' +
          (scores.rapport || '?') +
          '%).\n'
        : '') +
      'Return ONLY valid JSON with string values (no markdown): {"whereAlign":"2 paragraphs (~120 words each) on synergy citing types, functions, and scores","whereClash":"2 paragraphs on friction citing attachment/philosophy/political gaps and inferior-function stress","dynamic":"1 paragraph on day-to-day interaction in calm talk, conflict, and groups","mutualEffect":"1 paragraph on growth each person pulls from the other with named functions/traits"}.'
    );
  }

  function personLine(p) {
    p = p || {};
    return (
      (p.displayName || p.name || 'Someone') +
      ': MBTI ' + (p.mbti || '?') +
      ', Enneagram ' + (p.ennType || '?') + 'w' + (p.ennWing || '?') +
      ', attachment ' + labelAtt(p.att) +
      ', philosophy ' + labelPhi(p.phi) +
      ', political X=' + (p.polX || 0) + ' Y=' + (p.polY || 0) +
      (p.instStack ? ', instincts ' + p.instStack : '') +
      (p.cog ? ', stack ' + topFnList(p.cog, 4).join('>') : '')
    );
  }

  function buildGroupPrompt(people, meta) {
    meta = meta || {};
    var list = (people || []).map(personLine).join('\n');
    return (
      'You are an expert group-dynamics analyst using MBTI functions, Enneagram, attachment, and political temperament. ' +
      'Write a specific brief for this real group. Rules:\n' +
      '- Name people. Cite types and scores. No horoscope fluff.\n' +
      '- Ban vague lines like "great team chemistry" unless tied to a measured trait.\n' +
      '- Conflict is predictable triggers, not moral failure.\n\n' +
      'Group (' + (people || []).length + ' people):\n' + list + '\n' +
      (meta.avgCompat != null ? 'Average pair compatibility ~' + meta.avgCompat + '%.\n' : '') +
      (meta.closest ? 'Closest pair: ' + meta.closest + '.\n' : '') +
      (meta.contrast ? 'Most contrasting pair: ' + meta.contrast + '.\n' : '') +
      'Return ONLY valid JSON: {"simpleTake":"3-5 everyday sentences a non-expert can read first","whereAlign":"2 short paragraphs on what holds the group together","whereClash":"2 short paragraphs on likely friction and who it lands on","dynamic":"1-2 paragraphs on how the group actually runs meetings, jokes, and stress","mutualEffect":"1-2 paragraphs on what each role pulls from the others, naming people"}.'
    );
  }

  function buildOfflineGroupAnalysis(people, meta) {
    meta = meta || {};
    var names = (people || []).map(function (p) { return p.displayName || p.mbti || 'Someone'; });
    var joined = names.join(', ');
    return {
      simpleTake: 'In plain words: this room shares a language more than a random crowd would. Use the matrix for who clicks, and the brief below for who will clash when plans, closeness, or control get real.',
      whereAlign: joined + ' share overlapping maps on type and values more than a random room would. The glue is usually the most common function stack and whoever sits nearest the group average on politics and attachment.\n\nTreat that overlap as a shared language, not proof everyone wants the same outcome.',
      whereClash: 'Friction shows up where Enneagram motives and attachment styles disagree about speed, closeness, and who is allowed to decide. The most contrasting pair in the matrix is the weather system everyone else has to walk through.\n\nName the trigger (planning vs feeling, control vs space) instead of calling someone difficult.',
      dynamic: 'In calm talk, the group likely follows whoever has the strongest Te/Fe read of the room. Under stress, inferior functions and protest behaviors get louder. Average pair score ~' + (meta.avgCompat != null ? meta.avgCompat : '—') + '%.',
      mutualEffect: 'Each person can stretch the others if roles stay explicit: who decides, who soothes, who spots risk. Closest pair: ' + (meta.closest || '—') + '. Most contrast: ' + (meta.contrast || '—') + '.'
    };
  }

  function buildOfflineAnalysis(my, them, myName, themName, scores) {
    scores = scores || {};
    var overall = scores.overall || 0;
    var myDom = topFn(my.cog);
    var themDom = topFn(them.cog);
    var myStack = topFnList(my.cog, 4).join(' → ');
    var themStack = topFnList(them.cog, 4).join(' → ');
    var myInferior = topFnList(my.cog, 8).slice(-1)[0] || '—';
    var themInferior = topFnList(them.cog, 8).slice(-1)[0] || '—';
    var myEnn = (my.ennType || '?') + 'w' + (my.ennWing || '?');
    var themEnn = (them.ennType || '?') + 'w' + (them.ennWing || '?');
    var scoreLead =
      overall >= 70
        ? 'ANIMUS scores this pairing around ' + overall + '% — strong overlap on cognition and values with workable differences.'
        : overall >= 50
          ? 'ANIMUS scores this pairing around ' + overall + '% — meaningful overlap, but several dimensions pull in different directions.'
          : overall > 0
            ? 'ANIMUS scores this pairing around ' + overall + '% — contrasting defaults that can sharpen each other when expectations are explicit.'
            : 'Profile data supports a type-level read (overall % needs full assessments on both sides).';

    var alignP1;
    if (my.mbti === them.mbti) {
      alignP1 =
        scoreLead +
        ' ' +
        myName +
        ' and ' +
        themName +
        ' both type as ' +
        my.mbti +
        (my.mbtiName ? ' (' + my.mbtiName + ')' : '') +
        ' with ' +
        myDom +
        ' leading (' +
        myStack +
        '). You decode problems with the same cognitive vocabulary — fast rapport, shared humor about blind spots, and similar pacing in planning vs. spontaneity.';
    } else {
      alignP1 =
        scoreLead +
        ' ' +
        myName +
        ' (' +
        my.mbti +
        (my.mbtiName ? ', ' + my.mbtiName : '') +
        ', ' +
        myDom +
        '-dom, stack ' +
        myStack +
        ') and ' +
        themName +
        ' (' +
        them.mbti +
        (them.mbtiName ? ', ' + them.mbtiName : '') +
        ', ' +
        themDom +
        '-dom, stack ' +
        themStack +
        ') complement when roles are clear: ' +
        myName +
        ' supplies ' +
        myDom +
        ' framing while ' +
        themName +
        ' supplies ' +
        themDom +
        ' execution — useful in projects, travel logistics, or mentoring dynamics.';
    }

    var alignP2 = '';
    if (my.ennType && them.ennType && my.ennType === them.ennType) {
      alignP2 =
        'Shared Enneagram core ' +
        myEnn +
        ': you recognize each other\'s core fear and desire language — motivation talks land quickly.';
    } else if (my.ennTritype && them.ennTritype && my.ennTritype === them.ennTritype) {
      alignP2 =
        'Matching tritype ' +
        my.ennTritype +
        ' (' +
        myEnn +
        ' vs ' +
        themEnn +
        '): similar stress sequencing even when wings differ.';
    } else {
      alignP2 =
        'Enneagram contrast (' +
        myEnn +
        ' vs ' +
        themEnn +
        '): ' +
        myName +
        ' may prioritize what Type ' +
        (my.ennType || '?') +
        ' protects; ' +
        themName +
        ' what Type ' +
        (them.ennType || '?') +
        ' protects — useful for covering each other\'s blind motivation spots.';
    }
    var b5Note = big5GapNote(my, them);
    var cogNote = cogGapInsight(my, them, myName, themName);
    if (b5Note) alignP2 += ' ' + b5Note;
    else if (cogNote) alignP2 += ' ' + cogNote;
    else if (scores.cog >= 65) {
      alignP2 += ' Cognition ring ~' + scores.cog + '% — function stacks are close enough to translate intent without constant meta-conversation.';
    }

    var clashP1 = '';
    if (my.att && them.att && my.att !== them.att) {
      clashP1 =
        'Attachment friction: ' +
        myName +
        ' (' +
        labelAtt(my.att) +
        ') vs ' +
        themName +
        ' (' +
        labelAtt(them.att) +
        '). Reassurance cadence differs — one may pursue clarity while the other withdraws to regulate, which reads as disinterest unless named early.';
    } else if (my.att && them.att) {
      clashP1 =
        'Both show ' +
        labelAtt(my.att) +
        ' attachment — clashes are less about closeness fear and more about ' +
        myDom +
        '/' +
        themDom +
        ' processing speed under stress.';
    }
    if (my.phi && them.phi && my.phi !== them.phi) {
      clashP1 +=
        (clashP1 ? ' ' : '') +
        'Philosophy split: ' +
        labelPhi(my.phi) +
        ' (' +
        myName +
        ') vs ' +
        labelPhi(them.phi) +
        ' (' +
        themName +
        ') — arguments about evidence, duty, or meaning can feel like moral indictment.';
    }
    if (typeof my.polX === 'number' && typeof them.polX === 'number') {
      var polDelta = Math.abs(Math.round(my.polX) - Math.round(them.polX)) + Math.abs(Math.round(my.polY) - Math.round(them.polY));
      if (polDelta >= 28) {
        clashP1 +=
          (clashP1 ? ' ' : '') +
          'Political geometry diverges (' +
          polSummary(my) +
          ' vs ' +
          polSummary(them) +
          ') — civic or lifestyle debates may hijack unrelated conflicts.';
      }
    }
    if (!clashP1) {
      clashP1 =
        'No single attachment or philosophy flag dominates — friction likely shows up in cognitive tempo (' +
        myDom +
        ' vs ' +
        themDom +
        ') when neither person has slept or eaten.';
    }

    var clashP2 =
      'Grip risk: when stressed, ' +
      myName +
      '\'s weakest link (' +
      myInferior +
      ') and ' +
      themName +
      '\'s (' +
      themInferior +
      ') inflate — sarcasm, over-planning, emotional flooding, or blunt Te/Fe can land as character attacks. ' +
      (myDom !== themDom
        ? myName +
          '\'s ' +
          myDom +
          ' may label ' +
          themName +
          '\'s ' +
          themDom +
          ' moves "irrational"; ' +
          themName +
          ' may return the verdict on ' +
          myName +
          '.'
        : 'Shared dominant ' +
          myDom +
          ' means you fight the same way — double intensity unless someone calls a pause.') +
      (scores.att && scores.att < 50
        ? ' Attachment ring ~' + scores.att + '% — schedule repair talks, not silent scorekeeping.'
        : '');

    var dynamic;
    if (overall >= 75) {
      dynamic =
        'In calm conversation, ' +
        myName +
        ' (' +
        my.mbti +
        ', ' +
        myDom +
        ') and ' +
        themName +
        ' (' +
        them.mbti +
        ', ' +
        themDom +
        ') likely finish each other\'s analytical sentences — groups read you as aligned. In conflict, watch shared shortcuts: you may skip empathy steps because the logic feels obvious. In groups, split roles: one narrates strategy (' +
        myDom +
        '), one reads interpersonal temperature (' +
        (themDom === 'Fe' || themDom === 'Fi' ? themDom : 'secondary feeling function') +
        ').';
    } else if (overall >= 55) {
      dynamic =
        'Day-to-day, agree explicitly who owns timing (' +
        myName +
        ' vs ' +
        themName +
        ') and depth — ' +
        myDom +
        '-led minds want closure; ' +
        themDom +
        '-led minds may reopen topics for nuance. In groups, position yourselves on complementary tasks to avoid competing for the same cognitive lane. After disagreements, debrief with one measurable next step, not a re-litigation of motives.';
    } else {
      dynamic =
        'Pacing is the lever: ' +
        myName +
        ' may read ' +
        themName +
        ' as too intense or too distant depending on whether ' +
        themDom +
        ' amplifies or dampens the room. Schedule cool-down before big decisions. In social settings, stagger visibility — one speaks, one synthesizes — so neither feels erased.';
    }

    var mutual =
      themName +
      ' trains ' +
      myName +
      '\'s underused ' +
      themDom +
      ' (currently shadowed by ' +
      myInferior +
      '); ' +
      myName +
      ' helps ' +
      themName +
      ' anticipate ' +
      themInferior +
      ' spirals before they become relationship verdicts. ' +
      (my.ennType && them.ennType && my.ennType !== them.ennType
        ? 'Enneagram cross-teach: Type ' +
          them.ennType +
          ' shows ' +
          myName +
          ' a healthier stress path; Type ' +
          my.ennType +
          ' does the same for ' +
          themName +
          '.'
        : 'Treat overlap as depth, not redundancy — refine the same strength from two life histories.') +
      ' Best results when you name the function or attachment dynamic in the moment instead of debating character.';

    return {
      whereAlign: alignP1 + '\n\n' + alignP2,
      whereClash: clashP1 + '\n\n' + clashP2,
      dynamic: dynamic,
      mutualEffect: mutual
    };
  }

  g.AnimusCompareNormalize = {
    MBTI_COG: MBTI_COG,
    normalizeProfileForDisplay: normalizeProfileForDisplay,
    normalizeProfileForCompare: normalizeProfileForCompare,
    hasRichCompareData: hasRichCompareData,
    hasRealCog: hasRealCog,
    canShowCompatScore: canShowCompatScore,
    buildOfflineAnalysis: buildOfflineAnalysis,
    buildComparePrompt: buildComparePrompt,
    buildGroupPrompt: buildGroupPrompt,
    buildOfflineGroupAnalysis: buildOfflineGroupAnalysis,
    topFn: topFn,
    deriveBig5FromCog: deriveBig5FromCog,
    spreadEnn: spreadEnn,
    spreadPhiS: spreadPhiS,
    spreadIv: spreadIv,
    spreadAtt2: spreadAtt2
  };
})(typeof window !== 'undefined' ? window : globalThis);
