"""Deterministic safety checks before LLM — emergencies, human requests, turn limits."""

from __future__ import annotations

import re

from loguru import logger
from pipecat.frames.frames import Frame, TextFrame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

EMERGENCY_PATTERNS = [
    r"chest pain",
    r"can'?t breathe",
    r"cannot breathe",
    r"bleeding",
    r"unconscious",
    r"heart attack",
    r"stroke",
    r"suicid",
    r"ألم في الصدر",
    r"ما أقدر أتنفس",
    r"لا أستطيع التنفس",
    r"نزيف",
    r"فاقد الوعي",
    r"جلطة",
]

HUMAN_REQUEST_PATTERNS = [
    r"speak to (a |someone|a person|an? agent|a human|staff)",
    r"talk to (a |someone|a person|an? agent|a human|staff)",
    r"real person",
    r"human (please|agent)",
    r"operator",
    r"أبي أكلم موظف",
    r"ابغى أكلم",
    r"موظف",
    r"بشري",
    r"شخص حقيقي",
]

MAX_TURNS = 15


class SafetyProcessor(FrameProcessor):
    """Flags emergencies / human requests; enforces max turn count."""

    def __init__(self, max_turns: int = MAX_TURNS, **kwargs):
        super().__init__(**kwargs)
        self._turn = 0
        self._max_turns = max_turns
        self._emergency_re = re.compile("|".join(EMERGENCY_PATTERNS), re.I)
        self._human_re = re.compile("|".join(HUMAN_REQUEST_PATTERNS), re.I)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame) and frame.text:
            text = frame.text.strip()
            if not text:
                await self.push_frame(frame, direction)
                return

            self._turn += 1

            if self._emergency_re.search(text):
                logger.warning(f"Emergency keyword detected: {text!r}")
                # Inject instruction for LLM via a follow-up system hint as TextFrame
                await self.push_frame(frame, direction)
                await self.push_frame(
                    TextFrame(
                        "SYSTEM: Emergency detected. Immediately tell the patient to "
                        "call emergency services (997 / 911) and call escalate_to_human "
                        "with reason=emergency. Do not continue booking."
                    ),
                    direction,
                )
                return

            if self._human_re.search(text):
                logger.info(f"Human request detected: {text!r}")
                await self.push_frame(frame, direction)
                await self.push_frame(
                    TextFrame(
                        "SYSTEM: Patient requested a human. Call escalate_to_human "
                        "with reason=patient_request and confirm a callback."
                    ),
                    direction,
                )
                return

            if self._turn >= self._max_turns:
                logger.info(f"Max turns ({self._max_turns}) reached")
                await self.push_frame(frame, direction)
                await self.push_frame(
                    TextFrame(
                        "SYSTEM: Max conversation turns reached. Call escalate_to_human "
                        "with reason=max_turns and offer a callback."
                    ),
                    direction,
                )
                return

        await self.push_frame(frame, direction)
