#!/usr/bin/env python3
"""Verify AWS Polly TTS access (English Joanna + Arabic Hala)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def synth(text: str, voice: str, engine: str = "neural") -> bytes:
    import boto3

    client = boto3.client("polly", region_name=os.getenv("AWS_REGION", "ap-south-1"))
    params = {
        "Text": text,
        "OutputFormat": "pcm",
        "VoiceId": voice,
        "Engine": engine,
        "SampleRate": "16000",
    }
    resp = client.synthesize_speech(**params)
    return resp["AudioStream"].read()


def main() -> int:
    try:
        en = synth("Hello, this is NidahAI.", "Joanna")
        print(f"Polly EN (Joanna): OK — {len(en)} bytes PCM")
    except Exception as e:
        print(f"Polly EN failed: {e}")
        print("Add AmazonPollyFullAccess (or polly:SynthesizeSpeech) to nidahai-dev IAM user.")
        return 1

    try:
        ar = synth("مرحباً، أنا نداه.", "Hala")
        print(f"Polly AR (Hala): OK — {len(ar)} bytes PCM")
    except Exception as e:
        print(f"Polly AR failed: {e}")
        return 1

    print("AWS Polly is ready for English (and Arabic fallback until Munsit key is set).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
