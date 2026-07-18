import { createFileRoute } from "@tanstack/react-router";
import twilio from "twilio";

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

export const Route = createFileRoute("/api/public/twiml-voice")({
  server: {
    handlers: {
      // Twilio issues POST, but GET is handy for quick browser checks.
      GET: async () => xml("<Response><Say>NidahAI voice endpoint is live.</Say></Response>"),
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const agentNumber = process.env.TWILIO_AGENT_NUMBER;

        if (!authToken || !agentNumber) {
          console.error("TwiML: missing credentials");
          return xml("<Response><Say>Service not configured.</Say></Response>", 500);
        }

        const bodyText = await request.text();
        const params: Record<string, string> = {};
        for (const [k, v] of new URLSearchParams(bodyText)) params[k] = v;

        const signature = request.headers.get("x-twilio-signature") ?? "";

        // Rebuild the public URL Twilio signed. On Workers `request.url` is
        // usually the public URL, but reconstruct from forwarded headers when
        // available to be safe.
        const proto =
          request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
        const path = new URL(request.url).pathname;
        const publicUrl = `${proto}://${host}${path}`;

        const valid = twilio.validateRequest(authToken, signature, publicUrl, params);
        if (!valid) {
          console.warn("TwiML: signature mismatch", { publicUrl, hasSig: Boolean(signature) });
          return xml("<Response><Say>Unauthorized.</Say></Response>", 403);
        }

        const dialTarget = escapeXml(agentNumber);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" callerId="${dialTarget}">
    <Number>${dialTarget}</Number>
  </Dial>
</Response>`;
        return xml(twiml);
      },
    },
  },
});
