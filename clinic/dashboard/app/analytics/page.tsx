"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays, format, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { CrmShell } from "@/components/CrmShell";

type Appt = {
  status: string;
  source: string | null;
  created_at: string;
  scheduled_at: string;
  doctor_id: string | null;
};
type Call = {
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;
  language: string | null;
};
type Doctor = { id: string; name_en: string };
type Lead = { value: number | null; stage_id: string | null };
type Stage = { id: string; name: string; color: string };

const OASIS = "#0d7377";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-sand-200/80 bg-white/70 p-4">
      <p className="text-xs uppercase tracking-wide text-sand-800/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-sand-900">{value}</p>
      {sub && <p className="text-xs text-sand-800/55">{sub}</p>}
    </div>
  );
}

function BarList({
  data,
  color = OASIS,
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.length === 0 && <p className="text-sm text-sand-800/45">No data yet</p>}
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm capitalize text-sand-800/70">
            {d.label.replace(/_/g, " ")}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-sand-100">
            <div
              className="h-full rounded-md"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || color }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm tabular-nums text-sand-800/70">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ points }: { points: { day: string; count: number }[] }) {
  const w = 640;
  const h = 160;
  const pad = 24;
  const max = Math.max(1, ...points.map((p) => p.count));
  const bw = (w - pad * 2) / points.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Bookings per day">
      {points.map((p, i) => {
        const bh = (p.count / max) * (h - pad * 2);
        return (
          <g key={p.day}>
            <rect
              x={pad + i * bw + bw * 0.15}
              y={h - pad - bh}
              width={bw * 0.7}
              height={bh}
              rx={3}
              fill={OASIS}
              opacity={0.85}
            />
            {i % 2 === 0 && (
              <text
                x={pad + i * bw + bw / 2}
                y={h - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#8a7f6f"
              >
                {p.day}
              </text>
            )}
            {p.count > 0 && (
              <text
                x={pad + i * bw + bw / 2}
                y={h - pad - bh - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#4a3f32"
              >
                {p.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sand-200/80 bg-white/70 p-5">
      <h2 className="mb-4 text-sm font-medium text-sand-900">{title}</h2>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [a, c, d, l, s] = await Promise.all([
        supabase.from("appointments").select("status,source,created_at,scheduled_at,doctor_id").limit(2000),
        supabase.from("calls").select("started_at,ended_at,outcome,language").limit(2000),
        supabase.from("doctors").select("id,name_en"),
        supabase.from("leads").select("value,stage_id").limit(2000),
        supabase.from("pipeline_stages").select("id,name,color").order("position"),
      ]);
      if (a.error) return setError(a.error.message);
      setAppts((a.data as Appt[]) || []);
      setCalls((c.data as Call[]) || []);
      setDoctors((d.data as Doctor[]) || []);
      setLeads((l.data as Lead[]) || []);
      setStages((s.data as Stage[]) || []);
    })();
  }, []);

  const kpis = useMemo(() => {
    const totalBookings = appts.length;
    const confirmed = appts.filter((a) => ["confirmed", "completed"].includes(a.status)).length;
    const confRate = totalBookings ? Math.round((confirmed / totalBookings) * 100) : 0;
    const durations = calls
      .filter((c) => c.started_at && c.ended_at)
      .map((c) => (new Date(c.ended_at!).getTime() - new Date(c.started_at!).getTime()) / 1000);
    const avgDur = durations.length
      ? Math.round(durations.reduce((x, y) => x + y, 0) / durations.length)
      : 0;
    const escalations = calls.filter((c) => (c.outcome || "").includes("escalat")).length;
    return { totalCalls: calls.length, totalBookings, confRate, avgDur, escalations };
  }, [appts, calls]);

  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map((day) => ({
      day: format(day, "d/M"),
      count: appts.filter((a) => startOfDay(new Date(a.created_at)).getTime() === day.getTime()).length,
    }));
  }, [appts]);

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    appts.forEach((a) => (m[a.status] = (m[a.status] || 0) + 1));
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [appts]);

  const byOutcome = useMemo(() => {
    const m: Record<string, number> = {};
    calls.forEach((c) => {
      const k = c.outcome || "unknown";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [calls]);

  const byLang = useMemo(() => {
    const m: Record<string, number> = {};
    calls.forEach((c) => {
      const k = c.language || "unknown";
      m[k] = (m[k] || 0) + 1;
    });
    const colors: Record<string, string> = { en: "#0d7377", ar: "#c98a3a", unknown: "#b8ae9c" };
    return Object.entries(m).map(([label, value]) => ({ label, value, color: colors[label] || "#b8ae9c" }));
  }, [calls]);

  const byDoctor = useMemo(() => {
    const names: Record<string, string> = {};
    doctors.forEach((d) => (names[d.id] = d.name_en));
    const m: Record<string, number> = {};
    appts.forEach((a) => {
      if (!a.doctor_id) return;
      const k = names[a.doctor_id] || "Unknown";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [appts, doctors]);

  const byStage = useMemo(() => {
    const info: Record<string, Stage> = {};
    stages.forEach((s) => (info[s.id] = s));
    const m: Record<string, number> = {};
    leads.forEach((l) => {
      if (!l.stage_id) return;
      m[l.stage_id] = (m[l.stage_id] || 0) + (Number(l.value) || 0);
    });
    return stages
      .filter((s) => m[s.id])
      .map((s) => ({ label: s.name, value: Math.round(m[s.id]), color: s.color }));
  }, [leads, stages]);

  const fmtDur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

  return (
    <CrmShell title="Analytics" subtitle="Voice agent performance and booking funnel at a glance.">
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Calls" value={String(kpis.totalCalls)} />
        <Tile label="Bookings" value={String(kpis.totalBookings)} />
        <Tile label="Confirm rate" value={`${kpis.confRate}%`} sub="confirmed + completed" />
        <Tile label="Avg call" value={fmtDur(kpis.avgDur)} />
        <Tile label="Escalations" value={String(kpis.escalations)} />
      </div>

      <div className="mb-6">
        <Card title="Bookings — last 14 days">
          <TrendChart points={trend} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bookings by status">
          <BarList data={byStatus} />
        </Card>
        <Card title="Calls by outcome">
          <BarList data={byOutcome} />
        </Card>
        <Card title="Calls by language">
          <BarList data={byLang} />
        </Card>
        <Card title="Top doctors by bookings">
          <BarList data={byDoctor} />
        </Card>
        <Card title="Pipeline value by stage (SAR)">
          <BarList data={byStage} />
        </Card>
      </div>
    </CrmShell>
  );
}
