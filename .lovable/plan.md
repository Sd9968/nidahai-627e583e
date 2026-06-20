Rebrand the site from **KABSA CALL.ai** to **Yaran.ai** across all visible copy and metadata.

### Files to update

1. **`src/components/landing/Logo.tsx`** — change wordmark from "KABSA CALL" + ".ai" to "Yaran" + ".ai".
2. **`src/components/landing/PhoneMockup.tsx`** — change screen label from "KABSA CALL.ai" to "Yaran.ai".
3. **`src/components/landing/FinalCta.tsx`** — update email domain from `hello@kabsacall.ai` to `hello@yaran.ai`.
4. **`src/components/landing/Footer.tsx`** — update copyright line from "KABSA CALL.ai" to "Yaran.ai".
5. **`src/lib/i18n.tsx`** — update all EN and AR translation strings containing "KABSA CALL.ai" to "Yaran.ai".
6. **`src/routes/__root.tsx`** — update `<title>`, meta description, author, and `og:title` tags.
7. **`src/routes/index.tsx`** — update `<title>` and `og:title` / `og:description` meta tags.
8. **`src/routes/api/public/book-demo.ts`** — update `FROM_EMAIL` display name and email body branding from "KABSA CALL.ai" to "Yaran.ai", and update the footer domain reference from `kabsacall.ai` to `yaran.ai`.
9. **`.lovable/plan.md`** — update the creative brief header and all mentions of the old brand name.

### Not included (unless requested)
- Internal localStorage keys (`kabsa-theme`, `kabsa-locale`) — these are invisible to users and can stay as-is or be updated for consistency.
- Any actual domain / DNS / email setup — only the hardcoded strings in code will change.