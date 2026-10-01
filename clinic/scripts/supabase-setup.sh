#!/usr/bin/env bash
# NidahAI Supabase setup — uses linked project (supabase link)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ] && [ -f supabase/.temp/project-ref ]; then
  PROJECT_REF="$(cat supabase/.temp/project-ref)"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "No linked project. Run:"
  echo "  supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
fi

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
echo "==> Project ref: ${PROJECT_REF}"
echo "    URL: ${SUPABASE_URL}"

echo ""
echo "==> Fetching API keys (requires supabase login)..."
KEYS_JSON=$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json)
ANON=$(echo "$KEYS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next(x['api_key'] for x in d if x.get('name')=='anon'))")
SERVICE=$(echo "$KEYS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next(x['api_key'] for x in d if x.get('name')=='service_role'))")

ENV_FILE="${ROOT}/.env"
touch "$ENV_FILE"
upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

upsert "SUPABASE_URL" "$SUPABASE_URL"
upsert "SUPABASE_ANON_KEY" "$ANON"
upsert "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE"
upsert "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
upsert "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON"

echo "    Wrote Supabase keys to .env"

echo ""
echo "==> Applying schema (001_initial_schema.sql)..."
supabase db execute --linked --file supabase/migrations/001_initial_schema.sql 2>/dev/null || {
  echo "    db execute not available — trying psql via linked pooler..."
  # Fallback: use supabase db push with a fresh migration name
  TS="20260712120000"
  cp supabase/migrations/001_initial_schema.sql "supabase/migrations/${TS}_nidahai_initial.sql"
  supabase db push --yes 2>&1 || true
}

echo ""
echo "==> Enabling Realtime on appointments..."
REALTIME_SQL="alter publication supabase_realtime add table appointments;"
supabase db execute --linked --sql "$REALTIME_SQL" 2>/dev/null || echo "    (enable Realtime manually in Dashboard → Database → Replication)"

echo ""
echo "==> Creating admin Auth user..."
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@clinic.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"
python3 <<PY
import os, json, urllib.request
url = os.environ.get("SUPABASE_URL") or "${SUPABASE_URL}"
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or """${SERVICE}"""
payload = json.dumps({"email": "${ADMIN_EMAIL}", "password": "${ADMIN_PASSWORD}", "email_confirm": True}).encode()
req = urllib.request.Request(
    f"{url}/auth/v1/admin/users",
    data=payload,
    headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req) as r:
        user = json.loads(r.read())
        print(f"    Auth user created: {user.get('email')} id={user.get('id')}")
        open("${ROOT}/.supabase_admin_id", "w").write(user.get("id", ""))
except urllib.error.HTTPError as e:
    body = e.read().decode()
    if "already" in body.lower() or e.code == 422:
        print("    Auth user may already exist — continuing")
    else:
        print(f"    Auth create failed ({e.code}): {body[:200]}")
PY

echo ""
echo "==> Seeding pilot clinic..."
if [ -d "${ROOT}/.venv" ]; then source "${ROOT}/.venv/bin/activate"; fi
pip install -q python-dotenv supabase 2>/dev/null || true
python3 scripts/seed_pilot.py

echo ""
echo "==> Linking staff auth_user_id..."
if [ -f "${ROOT}/.supabase_admin_id" ]; then
  AUTH_ID=$(cat "${ROOT}/.supabase_admin_id")
  LINK_SQL="update staff_users set auth_user_id = '${AUTH_ID}'::uuid where email = '${ADMIN_EMAIL}';"
  supabase db execute --linked --sql "$LINK_SQL" 2>/dev/null || echo "    Run link SQL manually in SQL Editor"
fi

echo ""
echo "Done."
echo "  Dashboard: cd dashboard && npm install && npm run dev"
echo "  Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo "  Change the admin password after first login."
