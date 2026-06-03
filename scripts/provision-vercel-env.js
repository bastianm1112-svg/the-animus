/**
 * Provision FIREBASE_SERVICE_ACCOUNT_JSON on Vercel using Firebase CLI login.
 * Optionally set STRIPE_* from process.env before running.
 *
 *   node scripts/provision-vercel-env.js
 *   $env:STRIPE_SECRET_KEY="sk_test_..."; node scripts/provision-vercel-env.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'animus-b3d83';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const CONFIG_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config',
  'configstore',
  'firebase-tools.json'
);

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token refresh failed');
  return data.access_token;
}

async function getAccessToken() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('Run: firebase login');
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tokens = cfg.tokens || {};
  const now = Date.now();
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60000) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) throw new Error('No Firebase refresh token — run: firebase login');
  return refreshAccessToken(tokens.refresh_token);
}

async function iamFetch(accessToken, url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(options && options.headers)
    }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error((data.error && data.error.message) || text || res.statusText);
  }
  return data;
}

async function getFirebaseAdminServiceAccountEmail(accessToken) {
  const url =
    'https://iam.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/serviceAccounts?pageSize=100';
  const data = await iamFetch(accessToken, url);
  const accounts = data.accounts || [];
  const admin = accounts.find(function (a) {
    return a.email && a.email.indexOf('firebase-adminsdk') !== -1;
  });
  if (!admin) {
    throw new Error('No firebase-adminsdk service account found for ' + PROJECT_ID);
  }
  return admin.email;
}

async function createServiceAccountKey(accessToken, email) {
  const name = 'projects/' + PROJECT_ID + '/serviceAccounts/' + encodeURIComponent(email);
  const url = 'https://iam.googleapis.com/v1/' + name + '/keys';
  return iamFetch(accessToken, url, {
    method: 'POST',
    body: JSON.stringify({
      keyAlgorithm: 'KEY_ALG_RSA_2048',
      privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE'
    })
  });
}

async function provisionStripe(stripeKey, envs, root) {
  vercelEnvAdd('STRIPE_SECRET_KEY', stripeKey, envs);
  const Stripe = require('stripe');
  const stripe = new Stripe(stripeKey);
  const site = 'https://animustest.com';
  const webhookUrl = site + '/api/stripe-webhook';
  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
  let wh = endpoints.data.find(function (e) {
    return e.url === webhookUrl;
  });
  if (!wh) {
    wh = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ]
    });
    console.log('Created Stripe webhook:', wh.id);
  } else {
    console.log('Found Stripe webhook:', wh.id);
  }
  if (wh.secret) {
    vercelEnvAdd('STRIPE_WEBHOOK_SECRET', wh.secret, envs);
  } else {
    console.warn('Webhook secret not returned — copy whsec_ from Stripe Dashboard → Webhooks');
  }
  console.log('Running stripe-provision for products/prices…');
  execSync('node scripts/stripe-provision.js', {
    cwd: root,
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      STRIPE_SECRET_KEY: stripeKey,
      SITE_URL: site
    })
  });
}

function vercelEnvAdd(name, value, environments) {
  const root = path.join(__dirname, '..');
  const { spawnSync } = require('child_process');
  environments.forEach(function (env) {
    const args = ['vercel', 'env', 'add', name, env, '--yes', '--force', '--non-interactive'];
    const r = spawnSync('npx', args, {
      cwd: root,
      input: value,
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    if (r.status !== 0) {
      throw new Error('vercel env add failed for ' + name + ' ' + env);
    }
  });
}

async function main() {
  const root = path.join(__dirname, '..');
  process.chdir(root);
  const stripeOnly = process.argv.includes('--stripe-only');
  const envs = ['production'];

  if (stripeOnly) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Set STRIPE_SECRET_KEY then re-run.');
      process.exit(1);
    }
    await provisionStripe(stripeKey.trim(), envs, root);
    console.log('Deploying to production…');
    execSync('npx vercel deploy --prod --yes', { cwd: root, stdio: 'inherit' });
    console.log('Done. Check https://animustest.com/api/payments-status');
    return;
  }

  console.log('Fetching Google access token (Firebase CLI login)…');
  const accessToken = await getAccessToken();

  console.log('Locating Firebase Admin service account…');
  const email = await getFirebaseAdminServiceAccountEmail(accessToken);
  console.log('Using:', email);

  console.log('Creating service account key…');
  const keyRes = await createServiceAccountKey(accessToken, email);
  const privateKeyData = keyRes.privateKeyData;
  if (!privateKeyData) throw new Error('IAM did not return privateKeyData');

  const saJson = Buffer.from(privateKeyData, 'base64').toString('utf8');
  const saPath = path.join(__dirname, '.service-account.generated.json');
  fs.writeFileSync(saPath, saJson, 'utf8');
  console.log('Wrote local key (gitignored):', saPath);

  console.log('Setting Vercel env vars for', envs.join(', '), '…');

  vercelEnvAdd('FIREBASE_SERVICE_ACCOUNT_JSON', saJson, envs);
  vercelEnvAdd('SITE_URL', 'https://animustest.com', envs);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    await provisionStripe(stripeKey.trim(), envs, root);
  } else {
    console.warn('STRIPE_SECRET_KEY not set — run:');
    console.warn('  $env:STRIPE_SECRET_KEY="sk_test_..."; node scripts/provision-vercel-env.js --stripe-only');
  }

  console.log('Deploying to production…');
  execSync('npx vercel deploy --prod --yes', { cwd: root, stdio: 'inherit' });

  try {
    fs.unlinkSync(saPath);
  } catch (e) {}

  console.log('Done. Check https://animustest.com/api/payments-status');
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
