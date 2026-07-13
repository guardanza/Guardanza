-- sign_contract: the only way a contract moves to 'activo' with a signature
-- on record. Writing signed_at here is what triggers
-- contracts_freeze_uf_on_sign (previous migration) to freeze
-- uf_rate_at_signing atomically in the same UPDATE. Fase A uses a mock
-- signature provider — records a signature_envelopes row so the shape of
-- "evidence of signature" already exists for when a real e-signature
-- provider replaces the mock.

create or replace function public.sign_contract(p_contract_id uuid, p_actor_user_id uuid)
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
    raise exception 'user % is not authorized to sign contract %', p_actor_user_id, p_contract_id;
  end if;

  if v_contract.status not in ('borrador', 'pendiente_firma') then
    raise exception 'contract % cannot be signed from status %', p_contract_id, v_contract.status;
  end if;

  if v_contract.signed_at is not null then
    raise exception 'contract % is already signed', p_contract_id;
  end if;

  update public.contracts
    set status = 'activo', signed_at = now()
    where id = p_contract_id
    returning * into v_contract;

  insert into public.signature_envelopes (contract_id, status, provider, evidence)
    values (
      p_contract_id, 'completado', 'mock',
      jsonb_build_object('signed_by', p_actor_user_id, 'signed_at', v_contract.signed_at)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'contract.signed', 'contract', p_contract_id,
      jsonb_build_object('uf_rate_at_signing', v_contract.uf_rate_at_signing)
    );

  return v_contract;
end;
$$;

grant execute on function public.sign_contract(uuid, uuid) to authenticated;
