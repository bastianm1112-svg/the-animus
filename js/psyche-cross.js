/* Cross-dimension scoring: one answer can inform multiple traits (Ne↔E7, Fi↔E4, etc.) */
(function (g) {
  'use strict';

  // Primary fn → correlated dimensions (weight = how much of the answer score applies)
  var FN_ALSO = {
    Ne: [{ fn: 'E7', w: 0.78 }, { fn: 'EP_INT', w: 0.42 }, { fn: 'TMP_CHO', w: 0.38 }],
    Ni: [{ fn: 'E5', w: 0.38 }, { fn: 'PH_NIE', w: 0.45 }, { fn: 'EP_INT', w: 0.35 }],
    Fi: [{ fn: 'E4', w: 0.74 }, { fn: 'MF_CARE', w: 0.62 }, { fn: 'E9', w: 0.22 }],
    Fe: [{ fn: 'E2', w: 0.48 }, { fn: 'SOC_INT', w: 0.52 }, { fn: 'MF_CARE', w: 0.38 }],
    Te: [{ fn: 'E3', w: 0.48 }, { fn: 'E8', w: 0.32 }, { fn: 'ET_VIR', w: 0.35 }, { fn: 'SOC_DOM', w: 0.4 }],
    Ti: [{ fn: 'E5', w: 0.5 }, { fn: 'EP_RAT', w: 0.58 }, { fn: 'PH_SKE', w: 0.42 }],
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

  function polQuadrant(polX, polY) {
    if (polX >= 0 && polY < 0) return 'lib-right';
    if (polX >= 0 && polY >= 0) return 'auth-right';
    if (polX < 0 && polY < 0) return 'lib-left';
    return 'auth-left';
  }

  var POL_COMPARISONS = {
    'lib-right': {
      thinkers: [
        'Milton Friedman: market freedom and limited state intervention',
        'Friedrich Hayek: spontaneous order and skepticism of central planning',
        'John Stuart Mill: individual liberty as the foundation of progress',
        'Adam Smith: invisible-hand coordination without heavy coercion',
        'Robert Nozick: minimal state justified by individual rights',
        'Ayn Rand: rational self-interest and property rights',
        'Thomas Sowell: empirical skepticism of redistribution schemes',
        'David Hume: institutional evolution over utopian design'
      ],
      politicians: [
        'Ron Paul: libertarian constitutionalism and anti-interventionism',
        'Gary Johnson: fiscally conservative, socially liberal synthesis',
        'Justin Amash: civil liberties with market-oriented economics',
        'Barry Goldwater: limited government conservatism',
        'Margaret Thatcher (economic wing): privatization and market reform',
        'Calvin Coolidge: restrained federal footprint',
        'Javier Milei: radical market liberalization agenda',
        'Angela Merkel (fiscal wing): ordoliberal discipline in macro policy'
      ],
      countries: [
        'Switzerland: federalism, direct democracy, economic openness',
        'Singapore: market dynamism with light-touch social regulation',
        'New Zealand: trade openness and regulatory reform history',
        'Ireland: pro-enterprise tax and EU market integration',
        'Chile: market-oriented development with institutional stability',
        'Estonia: digital governance and flat-tax experimentation',
        'Canada (western provinces): resource economy plus trade integration',
        'Australia: open economy with competitive federalism'
      ],
      parties: [
        'Libertarian Party (US): maximal individual and economic liberty',
        'FDP (Germany): market liberalism and civil rights',
        'People\'s Party (Switzerland): decentralization and fiscal restraint',
        'ACT New Zealand: classical liberal policy platform',
        'Progressive Conservatives (Canada, historical): balanced market reform',
        'VVD (Netherlands): pro-enterprise with social tolerance'
      ]
    },
    'auth-right': {
      thinkers: [
        'Edmund Burke: tradition, gradual change, and institutional wisdom',
        'Thomas Hobbes: strong order to prevent civil conflict',
        'Leo Strauss: civilization defended through disciplined institutions',
        'Roger Scruton: beauty, home, and continuity against radical rupture',
        'Samuel Huntington: civilizational order and institutional stability',
        'Michael Oakeshott: pragmatic conservatism over abstract revolution',
        'Russell Kirk: moral order anchored in enduring norms',
        'Carl Schmitt (critical read): sovereignty and friend-enemy politics'
      ],
      politicians: [
        'Winston Churchill: national resolve and institutional leadership',
        'Ronald Reagan: strong defense with market economics',
        'Margaret Thatcher: state retrenchment plus national cohesion',
        'Charles de Gaulle: republican authority and national grandeur',
        'Lee Kuan Yew: development through firm governance',
        'Benjamin Netanyahu: security-first statecraft',
        'Narendra Modi: nation-building through executive strength',
        'Giorgia Meloni: sovereigntist conservatism in the EU context'
      ],
      countries: [
        'Japan: social order, long horizons, and institutional continuity',
        'South Korea: rapid development under strong state capacity',
        'Poland: sovereigntist conservatism in post-communist transition',
        'Israel: security state with market innovation',
        'Hungary: nationalist governance with EU friction',
        'Turkey: executive centralization and regional power projection',
        'India: developmental state with civilizational nationalism',
        'United Arab Emirates: stability-led modernization'
      ],
      parties: [
        'Republican Party (US, conservative wing): markets plus traditional order',
        'Conservative Party (UK): institutional continuity and national interest',
        'Lega / Brothers of Italy: national conservatism in Europe',
        'Law and Justice (Poland): sovereigntist social conservatism',
        'Likud (Israel): security and nationalist governance',
        'CDU/CSU (Germany): Christian-democratic moderation'
      ]
    },
    'lib-left': {
      thinkers: [
        'Noam Chomsky: civil liberties and critique of concentrated power',
        'Murray Bookchin: municipal freedom and ecological socialism',
        'Rosa Luxemburg: democratic socialism against authoritarian capture',
        'Emma Goldman: anarchist feminism and anti-coercion ethics',
        'Karl Polanyi: embedding markets in social protection',
        'Antonio Gramsci (civil-libertarian read): cultural hegemony and participation',
        'Amartya Sen: capability freedom beyond GDP alone',
        'Martha Nussbaum: dignity, rights, and human development'
      ],
      politicians: [
        'Bernie Sanders: redistributive economics with civil-libertarian streak',
        'Alexandria Ocasio-Cortez: climate justice and labor rights',
        'Jeremy Corbyn: anti-austerity and anti-interventionism',
        'Pablo Iglesias: participatory left in Spain',
        'Alexis Tsipras (2015): anti-austerity mandate',
        'Luiz Inácio Lula da Silva: social programs with democratic legitimacy',
        'Jacinda Ardern: inclusive governance and welfare expansion',
        'Ralph Nader: corporate accountability and consumer protection'
      ],
      countries: [
        'Uruguay: progressive social policy with democratic stability',
        'Costa Rica: welfare state without heavy militarization',
        'Iceland: egalitarian norms and civic participation',
        'Portugal: drug-policy reform and social-democratic consensus',
        'Finland: education equity and labor protections',
        'Denmark (social wing): Nordic model with civil openness',
        'Scotland (policy culture): communitarian civic identity',
        'Bhutan: wellbeing metrics over pure growth'
      ],
      parties: [
        'Green Party (multiple countries): ecology plus civil liberties',
        'Podemos (Spain): participatory left',
        'Syriza (Greece, historical): anti-austerity coalition',
        'Labour left (UK): redistribution and public services',
        'Democratic Socialists of America: workplace democracy agenda',
        'Die Linke (Germany): anti-austerity and peace politics'
      ]
    },
    'auth-left': {
      thinkers: [
        'Karl Marx: class analysis and critique of capital accumulation',
        'Antonio Gramsci: hegemony and cultural struggle',
        'John Rawls (egalitarian read): fairness as institutional design',
        'John Maynard Keynes: macro stabilization and full employment',
        'Eduard Bernstein: evolutionary socialism within democracy',
        'Rosa Luxemburg: revolutionary democracy against bureaucracy',
        'Thomas Piketty: inequality dynamics and progressive taxation',
        'Ha-Joon Chang: developmental state and industrial policy'
      ],
      politicians: [
        'Franklin D. Roosevelt: New Deal state capacity',
        'Lyndon B. Johnson: Great Society expansion',
        'Olof Palme: Nordic social democracy and peace diplomacy',
        'Wilhelm Liebknecht / SPD founders: labor rights in parliament',
        'Nelson Mandela (economic wing): redistribution after apartheid',
        'Luiz Inácio Lula da Silva: Bolsa Família and labor gains',
        'Mette Frederiksen: Nordic welfare with immigration controls',
        'Olaf Scholz: corporatist stability and social insurance'
      ],
      countries: [
        'Sweden: strong unions, welfare, and state coordination',
        'Norway: sovereign wealth fund and egalitarian norms',
        'France: republican universalism and labor protections',
        'Germany: co-determination and vocational training system',
        'Brazil (Workers\' Party eras): conditional cash transfers',
        'South Africa (post-1994): constitutional rights plus redistribution debate',
        'Taiwan: progressive social policy with democratic institutions',
        'Belgium: negotiated labor-market institutions'
      ],
      parties: [
        'Social Democratic parties (Nordic): welfare capitalism',
        'Labour Party (UK): public services and workers\' rights',
        'PSOE / PSOE-left (Spain): social investment',
        'Workers\' Party (Brazil): poverty reduction programs',
        'SPD (Germany): social market coordination',
        'Democratic Party (US, progressive wing): safety-net expansion'
      ]
    }
  };

  function buildPoliticalComparisons(polX, polY) {
    var q = polQuadrant(polX || 0, polY || 0);
    var base = POL_COMPARISONS[q] || POL_COMPARISONS['lib-left'];
    var leanEcon = polX > 15 ? 'market-leaning' : polX < -15 ? 'redistribution-leaning' : 'economically centrist';
    var leanSoc = polY > 15 ? 'order-leaning' : polY < -15 ? 'liberty-leaning' : 'socially centrist';
    var prefix = 'Profile axis X=' + Math.round(polX || 0) + ' Y=' + Math.round(polY || 0) + ' (' + leanEcon + ', ' + leanSoc + '): ';
    return {
      politicalThinkers: base.thinkers.map(function (t) { return prefix + t; }),
      similarPoliticians: base.politicians.map(function (t) { return prefix + t; }),
      similarCountries: base.countries.map(function (t) { return prefix + t; }),
      similarParties: base.parties.map(function (t) { return prefix + t; })
    };
  }

  g.AnimusCross = {
    FN_ALSO: FN_ALSO,
    DERIVED_FN: DERIVED_FN,
    SHORT_POOL_TAGS: SHORT_POOL_TAGS,
    questionTags: questionTags,
    qKey: qKey,
    applyChoicePatches: applyChoicePatches,
    polQuadrant: polQuadrant,
    buildPoliticalComparisons: buildPoliticalComparisons
  };
})(typeof window !== 'undefined' ? window : globalThis);
