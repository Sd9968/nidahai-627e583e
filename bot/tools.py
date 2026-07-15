"""Deterministic appointment tools backed by Supabase."""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams

_supabase = None

# Clinic-local timezone. The LLM speaks local time (e.g. "4 PM" in Riyadh); we
# must anchor naive datetimes to this tz before storing or they are treated as
# UTC and the appointment shifts by the offset (was booking 3 hours late).
CLINIC_TZ = os.getenv("CLINIC_TZ", "Asia/Riyadh")


def clean_phone(raw: str | None) -> str | None:
    """Normalize a spoken/typed phone number toward E.164.

    Callers say numbers loosely and the model passes them through verbatim
    ("+91 9347086545", "0934-708 6545"). Stored unnormalized, they never match a
    lookup and Twilio rejects them ("not a valid phone number"), so strip every
    separator and keep a single leading '+'.
    """
    if not raw:
        return None
    s = re.sub(r"[^\d+]", "", str(raw))
    if not s:
        return None
    if s.startswith("00"):
        s = "+" + s[2:]
    s = "+" + s.lstrip("+").replace("+", "") if s.startswith("+") else s
    return s or None


def phone_tail(raw: str | None, n: int = 9) -> str:
    """Last n digits — the part that's stable across +91 / 0 / local spellings."""
    digits = re.sub(r"\D", "", str(raw or ""))
    return digits[-n:] if len(digits) >= n else digits


def _normalize_scheduled_at(value: str | None) -> str | None:
    """Attach the clinic timezone to a naive ISO datetime; pass through otherwise."""
    if not value:
        return value
    try:
        dt = datetime.fromisoformat(value)
    except (ValueError, TypeError):
        logger.warning(f"book_appointment: unparseable scheduled_at {value!r}; storing as-is")
        return value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(CLINIC_TZ))
    return dt.isoformat()


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


def register_tools(
    llm,
    clinic_id: str = "",
    caller_number: str | None = None,
    call_sid: str | None = None,
) -> ToolsSchema:
    """Build ToolsSchema and register handlers on the LLM.

    caller_number / call_sid identify the phone the patient is calling from, so the
    WhatsApp confirmation goes to the caller's own number (resolved via Twilio if the
    transport didn't provide it).
    """

    def _norm_ref(v: str | None) -> str:
        return (v or "").strip().upper().replace(" ", "").replace("-", "")

    def _resolve_appt_id(sb, args) -> str | None:
        """Appointment UUID from an explicit id or a spoken booking code (B####)."""
        if args.get("appointment_id"):
            return args.get("appointment_id")
        ref = _norm_ref(args.get("appointment_ref"))
        if not ref:
            return None
        r = _clinic_filter(sb.table("appointments").select("id").eq("ref_code", ref), clinic_id)
        d = r.limit(1).execute().data
        return d[0]["id"] if d else None

    async def search_patient(params: FunctionCallParams):
        args = params.arguments or {}
        phone = (args.get("phone") or "").strip()
        patient_ref = _norm_ref(args.get("patient_ref"))
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {"found": False, "reason": "supabase_not_configured", "phone": phone}
            )
            return
        q = sb.table("patients").select("id,name,phone_primary,ref_code")
        if patient_ref:
            q = q.eq("ref_code", patient_ref)
        else:
            # Match on the last digits, not the exact string: the caller may say
            # "9347086545", "+91 9347086545" or "0934 708 6545" for the number
            # stored as "+919347086545". An exact match misses all but one.
            tail = phone_tail(phone)
            if not tail:
                await params.result_callback({"found": False, "phone": phone or None})
                return
            q = q.ilike("phone_primary", f"%{tail}")
        q = _clinic_filter(q, clinic_id)
        res = q.order("created_at", desc=True).limit(1).execute()
        if res.data:
            await params.result_callback({"found": True, "patient": res.data[0]})
        else:
            await params.result_callback(
                {"found": False, "phone": phone or None, "patient_ref": patient_ref or None}
            )

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
        scheduled_at = _normalize_scheduled_at(args.get("scheduled_at"))
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {
                    "ok": True,
                    "mock": True,
                    "status": "confirmed",
                    "scheduled_at": scheduled_at,
                }
            )
            return

        # The agent is autonomous: a free slot is booked AND confirmed immediately.
        # Guard against double-booking so an "available slot" is genuinely free.
        doctor_id = args.get("doctor_id")
        if doctor_id and scheduled_at:
            conflict = (
                sb.table("appointments")
                .select("id")
                .eq("doctor_id", doctor_id)
                .eq("scheduled_at", scheduled_at)
                .in_("status", ["confirmed", "pending_confirmation"])
                .limit(1)
                .execute()
            )
            if conflict.data:
                await params.result_callback(
                    {"ok": False, "error": "slot_taken", "message": "That time was just taken; offer another slot."}
                )
                return

        # Prefer the number they called from; fall back to what they told us.
        # Always normalize: an unnormalized number is unusable for WhatsApp and
        # never matches a later lookup.
        patient_phone = clean_phone(caller_number) or clean_phone(args.get("patient_phone"))

        patient_id = args.get("patient_id")
        if not patient_id:
            insert = {
                "clinic_id": clinic_id or None,
                "name": args.get("patient_name") or "Unknown",
                "phone_primary": patient_phone,
            }
            created = sb.table("patients").insert(insert).execute()
            patient_id = created.data[0]["id"] if created.data else None

        row = {
            "clinic_id": clinic_id or None,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_at": scheduled_at,
            "status": "confirmed",
            "source": "voice_ai",
        }
        res = sb.table("appointments").insert(row).execute()
        appointment = res.data[0] if res.data else None
        booking_ref = appointment.get("ref_code") if appointment else None
        patient_ref = None
        if patient_id:
            pr = sb.table("patients").select("ref_code").eq("id", patient_id).limit(1).execute()
            if pr.data:
                patient_ref = pr.data[0].get("ref_code")
        await params.result_callback(
            {
                "ok": True,
                "status": "confirmed",
                "booking_id": booking_ref,
                "patient_id": patient_ref,
                "appointment": appointment,
            }
        )

        # Fire a WhatsApp confirmation to the patient (non-blocking; never delays
        # the voice turn). The patient can reply YES or send a corrected name.
        async def _notify():
            import asyncio as _a

            from messaging import (
                resolve_caller_number,
                send_booking_confirmation,
                whatsapp_enabled,
            )

            if not whatsapp_enabled():
                return
            doctor_name = None
            did = args.get("doctor_id")
            if did:
                dq = await _a.to_thread(
                    lambda: sb.table("doctors").select("name_en,name_ar").eq("id", did).limit(1).execute()
                )
                if dq.data:
                    doctor_name = dq.data[0].get("name_en") or dq.data[0].get("name_ar")
            patient_name = args.get("patient_name")
            if not patient_name and patient_id:
                pq = await _a.to_thread(
                    lambda: sb.table("patients").select("name").eq("id", patient_id).limit(1).execute()
                )
                if pq.data:
                    patient_name = pq.data[0].get("name")
            # Prefer the caller's own number (caller ID); resolve via Twilio if needed.
            recipient = caller_number
            if not recipient:
                recipient = await _a.to_thread(resolve_caller_number, None, call_sid)
            recipient = clean_phone(recipient) or patient_phone
            # Key the patient record to the number they called from so WhatsApp
            # replies (which arrive from that number) match this exact patient.
            if recipient and str(recipient).startswith("+") and patient_id:
                await _a.to_thread(
                    lambda: sb.table("patients")
                    .update({"phone_primary": recipient})
                    .eq("id", patient_id)
                    .execute()
                )
            await send_booking_confirmation(
                recipient, patient_name or "there", scheduled_at, doctor_name,
                booking_ref, patient_ref,
            )

        try:
            import asyncio

            asyncio.create_task(_notify())
        except Exception as e:
            logger.warning(f"WhatsApp confirmation scheduling failed: {e}")

    async def cancel_appointment(params: FunctionCallParams):
        args = params.arguments or {}
        if not args.get("patient_confirmed"):
            await params.result_callback({"ok": False, "error": "patient_confirmation_required"})
            return
        sb = get_supabase()
        if not sb:
            await params.result_callback({"ok": True, "mock": True, "status": "cancelled"})
            return
        appt_id = _resolve_appt_id(sb, args)
        if not appt_id:
            await params.result_callback({"ok": False, "error": "appointment_not_found"})
            return
        res = (
            sb.table("appointments")
            .update({"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", appt_id)
            .execute()
        )
        await params.result_callback({"ok": True, "appointment": res.data[0] if res.data else None})

    async def reschedule_appointment(params: FunctionCallParams):
        args = params.arguments or {}
        if not args.get("patient_confirmed"):
            await params.result_callback({"ok": False, "error": "patient_confirmation_required"})
            return
        new_at = _normalize_scheduled_at(args.get("new_scheduled_at"))
        sb = get_supabase()
        if not sb:
            await params.result_callback(
                {"ok": True, "mock": True, "status": "confirmed", "scheduled_at": new_at}
            )
            return
        appt_id = _resolve_appt_id(sb, args)
        if not appt_id:
            await params.result_callback({"ok": False, "error": "appointment_not_found"})
            return

        # Target doctor: the new one if changing, else the appointment's current doctor.
        doctor_id = args.get("doctor_id")
        if not doctor_id and appt_id:
            cur = sb.table("appointments").select("doctor_id").eq("id", appt_id).limit(1).execute()
            if cur.data:
                doctor_id = cur.data[0].get("doctor_id")

        # Ensure the new time is free (ignoring this appointment itself).
        if doctor_id and new_at:
            conflict = (
                sb.table("appointments")
                .select("id")
                .eq("doctor_id", doctor_id)
                .eq("scheduled_at", new_at)
                .in_("status", ["confirmed", "pending_confirmation"])
                .neq("id", appt_id)
                .limit(1)
                .execute()
            )
            if conflict.data:
                await params.result_callback(
                    {"ok": False, "error": "slot_taken", "message": "That new time is taken; offer another."}
                )
                return

        update = {
            "scheduled_at": new_at,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if args.get("doctor_id"):
            update["doctor_id"] = args["doctor_id"]
        res = sb.table("appointments").update(update).eq("id", appt_id).execute()
        await params.result_callback(
            {"ok": True, "status": "confirmed", "appointment": res.data[0] if res.data else None}
        )

    async def get_patient_appointments(params: FunctionCallParams):
        args = params.arguments or {}
        sb = get_supabase()
        if not sb:
            await params.result_callback({"appointments": []})
            return
        patient_id = args.get("patient_id")
        patient_ref = _norm_ref(args.get("patient_ref"))
        if not patient_id and patient_ref:
            pq = _clinic_filter(
                sb.table("patients").select("id").eq("ref_code", patient_ref).limit(1), clinic_id
            )
            found = pq.execute().data
            patient_id = found[0]["id"] if found else None
        if not patient_id and args.get("phone"):
            pq = (
                sb.table("patients")
                .select("id")
                .ilike("phone_primary", f"%{phone_tail(args['phone'])}")
                .limit(1)
            )
            pq = _clinic_filter(pq, clinic_id)
            found = pq.execute().data
            patient_id = found[0]["id"] if found else None
        if not patient_id:
            await params.result_callback({"appointments": []})
            return
        aq = (
            sb.table("appointments")
            .select("id,ref_code,scheduled_at,status,doctor_id")
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
                    "services": ["General Practice", "Dermatology", "Pediatrics"],
                    "info_type": info_type,
                    "mock": True,
                }
            )
            return
        clinic = sb.table("clinics").select("*").eq("id", clinic_id).single().execute().data
        doctors = []
        # Fetch doctors whenever the caller wants doctors, services/specialties, or all.
        if info_type in ("doctors", "services", "all"):
            doctors = (
                sb.table("doctors")
                .select("name_en,name_ar,specialty,gender")
                .eq("clinic_id", clinic_id)
                .eq("active", True)
                .execute()
                .data
                or []
            )
        services = sorted({d.get("specialty") for d in doctors if d.get("specialty")})
        await params.result_callback(
            {"clinic": clinic, "doctors": doctors, "services": services, "info_type": info_type}
        )

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
            description="Look up a returning patient by phone number or by their Patient ID (e.g. P1001).",
            properties={
                "phone": {"type": "string", "description": "Patient phone in E.164 or local format"},
                "patient_ref": {"type": "string", "description": "Patient ID code like P1001, if given"},
            },
            required=[],
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
            description=(
                "Book AND confirm an appointment in an available slot after explicit "
                "patient confirmation. Confirmed immediately (no staff step). Returns "
                "'slot_taken' if the time is no longer free, and a booking_id (B####) "
                "plus patient_id (P####) to read back to the caller."
            ),
            properties={
                "patient_id": {"type": "string"},
                "patient_name": {"type": "string"},
                "patient_phone": {"type": "string"},
                "doctor_id": {"type": "string"},
                "scheduled_at": {
                    "type": "string",
                    "description": (
                        "ISO datetime in clinic-local time (Asia/Riyadh). Prefer including "
                        "the offset, e.g. 2026-07-14T16:00:00+03:00 for 4 PM."
                    ),
                },
                "confirmed_by_patient": {"type": "boolean"},
            },
            required=["doctor_id", "scheduled_at", "confirmed_by_patient", "patient_phone"],
            handler=book_appointment,
        ),
        FunctionSchema(
            name="cancel_appointment",
            description="Cancel an appointment by its internal id or the caller's Booking ID (e.g. B1005), after explicit confirmation.",
            properties={
                "appointment_id": {"type": "string", "description": "Internal UUID if known"},
                "appointment_ref": {"type": "string", "description": "Booking ID code like B1005"},
                "patient_confirmed": {"type": "boolean"},
            },
            required=["patient_confirmed"],
            handler=cancel_appointment,
        ),
        FunctionSchema(
            name="reschedule_appointment",
            description=(
                "Move an existing appointment to a new available time (and optionally a "
                "new doctor). Confirmed immediately. Requires explicit patient confirmation; "
                "returns 'slot_taken' if the new time is not free."
            ),
            properties={
                "appointment_id": {"type": "string", "description": "Internal UUID if known"},
                "appointment_ref": {"type": "string", "description": "Booking ID code like B1005"},
                "new_scheduled_at": {
                    "type": "string",
                    "description": "New ISO datetime in Asia/Riyadh, e.g. 2026-07-15T10:00:00+03:00",
                },
                "doctor_id": {"type": "string", "description": "Only if changing the doctor"},
                "patient_confirmed": {"type": "boolean"},
            },
            required=["new_scheduled_at", "patient_confirmed"],
            handler=reschedule_appointment,
        ),
        FunctionSchema(
            name="get_patient_appointments",
            description="List upcoming appointments (with their Booking IDs) for a patient by phone, patient_id, or Patient ID code (P####).",
            properties={
                "phone": {"type": "string"},
                "patient_id": {"type": "string"},
                "patient_ref": {"type": "string", "description": "Patient ID code like P1001"},
            },
            required=[],
            handler=get_patient_appointments,
        ),
        FunctionSchema(
            name="get_clinic_info",
            description="Retrieve clinic hours, location, doctor list, or services/specialties offered.",
            properties={
                "info_type": {
                    "type": "string",
                    "enum": ["hours", "location", "doctors", "services", "all"],
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
