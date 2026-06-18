## Goal
Add a floating "Book a Demo" form that opens from any "Book a demo" CTA, collects lead info, and emails it to **aszadms1@gmail.com**.

## UX
- Reusable `<BookDemoDialog>` modal triggered by every existing "Book a demo" button (Navbar, Hero, FinalCta, etc.) via a shared `BookDemoProvider` + `useBookDemo()` context. Replace current button click handlers with `openBookDemo()`.
- Styled to match the Brandly theme: white/ink panel with `border-hairline`, Archivo Black heading, Inter body, orange `--pop` accent on the submit button (black pill with white arrow on light mode, inverted in dark).
- Fully bilingual (EN/AR) using existing `LocaleProvider`; RTL-aware.

## Form fields
Name, Company, Email, Phone, Preferred date (shadcn date picker), Preferred language (select: EN / AR / Either), Message (textarea).
Validated client-side with **zod** + react-hook-form. Inline errors, loading state, success state, toast on send.

## Email delivery (Lovable Emails)
Prerequisites done in order:
1. Enable **Lovable Cloud**.
2. Configure email domain via `<presentation-open-email-setup>` dialog (user verifies DNS).
3. `email_domain--setup_email_infra` (queue + cron).
4. `email_domain--scaffold_transactional_email` (creates send route + templates).

Then:
- Add React Email template `src/lib/email-templates/demo-request.tsx` rendering all submitted fields in a clean Brandly-styled layout, registered in `registry.ts`.
- Since the form is public (no login), create a dedicated public endpoint `src/routes/api/public/book-demo.ts` that:
  - Validates input with zod
  - Calls the internal send route using the service-role-authenticated path to send to `aszadms1@gmail.com` with `templateName: 'demo-request'` and the form data as `templateData`
  - Returns `{ ok: true }` or a sanitized error
- Frontend POSTs to `/api/public/book-demo`. No data stored in DB (email-only per your choice).

## Files
- New: `src/components/landing/BookDemoDialog.tsx`, `src/lib/book-demo-context.tsx`, `src/lib/email-templates/demo-request.tsx`, `src/routes/api/public/book-demo.ts`
- Edited: `src/routes/__root.tsx` (wrap with `BookDemoProvider`), `src/lib/email-templates/registry.ts`, and all components with "Book a demo" buttons (Navbar, Hero, FinalCta, etc.) to call `openBookDemo()`
- i18n keys added to the existing locale dictionary

## Out of scope
DB storage, calendar booking/availability, SMS, CRM integration, captcha (can add later if spam becomes an issue).

## Note
After approval I'll enable Cloud and trigger the email-domain setup dialog — you'll need to add a couple of DNS records at your registrar before emails actually deliver. The form UI works immediately; sends activate once DNS verifies.
