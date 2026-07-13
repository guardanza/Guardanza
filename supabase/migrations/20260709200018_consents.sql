-- consents: record of consent given for data verification (screening, etc).

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null,
  granted_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb
);

create index consents_user_id_idx on public.consents (user_id);
