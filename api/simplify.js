const {
  assertQuestion,
  assertLang,
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  sendApiError
} = require('./_lib');
const { requireAuth } = require('./_auth');
const {
  cacheKey,
  rateLimit,
  logAi,
  callHaiku,
  singleFlight,
  extractText,
  TOKEN_BUDGET,
  SCORE_MODEL,
  PROMPT_VERSION
} = require('./_ai');
const { getCache, setCache } = require('./_cache');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;
  if (!rateLimit(user.uid, 30)) return res.status(429).json({ error: 'Too many AI requests' });

  const checked = assertQuestion(req.body || {});
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const question = checked.value;
  const langChecked = assertLang(req.body || {});
  if (langChecked.error) return res.status(langChecked.status).json({ error: langChecked.error });
  const lang = langChecked.value;

  const isEs = lang === 'es';
  const prompt = isEs
    ? `Reescribí esta pregunta de test de personalidad en español paraguayo simple y cotidiano. Usá "vos". Sé conciso (1-2 oraciones). Devolvé solo la pregunta simplificada, sin explicación: ${question}`
    : `Rewrite this personality test question in simple, everyday language. Keep it concise (1-2 sentences). Return only the simplified question, no explanation: ${question}`;

  const hash = cacheKey({
    taskType: 'simplify',
    promptVersion: PROMPT_VERSION,
    model: SCORE_MODEL,
    lang: lang,
    prompt: prompt
  });

  try {
    const cached = await getCache(hash);
    let data = cached;
    if (!data) {
      data = await singleFlight(hash, function () {
        return callHaiku(prompt, TOKEN_BUDGET.simplify).then(function (out) {
          return setCache(hash, out, {
            taskType: 'simplify',
            promptVersion: PROMPT_VERSION,
            model: SCORE_MODEL
          }).then(function () {
            return out;
          });
        });
      });
      logAi('generate', { uid: user.uid, hash: hash.slice(0, 12) });
    } else {
      logAi('cache-hit', { uid: user.uid, hash: hash.slice(0, 12) });
    }

    const text = extractText(data).replace(/^["'“‘]|["'”’]$/g, '');
    res.json({ simplified: text });
  } catch (e) {
    console.error('Simplify error:', e);
    sendApiError(res, e.name === 'AbortError' ? 504 : 500, 'Internal error');
  }
};
