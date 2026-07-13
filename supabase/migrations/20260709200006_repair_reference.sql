-- repair_reference: catalog of repair types (painting per m2, lock change, etc).
-- Prices live in repair_reference_versions (next migration) — this table is
-- just the stable identity of a repair concept.

create table public.repair_reference (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  unit text not null, -- e.g. 'm2', 'unidad', 'hora'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.repair_reference
  for each row execute function public.set_updated_at();
