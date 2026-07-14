"""STT: a single AWS Transcribe service.

Language is chosen once by voice at the start of the call (see language_gate.py).
We start in English so "English" / early speech is heard; the gate only reconnects
when the caller picks Arabic (reconnects are expensive — avoid them for English).
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
