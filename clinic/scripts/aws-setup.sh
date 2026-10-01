#!/usr/bin/env bash
# NidahAI AWS bootstrap — Mumbai (ap-south-1)
# Prerequisites: aws configure already done (credentials + region)
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
PROJECT="nidahai"

echo "==> Verifying credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IDENTITY=$(aws sts get-caller-identity --query Arn --output text)
echo "    Account: ${ACCOUNT_ID}"
echo "    Identity: ${IDENTITY}"
echo "    Region:   ${REGION}"

BUCKET="${PROJECT}-recordings-dev-${ACCOUNT_ID}"

echo ""
echo "==> Creating S3 bucket: ${BUCKET}"
if aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  echo "    Already exists."
else
  aws s3api create-bucket \
    --bucket "${BUCKET}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"
  aws s3api put-public-access-block \
    --bucket "${BUCKET}" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  aws s3api put-bucket-encryption \
    --bucket "${BUCKET}" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  # 90-day lifecycle for recordings
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET}" \
    --lifecycle-configuration '{
      "Rules": [{
        "ID": "expire-recordings-90d",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Expiration": {"Days": 90}
      }]
    }'
  echo "    Created + encrypted + 90-day expiry."
fi

echo ""
echo "==> Checking Bedrock model access in ${REGION}..."
if aws bedrock list-foundation-models --region "${REGION}" --query 'modelSummaries[?contains(modelId, `claude`)].modelId' --output text 2>/dev/null | grep -q claude; then
  echo "    Claude models visible in Bedrock listing."
else
  echo "    WARNING: Could not list Claude models. Enable model access in Console:"
  echo "    https://${REGION}.console.aws.amazon.com/bedrock/home?region=${REGION}#/modelaccess"
fi

echo ""
echo "==> Testing Bedrock converse (Global Sonnet 4.6)..."
if aws bedrock-runtime converse \
  --region "${REGION}" \
  --model-id global.anthropic.claude-sonnet-4-6 \
  --messages '[{"role":"user","content":[{"text":"Reply with: OK"}]}]' \
  --inference-config '{"maxTokens":20}' \
  --query 'output.message.content[0].text' \
  --output text 2>/dev/null; then
  echo "    Bedrock OK."
else
  echo "    Bedrock test FAILED. Enable Claude Sonnet 4.6 (Global) in Model access, then re-run."
fi

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
echo ""
echo "==> Writing AWS vars into ${ENV_FILE}"
touch "${ENV_FILE}"
# Upsert keys without wiping other secrets
upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    # portable sed
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

upsert "AWS_REGION" "${REGION}"
upsert "S3_RECORDINGS_BUCKET" "${BUCKET}"
upsert "BEDROCK_MODEL_ID" "global.anthropic.claude-sonnet-4-6"
upsert "USE_BEDROCK" "true"

# Prefer copying credentials from aws configure if present
AK=$(aws configure get aws_access_key_id 2>/dev/null || true)
SK=$(aws configure get aws_secret_access_key 2>/dev/null || true)
if [ -n "${AK}" ] && [ -n "${SK}" ]; then
  upsert "AWS_ACCESS_KEY_ID" "${AK}"
  upsert "AWS_SECRET_ACCESS_KEY" "${SK}"
  echo "    Copied access keys from aws configure into .env"
else
  echo "    Using SSO/profile — set AWS_ACCESS_KEY_ID/SECRET in .env only if needed for bot runtime."
fi

echo ""
echo "Done."
echo "  S3_RECORDINGS_BUCKET=${BUCKET}"
echo "  Next: enable Bedrock model access if the test failed, then re-run this script."
