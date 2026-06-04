const { setApiHeaders, rejectForeignOrigin } = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, deleteUserAccountData, hasServiceAccount } = require('./_firestore');
const { getStripe } = require('./_stripe');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!hasServiceAccount()) {
    return res.status(503).json({ error: 'Account deletion is temporarily unavailable.' });
  }

  const got = await getUserDocument(user.uid);
  if (got.error) {
    return res.status(503).json({ error: 'Could not load account data.' });
  }
  const doc = got.doc || {};
  const username =
    typeof doc.username === 'string' ? doc.username.trim().toLowerCase() : '';

  const stripe = getStripe();
  const subId =
    typeof doc.stripeSubscriptionId === 'string' ? doc.stripeSubscriptionId.trim() : '';
  if (stripe && subId) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.error('Stripe subscription cancel on delete:', e.message || e);
    }
  }

  const deleted = await deleteUserAccountData(user.uid, username);
  if (!deleted) {
    return res.status(503).json({ error: 'Could not delete all account data. Contact support.' });
  }

  res.status(200).json({ ok: true });
};
