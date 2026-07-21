-- Fase A had no platform-wide admin concept — only per-organization admin
-- (is_any_org_admin), used as a stand-in for gating the shared repair
-- catalog. That's no longer accurate: the catalog is meant to be curated
-- by one platform admin, not any landlord/broker admin.
alter table public.profiles add column is_platform_admin boolean not null default false;

create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = p_user_id), false);
$$;

drop policy repair_reference_write_admin on public.repair_reference;
create policy repair_reference_write_admin on public.repair_reference
  for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy repair_reference_versions_insert_admin on public.repair_reference_versions;
create policy repair_reference_versions_insert_admin on public.repair_reference_versions
  for insert to authenticated
  with check (public.is_platform_admin(auth.uid()));

-- update_repair_price is the only path left that can update an existing
-- version (see 20260709200029) — its own internal admin check needs the
-- same swap.
create or replace function public.update_repair_price(p_repair_reference_id uuid, p_unit_price numeric)
returns public.repair_reference_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_new public.repair_reference_versions;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to update the repair catalog', auth.uid();
  end if;

  update public.repair_reference_versions
    set valid_to = v_now
    where repair_reference_id = p_repair_reference_id and valid_to is null;

  insert into public.repair_reference_versions (repair_reference_id, unit_price, valid_from)
    values (p_repair_reference_id, p_unit_price, v_now)
    returning * into v_new;

  return v_new;
end;
$$;
