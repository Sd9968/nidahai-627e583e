# Supabase Setup — NidahAI

Project created and configured automatically.

## Your project

| Item | Value |
|------|-------|
| Name | **NidahAI** |
| Region | **ap-south-1** (Mumbai) |
| Project ref | `tvzaiczjbmqaxzdzwret` |
| Dashboard | https://supabase.com/dashboard/project/tvzaiczjbmqaxzdzwret |
| API URL | https://tvzaiczjbmqaxzdzwret.supabase.co |

Keys are in `.env` and `dashboard/.env.local` (not committed).

Database password is stored locally in `.supabase_db_password` (gitignored).

---

## What was applied

- Full schema from [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
- Realtime enabled on `appointments`
- Pilot clinic + 3 doctors seeded
- Admin Auth user created and linked to `staff_users`

---

## Staff login (dashboard)

| Field | Value |
|-------|-------|
| Email | `admin@clinic.com` |
| Password | `Admin@12345` |

**Change this password** after first login (Supabase Auth → Users, or dashboard Settings later).

---

## Run dashboard

```bash
cd dashboard
npm run dev
```

Open http://localhost:3000

---

## Re-run setup scripts

```bash
source .venv/bin/activate
python scripts/seed_pilot.py      # idempotent seed
python scripts/create_admin.py    # recreate/link admin auth
```

---

## CLI link (already done)

```bash
supabase link --project-ref tvzaiczjbmqaxzdzwret
supabase db query --linked -f supabase/migrations/001_initial_schema.sql
```
