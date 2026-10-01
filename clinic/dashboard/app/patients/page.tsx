"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { CrmShell } from "@/components/CrmShell";
import { useCustomFields } from "@/lib/use-custom-fields";

type Patient = {
  id: string;
  ref_code: string | null;
  name: string;
  phone_primary: string;
  created_at: string;
  custom: Record<string, any> | null;
};

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { defs } = useCustomFields("patient");

  async function load() {
    const supabase = createClient();
    let query = supabase
      .from("patients")
      .select("id,ref_code,name,phone_primary,created_at,custom")
      .order("created_at", { ascending: false })
      .limit(200);
    if (q.trim()) {
      query = query.or(`name.ilike.%${q.trim()}%,phone_primary.ilike.%${q.trim()}%`);
    }
    const { data, error: qError } = await query;
    if (qError) setError(qError.message);
    else {
      setItems((data as Patient[]) || []);
      setError(null);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggle(p: Patient) {
    if (open === p.id) {
      setOpen(null);
    } else {
      setOpen(p.id);
      setDraft(p.custom || {});
    }
  }

  async function saveCustom(id: string) {
    setSaving(true);
    const supabase = createClient();
    const { error: e } = await supabase.from("patients").update({ custom: draft }).eq("id", id);
    setSaving(false);
    if (e) setError(e.message);
    else {
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, custom: draft } : p)));
      setOpen(null);
    }
  }

  return (
    <CrmShell title="Patients" subtitle="Callers captured by the voice agent">
      <div className="mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className="w-full max-w-md rounded-lg border border-sand-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-oasis-500"
        />
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="space-y-2">
        {items.length === 0 && !error && (
          <p className="rounded-xl border border-dashed border-sand-200 px-4 py-12 text-center text-sm text-sand-800/50">
            No patients yet
          </p>
        )}
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-sand-200/80 bg-white/70">
            <button
              onClick={() => toggle(p)}
              className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sand-900">{p.name}</p>
                  {p.ref_code && (
                    <span className="rounded-md bg-sand-100 px-2 py-0.5 font-mono text-xs text-sand-800/70">
                      {p.ref_code}
                    </span>
                  )}
                </div>
                <p className="text-sm text-sand-800/60">{p.phone_primary}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-sand-800/55">
                {p.custom && Object.keys(p.custom).length > 0 && (
                  <span className="rounded-full bg-oasis-50 px-2 py-0.5 text-xs text-oasis-700">
                    {Object.keys(p.custom).length} fields
                  </span>
                )}
                {format(new Date(p.created_at), "d MMM yyyy")}
              </div>
            </button>

            {open === p.id && (
              <div className="border-t border-sand-200/70 px-5 py-4">
                {defs.length === 0 ? (
                  <p className="text-sm text-sand-800/55">
                    No custom fields defined. Add some in Settings.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {defs.map((f) => (
                      <div key={f.id}>
                        <label className="mb-1 block text-xs text-sand-800/60">{f.label}</label>
                        {f.field_type === "select" ? (
                          <select
                            value={draft[f.key] ?? ""}
                            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                            className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-500"
                          >
                            <option value="">—</option>
                            {f.options.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : f.field_type === "boolean" ? (
                          <input
                            type="checkbox"
                            checked={!!draft[f.key]}
                            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })}
                            className="h-5 w-5 accent-oasis-600"
                          />
                        ) : (
                          <input
                            type={
                              f.field_type === "number"
                                ? "number"
                                : f.field_type === "date"
                                ? "date"
                                : "text"
                            }
                            value={draft[f.key] ?? ""}
                            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                            className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm outline-none focus:border-oasis-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {defs.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => saveCustom(p.id)}
                      disabled={saving}
                      className="rounded-lg bg-oasis-600 px-4 py-2 text-sm font-medium text-white hover:bg-oasis-700 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save fields"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </CrmShell>
  );
}
