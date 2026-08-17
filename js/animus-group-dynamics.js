/**
 * Group dynamics — centroid + spread, not a fake average type.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusGroupDynamics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce(function (s, n) { return s + n; }, 0) / arr.length;
  }

  function variance(arr) {
    if (arr.length < 2) return 0;
    var m = mean(arr);
    return mean(arr.map(function (n) { return (n - m) * (n - m); }));
  }

  function stdev(arr) {
    return Math.sqrt(variance(arr));
  }

  function median(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function iqr(arr) {
    if (arr.length < 4) return stdev(arr);
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var q1 = s[Math.floor(s.length / 4)];
    var q3 = s[Math.floor((s.length * 3) / 4)];
    return q3 - q1;
  }

  function pairKey(a, b) {
    return a.uid < b.uid ? a.uid + '|' + b.uid : b.uid + '|' + a.uid;
  }

  function analyze(people, opts) {
    opts = opts || {};
    people = (people || []).filter(function (p) { return p && p.uid; });
    var unique = [];
    var seen = {};
    people.forEach(function (p) {
      if (seen[p.uid]) return;
      seen[p.uid] = true;
      unique.push(p);
    });
    people = unique;

    var result = {
      memberCount: people.length,
      emptyReason: null,
      cohesion: null,
      diversity: null,
      centroid: null,
      spread: null,
      closestPair: null,
      contrastingPair: null,
      centralMember: null,
      distinctiveMember: null,
      clusters: [],
      outliers: [],
      axisNotes: [],
      cultural: null,
      qualified: 'These patterns describe score spread. They are not predictions of behavior.'
    };

    if (people.length < 1) {
      result.emptyReason = 'no-members';
      return result;
    }
    if (people.length === 1) {
      result.emptyReason = 'one-member';
      result.centralMember = { uid: people[0].uid, name: people[0].displayName };
      return result;
    }

    var withTypes = people.filter(function (p) { return p.mbti; });
    if (withTypes.length < 2) {
      result.emptyReason = 'missing-results';
      return result;
    }

    var Pol = typeof AnimusPolitical !== 'undefined' ? AnimusPolitical : null;
    var Compat = typeof AnimusCompareCompat !== 'undefined' ? AnimusCompareCompat : null;

    var xs = withTypes.map(function (p) { return Number(p.polX) || 0; });
    var ys = withTypes.map(function (p) { return Number(p.polY) || 0; });
    var zs = withTypes.map(function (p) { return p.polZ; }).filter(function (z) { return z != null; });
    result.centroid = {
      polX: Math.round(mean(xs)),
      polY: Math.round(mean(ys)),
      note: 'Centroid is a location, not the group\'s personality type.'
    };
    result.spread = {
      polX: { mean: Math.round(mean(xs)), sd: Math.round(stdev(xs)), iqr: Math.round(iqr(xs)) },
      polY: { mean: Math.round(mean(ys)), sd: Math.round(stdev(ys)), iqr: Math.round(iqr(ys)) }
    };
    if (opts.includeCultural && zs.length === withTypes.length) {
      result.centroid.polZ = Math.round(mean(zs));
      result.spread.polZ = { mean: Math.round(mean(zs)), sd: Math.round(stdev(zs)), iqr: Math.round(iqr(zs)) };
      result.cultural = {
        mean: result.centroid.polZ,
        sd: result.spread.polZ.sd,
        label: Pol ? Pol.culturalLabel(result.centroid.polZ) : ''
      };
    }

    var pairs = [];
    for (var i = 0; i < withTypes.length; i++) {
      for (var j = i + 1; j < withTypes.length; j++) {
        var a = withTypes[i];
        var b = withTypes[j];
        var overall = 50;
        if (Compat && Compat.calcOverall) {
          var c = Compat.calcOverall(a, b);
          if (c) overall = c.overall;
        }
        var pol = Pol
          ? Pol.overallSimilarity(a, b, { includeCultural: !!(opts.includeCultural && a.polZ != null && b.polZ != null) })
          : { overall: 50, axes: [] };
        pairs.push({
          a: a, b: b, key: pairKey(a, b), overall: overall, pol: pol.overall, axes: pol.axes
        });
      }
    }
    pairs.sort(function (x, y) { return y.overall - x.overall; });
    if (pairs.length) {
      var close = pairs[0];
      var far = pairs[pairs.length - 1];
      result.closestPair = {
        names: [close.a.displayName, close.b.displayName],
        uids: [close.a.uid, close.b.uid],
        overall: close.overall
      };
      result.contrastingPair = {
        names: [far.a.displayName, far.b.displayName],
        uids: [far.a.uid, far.b.uid],
        overall: far.overall
      };
    }

    var avgPair = mean(pairs.map(function (p) { return p.overall; }));
    result.cohesion = Math.round(avgPair);
    result.diversity = Math.round(100 - avgPair);

    function distToCentroid(p) {
      var dx = (Number(p.polX) || 0) - result.centroid.polX;
      var dy = (Number(p.polY) || 0) - result.centroid.polY;
      var dz = result.centroid.polZ != null && p.polZ != null ? (p.polZ - result.centroid.polZ) : 0;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    var ranked = withTypes.slice().sort(function (a, b) {
      return distToCentroid(a) - distToCentroid(b);
    });
    result.centralMember = {
      uid: ranked[0].uid,
      name: ranked[0].displayName,
      note: 'Closest to the group centroid — not a leader.'
    };
    result.distinctiveMember = {
      uid: ranked[ranked.length - 1].uid,
      name: ranked[ranked.length - 1].displayName,
      note: 'Farthest from the centroid on measured axes.'
    };

    var sdPol = (result.spread.polX.sd + result.spread.polY.sd) / 2;
    ranked.forEach(function (p) {
      if (distToCentroid(p) > sdPol * 1.6 + 18) {
        result.outliers.push({ uid: p.uid, name: p.displayName });
      }
    });

    var left = withTypes.filter(function (p) { return (p.polX || 0) < -15; });
    var right = withTypes.filter(function (p) { return (p.polX || 0) > 15; });
    var mid = withTypes.filter(function (p) { return Math.abs(p.polX || 0) <= 15; });
    function pack(list, label) {
      if (list.length < 2) return null;
      return { label: label, members: list.map(function (p) { return p.displayName; }) };
    }
    [pack(left, 'More economically left'), pack(right, 'More economically right'), pack(mid, 'Near economic center')]
      .filter(Boolean)
      .slice(0, 3)
      .forEach(function (c) { result.clusters.push(c); });

    result.axisNotes.push(
      'Economic spread σ≈' + result.spread.polX.sd + ' — ' +
        (result.spread.polX.sd < 12 ? 'tight consensus' : result.spread.polX.sd < 28 ? 'noticeable disagreement' : 'wide disagreement') + '.'
    );
    result.axisNotes.push(
      'Authority spread σ≈' + result.spread.polY.sd + ' — ' +
        (result.spread.polY.sd < 12 ? 'tight consensus' : result.spread.polY.sd < 28 ? 'noticeable disagreement' : 'wide disagreement') + '.'
    );

    var mbtiCounts = {};
    withTypes.forEach(function (p) {
      mbtiCounts[p.mbti] = (mbtiCounts[p.mbti] || 0) + 1;
    });
    result.mbtiDistribution = mbtiCounts;
    result.commonTendencies = Object.keys(mbtiCounts).sort(function (a, b) {
      return mbtiCounts[b] - mbtiCounts[a];
    }).slice(0, 3);

    return result;
  }

  return { analyze: analyze, mean: mean, stdev: stdev };
});
