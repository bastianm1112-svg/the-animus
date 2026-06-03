const { setApiHeaders } = require('./_lib');
const { getPaymentsConfigMissing } = require('./_firestore');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  const missing = getPaymentsConfigMissing();
  const webhookMissing = !process.env.STRIPE_WEBHOOK_SECRET;

  return res.status(200).json({
    checkoutReady: missing.length === 0,
    missing: missing,
    webhookConfigured: !webhookMissing
  });
};
