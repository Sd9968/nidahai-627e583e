"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { CrmShell, StatusBadge } from "@/components/CrmShell";

type Call = {
  id: string;
  started_at: string;
  ended_at: string | null;
  language: string | null;
  outcome: string | null;
  recording_s3_key: string | null;
  ai_summary: string | null;
  twilio_call_sid: string | null;
};

export default function CallsPage() {
  const [items, setItems] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("calls")
      .select(
        "id,started_at,ended_at,language,outcome,recording_s3_key,ai_summary,twilio_call_sid"
      )
      .order("started_at", { ascending: false })
      .limit(100);
    if (qError) setError(qError.message);
    else {
      setItems((data as Call[]) || []);
      setError(null);
    }
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("crm-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <CrmShell title="Calls" subtitle="Inbound voice sessions, outcomes, and recordings">
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      <section className="space-y-2">
        {items.length === 0 && !error && (
          <p className="rounded-xl border border-dashed border-sand-200 px-4 py-12 text-center text-sm text-sand-800/50">
            No calls yet. After the bot logs sessions, they appear here with transcripts and
            recordings.
          </p>
        )}
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/calls/${c.id}`}
            className="block rounded-xl border border-sand-200/80 bg-white/70 px-5 py-4 hover:border-oasis-500/40 transition"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-sand-900">
                  {format(new Date(c.started_at), "d MMM yyyy · HH:mm")}
                  {c.language ? (
                    <span className="font-normal text-sand-800/55">
                      {" "}
                      · {c.language.toUpperCase()}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-sand-800/70 line-clamp-2">
                  {c.ai_summary || "Open for transcript and recording"}
                </p>
                {c.twilio_call_sid && (
                  <p className="mt-1 text-xs text-sand-800/40 truncate max-w-md">
                    {c.twilio_call_sid}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.recording_s3_key && (
                  <span className="text-xs text-oasis-600 border border-oasis-500/30 rounded-full px-2 py-0.5">
                    Recording
                  </span>
                )}
                <StatusBadge status={c.outcome || "in_progress"} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </CrmShell>
  );
}
