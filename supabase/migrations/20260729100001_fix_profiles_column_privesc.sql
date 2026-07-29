-- Critical fix: profiles_update_self (20260709200028) is a row-only RLS
-- policy (using/with check both just `id = auth.uid()`), paired with a
-- blanket `grant select, update on public.profiles to authenticated`. RLS
-- controls which ROWS a client can touch, not which COLUMNS — so that
-- combination let any authenticated user flip their OWN is_platform_admin
-- to true via a direct client-side update, e.g.
-- `supabase.from('profiles').update({is_platform_admin:true})`. Verified
-- exploitable against a real local instance before writing this fix.
--
-- Every legitimate client-side write to profiles was audited (grep across
-- src/ for `.from("profiles").update(`): full_name/rut/phone
-- (src/lib/actions/profile.ts) and avatar_url (src/lib/actions/avatar.ts,
-- src/app/auth/callback/route.ts). is_platform_admin has zero legitimate
-- write call sites anywhere in the app — every one of its 8 read call
-- sites is a `.select(...)` for UI gating, never a write. So the fix is a
-- straight column-level grant: revoke the table-wide UPDATE, re-grant it
-- only for the four columns real features actually write.
revoke update on public.profiles from authenticated;
grant update (full_name, rut, phone, avatar_url) on public.profiles to authenticated;

-- Closing that hole removes the ONLY path that ever set is_platform_admin
-- in this codebase — there was no security-definer function for it either
-- (grepped supabase/migrations for any function or trigger writing that
-- column: none). Without a replacement, the platform would have no
-- controlled way to name a second admin going forward (bootstrapping the
-- very first admin stays manual SQL against the database directly, same
-- as before — that's normal and outside the app's own authz system).
--
-- Scope deliberately minimal per this being an emergency security PR: RPC
-- only, no admin-management UI (that's its own future tanda, with its own
-- protections — e.g. not letting the last admin revoke themselves).
create or replace function public.set_platform_admin(p_target_user_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous boolean;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to grant platform admin', auth.uid();
  end if;

  select is_platform_admin into v_previous from public.profiles where id = p_target_user_id;
  if not found then
    raise exception 'user % not found', p_target_user_id;
  end if;

  update public.profiles set is_platform_admin = p_value where id = p_target_user_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      case when p_value then 'platform_admin.granted' else 'platform_admin.revocado' end,
      'platform_admin',
      p_target_user_id,
      jsonb_build_object('valor_anterior', v_previous, 'valor_nuevo', p_value)
    );
end;
$$;

grant execute on function public.set_platform_admin(uuid, boolean) to authenticated;

-- can_view_audit_entry has a special branch for entity_type='profile_role_change'
-- (entity_id = the affected user, not a contract-family row) — same shape
-- needed here so the affected user can see their own platform_admin audit
-- entries, not just admins (who already pass via the is_platform_admin
-- branch at the top of the function).
create or replace function public.can_view_audit_entry(
  p_entity_type text, p_entity_id uuid, p_actor_user_id uuid, p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
begin
  if public.is_platform_admin(p_user_id) then
    return true;
  end if;

  if p_entity_type in ('profile_role_change', 'platform_admin') then
    return p_entity_id = p_user_id;
  end if;

  if p_entity_type = 'contract' then
    v_contract_id := p_entity_id;
  elsif p_entity_type = 'guarantee' then
    select contract_id into v_contract_id from public.guarantees where id = p_entity_id;
  elsif p_entity_type = 'dispute' then
    select g.contract_id into v_contract_id
    from public.disputes d join public.guarantees g on g.id = d.guarantee_id
    where d.id = p_entity_id;
  elsif p_entity_type = 'proposal' then
    select g.contract_id into v_contract_id
    from public.proposals pr
    join public.disputes d on d.id = pr.dispute_id
    join public.guarantees g on g.id = d.guarantee_id
    where pr.id = p_entity_id;
  end if;

  if v_contract_id is not null then
    return public.has_contract_access(
      v_contract_id, p_user_id, array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
    );
  end if;

  return p_actor_user_id = p_user_id;
end;
$$;
