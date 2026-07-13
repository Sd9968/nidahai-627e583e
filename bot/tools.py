"""Deterministic appointment tools backed by Supabase."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is not None:
        return _supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        logger.warning("Supabase not configured — tools will return mock data")
        return None
    from supabase import create_client

    _supabase = create_client(url, key)
    return _supabase


def _clinic_filter(query, clinic_id: str):
    if clinic_id:
        return query.eq("clinic_id", clinic_id)
    return query


def register_tools(llm, clinic_id: str = "") -> ToolsSchema:
    """Build ToolsSchema and register handlers on the LLM."""

    async def search_patient(params: FunctionCallParams):
        phone = (params.arguments or {}).get("phone", "").strip()
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {"found": False, "reason": "supabase_not_configured", "phone": phone}
            )
            return
        q = sb.table("patients").select("id,name,phone_primary").eq("phone_primary", phone)
        q = _clinic_filter(q, clinic_id)
        res = q.limit(1).execute()
        if res.data:
            await params.result_callback({"found": True, "patient": res.data[0]})
        else:
            await params.result_callback({"found": False, "phone": phone})

    async def get_available_slots(params: FunctionCallParams):
        args = params.arguments or {}
        date = args.get("date")
        doctor_id = args.get("doctor_id")
        specialty = args.get("specialty")
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {
                    "date": date,
                    "slots": [
                        {
                            "doctor_id": "mock-doc-1",
                            "doctor_name": "Dr. Ahmed",
                            "time": f"{date}T10:00:00+03:00",
                        },
                        {
                            "doctor_id": "mock-doc-1",
                            "doctor_name": "Dr. Ahmed",
                            "time": f"{date}T11:00:00+03:00",
                        },
                    ],
                }
            )
            return

        dq = sb.table("doctors").select(
            "id,name_en,name_ar,specialty,consultation_duration_mins"
        )
        dq = _clinic_filter(dq, clinic_id)
        if doctor_id:
            dq = dq.eq("id", doctor_id)
        if specialty:
            dq = dq.ilike("specialty", f"%{specialty}%")
        doctors = dq.eq("active", True).execute().data or []

        slots: list[dict[str, Any]] = []
        for doc in doctors:
            avail = (
                sb.table("doctor_availability").select("*").eq("doctor_id", doc["id"]).execute().data
                or []
            )
            for a in avail[:2]:
                slots.append(
                    {
                        "doctor_id": doc["id"],
                        "doctor_name": doc.get("name_en") or doc.get("name_ar"),
                        "specialty": doc.get("specialty"),
                        "day_of_week": a.get("day_of_week"),
                        "window": f"{a.get('start_time')}-{a.get('end_time')}",
                        "requested_date": date,
                        "note": "Offer a concrete time within this window; prayer times are blocked in DB.",
                    }
                )
        await params.result_callback({"date": date, "slots": slots[:6]})

    async def book_appointment(params: FunctionCallParams):
        args = params.arguments or {}
        if not args.get("confirmed_by_patient"):
            await params.result_callback({"ok": False, "error": "patient_confirmation_required"})
            return
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {
                    "ok": True,
                    "mock": True,
                    "status": "pending_confirmation",
                    "scheduled_at": args.get("scheduled_at"),
                }
            )
            return

        patient_id = args.get("patient_id")
        if not patient_id:
            insert = {
                "clinic_id": clinic_id or None,
                "name": args.get("patient_name") or "Unknown",
                "phone_primary": args.get("patient_phone"),
            }
            created = sb.table("patients").insert(insert).execute()
            patient_id = created.data[0]["id"] if created.data else None

        row = {
            "clinic_id": clinic_id or None,
            "patient_id": patient_id,
            "doctor_id": args.get("doctor_id"),
            "scheduled_at": args.get("scheduled_at"),
            "status": "pending_confirmation",
            "source": "voice_ai",
        }
        res = sb.table("appointments").insert(row).execute()
        await params.result_callback({"ok": True, "appointment": res.data[0] if res.data else None})

    async def cancel_appointment(params: FunctionCallParams):
        args = params.arguments or {}
        if not args.get("patient_confirmed"):
            await params.result_callback({"ok": False, "error": "patient_confirmation_required"})
            return
        sb = get_supabase()
        if not sb:
            await params.result_callback({"ok": True, "mock": True, "status": "cancelled"})
            return
        res = (
            sb.table("appointments")
            .update({"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", args["appointment_id"])
            .execute()
        )
        await params.result_callback({"ok": True, "appointment": res.data[0] if res.data else None})

    async def get_patient_appointments(params: FunctionCallParams):
        args = params.arguments or {}
        sb = get_supabase()
        if not sb:
            await params.result_callback({"appointments": []})
            return
        patient_id = args.get("patient_id")
        if not patient_id and args.get("phone"):
            pq = sb.table("patients").select("id").eq("phone_primary", args["phone"]).limit(1)
            pq = _clinic_filter(pq, clinic_id)
            found = pq.execute().data
            patient_id = found[0]["id"] if found else None
        if not patient_id:
            await params.result_callback({"appointments": []})
            return
        aq = (
            sb.table("appointments")
            .select("id,scheduled_at,status,doctor_id")
            .eq("patient_id", patient_id)
            .in_("status", ["pending_confirmation", "confirmed"])
            .order("scheduled_at")
        )
        aq = _clinic_filter(aq, clinic_id)
        await params.result_callback({"appointments": aq.execute().data or []})

    async def get_clinic_info(params: FunctionCallParams):
        info_type = (params.arguments or {}).get("info_type", "all")
        sb = get_supabase()
        if not sb or not clinic_id:
            await params.result_callback(
                {
                    "name": "NidahAI Pilot Clinic",
                    "hours": "Sun–Thu 9:00–17:00",
                    "location": "Riyadh",
                    "doctors": ["Dr. Ahmed (GP)", "Dr. Fatima (Dermatology)"],
                    "info_type": info_type,
                    "mock": True,
                }
            )
            return
        clinic = sb.table("clinics").select("*").eq("id", clinic_id).single().execute().data
        doctors = []
        if info_type in ("doctors", "all"):
            doctors = (
                sb.table("doctors")
                .select("name_en,name_ar,specialty,gender")
                .eq("clinic_id", clinic_id)
                .eq("active", True)
                .execute()
                .data
                or []
            )
        await params.result_callback({"clinic": clinic, "doctors": doctors, "info_type": info_type})

    async def escalate_to_human(params: FunctionCallParams):
        args = params.arguments or {}
        reason = args.get("reason", "other")
        notes = args.get("notes", "")
        sb = get_supabase()
        if sb and clinic_id:
            sb.table("escalations").insert(
                {
                    "clinic_id": clinic_id,
                    "reason_code": reason,
                    "notes": notes,
                    "status": "callback_queued",
                }
            ).execute()
        logger.info(f"Escalation queued: {reason} — {notes}")
        await params.result_callback(
            {
                "ok": True,
                "message": "Staff will call the patient back. Confirm this to the patient.",
                "reason": reason,
            }
        )

    schemas = [
        FunctionSchema(
            name="search_patient",
            description="Look up a returning patient by phone number.",
            properties={
                "phone": {"type": "string", "description": "Patient phone in E.164 or local format"},
            },
            required=["phone"],
            handler=search_patient,
        ),
        FunctionSchema(
            name="get_available_slots",
            description="Fetch real open appointment slots for a doctor or specialty on a date.",
            properties={
                "date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
                "doctor_id": {"type": "string", "description": "Doctor UUID if known"},
                "specialty": {"type": "string", "description": "Specialty if doctor unknown"},
            },
            required=["date"],
            handler=get_available_slots,
        ),
        FunctionSchema(
            name="book_appointment",
            description="Create a pending_confirmation appointment after explicit patient confirmation.",
            properties={
                "patient_id": {"type": "string"},
                "patient_name": {"type": "string"},
                "patient_phone": {"type": "string"},
                "doctor_id": {"type": "string"},
                "scheduled_at": {"type": "string", "description": "ISO datetime"},
                "confirmed_by_patient": {"type": "boolean"},
            },
            required=["doctor_id", "scheduled_at", "confirmed_by_patient", "patient_phone"],
            handler=book_appointment,
        ),
        FunctionSchema(
            name="cancel_appointment",
            description="Cancel an existing appointment after verifying the appointment ID.",
            properties={
                "appointment_id": {"type": "string"},
                "patient_confirmed": {"type": "boolean"},
            },
            required=["appointment_id", "patient_confirmed"],
            handler=cancel_appointment,
        ),
        FunctionSchema(
            name="get_patient_appointments",
            description="List upcoming appointments for a patient by phone or patient_id.",
            properties={
                "phone": {"type": "string"},
                "patient_id": {"type": "string"},
            },
            required=[],
            handler=get_patient_appointments,
        ),
        FunctionSchema(
            name="get_clinic_info",
            description="Retrieve clinic hours, location, or doctor list.",
            properties={
                "info_type": {
                    "type": "string",
                    "enum": ["hours", "location", "doctors", "all"],
                },
            },
            required=["info_type"],
            handler=get_clinic_info,
        ),
        FunctionSchema(
            name="escalate_to_human",
            description="Escalate the call to staff / callback queue.",
            properties={
                "reason": {
                    "type": "string",
                    "enum": [
                        "emergency",
                        "patient_request",
                        "max_turns",
                        "low_confidence",
                        "complex_request",
                        "booking_conflict",
                        "other",
                    ],
                },
                "notes": {"type": "string"},
            },
            required=["reason"],
            handler=escalate_to_human,
        ),
    ]

    tools = ToolsSchema(standard_tools=schemas)
    return tools
