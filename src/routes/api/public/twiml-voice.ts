import { createFileRoute } from "@tanstack/react-router";
import twilio from "twilio";

/**
 * Browser Voice SDK calls hit this TwiML App Voice URL.
 *
 * Do NOT `<Dial>` the public demo phone number from here.
 * That creates an outbound PSTN leg Twilio often blocks (13225), which the
 * Voice SDK surfaces as 31005 hangup.
 *
 * Hand the browser call to Pipecat over Media Streams instead:
 *   <Connect><Stream url="wss://…/ws"/></Connect>
 */

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

function normalizeHttpUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeWsUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol !== "wss:" && url.protocol !== "ws:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sameEndpoint(a: string, b: string) {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return (
      left.hostname.toLowerCase() === right.hostname.toLowerCase() &&
      left.pathname.replace(/\/$/, "") === right.pathname.replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}

function twilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!accountSid) return null;

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) return twilio(accountSid, authToken);

  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }

  return null;
}

async function resolveNumberVoiceUrl(phoneNumber: string): Promise<string | null> {
  const client = twilioClient();
  if (!client) return null;

  try {
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber,
      limit: 1,
    });
    const voiceUrl = numbers[0]?.voiceUrl?.trim();
    return voiceUrl ? normalizeHttpUrl(voiceUrl) : null;
  } catch (err) {
    console.error("TwiML: failed to look up number voice URL", err);
    return null;
  }
}

function connectStreamTwiml(streamUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="source" value="web" />
    </Stream>
  </Connect>
  <Pause length="40"/>
</Response>`;
}

function redirectTwiml(webhookUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${escapeXml(webhookUrl)}</Redirect>
</Response>`;
}

function misconfiguredTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Nidah A I is not connected right now. Please dial the phone number on the website, or try again later.
  </Say>
</Response>`;
}

export const Route = createFileRoute("/api/public/twiml-voice")({
  server: {
    handlers: {
      GET: async () => xml("<Response><Say>NidahAI voice endpoint is live.</Say></Response>"),
      POST: async ({ request }) => {
        const selfUrl = new URL(request.url).toString();

        // 1) Explicit Media Stream WebSocket (preferred secret names)
        const streamEnv =
          process.env.PIPECAT_STREAM_URL?.trim() || process.env.TWILIO_VOICE_STREAM_URL?.trim();
        if (streamEnv) {
          const streamUrl = normalizeWsUrl(streamEnv);
          if (!streamUrl) {
            console.error("TwiML: stream URL secret is invalid", streamEnv);
            return xml(misconfiguredTwiml(), 500);
          }
          console.info("TwiML: connecting browser call to media stream", { streamUrl });
          return xml(connectStreamTwiml(streamUrl));
        }

        // 2) Explicit HTTP webhook that already returns Connect/Stream TwiML
        const webhookEnv = process.env.TWILIO_VOICE_WEBHOOK_URL?.trim();
        if (webhookEnv) {
          const webhookUrl = normalizeHttpUrl(webhookEnv);
          if (!webhookUrl) {
            console.error("TwiML: TWILIO_VOICE_WEBHOOK_URL is invalid", webhookEnv);
            return xml(misconfiguredTwiml(), 500);
          }
          if (sameEndpoint(webhookUrl, selfUrl)) {
            console.error("TwiML: TWILIO_VOICE_WEBHOOK_URL points at this route (redirect loop)");
            return xml(misconfiguredTwiml(), 500);
          }
          console.info("TwiML: redirecting browser call to voice webhook", { webhookUrl });
          return xml(redirectTwiml(webhookUrl));
        }

        // 3) Reuse the Twilio number's inbound Voice URL (same path phone callers use)
        const agentNumber = process.env.TWILIO_AGENT_NUMBER?.trim();
        if (agentNumber) {
          const numberVoiceUrl = await resolveNumberVoiceUrl(agentNumber);
          if (numberVoiceUrl && !sameEndpoint(numberVoiceUrl, selfUrl)) {
            console.info("TwiML: redirecting browser call to number voice URL", {
              agentNumber,
              numberVoiceUrl,
            });
            return xml(redirectTwiml(numberVoiceUrl));
          }
          if (numberVoiceUrl && sameEndpoint(numberVoiceUrl, selfUrl)) {
            console.error(
              "TwiML: Twilio number voice URL points back at this route. Set PIPECAT_STREAM_URL.",
            );
          } else {
            console.error(
              "TwiML: could not resolve a voice agent webhook. Set PIPECAT_STREAM_URL=wss://…/ws",
              { agentNumber, numberVoiceUrl },
            );
          }
        } else {
          console.error("TwiML: missing PIPECAT_STREAM_URL and TWILIO_AGENT_NUMBER");
        }

        // Never Dial the demo PSTN number — that path causes 13225/31005.
        return xml(misconfiguredTwiml(), 500);
      },
    },
  },
});
