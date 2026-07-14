"""Front-of-call spoken language selection (no keypad).

Caller says Arabic or English (or just starts talking). Until then we hold
speech so the LLM does not answer in the wrong language.

IMPORTANT: do NOT reconnect AWS Transcribe when the chosen language already
matches the current STT language — a reconnect was causing ~15–20s of silence
and missed user turns.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from loguru import logger
from pipecat.frames.frames import (
    Frame,
    InterimTranscriptionFrame,
    TTSSpeakFrame,
    TranscriptionFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.services.settings import STTSettings
from pipecat.transcriptions.language import Language

from instructions import CONSENT, LANGUAGE_MENU_RETRY, SPOKEN_AR, SPOKEN_EN

_ARABIC_CHAR = re.compile(
    r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]"
)


@dataclass
class CallState:
    """Shared per-call language state."""

    language: str | None = None  # 'ar' | 'en', None until chosen
    selected: bool = False


def _detect_spoken_choice(text: str) -> str | None:
    """Map a spoken utterance to 'ar'/'en', or None if unclear."""
    low = text.strip().lower()
    if not low:
        return None
    if any(w in low for w in SPOKEN_EN):
        return "en"
    if any(w in low for w in SPOKEN_AR):
        return "ar"
    # Any clear speech: lock to script (so "I need an appointment" → English)
    letters = [c for c in text if c.isalpha() or _ARABIC_CHAR.match(c)]
    if len(letters) >= 2:
        ar = sum(1 for c in letters if _ARABIC_CHAR.match(c))
        return "ar" if ar / len(letters) >= 0.25 else "en"
    return None


def _is_language_only(text: str) -> bool:
    """True if the utterance is just picking a language (not a real request)."""
    low = text.strip().lower()
    tokens = [t for t in re.split(r"\s+", low) if t]
    if len(tokens) > 3:
        return False
    return any(w in low for w in SPOKEN_EN) or any(w in low for w in SPOKEN_AR)


class LanguageGate(FrameProcessor):
    """Blocks speech until a language is chosen, then locks STT if needed."""

    def __init__(
        self,
        *,
        state: CallState,
        stt: AWSTranscribeSTTService,
        initial_lang: str = "en",
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._state = state
        self._stt = stt
        self._stt_lang = initial_lang  # what Transcribe is currently set to
        self._pending_user_text: str | None = None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._state.selected:
            await self.push_frame(frame, direction)
            return

        # Spoken selection only — ignore / drop DTMF if any arrives
        if isinstance(frame, (TranscriptionFrame, InterimTranscriptionFrame)):
            if isinstance(frame, TranscriptionFrame) and frame.text:
                text = frame.text.strip()
                choice = _detect_spoken_choice(text)
                if choice:
                    # Keep real requests (e.g. "I need an appointment") for the LLM
                    if not _is_language_only(text):
                        self._pending_user_text = text
                    await self._select(choice)
                else:
                    # Unclear — re-prompt, do not forward yet
                    logger.debug(f"Language unclear from: {text!r}")
                    await self.push_frame(
                        TTSSpeakFrame(LANGUAGE_MENU_RETRY),
                        FrameDirection.DOWNSTREAM,
                    )
            return

        await self.push_frame(frame, direction)

    async def _select(self, language: str):
        if self._state.selected:
            return
        self._state.language = language
        self._state.selected = True
        logger.info(f"Language selected: {language}")

        # Only reconnect Transcribe when language actually changes
        if language != self._stt_lang:
            lang_enum = Language.AR_AE if language == "ar" else Language.EN_US
            try:
                logger.info(f"STT relock {self._stt_lang} → {language}")
                await self._stt._update_settings(STTSettings(language=lang_enum))
                self._stt_lang = language
            except Exception as exc:
                logger.warning(f"STT relock to {language} failed: {exc}")
        else:
            logger.info(f"STT already {language} — skip reconnect")

        await self.push_frame(TTSSpeakFrame(CONSENT[language]), FrameDirection.DOWNSTREAM)

        # If first utterance was a real request, feed it to the LLM after consent
        if self._pending_user_text:
            pending = self._pending_user_text
            self._pending_user_text = None
            logger.info(f"Forwarding first request to LLM: {pending[:80]!r}")
            await self.push_frame(
                TranscriptionFrame(
                    text=pending,
                    user_id="",
                    timestamp="",
                ),
                FrameDirection.DOWNSTREAM,
            )
