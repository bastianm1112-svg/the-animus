/**
 * Generates js/psyche-q-es.js from psyche-questions.js via Google Translate (unofficial).
 * Run: node scripts/generate-psyche-es.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'js/psyche-questions.js'), 'utf8');
const ctx = vm.createContext({ window: {} });
vm.runInContext(code, ctx);
const Q = ctx.window.AnimusQuestions.Q;
const legacyES = ctx.window.AnimusQuestions.ES || {};

const SEC_ES = {
  Cognitive: 'Cognitivo',
  Enneagram: 'Eneagrama',
  Politics: 'Política',
  Philosophy: 'Filosofía',
  Ethics: 'Ética',
  Attachment: 'Apego',
  Instinct: 'Instinto',
  Temperament: 'Temperamento',
  Social: 'Social',
  Alone: 'Solo',
  Moral: 'Moral',
  Epistemology: 'Epistemología'
};

const LO_HI_ES = {
  Never: 'Nunca',
  Always: 'Siempre',
  Rarely: 'Rara vez',
  Constantly: 'Constantemente',
  'Strongly disagree': 'Muy en desacuerdo',
  'Strongly agree': 'Muy de acuerdo',
  Disagree: 'En desacuerdo',
  Agree: 'De acuerdo',
  'Not like me': 'No es como yo',
  'Very like me': 'Muy como yo',
  'Rarely true': 'Rara vez cierto',
  'Very true': 'Muy cierto',
  'Not important to me': 'No me importa',
  'Essential to me': 'Esencial para mí',
  'Doesn\'t bother me': 'No me molesta',
  'Bothers me a lot': 'Me molesta mucho',
  'Not at all': 'Para nada',
  'Very strongly': 'Muy fuerte',
  Difficult: 'Difícil',
  'Very easy': 'Muy fácil',
  Often: 'A menudo',
  Strongly: 'Mucho',
  'Weak memory': 'Memoria débil',
  'Very detailed memory': 'Memoria muy detallada',
  'Exactly like me': 'Exactamente como yo',
  'Deeply like me': 'Profundamente como yo',
  'Very easily': 'Muy fácilmente',
  'Very much so': 'Muchísimo'
};

const cache = new Map();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateText(text) {
  if (!text || !text.trim()) return text;
  if (cache.has(text)) return cache.get(text);
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error('translate failed ' + res.status + ' for ' + text.slice(0, 40));
  const data = await res.json();
  const out = (data[0] || []).map((p) => p[0]).join('');
  cache.set(text, out);
  await delay(60);
  return out;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function buildEntry(q) {
  const entry = { sec: SEC_ES[q.sec] || q.sec };
  const legacy = legacyES[q.t];
  if (legacy && legacy.es_t) {
    entry.t = legacy.es_t;
    if (legacy.es) entry.es = legacy.es;
  } else {
    entry.t = await translateText(q.t);
  }
  if (q.type === 'mc' && q.choices) {
    entry.c = await Promise.all(q.choices.map((c) => translateText(c.t)));
  } else if (q.type === 's') {
    if (q.lo) entry.lo = LO_HI_ES[q.lo] || (await translateText(q.lo));
    if (q.hi) entry.hi = LO_HI_ES[q.hi] || (await translateText(q.hi));
    if (!entry.es && legacy && legacy.es) entry.es = legacy.es;
    else if (!entry.es && q.e) entry.es = await translateText(q.e);
  }
  return entry;
}

async function mapPool(items, worker, size) {
  const out = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
      process.stdout.write('\r' + (i + 1) + '/' + items.length + ' ');
    }
  }
  await Promise.all(Array.from({ length: size }, run));
  return out;
}

async function main() {
  console.log('Translating ' + Q.length + ' questions (pool=6)...');
  const entries = await mapPool(Q, buildEntry, 6);
  console.log('\nWriting psyche-q-es.js ...');
  const lines = [
    '/* ANIMUS — Spanish translations aligned to Q[] by index */',
    '(function (g) {',
    "  'use strict';",
    '  var SEC_ES = ' + JSON.stringify(SEC_ES, null, 2) + ';',
    '  var Q_ES = ['
  ];
  entries.forEach(function (e, idx) {
    const props = [];
    if (e.sec) props.push('sec:"' + esc(e.sec) + '"');
    props.push('t:"' + esc(e.t) + '"');
    if (e.c) {
      props.push('c:[' + e.c.map((x) => '"' + esc(x) + '"').join(',') + ']');
    }
    if (e.lo) props.push('lo:"' + esc(e.lo) + '"');
    if (e.hi) props.push('hi:"' + esc(e.hi) + '"');
    if (e.es) props.push('es:"' + esc(e.es) + '"');
    lines.push('    {' + props.join(',') + '}' + (idx < entries.length - 1 ? ',' : ''));
  });
  lines.push('  ];');
  lines.push('  g.AnimusI18n = g.AnimusI18n || {};');
  lines.push('  g.AnimusI18n.SEC_ES = SEC_ES;');
  lines.push('  g.AnimusI18n.Q_ES = Q_ES;');
  lines.push('})(typeof window !== "undefined" ? window : globalThis);');
  fs.writeFileSync(path.join(ROOT, 'js/psyche-q-es.js'), lines.join('\n'), 'utf8');
  console.log('Done. Cache size', cache.size);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
