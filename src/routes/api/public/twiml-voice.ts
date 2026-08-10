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

export const Route = createFileRoute("/api/public/twiml-voice")({
  server: {
    handlers: {
      // Twilio issues POST, but GET is handy for quick browser checks.
      GET: async () => xml("<Response><Say>NidahAI voice endpoint is live.</Say></Response>"),
      POST: async () => {
        const agentNumber = process.env.TWILIO_AGENT_NUMBER;

        if (!agentNumber) {
          console.error("TwiML: missing agent number");
          return xml("<Response><Say>Service not configured.</Say></Response>", 500);
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
