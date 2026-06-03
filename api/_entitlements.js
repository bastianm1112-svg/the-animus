/** Server-side product catalog + entitlement merge (mirrors js/animus-entitlements.js). */

const PLUS_SHOP_DISCOUNT = 0.2;

const PRODUCTS = {
  detailedTest: {
    id: 'detailedTest',
    name: 'Detailed Test',
    price: 10,
    type: 'one_time',
    description: 'Full-depth personality assessment beyond the main test.'
  },
  testEstimator: {
    id: 'testEstimator',
    name: 'Test Estimator',
    price: 10,
    type: 'one_time',
    description: "Estimate someone else's profile from observed behavior."
  },
  detailedBundle: {
    id: 'detailedBundle',
    name: 'Complete Assessment Pack',
    price: 15,
    type: 'bundle',
    description: 'Detailed Test + Test Estimator together.'
  },
  animusPlus: {
    id: 'animusPlus',
    name: 'Animus Plus',
    price: 5,
    type: 'subscription',
    interval: 'month',
    description: 'Animus Plus monthly membership.'
  }
};

const PRODUCT_IDS = Object.keys(PRODUCTS);

function parsePlusUntil(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEntitlements(doc) {
  doc = doc || {};
  const e = doc.entitlements || {};
  return {
    detailedTest: e.detailedTest === true,
    testEstimator: e.testEstimator === true,
    animusPlus: e.animusPlus === true,
    animusPlusUntil: e.animusPlusUntil || null
  };
}

function hasAnimusPlus(doc) {
  const e = normalizeEntitlements(doc);
  const until = parsePlusUntil(e.animusPlusUntil);
  if (until) return until.getTime() > Date.now();
  return e.animusPlus === true;
}

function entitlementsFromProduct(productId) {
  if (productId === 'detailedBundle') {
    return { detailedTest: true, testEstimator: true };
  }
  if (productId === 'animusPlus') {
    return { animusPlus: true };
  }
  if (productId === 'detailedTest' || productId === 'testEstimator') {
    const out = normalizeEntitlements({});
    out[productId] = true;
    return out;
  }
  return null;
}

function mergeEntitlements(current, patch) {
  current = normalizeEntitlements({ entitlements: current });
  patch = patch || {};
  const next = {
    detailedTest: current.detailedTest || !!patch.detailedTest,
    testEstimator: current.testEstimator || !!patch.testEstimator,
    animusPlus: current.animusPlus || !!patch.animusPlus,
    animusPlusUntil: patch.animusPlusUntil || current.animusPlusUntil || null
  };
  if (patch.animusPlus && !next.animusPlusUntil) {
    const until = new Date();
    until.setMonth(until.getMonth() + 1);
    next.animusPlusUntil = until.toISOString();
  }
  return next;
}

function isValidProductId(productId) {
  return PRODUCT_IDS.indexOf(productId) >= 0;
}

function productAlreadyOwned(productId, doc) {
  const ent = normalizeEntitlements(doc);
  if (productId === 'detailedBundle') {
    return ent.detailedTest && ent.testEstimator;
  }
  if (productId === 'animusPlus') {
    return hasAnimusPlus(doc);
  }
  return !!ent[productId];
}

function priceDollars(productId, doc) {
  const p = PRODUCTS[productId];
  if (!p) return 0;
  let amount = p.price;
  if (p.type !== 'subscription' && hasAnimusPlus(doc)) {
    amount = Math.max(1, Math.round(amount * (1 - PLUS_SHOP_DISCOUNT) * 100) / 100);
  }
  return amount;
}

function priceCents(productId, doc) {
  return Math.round(priceDollars(productId, doc) * 100);
}

function getConfiguredStripePriceId(productId) {
  const key = {
    detailedTest: 'STRIPE_PRICE_DETAILED_TEST',
    testEstimator: 'STRIPE_PRICE_TEST_ESTIMATOR',
    detailedBundle: 'STRIPE_PRICE_DETAILED_BUNDLE',
    animusPlus: 'STRIPE_PRICE_ANIMUS_PLUS'
  }[productId];
  return key && process.env[key] ? process.env[key].trim() : null;
}

module.exports = {
  PRODUCTS,
  PRODUCT_IDS,
  PLUS_SHOP_DISCOUNT,
  normalizeEntitlements,
  hasAnimusPlus,
  entitlementsFromProduct,
  mergeEntitlements,
  isValidProductId,
  productAlreadyOwned,
  priceDollars,
  priceCents,
  getConfiguredStripePriceId
};
