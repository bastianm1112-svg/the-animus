#!/usr/bin/env node
/**
 * Run neutral / agree-all / ESFP-targeted scoring and print bias report.
 * node scripts/run-bias-suite.js [--full]
 */
const {
  runPattern,
  buildShortActiveQ,
  buildFullActiveQ,
  pickEsfp
} = require('./psyche-score-node');

const useFull = process.argv.includes('--full');
const activeQ = useFull ? buildFullActiveQ() : buildShortActiveQ();

console.log('Mode:', useFull ? 'full (' + activeQ.length + ' Q)' : 'short (' + activeQ.length + ' Q)');
console.log('---\n');

const neutral = runPattern(activeQ, () => 4);
console.log('NEUTRAL (all 4):');
console.log('  MBTI:', neutral.mbti, neutral.mbtiMeta.tied ? '(tied→' + neutral.mbtiMeta.dich + ')' : '');
console.log('  Cog:', neutral.cog);
console.log('  Enn:', neutral.enn.type + 'w' + neutral.enn.wing, ' Att:', neutral.att);
console.log('  Pol:', neutral.polX, neutral.polY);

const agree = runPattern(activeQ, (q) => {
  if (q.type === 'mc' && q.choices && q.choices.length) {
    return Math.max(...q.choices.map((c) => c.s));
  }
  return 7;
});
console.log('\nAGREE-ALL (scale 7 / MC max):');
console.log('  MBTI:', agree.mbti, agree.mbtiMeta.tied ? '(tied)' : '');
console.log('  Top stacks:', agree.mbtiMeta.ranked.map((r) => r.type + ':' + r.score).join(', '));
console.log('  Cog sample Se/Fe:', agree.cog.Se, agree.cog.Fe);
console.log('  Enn:', agree.enn.type + 'w' + agree.enn.wing, ' Att:', agree.att);
console.log('  Pol:', agree.polX, agree.polY);

const disagree = runPattern(activeQ, (q) => {
  if (q.type === 'mc' && q.choices && q.choices.length) {
    return Math.min(...q.choices.map((c) => c.s));
  }
  return 1;
});
console.log('\nDISAGREE-ALL (scale 1 / MC min):');
console.log('  MBTI:', disagree.mbti);
console.log('  Pol:', disagree.polX, disagree.polY);

const esfp = runPattern(activeQ, pickEsfp);
console.log('\nESFP-TARGETED answers:');
console.log('  MBTI:', esfp.mbti, esfp.mbti === 'ESFP' ? '✓' : '✗ expected ESFP');
console.log('  Top stacks:', esfp.mbtiMeta.ranked.map((r) => r.type + ':' + r.score).join(', '));
console.log('  Cog Se/Fi/Te/Ni:', esfp.cog.Se, esfp.cog.Fi, esfp.cog.Te, esfp.cog.Ni);

let fail = 0;
if (esfp.mbti !== 'ESFP') {
  console.log('\nFAIL: ESFP-targeted run did not yield ESFP (got ' + esfp.mbti + ').');
  fail++;
}
['INTJ', 'INTP'].forEach(function (bad) {
  if (neutral.mbti === bad) {
    console.log('\nFAIL: Neutral run biased to ' + bad + '.');
    fail++;
  }
  if (agree.mbti === bad) {
    console.log('\nFAIL: Agree-all run biased to ' + bad + ' (got ' + agree.mbti + ').');
    fail++;
  }
});
const agreeTop = agree.mbtiMeta.ranked && agree.mbtiMeta.ranked[0];
const agreeSecond = agree.mbtiMeta.ranked && agree.mbtiMeta.ranked[1];
if (
  agreeTop &&
  agreeSecond &&
  agreeTop.score > agreeSecond.score + 1 &&
  ['INTJ', 'INTP'].indexOf(agreeTop.type) >= 0
) {
  console.log('\nFAIL: Agree-all uniquely top stack is ' + agreeTop.type + ' — NT skew.');
  fail++;
}
if (neutral.polX !== 0 || neutral.polY !== 0) {
  console.log('\nWARN: Neutral political axes not centered:', neutral.polX, neutral.polY);
}

console.log(fail ? '\n' + fail + ' check(s) need attention.' : '\nBias suite OK.');
process.exit(fail ? 1 : 0);
