const {
  assertPrompt,
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  sendApiError,
  LIMITS
} = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, hasServiceAccount, userHasPlusFromDoc } = require('./_firestore');
const { cacheKey, rateLimit, logAi, callHaiku, singleFlight, TOKEN_BUDGET, SCORE_MODEL, PROMPT_VERSION } = require('./_ai');
const { getCache, setCache } = require('./_cache');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;
  if (!rateLimit(user.uid, 12)) return res.status(429).json({ error: 'Too many AI requests' });

  const body = req.body || {};
  const checked = assertPrompt(body, LIMITS.score);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const prompt = checked.value;
  const depth = body.depth === 'deeper' ? 'deeper' : 'free';

  let plus = false;
  if (hasServiceAccount()) {
    const loaded = await getUserDocument(user.uid);
    plus = userHasPlusFromDoc(loaded.doc || {});
  }
  if (depth === 'deeper' && !plus) {
    return res.status(403).json({ error: 'Animus Plus required for Deeper Insight' });
  }

  const tokens = depth === 'deeper' ? TOKEN_BUDGET.deeper : plus ? TOKEN_BUDGET.scorePlus : TOKEN_BUDGET.scoreFree;
  const hash = cacheKey({
    taskType: 'score-' + depth,
    promptVersion: PROMPT_VERSION,
    model: SCORE_MODEL,
    lang: body.lang || 'en',
    prompt: prompt
  });

  try {
    const cached = await getCache(hash);
    if (cached) {
      logAi('cache-hit', { uid: user.uid, hash: hash.slice(0, 12) });
      return res.json(cached);
    }
    const data = await singleFlight(hash, function () {
      return callHaiku(prompt, tokens).then(function (out) {
        return setCache(hash, out, {
          taskType: 'score-' + depth,
          promptVersion: PROMPT_VERSION,
          model: SCORE_MODEL
        }).then(function () {
          return out;
        });
      });
    });
    logAi('generate', { uid: user.uid, hash: hash.slice(0, 12) });
    res.json(data);
  } catch (e) {
    console.error('Score handler error:', e);
    sendApiError(res, e.name === 'AbortError' ? 504 : 500, e.name === 'AbortError' ? 'Timed out' : 'Internal error');
  }
};
