-- Replace the free-text comuna/city fields with a real FK to communes
-- (region is derived via communes.region_id — no need to duplicate it on
-- properties). Best-effort backfill by exact name match before dropping
-- the old columns; this is Fase A pre-launch data, so a handful of rows
-- that don't match get a null commune_id rather than a migration shim.
alter table public.properties add column commune_id uuid references public.communes (id) on delete restrict;

update public.properties p
set commune_id = c.id
from public.communes c
where p.comuna is not null and c.name = p.comuna;

alter table public.properties drop column comuna;
alter table public.properties drop column city;

create index properties_commune_id_idx on public.properties (commune_id);
