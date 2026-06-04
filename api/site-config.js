const { setApiHeaders } = require('./_lib');

/** Public site config (no secrets). */
module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  const ga =
    (process.env.ANIMUS_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || '').trim();

  res.status(200).json({
    gaMeasurementId: /^G-[A-Z0-9]+$/i.test(ga) ? ga : null
  });
};
