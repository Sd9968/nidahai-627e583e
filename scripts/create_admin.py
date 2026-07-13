#!/usr/bin/env python3
"""Create Supabase Auth admin and link staff_users.auth_user_id."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def main() -> int:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return 1

    email = os.getenv("ADMIN_EMAIL", "admin@clinic.com")
    password = os.getenv("ADMIN_PASSWORD", "Admin@12345")

    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    }

    auth_id = None
    payload = json.dumps(
        {"email": email, "password": password, "email_confirm": True}
    ).encode()

    try:
        req = urllib.request.Request(
            f"{url}/auth/v1/admin/users", data=payload, headers=headers, method="POST"
        )
        with urllib.request.urlopen(req) as r:
            user = json.loads(r.read())
            auth_id = user.get("id")
            print(f"Created auth user: {email} ({auth_id})")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if e.code in (422, 409) or "already" in body.lower():
            print(f"Auth user may exist ({e.code}), looking up…")
        else:
            print(f"Auth create failed ({e.code}): {body[:400]}")
            return 1

    if not auth_id:
        req = urllib.request.Request(
            f"{url}/auth/v1/admin/users", headers=headers, method="GET"
        )
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            for u in data.get("users", []):
                if u.get("email") == email:
                    auth_id = u["id"]
                    print(f"Found auth user: {auth_id}")
                    break

    if not auth_id:
        print("Could not resolve auth user id")
        return 1

    (ROOT / ".supabase_admin_id").write_text(auth_id)

    from supabase import create_client

    sb = create_client(url, key)
    sb.table("staff_users").update({"auth_user_id": auth_id}).eq("email", email).execute()
    print(f"Linked staff_users.auth_user_id for {email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
