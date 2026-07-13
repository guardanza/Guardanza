-- proposal_items: line items of a proposal. When an item references the
-- repair catalog, its price is resolved ONCE at insert time (via the price
-- in force on repair_reference_version_id) and frozen into
-- unit_price_snapshot/amount on the row itself. That frozen number is what a
-- judge/mediator sees later — it never depends on repair_reference_versions
-- being re-queried, so a future bug in pricing logic can't retroactively
-- change what was disputed. repair_reference_version_id is kept purely for
-- traceability back to the catalog.

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  description text not null,
  repair_reference_version_id uuid references public.repair_reference_versions (id) on delete restrict,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_snapshot numeric(14, 2),
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  check (
    (repair_reference_version_id is null and unit_price_snapshot is null)
    or (repair_reference_version_id is not null and unit_price_snapshot is not null)
  )
);

create index proposal_items_proposal_id_idx on public.proposal_items (proposal_id);
create index proposal_items_repair_reference_version_id_idx
  on public.proposal_items (repair_reference_version_id);

-- Freeze the catalog price into the row at insert time (see header note).
create or replace function public.proposal_items_freeze_price()
returns trigger
language plpgsql
as $$
begin
  if new.repair_reference_version_id is not null then
    select unit_price into new.unit_price_snapshot
    from public.repair_reference_versions
    where id = new.repair_reference_version_id;

    if new.unit_price_snapshot is null then
      raise exception 'invalid repair_reference_version_id %', new.repair_reference_version_id;
    end if;

    -- Server computes the authoritative amount from the frozen price —
    -- never trusts a client-supplied amount for catalog-backed items.
    new.amount := new.unit_price_snapshot * new.quantity;
  end if;
  return new;
end;
$$;

create trigger proposal_items_freeze_price
  before insert on public.proposal_items
  for each row execute function public.proposal_items_freeze_price();

-- Items inherit the immutability of their parent proposal.
revoke update, delete on public.proposal_items from authenticated, anon;
