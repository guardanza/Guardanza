-- Evaluación de papeles, Etapa 0: modelo de datos base. Solo esquema —
-- sin ningún server action ni pantalla todavía. El mecanismo de
-- invitación por token (Etapa 2) y la política de documentos del
-- corredor (Etapa 1) llegan en migraciones aparte, cada una revisable
-- por separado.
--
-- "Candidato" ya existía (property_candidates, Tanda D): el vínculo
-- entre un contacto arrendatario y una propiedad, antes de contrato.
-- Lo que falta es la capa de EVALUACIÓN sobre esa candidatura — quién
-- presenta papeles (el titular, y opcionalmente codeudores/
-- coarrendatarios), qué subió, y qué consintió. Eso es lo que modela
-- este archivo.
--
-- Decisión de diseño clave: codeudor y coarrendatario NO son roles de
-- plataforma. contract_role (arrendador/arrendatario/corredor) es el rol
-- de CUENTA — se usa para membresías, RLS de toda la app, y quién puede
-- firmar como parte de un contrato. Codeudor/coarrendatario son
-- participantes de UNA POSTULACIÓN puntual, sin rol de cuenta propio.
-- Modelarlos como un cuarto valor de contract_role habría sido un error:
-- por eso viven en su propia tabla, con su propio enum.
create type public.candidate_participant_type as enum ('titular', 'codeudor', 'coarrendatario');
create type public.candidate_participant_status as enum ('invitado', 'en_progreso', 'completado');
create type public.candidate_income_type as enum ('dependiente', 'independiente', 'pensionado');
create type public.candidate_identity_doc_type as enum ('cedula_chilena', 'pasaporte_extranjero');

-- Los tres roles pasan por el MISMO flujo guiado (spec: "los tres roles,
-- con sus mensajes y consecuencias distintas") — por eso el titular
-- también tiene su propia fila acá, no solo codeudor/coarrendatario.
-- Uniforme: candidate_documents y candidate_consents cuelgan siempre de
-- candidate_participant_id, sin un caso especial para el titular.
--
-- income_type/identity_doc_type/rut viven en el participante (no en un
-- documento) porque son hechos centrales de la persona de los que
-- depende el resto del flujo (la lista de documentos de la Etapa 4 se
-- deriva de identity_doc_type × income_type × política) — quedan
-- nullable porque se completan progresivamente, pantalla por pantalla,
-- no todos de una vez.
--
-- user_id nullable a propósito: para el titular puede llegar ya
-- resuelto al crear la fila (la candidatura ya exige un contacto
-- arrendatario, a veces ya confirmado); para codeudor/coarrendatario
-- nace null y se completa recién cuando aceptan el link (Etapa 2) — la
-- función SECURITY DEFINER que lo haga es la única vía pensada para
-- poblarlo, ver el comentario junto a la policy de update más abajo.
create table public.candidate_participants (
  id uuid primary key default gen_random_uuid(),
  property_candidate_id uuid not null references public.property_candidates (id) on delete cascade,
  participant_type public.candidate_participant_type not null,
  full_name text not null,
  email text not null,
  status public.candidate_participant_status not null default 'invitado',
  income_type public.candidate_income_type,
  identity_doc_type public.candidate_identity_doc_type,
  rut text,
  user_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Una persona (por email) participa como mucho una vez por candidatura
  -- — evita invitar al mismo email dos veces, y evita que alguien sea a
  -- la vez titular y codeudor de su propia postulación.
  unique (property_candidate_id, email)
);

-- A lo más un titular por candidatura — es LA postulación, no una de
-- varias. Codeudores/coarrendatarios sí pueden ser más de uno (spec no
-- lo limita), por eso esto es un índice parcial y no una unique
-- constraint sobre participant_type completo.
create unique index candidate_participants_one_titular_idx
  on public.candidate_participants (property_candidate_id)
  where participant_type = 'titular';

create index candidate_participants_property_candidate_id_idx on public.candidate_participants (property_candidate_id);
create index candidate_participants_user_id_idx on public.candidate_participants (user_id);

create trigger set_updated_at
  before update on public.candidate_participants
  for each row execute function public.set_updated_at();

alter table public.candidate_participants enable row level security;
-- Supabase le otorga por defecto TODOS los privilegios de tabla a
-- authenticated/anon en cuanto la tabla existe — un simple "no lo
-- otorgué" no alcanza para restringir nada, hay que revocarlo explícito
-- y recién ahí otorgar lo que sí corresponde. Mismo candado que
-- audit_log/ledger_entries/proposals ya usan en este proyecto. Sin
-- delete para authenticated/anon: un participante no se borra, se deja
-- en su estado — no hace falta "eliminar" acá. service_role sí conserva
-- delete (contexto de servidor ya confiable, mismo criterio que el
-- resto del proyecto no restringe service_role tabla por tabla).
revoke insert, update, delete on public.candidate_participants from authenticated, anon;
grant select, insert, update on public.candidate_participants to authenticated, service_role;

-- Visibilidad: el propio participante (una vez vinculado a una cuenta)
-- ve su propia fila; cualquier miembro de la org dueña o de la
-- corredora delegada ve todas las de esa propiedad — mismo perímetro
-- que property_candidates_select.
create policy candidate_participants_select on public.candidate_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.property_candidates pc
      join public.properties p on p.id = pc.property_id
      where pc.id = candidate_participants.property_candidate_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  );

-- Solo un admin de la org dueña o de la corredora delegada puede agregar
-- un participante a una candidatura — mismo perímetro que
-- property_candidates_insert.
create policy candidate_participants_insert on public.candidate_participants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.property_candidates pc
      join public.properties p on p.id = pc.property_id
      where pc.id = candidate_participants.property_candidate_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  );

-- Defensa en profundidad, mismo criterio que property_candidates_update
-- con 'seleccionado': una UPDATE de cliente jamás puede dejar el estado
-- en 'completado' — eso nace en la función SECURITY DEFINER de la
-- Etapa 2, junto con la vinculación de user_id, no en una UPDATE cruda.
-- Esta policy es el respaldo, no el único mecanismo: el server action
-- real tampoco va a construir jamás una UPDATE que toque esas columnas
-- fuera de esa función.
create policy candidate_participants_update on public.candidate_participants
  for update to authenticated
  using (
    exists (
      select 1 from public.property_candidates pc
      join public.properties p on p.id = pc.property_id
      where pc.id = candidate_participants.property_candidate_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  )
  with check (status <> 'completado');

-- ---------------------------------------------------------------------
-- Helpers de acceso, reusados por candidate_documents, candidate_consents
-- y las policies de storage.objects de más abajo. SECURITY DEFINER, no
-- un EXISTS inline en cada policy — mismo motivo que
-- is_contact_candidate_visible (20260808120001): evita que Postgres
-- detecte un ciclo entre tablas al planear, y evita repetir el mismo
-- join tres veces.
--
-- Toman el id como TEXT, no uuid — así se pueden llamar tanto desde una
-- columna uuid real (candidate_participant_id::text, nunca falla) como
-- desde storage.foldername(name), que devuelve texto y con una entrada
-- corrupta/adversarial rompería un cast a uuid con una excepción en vez
-- de simplemente no matchear. Mismo criterio ya usado en
-- avatars_write_own ((storage.foldername(name))[1] = auth.uid()::text):
-- comparar como texto, nunca castear un valor no confiable.
-- ---------------------------------------------------------------------
create or replace function public.can_access_candidate_documents(p_candidate_participant_id text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    where cp.id::text = p_candidate_participant_id
      and (
        cp.user_id = p_user_id
        or exists (
          select 1 from public.property_candidates pc
          join public.properties p on p.id = pc.property_id
          where pc.id = cp.property_candidate_id
            and (public.is_org_member(p.organization_id, p_user_id) or public.is_org_member(p.broker_organization_id, p_user_id))
        )
      )
  );
$$;

grant execute on function public.can_access_candidate_documents(text, uuid) to authenticated;

-- Distinto de poder VER: solo el propio participante puede subir/borrar
-- lo suyo — ni siquiera un admin de la organización sube en su nombre
-- (el corredor revisa, no carga papeles ajenos). "status <> completado"
-- cierra la puerta a tocar archivos de una postulación ya enviada.
create or replace function public.is_own_candidate_participant(p_candidate_participant_id text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    where cp.id::text = p_candidate_participant_id
      and cp.user_id = p_user_id
      and cp.status <> 'completado'
  );
$$;

grant execute on function public.is_own_candidate_participant(text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- candidate_documents: los papeles que sube cada participante. Bucket
-- PRIVADO nuevo (candidate-documents) — a diferencia de
-- applicant-documents (Fase 0, sin visibilidad para nadie más que el
-- dueño), acá SÍ hace falta que el corredor de esa propiedad los vea,
-- así que la policy de lectura pasa por can_access_candidate_documents,
-- no por un simple auth.uid() = user_id.
-- ---------------------------------------------------------------------
create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_participant_id uuid not null references public.candidate_participants (id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index candidate_documents_candidate_participant_id_idx on public.candidate_documents (candidate_participant_id);

alter table public.candidate_documents enable row level security;
-- Revoke primero, no solo "no otorgar" (Supabase da todo por defecto,
-- ver el comentario junto a candidate_participants más arriba). Sin
-- update: un documento no se edita, se borra y se vuelve a subir (mismo
-- criterio que documents/applicant_documents, ninguna de las dos tiene
-- UPDATE tampoco).
revoke insert, update, delete on public.candidate_documents from authenticated, anon;
grant select, insert, delete on public.candidate_documents to authenticated, service_role;

create policy candidate_documents_select on public.candidate_documents
  for select to authenticated
  using (public.can_access_candidate_documents(candidate_participant_id::text, auth.uid()));

create policy candidate_documents_insert on public.candidate_documents
  for insert to authenticated
  with check (public.is_own_candidate_participant(candidate_participant_id::text, auth.uid()));

create policy candidate_documents_delete on public.candidate_documents
  for delete to authenticated
  using (public.is_own_candidate_participant(candidate_participant_id::text, auth.uid()));

insert into storage.buckets (id, name, public)
values ('candidate-documents', 'candidate-documents', false)
on conflict (id) do nothing;

-- Convención de path: ${candidate_participant_id}/archivo.ext — no
-- ${user_id}/... como avatars/applicant-documents, porque la MISMA
-- persona puede ser participante de más de una candidatura (ej.
-- coarrendatario en dos propiedades que está mirando a la vez) y cada
-- postulación necesita su propio espacio, sin ambigüedad de a cuál
-- pertenece cada archivo.
create policy candidate_documents_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'candidate-documents' and public.can_access_candidate_documents((storage.foldername(name))[1], auth.uid()));

create policy candidate_documents_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'candidate-documents' and public.is_own_candidate_participant((storage.foldername(name))[1], auth.uid()));

create policy candidate_documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'candidate-documents' and public.is_own_candidate_participant((storage.foldername(name))[1], auth.uid()));

-- ---------------------------------------------------------------------
-- candidate_consents: el registro trazable e inmodificable de cada
-- consentimiento (codeudor, informe comercial). "Inmodificable" no es
-- una convención de la app — ni siquiera hay GRANT de update/delete
-- hacia authenticated, así que ninguna policy podría habilitarlo por
-- error más adelante: hay que borrar el grant mismo, un cambio mucho
-- más visible en cualquier revisión futura que una policy de más.
--
-- consent_text guarda la copia exacta que la persona vio al aceptar —
-- no solo que aceptó "algo" llamado 'codeudor_responsabilidad'. Si el
-- texto legal cambia más adelante, el registro viejo sigue probando
-- QUÉ decía exactamente lo que esa persona aceptó, no la versión
-- vigente hoy. No estaba pedido explícito en la spec, lo agrego porque
-- "trazable" sin esto deja una laguna real — así que queda marcado
-- para que se revise en el plan, no una decisión tomada en silencio.
create type public.candidate_consent_type as enum ('codeudor_responsabilidad', 'informe_comercial');

create table public.candidate_consents (
  id uuid primary key default gen_random_uuid(),
  candidate_participant_id uuid not null references public.candidate_participants (id) on delete cascade,
  consent_type public.candidate_consent_type not null,
  consent_text text not null,
  accepted_at timestamptz not null default now(),
  unique (candidate_participant_id, consent_type)
);

create index candidate_consents_candidate_participant_id_idx on public.candidate_consents (candidate_participant_id);

alter table public.candidate_consents enable row level security;
-- "Inmodificable" en serio: revoke primero (Supabase da todo por
-- defecto a authenticated/anon en cuanto la tabla existe — ver el
-- comentario junto a candidate_participants), y recién ahí un grant que
-- deliberadamente deja afuera update y delete. Ni una policy futura mal
-- escrita puede reabrir esto: el privilegio mismo no está.
revoke insert, update, delete on public.candidate_consents from authenticated, anon;
grant select, insert on public.candidate_consents to authenticated, service_role;

create policy candidate_consents_select on public.candidate_consents
  for select to authenticated
  using (public.can_access_candidate_documents(candidate_participant_id::text, auth.uid()));

create policy candidate_consents_insert on public.candidate_consents
  for insert to authenticated
  with check (public.is_own_candidate_participant(candidate_participant_id::text, auth.uid()));
