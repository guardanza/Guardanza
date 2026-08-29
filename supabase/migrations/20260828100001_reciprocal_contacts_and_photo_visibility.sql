-- Pedido explícito: "que las fotos se vean siempre y cuando un contacto
-- haya aceptado la invitación", y que además "el invitador quede de
-- contacto del invitado, y viceversa" para cualquier combinación de
-- roles (corredor↔arrendador, arrendador↔arrendatario, etc.), siempre
-- que la invitación haya sido ACEPTADA.
--
-- Dos piezas, cada una resuelve una mitad del pedido:
--   1) Visibilidad de perfil (por eso se ve la foto) para cualquier
--      contacto CONFIRMADO — hoy profiles_select_self_or_shared solo
--      cubre contrato u organización compartida, y un contacto recién
--      confirmado no tiene necesariamente ninguna de las dos todavía.
--   2) El lado inverso de la relación: al confirmarse una ficha, si la
--      persona invitada administra su propia organización (arrendador o
--      corredor — un arrendatario nunca tiene una en este modelo, así
--      que ahí no hay ninguna libreta donde reciprocar y queda así a
--      propósito), quien la invitó queda como contacto confirmado en SU
--      libreta también. Con (1) + (2) combinadas, ambos lados terminan
--      viendo la foto del otro sin tocar nada más.

-- ---------------------------------------------------------------------
-- 1) Visibilidad de perfil para contactos confirmados.
--
-- Policy nueva y separada, no se toca profiles_select_self_or_shared —
-- mismo criterio aditivo que contacts_select_via_candidacy (Postgres
-- combina varias policies permisivas con OR): esto solo AMPLÍA
-- visibilidad, nunca la resta.
-- ---------------------------------------------------------------------
create or replace function public.is_confirmed_contact_of_viewer(p_profile_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contacts c
    where c.status = 'confirmado'
      and c.user_id = p_profile_id
      and public.is_org_member(c.organization_id, p_viewer_id)
  );
$$;

grant execute on function public.is_confirmed_contact_of_viewer(uuid, uuid) to authenticated;

create policy profiles_select_confirmed_contact on public.profiles
  for select to authenticated
  using (public.is_confirmed_contact_of_viewer(profiles.id, auth.uid()));

-- ---------------------------------------------------------------------
-- 2) Lado inverso de la relación al confirmarse una ficha.
--
-- full_name/email de quien invitó viajan ya resueltos desde TypeScript
-- — ninguna función SQL de este proyecto toca auth.users directamente
-- (mismo criterio documentado en load_contact_three_paths.sql), así que
-- acá solo se decide A QUÉ organización entra la ficha nueva y CON QUÉ
-- rol, leyendo contacts/organizations/memberships.
--
-- Solo para service_role: es una consecuencia automática de que alguien
-- aceptó una invitación (se llama desde los mismos server actions que ya
-- usan el service-role client para eso), no una acción que un admin de
-- organización pida directo — mismo criterio que confirm_contact_invite.
-- on conflict silencioso: si ya existe una ficha con ese email en esa
-- organización (invitación cruzada previa, o un reintento), no se
-- duplica ni se pisa nada.
create or replace function public.ensure_reciprocal_contact(
  p_contact_id uuid,
  p_inviter_full_name text,
  p_inviter_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact public.contacts;
  v_inviter_org_type public.org_type;
  v_invitee_org_id uuid;
  v_reciprocal_role public.contract_role;
begin
  select * into v_contact from public.contacts where id = p_contact_id;
  if v_contact.id is null or v_contact.user_id is null then
    return;
  end if;

  -- Caso degenerado (auto-carga/pruebas): quien invitó y quien aceptó
  -- son la misma persona — no hay nada sensato que reciprocar.
  if v_contact.created_by = v_contact.user_id then
    return;
  end if;

  -- ¿La persona invitada administra su propia organización? Si no
  -- (arrendatario, o un miembro no-admin), no hay libreta propia donde
  -- reciprocar — se sale sin hacer nada, no es un error. Orden
  -- determinístico si administra más de una (poco común en Fase A).
  select m.organization_id into v_invitee_org_id
  from public.memberships m
  where m.user_id = v_contact.user_id and m.role = 'admin'
  order by m.organization_id
  limit 1;

  if v_invitee_org_id is null then
    return;
  end if;

  select type into v_inviter_org_type from public.organizations where id = v_contact.organization_id;
  v_reciprocal_role := case v_inviter_org_type when 'broker' then 'corredor' else 'arrendador' end;

  insert into public.contacts (
    organization_id, contact_role, full_name, email, user_id, status, confirmed_at, created_by
  ) values (
    v_invitee_org_id, v_reciprocal_role, p_inviter_full_name, p_inviter_email,
    v_contact.created_by, 'confirmado', now(), v_contact.user_id
  )
  on conflict (organization_id, email) do nothing;
end;
$$;

grant execute on function public.ensure_reciprocal_contact(uuid, text, text) to service_role;
