-- Short, human-speakable reference codes patients can quote on a call:
--   patients.ref_code     static  e.g. P1001
--   appointments.ref_code dynamic e.g. B1001 (one per booking)

create sequence if not exists patient_ref_seq start 1001;
create sequence if not exists appointment_ref_seq start 1001;

alter table public.patients add column if not exists ref_code text;
alter table public.appointments add column if not exists ref_code text;

-- Auto-assign on insert if not provided.
create or replace function public.assign_patient_ref()
returns trigger language plpgsql as $$
begin
  if new.ref_code is null then
    new.ref_code := 'P' || lpad(nextval('patient_ref_seq')::text, 4, '0');
  end if;
  return new;
end $$;

create or replace function public.assign_appointment_ref()
returns trigger language plpgsql as $$
begin
  if new.ref_code is null then
    new.ref_code := 'B' || lpad(nextval('appointment_ref_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists patient_ref_trg on public.patients;
create trigger patient_ref_trg before insert on public.patients
  for each row execute function public.assign_patient_ref();

drop trigger if exists appointment_ref_trg on public.appointments;
create trigger appointment_ref_trg before insert on public.appointments
  for each row execute function public.assign_appointment_ref();

-- Backfill existing rows (deterministic order so codes are stable).
update public.patients p set ref_code = 'P' || lpad(nextval('patient_ref_seq')::text, 4, '0')
  where ref_code is null;
update public.appointments a set ref_code = 'B' || lpad(nextval('appointment_ref_seq')::text, 4, '0')
  where ref_code is null;

create unique index if not exists patients_ref_code_key on public.patients(ref_code);
create unique index if not exists appointments_ref_code_key on public.appointments(ref_code);
