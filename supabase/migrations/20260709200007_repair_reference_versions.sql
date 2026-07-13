-- repair_reference_versions: price history for a repair_reference. A price is
-- never edited in place — closing valid_to and inserting a new row is the
-- only way to change a price. The only mutation ever allowed on an existing
-- row is closing its valid_to (see trigger below).

create table public.repair_reference_versions (
  id uuid primary key default gen_random_uuid(),
  repair_reference_id uuid not null references public.repair_reference (id) on delete restrict,
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);

create index repair_reference_versions_reference_id_idx
  on public.repair_reference_versions (repair_reference_id);

-- Fast lookup of "the version in force at time T" for a given repair_reference.
create index repair_reference_versions_validity_idx
  on public.repair_reference_versions (repair_reference_id, valid_from, valid_to);

-- At most one open-ended (currently valid) version per repair_reference.
create unique index repair_reference_versions_one_open_idx
  on public.repair_reference_versions (repair_reference_id)
  where valid_to is null;

create or replace function public.repair_reference_versions_guard()
returns trigger
language plpgsql
as $$
begin
  if old.repair_reference_id <> new.repair_reference_id
     or old.unit_price <> new.unit_price
     or old.valid_from <> new.valid_from then
    raise exception 'repair_reference_versions rows are immutable except for closing valid_to';
  end if;
  if old.valid_to is not null then
    raise exception 'valid_to is already closed on this repair_reference_versions row';
  end if;
  return new;
end;
$$;

create trigger repair_reference_versions_guard
  before update on public.repair_reference_versions
  for each row execute function public.repair_reference_versions_guard();

revoke delete on public.repair_reference_versions from authenticated;

-- Resolve the price in force for a repair_reference at a given instant.
-- Used once, at proposal_item creation time, to freeze unit_price_snapshot —
-- never called again afterwards to avoid retroactively changing disputed amounts.
create or replace function public.repair_price_at(
  p_repair_reference_id uuid,
  p_at timestamptz default now()
)
returns table (version_id uuid, unit_price numeric)
language sql
stable
as $$
  select id, unit_price
  from public.repair_reference_versions
  where repair_reference_id = p_repair_reference_id
    and valid_from <= p_at
    and (valid_to is null or valid_to > p_at)
  order by valid_from desc
  limit 1;
$$;
