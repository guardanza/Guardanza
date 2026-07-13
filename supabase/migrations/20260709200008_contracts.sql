-- contracts: the rental agreement itself.

create type public.currency_code as enum ('CLP', 'UF');

create type public.contract_status as enum (
  'borrador',
  'pendiente_firma',
  'activo',
  'en_disputa',
  'finalizado'
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  status public.contract_status not null default 'borrador',
  start_date date not null,
  end_date date not null,
  rent_amount numeric(14, 2) not null check (rent_amount > 0),
  rent_currency public.currency_code not null,

  -- Guarantee terms: guarantee_currency/guarantee_amount are the source of
  -- truth chosen for this contract. uf_rate_at_signing freezes the UF value
  -- at signature time so the "other currency" equivalent is always computed
  -- against that frozen rate, never against today's UF (see
  -- guarantee_amounts() below).
  guarantee_currency public.currency_code not null,
  guarantee_amount numeric(14, 2) not null check (guarantee_amount > 0),
  uf_rate_at_signing numeric(14, 4),
  signed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date > start_date),
  check (signed_at is null or uf_rate_at_signing is not null)
);

create index contracts_property_id_idx on public.contracts (property_id);
create index contracts_status_idx on public.contracts (status);

create trigger set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();
