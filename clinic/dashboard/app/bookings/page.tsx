"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CrmShell, StatusBadge } from "@/components/CrmShell";
import { useClinicId } from "@/lib/use-clinic";
import { formatRiyadh } from "@/lib/format";

type SavedView = { id: string; name: string; filters: { status?: string } };

type Appointment = {
  id: string;
  ref_code: string | null;
  scheduled_at: string;
  status: string;
  source: string | null;
  patients?: { name: string; phone_primary: string; ref_code: string | null } | null;
  doctors?: { name_en: string; specialty: string } | null;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending_confirmation", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "completed", label: "Completed" },
];

function BookingsInner() {
  const search = useSearchParams();
  const initial = search.get("status") || "all";
  const highlight = search.get("highlight");
  const [status, setStatus] = useState(initial);
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [views, setViews] = useState<SavedView[]>([]);
  const clinicId = useClinicId();

  async function loadViews() {
    const supabase = createClient();
    const { data } = await supabase
      .from("saved_views")
      .select("id,name,filters")
      .eq("entity", "appointment")
      .order("created_at");
    setViews((data as SavedView[]) || []);
  }

  async function saveView() {
    if (!clinicId) return;
    const name = window.prompt("Name this view", `${status === "all" ? "All" : status} bookings`);
    if (!name) return;
    const supabase = createClient();
    const { error: e } = await supabase.from("saved_views").insert({
      clinic_id: clinicId,
      entity: "appointment",
      name,
      filters: { status },
    });
    if (e) setError(e.message);
    else loadViews();
  }

  async function load(filter = status) {
    const supabase = createClient();
    let q = supabase
      .from("appointments")
      .select(
        "id,ref_code,scheduled_at,status,source,patients(name,phone_primary,ref_code),doctors(name_en,specialty)"
      )
      .order("scheduled_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error: qError } = await q;
    if (qError) setError(qError.message);
    else {
      setItems((data as unknown as Appointment[]) || []);
      setError(null);
    }
  }

  useEffect(() => {
    loadViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("crm-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () =>
        load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function updateStatus(id: string, next: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("appointments")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", id);
      await load();
    });
  }

  return (
    <CrmShell
      title="Bookings"
      subtitle="Voice and staff appointments — confirm pending AI bookings here"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={`rounded-full px-3 py-1 text-sm border transition ${
              status === f.id
                ? "bg-oasis-600 text-white border-oasis-600"
                : "border-sand-200 text-sand-800/70 hover:bg-sand-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-sand-800/45">Saved views</span>
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setStatus(v.filters.status || "all")}
            className="rounded-full border border-oasis-500/40 bg-oasis-50 px-3 py-1 text-sm text-oasis-700 hover:bg-oasis-100"
          >
            {v.name}
          </button>
        ))}
        <button
          onClick={saveView}
          className="rounded-full border border-dashed border-sand-300 px-3 py-1 text-sm text-sand-800/60 hover:border-oasis-400 hover:text-oasis-700"
        >
          + Save current
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      <section className="space-y-2">
        {items.length === 0 && !error && (
          <p className="rounded-xl border border-dashed border-sand-200 px-4 py-12 text-center text-sm text-sand-800/50">
            No bookings for this filter
          </p>
        )}
        {items.map((a) => (
          <article
            key={a.id}
            id={a.id}
            className={`rounded-xl border bg-white/70 px-5 py-4 ${
              highlight === a.id
                ? "border-oasis-500 ring-2 ring-oasis-500/20"
                : "border-sand-200/80"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sand-900">
                    {a.patients?.name || "New patient"}
                  </p>
                  <StatusBadge status={a.status} />
                  {a.ref_code && (
                    <span className="rounded-md bg-sand-100 px-2 py-0.5 font-mono text-xs text-sand-800/70">
                      {a.ref_code}
                    </span>
                  )}
                  {a.source && (
                    <span className="text-xs text-sand-800/45 uppercase tracking-wide">
                      {a.source}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-sand-800/65">
                  {a.patients?.phone_primary || "—"} · {a.doctors?.name_en || "Doctor"}
                  {a.doctors?.specialty ? ` (${a.doctors.specialty})` : ""}
                </p>
                <p className="mt-1 text-sm text-oasis-700">
                  {formatRiyadh(a.scheduled_at)} <span className="text-sand-800/45">(Riyadh)</span>
                </p>
              </div>
              {a.status === "pending_confirmation" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={pending}
                    onClick={() => updateStatus(a.id, "confirmed")}
                    className="rounded-lg bg-oasis-600 hover:bg-oasis-700 text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    Confirm
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => updateStatus(a.id, "cancelled")}
                    className="rounded-lg border border-sand-200 px-4 py-2 text-sm text-sand-800 hover:bg-sand-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {a.status === "confirmed" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={pending}
                    onClick={() => updateStatus(a.id, "completed")}
                    className="rounded-lg border border-sand-200 px-4 py-2 text-sm hover:bg-sand-50 disabled:opacity-60"
                  >
                    Mark completed
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => updateStatus(a.id, "no_show")}
                    className="rounded-lg border border-sand-200 px-4 py-2 text-sm hover:bg-sand-50 disabled:opacity-60"
                  >
                    No-show
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </CrmShell>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <CrmShell title="Bookings" subtitle="Loading…">
          <p className="text-sm text-sand-800/50">Loading bookings…</p>
        </CrmShell>
      }
    >
      <BookingsInner />
    </Suspense>
  );
}
