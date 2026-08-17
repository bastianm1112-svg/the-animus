const {
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  sendApiError
} = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, patchUserFields, hasServiceAccount } = require('./_firestore');
const { loadQuestions } = require('./_questions');
const { setDocument } = require('./_cache');
const { hasAnimusPlus } = require('./_entitlements');

const processed = new Map();

function stripPolZ(snap) {
  const out = Object.assign({}, snap || {});
  delete out.polZ;
  delete out.deeperInsight;
  delete out.culturalAnswers;
  return out;
}

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;
  if (!hasServiceAccount()) return res.status(503).json({ error: 'Scoring service unavailable' });

  const body = req.body || {};
  const sessionId = String(body.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const testMode = String(body.testMode || '');
  if (!sessionId) return res.status(400).json({ error: 'Missing session' });
  if (processed.has(user.uid + ':' + sessionId)) {
    return res.json(processed.get(user.uid + ':' + sessionId));
  }

  let bank;
  try {
    bank = loadQuestions();
  } catch (e) {
    console.error('loadQuestions', e);
    return sendApiError(res, 500, 'Question bank unavailable');
  }

  const checked = bank.TestScore.validatePayload(bank.Q, body.items || [], testMode);
  if (checked.error) return res.status(400).json({ error: checked.error });

  if (testMode === 'full') {
    const loaded = await getUserDocument(user.uid);
    const doc = loaded.doc || {};
    if (!doc.entitlements || doc.entitlements.detailedTest !== true) {
      return res.status(403).json({ error: 'Detailed Test required' });
    }
  }
  if (testMode === 'estimator') {
    const loaded = await getUserDocument(user.uid);
    const doc = loaded.doc || {};
    if (!doc.entitlements || doc.entitlements.testEstimator !== true) {
      return res.status(403).json({ error: 'Test Estimator required' });
    }
  }

  const data = bank.TestScore.scoreFull(
    checked.activeQ,
    checked.answers,
    checked.choiceIx,
    bank.Cross
  );
  data.testMode = testMode;
  data.sessionId = sessionId;
  data.scoredAt = new Date().toISOString();
  data.mbti = data.mbti;
  data.ennType = data.ennResult && data.ennResult.type;
  data.ennWing = data.ennResult && data.ennResult.wing;
  data.ennTritype = data.ennResult && data.ennResult.tritype;

  const publicSnap = stripPolZ(data);
  if (testMode !== 'estimator') {
    const existing = await require('./_cache').getDocument('profiles', user.uid);
    const prev = existing.doc && existing.doc.latest ? existing.doc.latest : null;
    const latest = Object.assign({}, prev || {}, publicSnap, {
      mbti: data.mbti,
      ennType: data.ennType,
      ennWing: data.ennWing,
      ennTritype: data.ennTritype,
      att: data.att,
      phi: data.phi,
      instStack: data.instStack,
      polX: data.polX,
      polY: data.polY,
      cog: data.cog,
      testMode: testMode,
      bankVersion: data.bankVersion,
      scoringVersion: data.scoringVersion,
      completedAt: data.scoredAt,
      serverScored: true
    });
    delete latest.polZ;
    delete latest.deeperInsight;
    const ok = await setDocument('profiles', user.uid, {
      latest: latest,
      updatedAt: new Date().toISOString()
    });
    if (!ok) return sendApiError(res, 500, 'Could not persist scores');
    await patchUserFields(user.uid, { lastServerScoreAt: data.scoredAt }, ['lastServerScoreAt']);
  }

  const payload = { ok: true, snapshot: publicSnap };
  processed.set(user.uid + ':' + sessionId, payload);
  res.json(payload);
};
