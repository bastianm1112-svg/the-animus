# Animus Plus

## Member benefits

- Unlimited profile compares (free tier: 10/month)
- Group compare (2–6 people)
- 1.25× XP on all XP awards
- 20% off one-time Shop items (Detailed Test, Estimator, Complete Pack)
- Plus badge on profile
- AI Career & Lifestyle Guide PDF — **3 generations per calendar month**

## Career guide API

Route: `POST /api/career-guide`

Requires:

- `ANTHROPIC_API_KEY` (same as compare AI)
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON for a Firebase Admin service account with Firestore access

The server verifies the user's Firebase ID token, checks Plus status and monthly quota in Firestore, calls Claude Haiku, increments `users/{uid}.careerPdfUsage`, and returns JSON for the client print/PDF flow.

## Stripe (planned)

Shop buttons show discounted Plus pricing client-side; checkout will use the same `entitlements` fields once Stripe webhooks are wired.
