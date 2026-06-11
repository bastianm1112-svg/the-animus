# Stripe checkout (ANIMUS Shop)

## Already wired in the codebase

The site is connected to Stripe in commit `eef156e` and later:

| Route | Role |
|-------|------|
| `POST /api/create-checkout-session` | Starts Checkout (requires Firebase sign-in) |
| `POST /api/stripe-webhook` | Grants entitlements after payment |
| `POST /api/fulfill-checkout` | Backup grant on `/shop?checkout=success` |

Shop UI: `/shop` → **Get** redirects to Stripe. No extra front-end Stripe.js is required (Checkout Sessions hosted page).

## Connect your Stripe account (Cursor MCP or script)

### Option A — Stripe MCP in Cursor

1. Open **Cursor Settings → MCP** and ensure the Stripe server is enabled.
2. When the agent asks to authenticate, **approve** `mcp_auth` (if you skip it, the agent cannot read your Stripe account).
3. After auth, the agent can list products, prices, and webhooks and align them with this repo.

### Option B — Provision script (no MCP)

From the project root, with your **test** secret key:

```powershell
$env:STRIPE_SECRET_KEY = "sk_test_..."
$env:SITE_URL = "https://animustest.com"
node scripts/stripe-provision.js --create-webhook
```

This creates four Products/Prices (metadata `animusProductId`) and prints Price IDs for Vercel. With `--create-webhook` it also registers the webhook and prints `STRIPE_WEBHOOK_SECRET` once.

### Option C — Manual Dashboard

Create products/prices yourself and set optional env vars listed below, or rely on dynamic `price_data` (works without Price IDs; Plus 20% discount uses dynamic pricing automatically).

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

**Alternative to full JSON:** you can set `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` instead (private key may use `\n` for newlines).

### “Payments are not configured on the server yet”

That message means **Vercel is missing server env vars**, not that Stripe Checkout is broken in code.

1. [Vercel → your project → Settings → Environment Variables](https://vercel.com/dashboard)
2. Add at minimum:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase Console → Project settings → Service accounts → **Generate new private key** → paste the **entire** JSON as one value (Production + Preview).
   - `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys.
3. **Redeploy** (env vars only apply after a new deployment).
4. Optional check: open `https://animustest.com/api/payments-status` — `checkoutReady` should be `true`.

Without `FIREBASE_SERVICE_ACCOUNT_JSON`, checkout cannot verify ownership or write entitlements after payment.

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

3. Use **test mode** keys on preview/local. For **animustest.com production**, use **live** keys (`sk_live_…`) or real cards will fail with Stripe’s “test card” message.

### Switch production to live payments

From project root (requires Vercel CLI login and your **live** secret key):

```powershell
$env:STRIPE_SECRET_KEY = "sk_live_..."
node scripts/provision-vercel-env.js --stripe-only
```

This sets `STRIPE_SECRET_KEY`, creates/finds the live webhook, provisions live Price IDs on Vercel, and deploys. After deploy, `https://animustest.com/api/payments-status` should show `"stripeMode":"live"` and `"livePayments":true`.

Or manually in Vercel → Environment Variables: replace `STRIPE_SECRET_KEY` with `sk_live_…`, add a **live mode** webhook signing secret, optional live `STRIPE_PRICE_*` IDs, then redeploy.

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
