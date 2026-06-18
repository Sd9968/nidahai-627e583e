# Warm Editorial Recolor + Refined Scroll Motion

Shift the entire site from the current dark fir-green/lime palette to a warm editorial palette. Keep all layout, fonts (Space Grotesk + Inter + Tajawal), copy, and i18n exactly as they are.

## New palette

| Token       | Value     | Use                              |
| ----------- | --------- | -------------------------------- |
| `--cream`   | `#FAF8F5` | Page background                  |
| `--sand`    | `#F0EBE3` | Card / alternating section bg    |
| `--espresso`| `#2D1B0E` | Primary text, dark sections, CTA |
| `--mocha`   | `#4A3422` | Secondary text, borders          |
| `--clay`    | `#C4654A` | Accent — buttons, highlights, waveform, badges |
| `--clay-soft`| `#E8B8A8`| Soft tint, hover, glow           |

Semantic mapping (in `src/styles.css`):
- `--background: cream`, `--foreground: espresso`
- `--primary: clay`, `--primary-foreground: cream`
- `--card: sand`, `--secondary: espresso` (for the one dark "Final CTA" band)
- `--muted-foreground: mocha`
- `--border: espresso @ 12%`
- Replace `--gradient-fir` with `--gradient-warm` (radial cream → sand) and a new `--gradient-dark-warm` (espresso → mocha) for the single dark section
- Replace `--shadow-lime` with `--shadow-clay` (warm tinted shadow)

## Component sweep

Find/replace utility classes across all 11 landing components:
- `bg-fir` / `bg-fir-deep` / `bg-fir-2` → `bg-cream` / `bg-sand` / `bg-espresso` as appropriate per section
- `text-lime` → `text-clay`
- `bg-lime` → `bg-clay`, `text-fir` (on lime buttons) → `text-cream`
- `border-lime-soft` → `border-espresso/10`
- Hero gradient swapped to warm cream gradient; lime glow blob → soft clay glow
- Page wrapper in `src/routes/index.tsx`: `bg-fir text-foreground` → `bg-cream text-foreground`
- One section (FinalCta) stays dark espresso for contrast — flips to cream text + clay CTA

## Scroll motion refresh

Current `ScrollReveal` uses simple fade. Upgrade to a more refined Gen-Z editorial feel without going chaotic:
- **Stagger**: section children fade + translate-up sequentially (60ms apart) instead of all together
- **Blur-in**: add `filter: blur(8px) → blur(0)` to reveal — softer, more premium
- **Scale**: subtle 0.97 → 1 on enter
- **Exit on scroll-up**: keep reverse behavior (reverts when scrolling up), tuned with shorter duration
- **Parallax accent**: hero phone mockup + section heading get a light translateY parallax on scroll (1.0× content, 0.85× heading)
- All driven by Framer Motion already installed — no new deps

Out of scope: layout changes, copy edits, font swaps, new sections, color overrides per-component beyond the token sweep above.

## Files touched

- `src/styles.css` — palette tokens, semantic mapping, gradient + shadow utilities
- `src/routes/index.tsx` — wrapper bg class
- `src/components/landing/ScrollReveal.tsx` — upgraded motion variants
- `src/components/landing/*.tsx` (Hero, Navbar, FeatureStrip, HowItWorks, Benefits, Bilingual, UseCases, FinalCta, Footer, PhoneMockup, Logo) — class swaps only
