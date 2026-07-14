"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { CrmShell, StatusBadge } from "@/components/CrmShell";

type Counts = {
  pending: number;
  confirmed: number;
  callsToday: number;
  patients: number;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  patients?: { name: string; phone_primary: string } | null;
  doctors?: { name_en: string; specialty: string } | null;
};

type Call = {
  id: string;
  started_at: string;
  language: string | null;
  outcome: string | null;
  recording_s3_key: string | null;
  ai_summary: string | null;
};

export default function OverviewPage() {
  const [counts, setCounts] = useState<Counts>({
    pending: 0,
    confirmed: 0,
    callsToday: 0,
    patients: 0,
  });
  const [pending, setPending] = useState<Appointment[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [pendingRes, confirmedRes, callsTodayRes, patientsRes, pendingList, callsList] =
      await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_confirmation"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "confirmed"),
        supabase
          .from("calls")
          .select("id", { count: "exact", head: true })
          .gte("started_at", startOfDay.toISOString()),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase
          .from("appointments")
          .select(
            "id,scheduled_at,status,patients(name,phone_primary),doctors(name_en,specialty)"
          )
          .eq("status", "pending_confirmation")
          .order("scheduled_at", { ascending: true })
          .limit(8),
        supabase
          .from("calls")
          .select("id,started_at,language,outcome,recording_s3_key,ai_summary")
          .order("started_at", { ascending: false })
          .limit(8),
      ]);

    const err =
      pendingRes.error ||
      confirmedRes.error ||
      callsTodayRes.error ||
      patientsRes.error ||
      pendingList.error ||
      callsList.error;
    if (err) {
      setError(err.message);
      return;
    }

    setCounts({
      pending: pendingRes.count || 0,
      confirmed: confirmedRes.count || 0,
      callsToday: callsTodayRes.count || 0,
      patients: patientsRes.count || 0,
    });
    setPending((pendingList.data as unknown as Appointment[]) || []);
    setRecentCalls((callsList.data as Call[]) || []);
    setError(null);
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("crm-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () =>
        load()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    { label: "Pending bookings", value: counts.pending, href: "/bookings?status=pending_confirmation" },
    { label: "Confirmed", value: counts.confirmed, href: "/bookings?status=confirmed" },
    { label: "Calls today", value: counts.callsToday, href: "/calls" },
    { label: "Patients", value: counts.patients, href: "/patients" },
  ];

  return (
    <CrmShell
      title="Clinic CRM"
      subtitle="Live bookings from the voice agent, call history, and recordings"
    >
      {error && (
        <p className="mb-6 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-sand-200/80 bg-white/70 px-5 py-4 hover:border-oasis-500/40 transition"
          >
            <p className="text-sm text-sand-800/60">{c.label}</p>
            <p className="mt-1 text-3xl font-medium text-oasis-700">{c.value}</p>
          </Link>
        ))}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg text-sand-900">Needs confirmation</h2>
            <Link href="/bookings" className="text-sm text-oasis-600 hover:underline">
              All bookings
            </Link>
          </div>
          <div className="space-y-2">
            {pending.length === 0 && (
              <p className="rounded-xl border border-dashed border-sand-200 px-4 py-8 text-center text-sm text-sand-800/50">
                No pending voice bookings
              </p>
            )}
            {pending.map((a) => (
              <Link
                key={a.id}
                href={`/bookings?highlight=${a.id}`}
                className="block rounded-xl border border-sand-200/80 bg-white/70 px-4 py-3 hover:border-oasis-500/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sand-900">
                      {a.patients?.name || "New patient"}
                    </p>
                    <p className="text-sm text-sand-800/60">
                      {a.patients?.phone_primary || "—"} · {a.doctors?.name_en || "Doctor"}
                    </p>
                    <p className="mt-1 text-sm text-oasis-700">
                      {format(new Date(a.scheduled_at), "EEE d MMM · HH:mm")}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg text-sand-900">Recent calls</h2>
            <Link href="/calls" className="text-sm text-oasis-600 hover:underline">
              All calls
            </Link>
          </div>
          <div className="space-y-2">
            {recentCalls.length === 0 && (
              <p className="rounded-xl border border-dashed border-sand-200 px-4 py-8 text-center text-sm text-sand-800/50">
                No calls logged yet — place a test call to populate this
              </p>
            )}
            {recentCalls.map((c) => (
              <Link
                key={c.id}
                href={`/calls/${c.id}`}
                className="block rounded-xl border border-sand-200/80 bg-white/70 px-4 py-3 hover:border-oasis-500/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sand-900">
                      {format(new Date(c.started_at), "d MMM yyyy · HH:mm")}
                    </p>
                    <p className="text-sm text-sand-800/60 line-clamp-2">
                      {c.ai_summary || "No summary yet"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={c.outcome || "in_progress"} />
                    {c.recording_s3_key && (
                      <span className="text-xs text-oasis-600">Recording</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </CrmShell>
  );
}
