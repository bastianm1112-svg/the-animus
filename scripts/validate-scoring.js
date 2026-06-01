// Validate MBTI derivation matches standard stacks + tie-break behavior
const stacks = {
  INTJ: ['Ni', 'Te', 'Fi', 'Se'], INTP: ['Ti', 'Ne', 'Si', 'Fe'],
  INFJ: ['Ni', 'Fe', 'Ti', 'Se'], INFP: ['Fi', 'Ne', 'Si', 'Te'],
  ENTJ: ['Te', 'Ni', 'Se', 'Fi'], ENTP: ['Ne', 'Ti', 'Fe', 'Si'],
  ENFJ: ['Fe', 'Ni', 'Se', 'Ti'], ENFP: ['Ne', 'Fi', 'Te', 'Si'],
  ISTJ: ['Si', 'Te', 'Fi', 'Ne'], ISFJ: ['Si', 'Fe', 'Ti', 'Ne'],
  ESTJ: ['Te', 'Si', 'Ne', 'Fi'], ESFJ: ['Fe', 'Si', 'Ne', 'Ti'],
  ISTP: ['Ti', 'Se', 'Ni', 'Fe'], ISFP: ['Fi', 'Se', 'Ni', 'Te'],
  ESTP: ['Se', 'Ti', 'Fe', 'Ni'], ESFP: ['Se', 'Fi', 'Te', 'Ni']
};
const w = [4, 3, 2, 1];

const TIE_EPS = 0.5;

function mbtiFromDichotomies(cog, fp) {
  const I = ((cog.Si || 50) + (cog.Ni || 50)) / 2;
  const E = ((cog.Se || 50) + (cog.Ne || 50)) / 2;
  const N = ((cog.Ni || 50) + (cog.Ne || 50)) / 2;
  const S = ((cog.Si || 50) + (cog.Se || 50)) / 2;
  const T = ((cog.Ti || 50) + (cog.Te || 50)) / 2;
  const F = ((cog.Fi || 50) + (cog.Fe || 50)) / 2;
  const J = ((cog.Te || 50) + (cog.Fe || 50) + (cog.Si || 50)) / 3;
  const P = ((cog.Ti || 50) + (cog.Fi || 50) + (cog.Ne || 50) + (cog.Se || 50)) / 4;
  fp = fp || 0;
  function letter(high, low, pos, neg, bit) {
    if (Math.abs(high - low) < TIE_EPS) return (fp >> bit) & 1 ? pos : neg;
    return high > low ? pos : neg;
  }
  return (
    letter(E, I, 'E', 'I', 0) +
    letter(N, S, 'N', 'S', 1) +
    letter(T, F, 'T', 'F', 2) +
    letter(J, P, 'J', 'P', 3)
  );
}

function getMBTI(cog, seed) {
  const ranked = [];
  Object.keys(stacks).forEach(function (type) {
    let s = 0;
    stacks[type].forEach(function (fn, i) { s += (cog[fn] || 50) * w[i]; });
    ranked.push({ type, score: s });
  });
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked[0].score;
  const tied = ranked.filter((r) => r.score >= top - 0.5);
  if (tied.length === 1) return tied[0].type;
  const dich = mbtiFromDichotomies(cog, seed);
  const hit = tied.find((t) => t.type === dich);
  if (hit) return hit.type;
  return tied[seed % tied.length].type;
}

console.log('INTJ profile:', getMBTI({ Ni: 90, Te: 85, Fi: 60, Se: 30, Ne: 40, Ti: 50, Fe: 35, Si: 45 }, 0));
console.log('ENFP profile:', getMBTI({ Ne: 92, Fi: 88, Te: 55, Si: 40, Ni: 45, Se: 50, Ti: 48, Fe: 70 }, 0));
const flat = { Ni: 50, Ne: 50, Ti: 50, Te: 50, Fi: 50, Fe: 50, Si: 50, Se: 50 };
console.log('Flat profile (dichotomy):', getMBTI(flat, 0), 'dich:', mbtiFromDichotomies(flat, 0));
