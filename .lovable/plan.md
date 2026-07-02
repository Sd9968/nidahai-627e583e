Rebrand the site from **Yaran Arabia.ai** to **NidahAI** across all visible copy and metadata.

### Files to update

1. **`src/components/landing/Logo.tsx`** — change wordmark from "Yaran Arabia" + ".ai" to "Nidah" + "AI".
2. **`src/components/landing/PhoneMockup.tsx`** — change screen label from "Yaran Arabia.ai" to "NidahAI".
3. **`src/components/landing/FinalCta.tsx`** — update email domain from `hello@yaranarabia.ai` to `hello@nidah.ai`.
4. **`src/components/landing/Footer.tsx`** — update copyright line from "Yaran Arabia.ai" to "NidahAI".
5. **`src/components/landing/Marquee.tsx`** — update the brand keyword from "Yaran Arabia.ai" to "NidahAI".
6. **`src/lib/i18n.tsx`** — update all EN and AR translation strings containing "Yaran Arabia.ai" to "NidahAI".
7. **`src/routes/__root.tsx`** — update `<title>`, meta description, author, `og:title`, `og:description`, `twitter:title`, and `twitter:description` tags.
8. **`src/routes/index.tsx`** — update `<title>` and `og:title` / `og:description` meta tags.
9. **`src/routes/api/public/book-demo.ts`** — update `FROM_EMAIL` display name, email body branding, and footer domain reference from "Yaran Arabia.ai" / `yaranarabia.ai` to "NidahAI" / `nidah.ai`.
10. **`.lovable/plan.md`** — update the creative brief header and all mentions of the old brand name.

### Not included (unless requested)
- Internal localStorage keys (`kabsa-theme`, `kabsa-locale`) — these are invisible to users and can stay as-is or be updated for consistency.
- Any actual domain / DNS / email setup — only the hardcoded strings in code will change.
