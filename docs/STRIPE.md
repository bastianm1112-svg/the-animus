# Stripe checkout (ANIMUS Shop)

## Flow

1. Signed-in user taps **Get** on `/shop`.
2. `POST /api/create-checkout-session` (Firebase ID token) creates a Stripe Checkout session with dynamic USD pricing (Plus 20% discount on one-time items is applied server-side).
3. User pays on Stripe → redirected to `/shop?checkout=success&session_id=…`.
4. **Webhook** `POST /api/stripe-webhook` grants entitlements in Firestore (primary).
5. **Backup** `POST /api/fulfill-checkout` runs on the success redirect if the webhook is slow.

Entitlements are written to `users/{uid}.entitlements` (same shape as admin grants).

## Vercel environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret from the webhook endpoint (`whsec_…`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | Firebase admin JSON (Firestore writes) |
| `SITE_URL` | Recommended | `https://animustest.com` (success/cancel URLs) |

Optional fixed Price IDs (if set and price matches list price, Checkout uses them instead of `price_data`):

- `STRIPE_PRICE_DETAILED_TEST`
- `STRIPE_PRICE_TEST_ESTIMATOR`
- `STRIPE_PRICE_DETAILED_BUNDLE`
- `STRIPE_PRICE_ANIMUS_PLUS`

Plus-discounted one-time purchases always use dynamic `price_data` so the charged amount matches the 20% rule.

## Stripe Dashboard setup

1. **Developers → Webhooks → Add endpoint**  
   URL: `https://animustest.com/api/stripe-webhook`  
   Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

2. Copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`.

3. Use **test mode** keys until you are ready for live payments.

## Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Set the printed `whsec_…` in `.env.local` for Vercel dev or export it in the shell.

## Products

| Product ID | Mode | Default price |
|------------|------|----------------|
| `detailedTest` | one-time payment | $10 |
| `testEstimator` | one-time payment | $10 |
| `detailedBundle` | one-time payment | $15 |
| `animusPlus` | subscription (monthly) | $5/mo |

## Firestore

- `stripe_processed/{id}` — idempotency (server only; denied in security rules).
- `users/{uid}.stripeCustomerId`, `stripeSubscriptionId` — set after checkout (optional for renewals).

Deploy Firestore rules after pulling: `firebase deploy --only firestore:rules`
