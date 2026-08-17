/**
 * Estimated country placements on the same axes as the compass.
 * Not election results or official scores — coordinate rhymes only.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnimusPoliticalCountries = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SET = [
    { name: 'Sweden', popularity: 5, polX: -35, polY: -20, polZ: 45, dataStatus: 'estimated', sourceNote: 'Nordic social-democratic institutions; estimated compass rhyme.' },
    { name: 'Denmark', popularity: 4, polX: -20, polY: -15, polZ: 30, dataStatus: 'estimated', sourceNote: 'Estimated from commonly cited welfare-state + liberal social policy.' },
    { name: 'Canada', popularity: 5, polX: -10, polY: -5, polZ: 35, dataStatus: 'estimated', sourceNote: 'Estimated liberal-democratic placement.' },
    { name: 'United States', popularity: 5, polX: 18, polY: 8, polZ: 5, dataStatus: 'estimated', sourceNote: 'Broad two-party mix; estimated national average, not a state.' },
    { name: 'United Kingdom', popularity: 5, polX: 8, polY: 5, polZ: 10, dataStatus: 'estimated', sourceNote: 'Estimated mixed-market parliamentary placement.' },
    { name: 'Germany', popularity: 5, polX: 5, polY: 8, polZ: 15, dataStatus: 'estimated', sourceNote: 'Estimated social-market / institutional placement.' },
    { name: 'France', popularity: 4, polX: -8, polY: 12, polZ: 25, dataStatus: 'estimated', sourceNote: 'Estimated dirigiste + secular-progressive mix.' },
    { name: 'Singapore', popularity: 4, polX: 35, polY: 45, polZ: -10, dataStatus: 'estimated', sourceNote: 'Estimated high-capacity state + market economy.' },
    { name: 'Switzerland', popularity: 4, polX: 25, polY: -25, polZ: -5, dataStatus: 'estimated', sourceNote: 'Estimated federal / liberal-market placement.' },
    { name: 'Japan', popularity: 4, polX: 15, polY: 20, polZ: -25, dataStatus: 'estimated', sourceNote: 'Estimated continuity-heavy institutional mix.' },
    { name: 'South Korea', popularity: 4, polX: 10, polY: 18, polZ: 5, dataStatus: 'estimated', sourceNote: 'Estimated developmental-state placement.' },
    { name: 'Australia', popularity: 4, polX: 12, polY: 0, polZ: 20, dataStatus: 'estimated', sourceNote: 'Estimated liberal-market democracy.' },
    { name: 'New Zealand', popularity: 3, polX: -5, polY: -10, polZ: 40, dataStatus: 'estimated', sourceNote: 'Estimated liberal social-policy placement.' },
    { name: 'India', popularity: 5, polX: 5, polY: 25, polZ: -20, dataStatus: 'estimated', sourceNote: 'Estimated large-democracy average — not every party.' },
    { name: 'Brazil', popularity: 4, polX: -5, polY: 15, polZ: 0, dataStatus: 'estimated', sourceNote: 'Estimated mixed presidential-system placement.' },
    { name: 'Mexico', popularity: 4, polX: -12, polY: 10, polZ: 10, dataStatus: 'estimated', sourceNote: 'Estimated mixed-economy democracy.' },
    { name: 'Poland', popularity: 3, polX: 10, polY: 22, polZ: -35, dataStatus: 'estimated', sourceNote: 'Estimated conservative-institutional lean in recent decades.' },
    { name: 'Hungary', popularity: 3, polX: 8, polY: 40, polZ: -50, dataStatus: 'estimated', sourceNote: 'Estimated from publicly discussed illiberal-democratic turn.' },
    { name: 'Cuba', popularity: 3, polX: -70, polY: 70, polZ: 20, dataStatus: 'estimated', sourceNote: 'Estimated one-party socialist state placement.' },
    { name: 'China', popularity: 5, polX: -30, polY: 80, polZ: -40, dataStatus: 'estimated', sourceNote: 'Estimated party-state political economy — not a personal endorsement.' },
    { name: 'South Africa', popularity: 4, polX: -12, polY: 8, polZ: 10, dataStatus: 'estimated', sourceNote: 'Estimated mixed-economy democracy; national average, not every party.' },
    { name: 'Nigeria', popularity: 4, polX: 8, polY: 18, polZ: -15, dataStatus: 'estimated', sourceNote: 'Estimated large federal democracy — not every region or party.' },
    { name: 'Kenya', popularity: 3, polX: 5, polY: 12, polZ: -10, dataStatus: 'estimated', sourceNote: 'Estimated mixed-market East African democracy.' },
    { name: 'Ghana', popularity: 3, polX: 0, polY: 5, polZ: 5, dataStatus: 'estimated', sourceNote: 'Estimated stable West African democratic placement.' },
    { name: 'Egypt', popularity: 4, polX: 10, polY: 55, polZ: -40, dataStatus: 'estimated', sourceNote: 'Estimated high-capacity state placement — not a personal endorsement.' },
    { name: 'Turkey', popularity: 4, polX: 12, polY: 40, polZ: -35, dataStatus: 'estimated', sourceNote: 'Estimated from publicly discussed executive-power and cultural mix.' },
    { name: 'Indonesia', popularity: 5, polX: 5, polY: 20, polZ: -20, dataStatus: 'estimated', sourceNote: 'Estimated large-democracy average — not every party or island.' },
    { name: 'Chile', popularity: 3, polX: 8, polY: 0, polZ: 15, dataStatus: 'estimated', sourceNote: 'Estimated market-leaning South American democracy.' },
    { name: 'Argentina', popularity: 4, polX: -8, polY: 10, polZ: 5, dataStatus: 'estimated', sourceNote: 'Estimated mixed presidential-system placement — not every administration.' },
    { name: 'United Arab Emirates', popularity: 4, polX: 40, polY: 50, polZ: -45, dataStatus: 'estimated', sourceNote: 'Estimated high-capacity Gulf state + market economy; not a personal endorsement.' }
  ];

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
        axes: sim.axes,
        rankScore: sim.overall * popPrior
      });
    });
    out.sort(function (x, y) {
      return y.rankScore - x.rankScore;
    });
    return out.slice(0, opts.limit || 8);
  }

  return { SET: SET, rankClosest: rankClosest };
});
