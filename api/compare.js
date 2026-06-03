const {
  assertPrompt,
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  sanitizeAnthropicPayload,
  sendApiError,
  LIMITS
} = require('./_lib');
const { requireAuth } = require('./_auth');
const { FREE_COMPARES_PER_MONTH } = require('./_entitlements');
const {
  getUserDocument,
  patchUserFields,
  userHasPlusFromDoc,
  getCompareUsageFromDoc,
  hasServiceAccount
} = require('./_firestore');

/** Compare AI returns ~4 JSON sections (~750 words); 4096 tokens is ample headroom. */
const COMPARE_MAX_TOKENS = 4096;

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!hasServiceAccount()) {
    return res.status(503).json({ error: 'Compare service unavailable' });
  }

  const checked = assertPrompt(req.body || {}, LIMITS.compare);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const prompt = checked.value;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  let userDoc = null;
  let compareUsage = null;
  const loaded = await getUserDocument(user.uid);
  if (loaded.error === 'server_config') {
    return res.status(503).json({ error: 'Server configuration error' });
  }
  if (loaded.error) {
    return res.status(500).json({ error: 'Could not load account' });
  }
  userDoc = loaded.doc || {};
  if (!userHasPlusFromDoc(userDoc)) {
    compareUsage = getCompareUsageFromDoc(userDoc);
    if (compareUsage.count >= FREE_COMPARES_PER_MONTH) {
      return res.status(429).json({
        error:
          'You have used all ' +
          FREE_COMPARES_PER_MONTH +
          ' free compares this month. Animus Plus unlocks unlimited compares.',
        remaining: 0
      });
    }
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: COMPARE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Anthropic compare error:', err);
      return res.status(500).json({ error: 'Upstream error' });
    }

    const data = await r.json();

    if (hasServiceAccount() && userDoc && !userHasPlusFromDoc(userDoc) && compareUsage) {
      const nextUsage = {
        monthKey: compareUsage.monthKey,
        count: compareUsage.count + 1
      };
      const patched = await patchUserFields(user.uid, { compareUsage: nextUsage }, ['compareUsage']);
      if (!patched) {
        console.error('Compare usage increment failed for uid', user.uid);
      }
    }

    res.json(sanitizeAnthropicPayload(data));
  } catch (e) {
    console.error('Compare handler error:', e);
    sendApiError(res, 500, 'Internal error');
  }
};
