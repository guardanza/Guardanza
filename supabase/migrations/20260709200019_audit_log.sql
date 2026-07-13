-- audit_log: append-only. entity_type/entity_id is a polymorphic reference
-- (no FK — it points at whichever table the event concerns) so any entity
-- in the system can be audited without this table growing a column per
-- entity type. Writes only happen from SECURITY DEFINER functions, in the
-- same transaction as the business change they describe — never a bare
-- client-side INSERT, or the log stops being trustworthy.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_user_id_idx on public.audit_log (actor_user_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

revoke insert, update, delete on public.audit_log from authenticated, anon;
grant select on public.audit_log to authenticated;
