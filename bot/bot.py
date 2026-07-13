"""NidahAI — bilingual (Arabic Gulf + English) appointment voice agent."""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.transports.base_transport import BaseTransport
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams

from safety import SafetyProcessor
from stt_router import build_stt
from tools import register_tools
from tts_router import build_tts

load_dotenv(override=True)

PRODUCT = os.getenv("PRODUCT_NAME", "NidahAI")
CLINIC_ID = os.getenv("CLINIC_ID", "")

SYSTEM_PROMPT = f"""You are {PRODUCT}, a bilingual voice receptionist for a medical clinic in Saudi Arabia.
You speak fluent Arabic (Gulf dialect) and English, and naturally code-switch when the patient does.

Your job:
- Book, reschedule, and cancel appointments
- Answer clinic hours, location, and doctor questions
- Escalate emergencies and human requests immediately

Rules:
- Never invent available slots — only use get_available_slots tool results
- Never book without explicit patient confirmation after reading back the slot
- Never diagnose, discuss symptoms in clinical detail, or store medical notes
- Keep replies short (1–2 sentences) — they will be spoken aloud
- No emojis, markdown, or special characters
- Prefer Arabic (Gulf) unless the patient speaks English
- If unsure, call escalate_to_human with a reason code
- Max 15 turns; if stuck, escalate

Consent: At the start of the call you must confirm recording consent before booking.
"""


def _build_llm():
    """Prefer Anthropic direct API for local dev; Bedrock when USE_BEDROCK=true."""
    use_bedrock = os.getenv("USE_BEDROCK", "false").lower() == "true"
    if use_bedrock:
        from pipecat.services.aws.llm import AWSBedrockLLMService

        return AWSBedrockLLMService(
            model=os.getenv("BEDROCK_MODEL_ID", "global.anthropic.claude-sonnet-4-6"),
            aws_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            aws_region=os.getenv("AWS_REGION", "ap-south-1"),
            params=AWSBedrockLLMService.InputParams(temperature=0.2, max_tokens=400),
        )

    from pipecat.services.anthropic.llm import AnthropicLLMService

    return AnthropicLLMService(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        model="claude-sonnet-4-6",
        params=AnthropicLLMService.InputParams(temperature=0.2, max_tokens=400),
    )


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    logger.info(f"Starting {PRODUCT} bot (clinic={CLINIC_ID or 'unset'})")

    stt_processors = build_stt()  # Munsit (AR) + AWS Transcribe (EN)

    llm = _build_llm()
    tts = build_tts()
    safety = SafetyProcessor()

    tools = register_tools(llm, clinic_id=CLINIC_ID)

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    context = LLMContext(messages=messages, tools=tools)
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            *stt_processors,
            safety,
            user_aggregator,
            llm,
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
        # Keep each language as one continuous block so TTS routing stays clean
        # (do not embed Latin brand names inside Arabic sentences).
        greeting_ar = (
            "مرحباً، أنا المساعد الصوتي لنداه. "
            "هذه المكالمة قد تُسجَّل لإدارة المواعيد. هل توافق؟"
        )
        greeting_en = (
            f"Hello, I'm the {PRODUCT} voice assistant. "
            "This call may be recorded for appointment management. Do you consent?"
        )
        await task.queue_frames(
            [
                TTSSpeakFrame(text=greeting_ar),
                TTSSpeakFrame(text=greeting_en),
            ]
        )

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        await task.cancel()

    runner = PipelineRunner(handle_sigint=getattr(runner_args, "handle_sigint", True))
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    transport_params = {
        "twilio": lambda: FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
        "webrtc": lambda: FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    }
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
