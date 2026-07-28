-- Closes the gap flagged while documenting the firma/garantía branches
-- (20260728100001): nothing today stops two contracts on the same
-- property from both reaching "firmado-o-posterior" status. Confirmed via
-- a read-only query against production before this migration: zero
-- properties currently violate the rule, so the constraint below applies
-- cleanly with no backfill needed.
--
-- "Firmado-o-posterior" = pendiente_deposito, activo, propuesta_termino,
-- or en_disputa. Deliberately excludes:
--   - pendiente_firma_arrendador / pendiente_firma_arrendatario (still
--     signing — preparing a replacement contract before the current one
--     closes is fine, per the business rule).
--   - finalizado (closed, no longer occupying the property).
--   - cancelado (never completed).
--
-- Enforced with a partial unique index, not a manual row lock. This is
-- the race-proof choice: Postgres's own unique-index machinery already
-- serializes two concurrent transactions that would both insert/update a
-- conflicting (property_id) entry — the second one waits on the first,
-- then either succeeds (if the first rolled back) or fails with
-- unique_violation (if the first committed). Neither can silently commit
-- a duplicate; there's no SELECT-then-act window to race, because there
-- is no SELECT — the guarantee comes from the index itself, not from
-- application logic remembering to check first. That also makes it
-- structural: any future code path that ever writes a blocking status
-- is covered automatically, not just the one call site updated below.
--
-- The second business rule (a contact can't be in two firmado-o-posterior
-- contracts on the same property) is a corollary of this one, not a
-- separate mechanism — if a property can only ever have one such
-- contract, no contact can be in two of them simultaneously.
create unique index contracts_one_active_per_property
  on public.contracts (property_id)
  where status in ('pendiente_deposito', 'activo', 'propuesta_termino', 'en_disputa');

-- sign_contract_tenant is the only place a contract enters the blocking
-- set (the pendiente_firma_arrendatario -> pendiente_deposito transition).
-- Every other function that touches these statuses only moves within the
-- set or out to a terminal state, so this is the one call site that needs
-- to translate a constraint violation into a clear message instead of a
-- raw Postgres error.
create or replace function public.sign_contract_tenant(p_contract_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
  v_constraint_name text;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  if not public.has_contract_access(p_contract_id, auth.uid(), array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to sign contract % as arrendatario', auth.uid(), p_contract_id;
  end if;

  if v_contract.status <> 'pendiente_firma_arrendatario' then
    raise exception 'contract % cannot be signed by arrendatario from status %', p_contract_id, v_contract.status;
  end if;

  begin
    update public.contracts
      set status = 'pendiente_deposito', signed_at_tenant = now()
      where id = p_contract_id
      returning * into v_contract;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
      if v_constraint_name = 'contracts_one_active_per_property' then
        raise exception 'Esta propiedad ya tiene un contrato firmado vigente — no se puede firmar un segundo mientras el primero siga activo.';
      else
        raise;
      end if;
  end;

  insert into public.signature_envelopes (contract_id, status, provider, evidence)
    values (
      p_contract_id, 'completado', 'mock',
      jsonb_build_object('role', 'arrendatario', 'signed_by', auth.uid(), 'signed_at', v_contract.signed_at_tenant)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.signed_tenant', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.sign_contract_tenant(uuid) to authenticated;
