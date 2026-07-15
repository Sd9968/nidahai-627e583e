"""STT: a single AWS Transcribe service, fixed to STT_DEFAULT_LANG for the call.

There is no spoken language menu any more — the greeting is bilingual and the
caller just talks (see instructions.build_greeting).

Caveat: Transcribe is monolingual per stream, so a caller who speaks the other
language is transcribed as gibberish rather than detected. Real bilingual support
needs Transcribe's IdentifyLanguage (not exposed by pipecat's service) or an STT
that returns a language code.
"""

from __future__ import annotations

import os

from loguru import logger
from pipecat.services.aws.stt import AWSTranscribeSTTService
from pipecat.transcriptions.language import Language


def build_stt() -> AWSTranscribeSTTService:
    region = os.getenv("AWS_REGION", "ap-south-1")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    default_lang = os.getenv("STT_DEFAULT_LANG", "en").lower().strip()
    if default_lang not in ("ar", "en"):
        default_lang = "en"

    language = Language.AR_AE if default_lang == "ar" else Language.EN_US
    # MUST match the pipeline/Twilio input rate (8 kHz). pipecat does NOT resample
    # audio before STT (see stt_service.py process_audio_frame), so a 16 kHz setting
    # here makes AWS Transcribe read 8 kHz audio as 16 kHz → empty/garbage transcripts
    # and the bot never responds. AWS Transcribe streaming supports 8 kHz for all
    # languages, including ar-AE, so the Arabic relock still works at 8 kHz.
    stt = AWSTranscribeSTTService(
        region=region,
        aws_access_key_id=access_key,
        api_key=secret_key,
        sample_rate=8000,
        settings=AWSTranscribeSTTService.Settings(language=language),
    )
    logger.info(f"STT: AWS Transcribe start={language} (locked after language selection)")
    return stt
