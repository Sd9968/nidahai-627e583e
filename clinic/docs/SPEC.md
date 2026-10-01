# NidahAI — Technical Spec

Bilingual (Gulf Arabic + English) voice receptionist for a Saudi medical clinic,
plus a staff CRM. Callers phone a Twilio number, talk to an LLM agent, and it
books/reschedules/cancels appointments autonomously — no staff confirmation
step. Patients get a WhatsApp confirmation and can reply to it.

Written as context for someone (or something) picking this up cold. It documents
what the code **is**, not what it should be, and it is blunt about what is
broken. Verified against the tree at the time of writing — check `git log` for
drift.

---

## 1. Architecture

```
PSTN ──> Twilio ──> ngrok ──> bot :7860  ─┐
                                          │  Pipecat pipeline
browser ─────────> bot :7861 (WebRTC)  ───┤
                                          ▼
        transport.input ─> STT ─> language_gate ─> safety ─> user_aggregator
                                                                  │
                                                                  ▼
                                                                 LLM ──> tools ──> Supabase
                                                                  │
                                                       TTS <──────┘
                                                        │
                                            transport.output ──> caller

WhatsApp ──> Twilio ──> POST /whatsapp (same bot server) ──> LLM assistant ──> Supabase
Staff ─────> Next.js CRM (:3000 / Vercel) ──────────────────> Supabase (RLS)
```

**One process serves one transport.** `-t twilio` and `-t webrtc` are mutually
exclusive, hence two instances on different ports.

### Stack
| Concern | Choice | Notes |
|---|---|---|
| Orchestration | **Pipecat 1.5** | `pipecat.runner.run` owns the FastAPI app |
| Telephony | **Twilio** Media Streams | 8 kHz μ-law, WebSocket |
| STT | **AWS Transcribe** streaming | ap-south-1, **monolingual per stream** |
| LLM | **Bedrock Claude Haiku 4.5** | `global.anthropic.claude-haiku-4-5-20251001-v1:0` |
| TTS | **AWS Polly** (Joanna EN / Hala AR) | batch; Munsit optional for AR |
| DB/Auth | **Supabase** (Postgres + RLS) | `tvzaiczjbmqaxzdzwret` |
| CRM | **Next.js 14** App Router | Vercel: `nidahai-crm.vercel.app` |
| Messaging | **Twilio WhatsApp** (sandbox) | |

---

## 2. Files

### `bot/`
| File | Role |
|---|---|
| `bot.py` | Entry point. Builds the pipeline, wires transports, registers `POST /whatsapp` on the runner's FastAPI app, speaks the greeting on connect. |
| `instructions.py` | **All caller-facing text + the system prompt.** `build_greeting()`, `build_system_prompt()`, `CONSENT`, `CLARIFY_RETRY`. Edit here to change how the bot talks. |
| `language_gate.py` | Holds transcripts back until the caller picks a language, then re-points STT and speaks consent in that language. |
| `stt_router.py` | Builds the Transcribe service. **8 kHz** to match Twilio. |
| `tts_router.py` | `BilingualTTSService` — splits text by script, Arabic→Munsit/Polly, English→Polly. Emits 8 kHz. |
| `tools.py` | The 8 LLM tools + Supabase access + phone/date normalization. |
| `messaging.py` | WhatsApp: outbound confirmation, inbound LLM assistant with its own tools + memory. |
| `call_logger.py` | Writes `calls` / `conversation_turns`; uploads recordings to S3. |
| `safety.py` | Pre-LLM regex checks: emergencies, human requests, turn cap. |

### `dashboard/` (Next.js)
`app/` — `page.tsx` (overview), `analytics`, `pipeline`, `bookings`, `calls`,
`calls/[id]`, `patients`, `integrations`, `settings`, `login`,
`api/recordings/[id]` (signed S3 URLs).
`lib/` — `supabase/{client,server}.ts`, `format.ts` (**Riyadh time**),
`use-clinic.ts`, `use-custom-fields.ts`, `integrations-catalog.ts`.
`middleware.ts` — auth guard; redirects to `/login`.

---

## 3. LLM tools (`bot/tools.py`)

| Tool | Notes |
|---|---|
| `search_patient` | By phone **or** Patient ID (`P####`). Matches on the **last 9 digits**, not exact string. |
| `get_available_slots` | Requires absolute `YYYY-MM-DD`. Returns doctor availability windows. |
| `book_appointment` | **Books AND confirms immediately.** Conflict-guarded → `slot_taken`. Returns `booking_id`/`patient_id`. Fires the WhatsApp confirmation. |
| `reschedule_appointment` | By id or `B####`. Conflict-guarded. |
| `cancel_appointment` | By id or `B####`. |
| `get_patient_appointments` | By phone / id / `P####`. |
| `get_clinic_info` | `hours \| location \| doctors \| services \| all`. |
| `escalate_to_human` | Writes `escalations`. |

**Reference codes:** `patients.ref_code` = `P####` (static), `appointments.ref_code`
= `B####` (per booking). Assigned by DB trigger, spoken to the caller, and
accepted back as `patient_ref` / `appointment_ref`.

---

## 4. Database (Supabase)

`clinics, doctors, doctor_availability, patients, appointments, calls,
conversation_turns, escalations, staff_users, audit_log, prayer_times,
integrations, leads, pipeline_stages, custom_field_defs, saved_views, wa_messages`

**RLS**: every table is clinic-scoped via `public.staff_clinic_id()`. That
function **must stay `SECURITY DEFINER`** — it reads `staff_users`, and the RLS
policy on `staff_users` calls it, so invoker-rights caused infinite recursion
("stack depth limit exceeded") that broke *every* dashboard query. See
`002_fix_staff_clinic_id_recursion.sql`. The bot uses the **service-role** key
and bypasses RLS entirely.

Migrations `001`–`005` are applied to the live DB.

---

## 5. Conventions that matter

- **Timezone**: appointments stored UTC, always *displayed/spoken* in
  **Asia/Riyadh**. `tools._normalize_scheduled_at` anchors naive datetimes to
  Riyadh before insert (a naive "4 PM" was being read as UTC → booked 3h late).
  The CRM uses `lib/format.ts`, never the browser's timezone.
- **Phone numbers**: normalize with `tools.clean_phone` (E.164, no separators);
  look up with `tools.phone_tail` (last 9 digits). Callers say numbers loosely
  and the model passes them verbatim.
- **Dates**: the model gets the current Riyadh date in the system prompt. Without
  it, it invents dates ~18 months off.
- **Language**: whatever the caller picks, everything — greeting, prompt, STT —
  must agree. See §7.

---

## 6. Running it

```bash
# 1 tunnel (must be first; Twilio's entrypoint)
ngrok http 7860 --url empaistic-nonsubtilely-sienna.ngrok-free.dev

# 2 phone bot
cd bot && source ../.venv/bin/activate
python bot.py -t twilio -x empaistic-nonsubtilely-sienna.ngrok-free.dev

# 3 browser bot (optional; Playground + live latency Metrics tab)
python bot.py -t webrtc --port 7861          # http://localhost:7861/client/

# 4 CRM
cd dashboard && npm run dev                  # http://localhost:3000
```
Log latency with `> bot.log 2>&1`, then `grep -E "TTFB:" bot.log`.

Twilio's number webhook → `https://<ngrok-domain>/`.
WhatsApp sandbox "when a message comes in" → `https://<ngrok-domain>/whatsapp`.

Config lives in `.env` (bot) and `dashboard/.env.local`; see `.env.example`.
Key knobs: `STT_DEFAULT_LANG`, `LLM_MAX_TOKENS`, `TTS_AGGREGATION`,
`BEDROCK_LATENCY`, `CLINIC_NAME_EN/AR`, `WHATSAPP_CONFIRMATIONS`.

---

## 7. Known problems (read before changing anything)

### Arabic input is not really supported
Transcribe is **monolingual per stream**. The language menu re-points STT at
`ar-AE` (verified: **ar-AE and ar-SA both accept 8 kHz** — the old code comment
claiming otherwise was wrong), but *detecting* the choice still happens on an
`en-US` stream, so an Arabic speaker saying "عربي" comes back as mangled Latin.
`language_gate` matches a generous list of spellings and re-prompts rather than
guessing; after 2 failures it defaults to `DEFAULT_LANG`.

The previous gate inferred language from the **script** of the transcript —
always Latin under `en-US` — so it *always* chose English and Arabic was
unreachable. Do not reintroduce that.

Real fix: Transcribe `IdentifyLanguage` (**not exposed by pipecat's service** —
`get_presigned_url` hardcodes a single `language_code`; needs a subclass), or an
STT that returns a language code.

### Latency ≈ 3.3s per turn
Measured end-of-turn → first audio, 10 turns:

| Segment | Median | Share |
|---|---|---|
| STT finalization | 1.70s | **52%** |
| LLM first token | 0.97s | 30% |
| TTS first audio | 0.49s | 15% |

Do **not** measure this by summing TTFBs — STT streams *while the caller talks*,
so its TTFB overlaps speech and inflates the total. Use the event timestamps.

Untried levers, best first: pipecat hardcodes
`partial_results_stability="high"` (`aws/stt.py`) — subclass to lower it, or act
on the stabilized partial instead of the final; **prompt is 4.1–5.5k tokens**
every turn (trim it, or use Bedrock prompt caching); streaming TTS (~150ms).

### WhatsApp: the 24-hour window
Free-form messages fail with **63016** outside 24h of the patient's last inbound
message. A caller who books *by phone* never messaged you — so production needs
an **approved template** (`ContentSid`), not `Body`. In the sandbox, testers must
send anything to `+1 415 523 8886` to open the window, and re-join every 3 days.

### Smaller ones
- **One number ↔ many patients is legitimate** (a son booking for his parents).
  Don't "de-duplicate" by phone. The WhatsApp assistant loads *all* patients on a
  number and asks which one.
- Call **recording upload** polls Twilio at hangup and can add ~28s to teardown;
  a `recordingStatusCallback` webhook would be the right design.
- The Vercel CRM is **not connected to GitHub** — it was deployed by file upload,
  so pushes do **not** auto-deploy. `NEXT_PUBLIC_*` are baked into a
  `.env.production` in that upload; AWS creds are absent, so `/api/recordings`
  returns 503.
- `next build` type-checks. Dev does not. Run it before deploying.
- Custom pipecat services must override `can_generate_metrics()` → `True`, or
  their TTFB metrics are silently dropped (this hid TTS latency entirely).
