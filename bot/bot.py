"""NidahAI — bilingual (Arabic Gulf + English) appointment voice agent.

Latency notes
-------------
True <300ms speech-end → first-audio is NOT achievable on Twilio PSTN with
Bedrock Sonnet + Polly batch + ngrok. Your measured Bedrock TTFB alone was ~1.1s.

This file is tuned for the lowest practical latency on the current stack
(~600–1200ms on phone after optimizations). For a real <300ms budget you must
switch transport (WebRTC), STT (Deepgram/Assembly), LLM (Haiku/Flash/Groq),
and streaming TTS (Cartesia/Aura) — see LATENCY_MODE env and README.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.tts_service import TextAggregationMode
from pipecat.transports.base_transport import BaseTransport
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams

from call_logger import CallSession, CallTurnProbe
from instructions import PRODUCT, build_greeting, build_system_prompt
from safety import SafetyProcessor
from stt_router import build_stt
from tools import register_tools
from tts_router import build_tts

load_dotenv(override=True)

CLINIC_ID = os.getenv("CLINIC_ID", "")
# "fast" = Haiku + aggressive VAD + short replies
LATENCY_MODE = os.getenv("LATENCY_MODE", "fast").lower().strip()


def _build_llm():
    """Prefer a small fast model for voice TTFB; override via BEDROCK_MODEL_ID."""
    use_bedrock = os.getenv("USE_BEDROCK", "false").lower() == "true"
    # Haiku is ~3–5× faster TTFB than Sonnet — required for voice
    default_model = (
        "global.anthropic.claude-haiku-4-5-20251001"
        if LATENCY_MODE == "fast"
        else "global.anthropic.claude-sonnet-4-6"
    )
    model = os.getenv("BEDROCK_MODEL_ID", default_model)
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "80" if LATENCY_MODE == "fast" else "200"))
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))

    if use_bedrock:
        from pipecat.services.aws.llm import AWSBedrockLLMService

        # Bedrock "optimized" latency mode is NOT supported for every model/region
        # (e.g. Haiku 4.5 in ap-south-1 → ConverseStream ValidationException). Default
        # to "standard"; opt in with BEDROCK_LATENCY=optimized only where supported.
        bedrock_latency = os.getenv("BEDROCK_LATENCY", "standard").lower().strip()
        settings = AWSBedrockLLMService.Settings(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if bedrock_latency == "optimized":
            settings.latency = "optimized"
        logger.info(
            f"LLM: Bedrock {model} max_tokens={max_tokens} "
            f"latency={bedrock_latency} (latency_mode={LATENCY_MODE})"
        )
        return AWSBedrockLLMService(
            aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            aws_region=os.getenv("AWS_REGION", "ap-south-1"),
            settings=settings,
        )

    from pipecat.services.anthropic.llm import AnthropicLLMService

    # Direct Anthropic often beats Bedrock TTFB from India
    anthropic_model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    logger.info(f"LLM: Anthropic {anthropic_model} max_tokens={max_tokens}")
    return AnthropicLLMService(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        settings=AnthropicLLMService.Settings(
            model=anthropic_model,
            temperature=temperature,
            max_tokens=max_tokens,
        ),
    )


def _vad() -> SileroVADAnalyzer:
    # Slightly longer stop window so turn-end + STT final align better
    stop = float(os.getenv("VAD_STOP_SECS", "0.2" if LATENCY_MODE == "fast" else "0.25"))
    start = float(os.getenv("VAD_START_SECS", "0.1"))
    return SileroVADAnalyzer(params=VADParams(start_secs=start, stop_secs=stop))


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    logger.info(f"Starting {PRODUCT} bot (clinic={CLINIC_ID or 'unset'} latency={LATENCY_MODE})")

    # Call identity (needed before building tools so the WhatsApp confirmation can
    # go to the caller's own number / caller ID).
    call_data = getattr(runner_args, "call_data", None)
    twilio_sid = getattr(call_data, "call_id", None) if call_data else None
    from_number = getattr(call_data, "from_number", None) if call_data else None
    logger.info(f"Call context: sid={twilio_sid} from={from_number or '(resolve via Twilio)'}")

    stt = build_stt()
    llm = _build_llm()
    # SENTENCE mode: buffer a full sentence, then synthesize it in one Polly call.
    # Polly is a batch synthesizer, so TOKEN mode calls it per word and the speech
    # comes out choppy ("I ... am ... good"). SENTENCE gives natural prosody for a
    # small (~200-300ms) first-audio cost. Override with TTS_AGGREGATION=token.
    _agg = (
        TextAggregationMode.TOKEN
        if os.getenv("TTS_AGGREGATION", "sentence").lower().strip() == "token"
        else TextAggregationMode.SENTENCE
    )
    tts = build_tts(text_aggregation_mode=_agg)
    safety = SafetyProcessor()
    tools = register_tools(
        llm, clinic_id=CLINIC_ID, caller_number=from_number, call_sid=twilio_sid
    )

    # STT language. There is no spoken language menu any more: the greeting is
    # bilingual and the caller just talks. Transcribe is monolingual, so this is
    # the language the call is actually recognised in.
    default_lang = os.getenv("STT_DEFAULT_LANG", "en").lower().strip()
    if default_lang not in ("ar", "en"):
        default_lang = "en"

    call_session = CallSession(
        clinic_id=CLINIC_ID,
        twilio_call_sid=twilio_sid,
        from_number=from_number,
    )
    user_probe = CallTurnProbe(call_session, mode="user")
    ai_probe = CallTurnProbe(call_session, mode="ai")

    # Built per call so the date, time and time-of-day greeting are current.
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": build_system_prompt()},
    ]
    context = LLMContext(messages=messages, tools=tools)
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=_vad()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            safety,
            user_probe,
            user_aggregator,
            llm,
            ai_probe,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        await call_session.start()
        # One bilingual, time-aware line: greet, name the clinic, disclose
        # recording, invite the caller to talk. No language menu.
        await task.queue_frames([TTSSpeakFrame(text=build_greeting())])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        call_session.set_language(default_lang)
        await call_session.finish()
        await task.cancel()

    runner = PipelineRunner(handle_sigint=getattr(runner_args, "handle_sigint", True))
    await runner.run(task)


# Inbound WhatsApp replies from patients (Twilio posts here). Registered on the
# pipecat runner's FastAPI app, which is already public via the same ngrok tunnel.
# Point the Twilio WhatsApp sandbox "when a message comes in" webhook at:
#   https://<your-ngrok-domain>/whatsapp   (POST)
try:
    from fastapi import Request, Response
    from pipecat.runner.run import app as _runner_app

    from messaging import handle_inbound

    def _xml_escape(s: str) -> str:
        return (
            s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

    @_runner_app.post("/whatsapp")
    async def whatsapp_inbound(request: Request):  # noqa: D401
        form = await request.form()
        reply = await handle_inbound(form.get("From"), form.get("Body"))
        twiml = (
            "<?xml version='1.0' encoding='UTF-8'?>"
            f"<Response><Message>{_xml_escape(reply)}</Message></Response>"
        )
        return Response(content=twiml, media_type="application/xml")

    logger.info("Registered inbound WhatsApp webhook at POST /whatsapp")
except Exception as _exc:  # pragma: no cover - keep the bot up even if this fails
    logger.warning(f"Could not register /whatsapp route: {_exc}")


async def bot(runner_args: RunnerArguments):
    vad = _vad()
    transport_params = {
        "twilio": lambda: FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=vad,
        ),
        "webrtc": lambda: FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=vad,
        ),
    }
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
