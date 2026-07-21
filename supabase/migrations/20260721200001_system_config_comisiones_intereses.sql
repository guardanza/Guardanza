-- Bloque B: simulated financial parameters (comisiones, intereses, KYC
-- flag) per the "Seguranza — Arquitectura UI/UX Completa" spec. Nothing
-- here moves real money — comisión/interés are numbers computed against a
-- platform-admin-editable rate table, same "libro mayor, no banco"
-- boundary as the rest of Fase A.

-- system_config: singleton row (id is always `true`) of platform-wide
-- rates. Only a platform admin can change it; every authenticated user can
-- read it since comisión/interés are shown to contract parties too.
create table public.system_config (
  id boolean primary key default true,
  comision_guardanza_pct numeric(5, 4) not null default 0.05 check (comision_guardanza_pct >= 0 and comision_guardanza_pct < 1),
  comision_corredor_pct numeric(5, 4) not null default 0.03 check (comision_corredor_pct >= 0 and comision_corredor_pct < 1),
  tasa_interes_anual numeric(5, 4) not null default 0.02 check (tasa_interes_anual >= 0 and tasa_interes_anual < 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  check (id)
);

insert into public.system_config (id) values (true);

create trigger set_updated_at
  before update on public.system_config
  for each row execute function public.set_updated_at();

alter table public.system_config enable row level security;
grant select, update on public.system_config to authenticated;

create policy system_config_select_all on public.system_config
  for select to authenticated using (true);

create policy system_config_update_platform_admin on public.system_config
  for update to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- update_system_config: goes through a function (not a raw client UPDATE)
-- purely to stamp updated_by/audit_log atomically — RLS above already
-- restricts the raw UPDATE path to platform admins too, so this isn't a
-- privilege boundary, just consistent bookkeeping with every other mutation
-- in this system.
create or replace function public.update_system_config(
  p_comision_guardanza_pct numeric,
  p_comision_corredor_pct numeric,
  p_tasa_interes_anual numeric,
  p_actor_user_id uuid
)
returns public.system_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.system_config;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'user % is not authorized to update system_config', p_actor_user_id;
  end if;

  update public.system_config
    set comision_guardanza_pct = p_comision_guardanza_pct,
        comision_corredor_pct = p_comision_corredor_pct,
        tasa_interes_anual = p_tasa_interes_anual,
        updated_by = p_actor_user_id
    where id = true
    returning * into v_config;

  -- audit_log.entity_id is not-null; system_config is a singleton with no
  -- natural uuid, so the nil uuid stands in for "the one row".
  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'system_config.updated', 'system_config', '00000000-0000-0000-0000-000000000000',
      jsonb_build_object(
        'comision_guardanza_pct', p_comision_guardanza_pct,
        'comision_corredor_pct', p_comision_corredor_pct,
        'tasa_interes_anual', p_tasa_interes_anual
      )
    );

  return v_config;
end;
$$;

grant execute on function public.update_system_config(numeric, numeric, numeric, uuid) to authenticated;

-- Comisiones are frozen at deposit time, same rationale as
-- uf_rate_at_signing: whatever the rate was when the money actually
-- entered custody is what applies for the life of this contract, even if
-- system_config changes later.
alter table public.contracts
  add column comision_guardanza_monto numeric(14, 2),
  add column comision_corredor_monto numeric(14, 2);

create or replace function public.pay_guarantee(p_guarantee_id uuid, p_actor_user_id uuid)
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

  if not public.has_contract_access(v_contract.id, p_actor_user_id, array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to pay guarantee %', p_actor_user_id, p_guarantee_id;
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
      p_actor_user_id, 'guarantee.paid', 'guarantee', p_guarantee_id,
      jsonb_build_object('ledger_entry_id', v_ledger_id, 'contract_id', v_contract.id, 'deposit_bank_tx_id', v_tx_id)
    );

  return v_guarantee;
end;
$$;

grant execute on function public.pay_guarantee(uuid, uuid) to authenticated;

-- contract_interest_accrued: simulated, dynamic — "how much interest would
-- this custodied guarantee have earned as of right now", computed live
-- from system_config's current annual rate. Never written to the ledger in
-- Fase A; purely informational until settlement logic (Bloque C) decides
-- how it factors into a payout.
create or replace function public.contract_interest_accrued(p_contract_id uuid)
returns numeric
language sql
stable
as $$
  select case
    when c.deposit_confirmed_at is null then 0::numeric
    else round(
      c.guarantee_amount * (cfg.tasa_interes_anual / 365.0)
      * greatest(extract(epoch from (now() - c.deposit_confirmed_at)) / 86400.0, 0),
      2
    )
  end
  from public.contracts c cross join public.system_config cfg
  where c.id = p_contract_id;
$$;

grant execute on function public.contract_interest_accrued(uuid) to authenticated;

-- kyc_estado/verificado: schema only for now — the doc marks real KYC
-- analysis as Fase 2 ("futuro"). Foundation for later, no admin UI yet.
alter table public.profiles
  add column kyc_estado text not null default 'pendiente' check (kyc_estado in ('pendiente', 'verificado', 'rechazado')),
  add column verificado boolean not null default false;

create or replace function public.set_kyc_status(p_user_id uuid, p_kyc_estado text, p_actor_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'user % is not authorized to set kyc status', p_actor_user_id;
  end if;

  if p_kyc_estado not in ('pendiente', 'verificado', 'rechazado') then
    raise exception 'invalid kyc_estado %', p_kyc_estado;
  end if;

  update public.profiles
    set kyc_estado = p_kyc_estado, verificado = (p_kyc_estado = 'verificado')
    where id = p_user_id
    returning * into v_profile;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (p_actor_user_id, 'profile.kyc_updated', 'profile', p_user_id, jsonb_build_object('kyc_estado', p_kyc_estado));

  return v_profile;
end;
$$;

grant execute on function public.set_kyc_status(uuid, text, uuid) to authenticated;
