const { setApiHeaders, rejectForeignOrigin } = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, hasServiceAccount } = require('./_firestore');
const { getStripe, createCheckoutSession, isValidProductId, productAlreadyOwned } = require('./_stripe');
const { PRODUCTS } = require('./_entitlements');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!hasServiceAccount()) {
    return res.status(503).json({ error: 'Payments are not configured on the server yet.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' });
  }

  const body = req.body || {};
  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  if (!isValidProductId(productId)) {
    return res.status(400).json({ error: 'Unknown product.' });
  }

  const loaded = await getUserDocument(user.uid);
  if (loaded.error) {
    return res.status(500).json({ error: 'Could not load your account.' });
  }
  const doc = loaded.doc || {};

  if (productAlreadyOwned(productId, doc)) {
    const name = PRODUCTS[productId].name;
    return res.status(400).json({ error: 'You already own ' + name + '.' });
  }

  try {
    const session = await createCheckoutSession(stripe, {
      productId: productId,
      uid: user.uid,
      email: user.email,
      userDoc: doc
    });
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('create-checkout-session error:', e);
    return res.status(500).json({ error: e.message || 'Could not start checkout.' });
  }
};
