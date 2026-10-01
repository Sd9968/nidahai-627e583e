-- Fix: "stack depth limit exceeded" on every staff dashboard query.
--
-- Cause: public.staff_clinic_id() reads staff_users, but the RLS policies on
-- staff_users (and all other tables) call staff_clinic_id(). Because the
-- function was plain `language sql` (invoker rights), its read of staff_users
-- re-evaluated those policies, which called the function again → infinite
-- recursion.
--
-- Fix: mark the function SECURITY DEFINER so its read bypasses RLS and breaks
-- the cycle. Idempotent — safe to run on the existing database.

create or replace function public.staff_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from staff_users where auth_user_id = auth.uid() limit 1;
$$;
