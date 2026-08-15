-- Rediseño de estados de propiedad, Paso 1: agrega 'inactiva' al enum que
-- ya introdujo el wizard (borrador/activa). Sin backfill — nadie queda
-- inactiva por default, es una acción manual del corredor (ver
-- set_property_inactive más abajo).
--
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma sentencia en que
-- se agrega el valor dentro de la misma transacción — por eso vive sola
-- en esta migración, separada de las funciones que ya lo referencian.
alter type public.property_status add value 'inactiva';
