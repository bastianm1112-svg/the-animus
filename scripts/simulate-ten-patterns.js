/**
 * Run 10 synthetic answer patterns through short-test scoring (same engine logic as psyche-score-node).
 */
const {
  buildShortActiveQ,
  runPattern,
  pickForTargets
} = require('./psyche-score-node');

const MBTI_NEIGHBORS = {
  INTJ: ['INTJ', 'INFJ', 'INTP', 'ISTJ', 'ENTJ'],
  INTP: ['INTP', 'INTJ', 'ENTP', 'ISTP', 'INFJ'],
  ENTJ: ['ENTJ', 'ESTJ', 'INTJ', 'ENTP', 'ENFJ'],
  ENTP: ['ENTP', 'ENTJ', 'INTP', 'ENFP', 'ESTP'],
  INFJ: ['INFJ', 'INTJ', 'INFP', 'ISFJ', 'ENFJ'],
  INFP: ['INFP', 'INFJ', 'ISFP', 'INTP', 'ENFP'],
  ENFJ: ['ENFJ', 'ESFJ', 'INFJ', 'ENTJ', 'ENFP'],
  ENFP: ['ENFP', 'ENFJ', 'ENTP', 'INFP', 'ESFP'],
  ISTJ: ['ISTJ', 'ISFJ', 'ESTJ', 'INTJ', 'ISTP'],
  ISFJ: ['ISFJ', 'ISTJ', 'INFJ', 'ESFJ', 'ISFP'],
  ESTJ: ['ESTJ', 'ENTJ', 'ISTJ', 'ESFJ', 'ESTP'],
  ESFJ: ['ESFJ', 'ISFJ', 'ENFJ', 'ESTJ', 'ESFP'],
  ISTP: ['ISTP', 'ISTJ', 'INTP', 'ISFP', 'ESTP'],
  ISFP: ['ISFP', 'INFP', 'ISFJ', 'ISTP', 'ESFP'],
  ESTP: ['ESTP', 'ESFP', 'ENTP', 'ISTP', 'ESTJ'],
  ESFP: ['ESFP', 'ESTP', 'ENFP', 'ISFP', 'ESFJ']
};

const PATTERNS = [
  {
    name: '1. All neutral (blur baseline)',
    expectedMbti: ['ISFJ', 'ISTJ', 'INFJ', 'ISFP', 'ESFJ', 'ISTP', 'INTP', 'INFP'],
    expectedEnn: ['9', '6', '2', '5'],
    targets: {},
    note: 'No strong signal — may lean ISFJ / 9w1 slightly; must NOT be ENTJ/INTJ default'
  },
  {
    name: '2. Strong INTJ / 5',
    expectedMbti: ['INTJ'],
    expectedEnn: ['5', '1', '6'],
    targets: { Ni: 7, Te: 7, Fi: 5, Se: 1, Ti: 6, Ne: 3, E5: 7, E1: 4, E6: 5 }
  },
  {
    name: '3. Strong ESFP / 7',
    expectedMbti: ['ESFP'],
    expectedEnn: ['7', '8', '3'],
    strictMbti: true,
    targets: { Se: 7, Fi: 7, Te: 5, Ni: 1, Ne: 6, E7: 7, E8: 5 }
  },
  {
    name: '4. Strong ENFP / 7w6',
    expectedMbti: ['ENFP'],
    expectedEnn: ['7', '4', '9'],
    targets: { Ne: 7, Fi: 7, Fe: 6, Si: 3, Te: 4, E7: 7, E6: 5, E4: 4 }
  },
  {
    name: '5. Strong ISTJ / 1',
    expectedMbti: ['ISTJ'],
    expectedEnn: ['1', '6', '9'],
    targets: { Si: 7, Te: 7, Fi: 4, Ne: 1, E1: 7, E6: 5 }
  },
  {
    name: '6. Strong ISFJ / 9w1',
    expectedMbti: ['ISFJ'],
    expectedEnn: ['9', '2', '6'],
    targets: { Si: 7, Fe: 7, Ti: 5, Ne: 2, Se: 4, E9: 7, E2: 5, E1: 4 }
  },
  {
    name: '7. Strong ENTJ / 8',
    expectedMbti: ['ENTJ'],
    expectedEnn: ['8', '3', '1'],
    targets: { Te: 7, Ni: 7, Se: 5, Fi: 2, E8: 7, E3: 6, E1: 4 }
  },
  {
    name: '8. Strong INFP / 4w5',
    expectedMbti: ['INFP'],
    expectedEnn: ['4', '5', '9'],
    targets: { Fi: 7, Ne: 7, Si: 5, Te: 2, E4: 7, E5: 6 }
  },
  {
    name: '9. Strong ESTP / 8w7',
    expectedMbti: ['ESTP'],
    expectedEnn: ['8', '7', '3'],
    targets: { Se: 7, Ti: 7, Fe: 5, Ni: 1, E8: 7, E7: 6 }
  },
  {
    name: '10. Chaotic alternating extremes',
    expectedMbti: null,
    expectedEnn: null,
    pick: (q, i) => (i % 2 === 0 ? 7 : 1),
    note: 'Stress test — should not collapse to one type every run'
  }
];

function topCog(cog, n) {
  return Object.keys(cog)
    .sort((a, b) => cog[b] - cog[a])
    .slice(0, n)
    .map((k) => k + ':' + cog[k])
    .join(', ');
}

function topEnn(eS) {
  return ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']
    .sort((a, b) => (eS[b] || 0) - (eS[a] || 0))
    .slice(0, 3)
    .map((k) => k.replace('E', '') + ':' + (eS[k] || 0))
    .join(', ');
}

function mbtiOk(expected, actual, strict) {
  if (!expected) return true;
  if (strict) return expected.indexOf(actual) >= 0;
  const allowed = new Set();
  expected.forEach((t) => {
    allowed.add(t);
    (MBTI_NEIGHBORS[t] || [t]).forEach((n) => allowed.add(n));
  });
  return allowed.has(actual);
}

function ennOk(expected, actualType) {
  if (!expected) return true;
  return expected.indexOf(actualType) >= 0;
}

const activeQ = buildShortActiveQ(42);
console.log('Short test questions:', activeQ.length);
console.log('---\n');

const results = [];
let pass = 0;
let fail = 0;

PATTERNS.forEach((p) => {
  const pick =
    p.pick ||
    ((q, i) => pickForTargets(q, p.targets, 4));
  const r = runPattern(activeQ, pick);
  const enn = r.enn.type + 'w' + r.enn.wing;
  const cogTop = topCog(r.cog, 4);
  const ennTop = topEnn(r.ennScores || {});

  let issues = [];
  if (p.name.indexOf('neutral') >= 0) {
    if (r.mbti === 'ENTJ' || r.mbti === 'INTJ') {
      issues.push('neutral run defaulted to ' + r.mbti + ' (old bias)');
    }
  } else if (p.expectedMbti) {
    if (!mbtiOk(p.expectedMbti, r.mbti, p.strictMbti)) {
      issues.push('MBTI expected one of ' + p.expectedMbti.join('/') + ', got ' + r.mbti);
    }
    if (!ennOk(p.expectedEnn, r.enn.type)) {
      issues.push('Enn expected ' + p.expectedEnn.join('/') + ', got type ' + r.enn.type);
    }
  }

  const ok = issues.length === 0;
  if (ok) pass++;
  else fail++;

  results.push({
    name: p.name,
    ok,
    mbti: r.mbti,
    enn,
    tied: r.mbtiMeta && r.mbtiMeta.tied,
    cogTop,
    pol: r.polX + ',' + r.polY,
    att: r.att,
    issues
  });
});

results.forEach((row) => {
  console.log(row.name);
  console.log('  MBTI:', row.mbti, row.tied ? '(tie-break)' : '');
  console.log('  Enn:', row.enn);
  console.log('  Top cog:', row.cogTop);
  console.log('  Pol:', row.pol, ' Att:', row.att);
  if (row.issues.length) console.log('  FAIL:', row.issues.join('; '));
  else console.log('  PASS');
  console.log('');
});

console.log('---');
console.log('Summary:', pass + '/10 passed,', fail + ' failed');

// Collapse check: all 10 should not be identical
const mbtiSet = new Set(results.map((r) => r.mbti));
const ennSet = new Set(results.map((r) => r.enn));
console.log('Unique MBTI across 10 patterns:', mbtiSet.size, [...mbtiSet].join(', '));
console.log('Unique Enn across 10 patterns:', ennSet.size, [...ennSet].join(', '));
if (mbtiSet.size < 6) {
  console.log('WARN: low MBTI diversity — scoring may be collapsing types');
  process.exitCode = 1;
} else if (fail > 0) {
  process.exitCode = 1;
}
