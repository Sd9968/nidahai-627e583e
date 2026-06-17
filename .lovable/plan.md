
# KABSA CALL.ai Landing Page

A single-route premium landing page on `/` with the exact 9 sections from the brief. Editorial-meets-SaaS feel: dark Deep Fir hero, warm cream body sections, lime accents used sparingly.

## Design system (src/styles.css)

Replace the default shadcn tokens with the brief's palette as semantic tokens (all oklch-converted, mapped via `@theme inline`):

- `--background` → Deep Fir `#001E17`
- `--secondary` → `#062F24`
- `--primary` (lime accent) → `#C8F25D`
- `--card` / soft surface → `#F7F6EF`
- `--foreground` light → `#FFFFFF`, dark text `#10241C`
- `--muted-foreground` → `#B8C9BF`
- `--border` → lime at 25% alpha

Add custom tokens: `--gradient-fir`, `--shadow-soft`, `--shadow-lime-glow`, `--radius` bumped to `1.25rem` for soft cards.

**Typography** loaded via `<link>` in `src/routes/__root.tsx` head, not `@import`:
- Headings: **Fraunces** (editorial serif, slight optical sizing)
- Body: **Inter Tight** (clean modern sans)
- Arabic: **IBM Plex Sans Arabic** for the bilingual cards

Register as `--font-display`, `--font-sans`, `--font-arabic` in `@theme`.

## Route + components

Single page at `src/routes/index.tsx` with proper SEO `head()` (title, description, OG). Sections split into focused components under `src/components/landing/`:

```
src/components/landing/
  Navbar.tsx
  Hero.tsx              // includes PhoneMockup subcomponent
  FeatureStrip.tsx
  HowItWorks.tsx
  Benefits.tsx
  Bilingual.tsx
  UseCases.tsx
  FinalCta.tsx
  Footer.tsx
```

Hero phone mockup is built in pure JSX/CSS (rounded device frame, status bar, "Listening…" with animated waveform bars, call duration timer-styled, mic/end/speaker buttons using lucide icons). Floating chat bubbles in EN + AR positioned around the phone with subtle shadows and lime borders.

Icons from `lucide-react`: Phone, PhoneCall, Mic, Volume2, Calendar, Bell, Clock, Globe, Sparkles, Stethoscope, Scissors, Wrench, Briefcase, Home, Store.

## Section specifics

1. **Navbar** — sticky, transparent over hero then frosted on scroll. Logo wordmark "KABSA CALL`.ai`" (`.ai` in lime). Nav links anchor to section IDs. EN/العربية switch is a visual toggle (no i18n wiring — easy to extend later). Primary CTA "Book a Demo" in lime.

2. **Hero** — 2-col grid (stacks on mobile). Left: eyebrow "AI Voice Agent", serif headline "AI Voice Scheduling, 24/7.", subhead, 4 feature pills, two CTAs (lime primary, ghost outline). Right: phone mockup + floating bubbles.

3. **Feature strip** — single rounded card overlapping hero/cream boundary, 4 columns with icon + label + one-line value.

4. **How It Works** — cream background, 4 steps in a row with connecting dashed line, numbered circles in lime, serif step titles.

5. **Benefits** — split: left bullet list with lime check icons, right 2×2 metric cards (`24/7`, `<500ms`, `100%`, `∞`) with serif numerals.

6. **Bilingual** — two side-by-side quote cards. Arabic card uses `dir="rtl"` and the Arabic font, lime accent quote mark.

7. **Use cases** — 6 cards in a responsive 3-col grid, each with icon, business type, 1–2 sentence description.

8. **Final CTA** — full-width Deep Fir band with subtle radial lime glow, serif headline, two buttons.

9. **Footer** — Deep Fir, 4 columns (brand+desc, Product, Company, Support) + bottom row with EN/العربية switch and copyright.

All sections use generous vertical padding (`py-24 md:py-32`), max-width container `max-w-6xl`, and rounded-2xl/3xl cards with `--shadow-soft`.

## Responsive + polish

- Mobile-first: hero stacks, phone mockup scales down, feature strip becomes 2×2, nav collapses to a sheet menu (shadcn Sheet) with hamburger.
- Subtle Motion: framer-motion fade/translate on section enter, waveform pulse in phone mockup, lime button hover lift. No heavy animations.
- Semantic HTML: single `<h1>` in hero, section landmarks, alt text, `lang` attributes on Arabic text.

## Out of scope (for this turn)

- Real i18n / RTL flipping of the whole page (toggle is visual only)
- Backend, form handling, video demo
- Real images (phone mockup is pure CSS; no stock photos needed)

Easy to customize later: all colors, fonts, and shadows are tokens in `src/styles.css`; copy lives inline in each section component.
