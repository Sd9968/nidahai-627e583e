"""WhatsApp booking confirmations via Twilio + inbound reply handling.

Flow (see bot.py /whatsapp route and tools.book_appointment):
  1. After the AI books, we WhatsApp the patient — on the number they called from
     — their appointment details, Booking ID and Patient ID.
  2. Twilio posts their replies to /whatsapp on this server. An LLM assistant
     (see _ai_reply) answers them and can cancel or correct the name via tools,
     writing to Supabase, which the CRM reflects via realtime.

Uses the service-role Supabase client (get_supabase) so writes bypass RLS.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from loguru import logger

from instructions import CLINIC_NAME_EN
from tools import clean_phone, get_supabase, phone_tail

CLINIC_TZ = os.getenv("CLINIC_TZ", "Asia/Riyadh")


def _fallback_menu(appts: list) -> str:
    """Static fallback used only if the AI assistant is unavailable."""
    if not appts:
        return (
            f"👋 Hello! I'm the {CLINIC_NAME_EN} assistant. I don't see an upcoming appointment "
            "for this number. To book, please call the clinic."
        )
    lines = [f"👋 Hello! I'm the {CLINIC_NAME_EN} assistant. Upcoming appointments on this number:", ""]
    for a in appts:
        lines.append(
            f"• {a.get('_patient_name')}: {format_when(a.get('scheduled_at'))} Riyadh with "
            f"{a.get('_doctor_name') or 'the doctor'} (Booking *{a.get('ref_code')}*)."
        )
    lines += ["", "To cancel, tell me the Booking ID. To fix a name, send the corrected name."]
    return "\n".join(lines)


def _norm_phone(raw: str | None) -> str | None:
    """Strip the whatsapp: prefix and normalize to E.164.

    Twilio rejects anything with separators ("+91 9347086545" -> HTTP 400 'not a
    valid phone number'), so this must clean, not just trim.
    """
    if not raw:
        return None
    return clean_phone(raw.replace("whatsapp:", ""))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def whatsapp_enabled() -> bool:
    return os.getenv("WHATSAPP_CONFIRMATIONS", "true").lower() in ("1", "true", "yes") and bool(
        os.getenv("TWILIO_WHATSAPP_FROM")
    )


def _twilio_client():
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    tok = os.getenv("TWILIO_AUTH_TOKEN")
    if not sid or not tok:
        return None
    from twilio.rest import Client

    return Client(sid, tok)


def resolve_caller_number(from_number: str | None, call_sid: str | None) -> str | None:
    """The number the patient is calling from.

    Twilio's media-stream start event usually omits the caller ID (from=None), so
    fall back to fetching the Call resource by CallSid via the REST API. Runs in a
    thread from the async caller — it's a blocking HTTP call.
    """
    if from_number:
        return _norm_phone(from_number)
    if not call_sid:
        return None
    client = _twilio_client()
    if not client:
        return None
    try:
        call = client.calls(call_sid).fetch()
        # twilio-python exposes the caller ID as `_from` / `from_formatted`.
        num = getattr(call, "from_formatted", None) or getattr(call, "_from", None)
        if num:
            logger.info(f"Resolved caller number {num} for call {call_sid}")
        return num
    except Exception as e:
        logger.warning(f"Could not resolve caller number for {call_sid}: {e}")
        return None


def format_when(scheduled_at: str | None) -> str:
    """Human-friendly local time, e.g. 'Tuesday, 14 Jul at 4:00 PM'."""
    if not scheduled_at:
        return "your selected time"
    try:
        dt = datetime.fromisoformat(scheduled_at)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo(CLINIC_TZ))
        dt = dt.astimezone(ZoneInfo(CLINIC_TZ))
        return dt.strftime("%A, %-d %b at %-I:%M %p")
    except (ValueError, TypeError):
        return str(scheduled_at)


async def send_booking_confirmation(
    phone: str | None,
    patient_name: str,
    scheduled_at: str | None,
    doctor_name: str | None,
    booking_ref: str | None = None,
    patient_ref: str | None = None,
) -> None:
    if not whatsapp_enabled():
        logger.info("WhatsApp confirmations disabled/unconfigured; skipping send")
        return
    phone = _norm_phone(phone)
    if not phone:
        return
    client = _twilio_client()
    if not client:
        logger.warning("WhatsApp: Twilio credentials missing; cannot send")
        return
    wa_from = os.getenv("TWILIO_WHATSAPP_FROM")
    ids = ""
    if booking_ref:
        ids += f"• Booking ID: *{booking_ref}*\n"
    if patient_ref:
        ids += f"• Patient ID: *{patient_ref}*\n"
    body = (
        f"Hello! Your appointment is confirmed ✅\n\n"
        f"• Name: {patient_name}\n"
        f"• When: {format_when(scheduled_at)}\n"
        f"• Doctor: {doctor_name or 'to be assigned'}\n"
        f"{ids}\n"
        f"Keep your Patient ID for future calls. "
        f"If the name is incorrect, reply with the correct name. "
        f"Reply CANCEL to cancel the appointment."
    )

    def _send():
        return client.messages.create(from_=wa_from, to=f"whatsapp:{phone}", body=body)

    try:
        msg = await asyncio.to_thread(_send)
        logger.info(f"WhatsApp confirmation sent to {phone} sid={msg.sid}")
    except Exception as e:
        logger.warning(f"WhatsApp send failed: {e}")


WHATSAPP_SYSTEM = (
    f"You are the {CLINIC_NAME_EN} assistant chatting with a patient on WhatsApp. Be warm, natural, and concise "
    "— 1 to 3 short sentences, like a friendly receptionist. "
    "IMPORTANT: one phone number may have appointments for SEVERAL people (for example a son who booked "
    "for his mother and father). The context lists every appointment on this number with the person's "
    "name and a Booking ID. "
    "Answer questions using only that context: dates and times (ALWAYS in Saudi / Riyadh time), the doctor, "
    "the name on each booking, the Booking ID, and the Patient ID. "
    "You have two tools: cancel an appointment, and update the name on a booking. When there is more than "
    "one appointment, FIRST ask the caller which person or Booking ID they mean, then pass that booking_id "
    "to the tool. If there is exactly one, you may act without asking. "
    "Only cancel when the caller clearly asks to cancel. Only update a name when they clearly give a "
    "corrected name — acknowledgements like 'ok', 'thanks', 'perfect', 'great' are NOT names; just reply "
    "politely without changing anything. After using a tool, confirm what you did in one short sentence. "
    "You cannot book new appointments or reschedule over chat — for those, ask them to call the clinic. "
    "Never invent details not in the context, and never discuss other people's records. No markdown headings."
)

_WA_TOOLS = [
    {
        "toolSpec": {
            "name": "cancel_appointment",
            "description": "Cancel one appointment. Provide its Booking ID (B####). Only when the caller clearly asks to cancel.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "booking_id": {"type": "string", "description": "Booking ID like B1006; required when the number has more than one appointment"}
                    },
                    "required": [],
                }
            },
        }
    },
    {
        "toolSpec": {
            "name": "update_name",
            "description": "Update the name on one booking. Provide the corrected full name and the Booking ID.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "The corrected full name"},
                        "booking_id": {"type": "string", "description": "Booking ID like B1006; required when the number has more than one appointment"},
                    },
                    "required": ["name"],
                }
            },
        }
    },
]


def _context_text(patients: list, appts: list) -> str:
    if not patients:
        return (
            "Caller context: There is no patient record for this WhatsApp number, so you cannot "
            "look up or change anything. Politely invite them to call the clinic to book."
        )
    if not appts:
        names = ", ".join(sorted({p.get("name") for p in patients if p.get("name")}))
        return (
            f"Caller context: this number is on file (for {names or 'a patient'}) but has no upcoming "
            "appointments. To book, ask them to call the clinic."
        )
    lines = [
        "Caller context — appointments on this WhatsApp number "
        "(a number can hold appointments for several family members):"
    ]
    for a in appts:
        lines.append(
            f"- Booking {a.get('ref_code')}: for {a.get('_patient_name')} "
            f"(Patient ID {a.get('_patient_ref')}), {format_when(a.get('scheduled_at'))} Riyadh time "
            f"with {a.get('_doctor_name') or 'the doctor'}, status {a.get('status')}."
        )
    if len(appts) > 1:
        lines.append("There is more than one — confirm which person or Booking ID before acting.")
    return "\n".join(lines)


def _find_appt(appts: list, booking_id: str | None) -> dict | None:
    ref = (booking_id or "").strip().upper().replace(" ", "").replace("-", "")
    if ref:
        return next((a for a in appts if (a.get("ref_code") or "").upper() == ref), None)
    return appts[0] if len(appts) == 1 else None


async def _run_wa_tool(name: str, inp: dict, appts: list) -> dict:
    sb = get_supabase()
    if not sb:
        return {"ok": False, "error": "unavailable"}
    target = _find_appt(appts, inp.get("booking_id"))
    if not target:
        if len(appts) > 1:
            return {"ok": False, "error": "which_booking", "choices": [a.get("ref_code") for a in appts]}
        return {"ok": False, "error": "no_appointment"}
    if name == "cancel_appointment":
        await asyncio.to_thread(
            lambda: sb.table("appointments")
            .update({"status": "cancelled", "updated_at": _now_iso()})
            .eq("id", target["id"])
            .execute()
        )
        return {"ok": True, "status": "cancelled", "booking_id": target.get("ref_code")}
    if name == "update_name":
        new = (inp.get("name") or "").strip()[:80]
        if not new:
            return {"ok": False, "error": "no_name"}
        await asyncio.to_thread(
            lambda: sb.table("patients").update({"name": new}).eq("id", target["patient_id"]).execute()
        )
        await asyncio.to_thread(
            lambda: sb.table("appointments")
            .update({"updated_at": _now_iso()})
            .eq("id", target["id"])
            .execute()
        )
        return {"ok": True, "name": new, "booking_id": target.get("ref_code")}
    return {"ok": False, "error": "unknown_tool"}


WA_HISTORY_TURNS = int(os.getenv("WA_HISTORY_TURNS", "12"))
WA_HISTORY_HOURS = int(os.getenv("WA_HISTORY_HOURS", "24"))


async def _load_history(phone: str) -> list:
    """Recent chat turns for this number, oldest first, as Bedrock messages."""
    sb = get_supabase()
    if not sb:
        return []
    since = (datetime.now(timezone.utc) - timedelta(hours=WA_HISTORY_HOURS)).isoformat()

    def _q():
        return (
            sb.table("wa_messages")
            .select("role,text,created_at")
            .eq("phone", phone)
            .gte("created_at", since)
            .order("created_at", desc=True)
            .limit(WA_HISTORY_TURNS)
            .execute()
        )

    try:
        rows = (await asyncio.to_thread(_q)).data or []
    except Exception as e:
        logger.warning(f"WhatsApp history load failed: {e}")
        return []
    rows.reverse()  # oldest first
    return [{"role": r["role"], "content": [{"text": r["text"]}]} for r in rows]


async def _save_message(phone: str, role: str, text: str) -> None:
    sb = get_supabase()
    if not sb or not text:
        return
    try:
        await asyncio.to_thread(
            lambda: sb.table("wa_messages")
            .insert({"phone": phone, "role": role, "text": text[:4000]})
            .execute()
        )
    except Exception as e:
        logger.warning(f"WhatsApp history save failed: {e}")


def _normalize_messages(msgs: list) -> list:
    """Bedrock requires strictly alternating roles starting with user."""
    out: list = []
    for m in msgs:
        text = m["content"][0]["text"]
        if out and out[-1]["role"] == m["role"]:
            out[-1]["content"][0]["text"] += "\n" + text
        else:
            out.append({"role": m["role"], "content": [{"text": text}]})
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


async def _ai_reply(patients: list, appts: list, user_text: str, history: list | None = None) -> str | None:
    """LLM-driven WhatsApp reply (multi-patient aware) with cancel / update-name tools."""
    region = os.getenv("AWS_REGION", "ap-south-1")
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")
    model = os.getenv("BEDROCK_MODEL_ID", "global.anthropic.claude-haiku-4-5-20251001-v1:0")
    if not ak or not sk:
        return None

    system = [{"text": WHATSAPP_SYSTEM + "\n\n" + _context_text(patients, appts)}]
    messages = _normalize_messages(
        (history or []) + [{"role": "user", "content": [{"text": user_text or "Hello"}]}]
    )

    import aiobotocore.session

    sess = aiobotocore.session.get_session()
    async with sess.create_client(
        "bedrock-runtime", region_name=region, aws_access_key_id=ak, aws_secret_access_key=sk
    ) as br:
        for _ in range(3):  # allow a couple of tool round-trips
            resp = await br.converse(
                modelId=model,
                system=system,
                messages=messages,
                toolConfig={"tools": _WA_TOOLS},
                inferenceConfig={"maxTokens": 300, "temperature": 0.3},
            )
            msg = resp["output"]["message"]
            messages.append(msg)
            if resp.get("stopReason") == "tool_use":
                results = []
                for b in msg.get("content", []):
                    if "toolUse" in b:
                        tu = b["toolUse"]
                        out = await _run_wa_tool(tu["name"], tu.get("input") or {}, appts)
                        results.append(
                            {"toolResult": {"toolUseId": tu["toolUseId"], "content": [{"json": out}]}}
                        )
                messages.append({"role": "user", "content": results})
                continue
            texts = [b["text"] for b in msg.get("content", []) if "text" in b]
            reply = " ".join(t.strip() for t in texts).strip()
            return reply or None
    return None


async def handle_inbound(from_number: str | None, body: str | None) -> str:
    """Process an inbound WhatsApp message; returns the text to reply with.

    An LLM assistant (with cancel / update-name tools) handles the conversation,
    grounded in the caller's own appointment context. Falls back to a static menu
    if the model is unavailable.
    """
    phone = _norm_phone(from_number)
    text = " ".join((body or "").strip().split())
    sb = get_supabase()
    if not sb or not phone:
        return "Sorry, we couldn't process that right now."

    # A phone may belong to several patients (a son booking for his parents).
    def _patients():
        return (
            sb.table("patients")
            .select("id,name,ref_code")
            .ilike("phone_primary", f"%{phone_tail(phone)}")
            .order("created_at")
            .execute()
        )

    patients = (await asyncio.to_thread(_patients)).data or []

    # Every active appointment across those patients, with name + doctor attached.
    appts: list = []
    if patients:
        ids = [p["id"] for p in patients]
        pmap = {p["id"]: p for p in patients}

        def _appts():
            return (
                sb.table("appointments")
                .select("id,ref_code,status,scheduled_at,doctor_id,patient_id")
                .in_("patient_id", ids)
                .in_("status", ["confirmed", "pending_confirmation"])
                .order("scheduled_at")
                .execute()
            )

        appts = (await asyncio.to_thread(_appts)).data or []
        doc_ids = list({a["doctor_id"] for a in appts if a.get("doctor_id")})
        docs: dict = {}
        if doc_ids:
            def _docs():
                return sb.table("doctors").select("id,name_en,name_ar").in_("id", doc_ids).execute()

            for d in (await asyncio.to_thread(_docs)).data or []:
                docs[d["id"]] = d.get("name_en") or d.get("name_ar")
        for a in appts:
            p = pmap.get(a["patient_id"], {})
            a["_patient_name"] = p.get("name")
            a["_patient_ref"] = p.get("ref_code")
            a["_doctor_name"] = docs.get(a.get("doctor_id"))

    # The LLM assistant handles the conversation, remembers the recent turns, and
    # disambiguates between people on this number.
    history = await _load_history(phone)
    try:
        reply = await _ai_reply(patients, appts, text, history)
        if reply:
            await _save_message(phone, "user", text)
            await _save_message(phone, "assistant", reply)
            return reply
    except Exception as e:
        logger.warning(f"WhatsApp AI assistant failed, using menu: {e}")
    return _fallback_menu(appts)
