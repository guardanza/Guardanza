-- disputes: opened against a guarantee at end of tenancy.

create type public.dispute_status as enum (
  'abierta',
  'negociando',
  'acordada',
  'liquidada',
  'escalada'
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  guarantee_id uuid not null references public.guarantees (id) on delete restrict,
  status public.dispute_status not null default 'abierta',
  opened_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index disputes_guarantee_id_idx on public.disputes (guarantee_id);
create index disputes_status_idx on public.disputes (status);

create trigger set_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();
