-- Evaluación de papeles, Etapa 1: configuración del corredor — solo
-- capas 1 y 2 (política general + ajuste por propiedad). La capa 3
-- (excepción por candidato) queda para la Etapa 7, cuando ya existan
-- candidatos reales con participantes sobre los que aplicarla — ahí es
-- donde, si hace falta, se evalúa además si conviene admitir texto
-- libre (pedirle algo puntual a un candidato específico fuera del
-- catálogo). Acá, catálogo cerrado nomás.
--
-- Nada de esto toca datos personales: son dos tablas de configuración
-- pura (qué documentos exige un corredor/arrendador, no quién los subió
-- ni qué dice cada uno). Sin nada sensible más allá del perímetro ya
-- establecido (miembro lee, admin escribe) — el mismo que
-- property_candidates.
create type public.candidate_document_type as enum (
  'cedula_identidad',
  'pasaporte',
  'visa_permanencia_definitiva',
  'liquidaciones_sueldo',
  'certificado_afp',
  'contrato_trabajo',
  'carpeta_tributaria_sii',
  'boletas_honorarios',
  'cartola_bancaria',
  'liquidaciones_pension',
  'certificado_afiliacion_ips_afp',
  'informe_comercial'
);

-- org_document_policy: la política general del corredor/arrendador —
-- "una vez en su perfil, aplica a todas sus propiedades" (spec, capa 1).
-- Genérica a cualquier tipo de organización (individual o broker), no
-- solo corredoras — un arrendador que gestiona directo, sin corredor,
-- también puede querer definir su propia exigencia de papeles.
--
-- Modelo de "toggle": una fila por (organización, tipo de ingreso, tipo
-- de documento) que el corredor decide OVERRIDEAR sobre el default de
-- la spec (sección 7) — lo que no tiene fila usa ese default. required
-- en false es un "no lo exijo" explícito, no "no sé" — por eso no hay
-- un tercer estado nullable, solo boolean.
create table public.org_document_policy (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  income_type public.candidate_income_type not null,
  document_type public.candidate_document_type not null,
  required boolean not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, income_type, document_type)
);

create index org_document_policy_organization_id_idx on public.org_document_policy (organization_id);

create trigger set_updated_at
  before update on public.org_document_policy
  for each row execute function public.set_updated_at();

alter table public.org_document_policy enable row level security;
-- Revoke primero, no solo "no otorgar" — Supabase da todo por defecto a
-- authenticated/anon apenas la tabla existe (hallazgo real de la
-- Etapa 0, mismo candado acá aunque esta tabla no sea tan sensible).
revoke insert, update, delete on public.org_document_policy from authenticated, anon;
grant select, insert, update, delete on public.org_document_policy to authenticated, service_role;

create policy org_document_policy_select on public.org_document_policy
  for select to authenticated
  using (public.is_org_member(organization_id, auth.uid()));

create policy org_document_policy_write on public.org_document_policy
  for all to authenticated
  using (public.is_org_admin(organization_id, auth.uid()))
  with check (public.is_org_admin(organization_id, auth.uid()));

-- property_document_policy: ajuste opcional por propiedad (spec, capa
-- 2) — "para arriendo alto". Misma forma que org_document_policy, pero
-- por property_id: si existe una fila acá para una combinación, gana
-- sobre la política general para esa propiedad puntual. Mismo
-- perímetro que property_candidates: admin de la org dueña O de la
-- corredora delegada.
create table public.property_document_policy (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  income_type public.candidate_income_type not null,
  document_type public.candidate_document_type not null,
  required boolean not null,
  updated_at timestamptz not null default now(),
  unique (property_id, income_type, document_type)
);

create index property_document_policy_property_id_idx on public.property_document_policy (property_id);

create trigger set_updated_at
  before update on public.property_document_policy
  for each row execute function public.set_updated_at();

alter table public.property_document_policy enable row level security;
revoke insert, update, delete on public.property_document_policy from authenticated, anon;
grant select, insert, update, delete on public.property_document_policy to authenticated, service_role;

create policy property_document_policy_select on public.property_document_policy
  for select to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_document_policy.property_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  );

create policy property_document_policy_write on public.property_document_policy
  for all to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_document_policy.property_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_document_policy.property_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  );
