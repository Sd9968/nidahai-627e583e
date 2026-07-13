-- NidahAI initial schema (Supabase / Postgres)
-- Run in Supabase SQL Editor or: supabase db push

create extension if not exists "pgcrypto";

-- Clinics
create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  phone_number text,
  address_ar text,
  address_en text,
  city text default 'Riyadh',
  working_hours jsonb default '{"sun":"09:00-17:00","mon":"09:00-17:00","tue":"09:00-17:00","wed":"09:00-17:00","thu":"09:00-17:00"}'::jsonb,
  prayer_times_enabled boolean default true,
  after_hours_only boolean default true,
  created_at timestamptz default now()
);

-- Doctors
create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  specialty text not null,
  gender text check (gender in ('male','female')),
  consultation_duration_mins int default 20,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  end_time time not null
);

-- Patients
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  name text not null,
  phone_primary text not null,
  national_id_encrypted text,
  insurance_provider text,
  created_at timestamptz default now()
);
create index if not exists patients_phone_idx on patients(phone_primary);

-- Appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id),
  doctor_id uuid references doctors(id),
  scheduled_at timestamptz not null,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation','confirmed','cancelled','completed','no_show','rescheduled')),
  source text default 'voice_ai',
  source_call_id uuid,
  confirmed_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists appointments_status_idx on appointments(status);
create index if not exists appointments_clinic_idx on appointments(clinic_id);

-- Calls
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  twilio_call_sid text,
  language text,
  outcome text,
  consent_recorded boolean default false,
  avg_response_latency_ms int,
  word_error_rate numeric,
  recording_s3_key text,
  ai_summary text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table if not exists conversation_turns (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references calls(id) on delete cascade,
  turn_number int not null,
  speaker text check (speaker in ('patient','ai','system')),
  transcript_text text,
  intent_detected text,
  language text,
  latency_ms int,
  created_at timestamptz default now()
);

-- Escalations
create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  call_id uuid references calls(id),
  reason_code text not null,
  notes text,
  status text default 'callback_queued',
  triggered_at timestamptz default now(),
  assigned_to uuid,
  resolved_at timestamptz
);

-- Staff (linked to Supabase Auth via auth_user_id)
create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  auth_user_id uuid unique,
  email text not null unique,
  full_name text,
  role text default 'staff' check (role in ('admin','staff')),
  created_at timestamptz default now()
);

-- Audit log (immutable by policy)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('ai','staff','patient','system')),
  actor_id text,
  action text not null,
  resource_type text,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  call_id uuid,
  clinic_id uuid,
  severity text default 'info',
  created_at timestamptz default now()
);

create or replace function prevent_audit_mutation()
returns trigger as $$
begin
  raise exception 'audit_log is immutable';
end;
$$ language plpgsql;

drop trigger if exists audit_log_no_update on audit_log;
create trigger audit_log_no_update
  before update or delete on audit_log
  for each row execute function prevent_audit_mutation();

-- Prayer times
create table if not exists prayer_times (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  prayer_date date not null,
  fajr time,
  dhuhr time,
  asr time,
  maghrib time,
  isha time,
  unique(city, prayer_date)
);

-- RLS
alter table clinics enable row level security;
alter table doctors enable row level security;
alter table doctor_availability enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table calls enable row level security;
alter table conversation_turns enable row level security;
alter table escalations enable row level security;
alter table staff_users enable row level security;
alter table audit_log enable row level security;
alter table prayer_times enable row level security;

-- Helper: staff clinic_id from JWT claim or staff_users
create or replace function public.staff_clinic_id()
returns uuid
language sql
stable
as $$
  select clinic_id from staff_users where auth_user_id = auth.uid() limit 1;
$$;

-- Policies: staff can read/write their clinic; service role bypasses RLS
create policy staff_clinic_select on clinics for select
  using (id = public.staff_clinic_id());

create policy staff_doctors_all on doctors for all
  using (clinic_id = public.staff_clinic_id())
  with check (clinic_id = public.staff_clinic_id());

create policy staff_availability_all on doctor_availability for all
  using (doctor_id in (select id from doctors where clinic_id = public.staff_clinic_id()))
  with check (doctor_id in (select id from doctors where clinic_id = public.staff_clinic_id()));

create policy staff_patients_all on patients for all
  using (clinic_id = public.staff_clinic_id())
  with check (clinic_id = public.staff_clinic_id());

create policy staff_appointments_all on appointments for all
  using (clinic_id = public.staff_clinic_id())
  with check (clinic_id = public.staff_clinic_id());

create policy staff_calls_all on calls for all
  using (clinic_id = public.staff_clinic_id())
  with check (clinic_id = public.staff_clinic_id());

create policy staff_turns_select on conversation_turns for select
  using (call_id in (select id from calls where clinic_id = public.staff_clinic_id()));

create policy staff_escalations_all on escalations for all
  using (clinic_id = public.staff_clinic_id())
  with check (clinic_id = public.staff_clinic_id());

create policy staff_self_select on staff_users for select
  using (auth_user_id = auth.uid() or clinic_id = public.staff_clinic_id());

create policy staff_audit_select on audit_log for select
  using (clinic_id = public.staff_clinic_id());

create policy staff_prayer_select on prayer_times for select using (true);
