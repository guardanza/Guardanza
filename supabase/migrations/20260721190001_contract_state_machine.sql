-- Contract state machine v2: replaces the single-signature 5-state model
-- with sequential landlord-then-tenant signing and an explicit deposit gate,
-- per the "Seguranza — Arquitectura UI/UX Completa" spec:
--   pendiente_firma_arrendador -> pendiente_firma_arrendatario
--     -> pendiente_deposito -> activo -> en_disputa -> finalizado
--   (cancelado reachable from any of the three pre-activo states)
--
-- 'borrador' and 'pendiente_firma' collapse into 'pendiente_firma_arrendador':
-- the app never actually had a distinct editable-draft screen, so a contract
-- was effectively "sent" the moment it was created. This migration is a hard
-- cutover (data included), not an additive change — Fase A has no real
-- money at stake yet, so there's no reason to keep the old labels around.

alter table public.contracts
  add column signed_at_landlord timestamptz,
  add column signed_at_tenant timestamptz,
  add column deposit_confirmed_at timestamptz,
  add column deposit_bank_tx_id text;

-- Old model didn't distinguish who signed first — both parties are treated
-- as having signed at the same historical instant for rows that already
-- reached 'activo'/'en_disputa'/'finalizado' under the old status.
update public.contracts
  set signed_at_landlord = signed_at, signed_at_tenant = signed_at
  where signed_at is not null;

create type public.contract_status_v2 as enum (
  'pendiente_firma_arrendador',
  'pendiente_firma_arrendatario',
  'pendiente_deposito',
  'activo',
  'en_disputa',
  'finalizado',
  'cancelado'
);

-- ALTER COLUMN ... TYPE ... USING can't contain a subquery, so the mapping
-- (which needs to check guarantees for the 'activo' case) is computed into a
-- plain text column first via a normal UPDATE, then swapped in with a
-- subquery-free USING cast.
alter table public.contracts add column status_v2 text;

update public.contracts c set status_v2 = (
  case c.status::text
    when 'borrador' then 'pendiente_firma_arrendador'
    when 'pendiente_firma' then 'pendiente_firma_arrendador'
    when 'en_disputa' then 'en_disputa'
    when 'finalizado' then 'finalizado'
    when 'activo' then (
      case
        when exists (
          select 1 from public.guarantees g
          where g.contract_id = c.id and g.status in ('pagada', 'en_custodia', 'en_liquidacion', 'liquidada')
        )
        then 'activo'
        else 'pendiente_deposito'
      end
    )
    else 'pendiente_firma_arrendador'
  end
);

-- Dropped here (not just later, where they're re-stated for documentation
-- purposes) because the type change below can't run while any policy —
-- even one on a different table, like contract_parties' — still references
-- the column.
drop policy if exists contracts_update_draft_landlord on public.contracts;
drop policy if exists contract_parties_insert_draft_landlord on public.contract_parties;

alter table public.contracts alter column status drop default;
alter table public.contracts alter column status type public.contract_status_v2 using status_v2::public.contract_status_v2;
alter table public.contracts drop column status_v2;
alter table public.contracts alter column status set default 'pendiente_firma_arrendador';

drop type public.contract_status;
alter type public.contract_status_v2 rename to contract_status;

-- Deposit confirmation for rows already carrying custody, best-effort backfill.
update public.contracts c
  set deposit_confirmed_at = g.updated_at
  from public.guarantees g
  where g.contract_id = c.id and c.status = 'activo' and c.deposit_confirmed_at is null;

alter table public.contracts drop constraint contracts_check1;
alter table public.contracts add constraint contracts_signed_at_landlord_check
  check (signed_at_landlord is null or uf_rate_at_signing is not null);
alter table public.contracts drop column signed_at;

-- UF now freezes at the FIRST signature (landlord), not at whichever single
-- signature used to exist — earliest point the deal is genuinely locked.
create or replace function public.contracts_freeze_uf_on_sign()
returns trigger
language plpgsql
as $$
begin
  if new.signed_at_landlord is not null and old.signed_at_landlord is null and new.uf_rate_at_signing is null then
    new.uf_rate_at_signing := public.get_uf_rate(new.signed_at_landlord::date);
  end if;
  return new;
end;
$$;

-- No more client-editable draft window — every transition, including the
-- very first one, now goes through a SECURITY DEFINER function, consistent
-- with how every other status change in this system already works.
drop policy if exists contracts_update_draft_landlord on public.contracts;

drop policy if exists contract_parties_insert_draft_landlord on public.contract_parties;
create policy contract_parties_insert_pending_landlord on public.contract_parties
  for insert to authenticated
  with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.status = 'pendiente_firma_arrendador')
    and public.has_contract_access(contract_id, auth.uid(), array['arrendador']::public.contract_role[])
  );

-- sign_contract replaced by sign_contract_landlord / sign_contract_tenant below.
drop function if exists public.sign_contract(uuid, uuid);

create or replace function public.sign_contract_landlord(p_contract_id uuid, p_actor_user_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  if not public.has_contract_access(p_contract_id, p_actor_user_id, array['arrendador']::public.contract_role[]) then
    raise exception 'user % is not authorized to sign contract % as arrendador', p_actor_user_id, p_contract_id;
  end if;

  if v_contract.status <> 'pendiente_firma_arrendador' then
    raise exception 'contract % cannot be signed by arrendador from status %', p_contract_id, v_contract.status;
  end if;

  update public.contracts
    set status = 'pendiente_firma_arrendatario', signed_at_landlord = now()
    where id = p_contract_id
    returning * into v_contract;

  insert into public.signature_envelopes (contract_id, status, provider, evidence)
    values (
      p_contract_id, 'completado', 'mock',
      jsonb_build_object('role', 'arrendador', 'signed_by', p_actor_user_id, 'signed_at', v_contract.signed_at_landlord)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (p_actor_user_id, 'contract.signed_landlord', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.sign_contract_landlord(uuid, uuid) to authenticated;

create or replace function public.sign_contract_tenant(p_contract_id uuid, p_actor_user_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  if not public.has_contract_access(p_contract_id, p_actor_user_id, array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to sign contract % as arrendatario', p_actor_user_id, p_contract_id;
  end if;

  if v_contract.status <> 'pendiente_firma_arrendatario' then
    raise exception 'contract % cannot be signed by arrendatario from status %', p_contract_id, v_contract.status;
  end if;

  update public.contracts
    set status = 'pendiente_deposito', signed_at_tenant = now()
    where id = p_contract_id
    returning * into v_contract;

  insert into public.signature_envelopes (contract_id, status, provider, evidence)
    values (
      p_contract_id, 'completado', 'mock',
      jsonb_build_object('role', 'arrendatario', 'signed_by', p_actor_user_id, 'signed_at', v_contract.signed_at_tenant)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (p_actor_user_id, 'contract.signed_tenant', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.sign_contract_tenant(uuid, uuid) to authenticated;

-- cancel_contract: only reachable before the deposit is confirmed — once
-- money is (simulated as) in custody, ending a tenancy goes through the
-- proposal/dispute flow instead, never a plain cancel.
create or replace function public.cancel_contract(p_contract_id uuid, p_actor_user_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  if not public.has_contract_access(
    p_contract_id, p_actor_user_id, array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to cancel contract %', p_actor_user_id, p_contract_id;
  end if;

  if v_contract.status not in ('pendiente_firma_arrendador', 'pendiente_firma_arrendatario', 'pendiente_deposito') then
    raise exception 'contract % cannot be cancelled from status %', p_contract_id, v_contract.status;
  end if;

  update public.contracts set status = 'cancelado' where id = p_contract_id returning * into v_contract;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (p_actor_user_id, 'contract.cancelled', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.cancel_contract(uuid, uuid) to authenticated;

-- pay_guarantee now also carries the contract itself from pendiente_deposito
-- to activo — Fase A has no real custodian confirming receipt separately
-- (funding_mode is always 'simulated'), so "deposit sent" and "deposit
-- confirmed, contract active" collapse into this one step, same rationale
-- as the original pay_guarantee note.
create or replace function public.pay_guarantee(p_guarantee_id uuid, p_actor_user_id uuid)
returns public.guarantees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guarantee public.guarantees;
  v_contract public.contracts;
  v_ledger_id uuid;
  v_tx_id text;
begin
  select g.* into v_guarantee from public.guarantees g where g.id = p_guarantee_id for update;
  if not found then
    raise exception 'guarantee % not found', p_guarantee_id;
  end if;

  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  if not public.has_contract_access(v_contract.id, p_actor_user_id, array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to pay guarantee %', p_actor_user_id, p_guarantee_id;
  end if;

  if v_contract.status <> 'pendiente_deposito' then
    raise exception 'contract % is not pendiente_deposito (status=%)', v_contract.id, v_contract.status;
  end if;

  if v_guarantee.status <> 'pendiente' then
    raise exception 'guarantee % is not pendiente (status=%)', p_guarantee_id, v_guarantee.status;
  end if;

  v_tx_id := 'SIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  update public.guarantees set status = 'en_custodia' where id = p_guarantee_id returning * into v_guarantee;

  update public.contracts
    set status = 'activo', deposit_confirmed_at = now(), deposit_bank_tx_id = v_tx_id
    where id = v_contract.id;

  insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, metadata)
    values (
      p_guarantee_id, 'garantia_recibida', v_guarantee.amount, v_guarantee.currency, 'debe',
      jsonb_build_object('funding_mode', v_guarantee.funding_mode, 'deposit_bank_tx_id', v_tx_id)
    )
    returning id into v_ledger_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'guarantee.paid', 'guarantee', p_guarantee_id,
      jsonb_build_object('ledger_entry_id', v_ledger_id, 'contract_id', v_contract.id, 'deposit_bank_tx_id', v_tx_id)
    );

  return v_guarantee;
end;
$$;

grant execute on function public.pay_guarantee(uuid, uuid) to authenticated;
