"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Turn = {
  id: string;
  speaker: string;
  transcript_text: string | null;
  created_at: string;
  turn_number: number;
};

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [call, setCall] = useState<Call | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();

    async function load() {
      const [callRes, turnsRes] = await Promise.all([
        supabase
          .from("calls")
          .select(
            "id,started_at,ended_at,language,outcome,recording_s3_key,ai_summary,twilio_call_sid"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("conversation_turns")
          .select("id,speaker,transcript_text,created_at,turn_number")
          .eq("call_id", id)
          .order("turn_number", { ascending: true }),
      ]);

      if (callRes.error) {
        setError(callRes.error.message);
        return;
      }
      setCall(callRes.data as Call);
      setTurns((turnsRes.data as Turn[]) || []);
      setError(null);

      if (callRes.data?.recording_s3_key) {
        try {
          const res = await fetch(`/api/recordings/${id}`);
          if (res.ok) {
            const json = await res.json();
            setRecordingUrl(json.url || null);
          }
        } catch {
          /* recording optional */
        }
      }
    }

    load();
  }, [id]);

  return (
    <CrmShell
      title="Call detail"
      subtitle={
        call
          ? format(new Date(call.started_at), "d MMM yyyy · HH:mm")
          : "Transcript and recording"
      }
    >
      <p className="mb-6">
        <Link href="/calls" className="text-sm text-oasis-600 hover:underline">
          ← All calls
        </Link>
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {!call && !error && (
        <p className="text-sm text-sand-800/50">Loading…</p>
      )}

      {call && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-3 text-lg text-sand-900">Transcript</h2>
            {turns.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sand-200 px-4 py-8 text-center text-sm text-sand-800/50">
                No turns stored for this call yet
              </p>
            ) : (
              <div className="space-y-3">
                {turns.map((t) => {
                  const isAi = t.speaker === "ai" || t.speaker === "system";
                  const label =
                    t.speaker === "ai"
                      ? "Agent"
                      : t.speaker === "patient"
                        ? "Caller"
                        : t.speaker;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-xl px-4 py-3 text-sm ${
                        isAi
                          ? "bg-oasis-600/10 border border-oasis-500/20"
                          : "bg-white/70 border border-sand-200/80"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-sand-800/45 mb-1">
                        {label}
                        {" · "}
                        {format(new Date(t.created_at), "HH:mm:ss")}
                      </p>
                      <p className="text-sand-900 whitespace-pre-wrap">
                        {t.transcript_text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-sand-200/80 bg-white/70 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-sand-800/45">Status</p>
              <div className="mt-2">
                <StatusBadge status={call.outcome || "in_progress"} />
              </div>
              {call.language && (
                <p className="mt-3 text-sm text-sand-800/70">
                  Language: {call.language.toUpperCase()}
                </p>
              )}
              {call.ended_at && (
                <p className="mt-1 text-sm text-sand-800/55">
                  Ended {format(new Date(call.ended_at), "HH:mm:ss")}
                </p>
              )}
              {call.twilio_call_sid && (
                <p className="mt-1 text-xs text-sand-800/45 break-all">
                  SID: {call.twilio_call_sid}
                </p>
              )}
            </div>

            {call.ai_summary && (
              <div className="rounded-xl border border-sand-200/80 bg-white/70 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-sand-800/45">Summary</p>
                <p className="mt-2 text-sm text-sand-900">{call.ai_summary}</p>
              </div>
            )}

            <div className="rounded-xl border border-sand-200/80 bg-white/70 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-sand-800/45 mb-2">
                Recording
              </p>
              {recordingUrl ? (
                <audio controls className="w-full" src={recordingUrl} preload="metadata" />
              ) : call.recording_s3_key ? (
                <p className="text-sm text-sand-800/55">
                  Recording stored — signed URL unavailable (check dashboard AWS env)
                </p>
              ) : (
                <p className="text-sm text-sand-800/55">
                  No recording yet. Set TWILIO_RECORD_CALLS=true and S3_RECORDINGS_BUCKET on
                  the bot.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </CrmShell>
  );
}
