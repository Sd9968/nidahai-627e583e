"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmShell } from "@/components/CrmShell";
import { useClinicId } from "@/lib/use-clinic";

type Stage = { id: string; name: string; color: string; position: number };
type Lead = {
  id: string;
  name: string;
  phone: string | null;
  value: number | null;
  notes: string | null;
  stage_id: string | null;
  source: string | null;
};

export default function PipelinePage() {
  const clinicId = useClinicId();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // stage id being added to
  const [form, setForm] = useState({ name: "", phone: "", value: "" });

  async function load() {
    const supabase = createClient();
    const [s, l] = await Promise.all([
      supabase.from("pipeline_stages").select("id,name,color,position").order("position"),
      supabase
        .from("leads")
        .select("id,name,phone,value,notes,stage_id,source")
        .order("created_at", { ascending: false }),
    ]);
    if (s.error) return setError(s.error.message);
    if (l.error) return setError(l.error.message);
    setStages((s.data as Stage[]) || []);
    setLeads((l.data as Lead[]) || []);
    setError(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function moveLead(leadId: string, stageId: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage_id: stageId } : l)));
    const supabase = createClient();
    const { error: e } = await supabase
      .from("leads")
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (e) {
      setError(e.message);
      load();
    }
  }

  async function addLead(stageId: string) {
    if (!clinicId || !form.name.trim()) return;
    const supabase = createClient();
    const { error: e } = await supabase.from("leads").insert({
      clinic_id: clinicId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      value: form.value ? Number(form.value) : 0,
      stage_id: stageId,
      source: "manual",
    });
    if (e) setError(e.message);
    else {
      setForm({ name: "", phone: "", value: "" });
      setAdding(null);
      load();
    }
  }

  const money = (n: number | null) =>
    n ? `SAR ${Number(n).toLocaleString()}` : null;

  return (
    <CrmShell
      title="Pipeline"
      subtitle="Drag leads across stages. Stages are customizable per clinic."
    >
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const col = leads.filter((l) => l.stage_id === stage.id);
          const total = col.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver((v) => (v === stage.id ? null : v))}
              onDrop={() => {
                if (dragId) moveLead(dragId, stage.id);
                setDragId(null);
                setDragOver(null);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${
                dragOver === stage.id
                  ? "border-oasis-500 bg-oasis-50/40"
                  : "border-sand-200/80 bg-sand-50/40"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-medium text-sand-900">{stage.name}</span>
                  <span className="rounded-full bg-sand-100 px-2 text-xs text-sand-800/60">
                    {col.length}
                  </span>
                </div>
                {total > 0 && (
                  <span className="text-xs text-sand-800/55">{money(total)}</span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {col.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-xl border border-sand-200 bg-white p-3 shadow-sm transition active:cursor-grabbing ${
                      dragId === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    <p className="font-medium text-sand-900">{lead.name}</p>
                    {lead.phone && (
                      <p className="text-sm text-sand-800/60">{lead.phone}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {money(lead.value) && (
                        <span className="rounded-md bg-oasis-50 px-2 py-0.5 text-xs text-oasis-700">
                          {money(lead.value)}
                        </span>
                      )}
                      {lead.source && (
                        <span className="rounded-md bg-sand-100 px-2 py-0.5 text-xs capitalize text-sand-800/60">
                          {lead.source.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {adding === stage.id ? (
                <div className="mt-2 space-y-2 rounded-xl border border-sand-200 bg-white p-3">
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Lead name"
                    className="w-full rounded-md border border-sand-200 px-2 py-1.5 text-sm outline-none focus:border-oasis-500"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone (optional)"
                    className="w-full rounded-md border border-sand-200 px-2 py-1.5 text-sm outline-none focus:border-oasis-500"
                  />
                  <input
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="Value SAR (optional)"
                    inputMode="numeric"
                    className="w-full rounded-md border border-sand-200 px-2 py-1.5 text-sm outline-none focus:border-oasis-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => addLead(stage.id)}
                      className="flex-1 rounded-md bg-oasis-600 py-1.5 text-sm font-medium text-white hover:bg-oasis-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAdding(null);
                        setForm({ name: "", phone: "", value: "" });
                      }}
                      className="rounded-md px-3 py-1.5 text-sm text-sand-800/60 hover:bg-sand-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(stage.id)}
                  className="mt-2 rounded-lg border border-dashed border-sand-200 py-2 text-sm text-sand-800/55 hover:border-oasis-400 hover:text-oasis-700"
                >
                  + Add lead
                </button>
              )}
            </div>
          );
        })}
        {stages.length === 0 && !error && (
          <p className="text-sm text-sand-800/50">No pipeline stages configured.</p>
        )}
      </div>
    </CrmShell>
  );
}
