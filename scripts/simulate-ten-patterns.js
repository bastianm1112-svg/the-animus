/**
 * Run 10 synthetic answer patterns — validate MBTI, Enneagram, cog, attachment, philosophy, political axes.
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
    targets: {},
    expect: {
      forbidMbti: ['ENTJ', 'INTJ'],
      cogFlat: true,
      polCentrist: true,
      ennTypeIn: ['9', '6', '2', '5', '1']
    }
  },
  {
    name: '2. Strong INTJ / type 5',
    targets: { Ni: 7, Te: 7, Fi: 5, Se: 1, Ti: 6, Ne: 3, E5: 7, E1: 4, E6: 5 },
    expect: {
      mbti: ['INTJ'],
      domCog: ['Ni', 'Te'],
      weakCog: ['Se'],
      ennTypeIn: ['5', '1', '6'],
      phiIn: ['PH_NIE', 'PH_KAN', 'PH_STO']
    }
  },
  {
    name: '3. Strong ESFP / type 7',
    targets: { Se: 7, Fi: 7, Te: 5, Ni: 1, Ne: 6, E7: 7, E8: 5 },
    strictMbti: true,
    expect: {
      mbti: ['ESFP'],
      domCog: ['Se'],
      domCogOver: { Se: 'Ne' },
      ennTypeIn: ['7', '8', '3']
    }
  },
  {
    name: '4. Strong ENFP / type 7',
    targets: { Ne: 7, Fi: 7, Fe: 6, Si: 3, Te: 4, E7: 7, E6: 5, E4: 4 },
    expect: {
      mbti: ['ENFP'],
      domCog: ['Ne', 'Fi'],
      domCogOver: { Ne: 'Si' },
      ennTypeIn: ['7', '4', '9']
    }
  },
  {
    name: '5. Strong ISTJ / type 1',
    targets: { Si: 7, Te: 7, Fi: 4, Ne: 1, E1: 7, E6: 5 },
    expect: {
      mbti: ['ISTJ'],
      domCog: ['Si', 'Te'],
      ennTypeIn: ['1', '6', '9']
    }
  },
  {
    name: '6. Strong ISFJ / type 9',
    targets: { Si: 7, Fe: 7, Ti: 5, Ne: 2, Se: 4, E9: 7, E2: 5, E1: 4 },
    expect: {
      mbti: ['ISFJ'],
      domCog: ['Si', 'Fe'],
      ennTypeIn: ['9', '2', '6']
    }
  },
  {
    name: '7. Strong ENTJ / type 8 + auth-right',
    targets: {
      Te: 7,
      Ni: 7,
      Se: 5,
      Fi: 2,
      E8: 7,
      E3: 6,
      PC_ECON_R: 7,
      PC_AUTH: 7,
      PC_ECON_L: 1,
      PC_LIB: 1
    },
    expect: {
      mbti: ['ENTJ'],
      domCog: ['Te', 'Ni'],
      ennTypeIn: ['8', '3', '1'],
      polXMin: 20,
      polYMin: 20
    }
  },
  {
    name: '8. Strong INFP / type 4 + existentialist',
    targets: { Fi: 7, Ne: 7, Si: 5, Te: 2, E4: 7, E5: 6, PH_EXI: 7, PH_NIE: 4 },
    expect: {
      mbti: ['INFP'],
      domCog: ['Fi', 'Ne'],
      ennTypeIn: ['4', '5', '9'],
      phiIn: ['PH_EXI', 'PH_NIE']
    }
  },
  {
    name: '9. Strong ESTP / type 8',
    targets: { Se: 7, Ti: 7, Fe: 5, Ni: 1, E8: 7, E7: 6 },
    expect: {
      mbti: ['ESTP'],
      domCog: ['Se', 'Ti'],
      domCogOver: { Se: 'Ni' },
      ennTypeIn: ['8', '7', '3']
    }
  },
  {
    name: '10. Lib-left + anxious attachment',
    targets: {
      PC_ECON_L: 7,
      PC_LIB: 7,
      PC_ECON_R: 1,
      PC_AUTH: 1,
      AT_ANX: 7,
      AT_SEC: 2,
      E6: 6,
      E2: 5,
      PH_PRA: 7
    },
    expect: {
      polXMax: -15,
      polYMax: -15,
      attIn: ['AT_ANX'],
      phiIn: ['PH_PRA', 'PH_EPI'],
      ennTypeIn: ['6', '2', '9']
    }
  }
];

function domCog(cog) {
  return Object.keys(cog).sort((a, b) => cog[b] - cog[a]);
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

function validateExpect(r, exp, ctx) {
  const issues = [];
  const sorted = domCog(r.cog);

  if (exp.forbidMbti && exp.forbidMbti.indexOf(r.mbti) >= 0) {
    issues.push('forbidden MBTI ' + r.mbti);
  }
  if (exp.mbti && !mbtiOk(exp.mbti, r.mbti, ctx.strictMbti)) {
    issues.push('MBTI want ' + exp.mbti.join('/') + ' got ' + r.mbti);
  }
  if (exp.domCog) {
    const top2 = sorted.slice(0, 2);
    exp.domCog.forEach((fn) => {
      if (top2.indexOf(fn) < 0 && (r.cog[fn] || 0) < 58) {
        issues.push('expected top cog ' + fn + ' (top: ' + top2.join(',') + ')');
      }
    });
  }
  if (exp.weakCog) {
    exp.weakCog.forEach((fn) => {
      if ((r.cog[fn] || 50) > 45) {
        issues.push('expected weak ' + fn + ' but got ' + r.cog[fn]);
      }
    });
  }
  if (exp.domCogOver) {
    Object.keys(exp.domCogOver).forEach((a) => {
      const b = exp.domCogOver[a];
      if ((r.cog[a] || 0) <= (r.cog[b] || 0)) {
        issues.push('cog ' + a + ' should beat ' + b + ' (' + r.cog[a] + ' vs ' + r.cog[b] + ')');
      }
    });
  }
  if (exp.ennTypeIn && exp.ennTypeIn.indexOf(r.enn.type) < 0) {
    issues.push('enn type want ' + exp.ennTypeIn.join('/') + ' got ' + r.enn.type + 'w' + r.enn.wing);
  }
  if (exp.attIn && exp.attIn.indexOf(r.att) < 0) {
    issues.push('attachment want ' + exp.attIn.join('/') + ' got ' + r.att);
  }
  if (exp.phiIn && exp.phiIn.indexOf(r.phi) < 0) {
    issues.push('philosophy want ' + exp.phiIn.join('/') + ' got ' + r.phi);
  }
  if (exp.polXMin != null && r.polX < exp.polXMin) {
    issues.push('polX want >=' + exp.polXMin + ' got ' + r.polX);
  }
  if (exp.polXMax != null && r.polX > exp.polXMax) {
    issues.push('polX want <=' + exp.polXMax + ' got ' + r.polX);
  }
  if (exp.polYMin != null && r.polY < exp.polYMin) {
    issues.push('polY want >=' + exp.polYMin + ' got ' + r.polY);
  }
  if (exp.polYMax != null && r.polY > exp.polYMax) {
    issues.push('polY want <=' + exp.polYMax + ' got ' + r.polY);
  }
  if (exp.polCentrist) {
    if (Math.abs(r.polX) > 18 || Math.abs(r.polY) > 18) {
      issues.push('neutral politics expected centrist, got ' + r.polX + ',' + r.polY);
    }
  }
  if (exp.cogFlat) {
    const vals = sorted.map((k) => r.cog[k]);
    const spread = vals[0] - vals[vals.length - 1];
    if (spread > 12) {
      issues.push('neutral cog spread too wide (' + spread + ')');
    }
  }

  return issues;
}

const activeQ = buildShortActiveQ(42);
console.log('Short test —', activeQ.length, 'questions, seed 42\n');

const results = [];
let pass = 0;
let fail = 0;

PATTERNS.forEach((p) => {
  const pick = (q, i) => pickForTargets(q, p.targets, 4);
  const r = runPattern(activeQ, pick);
  const issues = validateExpect(r, p.expect || {}, { strictMbti: p.strictMbti });
  const ok = issues.length === 0;
  if (ok) pass++;
  else fail++;

  const sorted = domCog(r.cog);
  results.push({
    name: p.name,
    ok,
    mbti: r.mbti,
    enn: r.enn.type + 'w' + r.enn.wing,
    cog: sorted.slice(0, 4).map((k) => k + ':' + r.cog[k]).join(', '),
    att: r.att,
    phi: r.phi,
    pol: 'X' + r.polX + ' Y' + r.polY,
    inst: r.instStack,
    issues
  });
});

results.forEach((row) => {
  console.log(row.name);
  console.log('  MBTI:', row.mbti, '| Enn:', row.enn);
  console.log('  Cog:', row.cog);
  console.log('  Att:', row.att, '| Phi:', row.phi, '| Inst:', row.inst);
  console.log('  Pol:', row.pol);
  if (row.ok) console.log('  PASS — all axes OK');
  else console.log('  FAIL:', row.issues.join('; '));
  console.log('');
});

console.log('---');
console.log('Summary:', pass + '/10 passed,', fail + ' failed');

const mbtiSet = new Set(results.map((r) => r.mbti));
console.log('MBTI diversity:', mbtiSet.size, 'types —', [...mbtiSet].join(', '));

if (mbtiSet.size < 7 || fail > 0) process.exitCode = 1;
