# KABSA CALL.ai — Reusable Creative Brief Prompt

Copy everything below the line and paste it into any AI builder to recreate this landing page.

---

Build a single-page marketing website for **KABSA CALL.ai**, an AI voice agent that answers customer calls and books, reschedules, or cancels appointments 24/7 in English and Arabic with sub-500ms latency. The audience is clinics, salons, restaurants, and service businesses in the GCC. Tone: confident, premium, editorial — feels like an Apple product page crossed with a Swiss design magazine. No generic SaaS aesthetics, no purple/indigo gradients, no stock hero illustrations.

## Brand identity — "Brandly Editorial"

- **Name / wordmark:** KABSA CALL.ai, set in Archivo Black uppercase with a single orange dot accent.
- **Palette (light):** Paper `#FFFFFF` background, Sand `#F5F4F1` cards, Ink `#0A0A0A` text, Pop `#FF6A1A` single accent color. Muted text `#6B6B6B`. Hairline borders at `rgba(10,10,10,0.08)`.
- **Palette (dark):** Paper `#0B0B0B`, Sand `#161616`, Ink `#F5F4F1`, Pop unchanged `#FF6A1A`. Hairline borders at `rgba(245,244,241,0.10)`.
- **One accent rule:** Orange (`#FF6A1A`) is the only chromatic color. Everything else is monochrome. Use it sparingly — pulse dots, hover states, one or two highlighted words per headline, primary CTA hover.
- **Theme toggle:** Sun/Moon icon in a circular hairline-bordered button in the navbar; persist choice in localStorage; default to system preference.

## Typography

Install via `@fontsource` packages, not Google Fonts CDN.
- **Display / headings:** `Archivo Black` (`@fontsource/archivo-black`), uppercase, letter-spacing `-0.02em`, line-height `0.92–0.95`. Headline sizes use `clamp(3rem, 8vw, 6.5rem)`.
- **Body:** `Inter Variable` (`@fontsource-variable/inter`).
- **Mono / eyebrows:** `JetBrains Mono` — small uppercase labels with `tracking-[0.18em]`.
- **Arabic:** `Tajawal` weights 400/500/700/800, swapped in automatically when `lang="ar"` is active; remove negative letter-spacing for Arabic.

## Layout & structure (single page, anchors only for in-page scroll)

Max content width `max-w-7xl`, generous vertical rhythm (`py-20` to `py-28`). Sections in order:

1. **Fixed navbar** — transparent over hero, switches to `bg-paper/90 backdrop-blur` with hairline border once scrolled past 12px. Left: logo. Center: anchor links (Home, Features, How it Works, Benefits, Pricing, Contact). Right: theme toggle, EN/العربية language pill toggle, primary "Book a Demo" pill button (`bg-ink text-paper`, hover swaps to `bg-pop`). Mobile: hamburger reveals a stacked menu.
2. **Hero** — two-column grid (1.1fr / 0.9fr). Left: mono eyebrow badge with a pulsing orange dot, massive uppercase 3-line headline with one word colored `text-pop`, short subtitle (max-w-md, ink/70), then a pill CTA "Book a Demo" (ink pill with a white circular arrow chip that rotates -12deg on hover) plus a secondary text link "Watch Demo" with a play icon. Right: stylized iPhone mockup showing a live call UI with an animated waveform (CSS `@keyframes waveform` scaling Y between 0.35 and 1 over 1.1s).
3. **Feature strip** — horizontal row of short feature chips on a sand band, mono labels, hairline dividers.
4. **How it Works** — 3 or 4 numbered steps in a clean grid; large numerals in Archivo Black, short copy beneath, a hairline rule above each card.
5. **Benefits** — bento-style asymmetric grid of cards on sand cards with hairline borders; each card has a small icon, a short ALL-CAPS eyebrow, a headline, and supporting copy.
6. **Bilingual showcase** — side-by-side chat/transcript bubbles, one English (Inter) and one Arabic (Tajawal, RTL), proving the agent speaks both natively.
7. **Use cases** — clinic, salon, restaurant, services — card grid with monochrome line icons.
8. **Final CTA** — full-bleed ink band (inverts in dark mode) with a giant headline and the same "Book a Demo" pill, centered.
9. **Footer** — minimal: logo, columns of links, fine-print legal row, language switch echoed, small social icons.

Wrap sections 2–8 in scroll-reveal wrappers with three intensities (soft / medium / strong) that fade and translate up on enter; use `IntersectionObserver`, not a heavy animation library.

## Motion

- Hero text: `fade-up` keyframe (opacity 0→1, translateY 16px→0, 0.7s ease-out).
- Phone waveform bars: infinite `waveform` animation.
- Floating phone shadow: `float-y` 5s ease-in-out infinite.
- Buttons: 200ms `transition-colors`; arrow chip rotates -12deg on group hover.
- Theme switch: instant; no flashy crossfade.

## "Book a Demo" floating dialog

Every "Book a Demo" CTA (navbar, hero, final CTA) opens a centered modal dialog that matches the theme — Paper/Sand background, hairline borders, Archivo Black heading, Pop accent on the submit button. Fields: Full name, Company, Email, Phone, Preferred date (date picker), Preferred language (EN / AR / Either), Message. ESC closes; backdrop click closes; scroll lock while open; success and error states with simple icons. Submissions POST to a server route that emails the lead to the project owner via Resend; no database storage.

## Internationalization

Full EN/AR support via a `useLocale` hook and a flat translation dictionary. Switching to Arabic sets `<html dir="rtl" lang="ar">`, flips icon direction with `rtl:-scale-x-100`, and swaps the heading font to Tajawal. Mirror padding with logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`) — never `pl-*`/`pr-*`.

## SEO

- Title: `KABSA CALL.ai — AI Voice Scheduling, 24/7` (<60 chars).
- Meta description: one sentence about answering calls and booking appointments 24/7 in English and Arabic (<160 chars).
- Open Graph + Twitter card tags with the same copy.
- Single H1 (hero headline), semantic landmarks (`header`, `main`, `footer`, `section` with `id`), alt text on every image, lazy-loaded images, responsive viewport meta.

## Hard rules

- Never use hardcoded color utilities like `text-white`, `bg-black`, `bg-[#...]`. Always go through the semantic tokens (`bg-paper`, `bg-sand`, `bg-ink`, `bg-pop`, `text-ink`, `text-pop`, `border-hairline`).
- Never introduce a second accent color. Orange is the only chromatic hue.
- Never use serif fonts. Never substitute Inter/Poppins for the display font.
- Never use hash anchors as the primary nav between distinct content pages — this site is intentionally single-page, so anchors are correct here.
- Keep the layout breathable: hairline borders over heavy shadows, whitespace over decoration.
