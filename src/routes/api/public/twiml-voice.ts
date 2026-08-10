import { createFileRoute } from "@tanstack/react-router";

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getPublicOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestUrl = new URL(request.url);
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestUrl.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

export const Route = createFileRoute("/api/public/twiml-voice")({
  server: {
    handlers: {
      // Twilio issues POST, but GET is handy for quick browser checks.
      GET: async () => xml("<Response><Say>NidahAI voice endpoint is live.</Say></Response>"),
      POST: async ({ request }) => {
        const streamUrl = process.env.PIPECAT_STREAM_URL;
        const agentNumber = process.env.TWILIO_AGENT_NUMBER;
        const callerId = process.env.TWILIO_CALLER_ID;
        const statusCallback = `${getPublicOrigin(request)}/api/public/twilio-call-status`;

        // Preferred path: hand the browser call straight to the Pipecat bot over
        // Twilio Media Streams — no PSTN leg, so no carrier blocking.
        if (streamUrl && /^wss?:\/\//i.test(streamUrl)) {
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="source" value="web" />
    </Stream>
  </Connect>
</Response>`;
          return xml(twiml);
        }

        if (!agentNumber) {
          console.error("TwiML: missing PIPECAT_STREAM_URL and agent number");
          return xml("<Response><Say>Service not configured.</Say></Response>", 500);
        }

        const dialTarget = escapeXml(agentNumber);
        // Twilio requires a verified Twilio caller ID when a browser (Client) leg dials out.
        const effectiveCallerId = callerId || agentNumber;
        const dialCallerId = ` callerId="${escapeXml(effectiveCallerId)}"`;

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true"${dialCallerId}>
    <Number statusCallback="${escapeXml(statusCallback)}" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${dialTarget}</Number>
  </Dial>
</Response>`;
        return xml(twiml);
      },
    },
  },
});
