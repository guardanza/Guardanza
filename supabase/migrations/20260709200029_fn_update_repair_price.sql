-- update_repair_price: closing the current version and inserting the new
-- one must be atomic (a two-step client-side UPDATE then INSERT could leave
-- the catalog with zero open versions if the second call never happens).
-- Client-side UPDATE on repair_reference_versions is revoked — this
-- function is now the only way to change a price.

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
  if not public.is_any_org_admin(auth.uid()) then
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

grant execute on function public.update_repair_price(uuid, numeric) to authenticated;

revoke update on public.repair_reference_versions from authenticated, anon;
drop policy if exists repair_reference_versions_update_admin on public.repair_reference_versions;
