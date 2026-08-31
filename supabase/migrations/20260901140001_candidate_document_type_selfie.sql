-- Evaluación de papeles, Etapa 3 (extensión) — selfie con documento de
-- identidad. Mismo motivo de siempre para migración propia: Postgres no
-- deja usar un valor de enum recién agregado en la misma transacción
-- que lo agrega.
alter type public.candidate_document_type add value 'selfie_con_documento';
