-- ledger_entries: double-entry, append-only accounting of what the (mock,
-- for now) custodian holds. Guardanza is a ledger, not a bank — this table
-- is the book of record, never the money itself. A mistake is corrected
-- with a counter-entry, never edited or deleted.

create type public.ledger_entry_type as enum (
  'garantia_recibida',
  'garantia_liquidada',
  'garantia_devuelta',
  'ajuste'
);

create type public.ledger_direction as enum ('debe', 'haber');

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  guarantee_id uuid not null references public.guarantees (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency_code not null,
  direction public.ledger_direction not null,
  related_dispute_id uuid references public.disputes (id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index ledger_entries_guarantee_id_idx on public.ledger_entries (guarantee_id);
create index ledger_entries_related_dispute_id_idx on public.ledger_entries (related_dispute_id);

-- No UPDATE/DELETE ever, from any client role. INSERT is also revoked from
-- client roles: writes only happen through SECURITY DEFINER functions
-- (pay_guarantee, accept_proposal — see later migrations) so every entry is
-- guaranteed to carry its matching audit_log row in the same transaction.
revoke insert, update, delete on public.ledger_entries from authenticated, anon;
grant select on public.ledger_entries to authenticated;
