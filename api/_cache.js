/** Firestore-backed AI cache. Deterministic generations only. */
const { getAccessToken } = require('./_firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'animus-b3d83';

function jsToFields(obj) {
  const fields = {};
  Object.keys(obj || {}).forEach(function (key) {
    const v = obj[key];
    if (v === null || v === undefined) return;
    if (typeof v === 'string') fields[key] = { stringValue: v };
    else if (typeof v === 'boolean') fields[key] = { booleanValue: v };
    else if (typeof v === 'number' && Number.isInteger(v)) fields[key] = { integerValue: String(v) };
    else if (typeof v === 'number') fields[key] = { doubleValue: v };
    else if (Array.isArray(v)) {
      fields[key] = {
        arrayValue: {
          values: v.map(function (item) {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') {
              return Number.isInteger(item)
                ? { integerValue: String(item) }
                : { doubleValue: item };
            }
            return { mapValue: { fields: jsToFields(item) } };
          })
        }
      };
    } else if (typeof v === 'object') {
      fields[key] = { mapValue: { fields: jsToFields(v) } };
    }
  });
  return fields;
}

function fieldToJs(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('mapValue' in field) {
    const out = {};
    const f = (field.mapValue.fields || {});
    Object.keys(f).forEach(function (k) {
      out[k] = fieldToJs(f[k]);
    });
    return out;
  }
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(fieldToJs);
  return null;
}

async function getCache(key) {
  const token = await getAccessToken();
  if (!token) return null;
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/aiCache/' +
    encodeURIComponent(key);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return null;
  if (!r.ok) return null;
  const data = await r.json();
  const fields = data.fields || {};
  const payload = fieldToJs(fields.payload);
  return payload;
}

async function setCache(key, payload, meta) {
  const token = await getAccessToken();
  if (!token) return false;
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/aiCache/' +
    encodeURIComponent(key);
  const body = {
    fields: jsToFields({
      payload: payload,
      taskType: (meta && meta.taskType) || '',
      promptVersion: (meta && meta.promptVersion) || '',
      model: (meta && meta.model) || '',
      createdAt: new Date().toISOString()
    })
  };
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return r.ok;
}

async function writeAudit(entry) {
  const token = await getAccessToken();
  if (!token) return false;
  const id = 'a' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/auditLog?documentId=' +
    encodeURIComponent(id);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: jsToFields(entry) })
  });
  return r.ok;
}

async function setDocument(collection, docId, obj) {
  const token = await getAccessToken();
  if (!token) return false;
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/' +
    collection +
    '/' +
    encodeURIComponent(docId);
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: jsToFields(obj) })
  });
  if (!r.ok) {
    console.error('setDocument failed', collection, r.status, await r.text());
    return false;
  }
  return true;
}

async function getDocument(collection, docId) {
  const token = await getAccessToken();
  if (!token) return { error: 'server_config', doc: null };
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/' +
    collection +
    '/' +
    encodeURIComponent(docId);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return { error: null, doc: null };
  if (!r.ok) return { error: 'firestore', doc: null };
  const data = await r.json();
  const out = {};
  Object.keys(data.fields || {}).forEach(function (k) {
    out[k] = fieldToJs(data.fields[k]);
  });
  return { error: null, doc: out };
}

module.exports = {
  getCache,
  setCache,
  writeAudit,
  setDocument,
  getDocument,
  jsToFields
};
