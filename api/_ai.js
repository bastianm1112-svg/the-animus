/** Runtime AI config — Claude Haiku only. Keys stay on the server. */
const crypto = require('crypto');
const { sanitizeAnthropicPayload } = require('./_lib');

const SCORE_MODEL = process.env.ANIMUS_AI_MODEL || 'claude-haiku-4-5';
const PROMPT_VERSION = process.env.ANIMUS_PROMPT_VERSION || '2026.08.16-v1';
const TIMEOUT_MS = 25000;
const MAX_RETRIES = 1;

const TOKEN_BUDGET = {
  scoreFree: 2200,
  scorePlus: 4096,
  deeper: 2800,
  compare: 2800,
  simplify: 150,
  career: 1800,
  group: 2200
};

const inFlight = new Map();
const rate = new Map();

function rateLimit(uid, maxPerMin) {
  maxPerMin = maxPerMin || 20;
  const now = Date.now();
  const row = rate.get(uid) || { t: now, n: 0 };
  if (now - row.t > 60000) {
    row.t = now;
    row.n = 0;
  }
  row.n += 1;
  rate.set(uid, row);
  return row.n <= maxPerMin;
}

function cacheKey(parts) {
  const payload = JSON.stringify(parts);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function logAi(event, meta) {
  console.log(
    JSON.stringify({
      src: 'animus-ai',
      event: event,
      uid: meta && meta.uid ? String(meta.uid).slice(0, 64) : undefined,
      hash: meta && meta.hash,
      model: SCORE_MODEL,
      promptVersion: PROMPT_VERSION
    })
  );
}

async function callHaiku(prompt, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('API key not configured');
    err.status = 500;
    throw err;
  }
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: SCORE_MODEL,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (!r.ok) {
        const errText = await r.text();
        lastErr = new Error('Upstream error');
        lastErr.status = r.status >= 500 ? 502 : 500;
        console.error('Anthropic error', r.status, errText.slice(0, 400));
        if (r.status >= 500 && attempt < MAX_RETRIES) continue;
        throw lastErr;
      }
      const data = await r.json();
      return sanitizeAnthropicPayload(data);
    } catch (e) {
      if (timer) clearTimeout(timer);
      lastErr = e;
      const transient = e.name === 'AbortError' || (e.status && e.status >= 500);
      if (transient && attempt < MAX_RETRIES) continue;
      throw e;
    }
  }
  throw lastErr;
}

async function singleFlight(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const p = Promise.resolve()
    .then(fn)
    .finally(function () {
      inFlight.delete(key);
    });
  inFlight.set(key, p);
  return p;
}

function extractText(data) {
  return (data && data.content ? data.content : [])
    .filter(function (b) { return b && b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('')
    .trim();
}

module.exports = {
  SCORE_MODEL,
  PROMPT_VERSION,
  TOKEN_BUDGET,
  cacheKey,
  rateLimit,
  logAi,
  callHaiku,
  singleFlight,
  extractText
};
