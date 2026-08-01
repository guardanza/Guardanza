-- Cierra la ambigüedad latente que encontramos armando la vista unificada
-- de contactos (Paso 6): create_organization() nunca impidió que una
-- cuenta administrara más de una organización — "+ Nueva organización"
-- estaba abierto sin ninguna validación de unicidad, a propósito, por
-- diseño (20260726100001: "Existing org admins can still self-serve
-- *additional* organizations"). Eso es exactamente lo que produjo el caso
-- real detectado en producción (una cuenta con 5 organizaciones, otra con
-- 2) — ya limpiado a mano antes de esta migración. La convención "una
-- cuenta = un rol = una organización" pasa de tolerada a exigida.
--
-- No aplica a memberships no-admin (role='agente') — ese rol está en el
-- enum desde el principio pero ningún flujo del producto lo usa todavía
-- (roadmap futuro, "agentes de corredora"/oficina de corretaje). Esta
-- restricción es deliberadamente solo sobre quién ADMINISTRA una
-- organización, que es lo que hoy define la identidad de rol de la
-- cuenta (getProfileTypeLabel, contact_target_role, resolve_contact_organization
-- todos miran memberships con role='admin').

-- El candado real: un índice único parcial, no un trigger — Postgres lo
-- hace cumplir en cualquier camino de escritura a memberships, no solo a
-- través de create_organization(). Con los datos ya limpios en
-- producción, esta migración no requiere backfill.
create unique index memberships_one_admin_org_per_user
  on public.memberships (user_id)
  where role = 'admin';

-- El guard explícito en create_organization() es solo para dar un
-- mensaje de error legible en el camino normal (mismo patrón que
-- contact_role_mismatch/resend_cooldown en otras funciones) — el índice
-- de arriba es lo que realmente cierra la puerta, esto es una mejor
-- experiencia de error, no la barrera en sí.
--
-- Deliberadamente sin excepción para platform admin: la regla anterior
-- ("¿tenés al menos una organización?") sí exime a platform admin porque
-- resuelve un problema distinto (bootstrapear tu primera organización sin
-- pasar por el flujo de solicitud de cambio de rol). Esta regla nueva
-- ("¿como mucho una organización?") no tiene ninguna razón de negocio
-- para tratar distinto a un platform admin — la cuenta admin de la
-- plataforma ya quedó, tras la limpieza, con exactamente una organización
-- (su corredora), así que no la bloquea.
create or replace function public.create_organization(p_type public.org_type, p_name text)
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

  if exists (
    select 1 from public.memberships m where m.user_id = auth.uid() and m.role = 'admin'
  ) then
    raise exception 'already_has_organization: ya administras una organización — una cuenta administra una sola organización.';
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
