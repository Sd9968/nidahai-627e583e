import { createFileRoute } from "@tanstack/react-router";
import twilio from "twilio";

/**
 * Same-origin gate for the voice-token endpoint.
 *
 * This is a public marketing site with no user accounts, so we cannot require a
 * Supabase session. Instead we make the endpoint unusable from anywhere except
 * our own pages:
 *  - the request must carry an Origin (or Referer) whose host matches the host
 *    serving this route, so scripts on other sites cannot mint tokens;
 *  - CORS echoes only that verified origin (never `*`), so browsers refuse
 *    cross-site reads of the token;
 *  - tokens are short-lived and capped per client so a leaked token cannot be
 *    reused to place a stream of calls.
 */
const TOKEN_TTL_SECONDS = 300; // 5 minutes — long enough to place one call.
const MAX_TOKENS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

const issuedTokens = new Map<string, { count: number; resetAt: number }>();

const TRUSTED_HOSTNAMES = new Set([
  "nidahai.com",
  "www.nidahai.com",
  "nidahai.lovable.app",
  "id-preview--1bcb3be0-0778-4fa6-b098-90d478b0e1e0.lovable.app",
  "project--1bcb3be0-0778-4fa6-b098-90d478b0e1e0-dev.lovable.app",
  "1bcb3be0-0778-4fa6-b098-90d478b0e1e0.lovableproject.com",
]);

function urlOf(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isTrustedUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    TRUSTED_HOSTNAMES.has(hostname) ||
    (import.meta.env.DEV && (hostname === "localhost" || hostname === "127.0.0.1"))
  );
}

/** Returns the verified same-origin value, or null when the caller is not us. */
function verifyOrigin(request: Request): string | null {
  const originHeader = request.headers.get("origin");
  const originUrl = urlOf(originHeader);

  if (originUrl) {
    return isTrustedUrl(originUrl) ? originUrl.origin : null;
  }

  // Some browsers omit Origin on same-origin requests; fall back to a trusted
  // Referer. Do not compare with proxy Host headers: preview traffic is routed
  // through an internal host that intentionally differs from the public URL.
  const refererUrl = urlOf(request.headers.get("referer"));
  if (refererUrl && isTrustedUrl(refererUrl)) {
    return refererUrl.origin;
  }

  return null;
}

function clientKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function withinQuota(key: string) {
  const now = Date.now();
  const entry = issuedTokens.get(key);

  if (!entry || entry.resetAt <= now) {
    issuedTokens.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_TOKENS_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonError(msg: string, status: number, origin?: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

export const Route = createFileRoute("/api/public/twilio-token")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = verifyOrigin(request);
        if (!origin) return new Response(null, { status: 403 });
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      },
      POST: async ({ request }) => {
        const origin = verifyOrigin(request);
        if (!origin) {
          console.warn("Twilio token: rejected cross-origin/unknown caller");
          return jsonError("Forbidden", 403);
        }

        if (!withinQuota(clientKey(request))) {
          console.warn("Twilio token: quota exceeded for client");
          return jsonError("Too many call attempts. Try again later.", 429, origin);
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKeySid = process.env.TWILIO_API_KEY_SID;
        const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
        const appSid = process.env.TWILIO_TWIML_APP_SID;

        if (!accountSid || !apiKeySid || !apiKeySecret || !appSid) {
          console.error("Twilio token: missing credentials");
          return jsonError("Voice service not configured", 500, origin);
        }

        try {
          const AccessToken = twilio.jwt.AccessToken;
          const VoiceGrant = AccessToken.VoiceGrant;

          const identity = `web_${Math.random().toString(36).slice(2, 10)}`;
          const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
            identity,
            ttl: TOKEN_TTL_SECONDS,
          });

          token.addGrant(
            new VoiceGrant({
              outgoingApplicationSid: appSid,
              incomingAllow: false,
            }),
          );

          return new Response(JSON.stringify({ token: token.toJwt(), identity }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              ...corsHeaders(origin),
            },
          });
        } catch (err) {
          console.error("Twilio token exception", err);
          return jsonError("Failed to mint token", 500, origin);
        }
      },
    },
  },
});
