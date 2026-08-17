/**
 * Curated political figures for compass matching.
 * Coordinates are ESTIMATED from public records / commonly cited placements —
 * not test results. Never treat as documented psychometric scores.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusPoliticalFigures = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SET = [
    { name: 'Bernie Sanders', popularity: 5, polX: -72, polY: -25, polZ: 55, dataStatus: 'estimated', sourceNote: 'Public voting record and stated economic/social positions; compass placement estimated.' },
    { name: 'Alexandria Ocasio-Cortez', popularity: 5, polX: -70, polY: -20, polZ: 70, dataStatus: 'estimated', sourceNote: 'Public platform; estimated placement.' },
    { name: 'Joe Biden', popularity: 5, polX: -18, polY: 8, polZ: 25, dataStatus: 'estimated', sourceNote: 'Centrist-Democrat public record; estimated.' },
    { name: 'Barack Obama', popularity: 5, polX: -22, polY: 5, polZ: 30, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Kamala Harris', popularity: 5, polX: -20, polY: 10, polZ: 40, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Donald Trump', popularity: 5, polX: 45, polY: 35, polZ: -40, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Ronald Reagan', popularity: 5, polX: 55, polY: 20, polZ: -45, dataStatus: 'estimated', sourceNote: 'Historical public record; estimated.' },
    { name: 'Margaret Thatcher', popularity: 5, polX: 62, polY: 18, polZ: -35, dataStatus: 'estimated', sourceNote: 'Historical public record; estimated.' },
    { name: 'Milton Friedman', popularity: 4, polX: 78, polY: -55, polZ: 5, dataStatus: 'estimated', sourceNote: 'Published economic views; estimated.' },
    { name: 'Friedrich Hayek', popularity: 4, polX: 70, polY: -60, polZ: -10, dataStatus: 'estimated', sourceNote: 'Published works; estimated.' },
    { name: 'Ayn Rand', popularity: 4, polX: 85, polY: -70, polZ: 20, dataStatus: 'estimated', sourceNote: 'Published philosophy; estimated.' },
    { name: 'Noam Chomsky', popularity: 4, polX: -80, polY: -65, polZ: 50, dataStatus: 'estimated', sourceNote: 'Published political writing; estimated.' },
    { name: 'Karl Marx', popularity: 5, polX: -90, polY: 25, polZ: 40, dataStatus: 'estimated', sourceNote: 'Historical texts; estimated. Not a living politician.' },
    { name: 'John Locke', popularity: 4, polX: 30, polY: -50, polZ: -15, dataStatus: 'estimated', sourceNote: 'Historical texts; estimated.' },
    { name: 'Edmund Burke', popularity: 3, polX: 20, polY: 15, polZ: -70, dataStatus: 'estimated', sourceNote: 'Historical texts; estimated.' },
    { name: 'Justin Trudeau', popularity: 4, polX: -25, polY: 5, polZ: 55, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Emmanuel Macron', popularity: 4, polX: 15, polY: 10, polZ: 35, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Angela Merkel', popularity: 5, polX: 8, polY: 12, polZ: 5, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Vladimir Putin', popularity: 5, polX: 10, polY: 80, polZ: -60, dataStatus: 'estimated', sourceNote: 'Public record of state power; estimated.' },
    { name: 'Xi Jinping', popularity: 5, polX: -40, polY: 85, polZ: -50, dataStatus: 'estimated', sourceNote: 'Public record of state power; estimated.' },
    { name: 'Gary Johnson', popularity: 3, polX: 40, polY: -70, polZ: 25, dataStatus: 'estimated', sourceNote: 'US LP-adjacent public record; estimated.' },
    { name: 'Ron Paul', popularity: 4, polX: 55, polY: -75, polZ: -20, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Elizabeth Warren', popularity: 4, polX: -55, polY: 5, polZ: 50, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Mitt Romney', popularity: 4, polX: 40, polY: 15, polZ: -25, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Keir Starmer', popularity: 4, polX: -15, polY: 12, polZ: 20, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Nayib Bukele', popularity: 4, polX: 25, polY: 55, polZ: -15, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Jacinda Ardern', popularity: 4, polX: -30, polY: 0, polZ: 60, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Viktor Orbán', popularity: 4, polX: 20, polY: 55, polZ: -75, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Pope Francis', popularity: 5, polX: -35, polY: 20, polZ: -30, dataStatus: 'estimated', sourceNote: 'Public teaching; estimated — not a party politician.' },
    { name: 'Thomas Sowell', popularity: 3, polX: 60, polY: -15, polZ: -25, dataStatus: 'estimated', sourceNote: 'Published commentary; estimated.' },
    { name: 'Nelson Mandela', popularity: 5, polX: -35, polY: -10, polZ: 25, dataStatus: 'estimated', sourceNote: 'Historical public record; estimated. Not a living politician.' },
    { name: 'Lee Kuan Yew', popularity: 4, polX: 25, polY: 50, polZ: -25, dataStatus: 'estimated', sourceNote: 'Historical public record of state-building; estimated.' },
    { name: 'Luiz Inácio Lula da Silva', popularity: 5, polX: -40, polY: 8, polZ: 20, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Andrés Manuel López Obrador', popularity: 4, polX: -30, polY: 20, polZ: -5, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Narendra Modi', popularity: 5, polX: 18, polY: 38, polZ: -45, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Tsai Ing-wen', popularity: 4, polX: 5, polY: -5, polZ: 40, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Ellen Johnson Sirleaf', popularity: 3, polX: -10, polY: 5, polZ: 15, dataStatus: 'estimated', sourceNote: 'Historical public record; estimated.' },
    { name: 'Giorgia Meloni', popularity: 4, polX: 22, polY: 28, polZ: -55, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Sanna Marin', popularity: 3, polX: -28, polY: -5, polZ: 55, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Claudia Sheinbaum', popularity: 4, polX: -32, polY: 12, polZ: 10, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Cyril Ramaphosa', popularity: 3, polX: -18, polY: 10, polZ: 5, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' },
    { name: 'Joko Widodo', popularity: 4, polX: -5, polY: 15, polZ: -10, dataStatus: 'estimated', sourceNote: 'Public record; estimated.' }
  ];

  var MISMATCH_FLOOR = 0.85;

  function rankClosest(profile, opts) {
    opts = opts || {};
    var Pol = root.AnimusPolitical;
    try {
      if (!Pol) Pol = require('./animus-political.js');
    } catch (e) {}
    if (!Pol) return [];
    var includeZ = !!(opts.includeCultural && profile && profile.polZ != null);
    var out = [];
    SET.forEach(function (fig) {
      var b = { polX: fig.polX, polY: fig.polY, polZ: includeZ ? fig.polZ : undefined };
      var a = {
        polX: profile.polX,
        polY: profile.polY,
        polZ: includeZ ? profile.polZ : undefined
      };
      var sim = Pol.overallSimilarity(a, b, { includeCultural: includeZ });
      if (sim.distance > MISMATCH_FLOOR) return;
      var popPrior = 0.55 + 0.09 * (fig.popularity || 3);
      out.push({
        name: fig.name,
        popularity: fig.popularity,
        dataStatus: fig.dataStatus,
        sourceNote: fig.sourceNote,
        polX: fig.polX,
        polY: fig.polY,
        polZ: fig.polZ,
        similarity: sim.overall,
        band: Pol.similarityBand(sim.overall),
        label: Pol.similarityLabel(sim.overall),
        twin: Pol.twinLanguageAllowed(sim),
        axes: sim.axes,
        rankScore: sim.overall * popPrior
      });
    });
    out.sort(function (x, y) {
      return y.rankScore - x.rankScore;
    });
    return out.slice(0, opts.limit || 8);
  }

  return { SET: SET, rankClosest: rankClosest, MISMATCH_FLOOR: MISMATCH_FLOOR };
});
