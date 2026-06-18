import { createFileRoute } from "@tanstack/react-router";

// Resend test mode requires sending to the account owner's email.
// Once you verify a domain at resend.com/domains, swap this to aszadms1@gmail.com
// and update FROM_EMAIL to use your verified domain (e.g. "hello@yourdomain.com").
const TO_EMAIL = "sdaszad127@gmail.com";
const FROM_EMAIL = "KABSA CALL.ai <onboarding@resend.dev>";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type Payload = {
  name?: unknown;
  company?: unknown;
  email?: unknown;
  phone?: unknown;
  preferredDate?: unknown;
  language?: unknown;
  message?: unknown;
};

function str(v: unknown, max = 2000) {
  return typeof v === "string" ? v.slice(0, max).trim() : "";
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const Route = createFileRoute("/api/public/book-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Payload;
        try {
          body = (await request.json()) as Payload;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const name = str(body.name, 120);
        const company = str(body.company, 160);
        const email = str(body.email, 200);
        const phone = str(body.phone, 60);
        const preferredDate = str(body.preferredDate, 40);
        const language = str(body.language, 20) || "either";
        const message = str(body.message, 4000);

        if (!name || !email || !phone || !message) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          return new Response(JSON.stringify({ error: "Invalid email" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const resendKey = process.env.RESEND_API_KEY;
        if (!lovableKey || !resendKey) {
          console.error("Missing email credentials");
          return new Response(JSON.stringify({ error: "Email not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows: [string, string][] = [
          ["Name", name],
          ["Company", company || "—"],
          ["Email", email],
          ["Phone", phone],
          ["Preferred date", preferredDate || "—"],
          ["Preferred language", language],
        ];

        const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border:1px solid rgba(10,10,10,0.08);border-radius:20px;padding:32px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#0a0a0a99;">KABSA CALL.ai</p>
      <h1 style="margin:8px 0 24px;font-size:26px;line-height:1.1;font-weight:900;text-transform:uppercase;">
        New <span style="color:#FF6A1A">demo request</span>
      </h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid rgba(10,10,10,0.06);color:#0a0a0a99;width:42%;">${escapeHtml(k)}</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(10,10,10,0.06);color:#0a0a0a;">${escapeHtml(v)}</td>
          </tr>`
          )
          .join("")}
      </table>
      <div style="margin-top:24px;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#0a0a0a99;">Message</p>
        <div style="white-space:pre-wrap;font-size:14px;line-height:1.55;color:#0a0a0a;background:#f5f4f1;border-radius:12px;padding:14px 16px;">${escapeHtml(message)}</div>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#0a0a0a80;">Reply directly to ${escapeHtml(email)} to follow up.</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#0a0a0a66;margin-top:16px;letter-spacing:0.12em;text-transform:uppercase;">Sent from kabsacall.ai · book a demo form</p>
  </div>
</body></html>`;

        const text =
          rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMessage:\n${message}\n`;

        try {
          const resp = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [TO_EMAIL],
              reply_to: email,
              subject: `New demo request — ${name}${company ? ` (${company})` : ""}`,
              html,
              text,
            }),
          });

          if (!resp.ok) {
            const errBody = await resp.text().catch(() => "");
            console.error("Resend gateway error", resp.status, errBody);
            return new Response(JSON.stringify({ error: "Send failed" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("book-demo send exception", err);
          return new Response(JSON.stringify({ error: "Send failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
