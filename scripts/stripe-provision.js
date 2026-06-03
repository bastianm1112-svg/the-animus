/**
 * Provision ANIMUS Shop products/prices in Stripe and print Vercel env vars.
 *
 * Usage (test mode recommended first):
 *   set STRIPE_SECRET_KEY=sk_test_...
 *   set SITE_URL=https://animustest.com
 *   node scripts/stripe-provision.js
 *
 * Optional: create webhook endpoint (secret shown once):
 *   node scripts/stripe-provision.js --create-webhook
 */
const Stripe = require('stripe');
const { PRODUCTS } = require('../api/_entitlements');

const CREATE_WEBHOOK = process.argv.includes('--create-webhook');
const SITE_URL = (process.env.SITE_URL || 'https://animustest.com').replace(/\/$/, '');

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted'
];

const ENV_KEYS = {
  detailedTest: 'STRIPE_PRICE_DETAILED_TEST',
  testEstimator: 'STRIPE_PRICE_TEST_ESTIMATOR',
  detailedBundle: 'STRIPE_PRICE_DETAILED_BUNDLE',
  animusPlus: 'STRIPE_PRICE_ANIMUS_PLUS'
};

async function findProductByAnimusId(stripe, animusProductId) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find(function (p) {
    return p.metadata && p.metadata.animusProductId === animusProductId;
  });
}

async function ensureProductAndPrice(stripe, productId) {
  const def = PRODUCTS[productId];
  let product = await findProductByAnimusId(stripe, productId);

  if (!product) {
    product = await stripe.products.create({
      name: def.name,
      description: def.description,
      metadata: { animusProductId: productId }
    });
    console.log('Created product:', product.id, def.name);
  } else {
    console.log('Found product:', product.id, def.name);
  }

  const amount = Math.round(def.price * 100);
  const prices = await stripe.prices.list({ product: product.id, limit: 20, active: true });
  let price = prices.data.find(function (pr) {
    if (pr.currency !== 'usd') return false;
    if (def.type === 'subscription') {
      return (
        pr.type === 'recurring' &&
        pr.recurring &&
        pr.recurring.interval === (def.interval || 'month') &&
        pr.unit_amount === amount
      );
    }
    return pr.type === 'one_time' && pr.unit_amount === amount;
  });

  if (!price) {
    const params = {
      product: product.id,
      currency: 'usd',
      unit_amount: amount
    };
    if (def.type === 'subscription') {
      params.recurring = { interval: def.interval || 'month' };
    }
    price = await stripe.prices.create(params);
    console.log('Created price:', price.id, '$' + def.price + (def.type === 'subscription' ? '/mo' : ''));
  } else {
    console.log('Found price:', price.id);
  }

  return { productId: productId, priceId: price.id, envKey: ENV_KEYS[productId] };
}

async function ensureWebhook(stripe) {
  const url = SITE_URL + '/api/stripe-webhook';
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const match = existing.data.find(function (e) {
    return e.url === url;
  });
  if (match) {
    console.log('\nWebhook already exists:', match.id, url);
    console.log('Use signing secret from Stripe Dashboard (Developers → Webhooks).');
    return;
  }
  const endpoint = await stripe.webhookEndpoints.create({
    url: url,
    enabled_events: WEBHOOK_EVENTS,
    description: 'ANIMUS Shop entitlements'
  });
  console.log('\nCreated webhook endpoint:', endpoint.id);
  console.log('STRIPE_WEBHOOK_SECRET=' + endpoint.secret);
  console.log('(Copy this secret now — it is only shown once.)');
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...)');
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const account = await stripe.accounts.retrieve();
  console.log('Stripe account:', account.id);
  console.log('Mode:', key.indexOf('sk_live_') === 0 ? 'LIVE' : 'TEST');
  console.log('Site URL:', SITE_URL);
  console.log('');

  const rows = [];
  for (const productId of Object.keys(PRODUCTS)) {
    rows.push(await ensureProductAndPrice(stripe, productId));
  }

  console.log('\n--- Paste into Vercel (Project → Settings → Environment Variables) ---\n');
  console.log('STRIPE_SECRET_KEY=' + key.slice(0, 12) + '… (set in Vercel, not printed in full)');
  console.log('SITE_URL=' + SITE_URL);
  rows.forEach(function (r) {
    console.log(r.envKey + '=' + r.priceId);
  });
  console.log('\nAlso required (not from this script):');
  console.log('FIREBASE_SERVICE_ACCOUNT_JSON=<firebase admin service account JSON>');
  console.log('STRIPE_WEBHOOK_SECRET=<whsec_ from Dashboard or --create-webhook>');

  if (CREATE_WEBHOOK) {
    await ensureWebhook(stripe);
  } else {
    console.log('\nTip: run with --create-webhook to register', SITE_URL + '/api/stripe-webhook');
  }

  console.log('\nWebsite routes already deployed:');
  console.log('  POST /api/create-checkout-session');
  console.log('  POST /api/stripe-webhook');
  console.log('  POST /api/fulfill-checkout');
  console.log('Shop page: /shop → Get buttons redirect to Stripe Checkout.\n');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
