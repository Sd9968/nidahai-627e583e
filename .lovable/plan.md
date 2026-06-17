# Fonts + Full Arabic Toggle

## 1. Fonts

Install via fontsource (no remote `<link>`s):

- `@fontsource/space-grotesk` → `--font-display` (headings, techy geometric)
- `@fontsource-variable/inter` → `--font-sans` (body)
- `@fontsource/tajawal` → `--font-arabic` (used automatically when locale is `ar`)
- Keep `@fontsource/jetbrains-mono` for small techy accents (pill labels, "Under 500ms latency", call timer in phone mockup) to push the techy vibe.

Update `src/styles.css` `@theme`:
- `--font-display: "Space Grotesk", sans-serif`
- `--font-sans: "Inter Variable", "Inter", sans-serif`
- `--font-arabic: "Tajawal", sans-serif`
- `--font-mono: "JetBrains Mono", monospace`

Imports go in `src/main.tsx` (or router entry). Remove old Fraunces / Inter Tight / IBM Plex Arabic references in `__root.tsx` head links and `styles.css`.

## 2. Full Arabic translation on toggle

Lightweight in-app i18n (no library, no separate route) — toggle swaps every string and font family.

**New file: `src/lib/i18n.tsx`**
- `type Locale = "en" | "ar"`
- React context `LocaleContext` + `useLocale()` hook returning `{ locale, setLocale, t, dir }`
- `t(key)` looks up from a single `translations` object: `{ en: {...}, ar: {...} }`
- Persist choice in `localStorage` ("kabsa-locale")
- On change: set `document.documentElement.lang` and `dir` (`rtl` for ar, `ltr` for en), and toggle a `font-arabic` class on `<body>` so Tajawal applies globally for Arabic.

**Wrap app** in `src/routes/__root.tsx` with `<LocaleProvider>` inside `RootComponent`.

**Translation keys** — one entry per visible string across:
`Navbar`, `Hero` (headline, subhead, CTAs, feature pills, phone mockup bubbles + caller name + "Incoming call…" + timer label), `FeatureStrip`, `HowItWorks` (step titles + descriptions), `Benefits` (card titles + bodies), `Bilingual` (now becomes "Languages" with sample dialogue in both), `UseCases` (industry names + taglines), `FinalCta`, `Footer`.

Every component imports `useLocale()` and replaces hardcoded strings with `t("hero.headline")` etc. No layout changes.

**Navbar switch**: existing EN/AR pill calls `setLocale(...)`. Active state highlighted in lime.

**RTL handling**: Setting `dir="rtl"` on `<html>` makes Tailwind's logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) flip automatically. Audit current components and swap any directional `ml-*` / `mr-*` / `left-*` / `right-*` / `text-left` / `text-right` to logical equivalents so the layout mirrors correctly in Arabic. Flex rows stay (CSS flips them under `dir=rtl`). Icons that imply direction (arrows in CTAs / "How it works" chevrons) get a `rtl:-scale-x-100` utility.

## 3. Files touched

- new: `src/lib/i18n.tsx`
- edit: `src/main.tsx` (fontsource imports), `src/styles.css` (`@theme` fonts + remove old @theme font tokens), `src/routes/__root.tsx` (drop Google Font links, wrap with `LocaleProvider`)
- edit: every component in `src/components/landing/*` to consume `t()` and use logical spacing utilities

## Out of scope

- Color overhaul (you said you'll revisit colors separately)
- URL-based locale (`/ar`) or SEO hreflang — toggle stays client-side per your request
- Backend / translation service — strings are hand-written in `i18n.tsx`
