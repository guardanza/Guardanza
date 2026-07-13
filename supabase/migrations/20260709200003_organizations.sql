-- organizations: uniform model for anyone who administers properties —
-- a brokerage (broker) or an individual landlord operating direct (individual).

create type public.org_type as enum ('broker', 'individual');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.org_type not null,
  name text not null,
  rut text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();
