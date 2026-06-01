/**
 * Set isAdmin on Firestore user docs using Firebase CLI login (configstore refresh token).
 * Usage: node scripts/set-admin.js [uid ...]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const PROJECT_ID = 'animus-b3d83';
const DEFAULT_UIDS = [
  '2KyQHFEqVZQOLVb5BMg7SMPIKgn1',
  'aVNxvM3sVLPdUGlbRrxlof6bGL52'
];

function loadCliTokens() {
  var cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  var cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.tokens || !cfg.tokens.access_token) {
    throw new Error('Not logged in to Firebase CLI. Run: npx firebase-tools@latest login');
  }
  return cfg.tokens;
}

async function getAccessToken() {
  var tokens = loadCliTokens();
  if (tokens.expires_at && tokens.expires_at > Date.now() + 60000) {
    return tokens.access_token;
  }
  var { OAuth2Client } = require('google-auth-library');
  var oauth2 = new OAuth2Client(
    '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    'j9pYSMAUeQJM'
  );
  oauth2.setCredentials({ refresh_token: tokens.refresh_token });
  var res = await oauth2.getAccessToken();
  if (!res || !res.token) throw new Error('Could not refresh access token');
  return res.token;
}

async function setIsAdmin(token, uid) {
  var url =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/users/' +
    uid +
    '?updateMask.fieldPaths=isAdmin';
  var r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        isAdmin: { booleanValue: true }
      }
    })
  });
  if (!r.ok) {
    var text = await r.text();
    throw new Error('Firestore PATCH failed for ' + uid + ': ' + r.status + ' ' + text);
  }
  console.log('isAdmin=true → users/' + uid);
}

async function main() {
  var uids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_UIDS;
  var token = await getAccessToken();
  for (var i = 0; i < uids.length; i++) {
    await setIsAdmin(token, uids[i]);
  }
  console.log('Done.');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
