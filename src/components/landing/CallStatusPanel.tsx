import { AlertTriangle, Check, Info, Loader2 } from "lucide-react";
import type { DiagStep } from "@/lib/twilio-call";

const stateStyles: Record<DiagStep["state"], string> = {
  pending: "text-ink/55",
  ok: "text-emerald-600",
  fail: "text-red-600",
  info: "text-ink/70",
};

function StateIcon({ state }: { state: DiagStep["state"] }) {
  if (state === "pending") return <Loader2 size={13} className="animate-spin shrink-0" />;
  if (state === "ok") return <Check size={13} className="shrink-0" />;
  if (state === "fail") return <AlertTriangle size={13} className="shrink-0" />;
  return <Info size={13} className="shrink-0" />;
}

export function CallStatusPanel({ steps }: { steps: DiagStep[] }) {
  if (steps.length === 0) return null;

  const t0 = steps[0].at;

  return (
    <div
      dir="ltr"
      className="mt-6 w-full rounded-2xl border border-hairline bg-paper p-4 text-left shadow-soft"
    >
      <p className="text-[10px] uppercase tracking-[0.22em] font-mono text-ink/55">
        Call diagnostics
      </p>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className={`flex items-start gap-2 text-[11px] font-mono ${stateStyles[s.state]}`}>
            <span className="mt-[2px]">
              <StateIcon state={s.state} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-ink">{s.label}</span>
              {s.detail && <span className="block break-words opacity-80">{s.detail}</span>}
            </span>
            <span className="shrink-0 text-ink/40">+{Math.max(0, s.at - t0)}ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
