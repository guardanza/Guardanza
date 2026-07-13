-- guarantees: 1:1 with contracts. amount/currency mirror the contract's
-- guarantee terms (not recomputed independently) so there is a single
-- source of truth for "what was agreed" (contracts) vs. "what is happening
-- with the money" (guarantees + ledger_entries).

create type public.guarantee_status as enum (
  'pendiente',
  'pagada',
  'en_custodia',
  'en_liquidacion',
  'liquidada'
);

create type public.funding_mode as enum ('simulated', 'real');

create table public.guarantees (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts (id) on delete restrict,
  status public.guarantee_status not null default 'pendiente',
  funding_mode public.funding_mode not null default 'simulated',
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency_code not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guarantees_contract_id_idx on public.guarantees (contract_id);
create index guarantees_status_idx on public.guarantees (status);

create trigger set_updated_at
  before update on public.guarantees
  for each row execute function public.set_updated_at();

-- amount/currency must match the contract's guarantee terms at insert time.
create or replace function public.guarantees_match_contract()
returns trigger
language plpgsql
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = new.contract_id;
  if v_contract.guarantee_amount <> new.amount or v_contract.guarantee_currency <> new.currency then
    raise exception 'guarantees.amount/currency must match contracts.guarantee_amount/guarantee_currency';
  end if;
  return new;
end;
$$;

create trigger guarantees_match_contract
  before insert on public.guarantees
  for each row execute function public.guarantees_match_contract();
