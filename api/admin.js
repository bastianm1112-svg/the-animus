const { setApiHeaders, rejectForeignOrigin, rejectBodyTooLarge, sendApiError } = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, patchUserFields, hasServiceAccount } = require('./_firestore');
const { writeAudit } = require('./_cache');
const { mergeEntitlements } = require('./_entitlements');

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (!hasServiceAccount()) {
    res.status(503).json({ error: 'Unavailable' });
    return null;
  }
  const loaded = await getUserDocument(user.uid);
  if (!loaded.doc || loaded.doc.isAdmin !== true) {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return { user: user, adminDoc: loaded.doc };
}

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (rejectForeignOrigin(req, res)) return;

  if (req.method === 'GET') {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    return res.json({ ok: true, uid: ctx.user.uid, isAdmin: true });
  }

  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const body = req.body || {};
  const action = String(body.action || '');
  const targetUid = String(body.targetUid || '').slice(0, 128);
  if (!targetUid) return res.status(400).json({ error: 'Missing target' });
  if (body.isAdmin === true || body.makeAdmin) {
    return res.status(400).json({ error: 'Cannot grant admin via this API' });
  }

  const target = await getUserDocument(targetUid);
  const before = target.doc || {};

  if (action === 'ban' || action === 'unban') {
    const banned = action === 'ban';
    const ok = await patchUserFields(
      targetUid,
      {
        banned: banned,
        bannedAt: banned ? new Date().toISOString() : '',
        banReason: banned ? String(body.reason || '').slice(0, 200) : ''
      },
      ['banned', 'bannedAt', 'banReason']
    );
    await writeAudit({
      actor: ctx.user.uid,
      action: action,
      targetUid: targetUid,
      at: new Date().toISOString()
    });
    if (!ok) return sendApiError(res, 500, 'Update failed');
    return res.json({ ok: true, banned: banned });
  }

  if (action === 'entitlements') {
    const patch = {
      detailedTest: !!body.detailedTest,
      testEstimator: !!body.testEstimator,
      animusPlus: !!body.animusPlus
    };
    const merged = mergeEntitlements(before.entitlements, patch);
    if (!patch.animusPlus) {
      merged.animusPlus = false;
      merged.animusPlusUntil = null;
    }
    const ok = await patchUserFields(targetUid, { entitlements: merged }, ['entitlements']);
    await writeAudit({
      actor: ctx.user.uid,
      action: 'entitlements',
      targetUid: targetUid,
      at: new Date().toISOString()
    });
    if (!ok) return sendApiError(res, 500, 'Update failed');
    return res.json({ ok: true, entitlements: merged });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
