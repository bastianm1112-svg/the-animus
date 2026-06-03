const {
  setApiHeaders,
  rejectForeignOrigin,
  rejectBodyTooLarge,
  assertStringField,
  stripControlChars
} = require('./_lib');
const { requireAuth } = require('./_auth');
const {
  getUserDocument,
  patchUserFields,
  userHasPlusFromDoc,
  getCareerPdfUsageFromDoc,
  monthKey,
  hasServiceAccount
} = require('./_firestore');

const PLUS_CAREER_PDF_PER_MONTH = 3;
const PROFILE_MAX = 6000;

function sanitizeProfile(body) {
  if (!body || typeof body !== 'object') return null;
  const p = body.profile;
  if (!p || typeof p !== 'object') return null;
  const pick = function (key, max) {
    if (p[key] == null) return '';
    return String(p[key]).replace(/<[^>]*>/g, '').trim().substring(0, max || 80);
  };
  const snap = {
    mbti: pick('mbti', 8),
    mbtiName: pick('mbtiName', 48),
    ennType: pick('ennType', 4),
    ennWing: pick('ennWing', 4),
    ennTritype: pick('ennTritype', 16),
    att: pick('att', 16),
    phi: pick('phi', 16),
    instStack: pick('instStack', 24),
    polX: typeof p.polX === 'number' ? Math.round(p.polX) : 0,
    polY: typeof p.polY === 'number' ? Math.round(p.polY) : 0,
    tagline: pick('tagline', 200)
  };
  const raw = JSON.stringify(snap);
  if (raw.length > PROFILE_MAX) return null;
  return snap;
}

function buildPrompt(profile, displayName) {
  return (
    'You are an expert career and lifestyle coach for the ANIMUS personality platform. ' +
    'Write a practical, encouraging guide based ONLY on the profile data below. ' +
    'Do not invent test scores or types not present. Use clear section headings.\n\n' +
    'User: ' +
    (displayName || 'Member') +
    '\nProfile JSON:\n' +
    JSON.stringify(profile, null, 2) +
    '\n\nRespond with valid JSON only (no markdown fences), shape:\n' +
    '{\n' +
    '  "title": "short title",\n' +
    '  "summary": "2-3 sentences",\n' +
    '  "careers": [{"role":"", "why":"", "fit":"high|medium|explore"}],\n' +
    '  "lifestyle": [{"area":"", "guidance":""}],\n' +
    '  "strengths": ["", ""],\n' +
    '  "watchouts": ["", ""],\n' +
    '  "nextSteps": ["", "", ""]\n' +
    '}\n' +
    'Provide 4-5 career ideas, 4 lifestyle areas, 3 strengths, 3 watchouts, 4 next steps.'
  );
}

function parseGuideJson(text) {
  if (!text) return null;
  var trimmed = text.trim();
  if (trimmed.indexOf('```') === 0) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();
  if (rejectBodyTooLarge(req, res)) return;
  if (rejectForeignOrigin(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!hasServiceAccount()) {
    return res.status(503).json({
      error: 'Career guide is not configured on the server yet (missing FIREBASE_SERVICE_ACCOUNT_JSON).'
    });
  }

  const profile = sanitizeProfile(req.body || {});
  if (!profile || !profile.mbti) {
    return res.status(400).json({ error: 'Complete your assessment before generating a guide.' });
  }

  const loaded = await getUserDocument(user.uid);
  if (loaded.error === 'server_config') {
    return res.status(503).json({ error: 'Server configuration error' });
  }
  if (loaded.error) {
    return res.status(500).json({ error: 'Could not load account' });
  }

  const doc = loaded.doc || {};
  if (!userHasPlusFromDoc(doc)) {
    return res.status(403).json({ error: 'Animus Plus required for Career & Lifestyle guides.' });
  }

  const usage = getCareerPdfUsageFromDoc(doc);
  if (usage.count >= PLUS_CAREER_PDF_PER_MONTH) {
    return res.status(429).json({
      error: 'You have used all ' + PLUS_CAREER_PDF_PER_MONTH + ' guides for this month.',
      remaining: 0
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  var displayName = stripControlChars(String(doc.displayName || 'Member')).trim().substring(0, 48) || 'Member';
  if (req.body && typeof req.body.displayName === 'string' && req.body.displayName.trim()) {
    const nameChecked = assertStringField(req.body.displayName, 48, 'displayName');
    if (!nameChecked.error) displayName = nameChecked.value;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1800,
        messages: [{ role: 'user', content: buildPrompt(profile, displayName) }]
      })
    });

    if (!r.ok) {
      console.error('Anthropic career-guide error:', await r.text());
      return res.status(500).json({ error: 'AI generation failed' });
    }

    const data = await r.json();
    const text =
      data.content && data.content[0] && data.content[0].text ? data.content[0].text : '';
    const guide = parseGuideJson(text);
    if (!guide || !guide.careers) {
      console.error('Career guide parse failed:', text.slice(0, 400));
      return res.status(500).json({ error: 'Could not parse guide response' });
    }

    const nextUsage = {
      monthKey: monthKey(),
      count: usage.count + 1
    };
    const patched = await patchUserFields(user.uid, { careerPdfUsage: nextUsage }, ['careerPdfUsage']);
    if (!patched) {
      return res.status(500).json({ error: 'Guide created but usage could not be saved' });
    }

    res.json({
      guide: guide,
      remaining: Math.max(0, PLUS_CAREER_PDF_PER_MONTH - nextUsage.count),
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Career guide handler error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
