/**
 * ANIMUS entitlements — shop products, compare caps, admin grants.
 * Payment integration (Stripe) will call the same grant helpers server-side later.
 */
(function (g) {
  'use strict';

  var FREE_COMPARES_PER_MONTH = 10;

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
      description: 'Unlimited compares each month. More Plus features coming soon.'
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

  function defaultXp() {
    return { total: 0, level: 1 };
  }

  function normalizeUserEntitlements(userData) {
    userData = userData || {};
    var e = userData.entitlements || {};
    return {
      detailedTest: !!e.detailedTest,
      testEstimator: !!e.testEstimator,
      animusPlus: !!e.animusPlus,
      animusPlusUntil: e.animusPlusUntil || null
    };
  }

  function hasAnimusPlus(userData) {
    var e = normalizeUserEntitlements(userData);
    if (e.animusPlus) return true;
    if (e.animusPlusUntil) {
      var until = e.animusPlusUntil.toDate ? e.animusPlusUntil.toDate() : new Date(e.animusPlusUntil);
      if (until.getTime() > Date.now()) return true;
    }
    return false;
  }

  function hasEntitlement(userData, key) {
    if (!userData) return false;
    if (key === 'animusPlus') return hasAnimusPlus(userData);
    var e = normalizeUserEntitlements(userData);
    return !!e[key];
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
    FREE_COMPARES_PER_MONTH: FREE_COMPARES_PER_MONTH,
    defaultEntitlements: defaultEntitlements,
    defaultCompareUsage: defaultCompareUsage,
    defaultXp: defaultXp,
    normalizeUserEntitlements: normalizeUserEntitlements,
    hasEntitlement: hasEntitlement,
    hasAnimusPlus: hasAnimusPlus,
    getCompareUsage: getCompareUsage,
    getCompareRemaining: getCompareRemaining,
    canCompare: canCompare,
    entitlementsFromProduct: entitlementsFromProduct,
    mergeEntitlements: mergeEntitlements,
    recordCompareUsage: recordCompareUsage,
    adminGrantEntitlements: adminGrantEntitlements,
    adminRevokeEntitlements: adminRevokeEntitlements,
    monthKey: monthKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
