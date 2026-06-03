const { setApiHeaders, rejectForeignOrigin, rejectBodyTooLarge } = require('./_lib');
const { requireAuth } = require('./_auth');
const { getStripe } = require('./_stripe');
const { fulfillPurchase } = require('./_fulfillment');
const { hasServiceAccount } = require('./_firestore');
const { isValidProductId } = require('./_entitlements');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!hasServiceAccount()) {
    return res.status(503).json({ error: 'Server not configured.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured.' });
  }

  const sessionId =
    typeof (req.body && req.body.sessionId) === 'string'
      ? req.body.sessionId.trim()
      : '';
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    const uid = session.metadata && session.metadata.firebaseUid;
    const productId = session.metadata && session.metadata.productId;
    if (uid !== user.uid) {
      return res.status(403).json({ error: 'Session does not match your account.' });
    }
    if (!productId || !isValidProductId(productId)) {
      return res.status(400).json({ error: 'Checkout session is missing product metadata.' });
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({ error: 'Payment not completed yet.' });
    }

    let plusUntil = null;
    if (session.mode === 'subscription' && session.subscription) {
      const sub =
        typeof session.subscription === 'object'
          ? session.subscription
          : await stripe.subscriptions.retrieve(session.subscription);
      if (sub.current_period_end) {
        plusUntil = new Date(sub.current_period_end * 1000).toISOString();
      }
    }

    const result = await fulfillPurchase(uid, productId, {
      claimKey: 'checkout_' + sessionId,
      sessionId: sessionId,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer && session.customer.id,
      stripeSubscriptionId:
        session.mode === 'subscription' && typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription && session.subscription.id,
      plusUntil: plusUntil
    });

    if (!result.ok && !result.duplicate) {
      return res.status(500).json({ error: result.error || 'Fulfillment failed' });
    }

    return res.json({ ok: true, productId: productId, duplicate: !!result.duplicate });
  } catch (e) {
    console.error('fulfill-checkout error:', e);
    return res.status(500).json({ error: 'Could not verify checkout.' });
  }
};
