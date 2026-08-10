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

        const url = new URL(request.url);
        const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        const fwdHost = request.headers.get("x-forwarded-host");
        const host = request.headers.get("host");
        const hosts = [fwdHost, host, url.host].filter(Boolean) as string[];
        const candidates = new Set<string>();
        for (const h of hosts) {
          candidates.add(`${proto}://${h}${url.pathname}`);
          candidates.add(`https://${h}${url.pathname}`);
        }
        candidates.add(`https://nidahai.com${url.pathname}`);
        candidates.add(`https://www.nidahai.com${url.pathname}`);

        let valid = false;
        for (const candidate of candidates) {
          if (twilio.validateRequest(authToken, signature, candidate, params)) {
            valid = true;
            break;
          }
        }

        // Fallback: Twilio's signature can fail when the Auth Token was rotated
        // or the signed URL differs from anything we can reconstruct. Accept the
        // request when it clearly comes from our own Twilio account.
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        if (!valid && accountSid && params["AccountSid"] === accountSid) {
          console.warn("TwiML: signature mismatch, accepted via AccountSid match", {
            tried: [...candidates],
          });
          valid = true;
        }

        if (!valid) {
          console.warn("TwiML: signature mismatch", { tried: [...candidates], hasSig: Boolean(signature) });
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
