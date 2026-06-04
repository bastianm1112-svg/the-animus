/**
 * Daily personality facts — MBTI, Enneagram, attachment, philosophy, politics.
 * One stable fact per user per day, rotated across dimensions they have scored.
 */
(function (g) {
  'use strict';

  var PHI_ORDER = ['PH_NIE', 'PH_EXI', 'PH_ARI', 'PH_KAN', 'PH_STO', 'PH_PRA', 'PH_SKE', 'PH_EPI'];
  var PHI_NAMES = {
    PH_NIE: 'Nietzschean',
    PH_EXI: 'Existentialist',
    PH_ARI: 'Aristotelian',
    PH_KAN: 'Kantian',
    PH_STO: 'Stoic',
    PH_PRA: 'Pragmatist',
    PH_SKE: 'Skeptic',
    PH_EPI: 'Epicurean'
  };

  var PHI_FACTS = {
    PH_NIE: [
      'Nietzschean thought emerged in 19th-century Europe as a critique of comfortable morality — genealogy asks where your values came from, not just whether they are true.',
      'This lens treats self-overcoming as craft: you are not fixed; you are something you are still sculpting under pressure.'
    ],
    PH_EXI: [
      'Existentialism grew from Kierkegaard and later Paris cafés — meaning is not discovered in a manual; it is chosen under the weight of freedom.',
      'Your profile leans here when authenticity matters more than fitting a script someone else wrote for you.'
    ],
    PH_ARI: [
      'Aristotelian ethics began in Athens around practical wisdom (phronesis) — virtue is a habit trained in real relationships, not a slogan.',
      'This tradition asks: what would a flourishing life look like for someone with your temperament — not an abstract ideal type.'
    ],
    PH_KAN: [
      'Kantian philosophy crystalized in Königsberg — duty, universal law, and the idea that persons must never be treated as mere tools.',
      'It originated as an answer to Hume\'s skepticism: what can reason still ground when habit and passion pull elsewhere?'
    ],
    PH_STO: [
      'Stoicism began in Athens (Zeno) and later shaped Rome — Epictetus, Seneca, and Marcus Aurelius practiced it as training for a mind under uncertainty.',
      'The core move is ancient: separate what you control (judgment, effort) from what you do not (outcomes, other people).'
    ],
    PH_PRA: [
      'Pragmatism is American-born — Peirce, James, Dewey — truth as what works in lived experience and democratic inquiry over armchair certainty.',
      'Ideas earn their keep by how they change conduct, not by how elegant they sound in debate.'
    ],
    PH_SKE: [
      'Philosophical skepticism runs from Pyrrho through Sextus Empiricus to modern science — withholding final judgment until evidence compels it.',
      'For your type mix, doubt is often a discipline: fewer false certainties, slower conclusions, better corrections.'
    ],
    PH_EPI: [
      'Epicureanism began in Athens as a garden school — not reckless pleasure, but measured friends, simple needs, and freedom from anxiety.',
      'It originated as a rival to Stoic severity: a good life might be quieter than ambition advertises.'
    ]
  };

  var ATT_NAMES = {
    AT_SEC: 'Secure attachment',
    AT_ANX: 'Anxious attachment',
    AT_AVO: 'Fearful-avoidant',
    AT_DIS: 'Dismissive-avoidant'
  };

  var ATT_FACTS = {
    AT_SEC: [
      'Secure attachment research (Bowlby → Ainsworth) shows comfort with both closeness and solo recovery — trust is built from consistent repair, not perfect harmony.',
      'This pattern often reads as “steady” to others: you can ask for help without collapsing boundaries.'
    ],
    AT_ANX: [
      'Anxious-preoccupied attachment intensified in lab studies when responsiveness was inconsistent — the mind tracks micro-signals of distance.',
      'Naming the loop (“I am scanning for rejection”) often lowers its volume faster than reassurance alone.'
    ],
    AT_AVO: [
      'Fearful-avoidant patterns combine desire for closeness with fear of harm — often shaped by early environments where connection and danger overlapped.',
      'Growth here is graded exposure: safety first, then intimacy in small, provable doses.'
    ],
    AT_DIS: [
      'Dismissive-avoidant attachment privileges self-reliance — independence can be strength until it blocks the support that would actually help.',
      'Others may misread your calm as indifference; your inner signal is often “I will handle it alone.”'
    ]
  };

  var MBTI = {
    INTJ: [
      'INTJs often report their best ideas arrive after they have already structured the problem, not before.',
      'Your type tends to treat long-term plans as moral commitments, not optional preferences.'
    ],
    INTP: [
      'INTPs frequently revise beliefs in private long before they explain the change to anyone else.',
      'Precision in language is often how this type shows respect — vagueness can feel like disrespect.'
    ],
    ENTJ: [
      'ENTJs usually prefer a clear decision with risks named over an open-ended debate with no owner.',
      'Efficiency for this type is often about removing ambiguity for the group, not only moving faster.'
    ],
    ENTP: [
      'ENTPs often think by arguing positions they do not hold, which can confuse more literal types.',
      'Novelty is not distraction for this type — it is often how they test whether an idea is robust.'
    ],
    INFJ: [
      'INFJs frequently sense interpersonal tension before anyone has named it aloud.',
      'This type often needs solitude after social depth — not because they dislike people, but to reintegrate.'
    ],
    INFP: [
      'INFPs tend to measure choices against inner values before measuring them against external success.',
      'Authenticity for this type is structural: saying what you mean is often more important than saying what works.'
    ],
    ENFJ: [
      'ENFJs often read a room’s emotional temperature and adjust their role before anyone asks.',
      'Harmony for this type is not avoidance — it is often active coordination of people’s needs.'
    ],
    ENFP: [
      'ENFPs frequently connect unrelated domains and produce insights others did not know to look for.',
      'This type’s enthusiasm is often exploratory: many threads, each tested for aliveness.'
    ],
    ISTJ: [
      'ISTJs tend to trust proven systems and improve them incrementally rather than replace them suddenly.',
      'Reliability for this type is often shown through consistency, not through visible charisma.'
    ],
    ISFJ: [
      'ISFJs frequently remember details about people that become the glue of long-term trust.',
      'Duty for this type is often personal: who needs what, and when, matters more than abstract rules alone.'
    ],
    ESTJ: [
      'ESTJs usually prefer standards everyone can see so fairness does not depend on private interpretation.',
      'Leadership for this type is often logistics: roles, timelines, and accountability made explicit.'
    ],
    ESFJ: [
      'ESFJs often maintain social fabric by anticipating needs before they become conflicts.',
      'Tradition for this type can be a language of care — rituals signal who belongs.'
    ],
    ISTP: [
      'ISTPs frequently learn by disassembling systems until the mechanism is obvious.',
      'Calm under pressure for this type is often tactical: reduce variables, then act.'
    ],
    ISFP: [
      'ISFPs tend to express values through aesthetic and behavioral choices more than through debate.',
      'Gentleness for this type is not passivity — it is often selective engagement with what feels true.'
    ],
    ESTP: [
      'ESTPs often decide by running a small real-world test instead of extending a theoretical model.',
      'Momentum for this type is informational: action reveals what analysis could not.'
    ],
    ESFP: [
      'ESFPs frequently make experiences vivid for others, which can anchor groups in the present.',
      'Spontaneity for this type is often social intelligence: reading the moment and responding.'
    ]
  };

  var ENN = {
    '1': [
      'Type 1 energy often channels discomfort with imperfection into standards that protect integrity.',
      'Ones frequently feel responsible for correcting what others leave ambiguous.'
    ],
    '2': [
      'Type 2 focus often tracks who needs support before tracking their own limits.',
      'Twos frequently earn trust by anticipating needs others have not voiced.'
    ],
    '3': [
      'Enneagram 3 — the Achiever — crystallized in modern coaching culture, but its root is vanity in service of value: being admired proves you matter.',
      'Threes often read rooms as scoreboards; rest can feel like falling behind unless success is redefined privately.',
      'Historically associated with the “performer” archetype, Type 3 adapts presentation before identity feels solid underneath.'
    ],
    '4': [
      'Type 4 depth often seeks what is authentic, even when it is inconvenient.',
      'Fours frequently feel meaning through distinct identity, not through blending in.'
    ],
    '5': [
      'Type 5 conservation often protects energy, information, and inner space.',
      'Fives frequently prefer understanding before participating.'
    ],
    '6': [
      'Type 6 vigilance often scans for reliability — who and what can be trusted.',
      'Sixes frequently build loyalty networks that reduce uncertainty.'
    ],
    '7': [
      'Type 7 breadth often keeps options open to avoid feeling trapped.',
      'Sevens frequently reframe difficulty into possibility to stay mobile.'
    ],
    '8': [
      'Type 8 directness often confronts power imbalances early.',
      'Eights frequently show care by protecting people and territory.'
    ],
    '9': [
      'Type 9 ease often harmonizes conflict by seeing all sides.',
      'Nines frequently postpone self-preference to keep connection stable.'
    ]
  };

  var POL_QUAD_LABEL = {
    'lib-right': 'Libertarian-right compass',
    'auth-right': 'Authoritarian-right compass',
    'lib-left': 'Libertarian-left compass',
    'auth-left': 'Authoritarian-left compass'
  };

  function polQuadrant(polX, polY) {
    if (g.AnimusCross && g.AnimusCross.polQuadrant) {
      return g.AnimusCross.polQuadrant(polX, polY);
    }
    if (polX >= 0 && polY < 0) return 'lib-right';
    if (polX >= 0 && polY >= 0) return 'auth-right';
    if (polX < 0 && polY < 0) return 'lib-left';
    return 'auth-left';
  }

  function politicalFacts(polX, polY, uid, day) {
    var q = polQuadrant(polX || 0, polY || 0);
    var label = POL_QUAD_LABEL[q] || 'Political compass';
    var lines = [];
    if (g.AnimusCross && g.AnimusCross.buildPoliticalComparisons) {
      var pack = g.AnimusCross.buildPoliticalComparisons(polX, polY);
      if (pack.similarCountries && pack.similarCountries.length) {
        var c = pack.similarCountries[day % pack.similarCountries.length];
        lines.push(
          'Your economic/social axes sit in the ' +
            q.replace('-', ' / ') +
            ' zone — policy cultures with a similar blend include: ' +
            c.replace(/^Profile axis[^:]*:\s*/i, '')
        );
      }
      if (pack.politicalThinkers && pack.politicalThinkers.length) {
        var t = pack.politicalThinkers[(day + 3) % pack.politicalThinkers.length];
        lines.push('Thinker parallel: ' + t.replace(/^Profile axis[^:]*:\s*/i, ''));
      }
    }
    if (!lines.length) {
      lines.push(
        'Your compass quadrant (' +
          q +
          ') groups economies and social orders that stress different tradeoffs between liberty, equality, and institutional control.'
      );
    }
    return { label: label, facts: lines };
  }

  function dominantPhi(profile) {
    var scores = profile.phiS || profile.phiScores || {};
    var best = null;
    var bestV = -1;
    PHI_ORDER.forEach(function (k) {
      var v = typeof scores[k] === 'number' ? scores[k] : 0;
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    });
    if (best && bestV > 0) return best;
    var raw = profile.phi;
    if (raw && PHI_FACTS[raw]) return raw;
    return null;
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function pickDailyFact(profile, uid) {
    profile = profile || {};
    var pool = [];
    var mbti = (profile.mbti || '').toUpperCase();
    if (mbti && MBTI[mbti]) {
      pool.push({ label: 'Cognition · ' + mbti, facts: MBTI[mbti] });
    }
    var en = profile.ennType ? String(profile.ennType).replace(/\D/g, '') : '';
    if (en && ENN[en]) {
      pool.push({ label: 'Enneagram · Type ' + en, facts: ENN[en] });
    }
    var att = profile.att || profile.attachment;
    if (att && ATT_FACTS[att]) {
      pool.push({ label: ATT_NAMES[att] || att, facts: ATT_FACTS[att] });
    }
    var phiKey = dominantPhi(profile);
    if (phiKey && PHI_FACTS[phiKey]) {
      pool.push({
        label: 'Philosophy · ' + (PHI_NAMES[phiKey] || phiKey),
        facts: PHI_FACTS[phiKey]
      });
    }
    if (typeof profile.polX === 'number' && typeof profile.polY === 'number') {
      var day = Math.floor(Date.now() / 86400000);
      pool.push(politicalFacts(profile.polX, profile.polY, uid, day));
    }

    if (!pool.length) {
      return {
        label: 'ANIMUS',
        text: 'Complete your assessment to unlock daily insights tied to your types, philosophy, and political compass.'
      };
    }

    var day = Math.floor(Date.now() / 86400000);
    var seed = hashStr((uid || 'guest') + ':' + day);
    var bucket = pool[seed % pool.length];
    var factIdx = Math.floor(seed / pool.length) % bucket.facts.length;
    return { label: bucket.label, text: bucket.facts[factIdx] };
  }

  g.AnimusDailyFacts = { pickDailyFact: pickDailyFact, PHI_NAMES: PHI_NAMES };
})(typeof window !== 'undefined' ? window : globalThis);
