const { getUserDocument, patchUserFields } = require('./_firestore');
const {
  normalizeEntitlements,
  entitlementsFromProduct,
  mergeEntitlements,
  isValidProductId,
  productAlreadyOwned
} = require('./_entitlements');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'animus-b3d83';

async function getAccessToken() {
  const { getAccessToken: getToken } = require('./_firestore');
  return getToken();
}

async function deleteProcessedKey(key) {
  const token = await getAccessToken();
  if (!token) return false;
  const docId = encodeURIComponent(key);
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/stripe_processed/' +
    docId;
  const r = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  return r.ok;
}

function processedDocIsPending(data) {
  if (!data || !data.fields) return false;
  const uid = data.fields.uid && data.fields.uid.stringValue;
  const productId = data.fields.productId && data.fields.productId.stringValue;
  return uid === 'pending' || productId === 'pending';
}

async function claimProcessedKey(key) {
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'server_config' };
  const docId = encodeURIComponent(key);
  const getUrl =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/stripe_processed/' +
    docId;
  const existing = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + token } });
  if (existing.status === 200) {
    const data = await existing.json();
    if (processedDocIsPending(data)) {
      return { ok: true, reclaim: true };
    }
    return { ok: false, reason: 'already_processed' };
  }

  const patchUrl = getUrl + '?updateMask.fieldPaths=at&updateMask.fieldPaths=uid&updateMask.fieldPaths=productId';
  const r = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        at: { stringValue: new Date().toISOString() },
        uid: { stringValue: '' },
        productId: { stringValue: '' }
      }
    })
  });
  if (r.status === 404) {
    const createUrl =
      'https://firestore.googleapis.com/v1/projects/' +
      PROJECT_ID +
      '/databases/(default)/documents/stripe_processed?documentId=' +
      docId;
    const created = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          at: { stringValue: new Date().toISOString() },
          uid: { stringValue: 'pending' },
          productId: { stringValue: 'pending' }
        }
      })
    });
    if (!created.ok) {
      const again = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + token } });
      if (again.status === 200) return { ok: false, reason: 'already_processed' };
      return { ok: false, reason: 'claim_failed' };
    }
    return { ok: true };
  }
  if (!r.ok) return { ok: false, reason: 'claim_failed' };
  return { ok: true };
}

async function markProcessedKey(key, uid, productId) {
  const token = await getAccessToken();
  if (!token) return;
  const docId = encodeURIComponent(key);
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/stripe_processed/' +
    docId +
    '?updateMask.fieldPaths=at&updateMask.fieldPaths=uid&updateMask.fieldPaths=productId';
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        at: { stringValue: new Date().toISOString() },
        uid: { stringValue: uid || '' },
        productId: { stringValue: productId || '' }
      }
    })
  });
}

/**
 * Grant entitlements after successful Stripe payment / subscription.
 */
async function fulfillPurchase(uid, productId, opts) {
  opts = opts || {};
  if (!uid || !isValidProductId(productId)) {
    return { ok: false, error: 'invalid_args' };
  }

  const claimKey = opts.claimKey || 'checkout_' + (opts.sessionId || productId + '_' + uid);
  const claim = await claimProcessedKey(claimKey);
  if (!claim.ok) {
    if (claim.reason === 'already_processed') {
      const loadedDup = await getUserDocument(uid);
      if (!loadedDup.error && productAlreadyOwned(productId, loadedDup.doc || {})) {
        return { ok: true, duplicate: true };
      }
      if (!opts._retryStaleClaim) {
        await deleteProcessedKey(claimKey);
        return fulfillPurchase(uid, productId, Object.assign({}, opts, { _retryStaleClaim: true }));
      }
      return { ok: false, error: 'already_processed_incomplete' };
    }
    return { ok: false, error: claim.reason || 'claim_failed' };
  }

  const loaded = await getUserDocument(uid);
  if (loaded.error) {
    return { ok: false, error: loaded.error };
  }
  const doc = loaded.doc || {};
  const patchEnt = entitlementsFromProduct(productId);
  if (!patchEnt) {
    return { ok: false, error: 'unknown_product' };
  }

  let ent = normalizeEntitlements(doc);
  const mergePatch = Object.assign({}, patchEnt);
  if (productId === 'animusPlus' && opts.plusUntil) {
    mergePatch.animusPlus = true;
    mergePatch.animusPlusUntil = opts.plusUntil;
  }
  ent = mergeEntitlements(ent, mergePatch);

  const userPatch = {
    entitlements: ent,
    entitlementsGrantedAt: new Date().toISOString(),
    lastStripeProductId: productId
  };
  if (opts.stripeCustomerId) userPatch.stripeCustomerId = opts.stripeCustomerId;
  if (opts.stripeSubscriptionId) userPatch.stripeSubscriptionId = opts.stripeSubscriptionId;

  const saved = await patchUserFields(uid, userPatch, Object.keys(userPatch));
  if (!saved) {
    await deleteProcessedKey(claimKey);
    return { ok: false, error: 'firestore_patch' };
  }

  await markProcessedKey(claimKey, uid, productId);
  return { ok: true };
}

async function revokePlus(uid, opts) {
  opts = opts || {};
  const loaded = await getUserDocument(uid);
  if (loaded.error) return { ok: false, error: loaded.error };
  const doc = loaded.doc || {};
  const ent = normalizeEntitlements(doc);
  ent.animusPlus = false;
  ent.animusPlusUntil = null;

  const userPatch = {
    entitlements: ent,
    stripeSubscriptionId: null
  };
  if (opts.stripeCustomerId) userPatch.stripeCustomerId = opts.stripeCustomerId;

  const saved = await patchUserFields(uid, userPatch, Object.keys(userPatch));
  return { ok: saved };
}

async function extendPlus(uid, untilIso, opts) {
  opts = opts || {};
  const loaded = await getUserDocument(uid);
  if (loaded.error) return { ok: false, error: loaded.error };
  const doc = loaded.doc || {};
  const ent = normalizeEntitlements(doc);
  ent.animusPlus = true;
  ent.animusPlusUntil = untilIso;

  const userPatch = {
    entitlements: ent
  };
  if (opts.stripeCustomerId) userPatch.stripeCustomerId = opts.stripeCustomerId;
  if (opts.stripeSubscriptionId) userPatch.stripeSubscriptionId = opts.stripeSubscriptionId;

  const saved = await patchUserFields(uid, userPatch, Object.keys(userPatch));
  return { ok: saved };
}

module.exports = {
  fulfillPurchase,
  revokePlus,
  extendPlus,
  claimProcessedKey
};
