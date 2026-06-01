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

  function cogSum(cog) {
    if (!cog) return 0;
    return Object.keys(cog).reduce(function (s, k) {
      return s + (Number(cog[k]) || 0);
    }, 0);
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

  function normalizeProfileForCompare(snap) {
    if (!snap) return null;
    var out = Object.assign({}, snap);
    var cog = out.cog && typeof out.cog === 'object' ? Object.assign({}, out.cog) : {};
    if (cogSum(cog) < 1 && out.mbti && MBTI_COG[out.mbti]) {
      cog = Object.assign({}, MBTI_COG[out.mbti]);
      out._compareDerivedCog = true;
    }
    out.cog = cog;
    if (!out.big5 || cogSum(out.big5) < 1) {
      out.big5 = deriveBig5FromCog(cog);
    }
    if (!out.enn || typeof out.enn !== 'object') out.enn = {};
    if (out.ennType && !out.enn['E' + out.ennType]) {
      out.enn['E' + out.ennType] = Math.max(
        out.enn['E' + out.ennType] || 0,
        72
      );
    }
    if (!out.phiS || typeof out.phiS !== 'object') out.phiS = {};
    if (!out.eth || typeof out.eth !== 'object') out.eth = {};
    if (!out.iv || typeof out.iv !== 'object') out.iv = {};
    if (!out.att2 || typeof out.att2 !== 'object') out.att2 = {};
    if (typeof out.polX !== 'number') out.polX = 0;
    if (typeof out.polY !== 'number') out.polY = 0;
    return out;
  }

  function hasRichCompareData(snap) {
    if (!snap || !snap.mbti) return false;
    if (cogSum(snap.cog) > 0) return true;
    if (snap.big5 && cogSum(snap.big5) > 0) return true;
    return false;
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
    normalizeProfileForCompare: normalizeProfileForCompare,
    hasRichCompareData: hasRichCompareData,
    buildOfflineAnalysis: buildOfflineAnalysis,
    deriveBig5FromCog: deriveBig5FromCog
  };
})(typeof window !== 'undefined' ? window : globalThis);
