/** Shared validation for ANIMUS serverless API routes */
const LIMITS = {
  compare: 12000,
  score: 48000,
  simplify: 2000
};

const MAX_BODY_BYTES = 65536;

function stripControlChars(str) {
  return String(str).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

function assertStringField(value, maxLen, fieldName) {
  if (typeof value !== 'string') {
    return { error: 'Invalid ' + (fieldName || 'field'), status: 400 };
  }
  const trimmed = stripControlChars(value).trim();
  if (!trimmed) {
    return { error: 'Missing ' + (fieldName || 'field'), status: 400 };
  }
  if (trimmed.length > maxLen) {
    return { error: (fieldName || 'Field') + ' too long', status: 400 };
  }
  return { value: trimmed };
}

function assertLang(body) {
  const lang = body && body.lang;
  if (lang === undefined || lang === null || lang === '') return { value: 'en' };
  if (lang === 'en' || lang === 'es') return { value: lang };
  return { error: 'Invalid lang', status: 400 };
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/** Reject oversized JSON bodies before downstream parsing. */
function rejectBodyTooLarge(req, res) {
  const raw = req.headers['content-length'];
  const len = raw ? parseInt(String(raw), 10) : 0;
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return true;
  }
  return false;
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
    res.status(403).json({ error: 'Forbidden origin' });
    return true;
  }
  if (!host || ALLOWED_HOSTS.has(host) || /\.vercel\.app$/i.test(host)) return false;
  res.status(403).json({ error: 'Forbidden origin' });
  return true;
}

/** Strip Anthropic responses down to text blocks — no upstream metadata leaks. */
function sanitizeAnthropicPayload(data) {
  if (!data || typeof data !== 'object') return { content: [] };
  const blocks = Array.isArray(data.content) ? data.content : [];
  return {
    content: blocks
      .filter(function (b) {
        return b && b.type === 'text' && typeof b.text === 'string';
      })
      .map(function (b) {
        return { type: 'text', text: b.text.substring(0, 50000) };
      })
  };
}

function sendApiError(res, status, message) {
  res.status(status).json({ error: message || 'Request failed' });
}

module.exports = {
  LIMITS,
  MAX_BODY_BYTES,
  assertPrompt,
  assertQuestion,
  assertLang,
  stripControlChars,
  assertStringField,
  setApiHeaders,
  rejectBodyTooLarge,
  rejectForeignOrigin,
  sanitizeAnthropicPayload,
  sendApiError
};
