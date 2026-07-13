# NidahAI

Bilingual (Arabic Gulf + English) voice AI for Saudi clinic appointment booking.

**Stack:** Pipecat · Twilio · **Munsit (AR STT+TTS)** · **AWS Transcribe (EN STT) + Polly (EN TTS)** · Bedrock · Supabase · Next.js

---

## AWS setup first

Follow **[docs/AWS_SETUP.md](docs/AWS_SETUP.md)** (Mumbai `ap-south-1`).

You can build and test locally **without AWS** by setting:

```bash
USE_BEDROCK=false
ANTHROPIC_API_KEY=sk-ant-...
```

S3 recordings and Bedrock can be wired later.

---

## Repo layout

```
bot/                 # Pipecat Twilio voice agent
dashboard/           # Next.js staff portal (pending confirmations)
supabase/migrations/ # Postgres schema + RLS
scripts/             # seed_pilot.py
docs/AWS_SETUP.md    # AWS Mumbai guide
```

---

## 1. Supabase (required for dashboard + tools)

1. Create a project at [supabase.com](https://supabase.com) → region **Mumbai (ap-south-1)**
2. SQL Editor → paste and run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
3. Authentication → create user `admin@clinic.com` with a strong password
4. Copy Project URL + `anon` + `service_role` keys into `.env`

```bash
cp .env.example .env
# fill SUPABASE_* and NEXT_PUBLIC_SUPABASE_*
```

5. Seed pilot clinic:

```bash
cd /Users/atheeqsyed/NidahAI
python3 -m venv .venv && source .venv/bin/activate
pip install python-dotenv supabase
python scripts/seed_pilot.py
# copy CLINIC_ID into .env
```

6. Link staff to Auth: in SQL Editor, after Auth user exists:

```sql
update staff_users
set auth_user_id = (select id from auth.users where email = 'admin@clinic.com')
where email = 'admin@clinic.com';
```

Enable Realtime for `appointments` (Database → Replication → add `appointments`).

---

## 2. Voice bot (local)

```bash
cd bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# includes pipecat-ai[aws] + pipecat-plugins-munsit
```

Fill at least:

```bash
MUNSIT_API_KEY=             # Arabic STT + TTS
MUNSIT_VOICE_ID=ar-hijazi-female-2
STT_DEFAULT_LANG=ar
# AWS keys already in .env — Transcribe (EN STT) + Polly (EN TTS)
POLLY_VOICE_EN=Joanna
POLLY_ENGINE=neural
USE_BEDROCK=true
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
CLINIC_ID=
```

Run with Twilio transport (needs ngrok):

```bash
# Terminal 1
ngrok http 7860

# Terminal 2
cd bot && source ../.venv/bin/activate
python bot.py --transport twilio
```

Point your Twilio number's Voice webhook / TwiML Stream to the ngrok WebSocket URL from the Pipecat runner output.

**Without Twilio yet:** you can still develop tools + dashboard against Supabase.

---

## 3. Staff dashboard

```bash
cd dashboard
cp ../.env.example .env.local
# set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000 → login → **Pending confirmations** is the home screen.

---

## Other accounts (non-AWS)

| Service | Why |
|---------|-----|
| [Munsit](https://app.munsit.com) | Gulf Arabic STT + TTS |
| **AWS Transcribe** | English STT |
| **AWS Polly** | English TTS |
| [Twilio](https://twilio.com) | Saudi phone number + Media Streams |

---

## Product defaults

- After-hours voice booking → `pending_confirmation`
- Staff must confirm before patient is notified (notification = Phase 2)
- Emergency / human-request keywords escalate without relying on the LLM
- Max 15 turns → callback queue escalation
