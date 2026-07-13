-- properties: belongs to an owning organization (landlord), optionally
-- delegated to a broker organization.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  broker_organization_id uuid references public.organizations (id) on delete set null,
  address text not null,
  comuna text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (broker_organization_id is null or broker_organization_id <> organization_id)
);

create index properties_organization_id_idx on public.properties (organization_id);
create index properties_broker_organization_id_idx on public.properties (broker_organization_id);

create trigger set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();
