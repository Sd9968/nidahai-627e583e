#!/usr/bin/env python3
"""Verify AWS Transcribe API access (English STT)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def main() -> int:
    import boto3
    from botocore.exceptions import ClientError

    region = os.getenv("AWS_REGION", "ap-south-1")
    try:
        client = boto3.client("transcribe", region_name=region)
        # Lightweight permission check — does not start a stream
        client.list_transcription_jobs(MaxResults=1)
        print(f"AWS Transcribe ({region}): OK — list_transcription_jobs succeeded")
        print("English STT ready (streaming used at call time via Pipecat).")
        return 0
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        print(f"AWS Transcribe failed: {code} — {e}")
        print("Attach AmazonTranscribeFullAccess (or StartStreamTranscription) to nidahai-dev.")
        return 1
    except Exception as e:
        print(f"AWS Transcribe failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
