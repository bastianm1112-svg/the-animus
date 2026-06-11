const { setApiHeaders } = require('./_lib');
const { getPaymentsConfigMissing } = require('./_firestore');
const { getStripeMode, getLivePaymentsBlockReason, isProductionSite } = require('./_stripe');

module.exports = async function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  const missing = getPaymentsConfigMissing();
  const webhookMissing = !process.env.STRIPE_WEBHOOK_SECRET;
  const stripeMode = getStripeMode();
  const livePaymentsBlock = getLivePaymentsBlockReason();
  const configured = missing.length === 0;

  return res.status(200).json({
    checkoutReady: configured && !livePaymentsBlock,
    webhookConfigured: !webhookMissing,
    stripeMode: stripeMode,
    livePayments: stripeMode === 'live',
    productionSite: isProductionSite(),
    warning: livePaymentsBlock || null,
    missing: missing
  });
};
