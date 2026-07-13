-- signature_envelopes: evidence of contract signature. provider = 'mock' for
-- now; the adapter that talks to a real e-signature provider is isolated in
-- the application layer (see src/lib/adapters/signature) so swapping it out
-- never touches this table's shape.

create type public.signature_status as enum ('pendiente', 'completado', 'cancelado');

create table public.signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  status public.signature_status not null default 'pendiente',
  provider text not null default 'mock',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index signature_envelopes_contract_id_idx on public.signature_envelopes (contract_id);

create trigger set_updated_at
  before update on public.signature_envelopes
  for each row execute function public.set_updated_at();
