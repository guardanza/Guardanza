-- Refactor Paso 1 (of the firma/garantía branch split documented in
-- 20260728100001): a read-only view, zero ALTER TABLE, fully reversible
-- by dropping it. contracts.status keeps being the source of truth for
-- everything that isn't migrated yet — this only adds two derived
-- columns on top, computed from data that already exists (contracts'
-- own signed_at_landlord/signed_at_tenant timestamps, plus the already-
-- independent guarantees.status and disputes.status).
--
-- estado_firma: 'esperando_firmas' | 'firmado_parcialmente' |
--   'firmado_por_todos' | 'cancelado'. Derived purely from the existing
--   timestamp columns + the cancelado flag on contracts.status — doesn't
--   even need to read the rest of the enum. "Borrador" isn't produced:
--   this system has never had an editable-draft state (see
--   20260721190001_contract_state_machine.sql), contracts start at
--   'esperando_firmas'.
--
-- estado_garantia: null | 'pendiente' | 'en_custodia' | 'en_revision' |
--   'liberada'. null while the firma branch hasn't reached
--   'firmado_por_todos' (the garantía branch hasn't conceptually started
--   yet). 'en_revision' is the umbrella for "a discount proposal exists
--   and isn't resolved" — deliberately does NOT distinguish "propuesta
--   abierta" from "escalada a disputa" here; that distinction already
--   lives in disputes.status and call sites that need it should read it
--   from there live, not from a duplicated field on this view.
--
-- security_invoker so this respects the querying user's own RLS instead
-- of running as the view owner — verified guarantees_select_party and
-- disputes_select_party both gate on the exact same has_contract_access(
-- ..., ['arrendador','arrendatario','corredor']) as contracts_select_party,
-- so the join below never hides or nulls a row for anyone who could
-- already see the contract directly.
create or replace view public.contracts_branch_status
with (security_invoker = true)
as
select
  c.*,
  case
    when c.status = 'cancelado' then 'cancelado'
    when c.signed_at_tenant is not null then 'firmado_por_todos'
    when c.signed_at_landlord is not null then 'firmado_parcialmente'
    else 'esperando_firmas'
  end as estado_firma,
  case
    when c.status = 'cancelado' then null
    when c.signed_at_tenant is null then null
    when g.status = 'pendiente' then 'pendiente'
    when g.status = 'liquidada' then 'liberada'
    when g.status = 'en_custodia' and exists (
      select 1 from public.disputes d where d.guarantee_id = g.id and d.status <> 'liquidada'
    ) then 'en_revision'
    when g.status = 'en_custodia' then 'en_custodia'
    else null
  end as estado_garantia
from public.contracts c
left join public.guarantees g on g.contract_id = c.id;

grant select on public.contracts_branch_status to authenticated;
