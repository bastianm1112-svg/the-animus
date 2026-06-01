/* Cross-dimension scoring: one answer can inform multiple traits (Ne↔E7, Fi↔E4, etc.) */
(function (g) {
  'use strict';

  // Primary fn → correlated dimensions (weight = how much of the answer score applies)
  var FN_ALSO = {
    Ne: [{ fn: 'E7', w: 0.78 }, { fn: 'EP_INT', w: 0.42 }, { fn: 'TMP_CHO', w: 0.38 }],
    Ni: [{ fn: 'E5', w: 0.38 }, { fn: 'PH_NIE', w: 0.45 }, { fn: 'EP_INT', w: 0.35 }],
    Fi: [{ fn: 'E4', w: 0.74 }, { fn: 'MF_CARE', w: 0.62 }, { fn: 'E9', w: 0.22 }],
    Fe: [{ fn: 'E2', w: 0.58 }, { fn: 'SOC_INT', w: 0.52 }, { fn: 'MF_CARE', w: 0.38 }],
    Te: [{ fn: 'E3', w: 0.48 }, { fn: 'E8', w: 0.32 }, { fn: 'ET_VIR', w: 0.35 }, { fn: 'SOC_DOM', w: 0.4 }],
    Ti: [{ fn: 'E5', w: 0.58 }, { fn: 'EP_RAT', w: 0.62 }, { fn: 'PH_SKE', w: 0.42 }],
    Si: [{ fn: 'E1', w: 0.42 }, { fn: 'E6', w: 0.35 }, { fn: 'MF_LOY', w: 0.38 }, { fn: 'AL_SEN', w: 0.35 }],
    Se: [{ fn: 'E7', w: 0.28 }, { fn: 'E8', w: 0.45 }, { fn: 'AL_SEN', w: 0.4 }],
    E7: [{ fn: 'Ne', w: 0.78 }, { fn: 'TMP_CHO', w: 0.45 }, { fn: 'EP_INT', w: 0.3 }],
    E4: [{ fn: 'Fi', w: 0.74 }, { fn: 'MF_CARE', w: 0.45 }],
    E2: [{ fn: 'Fe', w: 0.58 }, { fn: 'MF_CARE', w: 0.5 }],
    E3: [{ fn: 'Te', w: 0.48 }, { fn: 'SOC_DOM', w: 0.4 }],
    E5: [{ fn: 'Ti', w: 0.58 }, { fn: 'EP_RAT', w: 0.45 }, { fn: 'AL_INT', w: 0.42 }],
    E6: [{ fn: 'Si', w: 0.35 }, { fn: 'EP_SKP', w: 0.4 }],
    E8: [{ fn: 'Te', w: 0.32 }, { fn: 'Se', w: 0.45 }, { fn: 'SOC_DOM', w: 0.45 }],
    E9: [{ fn: 'Fi', w: 0.22 }, { fn: 'SOC_WAR', w: 0.35 }],
    E1: [{ fn: 'Si', w: 0.42 }, { fn: 'MF_FAIR', w: 0.4 }],
    PH_NIE: [{ fn: 'Ni', w: 0.45 }, { fn: 'EP_INT', w: 0.35 }],
    PH_SKE: [{ fn: 'Ti', w: 0.42 }, { fn: 'EP_SKP', w: 0.5 }],
    PH_STO: [{ fn: 'ET_VIR', w: 0.45 }, { fn: 'AL_INT', w: 0.35 }],
    ET_CON: [{ fn: 'MF_FAIR', w: 0.55 }],
    ET_DEO: [{ fn: 'MF_AUTH', w: 0.55 }, { fn: 'MF_PUR', w: 0.4 }],
    ET_EGO: [{ fn: 'MF_LIB', w: 0.5 }],
    AT_ANX: [{ fn: 'SOC_WAR', w: 0.35 }],
    AT_AVO: [{ fn: 'AL_INT', w: 0.45 }],
    TMP_SAN: [{ fn: 'Fe', w: 0.4 }, { fn: 'SOC_INT', w: 0.45 }],
    TMP_MEL: [{ fn: 'Fi', w: 0.38 }, { fn: 'E4', w: 0.35 }],
    IV_SX: [{ fn: 'E4', w: 0.3 }, { fn: 'AL_INT', w: 0.35 }]
  };

  // When no direct questions were asked, infer from related measured traits
  var DERIVED_FN = {
    EP_RAT: [{ fn: 'Ti', w: 0.55 }, { fn: 'PH_SKE', w: 0.35 }],
    EP_EMP: [{ fn: 'Fe', w: 0.45 }, { fn: 'Se', w: 0.35 }, { fn: 'PH_EPI', w: 0.3 }],
    EP_INT: [{ fn: 'Ni', w: 0.4 }, { fn: 'Ne', w: 0.35 }],
    EP_SKP: [{ fn: 'PH_SKE', w: 0.45 }, { fn: 'E6', w: 0.35 }],
    MF_CARE: [{ fn: 'Fi', w: 0.5 }, { fn: 'Fe', w: 0.4 }],
    MF_FAIR: [{ fn: 'E1', w: 0.35 }, { fn: 'ET_CON', w: 0.4 }],
    MF_LOY: [{ fn: 'Si', w: 0.4 }, { fn: 'Fe', w: 0.3 }],
    MF_AUTH: [{ fn: 'ET_DEO', w: 0.4 }, { fn: 'PC_AUTH', w: 0.35 }],
    MF_PUR: [{ fn: 'ET_DEO', w: 0.35 }, { fn: 'PH_STO', w: 0.3 }],
    MF_LIB: [{ fn: 'ET_EGO', w: 0.45 }, { fn: 'PC_LIB', w: 0.35 }],
    SOC_DOM: [{ fn: 'Te', w: 0.4 }, { fn: 'E8', w: 0.35 }],
    SOC_INT: [{ fn: 'Fe', w: 0.45 }, { fn: 'TMP_SAN', w: 0.35 }],
    SOC_WAR: [{ fn: 'E9', w: 0.35 }, { fn: 'AT_ANX', w: 0.3 }],
    SOC_DIR: [{ fn: 'Te', w: 0.35 }, { fn: 'E3', w: 0.35 }],
    AL_INT: [{ fn: 'Ti', w: 0.35 }, { fn: 'E5', w: 0.4 }, { fn: 'AT_AVO', w: 0.35 }],
    AL_SEN: [{ fn: 'Si', w: 0.35 }, { fn: 'Se', w: 0.4 }]
  };

  // Short-test pools: tags that can supply questions for each allocated dimension
  var SHORT_POOL_TAGS = {
    EP_RAT: ['Ti', 'PH_SKE', 'EP_RAT'],
    EP_EMP: ['Fe', 'Se', 'PH_EPI', 'EP_EMP'],
    EP_INT: ['Ni', 'Ne', 'EP_INT'],
    EP_SKP: ['PH_SKE', 'E6', 'EP_SKP'],
    MF_CARE: ['Fi', 'Fe', 'E2', 'MF_CARE'],
    MF_FAIR: ['E1', 'ET_CON', 'MF_FAIR'],
    MF_LOY: ['Si', 'MF_LOY'],
    MF_AUTH: ['ET_DEO', 'PC_AUTH', 'MF_AUTH'],
    MF_PUR: ['ET_DEO', 'PH_STO', 'MF_PUR'],
    MF_LIB: ['ET_EGO', 'PC_LIB', 'MF_LIB'],
    SOC_DOM: ['Te', 'E8', 'SOC_DOM'],
    SOC_INT: ['Fe', 'TMP_SAN', 'SOC_INT'],
    SOC_WAR: ['E9', 'AT_ANX', 'SOC_WAR'],
    SOC_DIR: ['Te', 'E3', 'SOC_DIR'],
    AL_INT: ['Ti', 'E5', 'AT_AVO', 'AL_INT'],
    AL_SEN: ['Si', 'Se', 'AL_SEN']
  };

  function questionTags(q) {
    var tags = [q.fn];
    if (q.tags) q.tags.forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
    if (q.also) Object.keys(q.also).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
    (FN_ALSO[q.fn] || []).forEach(function (x) { if (tags.indexOf(x.fn) < 0) tags.push(x.fn); });
    return tags;
  }

  function qKey(q) {
    return (q.fn || '') + '|' + (q.t || '');
  }

  // Per-choice overrides: strongest signal when a specific option is picked (score 1–7 per extra fn)
  var CHOICE_ALSO_BY_TEXT = {
    'Starting something new versus finishing something old:': {
      'Starting is almost always more exciting \u2014 beginnings are where the energy is': { E7: 7, Ne: 7 }
    },
    'When something painful or difficult comes up, you:': {
      'Tend to reframe it, find the upside, or move toward something positive': { E7: 7, Ne: 5 }
    },
    'Your ideal life has:': {
      'Variety, adventure, and always something new to look forward to': { E7: 7, Ne: 6, TMP_CHO: 6 }
    },
    'When life feels ordinary, you:': {
      'Feel a deep restlessness \u2014 ordinary is never enough for very long': { E4: 6, Fi: 6 }
    },
    'You identify most with:': {
      'Being unique \u2014 I am not like others and I feel that deeply': { E4: 7, Fi: 6 }
    },
    'Authenticity to you means:': {
      'Living in alignment with my own deep values, regardless of what others think': { Fi: 7, E4: 5, MF_CARE: 5 }
    },
    'When you walk into a room, you naturally:': {
      'Read the emotional atmosphere and adjust to make everyone comfortable': { Fe: 7, E2: 6, SOC_INT: 6 }
    },
    'You feel most valuable when:': {
      'Someone needs me and I\'m able to give them exactly what they need': { E2: 7, Fe: 6, MF_CARE: 6 }
    }
  };

  function applyChoicePatches(Q) {
    if (!Q || !Q.length) return;
    Q.forEach(function (q) {
      var patch = CHOICE_ALSO_BY_TEXT[q.t];
      if (!patch || !q.choices) return;
      q.choices.forEach(function (c) {
        var extra = patch[c.t];
        if (extra) c.also = Object.assign({}, c.also || {}, extra);
      });
    });
  }

  g.AnimusCross = {
    FN_ALSO: FN_ALSO,
    DERIVED_FN: DERIVED_FN,
    SHORT_POOL_TAGS: SHORT_POOL_TAGS,
    questionTags: questionTags,
    qKey: qKey,
    applyChoicePatches: applyChoicePatches
  };
})(typeof window !== 'undefined' ? window : globalThis);
