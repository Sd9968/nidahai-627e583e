"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

type Call = {
  id: string;
  twilio_call_sid: string | null;
  language: string | null;
  outcome: string | null;
  consent_recorded: boolean | null;
  started_at: string;
  ai_summary: string | null;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: qError } = await supabase
        .from("calls")
        .select(
          "id,twilio_call_sid,language,outcome,consent_recorded,started_at,ai_summary"
        )
        .order("started_at", { ascending: false })
        .limit(50);
      if (qError) setError(qError.message);
      else setCalls((data as Call[]) || []);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="font-display text-3xl text-oasis-700">
            NidahAI
          </Link>
          <h1 className="mt-1 text-xl text-sand-900">Call log</h1>
        </div>
        <Link href="/" className="text-sm text-oasis-600 hover:underline">
          ← Pending queue
        </Link>
      </header>

      {error && (
        <p className="mt-6 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <section className="mt-10 space-y-2">
        {calls.length === 0 && !error && (
          <p className="text-sand-800/60 text-sm py-12 text-center border border-dashed border-sand-200 rounded-xl">
            No calls yet.
          </p>
        )}
        {calls.map((c) => (
          <article
            key={c.id}
            className="rounded-xl border border-sand-200/80 bg-white/70 px-5 py-4"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-sand-900 font-medium">
                {format(new Date(c.started_at), "d MMM yyyy HH:mm")}
              </span>
              <span className="text-sand-800/70">{c.language || "—"}</span>
              <span className="text-oasis-700">{c.outcome || "in_progress"}</span>
              {c.consent_recorded && (
                <span className="text-sand-800/50">consent ✓</span>
              )}
            </div>
            {c.ai_summary && (
              <p className="mt-2 text-sm text-sand-800/80">{c.ai_summary}</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
