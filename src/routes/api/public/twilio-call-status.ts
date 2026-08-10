import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/twilio-call-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        console.info("Twilio outbound leg", {
          callStatus: String(form.get("CallStatus") ?? "unknown"),
          callDuration: String(form.get("CallDuration") ?? ""),
          sipResponseCode: String(form.get("SipResponseCode") ?? ""),
          errorCode: String(form.get("ErrorCode") ?? ""),
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});