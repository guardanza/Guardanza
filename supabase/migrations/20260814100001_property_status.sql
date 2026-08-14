-- Alta de propiedad en wizard de 2 pasos: introduce el estado borrador/
-- activa por debajo, sin construir todavía la UI completa de estados
-- (eso es una tanda aparte). El wizard reemplaza el guardado incremental
-- de "revelado progresivo" (que resultó confuso en la práctica, mezclaba
-- lo ya llenado con lo nuevo) — ahora la propiedad nace 'borrador' y solo
-- pasa a 'activa' al completar el Paso 2.
--
-- Backfill deliberado: toda propiedad que ya existe queda 'activa', no
-- 'borrador' — si no, cada propiedad ya completa se vería como a medio
-- terminar la próxima vez que alguien abra /edit. El default 'borrador'
-- de la columna solo aplica hacia adelante, a las que se creen desde acá.
create type public.property_status as enum ('borrador', 'activa');

alter table public.properties add column status public.property_status not null default 'borrador';
update public.properties set status = 'activa';
