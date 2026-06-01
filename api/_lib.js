/** Shared validation for ANIMUS serverless API routes */
const LIMITS = {
  compare: 12000,
  score: 48000,
  simplify: 2000
};

function assertStringField(value, maxLen, fieldName) {
  if (typeof value !== 'string') {
    return { error: 'Invalid ' + (fieldName || 'field'), status: 400 };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: 'Missing ' + (fieldName || 'field'), status: 400 };
  }
  if (trimmed.length > maxLen) {
    return { error: (fieldName || 'Field') + ' too long', status: 400 };
  }
  return { value: trimmed };
}

function assertPrompt(body, maxLen) {
  return assertStringField(body && body.prompt, maxLen || LIMITS.compare, 'prompt');
}

function assertQuestion(body) {
  return assertStringField(body && body.question, LIMITS.simplify, 'question');
}

const ALLOWED_HOSTS = new Set([
  'the-animus.vercel.app',
  'animustest.com',
  'www.animustest.com',
  'localhost',
  '127.0.0.1'
]);

function setApiHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
}

/** Soft same-site guard — blocks casual cross-origin browser abuse, not server-side attacks. */
function rejectForeignOrigin(req, res) {
  const origin = (req.headers.origin || '').trim();
  const referer = (req.headers.referer || '').trim();
  if (!origin && !referer) return false;
  let host = '';
  try {
    if (origin) host = new URL(origin).hostname;
    else if (referer) host = new URL(referer).hostname;
  } catch (e) {
    return true;
  }
  if (!host || ALLOWED_HOSTS.has(host)) return false;
  res.status(403).json({ error: 'Forbidden origin' });
  return true;
}

module.exports = {
  LIMITS,
  assertPrompt,
  assertQuestion,
  setApiHeaders,
  rejectForeignOrigin
};
