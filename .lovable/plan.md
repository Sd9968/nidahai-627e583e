## Goal
Let visitors click the phone mockup and talk to your Twilio-hosted AI voice agent directly in the browser — no dialer, no phone bill for the visitor. On mobile we also offer a "Call instead" fallback that opens the dialer to `+1 620 670 8352`.

## How it works (technical)

Twilio has no "call a number from the browser" one-liner. The standard path is **Twilio Voice JavaScript SDK (`@twilio/voice-sdk`)**, which needs three server-side pieces:

1. **Access Token endpoint** — mints a short-lived JWT using your Twilio API Key + Secret so the browser can register as a Voice client.
2. **TwiML endpoint** — Twilio hits this when the browser client dials out; it returns `<Response><Dial><Number>+16206708352</Number></Dial></Response>` to bridge the browser to your AI agent's number.
3. **TwiML App** — a Twilio-side config object whose "Voice Request URL" points at the TwiML endpoint above. Its SID goes into the access token.

Browser flow: page loads → fetch token → `new Device(token)` → user clicks phone → `device.connect()` → Twilio calls the TwiML URL → bridges to the AI agent → two-way audio in the browser.

## What I need from you (one-time Twilio setup)

You'll do this in the Twilio Console; I can't do it for you:

1. **Create an API Key** (Console → Account → API keys & tokens → Create API Key, Standard). Save the **SID** and **Secret** — Secret is shown only once.
2. **Create a TwiML App** (Console → Voice → TwiML → TwiML Apps → Create). Set the Voice **Request URL** to `https://nidahai.com/api/public/twiml-voice` (POST). Save the **App SID**.
3. Have your **Account SID** ready.

Then I'll request these as secrets via the secrets form: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_TWIML_APP_SID`, `TWILIO_AGENT_NUMBER` (defaults to `+16206708352`).

Cost: each browser call is billed to your Twilio account as an outbound call to `+1 620 670 8352` at Twilio's US rate (~$0.014/min) plus the AI agent's own per-minute cost.

## Files to add/change

1. **`src/routes/api/public/twilio-token.ts`** — POST returns `{ token }`. Uses `twilio` npm package's `AccessToken` + `VoiceGrant`. 1-hour TTL, random identity.
2. **`src/routes/api/public/twiml-voice.ts`** — POST returns `text/xml` TwiML that dials `TWILIO_AGENT_NUMBER`. Public endpoint; validate Twilio signature (`X-Twilio-Signature`) using the auth token so randos can't hit it.
3. **`src/lib/twilio-call.ts`** — thin client hook `useTwilioCall()` that lazy-loads `@twilio/voice-sdk`, fetches the token, manages `Device` lifecycle, exposes `{ status, start, hangup, mute, isMuted }` where `status` is `idle | connecting | ringing | in-call | ended | error`.
4. **`src/components/landing/PhoneMockup.tsx`** — wire the hook: mic permission on click, animate the "Listening…" pill / waveform only during `in-call`, make the red end button call `hangup()`, mic button toggle mute. Show live call timer instead of the static `00:42`. On mobile (`useIsMobile`), the primary CTA becomes a `tel:+16206708352` link with an inline "Call in browser" secondary option.
5. **`package.json`** — add `@twilio/voice-sdk` (client) and `twilio` (server, for token signing + signature validation).
6. **i18n keys** in `src/lib/i18n.tsx` — `phone.tap`, `phone.connecting`, `phone.mic.blocked`, `phone.error`, `phone.hangup`, EN + AR.

## Security & guardrails
- Token endpoint is public but rate-limited by identity randomness + 1-hour TTL; no PII in the token.
- TwiML endpoint verifies `X-Twilio-Signature` against `AuthToken` — reject on mismatch (401).
- `TWILIO_AGENT_NUMBER` lives only server-side; browser never sees the destination.
- Recommend you enable **Voice Geo Permissions** (allow only the countries you actually serve) in Twilio Console to blunt toll fraud.

## Out of scope for this pass
- Call recording / transcripts panel in the UI.
- Queueing / hold music if the agent is busy.
- Auth-gated calls (anyone on the site can start one — matches the "click phone to call" UX you asked for).

## Ready to build?
On approval I'll: create the two API routes, add the hook + wire the mockup, install packages, then open the secrets form for the five Twilio values. Once you paste them, the browser-call button goes live.