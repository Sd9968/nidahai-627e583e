## Apply "Brandly" Editorial Theme

Re-skin the landing to match the reference: crisp white background, oversized ultra-bold black condensed display headings, refined body text, minimal nav, black pill CTAs with a small circular arrow icon.

### Typography
- Add **Archivo Black** (display, ultra-heavy) and keep **Inter** (body); drop Space Grotesk as display.
  - `--font-display: "Archivo Black"` — used for all H1/H2/H3
  - `--font-sans: "Inter"` — body, nav, labels
  - Arabic stays **Tajawal** (heavier weights for headings)
- Heading scale (tight tracking, uppercase on hero):
  - H1: `clamp(3.5rem, 8vw, 6.5rem)`, leading-[0.95], tracking-tight, uppercase
  - H2 section: `clamp(2.25rem, 5vw, 4rem)`, uppercase
  - H3: `1.5rem` bold
- Body: 1rem / 1.6, `text-foreground/70` for secondary

### Color palette (replace Warm Editorial)
- `--background: #FFFFFF` (pure white)
- `--foreground: #0A0A0A` (near-black)
- `--card: #F5F4F1` (subtle off-white card)
- `--muted-foreground: #6B6B6B`
- `--primary: #0A0A0A` (black) / `--primary-foreground: #FFFFFF`
- `--accent: #FF6A1A` (single orange pop, used sparingly like the helmet visor)
- `--border: rgba(10,10,10,0.08)`
- Remove clay/espresso/cream gradients; replace with flat white + thin hairline borders

### Component updates
- **Navbar**: transparent on white, black wordmark left, centered text links (About, Features, Pricing, FAQ, Help mapping → existing keys), right side Sign Up (ghost) + Login (black pill). Underline on hover, no background blur.
- **Hero**: left column oversized uppercase H1 in three stacked lines, short subhead, **black pill CTA** with white circular arrow icon (`ArrowRight` inside a white circle). Right column keeps PhoneMockup but on white with soft shadow only (no dark gradient panel). Two stat blocks ("50+ ...", "5+ ...") top-right and bottom-right, uppercase bold + small body.
- **Sections** (HowItWorks, Benefits, UseCases, FeatureStrip, Bilingual): all white background, uppercase H2, generous whitespace, hairline borders instead of filled dark cards. Orange accent only on key numerals/icons.
- **FinalCta**: invert — solid black panel, white uppercase headline, white pill button with black arrow.
- **Footer**: white, black text, simple row of brand chips (like "Frame Blox / Supa Blox …" strip) — repurpose as trust/feature row.
- **PhoneMockup**: light frame (white bezel, light gray screen, black text) to fit the bright theme.

### Files to edit
- `src/styles.css` — fonts import (`@fontsource/archivo-black`), tokens, utility remap
- `src/components/landing/Navbar.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/Benefits.tsx`
- `src/components/landing/UseCases.tsx`
- `src/components/landing/FeatureStrip.tsx`
- `src/components/landing/Bilingual.tsx`
- `src/components/landing/FinalCta.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/PhoneMockup.tsx`
- `package.json` — add `@fontsource/archivo-black`

### Out of scope
- Copy/content changes, i18n keys, layout structure beyond what's listed, new sections, swapping the mockup for the helmet photo.
