const { assertPrompt, setApiHeaders, LIMITS } = require('./_lib');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'POST') return res.status(405).end();

  const checked = assertPrompt(req.body || {}, LIMITS.score);
  if (checked.error) return res.status(checked.status).json({ error: checked.error });
  const prompt = checked.value;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

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
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Anthropic score error:', err);
      return res.status(500).json({ error: 'Upstream error' });
    }

    const data = await r.json();
    // Return raw Anthropic response — quiz reads d.content[].text
    res.json(data);
  } catch (e) {
    console.error('Score handler error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
};
