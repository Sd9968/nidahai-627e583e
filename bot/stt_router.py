"""STT: single AWS Transcribe with sticky language switching.

Default is English so the bilingual consent greeting's "Do you consent?" / "yes"
path works. Switches to ar-AE when Arabic script is detected (and back).
"""

from __future__ import annotations

import os
import re
from typing import Any

from loguru import logger
from pipecat.frames.frames import Frame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.services.settings import STTSettings
from pipecat.transcriptions.language import Language

_ARABIC_CHAR = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")


def detect_transcript_lang(text: str) -> str:
    letters = [c for c in text if c.isalpha() or _ARABIC_CHAR.match(c)]
    if not letters:
        return "en"
    ar_count = sum(1 for c in letters if _ARABIC_CHAR.match(c))
    return "ar" if ar_count / len(letters) >= 0.25 else "en"


class STTLanguageSwitcher(FrameProcessor):
    """Update Transcribe language when transcript script changes."""

    def __init__(self, *, stt: AWSTranscribeSTTService, initial_lang: str = "en", **kwargs):
        super().__init__(**kwargs)
        self._stt = stt
        self._lang = initial_lang

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if (
            direction == FrameDirection.DOWNSTREAM
            and isinstance(frame, TranscriptionFrame)
            and frame.text
            and frame.text.strip()
        ):
            detected = detect_transcript_lang(frame.text)
            if detected != self._lang:
                lang_enum = Language.AR_AE if detected == "ar" else Language.EN_US
                logger.info(f"STT language switch: {self._lang} → {detected}")
                self._lang = detected
                # Changing language reconnects the Transcribe websocket
                await self._stt._update_settings(STTSettings(language=lang_enum))

        await self.push_frame(frame, direction)


def build_stt() -> list[Any]:
    region = os.getenv("AWS_REGION", "ap-south-1")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    # Default EN — greeting ends with English consent; "yes" must be heard
    default_lang = os.getenv("STT_DEFAULT_LANG", "en").lower().strip()
    if default_lang not in ("ar", "en"):
        default_lang = "en"

    language = Language.AR_AE if default_lang == "ar" else Language.EN_US
    # Always 16 kHz so Arabic switch works (Transcribe ar-* rejects 8 kHz)
    stt = AWSTranscribeSTTService(
        region=region,
        aws_access_key_id=access_key,
        api_key=secret_key,
        sample_rate=16000,
        settings=AWSTranscribeSTTService.Settings(language=language),
    )
    sticky = STTLanguageSwitcher(stt=stt, initial_lang=default_lang)
    logger.info(f"STT: AWS Transcribe ({language}) default={default_lang}")
    return [stt, sticky]
