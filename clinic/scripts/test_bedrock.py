#!/usr/bin/env python3
"""Quick Bedrock connectivity check (optional — run after AWS setup)."""

import os
import sys

from dotenv import load_dotenv

load_dotenv()


def main() -> int:
    if os.getenv("USE_BEDROCK", "false").lower() != "true":
        print("USE_BEDROCK is false — skipping. Set USE_BEDROCK=true to test Bedrock.")
        return 0

    region = os.getenv("AWS_REGION", "ap-south-1")
    model_id = os.getenv("BEDROCK_MODEL_ID", "global.anthropic.claude-sonnet-4-6")

    try:
        import boto3
    except ImportError:
        print("pip install boto3 python-dotenv")
        return 1

    client = boto3.client("bedrock-runtime", region_name=region)
    response = client.converse(
        modelId=model_id,
        messages=[
            {
                "role": "user",
                "content": [{"text": "Reply in one short sentence with Arabic and English greeting."}],
            }
        ],
        inferenceConfig={"maxTokens": 80},
    )
    text = response["output"]["message"]["content"][0]["text"]
    print(f"OK — {region} / {model_id}")
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
