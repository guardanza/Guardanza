-- create_organization: creating the org row and bootstrapping the founder's
-- admin membership must happen atomically. Two separate client-side INSERTs
-- (org, then membership) don't work anyway: organizations_select_member
-- requires membership to see a row via RETURNING, so a plain client INSERT
-- ... RETURNING on organizations fails RLS before the membership even
-- exists — classic chicken-and-egg. SECURITY DEFINER sidesteps it the same
-- way the other multi-step business functions do.

create or replace function public.create_organization(p_type public.org_type, p_name text, p_actor_user_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  insert into public.organizations (type, name, created_by)
    values (p_type, p_name, p_actor_user_id)
    returning * into v_org;

  insert into public.memberships (user_id, organization_id, role)
    values (p_actor_user_id, v_org.id, 'admin');

  return v_org;
end;
$$;

grant execute on function public.create_organization(public.org_type, text, uuid) to authenticated;

-- Direct client INSERT is no longer needed now that create_organization()
-- is the only path — but keep organizations_insert_self dropped rather than
-- revoking table-level INSERT, since nothing else needs it and revoking
-- would be redundant with removing the policy (deny-by-default already
-- blocks it with RLS enabled and no matching policy).
drop policy if exists organizations_insert_self on public.organizations;

-- A creator can see their own org even before any membership exists
-- (covers the brief window inside create_organization's transaction, and
-- is harmless afterwards since they're also a member by then).
create policy organizations_select_creator on public.organizations
  for select to authenticated
  using (created_by = auth.uid());
