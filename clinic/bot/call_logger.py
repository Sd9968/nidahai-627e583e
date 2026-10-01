"""Persist call rows + conversation turns to Supabase for the staff CRM."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Literal

from loguru import logger
from pipecat.frames.frames import (
    Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    TranscriptionFrame,
    TTSSpeakFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from tools import get_supabase


class CallSession:
    """Creates a `calls` row and appends `conversation_turns` as the call progresses."""

    def __init__(
        self,
        clinic_id: str = "",
        twilio_call_sid: str | None = None,
        from_number: str | None = None,
    ):
        self._clinic_id = clinic_id or os.getenv("CLINIC_ID", "")
        self._twilio_call_sid = twilio_call_sid
        self._from_number = from_number
        self._call_id: str | None = None
        self._turn = 0
        self._language: str | None = None
        self._outcome = "completed"
        self._lock = asyncio.Lock()

    @property
    def call_id(self) -> str | None:
        return self._call_id

    def set_language(self, lang: str | None) -> None:
        self._language = lang
        if self._call_id and lang:
            asyncio.create_task(self._patch({"language": lang}))

    def set_outcome(self, outcome: str) -> None:
        self._outcome = outcome

    async def start(self) -> str | None:
        sb = get_supabase()
        if not sb:
            logger.warning("CallSession: Supabase not configured — CRM logging disabled")
            return None
        row: dict[str, Any] = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "outcome": "in_progress",
            "consent_recorded": False,
        }
        if self._clinic_id:
            row["clinic_id"] = self._clinic_id
        if self._twilio_call_sid:
            row["twilio_call_sid"] = self._twilio_call_sid
        try:
            res = sb.table("calls").insert(row).execute()
            if res.data:
                self._call_id = res.data[0]["id"]
                logger.info(
                    f"CallSession: started call_id={self._call_id} sid={self._twilio_call_sid}"
                )
                asyncio.create_task(self._maybe_start_twilio_recording())
                return self._call_id
        except Exception as e:
            logger.error(f"CallSession: failed to create call row: {e}")
        return None

    async def finish(self, summary: str | None = None) -> None:
        if not self._call_id:
            return
        recording_key = await self._fetch_and_store_recording()
        patch: dict[str, Any] = {
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "outcome": self._outcome or "completed",
        }
        if self._language:
            patch["language"] = self._language
        if summary:
            patch["ai_summary"] = summary
        elif self._turn:
            patch["ai_summary"] = f"Voice session · {self._turn} turns"
        if recording_key:
            patch["recording_s3_key"] = recording_key
        await self._patch(patch)
        logger.info(f"CallSession: finished call_id={self._call_id} recording={recording_key}")

    async def log_turn(self, speaker: str, text: str, language: str | None = None) -> None:
        text = (text or "").strip()
        if not text or not self._call_id:
            return
        if speaker not in ("patient", "ai", "system"):
            speaker = "system"
        async with self._lock:
            self._turn += 1
            turn_number = self._turn
        sb = get_supabase()
        if not sb:
            return
        row = {
            "call_id": self._call_id,
            "turn_number": turn_number,
            "speaker": speaker,
            "transcript_text": text[:4000],
            "language": language or self._language,
        }
        try:
            await asyncio.to_thread(lambda: sb.table("conversation_turns").insert(row).execute())
        except Exception as e:
            logger.warning(f"CallSession: turn insert failed: {e}")

    async def _patch(self, fields: dict[str, Any]) -> None:
        if not self._call_id:
            return
        sb = get_supabase()
        if not sb:
            return
        try:
            await asyncio.to_thread(
                lambda: sb.table("calls").update(fields).eq("id", self._call_id).execute()
            )
        except Exception as e:
            logger.warning(f"CallSession: patch failed: {e}")

    async def _maybe_start_twilio_recording(self) -> None:
        if not self._twilio_call_sid:
            return
        if os.getenv("TWILIO_RECORD_CALLS", "true").lower() not in ("1", "true", "yes"):
            return
        sid = os.getenv("TWILIO_ACCOUNT_SID")
        token = os.getenv("TWILIO_AUTH_TOKEN")
        if not sid or not token:
            return
        try:
            from twilio.rest import Client

            client = Client(sid, token)
            await asyncio.to_thread(
                lambda: client.calls(self._twilio_call_sid).recordings.create(
                    recording_channels="dual",
                )
            )
            logger.info(f"CallSession: Twilio recording started for {self._twilio_call_sid}")
        except Exception as e:
            logger.warning(f"CallSession: could not start Twilio recording: {e}")

    async def _fetch_and_store_recording(self) -> str | None:
        """Download Twilio recording (if any) and upload to S3. Returns object key."""
        if not self._twilio_call_sid:
            return None
        account = os.getenv("TWILIO_ACCOUNT_SID")
        token = os.getenv("TWILIO_AUTH_TOKEN")
        bucket = os.getenv("S3_RECORDINGS_BUCKET")
        if not account or not token or not bucket:
            logger.info("CallSession: skip recording upload (Twilio/S3 not fully configured)")
            return None

        try:
            from twilio.rest import Client
            import httpx
            import boto3

            client = Client(account, token)

            def _list():
                return list(client.recordings.list(call_sid=self._twilio_call_sid, limit=5))

            # A recording started mid-call needs a few seconds to finalize after
            # the call ends. Poll for it to appear AND reach "completed" before the
            # .mp3 media is fetchable — otherwise the media URL 404s (the bug we hit).
            rec = None
            for attempt in range(8):  # ~ up to 28s total
                recordings = await asyncio.to_thread(_list)
                if recordings:
                    rec = recordings[0]
                    status = getattr(rec, "status", None)
                    if status == "completed":
                        break
                    if status in ("failed", "absent"):
                        logger.warning(f"CallSession: recording {rec.sid} status={status}; skipping")
                        return None
                await asyncio.sleep(2 + attempt)  # backoff: 2,3,4,...

            if not rec:
                logger.info("CallSession: no Twilio recording found for call; skipping upload")
                return None
            if getattr(rec, "status", None) != "completed":
                logger.warning(
                    f"CallSession: recording {rec.sid} not completed in time "
                    f"(status={getattr(rec, 'status', None)}); skipping upload"
                )
                return None

            media_url = (
                f"https://api.twilio.com/2010-04-01/Accounts/{account}"
                f"/Recordings/{rec.sid}.mp3"
            )

            async with httpx.AsyncClient(timeout=60.0) as http:
                body = None
                for attempt in range(4):  # media can lag status briefly → retry 404
                    resp = await http.get(media_url, auth=(account, token))
                    if resp.status_code == 404:
                        await asyncio.sleep(2 + attempt)
                        continue
                    resp.raise_for_status()
                    body = resp.content
                    break
                if body is None:
                    logger.warning(f"CallSession: recording media {rec.sid}.mp3 still 404 after retries")
                    return None

            key = f"calls/{self._call_id or self._twilio_call_sid}/{rec.sid}.mp3"
            region = os.getenv("AWS_REGION", "ap-south-1")

            def _upload():
                s3 = boto3.client("s3", region_name=region)
                s3.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=body,
                    ContentType="audio/mpeg",
                )

            await asyncio.to_thread(_upload)
            logger.info(f"CallSession: uploaded recording s3://{bucket}/{key}")
            return key
        except Exception as e:
            logger.warning(f"CallSession: recording upload failed: {e}")
            return None


class CallTurnProbe(FrameProcessor):
    """Pipeline probe that forwards transcripts / LLM text into a CallSession.

    Insert once after STT/safety (`mode=user`) and once after the LLM (`mode=ai`).
    """

    def __init__(
        self,
        session: CallSession,
        mode: Literal["user", "ai"],
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._session = session
        self._mode = mode
        self._ai_buf: list[str] = []

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._mode == "user":
            if isinstance(frame, TranscriptionFrame) and frame.text and frame.text.strip():
                await self._session.log_turn("patient", frame.text)
        else:
            if isinstance(frame, LLMFullResponseStartFrame):
                self._ai_buf = []
            elif isinstance(frame, LLMTextFrame) and frame.text:
                self._ai_buf.append(frame.text)
            elif isinstance(frame, LLMFullResponseEndFrame):
                text = "".join(self._ai_buf).strip()
                self._ai_buf = []
                if text:
                    await self._session.log_turn("ai", text)
            elif isinstance(frame, TTSSpeakFrame) and getattr(frame, "text", None):
                await self._session.log_turn("ai", frame.text)

        await self.push_frame(frame, direction)


# Backwards-compatible alias
CallLogger = CallSession
