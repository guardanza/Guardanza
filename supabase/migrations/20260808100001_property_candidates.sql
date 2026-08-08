-- Tanda D Fase 1 — modelo de candidatos: "candidato" no es una entidad
-- nueva, es un estado del vínculo entre un contacto arrendatario (de la
-- libreta, Tanda B) y una propiedad, ANTES de que exista un contrato.
-- Muchos-a-muchos real: el mismo contact_id puede tener una fila por
-- cada propiedad a la que postula.
--
-- Reusa contacts (Tanda B) para la identidad de la persona y los 3
-- caminos de invitación por email — cero mecanismo nuevo de invitación.
-- No reusa property_tenants (legado, sin estado, exige user_id ya
-- registrado) — no sirve de base para "invitado, todavía sin cuenta".
--
-- estado: en_evaluacion (default, compitiendo) | seleccionado (ganó,
-- hoy existe un contrato con esa persona como arrendatario) |
-- no_seleccionado (historial, reactivable). "seleccionado" es a
-- propósito NO alcanzable desde una UPDATE directa de un cliente (ver
-- policy de abajo) — ese paso nace junto con la creación del contrato,
-- en una función SECURITY DEFINER todavía no construida (Fase 1, paso
-- sensible). Este paso solo deja el modelo listo para esa función.
create type public.candidate_status as enum ('en_evaluacion', 'seleccionado', 'no_seleccionado');

create table public.property_candidates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status public.candidate_status not null default 'en_evaluacion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, contact_id)
);

create index property_candidates_property_id_idx on public.property_candidates (property_id);
create index property_candidates_contact_id_idx on public.property_candidates (contact_id);

create trigger set_updated_at
  before update on public.property_candidates
  for each row execute function public.set_updated_at();

-- Guardrail de "propiedad ocupada" (decisión de producto: una propiedad
-- con un contrato que no terminó no recibe candidatos nuevos ni
-- reactivados). "No terminó" = cualquier estado salvo finalizado/
-- cancelado — incluye contratos todavía sin firmar del todo, porque el
-- hueco que cierra la Fase 1 hace nacer el contrato en el mismo acto que
-- elige al ganador; dejar la puerta abierta a más candidatos mientras
-- ese contrato recién nacido junta firmas permitiría un segundo ganador
-- compitiendo por la misma propiedad. Se aplica en INSERT y en UPDATE
-- hacia 'en_evaluacion' (alta y reactivación pasan por la misma regla).
create function public.property_candidates_block_if_occupied()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'en_evaluacion' and exists (
    select 1 from public.contracts c
    where c.property_id = new.property_id
      and c.status not in ('finalizado', 'cancelado')
  ) then
    raise exception 'property % already has an active contract — not accepting candidates', new.property_id;
  end if;
  return new;
end;
$$;

create trigger property_candidates_block_if_occupied
  before insert or update on public.property_candidates
  for each row execute function public.property_candidates_block_if_occupied();

alter table public.property_candidates enable row level security;
grant select, insert, update on public.property_candidates to authenticated, service_role;

-- Mismo perímetro de visibilidad que property_tenants/property_landlords:
-- miembro de la org dueña o de la corredora delegada. Ampliar esto a que
-- el propio candidato vea su propia fila (contacts.user_id = auth.uid())
-- queda para cuando exista una pantalla que lo necesite — un EXISTS
-- directo contra contacts acá adentro no sirve tal cual, porque la RLS
-- de contacts (is_org_member) ya le esconde esa fila a alguien que no es
-- miembro de esa organización; haría falta una función SECURITY DEFINER
-- dedicada, no vale la pena construirla especulativamente todavía.
create policy property_candidates_select on public.property_candidates
  for select to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_candidates.property_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  );

-- Solo admin de la org dueña o de la corredora delegada puede agregar un
-- candidato — y el contacto elegido tiene que ser un arrendatario DE ESA
-- MISMA organización (no cualquier contacto que administre en otro
-- lado), evitando que se cuele la libreta de un tercero.
create policy property_candidates_insert on public.property_candidates
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.properties p
      join public.contacts c on c.id = property_candidates.contact_id
      where p.id = property_candidates.property_id
        and c.contact_role = 'arrendatario'
        and (
          (c.organization_id = p.organization_id and public.is_org_admin(p.organization_id, auth.uid()))
          or (c.organization_id = p.broker_organization_id and public.is_org_admin(p.broker_organization_id, auth.uid()))
        )
    )
  );

-- Update: solo transiciones en_evaluacion <-> no_seleccionado, por un
-- admin de la org dueña o de la corredora delegada. 'seleccionado' queda
-- deliberadamente fuera de acá — ninguna UPDATE de cliente puede
-- ponerlo, solo la futura función SECURITY DEFINER que también crea el
-- contrato (paso sensible, todavía no construido).
--
-- USING queda a nivel de miembro (no admin) a propósito: si fuera
-- is_org_admin acá también, un agente sin permiso de escritura ni
-- siquiera matchearía la fila — Postgres no tira error en ese caso, la
-- UPDATE simplemente no toca ninguna fila. Dejar que la fila SÍ se
-- encuentre y que sea el WITH CHECK el que la rechace da el 42501
-- explícito que corresponde a "la viste pero no podés tocarla", en vez
-- de un silencio ambiguo.
create policy property_candidates_update on public.property_candidates
  for update to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_candidates.property_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  )
  with check (
    status in ('en_evaluacion', 'no_seleccionado')
    and exists (
      select 1 from public.properties p
      where p.id = property_candidates.property_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  );
