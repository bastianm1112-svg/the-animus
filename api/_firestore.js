/**
 * Firestore REST access for serverless routes (service account).
 * Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel to the Firebase admin service account JSON.
 */
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'animus-b3d83';

let googleAuth = null;

function getServiceAccountCreds() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
      return null;
    }
  }
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (email && privateKey) {
    return {
      type: 'service_account',
      project_id: PROJECT_ID,
      client_email: email,
      private_key: String(privateKey).replace(/\\n/g, '\n')
    };
  }
  return null;
}

/** What must be set on Vercel for Shop checkout (webhook secret optional for starting checkout). */
function getPaymentsConfigMissing() {
  const missing = [];
  if (!getServiceAccountCreds()) {
    missing.push('FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }
  return missing;
}

async function getAccessToken() {
  const creds = getServiceAccountCreds();
  if (!creds) return null;
  if (!googleAuth) {
    googleAuth = new GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/datastore']
    });
  }
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse && tokenResponse.token ? tokenResponse.token : null;
}

function firestoreValueToJs(fields) {
  if (!fields || typeof fields !== 'object') return null;
  const out = {};
  Object.keys(fields).forEach(function (key) {
    out[key] = firestoreFieldToJs(fields[key]);
  });
  return out;
}

function firestoreFieldToJs(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('mapValue' in field) return firestoreValueToJs(field.mapValue.fields || {});
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(firestoreFieldToJs);
  }
  return null;
}

function jsToFirestoreFields(obj) {
  const fields = {};
  Object.keys(obj || {}).forEach(function (key) {
    const v = obj[key];
    if (v === null || v === undefined) return;
    if (typeof v === 'string') fields[key] = { stringValue: v };
    else if (typeof v === 'boolean') fields[key] = { booleanValue: v };
    else if (typeof v === 'number' && Number.isInteger(v)) fields[key] = { integerValue: String(v) };
    else if (typeof v === 'number') fields[key] = { doubleValue: v };
    else if (typeof v === 'object' && !Array.isArray(v)) {
      fields[key] = { mapValue: { fields: jsToFirestoreFields(v) } };
    }
  });
  return fields;
}

async function getUserDocument(uid) {
  const token = await getAccessToken();
  if (!token) return { error: 'server_config', doc: null };
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/users/' +
    encodeURIComponent(uid);
  const r = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (r.status === 404) return { error: null, doc: {} };
  if (!r.ok) {
    console.error('Firestore get user failed:', r.status, await r.text());
    return { error: 'firestore', doc: null };
  }
  const data = await r.json();
  return { error: null, doc: firestoreValueToJs(data.fields || {}) };
}

async function patchUserFields(uid, patchFields, maskPaths) {
  const token = await getAccessToken();
  if (!token) return false;
  const mask = (maskPaths || Object.keys(patchFields))
    .map(function (p) {
      return 'updateMask.fieldPaths=' + encodeURIComponent(p);
    })
    .join('&');
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/users/' +
    encodeURIComponent(uid) +
    '?' +
    mask;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: jsToFirestoreFields(patchFields) })
  });
  if (!r.ok) {
    console.error('Firestore patch user failed:', r.status, await r.text());
    return false;
  }
  return true;
}

function monthKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function userHasPlusFromDoc(doc) {
  const e = (doc && doc.entitlements) || {};
  if (e.animusPlus === true) return true;
  if (e.animusPlusUntil) {
    const until = new Date(e.animusPlusUntil);
    if (!isNaN(until.getTime()) && until.getTime() > Date.now()) return true;
  }
  return false;
}

function getCareerPdfUsageFromDoc(doc) {
  const mk = monthKey();
  const u = (doc && doc.careerPdfUsage) || {};
  if (u.monthKey !== mk) return { monthKey: mk, count: 0 };
  return { monthKey: u.monthKey, count: parseInt(u.count, 10) || 0 };
}

module.exports = {
  getAccessToken,
  getUserDocument,
  patchUserFields,
  monthKey,
  userHasPlusFromDoc,
  getCareerPdfUsageFromDoc,
  hasServiceAccount: function () {
    return !!getServiceAccountCreds();
  },
  getPaymentsConfigMissing
};
