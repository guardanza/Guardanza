-- proposals: immutable. A counter-proposal is a new row referencing the one
-- it supersedes. The only mutation any row ever undergoes is a status
-- transition (pendiente -> aceptada/rechazada/superada), and that only
-- happens through accept_proposal() (SECURITY DEFINER, later migration) —
-- never a direct client UPDATE.

create type public.proposal_status as enum ('pendiente', 'aceptada', 'rechazada', 'superada');

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status public.proposal_status not null default 'pendiente',
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  supersedes_proposal_id uuid references public.proposals (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index proposals_dispute_id_idx on public.proposals (dispute_id);
create index proposals_supersedes_idx on public.proposals (supersedes_proposal_id);

-- Client roles may only INSERT. Every status transition goes through a
-- SECURITY DEFINER function so it always carries its ledger_entry/audit_log
-- side effects atomically.
revoke update, delete on public.proposals from authenticated, anon;
