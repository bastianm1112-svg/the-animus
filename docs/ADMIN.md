# ANIMUS admin profile editing

Only accounts with `isAdmin: true` on their **users** document can edit any user's profile data. Changes are saved to `profiles/{uid}.latest`, which powers profile pages, compare, friends cards, and daily facts.

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
2. Search by **@username** or paste a **user UID**.
3. Edit quick fields and/or the full **profile JSON** (`latest` snapshot).
4. Click **Save profile** — updates appear everywhere that reads Firestore profiles.

## Tips

- Export your own profile from Settings → Data & Export → Export JSON as a template.
- Invalid JSON or missing `mbti` will be rejected before save.
- Each save appends to profile `history` (last 10 entries).
