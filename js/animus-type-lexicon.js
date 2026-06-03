/**
 * ANIMUS-safe display names for types (no MBTI®, 16Personalities, Enneagram Institute, or Keirsey® marks).
 * Use four-letter codes (INTJ, etc.) as descriptive shorthand only — not as product names.
 */
(function (g) {
  'use strict';

  var MBTI_ARCHETYPE = {
    INTJ: 'The Strategic Visionary',
    INTP: 'The Theoretical Analyst',
    ENTJ: 'The Commanding Strategist',
    ENTP: 'The Dialectical Provocateur',
    INFJ: 'The Prophetic Empath',
    INFP: 'The Idealistic Visionary',
    ENFJ: 'The Transformative Catalyst',
    ENFP: 'The Radically Human',
    ISTJ: 'The Reliable Pillar',
    ISFJ: 'The Devoted Protector',
    ESTJ: 'The Structural Authority',
    ESFJ: 'The Social Architect',
    ISTP: 'The Tactical Craftsman',
    ISFP: 'The Quiet Composer',
    ESTP: 'The Electric Operator',
    ESFP: 'The Radiant Presence'
  };

  /** Original archetype names — not Enneagram Institute® type titles. */
  var ENN_ARCHETYPE = {
    '1': { name: 'The Standard-bearer', subtitle: 'Principled order' },
    '2': { name: 'The Ally', subtitle: 'Relational care' },
    '3': { name: 'The Striver', subtitle: 'Achievement drive' },
    '4': { name: 'The Seeker', subtitle: 'Depth and identity' },
    '5': { name: 'The Sage', subtitle: 'Knowledge and reserve' },
    '6': { name: 'The Sentinel', subtitle: 'Security and loyalty' },
    '7': { name: 'The Spark', subtitle: 'Possibility and momentum' },
    '8': { name: 'The Vanguard', subtitle: 'Force and protection' },
    '9': { name: 'The Harmonizer', subtitle: 'Peace and integration' }
  };

  /** Replaces Keirsey® temperament trademarks (Artisan, Guardian, Idealist, Rational). */
  var TEMPERAMENT = {
    INTJ: 'Analyst',
    INTP: 'Analyst',
    ENTJ: 'Analyst',
    ENTP: 'Analyst',
    INFJ: 'Visionary',
    INFP: 'Visionary',
    ENFJ: 'Visionary',
    ENFP: 'Visionary',
    ISTJ: 'Steward',
    ISFJ: 'Steward',
    ESTJ: 'Steward',
    ESFJ: 'Steward',
    ISTP: 'Operator',
    ISFP: 'Operator',
    ESTP: 'Operator',
    ESFP: 'Operator'
  };

  var UI = {
    cognitiveType: 'Cognitive type',
    cognitiveFunctions: 'Cognitive functions',
    fourLetterCode: 'Four-letter code',
    enneagram: 'Enneagram',
    politicalSpectrum: 'Political spectrum',
    politicalSpectrumMatrix: 'Political spectrum matrix',
    temperamentCluster: 'Temperament cluster'
  };

  function ennDisplayName(typeNum) {
    var k = String(typeNum);
    var e = ENN_ARCHETYPE[k];
    return e ? e.name : 'Type ' + k;
  }

  function ennCardTitle(typeNum) {
    var k = String(typeNum);
    var e = ENN_ARCHETYPE[k];
    if (!e) return 'Type ' + k;
    return e.name + ' · ' + e.subtitle;
  }

  g.AnimusTypeLexicon = {
    MBTI_ARCHETYPE: MBTI_ARCHETYPE,
    ENN_ARCHETYPE: ENN_ARCHETYPE,
    TEMPERAMENT: TEMPERAMENT,
    UI: UI,
    ennDisplayName: ennDisplayName,
    ennCardTitle: ennCardTitle
  };
})(typeof window !== 'undefined' ? window : globalThis);
