const Stripe = require('stripe');
const {
  PRODUCTS,
  isValidProductId,
  productAlreadyOwned,
  priceCents,
  priceDollars,
  getConfiguredStripePriceId
} = require('./_entitlements');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getStripeMode() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (key.indexOf('sk_live_') === 0) return 'live';
  if (key.indexOf('sk_test_') === 0) return 'test';
  return 'unknown';
}

function isProductionSite() {
  const site = getSiteUrl().toLowerCase();
  if (site.indexOf('localhost') !== -1 || site.indexOf('127.0.0.1') !== -1) return false;
  return site.indexOf('animustest.com') !== -1;
}

/** Real cards fail in Stripe Checkout when test keys are used on the public site. */
function getLivePaymentsBlockReason() {
  if (!isProductionSite()) return null;
  if (getStripeMode() === 'test') {
    return (
      'Checkout is in Stripe test mode. Real cards cannot be charged on animustest.com until STRIPE_SECRET_KEY is set to sk_live_… in Vercel (plus live webhook secret and price IDs), then redeploy.'
    );
  }
  return null;
}

function getSiteUrl() {
  const url = (process.env.SITE_URL || process.env.VERCEL_URL || 'https://animustest.com').trim();
  if (url.startsWith('http')) return url.replace(/\/$/, '');
  return 'https://' + url.replace(/\/$/, '');
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body));
  }
  const chunks = [];
  return new Promise(function (resolve, reject) {
    req.on('data', function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function buildLineItem(productId, doc) {
  const product = PRODUCTS[productId];
  const cents = priceCents(productId, doc);
  const configuredPrice = getConfiguredStripePriceId(productId);
  const listCents = Math.round(product.price * 100);
  const useDynamic = !configuredPrice || cents !== listCents;

  if (!useDynamic && configuredPrice) {
    return { price: configuredPrice, quantity: 1 };
  }

  const line = {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: cents,
      product_data: {
        name: product.name,
        description: product.description
      }
    }
  };

  if (product.type === 'subscription') {
    line.price_data.recurring = { interval: product.interval || 'month' };
  }

  return line;
}

async function createCheckoutSession(stripe, opts) {
  const productId = opts.productId;
  const uid = opts.uid;
  const email = opts.email;
  const doc = opts.userDoc || {};
  const site = getSiteUrl();

  const product = PRODUCTS[productId];
  const lineItem = buildLineItem(productId, doc);

  const sessionParams = {
    mode: product.type === 'subscription' ? 'subscription' : 'payment',
    line_items: [lineItem],
    success_url: site + '/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: site + '/shop?checkout=cancelled',
    client_reference_id: uid,
    metadata: {
      firebaseUid: uid,
      productId: productId,
      priceDollars: String(priceDollars(productId, doc))
    },
    allow_promotion_codes: false
  };

  if (email) {
    sessionParams.customer_email = email;
  }

  if (doc.stripeCustomerId) {
    sessionParams.customer = doc.stripeCustomerId;
    delete sessionParams.customer_email;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

module.exports = {
  getStripe,
  getStripeMode,
  isProductionSite,
  getLivePaymentsBlockReason,
  getSiteUrl,
  readRawBody,
  createCheckoutSession,
  isValidProductId,
  productAlreadyOwned
};
