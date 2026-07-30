-- Tanda B (libreta de contactos), Paso 1: modelo de datos.
--
-- contacts: la libreta de una organización — fichas de personas (nombre,
-- email, RUT, rol esperado) que un admin carga para poder asociarlas
-- después a propiedades/contratos. Dueño = organización, mismo criterio
-- que property_landlords/property_tenants (NO el usuario individual que
-- carga la ficha).
--
-- Deliberadamente SIN flujo de invitación todavía (eso es Paso 3/4): esta
-- migración solo modela la ficha y su estado, y permite cargar/listar/
-- borrar. user_id queda nullable — se completa recién cuando la ficha se
-- vincula a una cuenta real (vínculo directo o confirmación de invitación,
-- ambos en pasos posteriores). full_name/email/rut acá son los datos
-- DECLARADOS por quien carga la ficha; una vez CONFIRMADA, la UI debe
-- preferir los datos reales de profiles (join por user_id) si difieren
-- (spec: "se muestran los datos confirmados por la persona") — esta
-- migración no lo resuelve, solo dependen de que user_id esté poblado.
create type public.contact_status as enum ('pendiente', 'confirmado');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_role public.contract_role not null,
  full_name text not null,
  email text not null,
  rut text,
  status public.contact_status not null default 'pendiente',
  user_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index contacts_organization_id_idx on public.contacts (organization_id);
create index contacts_user_id_idx on public.contacts (user_id);

create trigger set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
grant select, insert, delete on public.contacts to authenticated;

-- Mismo criterio de visibilidad que property_landlords_select: cualquier
-- miembro de la organización dueña puede ver su libreta completa.
create policy contacts_select on public.contacts
  for select to authenticated
  using (
    public.is_org_member(organization_id, auth.uid())
    or public.is_platform_admin(auth.uid())
  );

-- Cargar/borrar fichas queda reservado al admin de la organización, mismo
-- criterio que property_landlords_insert/_delete. created_by = auth.uid()
-- evita la clase de bug de "actor spoofeable" que ya se corrigió antes en
-- las funciones security definer (20260726110001_fix_actor_id_spoofing).
create policy contacts_insert on public.contacts
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_org_admin(organization_id, auth.uid())
  );

create policy contacts_delete on public.contacts
  for delete to authenticated
  using (public.is_org_admin(organization_id, auth.uid()));
