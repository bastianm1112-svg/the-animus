const {
  assertPrompt,
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
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

  if (!hasServiceAccount()) {
    return res.status(503).json({ error: 'Compare service unavailable' });
  }

  const body = req.body || {};
  if (body.mode === 'group') {
    const loadedGate = await getUserDocument(user.uid);
    if (!userHasPlusFromDoc(loadedGate.doc || {})) {
      return res.status(403).json({ error: 'Group analysis requires Animus Plus' });
    }
  }
  const checked = assertPrompt(body, LIMITS.compare);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const prompt = checked.value;

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

  const hash = cacheKey({
    taskType: body.mode === 'group' ? 'group' : 'compare',
    promptVersion: PROMPT_VERSION,
    model: SCORE_MODEL,
    lang: body.lang || 'en',
    prompt: prompt
  });

  try {
    const cached = await getCache(hash);
    let data = cached;
    if (!data) {
      data = await singleFlight(hash, function () {
        return callHaiku(prompt, body.mode === 'group' ? TOKEN_BUDGET.group : TOKEN_BUDGET.compare).then(function (out) {
          return setCache(hash, out, {
            taskType: body.mode === 'group' ? 'group' : 'compare',
            promptVersion: PROMPT_VERSION,
            model: SCORE_MODEL
          }).then(function () { return out; });
        });
      });
      logAi('generate', { uid: user.uid, hash: hash.slice(0, 12) });
    } else {
      logAi('cache-hit', { uid: user.uid, hash: hash.slice(0, 12) });
    }

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

    res.json(data);
  } catch (e) {
    console.error('Compare handler error:', e);
    sendApiError(res, 500, 'Internal error');
  }
};
