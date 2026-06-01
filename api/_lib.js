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

function setApiHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = {
  LIMITS,
  assertPrompt,
  assertQuestion,
  setApiHeaders
};
