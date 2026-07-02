Add a new "Coming Soon / Launching Soon" section to the current NidahAI landing page, styled to match the existing Brandly editorial monochrome + orange theme.

### What will be built

1. **New component** `src/components/landing/ComingSoon.tsx`
   - Full-width section with a dark background (`bg-ink`) so it breaks up the page rhythm between `Bilingual` and `FinalCta`.
   - Bilingual headline with **Arabic first**: large Arabic word "قريباً" highlighted in `text-pop`, followed by English "Launching Soon" in `font-display`.
   - A short supporting sentence in both languages explaining the product launch.
   - A single, simple action: a CTA button that opens the existing **Book a Demo** dialog (`useBookDemo` context), so visitors can request early access without adding a new backend flow.
   - A small pulsing orange dot / waveform accent to tie in the phone/audio theme.

2. **Placement in `src/routes/index.tsx`**
   - Insert `<ScrollReveal intensity="medium"><ComingSoon /></ScrollReveal>` between the `Bilingual` and `FinalCta` sections.

3. **i18n updates** in `src/lib/i18n.tsx`
   - Add new keys for both `en` and `ar` dictionaries:
     - `coming.eyebrow`
     - `coming.title.a` (Arabic word / "Launching")
     - `coming.title.b` (highlighted "قريباً" / "Soon")
     - `coming.subtitle`
     - `coming.cta` ("Get early access" / "احصل على وصول مبكر")
   - Arabic text will be written and placed first, mirroring the current `Bilingual.tsx` pattern.

4. **Responsive + theme-safe details**
   - Use logical Tailwind spacing (`pe-*`, `ps-*`) so Arabic RTL layout stays correct.
   - Use only semantic tokens (`bg-ink`, `text-paper`, `text-pop`, `border-hairline-light`) so the section automatically adapts to light/dark mode toggles.
   - The section will collapse gracefully on mobile with the Arabic headline first, English below, and a full-width CTA.

### Out of scope

- No new backend/email endpoint. The section will reuse the existing `BookDemoDialog` and Resend flow.
- No countdown timer or fixed launch date unless you ask for one later.