-- contract_parties: the backbone of RBAC. Every access-control decision in
-- the system resolves against this table via has_contract_access() (defined
-- in a later migration, once contracts/disputes/etc all exist).

create type public.contract_role as enum ('arrendador', 'arrendatario', 'corredor');

create table public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.contract_role not null,
  created_at timestamptz not null default now(),
  unique (contract_id, user_id)
);

create index contract_parties_contract_id_idx on public.contract_parties (contract_id);
create index contract_parties_user_id_idx on public.contract_parties (user_id);

-- Composite index backing has_contract_access() (contract_id, user_id) lookups.
create index contract_parties_access_idx on public.contract_parties (contract_id, user_id, role);
