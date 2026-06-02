const fs = require('fs');
const path = require('path');
const engine = fs.readFileSync(path.join(__dirname, '../js/psyche-engine.js'), 'utf8');
const lines = engine.split(/\r?\n/);
const s = lines.findIndex((l) => l.startsWith('var mbtiMeta='));
const e = lines.findIndex((l) => l.startsWith('// ── RENDER RESULTS'));
const body = lines.slice(s, e).join('\n');
const out =
  '/** Shared fallback profile narratives (MBTI, Enneagram, politics, etc.) */\n' +
  '(function (g) {\n  \'use strict\';\n\n' +
  body +
  '\n\n  g.ProfileNarratives = { buildFallbackNarrative: buildFallbackNarrative };\n' +
  '})(typeof window !== \'undefined\' ? window : globalThis);\n';
fs.writeFileSync(path.join(__dirname, '../js/profile-narratives.js'), out);
console.log('wrote profile-narratives.js', out.length, 'bytes');
