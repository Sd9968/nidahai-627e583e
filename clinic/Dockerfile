# NidahAI voice bot — Pipecat + Twilio media streams.
# Serves TwiML on / and the media-stream WebSocket on /ws (plus /whatsapp).
FROM python:3.12-slim

# build-essential is needed for a few wheels (onnxruntime/silero deps).
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so code changes don't bust the layer cache.
COPY bot/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/ ./

ENV PYTHONUNBUFFERED=1 \
    PORT=7860

EXPOSE 7860

# PUBLIC_HOST is the externally reachable hostname (e.g. dxxxx.cloudfront.net).
# The runner bakes it into the TwiML <Stream url="wss://PUBLIC_HOST/ws">, so it
# must be the public HTTPS domain, not the container's address.
CMD ["sh", "-c", "exec python bot.py -t twilio -x \"${PUBLIC_HOST}\" --host 0.0.0.0 --port ${PORT}"]
