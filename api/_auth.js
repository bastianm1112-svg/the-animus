/** Verify Firebase ID tokens for serverless routes (Identity Toolkit lookup). */

const DEFAULT_FIREBASE_API_KEY = 'AIzaSyCc7icLCWC9beMexLfP5rKPgFr5WX1oHIg';

function getFirebaseApiKey() {
  return (process.env.FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY || DEFAULT_FIREBASE_API_KEY).trim();
}

function readBearerToken(req) {
  const h = (req.headers.authorization || req.headers.Authorization || '').trim();
  if (!h.toLowerCase().startsWith('bearer ')) return null;
  const token = h.slice(7).trim();
  return token || null;
}

async function verifyFirebaseIdToken(idToken) {
  if (!idToken || idToken.length > 8192) return null;
  const apiKey = getFirebaseApiKey();
  let r;
  try {
    r = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
  } catch (e) {
    console.error('Firebase token lookup network error:', e);
    throw e;
  }
  if (!r.ok) {
    console.error('Firebase token lookup failed:', r.status);
    return null;
  }
  const data = await r.json();
  const user = data.users && data.users[0];
  if (!user || !user.localId) return null;
  return {
    uid: user.localId,
    email: user.email || null
  };
}

async function requireAuth(req, res) {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return null;
    }
    return user;
  } catch (e) {
    console.error('Auth verification error:', e);
    res.status(503).json({ error: 'Authentication service unavailable' });
    return null;
  }
}

module.exports = {
  readBearerToken,
  verifyFirebaseIdToken,
  requireAuth
};
