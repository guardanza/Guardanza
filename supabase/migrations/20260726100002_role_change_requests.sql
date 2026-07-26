-- Fase 1: solicitudes_cambio_rol. The account's role is derived (profiles +
-- memberships + contract_parties, see getProfileTypeLabel) rather than a
-- single stored column, so "requesting a role change" can't be a plain
-- UPDATE — it's a request record an admin later executes structurally
-- (ejecutar_cambio_rol, added in the next migration). rol_solicitado reuses
-- contract_role rather than a new enum since the three values are
-- identical by definition (a role change always targets one of the three
-- contract-participant roles).

create type public.solicitud_rol_estado as enum ('pendiente', 'aprobada', 'rechazada');

create table public.solicitudes_cambio_rol (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Human-readable snapshot of getProfileTypeLabel() at request time —
  -- informational/audit only, never used in an authorization decision.
  rol_actual_snapshot text not null,
  rol_solicitado public.contract_role not null,
  motivo text,
  estado public.solicitud_rol_estado not null default 'pendiente',
  resuelto_por uuid references public.profiles (id) on delete set null,
  resuelto_at timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index solicitudes_cambio_rol_user_id_idx on public.solicitudes_cambio_rol (user_id);
create index solicitudes_cambio_rol_estado_idx on public.solicitudes_cambio_rol (estado);

-- DB-enforced, not just app-level: at most one pendiente request per user.
create unique index solicitudes_cambio_rol_one_pending_per_user
  on public.solicitudes_cambio_rol (user_id) where estado = 'pendiente';

create trigger set_updated_at
  before update on public.solicitudes_cambio_rol
  for each row execute function public.set_updated_at();

alter table public.solicitudes_cambio_rol enable row level security;

-- Read-only from the client's perspective at the table level — the only
-- write path is solicitar_cambio_rol() below (user creating their own
-- request) and resolver_solicitud_rol() in the next migration (admin
-- resolving it). No insert/update grant to authenticated.
grant select on public.solicitudes_cambio_rol to authenticated;

create policy solicitudes_cambio_rol_select_own_or_admin on public.solicitudes_cambio_rol
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create or replace function public.solicitar_cambio_rol(
  p_rol_solicitado public.contract_role,
  p_rol_actual_snapshot text,
  p_motivo text default null
)
returns public.solicitudes_cambio_rol
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.solicitudes_cambio_rol;
begin
  if public.is_platform_admin(auth.uid()) then
    raise exception 'Los administradores de plataforma no solicitan cambio de rol.';
  end if;

  if exists (
    select 1 from public.solicitudes_cambio_rol
    where user_id = auth.uid() and estado = 'pendiente'
  ) then
    raise exception 'Ya tienes una solicitud de cambio de rol pendiente.';
  end if;

  insert into public.solicitudes_cambio_rol (user_id, rol_actual_snapshot, rol_solicitado, motivo)
    values (auth.uid(), p_rol_actual_snapshot, p_rol_solicitado, nullif(trim(p_motivo), ''))
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.solicitar_cambio_rol(public.contract_role, text, text) to authenticated;
