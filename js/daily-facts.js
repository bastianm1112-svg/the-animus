/**
 * Daily personality facts — keyed by MBTI and Enneagram (stable per user per day).
 */
(function (g) {
  'use strict';

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
    '1': ['Type 1 energy often channels discomfort with imperfection into standards that protect integrity.', 'Ones frequently feel responsible for correcting what others leave ambiguous.'],
    '2': ['Type 2 focus often tracks who needs support before tracking their own limits.', 'Twos frequently earn trust by anticipating needs others have not voiced.'],
    '3': ['Type 3 attention often orients to measurable progress and visible competence.', 'Threes frequently adapt presentation to what success looks like in each context.'],
    '4': ['Type 4 depth often seeks what is authentic, even when it is inconvenient.', 'Fours frequently feel meaning through distinct identity, not through blending in.'],
    '5': ['Type 5 conservation often protects energy, information, and inner space.', 'Fives frequently prefer understanding before participating.'],
    '6': ['Type 6 vigilance often scans for reliability — who and what can be trusted.', 'Sixes frequently build loyalty networks that reduce uncertainty.'],
    '7': ['Type 7 breadth often keeps options open to avoid feeling trapped.', 'Sevens frequently reframe difficulty into possibility to stay mobile.'],
    '8': ['Type 8 directness often confronts power imbalances early.', 'Eights frequently show care by protecting people and territory.'],
    '9': ['Type 9 ease often harmonizes conflict by seeing all sides.', 'Nines frequently postpone self-preference to keep connection stable.']
  };

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
      pool.push({ label: 'MBTI ' + mbti, facts: MBTI[mbti] });
    }
    var en = profile.ennType ? String(profile.ennType).replace(/\D/g, '') : '';
    if (en && ENN[en]) {
      pool.push({ label: 'Enneagram ' + en, facts: ENN[en] });
    }
    if (!pool.length) {
      return {
        label: 'ANIMUS',
        text: 'Complete your assessment to unlock daily insights tied to your types.'
      };
    }
    var day = Math.floor(Date.now() / 86400000);
    var seed = hashStr((uid || 'guest') + ':' + day);
    var bucket = pool[seed % pool.length];
    var factIdx = Math.floor(seed / pool.length) % bucket.facts.length;
    return { label: bucket.label, text: bucket.facts[factIdx] };
  }

  g.AnimusDailyFacts = { pickDailyFact: pickDailyFact };
})(typeof window !== 'undefined' ? window : globalThis);
