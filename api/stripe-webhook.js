const { getStripe, readRawBody } = require('./_stripe');
const { fulfillPurchase, revokePlus, extendPlus } = require('./_fulfillment');

module.exports.config = {
  api: {
    bodyParser: false
  }
};

async function handleCheckoutCompleted(stripe, session) {
  const uid = session.metadata && session.metadata.firebaseUid;
  const productId = session.metadata && session.metadata.productId;
  if (!uid || !productId) {
    console.warn('checkout.session.completed missing metadata', session.id);
    return;
  }

  let plusUntil = null;
  let stripeSubscriptionId = null;
  if (session.mode === 'subscription' && session.subscription) {
    stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    if (sub.metadata && !sub.metadata.firebaseUid) {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        metadata: { firebaseUid: uid, productId: productId }
      });
    }
    if (sub.current_period_end) {
      plusUntil = new Date(sub.current_period_end * 1000).toISOString();
    }
  }

  await fulfillPurchase(uid, productId, {
    claimKey: 'event_checkout_' + session.id,
    sessionId: session.id,
    stripeCustomerId:
      typeof session.customer === 'string' ? session.customer : session.customer && session.customer.id,
    stripeSubscriptionId: stripeSubscriptionId,
    plusUntil: plusUntil
  });
}

async function handleSubscriptionUpdated(subscription) {
  const uid = subscription.metadata && subscription.metadata.firebaseUid;
  if (!uid) return;

  const status = subscription.status;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer && subscription.customer.id;

  if (status === 'active' || status === 'trialing') {
    const until = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    await extendPlus(uid, until, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    });
    return;
  }

  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
    await revokePlus(uid, { stripeCustomerId: customerId });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const uid = subscription.metadata && subscription.metadata.firebaseUid;
  if (!uid) return;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer && subscription.customer.id;
  await revokePlus(uid, { stripeCustomerId: customerId });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    console.error('Stripe webhook not configured');
    return res.status(503).send('Not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing signature');

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature error:', e.message);
    return res.status(400).send('Webhook Error: ' + e.message);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(stripe, session);
        break;
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Webhook handler error:', event.type, e);
    return res.status(500).send('Handler error');
  }

  res.json({ received: true });
};
