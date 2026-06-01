module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

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
