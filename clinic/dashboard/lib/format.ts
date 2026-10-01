// Clinic-local time formatting. Appointment times are stored in UTC but must be
// shown in the clinic's timezone (Asia/Riyadh), NOT the staff member's browser
// timezone — otherwise a 10:00 Riyadh slot shows as 12:30 for a viewer in IST.

const CLINIC_TZ = "Asia/Riyadh";

export function formatRiyadh(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    timeZone: CLINIC_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatRiyadhShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    timeZone: CLINIC_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
