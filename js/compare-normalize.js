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

  function normalizeProfileForCompare(snap) {
    if (!snap) return null;
    var out = Object.assign({}, snap);
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
    return hasRealCog(my) && hasRealCog(them);
  }

  function buildOfflineAnalysis(my, them, myName, themName, scores) {
    scores = scores || {};
    var overall = scores.overall || 0;
    var align =
      my.mbti === them.mbti
        ? 'You share the same MBTI type (' +
          my.mbti +
          '), which often means similar default approaches to problems, communication pacing, and decision-making.'
        : 'As ' +
          my.mbti +
          ' and ' +
          them.mbti +
          ', you bring different cognitive priorities — ' +
          myName +
          ' tends toward ' +
          (my.mbtiName || my.mbti) +
          ' patterns while ' +
          themName +
          ' leans ' +
          (them.mbtiName || them.mbti) +
          '.';
    var clash =
      (my.att && them.att && my.att !== them.att
        ? 'Attachment styles (' +
          String(my.att).replace('AT_', '') +
          ' vs ' +
          String(them.att).replace('AT_', '') +
          ') may create push-pull around closeness and reassurance. '
        : '') +
      (my.phi && them.phi && my.phi !== them.phi
        ? 'Philosophical leanings differ (' +
          String(my.phi).replace('PH_', '') +
          ' vs ' +
          String(them.phi).replace('PH_', '') +
          '), which can surface in arguments about meaning, ethics, and what counts as evidence.'
        : 'Watch for friction when stress amplifies your inferior functions — small misunderstandings can escalate quickly.');
    var dynamic =
      overall >= 70
        ? 'In groups, you likely energize each other; one of you may take the strategic frame while the other handles rapport or execution.'
        : overall >= 50
          ? 'You can collaborate well with explicit roles: decide upfront who leads planning vs. who checks emotional tone.'
          : 'You may need deliberate pacing — schedule decompression after intense conversations so neither person feels steamrolled.';
    var mutual =
      myName +
      ' can help ' +
      themName +
      ' see blind spots in ' +
      (them.mbti || 'their') +
      ' weak spots, while ' +
      themName +
      ' stretches ' +
      myName +
      ' into perspectives outside the ' +
      (my.mbti || 'default') +
      ' comfort zone.';
    return {
      whereAlign: align,
      whereClash: clash,
      dynamic: dynamic,
      mutualEffect: mutual
    };
  }

  g.AnimusCompareNormalize = {
    normalizeProfileForDisplay: normalizeProfileForDisplay,
    normalizeProfileForCompare: normalizeProfileForCompare,
    hasRichCompareData: hasRichCompareData,
    hasRealCog: hasRealCog,
    canShowCompatScore: canShowCompatScore,
    buildOfflineAnalysis: buildOfflineAnalysis,
    deriveBig5FromCog: deriveBig5FromCog
  };
})(typeof window !== 'undefined' ? window : globalThis);
