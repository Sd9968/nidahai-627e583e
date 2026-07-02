## Changes

**1. Remove the Use Cases section**
- Delete `src/components/landing/UseCases.tsx`
- Remove its import and `<UseCases />` (with surrounding `ScrollReveal`) from `src/routes/index.tsx`
- Remove `uc.*` keys from both `en` and `ar` dictionaries in `src/lib/i18n.tsx`

**2. Put Arabic first, highlight Arabic (Bilingual section)**
- In `src/components/landing/Bilingual.tsx`, swap card order so the Arabic card renders first, English second
- Update heading translations so "Arabic" is the highlighted (orange `text-pop`) word and comes before "English":
  - EN: "BUILT FOR **ARABIC** & ENGLISH CONVERSATIONS."
  - AR: mirror equivalent with العربية highlighted first
- Update keys `bi.title.a/b/c` in both locales accordingly

**3. Remove latency claims (we don't know the number)**
Remove every "<500ms" / "Under 500ms Latency" / "Ultra-Low Latency" reference:
- `src/lib/i18n.tsx`: drop `hero.pill.latency`, `fs.2.*`, `ben.m2.*` (or replace with a non-numeric equivalent — see question below)
- `src/components/landing/Hero.tsx`: remove the latency pill
- `src/components/landing/FeatureStrip.tsx`: remove the latency feature (grid becomes 3 items) — or replace
- `src/components/landing/Benefits.tsx`: remove the `<500ms` metric card — or replace

## Question before I build

For the two spots where latency was a stat/feature tile (FeatureStrip and Benefits metrics), do you want me to:
- **(a) Just remove them** (FeatureStrip becomes 3 tiles, Benefits metric grid becomes 3 cards), or
- **(b) Replace with a non-numeric equivalent** like "Natural, real-time conversation" / "Human-like Response"?

I'll default to **(a) remove** unless you say otherwise.
