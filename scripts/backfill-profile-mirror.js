/**
 * One-time backfill: copy displayName/username/photoURL from users/{uid}
 * onto profiles/{uid} so signed-out visitors can render shared profiles.
 *
 * Usage: node scripts/backfill-profile-mirror.js
 * Reads FIREBASE_SERVICE_ACCOUNT_JSON from env or .env.vercel.production.
 */
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

function loadServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const envPath = path.join(__dirname, '..', '.env.vercel.production');
    if (fs.existsSync(envPath)) {
      const m = fs.readFileSync(envPath, 'utf8').match(/FIREBASE_SERVICE_ACCOUNT_JSON="([\s\S]*?)"\r?\n[A-Z_]+=/);
      if (m) raw = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found');
  return JSON.parse(raw);
}

async function main() {
  const creds = loadServiceAccount();
  const projectId = creds.project_id;
  const auth = new GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/datastore']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const base = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  async function listDocs(collection) {
    let docs = [];
    let pageToken = '';
    do {
      const url = base + '/' + collection + '?pageSize=300&mask.fieldPaths=displayName&mask.fieldPaths=username&mask.fieldPaths=photoURL' + (pageToken ? '&pageToken=' + pageToken : '');
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(collection + ' list failed: ' + r.status + ' ' + (await r.text()));
      const data = await r.json();
      docs = docs.concat(data.documents || []);
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return docs;
  }

  const users = await listDocs('users');
  console.log('users:', users.length);

  let patched = 0;
  let skipped = 0;
  for (const u of users) {
    const uid = u.name.split('/').pop();
    const f = u.fields || {};
    const fields = {};
    if (f.displayName && f.displayName.stringValue) fields.displayName = { stringValue: f.displayName.stringValue.substring(0, 48) };
    if (f.username && f.username.stringValue) fields.username = { stringValue: f.username.stringValue.substring(0, 32) };
    if (f.photoURL && f.photoURL.stringValue) fields.photoURL = { stringValue: f.photoURL.stringValue.substring(0, 1024) };
    if (!Object.keys(fields).length) { skipped++; continue; }

    // Only patch profiles that exist (merge-style update via field masks).
    const check = await fetch(base + '/profiles/' + uid + '?mask.fieldPaths=updatedAt', { headers });
    if (check.status === 404) { skipped++; continue; }
    if (!check.ok) throw new Error('profiles get failed: ' + check.status);

    const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + k).join('&');
    const r = await fetch(base + '/profiles/' + uid + '?' + mask, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });
    if (!r.ok) throw new Error('profiles patch failed for ' + uid + ': ' + r.status + ' ' + (await r.text()));
    patched++;
    console.log('patched', uid, Object.keys(fields).join(','));
  }
  console.log('done. patched=' + patched + ' skipped=' + skipped);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
