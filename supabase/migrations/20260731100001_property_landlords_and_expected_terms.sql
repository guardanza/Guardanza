-- Tanda A (gestión de propiedades y contactos, Capa 1) — Paso 1.
--
-- 1) Campos nuevos en properties: la expectativa de arriendo/garantía de la
--    propiedad ANTES de tener contrato — deliberadamente separados de
--    contracts.rent_amount/guarantee_amount (que son los términos reales de
--    un contrato firmado). Prefijo expected_ para que no se confundan
--    leyendo código ni en un select que junte ambas tablas. Todos nullable:
--    la propiedad se guarda con lo mínimo (dirección + comuna) y estos se
--    completan después (guardado incremental, Paso 2).
alter table public.properties add column listing_url text;
alter table public.properties add column expected_rent_amount numeric(14, 2)
  check (expected_rent_amount is null or expected_rent_amount > 0);
alter table public.properties add column expected_rent_currency public.currency_code;
alter table public.properties add column expected_term_months integer
  check (expected_term_months is null or expected_term_months > 0);
alter table public.properties add column expected_guarantee_amount numeric(14, 2)
  check (expected_guarantee_amount is null or expected_guarantee_amount > 0);
alter table public.properties add column expected_guarantee_currency public.currency_code;

-- 2) property_landlords: copropietarios, many-to-many. Aditivo a propósito
--    — properties.organization_id sigue siendo, sin ningún cambio, la
--    fuente de autorización real (has_contract_access, las 4 policies de
--    properties, create_contract, y el bloqueo de downgrade en
--    ejecutar_cambio_rol siguen leyendo esa columna exactamente igual que
--    hoy). Esta tabla es la lista completa de dueños para mostrar y
--    asociar — no otorga, por ahora, ningún permiso adicional a quien no
--    sea ya el organization_id original. Si más adelante varios
--    copropietarios necesitan gestionar con permisos plenos, es su propia
--    tanda de autorización, no esta.
create table public.property_landlords (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (property_id, organization_id)
);

create index property_landlords_property_id_idx on public.property_landlords (property_id);
create index property_landlords_organization_id_idx on public.property_landlords (organization_id);

-- Backfill determinístico: organization_id es not null en properties desde
-- siempre, así que cada propiedad existente tiene exactamente un dueño que
-- migrar — sin ambigüedad, sin necesidad de criterio humano (a diferencia
-- del backfill de rol_declarado).
insert into public.property_landlords (property_id, organization_id)
select id, organization_id from public.properties;

alter table public.property_landlords enable row level security;
grant select, insert, delete on public.property_landlords to authenticated;

-- Mismo criterio de visibilidad que properties_select_member: si podés ver
-- la propiedad (sos miembro de la org dueña o de la corredora delegada, o
-- admin de plataforma), podés ver su lista de copropietarios.
create policy property_landlords_select on public.property_landlords
  for select to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_landlords.property_id
        and (
          public.is_org_member(p.organization_id, auth.uid())
          or public.is_org_member(p.broker_organization_id, auth.uid())
        )
    )
    or public.is_platform_admin(auth.uid())
  );

-- Gestionar la lista (agregar/quitar copropietarios) queda reservado al
-- admin de la organización dueña original — mismo criterio que ya rige
-- properties_update_admin. Los copropietarios agregados no ganan, por esto
-- solo, la capacidad de gestionar la lista ellos mismos.
create policy property_landlords_insert on public.property_landlords
  for insert to authenticated
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_landlords.property_id
        and public.is_org_admin(p.organization_id, auth.uid())
    )
  );

create policy property_landlords_delete on public.property_landlords
  for delete to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_landlords.property_id
        and public.is_org_admin(p.organization_id, auth.uid())
    )
  );
