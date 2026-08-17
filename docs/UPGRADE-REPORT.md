# Animus upgrade — implementation report

## Completed

- Shared scoring (`js/animus-test-score.js`) with reverse keys, incomplete-dimension flags, and `bankVersion` / `scoringVersion`.
- `POST /api/submit-test` scores answers on the server and persists `profiles/{uid}.latest` without `polZ`.
- Firestore rules: `quick` drafts; clients cannot write `polZ`, `deeperInsight`, `politicalPrivate`, `aiCache`, `auditLog`; profile `latest` cannot include `polZ`.
- Free **Quick (50)** mode kept beside Short (~100) and Detailed.
- Question wording patches + reverse items; methodology Node fixtures (`node scripts/validate-methodology.js` passed).
- Plus-only Cultural axis via `GET/POST /api/cultural` (16 items, not in the public bank). Stored on `users/{uid}.politicalPrivate`.
- Political similarity uses normalized Euclidean distance and hedged labels; closest figures ranked by distance × popularity with a mismatch floor.
- Sports category on the figures catalog; `/figures` search/filter page (rewrite in `vercel.json`).
- Group dynamics (spread, pairs, centroid, clusters) instead of average-as-type.
- Result cards, Deeper Insight (Plus gated; `/api/score` with `depth=deeper`), compass SVG, cultural slider, reduced-motion CSS.
- Haiku `_ai.js` with cache, single-flight, timeouts, rate limits, free vs Plus token budgets.
- Ads slot abstraction (`AnimusAds`) — provider `null`, disabled; config from `/api/site-config`.
- Admin ban / entitlements go through `POST /api/admin` (server checks `isAdmin`). `GET /api/admin` and rewrite `/api/admin/me`.

## Architecture

Vanilla HTML/JS + Vercel `api/` + Firestore + Stripe remains. No React rewrite, no Postgres.

## AI (runtime vs build)

- **Runtime:** Claude Haiku only (`api/_ai.js`).
- **Build intent:** Grok 4.6 UI, GPT-5.6 architecture, Composer 2.5 small diffs.
- **Grok 4.5:** not used.
- Caching: SHA-256 of task type + prompt version + model + lang + prompt in `aiCache/{hash}`.

## Political compass

Cultural traditionalism ↔ progressivism (`polZ`). Plus-only, server-scored, omitted from public profiles. Distance normalizes each axis to [-1, 1] so Z cannot dominate X or Y.

## Political similarity

Pair formula uses normalized Euclidean distance (2D, or 3D when both have `polZ`). Language bands: slight / moderate / strong / very strong. “Twin” language only if overall ≥ 90 and all axis deltas ≤ 18.

## Figures

Popularity field; Sports entries; Entertainment/Other mapped from Celebrity/Pop Culture. Political closest-figures are a **separate estimated set** — not invented test scores. All current political entries are `dataStatus: estimated`.

## Group compare

`AnimusGroupDynamics.analyze`: cohesion/diversity, closest & contrasting pair, central/distinctive, outliers, up to 3 clusters, qualified copy. Group AI `mode=group` requires Plus on the server. Cultural distribution only appears if every member actually has `polZ` (public snapshots do not), so group cultural stats stay empty by design.

## 50-question test

`QUICK_ALLOC` = 24 cognitive + 12 politics + 6 attachment + 8 enneagram. Reverse-keyed extras in `psyche-quick-extra.js`. Scoring versioned.

## Results UX

Shared cards in `animus-results-ui.js` / `css/animus-results.css`. Free results remain complete; Deeper Insight is the Plus expansion. AI explains structured scores rather than replacing them.

## Security (found and addressed)

- Client-authored types: mitigated with `submit-test`. If that API fails, the client can still save a preview snapshot (without `polZ`) — residual.
- Cultural bypass: items and `polZ` are server-only; rules block client `polZ`.
- `/api/score` deeper depth requires Plus; rate limited.
- Group AI `mode=group` requires Plus.
- Admin entitlement/ban no longer trust a client body `isAdmin` flag.
- Residual: CSP still allows `'unsafe-inline'`; question bank remains public JS; Detailed/Estimator UI can still be forced (scoring API + career still gated).

## Edge cases actually tested

- Node: reverse inversion, Quick alloc = 50, missing answers flag, MBTI codes at extremes, NT-default check, Z vs X normalization, figure ranking, group pairs, cultural bank isolation (`node scripts/validate-methodology.js`).
- Existing `node scripts/validate-scoring.js` still produces INTJ / ENFP / ISFP fixtures.

## Not tested in a browser/device lab this session

- Mobile/tablet visual QA, reduced-motion in a real headset/browser, Stripe webhook, live Anthropic, simultaneous duplicate AI requests on Vercel, large groups >6, expired Plus `animusPlusUntil` in production, XSS in admin JSON editor, full 280-q manual take, deploying `firestore.rules`.

## Remaining issues / your decisions

- Deploy updated `firestore.rules` to Firebase.
- Client can still write `latest` (without `polZ`) if submit-test fails; tightening to session-token-only writes needs a follow-up.
- Political figure coordinates are **estimated** and should be reviewed by you.
- Ads provider still unset by design.
- Spanish overlays appended in `js/psyche-q-es.js` for the Quick extra reverse items.
- `/api/simplify` and `/api/career-guide` now go through `_ai.js` (Haiku). Simplify is cached; career is not (monthly quota).
- Plan alias `POST /api/cultural-score` is `api/cultural-score.js` (same handler as `/api/cultural`).
