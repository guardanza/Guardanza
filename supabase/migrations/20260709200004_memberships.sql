-- memberships: user's role *inside* an organization (organizational RBAC,
-- distinct from contract_role which is contractual RBAC — see contract_parties).

create type public.org_role as enum ('admin', 'agente');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_organization_id_idx on public.memberships (organization_id);
