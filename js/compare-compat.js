/* Shared compatibility math for 1-on-1 and group compare */
(function (g) {
  'use strict';

  function calcCogCompat(a, b) {
    var fns = ['Ti', 'Te', 'Fi', 'Fe', 'Ni', 'Ne', 'Si', 'Se'];
    var aV = fns.map(function (f) { return a[f] || 0; });
    var bV = fns.map(function (f) { return b[f] || 0; });
    var dot = 0;
    var mA = 0;
    var mB = 0;
    for (var i = 0; i < fns.length; i++) {
      dot += aV[i] * bV[i];
      mA += aV[i] * aV[i];
      mB += bV[i] * bV[i];
    }
    var sim = mA && mB ? dot / (Math.sqrt(mA) * Math.sqrt(mB)) : 0;
    var aSorted = fns.slice().sort(function (x, y) { return (a[y] || 0) - (a[x] || 0); });
    var bSorted = fns.slice().sort(function (x, y) { return (b[y] || 0) - (b[x] || 0); });
    var golden = [[0, 1], [1, 0], [2, 3], [3, 2], [4, 5], [5, 4]];
    var complementBonus = golden.reduce(function (s, pair) {
      return s + (aSorted[pair[0]] === bSorted[pair[1]] ? 8 : 0);
    }, 0);
    return Math.min(100, Math.round(sim * 60 + complementBonus));
  }

  function calcPolCompat(x1, y1, x2, y2) {
    var d = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    return Math.max(0, Math.round(100 - d * 0.7));
  }

  function calcAttCompat(a, b) {
    var m = {
      AT_SEC: { AT_SEC: 90, AT_ANX: 72, AT_AVO: 65, AT_DIS: 60 },
      AT_ANX: { AT_SEC: 72, AT_ANX: 45, AT_AVO: 30, AT_DIS: 35 },
      AT_AVO: { AT_SEC: 65, AT_ANX: 30, AT_AVO: 55, AT_DIS: 70 },
      AT_DIS: { AT_SEC: 60, AT_ANX: 35, AT_AVO: 70, AT_DIS: 50 }
    };
    return (m[a] && m[a][b]) || 50;
  }

  function calcPhiCompat(a, b) {
    var m = {
      PH_STO: { PH_STO: 90, PH_EPI: 55, PH_KAN: 80, PH_ARI: 75, PH_NIE: 60, PH_EXI: 65, PH_PRA: 70, PH_SKE: 72 },
      PH_EPI: { PH_STO: 55, PH_EPI: 90, PH_KAN: 50, PH_ARI: 70, PH_NIE: 65, PH_EXI: 75, PH_PRA: 80, PH_SKE: 60 },
      PH_KAN: { PH_STO: 80, PH_EPI: 50, PH_KAN: 90, PH_ARI: 72, PH_NIE: 45, PH_EXI: 55, PH_PRA: 60, PH_SKE: 65 },
      PH_ARI: { PH_STO: 75, PH_EPI: 70, PH_KAN: 72, PH_ARI: 90, PH_NIE: 58, PH_EXI: 60, PH_PRA: 78, PH_SKE: 65 },
      PH_NIE: { PH_STO: 60, PH_EPI: 65, PH_KAN: 45, PH_ARI: 58, PH_NIE: 90, PH_EXI: 82, PH_PRA: 55, PH_SKE: 70 },
      PH_EXI: { PH_STO: 65, PH_EPI: 75, PH_KAN: 55, PH_ARI: 60, PH_NIE: 82, PH_EXI: 90, PH_PRA: 60, PH_SKE: 75 },
      PH_PRA: { PH_STO: 70, PH_EPI: 80, PH_KAN: 60, PH_ARI: 78, PH_NIE: 55, PH_EXI: 60, PH_PRA: 90, PH_SKE: 68 },
      PH_SKE: { PH_STO: 72, PH_EPI: 60, PH_KAN: 65, PH_ARI: 65, PH_NIE: 70, PH_EXI: 75, PH_PRA: 68, PH_SKE: 90 }
    };
    return (m[a] && m[a][b]) || 55;
  }

  function hasCogData(snap) {
    if (!snap || !snap.cog) return false;
    return Object.keys(snap.cog).some(function (k) {
      return Number(snap.cog[k]) > 0;
    });
  }

  function calcOverall(my, them) {
    if (!my.mbti || !them.mbti) return null;
    if (!hasCogData(my) || !hasCogData(them)) return null;
    var cog = calcCogCompat(my.cog || {}, them.cog || {});
    var pol = calcPolCompat(my.polX || 0, my.polY || 0, them.polX || 0, them.polY || 0);
    var att = calcAttCompat(my.att || '', them.att || '');
    var phi = calcPhiCompat(my.phi || '', them.phi || '');
    return {
      overall: Math.round(cog * 0.35 + pol * 0.2 + att * 0.2 + phi * 0.25),
      cog: cog,
      pol: pol,
      att: att,
      phi: phi,
      blend: Math.round((phi + pol) / 2),
      rapport: Math.round((cog + att) / 2)
    };
  }

  g.AnimusCompareCompat = {
    calcCogCompat: calcCogCompat,
    calcPolCompat: calcPolCompat,
    calcAttCompat: calcAttCompat,
    calcPhiCompat: calcPhiCompat,
    hasCogData: hasCogData,
    calcOverall: calcOverall
  };
})(typeof window !== 'undefined' ? window : globalThis);
