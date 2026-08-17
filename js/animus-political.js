/**
 * Normalized multidimensional political distance + hedged similarity language.
 * Cultural axis (polZ) is Plus-only and must not overpower X/Y.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusPolitical = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function norm(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) n = 0;
    return Math.max(-1, Math.min(1, n / 100));
  }

  function dist2(a, b) {
    var dx = norm(a.polX) - norm(b.polX);
    var dy = norm(a.polY) - norm(b.polY);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function dist3(a, b) {
    var dx = norm(a.polX) - norm(b.polX);
    var dy = norm(a.polY) - norm(b.polY);
    var dz = norm(a.polZ) - norm(b.polZ);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function maxDist(useZ) {
    return useZ ? Math.sqrt(3) : Math.sqrt(2);
  }

  function similarityFromDistance(d, useZ) {
    var sim = 100 * (1 - d / maxDist(useZ));
    return Math.max(0, Math.round(sim));
  }

  function overallSimilarity(a, b, opts) {
    opts = opts || {};
    var useZ = !!(opts.includeCultural && a && b && a.polZ != null && b.polZ != null);
    var d = useZ ? dist3(a, b) : dist2(a, b);
    return {
      overall: similarityFromDistance(d, useZ),
      distance: Math.round(d * 1000) / 1000,
      includeCultural: useZ,
      axes: axisDeltas(a, b, useZ)
    };
  }

  function axisDeltas(a, b, useZ) {
    var axes = [
      { id: 'economic', label: 'Economic', a: a.polX || 0, b: b.polX || 0, delta: Math.abs((a.polX || 0) - (b.polX || 0)) },
      { id: 'authority', label: 'Authority', a: a.polY || 0, b: b.polY || 0, delta: Math.abs((a.polY || 0) - (b.polY || 0)) }
    ];
    if (useZ) {
      axes.push({
        id: 'cultural',
        label: 'Cultural',
        a: a.polZ || 0,
        b: b.polZ || 0,
        delta: Math.abs((a.polZ || 0) - (b.polZ || 0))
      });
    }
    return axes;
  }

  function similarityBand(score) {
    if (score >= 90) return 'very-strong';
    if (score >= 75) return 'strong';
    if (score >= 55) return 'moderate';
    if (score >= 35) return 'slight';
    return 'distant';
  }

  function similarityLabel(score) {
    var band = similarityBand(score);
    if (band === 'very-strong') return 'Very close on the axes measured';
    if (band === 'strong') return 'Strong similarity — not identical';
    if (band === 'moderate') return 'Moderately similar';
    if (band === 'slight') return 'Slight overlap with clear differences';
    return 'Quite different overall';
  }

  function twinLanguageAllowed(result) {
    if (!result || result.overall < 90) return false;
    return (result.axes || []).every(function (ax) {
      return ax.delta <= 18;
    });
  }

  function strongest(axes, kind) {
    var list = (axes || []).slice().sort(function (x, y) {
      return kind === 'similar' ? x.delta - y.delta : y.delta - x.delta;
    });
    return list.slice(0, 2);
  }

  function culturalLabel(polZ) {
    var z = Number(polZ) || 0;
    if (z > 40) return 'Cultural progressive';
    if (z > 12) return 'Leans culturally progressive';
    if (z < -40) return 'Cultural traditional';
    if (z < -12) return 'Leans culturally traditional';
    return 'Culturally mixed / center';
  }

  function axisExplain() {
    return {
      economic: 'Economic left (−) to economic right (+). Markets, tax, and ownership — not culture.',
      authority: 'Libertarian (−) to authoritarian (+). How much centralized authority vs personal liberty.',
      cultural:
        'Cultural traditionalism (−) to cultural progressivism (+). Custom, family forms, secularism, and continuity vs reform. Independent of tax policy and of state power.'
    };
  }

  /** Pair-compat number used by compare (0–100). */
  function calcPolCompat(x1, y1, x2, y2, z1, z2) {
    var a = { polX: x1, polY: y1, polZ: z1 };
    var b = { polX: x2, polY: y2, polZ: z2 };
    var include = z1 != null && z2 != null;
    return overallSimilarity(a, b, { includeCultural: include }).overall;
  }

  return {
    norm: norm,
    overallSimilarity: overallSimilarity,
    similarityBand: similarityBand,
    similarityLabel: similarityLabel,
    twinLanguageAllowed: twinLanguageAllowed,
    strongest: strongest,
    culturalLabel: culturalLabel,
    axisExplain: axisExplain,
    calcPolCompat: calcPolCompat
  };
});
