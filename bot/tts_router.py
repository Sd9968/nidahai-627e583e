"""Bilingual TTS via direct Polly + Munsit HTTP (no nested TTSService).

Nested TTSService children are not pipeline-linked (no TaskManager), which
caused sample_rate=0 crashes. This service calls the APIs itself and always
emits 8 kHz PCM for Twilio.
"""

from __future__ import annotations

import os
import re
from collections.abc import AsyncGenerator

import aiohttp
import aiobotocore.session
from loguru import logger
from pipecat.audio.utils import create_stream_resampler
from pipecat.frames.frames import ErrorFrame, Frame, TTSAudioRawFrame
from pipecat.services.settings import TTSSettings
from pipecat.services.tts_service import TTSService, TextAggregationMode

_ARABIC_CHAR = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")
_SEGMENT = re.compile(
    r"([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s،؟؛]+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)"
)


def split_by_language(text: str) -> list[tuple[str, str]]:
    """Split text into (lang, segment) where lang is 'ar' or 'en'."""
    text = text.strip()
    if not text:
        return []

    segments: list[tuple[str, str]] = []
    for match in _SEGMENT.finditer(text):
        chunk = match.group(0).strip()
        if not chunk:
            continue
        letters = [c for c in chunk if c.isalpha() or _ARABIC_CHAR.match(c)]
        if not letters:
            if segments:
                prev_lang, prev = segments[-1]
                segments[-1] = (prev_lang, f"{prev} {chunk}")
            else:
                segments.append(("en", chunk))
            continue
        ar_count = sum(1 for c in letters if _ARABIC_CHAR.match(c))
        lang = "ar" if ar_count / len(letters) >= 0.25 else "en"
        if (
            lang == "en"
            and segments
            and segments[-1][0] == "ar"
            and " " not in chunk
            and len(letters) <= 12
        ):
            prev_lang, prev = segments[-1]
            segments[-1] = (prev_lang, f"{prev} {chunk}")
            continue
        segments.append((lang, chunk))

    return segments or [("en", text)]


class BilingualTTSService(TTSService):
    """Arabic → Munsit (Polly Hala fallback); English → Polly Joanna."""

    def __init__(
        self,
        *,
        sample_rate: int = 8000,
        text_aggregation_mode: TextAggregationMode = TextAggregationMode.SENTENCE,
        **kwargs,
    ):
        super().__init__(
            sample_rate=sample_rate,
            push_start_frame=True,
            push_stop_frames=True,
            text_aggregation_mode=text_aggregation_mode,
            settings=TTSSettings(model=None, voice=None, language=None),
            **kwargs,
        )
        self._out_rate = sample_rate
        self._region = os.getenv("AWS_REGION", "ap-south-1")
        self._access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self._secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self._polly_voice_en = os.getenv("POLLY_VOICE_EN", "Joanna")
        self._polly_voice_ar = os.getenv("POLLY_VOICE_AR", "Hala")
        self._polly_engine = os.getenv("POLLY_ENGINE", "neural")
        self._munsit_key = os.getenv("MUNSIT_API_KEY")
        # For lowest latency on phone, prefer Polly for AR too (set TTS_AR_PROVIDER=polly)
        self._tts_ar = os.getenv("TTS_AR_PROVIDER", "munsit").lower().strip()
        self._munsit_voice = os.getenv("MUNSIT_VOICE_ID", "ar-hijazi-female-2")
        self._munsit_model = os.getenv("MUNSIT_TTS_MODEL", "faseeh-v1-preview")
        self._munsit_base = os.getenv("MUNSIT_TTS_BASE_URL", "https://api.munsit.com/api/v1")
        self._session = aiobotocore.session.get_session()
        self._http: aiohttp.ClientSession | None = None
        # Separate resamplers — SOXR streams cannot change input rate mid-life
        self._resampler_polly = create_stream_resampler()
        self._resampler_munsit = create_stream_resampler()
        self._munsit_ok = bool(self._munsit_key) and self._tts_ar != "polly"

        logger.info(
            f"TTS routing: EN→Polly/{self._polly_voice_en}, "
            f"AR→{'Munsit' if self._munsit_ok else f'Polly/{self._polly_voice_ar}'} "
            f"(agg={text_aggregation_mode})"
        )

    def can_generate_metrics(self) -> bool:
        """Enable TTFB/usage metrics for this service.

        FrameProcessor.can_generate_metrics() defaults to False, so without this
        override every start/stop_ttfb_metrics() call below is silently dropped and
        TTS never appears in the latency numbers (STT and LLM do, because the AWS
        services override it).
        """
        return True

    async def _http_session(self) -> aiohttp.ClientSession:
        if self._http is None or self._http.closed:
            self._http = aiohttp.ClientSession()
        return self._http

    async def cleanup(self):
        if self._http and not self._http.closed:
            await self._http.close()
        await super().cleanup()

    async def _chunk_pcm(self, pcm: bytes, context_id: str) -> AsyncGenerator[Frame, None]:
        rate = self.sample_rate or self._out_rate or 8000
        chunk_size = max(int(rate * 0.5 * 2), 320)  # ~0.5s of 16-bit mono
        for i in range(0, len(pcm), chunk_size):
            chunk = pcm[i : i + chunk_size]
            if chunk:
                yield TTSAudioRawFrame(chunk, rate, 1, context_id=context_id)

    async def _polly(self, text: str, voice: str, language: str, context_id: str) -> AsyncGenerator[Frame, None]:
        rate = self.sample_rate or self._out_rate or 8000
        ssml = f"<speak><lang xml:lang='{language}'>{text}</lang></speak>"
        params = {
            "Text": ssml,
            "TextType": "ssml",
            "OutputFormat": "pcm",
            "VoiceId": voice,
            "Engine": self._polly_engine,
            "SampleRate": "16000",
        }
        logger.debug(f"Polly/{voice}: {text[:80]}...")
        try:
            async with self._session.create_client(
                "polly",
                region_name=self._region,
                aws_access_key_id=self._access_key,
                aws_secret_access_key=self._secret_key,
            ) as polly:
                resp = await polly.synthesize_speech(**params)
                stream = resp.get("AudioStream")
                if not stream:
                    yield ErrorFrame(error="Polly returned no audio stream")
                    return
                audio_16k = await stream.read()
                audio = await self._resampler_polly.resample(audio_16k, 16000, rate)
                await self.start_tts_usage_metrics(text)
                await self.stop_ttfb_metrics()
                async for frame in self._chunk_pcm(audio, context_id):
                    yield frame
        except Exception as exc:
            logger.error(f"Polly TTS failed: {exc}")
            yield ErrorFrame(error=f"Polly TTS error: {exc}")

    async def _munsit(self, text: str, context_id: str) -> AsyncGenerator[Frame, None]:
        rate = self.sample_rate or self._out_rate or 8000
        # Munsit streaming often prefers 24k/48k; request 24000 then resample to 8k
        req_rate = 24000
        url = f"{self._munsit_base}/text-to-speech/{self._munsit_model}"
        headers = {"x-api-key": self._munsit_key or "", "Content-Type": "application/json"}
        payload = {
            "voice_id": self._munsit_voice,
            "text": text,
            "model": self._munsit_model,
            "streaming": True,
            "sample_rate": req_rate,
        }
        logger.debug(f"Munsit/{self._munsit_voice}: {text[:80]}...")
        try:
            session = await self._http_session()
            async with session.post(
                url,
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30),
            ) as response:
                if response.status != 200:
                    err = await response.text()
                    raise RuntimeError(f"HTTP {response.status}: {err[:200]}")
                await self.start_tts_usage_metrics(text)
                buf = bytearray()
                async for chunk, _ in response.content.iter_chunks():
                    if not chunk:
                        continue
                    buf.extend(chunk)
                    # Emit ASAP — was 3200; lower = faster first audio
                    aligned = len(buf) & ~1
                    if aligned < 640:
                        continue
                    raw = bytes(buf[:aligned])
                    del buf[:aligned]
                    pcm = await self._resampler_munsit.resample(raw, req_rate, rate)
                    await self.stop_ttfb_metrics()
                    async for frame in self._chunk_pcm(pcm, context_id):
                        yield frame
                if buf:
                    aligned = len(buf) & ~1
                    if aligned:
                        pcm = await self._resampler_munsit.resample(
                            bytes(buf[:aligned]), req_rate, rate
                        )
                        async for frame in self._chunk_pcm(pcm, context_id):
                            yield frame
        except Exception as exc:
            logger.warning(f"Munsit TTS failed ({exc}); falling back to Polly {self._polly_voice_ar}")
            self._munsit_ok = False
            async for frame in self._polly(text, self._polly_voice_ar, "ar-AE", context_id):
                yield frame

    async def run_tts(self, text: str, context_id: str) -> AsyncGenerator[Frame, None]:
        await self.start_ttfb_metrics()
        segments = split_by_language(text)
        if not segments:
            return

        for lang, segment in segments:
            if len(segment.strip()) < 2:
                continue
            if lang == "ar":
                if self._munsit_ok:
                    async for frame in self._munsit(segment, context_id):
                        yield frame
                else:
                    async for frame in self._polly(
                        segment, self._polly_voice_ar, "ar-AE", context_id
                    ):
                        yield frame
            else:
                async for frame in self._polly(
                    segment, self._polly_voice_en, "en-US", context_id
                ):
                    yield frame


def build_tts(
    text_aggregation_mode: TextAggregationMode = TextAggregationMode.SENTENCE,
) -> BilingualTTSService:
    return BilingualTTSService(
        sample_rate=8000,
        text_aggregation_mode=text_aggregation_mode,
    )
