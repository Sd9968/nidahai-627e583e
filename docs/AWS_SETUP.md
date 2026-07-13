# AWS Setup — Mumbai (`ap-south-1`) for NidahAI

Do this once. The rest of the app can run locally without AWS until Bedrock + S3 are ready.

**Region for now:** Asia Pacific (Mumbai) `ap-south-1`  
**Later (Saudi pilot):** move to `me-south-1` (Bahrain)

---

## 1. Install AWS CLI (macOS)

```bash
brew install awscli
aws --version
```

---

## 2. Create IAM user + access keys

1. Open [IAM Console](https://console.aws.amazon.com/iam/)
2. **Users** → **Create user** → name: `nidahai-dev`
3. Attach policies:
   - `AmazonBedrockFullAccess` (tighten later)
   - `AmazonPollyFullAccess` (English TTS via Polly; Arabic fallback until Munsit)
   - Custom S3 policy (Step 4 below, after bucket exists)
4. **Security credentials** → **Create access key** → **CLI**
5. Save `Access key ID` and `Secret access key` (shown once)

Configure locally:

```bash
aws configure
# AWS Access Key ID: <paste>
# AWS Secret Access Key: <paste>
# Default region name: ap-south-1
# Default output format: json
```

Verify:

```bash
aws sts get-caller-identity
```

---

## 3. Enable Bedrock Claude (required for LLM)

Claude is available in Mumbai via **Global cross-Region inference**.

1. Switch region to **Mumbai** (top-right of AWS Console)
2. Open [Bedrock Model access](https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/modelaccess)
3. Enable **Claude Sonnet 4.6** (or Sonnet 4.5 / Haiku 4.5)
4. Wait until status is **Access granted**

Test:

```bash
aws bedrock-runtime converse \
  --region ap-south-1 \
  --model-id global.anthropic.claude-sonnet-4-6 \
  --messages '[{"role":"user","content":[{"text":"Say hello in Arabic and English"}]}]' \
  --inference-config '{"maxTokens":100}'
```

If you get a reply, Bedrock is ready.

**Model ID for `.env`:**

```
BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-4-6
```

**Local-dev alternative:** set `USE_BEDROCK=false` and use `ANTHROPIC_API_KEY` instead until Bedrock is enabled.

---

## 4. Create S3 bucket for call recordings

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=nidahai-recordings-dev-${ACCOUNT_ID}

aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo "S3_RECORDINGS_BUCKET=$BUCKET"
```

Attach this IAM policy to `nidahai-dev` (replace bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::nidahai-recordings-dev-YOUR_ACCOUNT_ID/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::nidahai-recordings-dev-YOUR_ACCOUNT_ID"
    }
  ]
}
```

---

## 5. Billing alarm (recommended)

1. [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets)
2. Create cost budget → e.g. **$50/month**
3. Alert email at 80% and 100%

---

## 6. Fill `.env`

```bash
cp .env.example .env
```

```bash
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_RECORDINGS_BUCKET=nidahai-recordings-dev-YOUR_ACCOUNT_ID
BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-4-6
USE_BEDROCK=true
```

---

## What you do NOT need yet

| Skip for now | Why |
|--------------|-----|
| ECS Fargate | Run Pipecat locally + ngrok first |
| ALB / domain | ngrok for Twilio webhooks |
| GPU EC2 | Munsit + Transcribe handle STT in the cloud |
| Secrets Manager | `.env` is fine for local dev |

---

## 7. Enable Amazon Polly (English TTS)

Polly is used for **English** voice output. Arabic uses **Munsit** when configured; until then Polly **Hala** (Gulf neural) is the fallback.

1. Attach **`AmazonPollyFullAccess`** to `nidahai-dev` (IAM → Users → Add permissions)
2. Test:

```bash
python scripts/test_polly.py
```

**`.env` settings (defaults):**

```
POLLY_VOICE_EN=Joanna
POLLY_VOICE_AR=Hala
POLLY_ENGINE=neural
```

---

## 8. Enable Amazon Transcribe (English STT)

English speech-to-text uses **AWS Transcribe Streaming**. Arabic STT uses **Munsit**.

1. Attach **`AmazonTranscribeFullAccess`** to `nidahai-dev`
2. Test:

```bash
python scripts/test_transcribe.py
```

**`.env` settings:**

```
STT_DEFAULT_LANG=ar
MUNSIT_API_KEY=...
MUNSIT_STT_ENDPOINTING_MS=800
```

---

## Checklist

- [ ] AWS CLI installed + `aws sts get-caller-identity` works
- [ ] Region set to `ap-south-1`
- [ ] Bedrock Claude Sonnet enabled + converse test works
- [ ] **Polly** IAM permission + `python scripts/test_polly.py` passes
- [ ] **Transcribe** IAM permission + `python scripts/test_transcribe.py` passes
- [ ] S3 bucket created + blocked public access
- [ ] IAM keys in `.env`
- [ ] Billing alarm set

When all boxes are checked, the voice bot can use Bedrock for the LLM and S3 for recordings.
