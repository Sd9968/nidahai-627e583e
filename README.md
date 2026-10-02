# NidahAI

One repository for the public website, browser calling, bilingual voice agent,
clinic staff dashboard, and clinic database migrations.

The website stays at the repository root so the existing Lovable project and
nidahai.com build continue to use the same entry point.

| Component | Location | Runtime |
| --- | --- | --- |
| Website and Twilio browser-call API | `src/`, `public/` | TanStack Start / Lovable |
| Voice agent | `clinic/bot/` | Python / Pipecat |
| Staff dashboard | `clinic/dashboard/` | Next.js |
| Clinic schema | `clinic/supabase/migrations/` | Supabase Postgres |
| Clinic setup utilities and documentation | `clinic/scripts/`, `clinic/docs/` | Python / shell |

## Local setup

Use Node.js 22.12+ and Python 3.12. From this repository's root:

```sh
npm ci
npm run install:dashboard
python3.12 -m venv clinic/.venv
clinic/.venv/bin/python -m pip install -r clinic/bot/requirements.txt
```

Configure each service separately:

- Website: use `.env.example` as the variable reference. Preserve the existing
  Lovable website environment; put local additions in `.env.local` or exported
  server environment variables. Configure production server secrets in Lovable.
- Voice agent: copy `clinic/.env.example` to `clinic/.env` and fill its service
  credentials and clinic ID.
- Dashboard: copy `clinic/dashboard/.env.example` to
  `clinic/dashboard/.env.local` and fill the clinic project's public credentials.

The landing website's Supabase integration and the clinic database may be
separate projects. Consolidating source code does not combine their databases.
Do not run the clinic migrations against the landing website's database.
Never put privileged keys in `VITE_*` or `NEXT_PUBLIC_*` variables.

Run these in separate terminals:

```sh
npm run dev:website
npm run dev:dashboard -- --port 3000
# For local Twilio calls, first start ngrok http 7860 in another terminal.
# Supply its hostname (without https://) below:
npm run dev:bot -- -x YOUR_PUBLIC_HOST --host 0.0.0.0 --port 7860
```

Use the website URL printed by Vite. The dashboard is at http://localhost:3000.
See [clinic setup](clinic/README.md) for the voice providers and clinic setup.

## How calls connect

```text
Website microphone -> Twilio Voice SDK -> website /api/public/twiml-voice
                                              |
                                              v
                               PIPECAT_STREAM_URL (wss://host/ws)
                                              |
                                              v
                                  Pipecat agent -> clinic database
```

Configure the Twilio TwiML application's Voice URL as a POST to
`https://nidahai.com/api/public/twiml-voice`. Set the website's
`PIPECAT_STREAM_URL` to the voice server's public `wss://.../ws` URL. The
website's `TWILIO_TWIML_APP_SID` must identify that same TwiML application.

For direct phone calls, configure the Twilio number's incoming Voice webhook
as POST to the voice server's HTTPS `/` endpoint, which returns stream TwiML.

## Deployment

All three services deploy from **this repository**, with separate runtimes:

| Service | Build context / root | Command |
| --- | --- | --- |
| Website | repository root | existing Lovable build (`npm run build`) |
| Dashboard | `clinic/dashboard` | `npm ci`, `npm run build`, `npm start` |
| Voice | `clinic` | `docker build -t nidahai-voice ./clinic` from repo root |

Run the voice container behind an HTTPS/WebSocket-capable reverse proxy:

```sh
docker run --name nidahai-voice --restart unless-stopped \
  --env-file clinic/.env \
  -e PUBLIC_HOST=voice.YOUR_DOMAIN \
  -p 127.0.0.1:7860:7860 nidahai-voice
```

`PUBLIC_HOST` is the externally reachable hostname, without scheme or path.
The proxy must forward `/ws` upgrades and the `/` TwiML webhook to port 7860.
The bot also exposes `/whatsapp` for an existing Twilio messaging integration.
Keep the bot running on a server: an ngrok tunnel on a sleeping or closed laptop
cannot provide an always-available portfolio demo.

For an immediate local demo, a Cloudflare quick tunnel can replace ngrok:

```sh
cloudflared tunnel --url http://127.0.0.1:7860 --no-autoupdate
# Use the hostname it prints when starting the bot:
npm run dev:bot -- -x YOUR_TUNNEL_HOST --host 127.0.0.1 --port 7860
```

Set both the Twilio number's Voice webhook and the browser's TwiML application's
Voice URL to `https://YOUR_TUNNEL_HOST/` with method POST. This routes browser
and phone audio directly to the same running agent, without the website's
`PIPECAT_STREAM_URL` being used. Alternatively keep the website TwiML route and
configure `PIPECAT_STREAM_URL` as described above.

Quick-tunnel hostnames change after restarting the tunnel, so update both Twilio
routes each time. A laptop demo is temporary; use an always-running server and a
stable hostname for a portfolio link that must work while the laptop is closed.

## Checks

```sh
npm run typecheck
npm run build
npm run typecheck:dashboard
npm run build:dashboard
npm run check:bot
```

The website and dashboard intentionally keep their own dependency lockfiles and
React versions. Root lint/format commands exclude `clinic/` to avoid applying
TanStack rules to the Next.js dashboard. Python syntax checks do not contact
voice providers or the database; a full call requires configured credentials.

## Source history

The website history is retained. The clinic application was imported under
`clinic/` from `Sd9968/NidahAI` at
`03e7631dea71b5a3f000bce05a744deba160c471`, preserving its history as a merge
parent. Local credentials, virtual environments, and uncommitted files from the
original checkout were not copied. The source repositories remain available;
future changes to this combined app should be made here.

[Lovable editor](https://lovable.dev/projects/1bcb3be0-0778-4fa6-b098-90d478b0e1e0)
