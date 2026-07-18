import { createFileRoute } from "@tanstack/react-router";
import twilio from "twilio";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonError(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/twilio-token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async () => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKeySid = process.env.TWILIO_API_KEY_SID;
        const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
        const appSid = process.env.TWILIO_TWIML_APP_SID;

        if (!accountSid || !apiKeySid || !apiKeySecret || !appSid) {
          console.error("Twilio token: missing credentials");
          return jsonError("Voice service not configured", 500);
        }

        try {
          const AccessToken = twilio.jwt.AccessToken;
          const VoiceGrant = AccessToken.VoiceGrant;

          const identity = `web_${Math.random().toString(36).slice(2, 10)}`;
          const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
            identity,
            ttl: 3600,
          });

          token.addGrant(
            new VoiceGrant({
              outgoingApplicationSid: appSid,
              incomingAllow: false,
            }),
          );

          return new Response(
            JSON.stringify({ token: token.toJwt(), identity }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        } catch (err) {
          console.error("Twilio token exception", err);
          return jsonError("Failed to mint token", 500);
        }
      },
    },
  },
});
