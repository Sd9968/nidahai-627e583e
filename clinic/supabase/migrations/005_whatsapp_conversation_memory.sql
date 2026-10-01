-- WhatsApp conversation memory. Without this, every inbound message is handled
-- statelessly, so a reply like "Yes" has no antecedent and the assistant restarts
-- the conversation. We keep a short rolling transcript per phone number.

create table if not exists public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_messages_phone_created_idx
  on public.wa_messages (phone, created_at desc);

-- Service-role only (the bot writes/reads it); no staff policies yet.
alter table public.wa_messages enable row level security;
