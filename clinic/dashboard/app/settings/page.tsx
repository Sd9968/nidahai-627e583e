"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmShell } from "@/components/CrmShell";
import { useClinicId } from "@/lib/use-clinic";

type FieldDef = {
  id: string;
  entity: string;
  key: string;
  label: string;
  field_type: string;
  options: string[];
  position: number;
};
type SavedView = { id: string; entity: string; name: string; filters: any };

const ENTITIES = [
  { id: "patient", label: "Patients" },
  { id: "appointment", label: "Bookings" },
  { id: "lead", label: "Leads" },
];
const TYPES = ["text", "number", "date", "select", "boolean"];

export default function SettingsPage() {
  const clinicId = useClinicId();
  const [entity, setEntity] = useState("patient");
  const [defs, setDefs] = useState<FieldDef[]>([]);
  const [views, setViews] = useState<SavedView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nf, setNf] = useState({ label: "", field_type: "text", options: "" });

  async function load() {
    const supabase = createClient();
    const [d, v] = await Promise.all([
      supabase
        .from("custom_field_defs")
        .select("id,entity,key,label,field_type,options,position")
        .order("position"),
      supabase.from("saved_views").select("id,entity,name,filters").order("created_at"),
    ]);
    if (d.error) return setError(d.error.message);
    setDefs((d.data as FieldDef[]) || []);
    setViews((v.data as SavedView[]) || []);
    setError(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function addField() {
    if (!clinicId || !nf.label.trim()) return;
    const key = nf.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const supabase = createClient();
    const { error: e } = await supabase.from("custom_field_defs").insert({
      clinic_id: clinicId,
      entity,
      key,
      label: nf.label.trim(),
      field_type: nf.field_type,
      options:
        nf.field_type === "select"
          ? nf.options.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      position: defs.filter((d) => d.entity === entity).length,
    });
    if (e) setError(e.message);
    else {
      setNf({ label: "", field_type: "text", options: "" });
      load();
    }
  }

  async function removeField(id: string) {
    const supabase = createClient();
    const { error: e } = await supabase.from("custom_field_defs").delete().eq("id", id);
    if (e) setError(e.message);
    else load();
  }

  async function removeView(id: string) {
    const supabase = createClient();
    await supabase.from("saved_views").delete().eq("id", id);
    load();
  }

  const entityDefs = defs.filter((d) => d.entity === entity);

  return (
    <CrmShell title="Settings" subtitle="Customize fields and saved views for your clinic.">
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-sand-900">Custom fields</h2>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {ENTITIES.map((e) => (
            <button
              key={e.id}
              onClick={() => setEntity(e.id)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                entity === e.id
                  ? "bg-oasis-600 text-white"
                  : "bg-sand-100 text-sand-800/70 hover:bg-sand-200"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {entityDefs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-sand-200/80 bg-white/70 px-4 py-3"
            >
              <div>
                <p className="font-medium text-sand-900">{d.label}</p>
                <p className="text-sm text-sand-800/55">
                  <span className="font-mono">{d.key}</span> · {d.field_type}
                  {d.field_type === "select" && d.options?.length
                    ? ` (${d.options.join(", ")})`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => removeField(d.id)}
                className="text-sm text-red-600/80 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {entityDefs.length === 0 && (
            <p className="rounded-xl border border-dashed border-sand-200 px-4 py-8 text-center text-sm text-sand-800/50">
              No custom fields for {ENTITIES.find((e) => e.id === entity)?.label} yet
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-sand-200/80 bg-sand-50/50 p-4">
          <div>
            <label className="mb-1 block text-xs text-sand-800/60">Field label</label>
            <input
              value={nf.label}
              onChange={(e) => setNf({ ...nf, label: e.target.value })}
              placeholder="e.g. Insurance Provider"
              className="rounded-lg border border-sand-200 px-3 py-2 text-sm outline-none focus:border-oasis-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-sand-800/60">Type</label>
            <select
              value={nf.field_type}
              onChange={(e) => setNf({ ...nf, field_type: e.target.value })}
              className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {nf.field_type === "select" && (
            <div>
              <label className="mb-1 block text-xs text-sand-800/60">Options (comma-separated)</label>
              <input
                value={nf.options}
                onChange={(e) => setNf({ ...nf, options: e.target.value })}
                placeholder="Bupa, Tawuniya, None"
                className="rounded-lg border border-sand-200 px-3 py-2 text-sm outline-none focus:border-oasis-500"
              />
            </div>
          )}
          <button
            onClick={addField}
            className="rounded-lg bg-oasis-600 px-4 py-2 text-sm font-medium text-white hover:bg-oasis-700"
          >
            Add field
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-sand-900">Saved views</h2>
        <div className="space-y-2">
          {views.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-sand-200/80 bg-white/70 px-4 py-3"
            >
              <div>
                <p className="font-medium text-sand-900">{v.name}</p>
                <p className="text-sm text-sand-800/55 capitalize">
                  {v.entity} · {JSON.stringify(v.filters)}
                </p>
              </div>
              <button
                onClick={() => removeView(v.id)}
                className="text-sm text-red-600/80 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {views.length === 0 && (
            <p className="rounded-xl border border-dashed border-sand-200 px-4 py-8 text-center text-sm text-sand-800/50">
              No saved views yet — create one from the Bookings page.
            </p>
          )}
        </div>
      </section>
    </CrmShell>
  );
}
