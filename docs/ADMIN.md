# ANIMUS admin profile editing

Only accounts with `isAdmin: true` on their **users** document can edit any user's profile data. Changes are saved to `profiles/{uid}.latest` with `_typesLocked` and `adminEditedAt`, which powers profile pages, compare, friends cards, and daily facts.

## One-time: grant yourself admin

1. Sign in to ANIMUS once (so your `users/{uid}` document exists).
2. Open [Firebase Console](https://console.firebase.google.com/) → project **animus-b3d83** → **Firestore Database**.
3. Open collection **users** → your user document (same ID as Firebase Auth UID).
4. Add field: **isAdmin** → type **boolean** → value **true** → Save.

Nobody can set `isAdmin` from the app UI; only the console (or Firebase Admin SDK) can.

## Deploy security rules (required)

Admin edits are blocked for other users until rules are deployed:

```bash
firebase login
firebase use animus-b3d83
firebase deploy --only firestore:rules
```

Rules live in `firestore.rules` at the repo root.

## Use the admin editor

1. Go to **Settings** → **Admin** (visible only when `isAdmin` is true), or open `/admin`.
2. **Load** by @username or UID, or **My profile** for your own account.
3. Edit **identity fields** (MBTI, Enneagram, etc.) — these are the source of truth.
4. Click **Update preview** to rebuild chart scores, narratives, and figures to match (does not recompute MBTI from old test cognition).
5. Click **Publish changes** — writes to Firestore, sets the type lock, and **re-reads** the document to verify your MBTI was stored (works for your own profile and others).

### Advanced

- **Raw JSON** — full snapshot for power users; still merged with identity fields on preview/publish.
- **Recompute from cognition** — only when you intentionally want MBTI/Enn derived from stored test scores again (removes lock in the draft until you publish).
- **Remove type lock (draft)** — allows test reconciliation again after publish if you unlock and save.

## Tips

- Export your own profile from Settings → Data & Export → Export JSON as a template.
- Invalid JSON or missing `mbti` is rejected before publish.
- Each publish appends to profile `history` (last 10 entries) with `source: admin-edit`.
- If edits “don’t stick,” ensure you **Publish** (not only preview) and that you are on the latest deploy with `adminSaveProfileToFirestore`.

## Test responses (admin only)

When a signed-in user finishes the test, questions and answers are saved to **`testSessions/{uid}/records`** (not on the public `profiles` document). In `/admin`, after loading a user, open **Test responses (admin only)**.

Deploy **`firestore.rules`** so clients can write test sessions and only admins can read them:

```bash
firebase deploy --only firestore:rules
```
