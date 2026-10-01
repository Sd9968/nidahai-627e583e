#!/usr/bin/env python3
"""Seed a pilot clinic, doctors, availability, and print CLINIC_ID for .env."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def main() -> int:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        return 1

    from supabase import create_client

    sb = create_client(url, key)

    clinic = {
        "name_ar": "عيادة نداه التجريبية",
        "name_en": "NidahAI Pilot Clinic",
        "phone_number": os.getenv("TWILIO_PHONE_NUMBER", "+966500000000"),
        "city": "Riyadh",
        "address_en": "King Fahd Road, Riyadh",
        "address_ar": "طريق الملك فهد، الرياض",
        "after_hours_only": True,
        "prayer_times_enabled": True,
    }

    existing = (
        sb.table("clinics")
        .select("id")
        .eq("name_en", clinic["name_en"])
        .limit(1)
        .execute()
        .data
    )
    if existing:
        clinic_id = existing[0]["id"]
        print(f"Clinic already exists: {clinic_id}")
    else:
        res = sb.table("clinics").insert(clinic).execute()
        clinic_id = res.data[0]["id"]
        print(f"Created clinic: {clinic_id}")

    doctors = [
        {
            "clinic_id": clinic_id,
            "name_ar": "د. أحمد العتيبي",
            "name_en": "Dr. Ahmed Al-Otaibi",
            "specialty": "General Practice",
            "gender": "male",
            "consultation_duration_mins": 20,
        },
        {
            "clinic_id": clinic_id,
            "name_ar": "د. فاطمة الشمري",
            "name_en": "Dr. Fatima Al-Shammari",
            "specialty": "Dermatology",
            "gender": "female",
            "consultation_duration_mins": 25,
        },
        {
            "clinic_id": clinic_id,
            "name_ar": "د. خالد الحربي",
            "name_en": "Dr. Khalid Al-Harbi",
            "specialty": "Pediatrics",
            "gender": "male",
            "consultation_duration_mins": 20,
        },
    ]

    for d in doctors:
        found = (
            sb.table("doctors")
            .select("id")
            .eq("clinic_id", clinic_id)
            .eq("name_en", d["name_en"])
            .limit(1)
            .execute()
            .data
        )
        if found:
            doctor_id = found[0]["id"]
            print(f"  Doctor exists: {d['name_en']} ({doctor_id})")
        else:
            created = sb.table("doctors").insert(d).execute().data[0]
            doctor_id = created["id"]
            print(f"  Created doctor: {d['name_en']} ({doctor_id})")
            # Sun–Thu 09:00–12:00 and 16:00–20:00
            for day in range(0, 5):
                sb.table("doctor_availability").insert(
                    [
                        {
                            "doctor_id": doctor_id,
                            "day_of_week": day,
                            "start_time": "09:00",
                            "end_time": "12:00",
                        },
                        {
                            "doctor_id": doctor_id,
                            "day_of_week": day,
                            "start_time": "16:00",
                            "end_time": "20:00",
                        },
                    ]
                ).execute()

    admin_email = os.getenv("ADMIN_EMAIL", "admin@clinic.com")
    staff = (
        sb.table("staff_users")
        .select("id")
        .eq("email", admin_email)
        .limit(1)
        .execute()
        .data
    )
    if not staff:
        sb.table("staff_users").insert(
            {
                "clinic_id": clinic_id,
                "email": admin_email,
                "full_name": "Clinic Admin",
                "role": "admin",
            }
        ).execute()
        print(f"Created staff_users row for {admin_email}")
        print("Create the Auth user in Supabase Auth (email/password), then link auth_user_id.")
    else:
        print(f"Staff row exists for {admin_email}")

    print("\nAdd to .env:")
    print(f"CLINIC_ID={clinic_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
