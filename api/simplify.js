export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question, lang } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const isEs = lang === 'es';
  const prompt = isEs
    ? `Reescribí esta pregunta de test de personalidad en español paraguayo simple y cotidiano. Usá "vos" en vez de "tú". Sé conciso (1-2 oraciones). Devolvé solo la pregunta simplificada, sin explicación: ${question}`
    : `Rewrite this personality test question in simple, everyday language. Keep it concise (1-2 sentences). Return only the simplified question, no explanation: ${question}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: 'Upstream error' });
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
      .replace(/^["'""'']|["'""'']$/g, '');

    res.json({ simplified: text });
  } catch (e) {
    console.error('Simplify handler error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
