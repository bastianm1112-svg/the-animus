/**
 * ANIMUS entitlements — shop products, compare caps, admin grants.
 * Payment integration (Stripe) will call the same grant helpers server-side later.
 */
(function (g) {
  'use strict';

  var FREE_COMPARES_PER_MONTH = 10;
  var PLUS_XP_MULTIPLIER = 1.25;
  var PLUS_SHOP_DISCOUNT = 0.2;
  var PLUS_CAREER_PDF_PER_MONTH = 3;
  var PLUS_GROUP_MAX_PEOPLE = 6;

  var PLUS_PERKS = [
    'Unlimited compares each month',
    'Group compare (up to 6 people)',
    '1.25× XP on all activities',
    '20% off assessment packs in the Shop',
    'AI Career & Lifestyle Guide PDF (3 per month)',
    'Plus badge on your profile'
  ];

  var PRODUCTS = {
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
      description: 'Estimate someone else\'s profile from observed behavior.'
    },
    detailedBundle: {
      id: 'detailedBundle',
      name: 'Complete Assessment Pack',
      price: 15,
      type: 'bundle',
      badge: 'Best deal',
      savings: '25% off normal purchases',
      description: 'Detailed Test + Test Estimator together.',
      grants: ['detailedTest', 'testEstimator']
    },
    animusPlus: {
      id: 'animusPlus',
      name: 'Animus Plus',
      price: 5,
      type: 'subscription',
      interval: 'month',
      badge: 'Membership',
      description:
        'Unlimited compares, group compare, 1.25× XP, 20% Shop discount, Plus badge, and 3 AI Career & Lifestyle PDFs per month.'
    }
  };

  function monthKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function defaultEntitlements() {
    return {
      detailedTest: false,
      testEstimator: false,
      animusPlus: false,
      animusPlusUntil: null
    };
  }

  function defaultCompareUsage() {
    return { monthKey: monthKey(), count: 0 };
  }

  function defaultCareerPdfUsage() {
    return { monthKey: monthKey(), count: 0 };
  }

  function getCareerPdfUsage(userData) {
    var u = (userData && userData.careerPdfUsage) || defaultCareerPdfUsage();
    var mk = monthKey();
    if (u.monthKey !== mk) return { monthKey: mk, count: 0 };
    return { monthKey: u.monthKey, count: u.count || 0 };
  }

  function getCareerPdfRemaining(userData) {
    if (!hasAnimusPlus(userData)) return 0;
    var usage = getCareerPdfUsage(userData);
    return Math.max(0, PLUS_CAREER_PDF_PER_MONTH - usage.count);
  }

  function canGenerateCareerPdf(userData) {
    return hasAnimusPlus(userData) && getCareerPdfRemaining(userData) > 0;
  }

  function getDiscountedPrice(price, userData) {
    var n = Number(price);
    if (!n || n <= 0) return price;
    if (!hasAnimusPlus(userData)) return n;
    return Math.max(1, Math.round(n * (1 - PLUS_SHOP_DISCOUNT) * 100) / 100);
  }

  function formatMoney(amount) {
    var n = Number(amount);
    if (n % 1 === 0) return String(Math.round(n));
    return n.toFixed(2);
  }

  function getProductPrice(productId, userData) {
    var p = PRODUCTS[productId];
    if (!p) return 0;
    if (p.type === 'subscription') return p.price;
    return getDiscountedPrice(p.price, userData);
  }

  function canUseGroupCompare(userData) {
    return hasAnimusPlus(userData);
  }

  function getXpMultiplier(userData) {
    return hasAnimusPlus(userData) ? PLUS_XP_MULTIPLIER : 1;
  }

  function defaultXp() {
    return { total: 0, level: 1 };
  }

  function parsePlusUntil(raw) {
    if (raw == null || raw === '') return null;
    if (raw.toDate && typeof raw.toDate === 'function') {
      var fromTs = raw.toDate();
      return isNaN(fromTs.getTime()) ? null : fromTs;
    }
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function normalizeUserEntitlements(userData) {
    userData = userData || {};
    var e = userData.entitlements || {};
    return {
      detailedTest: e.detailedTest === true,
      testEstimator: e.testEstimator === true,
      animusPlus: e.animusPlus === true,
      animusPlusUntil: e.animusPlusUntil || null
    };
  }

  function hasAnimusPlus(userData) {
    var e = normalizeUserEntitlements(userData);
    var until = parsePlusUntil(e.animusPlusUntil);
    if (until) return until.getTime() > Date.now();
    return e.animusPlus === true;
  }

  function hasEntitlement(userData, key) {
    if (!userData) return false;
    if (key === 'animusPlus') return hasAnimusPlus(userData);
    if (key === 'testDetailed') key = 'detailedTest';
    var e = normalizeUserEntitlements(userData);
    return !!e[key];
  }

  /** Detailed Test (Animus Plus shop product: detailedTest). */
  function hasDetailedTest(userData) {
    return hasEntitlement(userData, 'detailedTest');
  }

  function hasTestEstimator(userData) {
    return hasEntitlement(userData, 'testEstimator');
  }

  function getCompareUsage(userData) {
    var u = (userData && userData.compareUsage) || defaultCompareUsage();
    var mk = monthKey();
    if (u.monthKey !== mk) return { monthKey: mk, count: 0 };
    return { monthKey: u.monthKey, count: u.count || 0 };
  }

  function getCompareRemaining(userData) {
    if (hasAnimusPlus(userData)) return Infinity;
    var usage = getCompareUsage(userData);
    return Math.max(0, FREE_COMPARES_PER_MONTH - usage.count);
  }

  function canCompare(userData) {
    return getCompareRemaining(userData) > 0;
  }

  function entitlementsFromProduct(productId) {
    var p = PRODUCTS[productId];
    if (!p) return null;
    if (productId === 'detailedBundle') {
      return { detailedTest: true, testEstimator: true };
    }
    if (productId === 'animusPlus') {
      return { animusPlus: true };
    }
    var out = defaultEntitlements();
    out[productId] = true;
    return out;
  }

  function mergeEntitlements(current, patch) {
    current = normalizeUserEntitlements({ entitlements: current });
    patch = patch || {};
    var next = {
      detailedTest: current.detailedTest || !!patch.detailedTest,
      testEstimator: current.testEstimator || !!patch.testEstimator,
      animusPlus: current.animusPlus || !!patch.animusPlus,
      animusPlusUntil: patch.animusPlusUntil || current.animusPlusUntil || null
    };
    if (patch.animusPlus && !next.animusPlusUntil) {
      var until = new Date();
      until.setMonth(until.getMonth() + 1);
      next.animusPlusUntil = until.toISOString();
    }
    return next;
  }

  function buildCompareUsageIncrement(userData) {
    if (hasAnimusPlus(userData)) return null;
    var usage = getCompareUsage(userData);
    return {
      monthKey: usage.monthKey,
      count: usage.count + 1
    };
  }

  function recordCompareUsage(db, uid, userData) {
    if (!db || !uid || hasAnimusPlus(userData)) {
      return Promise.resolve();
    }
    var next = buildCompareUsageIncrement(userData);
    if (!next) return Promise.resolve();
    return db.collection('users').doc(uid).set({ compareUsage: next }, { merge: true });
  }

  function adminGrantEntitlements(db, targetUid, productIds) {
    if (!db || !targetUid || !productIds || !productIds.length) {
      return Promise.reject(new Error('Missing grant parameters'));
    }
    return db
      .collection('users')
      .doc(targetUid)
      .get()
      .then(function (doc) {
        var data = doc.exists ? doc.data() : {};
        var ent = normalizeUserEntitlements(data);
        productIds.forEach(function (pid) {
          var patch = entitlementsFromProduct(pid);
          if (patch) ent = mergeEntitlements(ent, patch);
        });
        return db.collection('users').doc(targetUid).set(
          {
            entitlements: ent,
            entitlementsGrantedAt: firebase.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      });
  }

  function adminRevokeEntitlements(db, targetUid, keys) {
    return db
      .collection('users')
      .doc(targetUid)
      .get()
      .then(function (doc) {
        if (!doc.exists) return;
        var ent = normalizeUserEntitlements(doc.data());
        (keys || []).forEach(function (k) {
          if (k === 'animusPlus') {
            ent.animusPlus = false;
            ent.animusPlusUntil = null;
          } else if (k in ent) {
            ent[k] = false;
          }
        });
        return db.collection('users').doc(targetUid).set({ entitlements: ent }, { merge: true });
      });
  }

  g.AnimusEntitlements = {
    PRODUCTS: PRODUCTS,
    PLUS_PERKS: PLUS_PERKS,
    FREE_COMPARES_PER_MONTH: FREE_COMPARES_PER_MONTH,
    PLUS_XP_MULTIPLIER: PLUS_XP_MULTIPLIER,
    PLUS_SHOP_DISCOUNT: PLUS_SHOP_DISCOUNT,
    PLUS_CAREER_PDF_PER_MONTH: PLUS_CAREER_PDF_PER_MONTH,
    PLUS_GROUP_MAX_PEOPLE: PLUS_GROUP_MAX_PEOPLE,
    defaultEntitlements: defaultEntitlements,
    defaultCompareUsage: defaultCompareUsage,
    defaultCareerPdfUsage: defaultCareerPdfUsage,
    defaultXp: defaultXp,
    normalizeUserEntitlements: normalizeUserEntitlements,
    hasEntitlement: hasEntitlement,
    hasDetailedTest: hasDetailedTest,
    hasTestEstimator: hasTestEstimator,
    hasAnimusPlus: hasAnimusPlus,
    getCompareUsage: getCompareUsage,
    getCompareRemaining: getCompareRemaining,
    canCompare: canCompare,
    getCareerPdfUsage: getCareerPdfUsage,
    getCareerPdfRemaining: getCareerPdfRemaining,
    canGenerateCareerPdf: canGenerateCareerPdf,
    getDiscountedPrice: getDiscountedPrice,
    getProductPrice: getProductPrice,
    formatMoney: formatMoney,
    canUseGroupCompare: canUseGroupCompare,
    getXpMultiplier: getXpMultiplier,
    entitlementsFromProduct: entitlementsFromProduct,
    mergeEntitlements: mergeEntitlements,
    recordCompareUsage: recordCompareUsage,
    adminGrantEntitlements: adminGrantEntitlements,
    adminRevokeEntitlements: adminRevokeEntitlements,
    monthKey: monthKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
