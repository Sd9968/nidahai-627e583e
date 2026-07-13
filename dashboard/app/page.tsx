"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  patient_id: string | null;
  doctor_id: string | null;
  patients?: { name: string; phone_primary: string } | null;
  doctors?: { name_en: string; specialty: string } | null;
};

export default function PendingQueuePage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function load() {
    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("appointments")
      .select(
        "id,scheduled_at,status,patient_id,doctor_id,patients(name,phone_primary),doctors(name_en,specialty)"
      )
      .eq("status", "pending_confirmation")
      .order("scheduled_at", { ascending: true });

    if (qError) {
      setError(qError.message);
      return;
    }
    setItems((data as Appointment[]) || []);
    setError(null);
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("pending-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function confirm(id: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("appointments")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", id);
      await load();
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("appointments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      await load();
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl text-oasis-700">NidahAI</p>
          <h1 className="mt-1 text-xl text-sand-900">Pending confirmations</h1>
          <p className="text-sm text-sand-800/70 mt-1">
            AI bookings waiting for staff approval
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/calls" className="text-oasis-600 hover:underline">
            Calls
          </Link>
          <button
            onClick={signOut}
            className="text-sand-800/70 hover:text-sand-900"
          >
            Sign out
          </button>
        </nav>
      </header>

      {error && (
        <p className="mt-6 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <section className="mt-10 space-y-3">
        {items.length === 0 && !error && (
          <p className="text-sand-800/60 text-sm py-12 text-center border border-dashed border-sand-200 rounded-xl">
            No pending bookings. New voice bookings will appear here live.
          </p>
        )}
        {items.map((a) => (
          <article
            key={a.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-sand-200/80 bg-white/70 px-5 py-4"
          >
            <div>
              <p className="font-medium text-sand-900">
                {a.patients?.name || "New patient"} ·{" "}
                {a.patients?.phone_primary || "—"}
              </p>
              <p className="text-sm text-sand-800/70 mt-0.5">
                {a.doctors?.name_en || "Doctor"} ({a.doctors?.specialty || "—"})
              </p>
              <p className="text-sm text-oasis-700 mt-1">
                {format(new Date(a.scheduled_at), "EEE, d MMM yyyy · HH:mm")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                disabled={pending}
                onClick={() => confirm(a.id)}
                className="rounded-lg bg-oasis-600 hover:bg-oasis-700 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                disabled={pending}
                onClick={() => cancel(a.id)}
                className="rounded-lg border border-sand-200 px-4 py-2 text-sm text-sand-800 hover:bg-sand-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
