"""Front-of-call language selection.

The caller hears one bilingual line ("قل: عربي / say: English") and answers.
Nothing reaches the LLM until they have chosen; once they do, the choice is
locked for the call, STT is re-pointed at that language, and the recording
disclosure is spoken in it.

Why keyword matching, and nothing cleverer
------------------------------------------
STT runs in en-US for this turn, so it emits Latin text whatever is spoken. The
previous gate inferred the language from the SCRIPT of that text — which is
always Latin — so it always chose English and Arabic was unreachable: a caller
saying "Arabic" was transcribed "Mhm" and locked into English.

So: match words, and when unsure re-prompt rather than guess. Because the
recognizer is listening in English, an Arabic speaker saying "عربي" comes back
mangled — hence the deliberately generous list of Latin spellings below.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from loguru import logger
from pipecat.frames.frames import (
    Frame,
    InterimTranscriptionFrame,
    TranscriptionFrame,
    TTSSpeakFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.services.settings import STTSettings
from pipecat.transcriptions.language import Language

from instructions import CLARIFY_RETRY, CONSENT

# How the caller may ask for Arabic. Includes what en-US Transcribe tends to
# produce for "عربي"/"Arabic" — it will not return Arabic script here.
SPOKEN_AR = (
    "arabic", "arabik", "arabi", "araby", "arabe", "arab", "3arabi",
    "al arabi", "alarabi", "arabee", "aravi", "arrabi", "urubi", "arabic please",
    "عربي", "العربية", "عربية", "بالعربي", "بالعربية",
)

# How the caller may ask for English.
SPOKEN_EN = (
    "english", "inglish", "englist", "anglais", "ingles", "englsh",
    "in english", "english please",
    "انجليزي", "إنجليزي", "الإنجليزية", "بالانجليزي", "بالإنجليزي",
)

# Give up guessing after this many unclear answers and just pick DEFAULT_LANG.
MAX_RETRIES = 2
DEFAULT_LANG = "ar"  # Saudi clinic: Arabic is the safer assumption


@dataclass
class CallState:
    """Shared per-call language state."""

    language: str | None = None  # 'ar' | 'en', None until chosen
    selected: bool = False


def _normalize(text: str) -> str:
    """Lowercase and strip punctuation so 'Arabic.' and 'arabic' match."""
    return re.sub(r"[^\w\s؀-ۿ]", " ", (text or "").lower()).strip()


def detect_language_choice(text: str) -> str | None:
    """'ar' | 'en' from what the caller said, or None if it isn't a choice.

    Deliberately returns None rather than falling back to a default — guessing
    here is what made Arabic unreachable before.
    """
    low = _normalize(text)
    if not low:
        return None
    words = set(low.split())
    # Whole-word match first: avoids "arab" firing inside an unrelated word.
    for w in SPOKEN_AR:
        if w in words or (" " in w and w in low):
            return "ar"
    for w in SPOKEN_EN:
        if w in words or (" " in w and w in low):
            return "en"
    # Substring fallback, for STT running words together ("sayarabic").
    if any(w in low for w in ("arabic", "arabi", "araby", "عربي")):
        return "ar"
    if any(w in low for w in ("english", "inglish", "انجليزي")):
        return "en"
    return None


class LanguageGate(FrameProcessor):
    """Holds back speech until the caller picks a language, then locks it in."""

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
        self._retries = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._state.selected:
            await self.push_frame(frame, direction)
            return

        # Before a choice is made, hold every transcript back from the LLM.
        if isinstance(frame, (TranscriptionFrame, InterimTranscriptionFrame)):
            if isinstance(frame, TranscriptionFrame) and frame.text:
                await self._handle_choice(frame.text.strip())
            return

        await self.push_frame(frame, direction)

    async def _handle_choice(self, text: str):
        choice = detect_language_choice(text)
        if choice:
            await self._select(choice)
            return

        self._retries += 1
        logger.debug(f"Language unclear from {text!r} (attempt {self._retries})")
        if self._retries >= MAX_RETRIES:
            # Stop asking. A caller stuck in a menu is worse than a wrong guess
            # they can correct by just speaking their language.
            logger.info(f"Language still unclear; defaulting to {DEFAULT_LANG}")
            await self._select(DEFAULT_LANG)
            return
        await self.push_frame(TTSSpeakFrame(CLARIFY_RETRY), FrameDirection.DOWNSTREAM)

    async def _select(self, language: str):
        if self._state.selected:
            return
        self._state.language = language
        self._state.selected = True
        logger.info(f"Language selected: {language}")

        # Only reconnect Transcribe when the language actually changes — a
        # reconnect costs a couple of seconds of deafness mid-call.
        if language != self._stt_lang:
            lang_enum = Language.AR_AE if language == "ar" else Language.EN_US
            try:
                logger.info(f"STT relock {self._stt_lang} -> {language}")
                await self._stt._update_settings(STTSettings(language=lang_enum))
                self._stt_lang = language
            except Exception as exc:
                logger.warning(f"STT relock to {language} failed: {exc}")
        else:
            logger.info(f"STT already {language} - skip reconnect")

        await self.push_frame(TTSSpeakFrame(CONSENT[language]), FrameDirection.DOWNSTREAM)
