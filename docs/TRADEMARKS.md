# Trademark & naming audit (ANIMUS)

**Not legal advice.** Use this checklist when editing copy, `types.html`, results UI, and marketing. Prefer [animus-type-lexicon.js](../js/animus-type-lexicon.js) for display names.

## Your known list — status on animustest.com

| Mark / term | Risk | Found on site? | Where |
|-------------|------|----------------|--------|
| MBTI®, Myers-Briggs®, Step I/II/III | High | Yes (marketing labels) | `index.html`, `profile.html`, `login.html`, `compare.html`, `psyche-engine.js`, admin |
| Introduction to Type®, Myers-Briggs Company | High | No exact match | — |
| RHETI®, Enneagram Institute® | High | No RHETI; EI **type titles** yes | `types.html`, `profile-narrative-depth.js`, `psyche-engine.js` |
| CliftonStrengths®, StrengthsFinder® | High | No | — |
| DiSC® / Everything DiSC® | High | No product name (CSS `.shop-price-discount` only) | — |
| Political Compass™ (brand) | High | Yes as **section title** | `index.html`, `landing.html`, `compare.html`, `types.html`, `psyche-engine.js` |
| 8values / 9axes (as product names) | Medium | No | — |
| EI type names (Reformer, Helper, …) | High | Yes | `types.html`, `psyche-engine.js`, `profile-narrative-depth.js` |

## Additional issues found (beyond your list)

| Issue | Risk | Location |
|-------|------|----------|
| **16Personalities® nicknames** (Architect, Logician, Commander, Debater, Advocate, Mediator, Protagonist, Campaigner, Logistician, Defender, Executive, Consul, Virtuoso, Adventurer, Entrepreneur, Entertainer) | High | `types.html` (full set on MBTI tab) |
| **Keirsey® temperaments** (Artisan, Guardian, Idealist, Rational) | High | `animus-shared.js`, `profile-narratives.js`, AI prompts in `psyche-engine.js` |
| **INTP “Analytical Architect”** | Medium | Close to 16P “Architect”; use “Theoretical Analyst” instead |
| **“Keirsey” stat label** on profile | Medium | `profile.html` — label can stay as “Temperament” with non-Keirsey values |
| **“MBTI” in meta/SEO** | Medium | Descriptive/nominative may be OK; safer: “cognitive type” + disclaimer |
| **Socionics type codes** (LII, ILI, …) | Low–medium | Community codes; avoid copying proprietary Model A nicknames |
| **“Inspector Lestrade”** etc. | Low | Character names, not type trademarks |
| **Gallup theme names** (Achiever®, etc.) | High if used as strengths | Only generic “Achiever” in enneagram context on `types.html` — rename enneagram section |

## Safe patterns (what ANIMUS should use)

- **Four-letter codes:** INTJ, ENFP — shorthand only, not “MBTI type” as a product name.
- **Cognitive type / cognitive functions** — instead of “MBTI” in UI headings.
- **Enneagram:** “Type 1” … “Type 9” plus **original** archetypes from `AnimusTypeLexicon` (Standard-bearer, Ally, Striver, …).
- **Politics:** “Political spectrum matrix” or “two-axis political map” — not “Political Compass” as a header.
- **Temperament:** Analyst / Visionary / Steward / Operator — not Rational, Idealist, Guardian, Artisan.
- **Disclaimer** (footer or /types): Not affiliated with MBTI®, Myers-Briggs®, The Enneagram Institute®, Gallup®, Wiley DiSC®, 16Personalities®, Keirsey®, or The Political Compass®.

## ANIMUS original Enneagram archetypes (use these)

| # | Avoid (EI®) | Use instead |
|---|-------------|-------------|
| 1 | Reformer | **Standard-bearer** |
| 2 | Helper | **Ally** |
| 3 | Achiever | **Striver** |
| 4 | Individualist | **Seeker** |
| 5 | Investigator | **Sage** |
| 6 | Loyalist | **Sentinel** |
| 7 | Enthusiast | **Spark** |
| 8 | Challenger | **Vanguard** |
| 9 | Peacemaker | **Harmonizer** |

## Files to keep aligned

- `js/animus-type-lexicon.js` — source of truth for UI names
- `js/profile-narratives.js` — MBTI archetypes (mostly already original)
- `js/profile-narrative-depth.js` — Enneagram core names
- `js/psyche-engine.js` — `ennNames`, panel titles, PDF headings
- `types.html` — public encyclopedia (highest visibility)
- `index.html`, `landing.html`, `compare.html` — dimension labels

## Web / industry notes (2024–2026)

- **MBTI / Myers-Briggs:** Registered marks; four-letter codes are widely used descriptively but not as your product name.
- **16Personalities / NERIS:** Role names and -A/-T framing are brand-specific; MIT license does not apply to their **branding**.
- **Enneagram Institute:** Nine numbers are public domain; **paired titles** (Reformer, etc.) and RHETI content are not.
- **Political Compass (Pace News):** Brand + grid layout; axis concepts are generic.
- **8values / 9axes:** Open-source code (MIT) with **separate** branding — do not name your product after them.
- **Keirsey:** Temperament and role names are trademarked.
- **HEXACO-PI-R, Hogan, CPI, NEO-PI-R:** Instrument names and item banks — not trait words like “conscientiousness.”

## Remediation status

- [x] `animus-type-lexicon.js` added
- [x] Enneagram + Keirsey + political labels updated in core JS and main pages
- [x] `types.html` — 16P nicknames and EI type titles replaced
- [x] Marketing/meta on `index.html`, `landing.html`, `profile.html`, `login.html`
- [ ] Site-wide footer disclaimer (recommended)
- [ ] Re-save or refresh profiles that still store old AI `mbtiName` (e.g. “The Architect”) in Firestore
