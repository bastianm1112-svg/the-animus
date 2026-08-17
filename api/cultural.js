const {
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  sendApiError
} = require('./_lib');
const { requireAuth } = require('./_auth');
const { getUserDocument, patchUserFields, hasServiceAccount } = require('./_firestore');
const { hasAnimusPlus } = require('./_entitlements');
const bank = require('./_cultural-bank');

function valFromRaw(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 7) return null;
  return ((n - 1) / 6) * 100;
}

function scoreCultural(items) {
  const byId = {};
  bank.forEach(function (q) {
    byId[q.id] = q;
  });
  const buckets = { CULT_TRAD: { sum: 0, w: 0 }, CULT_PROG: { sum: 0, w: 0 } };
  (items || []).forEach(function (it) {
    const q = byId[it.id];
    if (!q) return;
    var v = valFromRaw(it.raw);
    if (v == null) return;
    if (q.rev) v = 100 - v;
    buckets[q.fn].sum += v;
    buckets[q.fn].w += 1;
  });
  function avg(k) {
    if (!buckets[k].w) return 50;
    return buckets[k].sum / buckets[k].w;
  }
  const polZ = Math.max(-100, Math.min(100, Math.round(avg('CULT_PROG') - avg('CULT_TRAD'))));
  return polZ;
}

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (rejectForeignOrigin(req, res)) return;

  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!hasServiceAccount()) return res.status(503).json({ error: 'Unavailable' });
    const loaded = await getUserDocument(user.uid);
    if (!hasAnimusPlus(loaded.doc || {})) {
      return res.status(403).json({ error: 'Animus Plus required' });
    }
    const items = bank.map(function (q) {
      return { id: q.id, cat: q.cat, t: q.t, lo: q.lo, hi: q.hi, type: q.type };
    });
    const priv = (loaded.doc && loaded.doc.politicalPrivate) || {};
    return res.json({
      items: items,
      polZ: priv.polZ != null ? priv.polZ : null,
      meaning:
        'Cultural traditionalism versus cultural progressivism: custom, family forms, secularism, speech norms, and continuity versus reform. Independent of economic left/right and of authoritarian/libertarian.'
    });
  }

  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;
  if (!hasServiceAccount()) return res.status(503).json({ error: 'Unavailable' });
  const loaded = await getUserDocument(user.uid);
  if (!hasAnimusPlus(loaded.doc || {})) {
    return res.status(403).json({ error: 'Animus Plus required' });
  }
  const items = (req.body && req.body.items) || [];
  if (!Array.isArray(items) || items.length < 8) {
    return res.status(400).json({ error: 'Incomplete cultural module' });
  }
  const allowed = {};
  bank.forEach(function (q) {
    allowed[q.id] = true;
  });
  for (let i = 0; i < items.length; i++) {
    if (!allowed[items[i].id]) return res.status(400).json({ error: 'Unknown item' });
  }
  const polZ = scoreCultural(items);
  const ok = await patchUserFields(
    user.uid,
    {
      politicalPrivate: {
        polZ: polZ,
        scoredAt: new Date().toISOString(),
        scoringVersion: '2026.08.16'
      }
    },
    ['politicalPrivate']
  );
  if (!ok) return sendApiError(res, 500, 'Could not save');
  res.json({
    polZ: polZ,
    label: polZ > 12 ? 'Leans culturally progressive' : polZ < -12 ? 'Leans culturally traditional' : 'Culturally mixed / center'
  });
};
