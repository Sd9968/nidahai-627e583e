"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmShell } from "@/components/CrmShell";
import { useClinicId } from "@/lib/use-clinic";
import {
  CATEGORIES,
  INTEGRATION_CATALOG,
  type IntegrationDef,
} from "@/lib/integrations-catalog";

type Row = { provider: string; enabled: boolean; config: Record<string, string>; status: string };

function IconTile({ name, accent }: { name: string; accent: string }) {
  const initials = name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
      style={{ backgroundColor: accent }}
    >
      {initials}
    </div>
  );
}

export default function IntegrationsPage() {
  const clinicId = useClinicId();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<IntegrationDef | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("integrations")
      .select("provider,enabled,config,status");
    if (e) return setError(e.message);
    const map: Record<string, Row> = {};
    (data || []).forEach((r: any) => (map[r.provider] = r));
    setRows(map);
    setError(null);
  }

  useEffect(() => {
    load();
  }, []);

  const connectedCount = useMemo(
    () => Object.values(rows).filter((r) => r.enabled).length,
    [rows]
  );

  const visible = useMemo(
    () =>
      INTEGRATION_CATALOG.filter(
        (i) =>
          (cat === "All" || i.category === cat) &&
          (q.trim() === "" ||
            i.name.toLowerCase().includes(q.toLowerCase()) ||
            i.description.toLowerCase().includes(q.toLowerCase()))
      ),
    [cat, q]
  );

  async function toggle(def: IntegrationDef, on: boolean) {
    if (!clinicId) return;
    const supabase = createClient();
    const existing = rows[def.provider];
    const payload = {
      clinic_id: clinicId,
      provider: def.provider,
      enabled: on,
      status: on ? "connected" : "disconnected",
      config: existing?.config ?? {},
      connected_at: on ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error: e } = await supabase
      .from("integrations")
      .upsert(payload, { onConflict: "clinic_id,provider" });
    if (e) setError(e.message);
    else load();
  }

  function openConfig(def: IntegrationDef) {
    setEditing(def);
    setDraft(rows[def.provider]?.config ?? {});
  }

  async function saveConfig() {
    if (!editing || !clinicId) return;
    const supabase = createClient();
    const { error: e } = await supabase.from("integrations").upsert(
      {
        clinic_id: clinicId,
        provider: editing.provider,
        enabled: true,
        status: "connected",
        config: draft,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clinic_id,provider" }
    );
    if (e) setError(e.message);
    else {
      setEditing(null);
      load();
    }
  }

  return (
    <CrmShell
      title="Integrations"
      subtitle="Plug NidahAI into your support stack — every call can create or update records automatically."
    >
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search integrations…"
          className="w-full max-w-xs rounded-lg border border-sand-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-oasis-500"
        />
        <span className="rounded-full bg-oasis-50 px-3 py-1 text-xs font-medium text-oasis-700">
          {connectedCount} connected
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              cat === c
                ? "bg-oasis-600 text-white"
                : "bg-sand-100 text-sand-800/70 hover:bg-sand-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((def) => {
          const row = rows[def.provider];
          const on = !!row?.enabled;
          return (
            <div
              key={def.provider}
              className={`rounded-2xl border bg-white/70 p-4 transition ${
                on ? "border-oasis-500/50 shadow-sm" : "border-sand-200/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <IconTile name={def.name} accent={def.accent} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sand-900">{def.name}</p>
                    {on && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
                    )}
                  </div>
                  <p className="truncate text-sm text-sand-800/60">{def.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(def, !on)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    on ? "bg-oasis-600" : "bg-sand-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      on ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-md bg-sand-100 px-2 py-0.5 text-xs text-sand-800/70">
                  {def.category}
                </span>
                <button
                  onClick={() => openConfig(def)}
                  className="text-xs font-medium text-oasis-700 hover:underline"
                >
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-sand-900/30 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <IconTile name={editing.name} accent={editing.accent} />
              <div>
                <h3 className="font-medium text-sand-900">Configure {editing.name}</h3>
                <p className="text-sm text-sand-800/60">{editing.description}</p>
              </div>
            </div>
            <div className="space-y-3">
              {editing.fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-sm text-sand-800/70">{f.label}</label>
                  <input
                    type={f.type === "password" ? "password" : "text"}
                    value={draft[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm outline-none focus:border-oasis-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm text-sand-800/70 hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="rounded-lg bg-oasis-600 px-4 py-2 text-sm font-medium text-white hover:bg-oasis-700"
              >
                Save &amp; connect
              </button>
            </div>
          </div>
        </div>
      )}
    </CrmShell>
  );
}
