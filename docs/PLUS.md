# Animus Plus

## Member benefits

- Unlimited profile compares (free tier: 10/month)
- Group compare (2–6 people)
- Cultural axis module (traditionalism ↔ progressivism) — scored on the server, not stored on public profiles
- Deeper Insight on results and compare (longer interpretation; not a rename of Plus)
- 1.25× XP on all XP awards
- 20% off one-time Shop items (Detailed Test, Estimator, Complete Pack)
- Plus badge on profile
- AI Career & Lifestyle Guide PDF — **3 generations per calendar month**
- No ads (free tier may show reserved ad slots later; provider is unset)

Free tests remain: **Quick (50)** and **Short (~100)**. Detailed and Estimator stay one-time SKUs.

## Career guide API

Route: `POST /api/career-guide`

Requires:

- `ANTHROPIC_API_KEY` (same as compare AI)
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON for a Firebase Admin service account with Firestore access

The server verifies the user's Firebase ID token, checks Plus status and monthly quota in Firestore, calls Claude Haiku, increments `users/{uid}.careerPdfUsage`, and returns JSON for the client print/PDF flow.

## Stripe

See [STRIPE.md](./STRIPE.md) for webhook setup and environment variables. Checkout grants the same `entitlements` fields as the admin panel.
