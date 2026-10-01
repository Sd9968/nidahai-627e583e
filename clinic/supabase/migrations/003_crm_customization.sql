-- CRM customization: integrations marketplace, pipeline/kanban, custom fields, saved views.
-- All tables are clinic-scoped and reuse public.staff_clinic_id() for RLS.

-- 1. Integrations — per-clinic connector state. The catalog itself lives in the app.
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  provider text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'disconnected',
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (clinic_id, provider)
);

-- 2. Pipeline stages + leads (kanban)
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  color text not null default '#0d7377',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  phone text,
  source text default 'manual',
  stage_id uuid references pipeline_stages(id) on delete set null,
  value numeric default 0,
  notes text,
  position int not null default 0,
  patient_id uuid references patients(id) on delete set null,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Custom field definitions; values stored in a `custom` jsonb column per entity.
create table if not exists public.custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  entity text not null check (entity in ('patient','appointment','lead')),
  key text not null,
  label text not null,
  field_type text not null default 'text'
    check (field_type in ('text','number','date','select','boolean')),
  options jsonb not null default '[]'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, entity, key)
);

alter table public.patients add column if not exists custom jsonb not null default '{}'::jsonb;
alter table public.appointments add column if not exists custom jsonb not null default '{}'::jsonb;

-- 4. Saved views — reusable filtered views per entity.
create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  entity text not null,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.integrations enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.custom_field_defs enable row level security;
alter table public.saved_views enable row level security;

drop policy if exists staff_integrations_all on public.integrations;
create policy staff_integrations_all on public.integrations for all
  using (clinic_id = public.staff_clinic_id()) with check (clinic_id = public.staff_clinic_id());

drop policy if exists staff_stages_all on public.pipeline_stages;
create policy staff_stages_all on public.pipeline_stages for all
  using (clinic_id = public.staff_clinic_id()) with check (clinic_id = public.staff_clinic_id());

drop policy if exists staff_leads_all on public.leads;
create policy staff_leads_all on public.leads for all
  using (clinic_id = public.staff_clinic_id()) with check (clinic_id = public.staff_clinic_id());

drop policy if exists staff_cfd_all on public.custom_field_defs;
create policy staff_cfd_all on public.custom_field_defs for all
  using (clinic_id = public.staff_clinic_id()) with check (clinic_id = public.staff_clinic_id());

drop policy if exists staff_views_all on public.saved_views;
create policy staff_views_all on public.saved_views for all
  using (clinic_id = public.staff_clinic_id()) with check (clinic_id = public.staff_clinic_id());

-- Seed default pipeline stages for any clinic that has none.
insert into public.pipeline_stages (clinic_id, name, color, position)
select c.id, s.name, s.color, s.pos
from public.clinics c
cross join (values
  ('New Lead', '#64748b', 0),
  ('Contacted', '#0ea5e9', 1),
  ('Appointment Booked', '#0d7377', 2),
  ('Completed', '#059669', 3),
  ('Lost', '#dc2626', 4)
) as s(name, color, pos)
where not exists (select 1 from public.pipeline_stages ps where ps.clinic_id = c.id);

-- Seed a couple of example custom fields so the feature is visible.
insert into public.custom_field_defs (clinic_id, entity, key, label, field_type, options, position)
select c.id, v.entity, v.key, v.label, v.ftype, v.opts::jsonb, v.pos
from public.clinics c
cross join (values
  ('patient', 'insurance', 'Insurance Provider', 'select', '["Bupa","Tawuniya","MedGulf","None"]', 0),
  ('patient', 'dob', 'Date of Birth', 'date', '[]', 1)
) as v(entity, key, label, ftype, opts, pos)
where not exists (
  select 1 from public.custom_field_defs d
  where d.clinic_id = c.id and d.entity = v.entity and d.key = v.key
);
