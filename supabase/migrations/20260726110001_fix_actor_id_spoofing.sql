-- Security fix: several SECURITY DEFINER functions took a client-supplied
-- `p_actor_user_id uuid` and used IT (not auth.uid()) as the identity for
-- their internal authorization check. Since SECURITY DEFINER functions run
-- with the function owner's privileges, they bypass RLS on every table they
-- touch entirely — RLS is not a backstop here, the function body's own check
-- is the ONLY gate. And since these are called via supabase-js `.rpc()`,
-- nothing stops a crafted request from passing a *different* user's uuid as
-- p_actor_user_id than the caller's own (the app's server actions always
-- pass the session's real auth.getUser().id today, but PostgREST has no way
-- to enforce that a client calls it that way — the JWT proves who auth.uid()
-- is, not what value ends up in an arbitrary function argument).
--
-- Concretely, before this migration:
--   - accept_proposal: a user could accept their own proposal on someone
--     else's behalf by passing the other contract party's uuid, defeating
--     both the "cannot accept your own proposal" check AND the
--     has_contract_access check, forcing a guarantee liquidation without
--     the other party's actual consent.
--   - resolve_dispute_admin / update_system_config / set_kyc_status: any
--     authenticated user who knows (or has ever seen, e.g. via an
--     audit_log row visible to them) a real platform admin's uuid could
--     pass it as p_actor_user_id and exercise full platform-admin authority
--     — resolving disputes in their own favor, rewriting commission/interest
--     rates, or forging their own KYC verification.
--   - create_contract / create_organization: is_org_admin()/no check at all
--     was evaluated against the client-supplied id, so an unrelated user
--     could create contracts against a property they don't administer, or
--     forge organization/membership rows attributing creation to another
--     user entirely.
--   - pay_guarantee / sign_contract_landlord / sign_contract_tenant /
--     cancel_contract / reject_proposal: same has_contract_access(...,
--     p_actor_user_id, ...) pattern — any authenticated user who knows a
--     contract party's uuid could sign, pay, cancel, or reject on that
--     party's behalf.
--
-- update_repair_price (20260721140001) already did this correctly — it
-- checks is_platform_admin(auth.uid()) directly. Every function below is
-- brought in line with that pattern: p_actor_user_id is dropped from the
-- signature entirely (an unused-but-still-accepted parameter would just
-- invite the same mistake again), and auth.uid() is used both for the
-- authorization check AND for whatever "who did this" data value the
-- function used to take on faith from the client (audit_log.actor_user_id,
-- contract_parties.user_id, memberships.user_id, signature evidence) — that
-- value needs the same trust boundary as the authorization check itself, or
-- the audit trail becomes exactly as forgeable as the access control was.
--
-- Note on update_system_config's original comment ("RLS above already
-- restricts the raw UPDATE path... so this isn't a privilege boundary"):
-- that reasoning doesn't hold. SECURITY DEFINER functions don't go through
-- RLS at all, regardless of what RLS would have allowed for a bare client
-- UPDATE — the function's own `is_platform_admin(p_actor_user_id)` check
-- was the entire privilege boundary, and it was checking the wrong identity.
--
-- Dropping the parameter (rather than just ignoring it) changes each
-- function's signature, so this migration also updates every call site in
-- src/lib/actions/ and both pgTAP suites.

-- ---------------------------------------------------------------------
-- create_contract
-- ---------------------------------------------------------------------
drop function if exists public.create_contract(
  uuid, date, date, numeric, public.currency_code, public.currency_code, numeric, uuid
);

create function public.create_contract(
  p_property_id uuid,
  p_start_date date,
  p_end_date date,
  p_rent_amount numeric,
  p_rent_currency public.currency_code,
  p_guarantee_currency public.currency_code,
  p_guarantee_amount numeric
)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  if not exists (
    select 1 from public.properties p
    where p.id = p_property_id and public.is_org_admin(p.organization_id, auth.uid())
  ) then
    raise exception 'user % is not authorized to create a contract for property %', auth.uid(), p_property_id;
  end if;

  insert into public.contracts (
    property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
  )
  values (p_property_id, p_start_date, p_end_date, p_rent_amount, p_rent_currency, p_guarantee_currency, p_guarantee_amount)
  returning * into v_contract;

  insert into public.contract_parties (contract_id, user_id, role)
    values (v_contract.id, auth.uid(), 'arrendador');

  -- Snapshot today's broker-org staff as the contract's corredor(es), same
  -- as the Fase 0 version this replaces (20260726100001).
  insert into public.contract_parties (contract_id, user_id, role)
    select v_contract.id, m.user_id, 'corredor'
    from public.properties p
    join public.memberships m on m.organization_id = p.broker_organization_id
    where p.id = p_property_id and p.broker_organization_id is not null
    on conflict (contract_id, user_id) do nothing;

  return v_contract;
end;
$$;

grant execute on function public.create_contract(
  uuid, date, date, numeric, public.currency_code, public.currency_code, numeric
) to authenticated;

-- ---------------------------------------------------------------------
-- create_organization
-- ---------------------------------------------------------------------
drop function if exists public.create_organization(public.org_type, text, uuid);

create function public.create_organization(p_type public.org_type, p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if not public.is_platform_admin(auth.uid()) and not exists (
    select 1 from public.memberships m where m.user_id = auth.uid()
  ) then
    raise exception 'Debes solicitar un cambio de rol antes de crear tu primer participante.';
  end if;

  insert into public.organizations (type, name, created_by)
    values (p_type, p_name, auth.uid())
    returning * into v_org;

  insert into public.memberships (user_id, organization_id, role)
    values (auth.uid(), v_org.id, 'admin');

  return v_org;
end;
$$;

grant execute on function public.create_organization(public.org_type, text) to authenticated;

-- ---------------------------------------------------------------------
-- pay_guarantee
-- ---------------------------------------------------------------------
drop function if exists public.pay_guarantee(uuid, uuid);

create function public.pay_guarantee(p_guarantee_id uuid)
returns public.guarantees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guarantee public.guarantees;
  v_contract public.contracts;
  v_has_broker boolean;
  v_config public.system_config;
  v_comision_guardanza numeric;
  v_comision_corredor numeric;
  v_ledger_id uuid;
  v_tx_id text;
begin
  select g.* into v_guarantee from public.guarantees g where g.id = p_guarantee_id for update;
  if not found then
    raise exception 'guarantee % not found', p_guarantee_id;
  end if;

  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  if not public.has_contract_access(v_contract.id, auth.uid(), array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to pay guarantee %', auth.uid(), p_guarantee_id;
  end if;

  if v_contract.status <> 'pendiente_deposito' then
    raise exception 'contract % is not pendiente_deposito (status=%)', v_contract.id, v_contract.status;
  end if;

  if v_guarantee.status <> 'pendiente' then
    raise exception 'guarantee % is not pendiente (status=%)', p_guarantee_id, v_guarantee.status;
  end if;

  select * into v_config from public.system_config where id = true;
  select p.broker_organization_id is not null into v_has_broker
    from public.properties p where p.id = v_contract.property_id;

  v_comision_guardanza := round(v_guarantee.amount * v_config.comision_guardanza_pct, 2);
  v_comision_corredor := case when v_has_broker then round(v_guarantee.amount * v_config.comision_corredor_pct, 2) else 0 end;

  v_tx_id := 'SIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  update public.guarantees set status = 'en_custodia' where id = p_guarantee_id returning * into v_guarantee;

  update public.contracts
    set status = 'activo',
        deposit_confirmed_at = now(),
        deposit_bank_tx_id = v_tx_id,
        comision_guardanza_monto = v_comision_guardanza,
        comision_corredor_monto = v_comision_corredor
    where id = v_contract.id;

  insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, metadata)
    values (
      p_guarantee_id, 'garantia_recibida', v_guarantee.amount, v_guarantee.currency, 'debe',
      jsonb_build_object(
        'funding_mode', v_guarantee.funding_mode,
        'deposit_bank_tx_id', v_tx_id,
        'comision_guardanza_monto', v_comision_guardanza,
        'comision_corredor_monto', v_comision_corredor
      )
    )
    returning id into v_ledger_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'guarantee.paid', 'guarantee', p_guarantee_id,
      jsonb_build_object('ledger_entry_id', v_ledger_id, 'contract_id', v_contract.id, 'deposit_bank_tx_id', v_tx_id)
    );

  return v_guarantee;
end;
$$;

grant execute on function public.pay_guarantee(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- accept_proposal
-- ---------------------------------------------------------------------
drop function if exists public.accept_proposal(uuid, uuid);

create function public.accept_proposal(p_proposal_id uuid)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals;
  v_dispute public.disputes;
  v_guarantee public.guarantees;
  v_contract public.contracts;
  v_guarantee_amount_clp numeric;
  v_remainder_clp numeric;
  v_liquidacion_amount numeric;
  v_devolucion_amount numeric;
  v_ledger_liquidacion_id uuid;
  v_ledger_devolucion_id uuid;
begin
  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal % not found', p_proposal_id;
  end if;

  if v_proposal.status <> 'pendiente' then
    raise exception 'proposal % is not pendiente (status=%)', p_proposal_id, v_proposal.status;
  end if;

  if v_proposal.created_by = auth.uid() then
    raise exception 'user % cannot accept their own proposal', auth.uid();
  end if;

  select * into v_dispute from public.disputes where id = v_proposal.dispute_id for update;
  select * into v_guarantee from public.guarantees where id = v_dispute.guarantee_id for update;
  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  if not public.has_contract_access(
    v_contract.id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to accept proposal %', auth.uid(), p_proposal_id;
  end if;

  v_guarantee_amount_clp := case
    when v_guarantee.currency = 'UF' then v_guarantee.amount * v_contract.uf_rate_at_signing
    else v_guarantee.amount
  end;

  if v_proposal.total_amount > v_guarantee_amount_clp then
    raise exception 'proposal total_amount (% CLP) exceeds guarantee amount (% CLP)',
      v_proposal.total_amount, v_guarantee_amount_clp;
  end if;

  v_remainder_clp := v_guarantee_amount_clp - v_proposal.total_amount;

  if v_guarantee.currency = 'UF' then
    v_liquidacion_amount := round(v_proposal.total_amount / v_contract.uf_rate_at_signing, 4);
    v_devolucion_amount := round(v_remainder_clp / v_contract.uf_rate_at_signing, 4);
  else
    v_liquidacion_amount := v_proposal.total_amount;
    v_devolucion_amount := v_remainder_clp;
  end if;

  update public.proposals set status = 'aceptada' where id = p_proposal_id;

  update public.disputes
    set status = 'liquidada', closed_at = now()
    where id = v_dispute.id
    returning * into v_dispute;

  update public.guarantees set status = 'liquidada' where id = v_guarantee.id;

  update public.contracts set status = 'finalizado' where id = v_contract.id;

  if v_liquidacion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_liquidada', v_liquidacion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_liquidacion_id;
  end if;

  if v_devolucion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_devuelta', v_devolucion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_devolucion_id;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'proposal.accepted', 'proposal', p_proposal_id,
      jsonb_build_object(
        'dispute_id', v_dispute.id,
        'contract_id', v_contract.id,
        'ledger_liquidacion_id', v_ledger_liquidacion_id,
        'ledger_devolucion_id', v_ledger_devolucion_id,
        'total_amount_clp', v_proposal.total_amount,
        'remainder_clp', v_remainder_clp
      )
    );

  return v_dispute;
end;
$$;

grant execute on function public.accept_proposal(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- sign_contract_landlord
-- ---------------------------------------------------------------------
drop function if exists public.sign_contract_landlord(uuid, uuid);

create function public.sign_contract_landlord(p_contract_id uuid)
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

  if not public.has_contract_access(p_contract_id, auth.uid(), array['arrendador']::public.contract_role[]) then
    raise exception 'user % is not authorized to sign contract % as arrendador', auth.uid(), p_contract_id;
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
      jsonb_build_object('role', 'arrendador', 'signed_by', auth.uid(), 'signed_at', v_contract.signed_at_landlord)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.signed_landlord', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.sign_contract_landlord(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- sign_contract_tenant
-- ---------------------------------------------------------------------
drop function if exists public.sign_contract_tenant(uuid, uuid);

create function public.sign_contract_tenant(p_contract_id uuid)
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

  if not public.has_contract_access(p_contract_id, auth.uid(), array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to sign contract % as arrendatario', auth.uid(), p_contract_id;
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
      jsonb_build_object('role', 'arrendatario', 'signed_by', auth.uid(), 'signed_at', v_contract.signed_at_tenant)
    );

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.signed_tenant', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.sign_contract_tenant(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- cancel_contract
-- ---------------------------------------------------------------------
drop function if exists public.cancel_contract(uuid, uuid);

create function public.cancel_contract(p_contract_id uuid)
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
    p_contract_id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to cancel contract %', auth.uid(), p_contract_id;
  end if;

  if v_contract.status not in ('pendiente_firma_arrendador', 'pendiente_firma_arrendatario', 'pendiente_deposito') then
    raise exception 'contract % cannot be cancelled from status %', p_contract_id, v_contract.status;
  end if;

  update public.contracts set status = 'cancelado' where id = p_contract_id returning * into v_contract;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.cancelled', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

grant execute on function public.cancel_contract(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reject_proposal
-- ---------------------------------------------------------------------
drop function if exists public.reject_proposal(uuid, uuid, text);

create function public.reject_proposal(p_proposal_id uuid, p_motivo_rechazo text)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals;
  v_dispute public.disputes;
  v_contract_id uuid;
begin
  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal % not found', p_proposal_id;
  end if;

  if v_proposal.status <> 'pendiente' then
    raise exception 'proposal % is not pendiente (status=%)', p_proposal_id, v_proposal.status;
  end if;

  if v_proposal.created_by = auth.uid() then
    raise exception 'user % cannot reject their own proposal', auth.uid();
  end if;

  if length(trim(coalesce(p_motivo_rechazo, ''))) < 50 then
    raise exception 'motivo_rechazo must be at least 50 characters';
  end if;

  select * into v_dispute from public.disputes where id = v_proposal.dispute_id for update;
  select g.contract_id into v_contract_id from public.guarantees g where g.id = v_dispute.guarantee_id;

  if not public.has_contract_access(
    v_contract_id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to reject proposal %', auth.uid(), p_proposal_id;
  end if;

  update public.proposals set status = 'rechazada' where id = p_proposal_id;

  update public.disputes
    set status = 'escalada', motivo_rechazo = p_motivo_rechazo
    where id = v_dispute.id
    returning * into v_dispute;

  update public.contracts set status = 'en_disputa' where id = v_contract_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'proposal.rejected', 'proposal', p_proposal_id,
      jsonb_build_object('dispute_id', v_dispute.id, 'contract_id', v_contract_id)
    );

  return v_dispute;
end;
$$;

grant execute on function public.reject_proposal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- set_kyc_status
-- ---------------------------------------------------------------------
drop function if exists public.set_kyc_status(uuid, text, uuid);

create function public.set_kyc_status(p_user_id uuid, p_kyc_estado text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to set kyc status', auth.uid();
  end if;

  if p_kyc_estado not in ('pendiente', 'verificado', 'rechazado') then
    raise exception 'invalid kyc_estado %', p_kyc_estado;
  end if;

  update public.profiles
    set kyc_estado = p_kyc_estado, verificado = (p_kyc_estado = 'verificado')
    where id = p_user_id
    returning * into v_profile;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'profile.kyc_updated', 'profile', p_user_id, jsonb_build_object('kyc_estado', p_kyc_estado));

  return v_profile;
end;
$$;

grant execute on function public.set_kyc_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- update_system_config
-- ---------------------------------------------------------------------
drop function if exists public.update_system_config(numeric, numeric, numeric, uuid);

create function public.update_system_config(
  p_comision_guardanza_pct numeric,
  p_comision_corredor_pct numeric,
  p_tasa_interes_anual numeric
)
returns public.system_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.system_config;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to update system_config', auth.uid();
  end if;

  update public.system_config
    set comision_guardanza_pct = p_comision_guardanza_pct,
        comision_corredor_pct = p_comision_corredor_pct,
        tasa_interes_anual = p_tasa_interes_anual,
        updated_by = auth.uid()
    where id = true
    returning * into v_config;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'system_config.updated', 'system_config', '00000000-0000-0000-0000-000000000000',
      jsonb_build_object(
        'comision_guardanza_pct', p_comision_guardanza_pct,
        'comision_corredor_pct', p_comision_corredor_pct,
        'tasa_interes_anual', p_tasa_interes_anual
      )
    );

  return v_config;
end;
$$;

grant execute on function public.update_system_config(numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- resolve_dispute_admin
-- ---------------------------------------------------------------------
drop function if exists public.resolve_dispute_admin(uuid, uuid, numeric, text);

create function public.resolve_dispute_admin(
  p_dispute_id uuid,
  p_monto_retenido numeric,
  p_notas text default null
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.disputes;
  v_guarantee public.guarantees;
  v_contract public.contracts;
  v_guarantee_amount_clp numeric;
  v_remainder_clp numeric;
  v_liquidacion_amount numeric;
  v_devolucion_amount numeric;
  v_ledger_liquidacion_id uuid;
  v_ledger_devolucion_id uuid;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to resolve disputes', auth.uid();
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'dispute % not found', p_dispute_id;
  end if;

  if v_dispute.status <> 'escalada' then
    raise exception 'dispute % is not escalada (status=%)', p_dispute_id, v_dispute.status;
  end if;

  select * into v_guarantee from public.guarantees where id = v_dispute.guarantee_id for update;
  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  v_guarantee_amount_clp := case
    when v_guarantee.currency = 'UF' then v_guarantee.amount * v_contract.uf_rate_at_signing
    else v_guarantee.amount
  end;

  if p_monto_retenido < 0 or p_monto_retenido > v_guarantee_amount_clp then
    raise exception 'monto_retenido (% CLP) must be between 0 and the guarantee amount (% CLP)',
      p_monto_retenido, v_guarantee_amount_clp;
  end if;

  v_remainder_clp := v_guarantee_amount_clp - p_monto_retenido;

  if v_guarantee.currency = 'UF' then
    v_liquidacion_amount := round(p_monto_retenido / v_contract.uf_rate_at_signing, 4);
    v_devolucion_amount := round(v_remainder_clp / v_contract.uf_rate_at_signing, 4);
  else
    v_liquidacion_amount := p_monto_retenido;
    v_devolucion_amount := v_remainder_clp;
  end if;

  update public.disputes set status = 'liquidada', closed_at = now() where id = p_dispute_id returning * into v_dispute;
  update public.guarantees set status = 'liquidada' where id = v_guarantee.id;
  update public.contracts set status = 'finalizado' where id = v_contract.id;

  if v_liquidacion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_liquidada', v_liquidacion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_liquidacion_id;
  end if;

  if v_devolucion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_devuelta', v_devolucion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_devolucion_id;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'dispute.resolved_by_admin', 'dispute', p_dispute_id,
      jsonb_build_object(
        'contract_id', v_contract.id,
        'monto_retenido_clp', p_monto_retenido,
        'remainder_clp', v_remainder_clp,
        'ledger_liquidacion_id', v_ledger_liquidacion_id,
        'ledger_devolucion_id', v_ledger_devolucion_id,
        'notas', p_notas
      )
    );

  return v_dispute;
end;
$$;

grant execute on function public.resolve_dispute_admin(uuid, numeric, text) to authenticated;
