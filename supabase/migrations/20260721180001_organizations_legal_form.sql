-- "Corredor independiente" vs "oficina de corretaje" are both org type
-- 'broker' but differ in legal form — a separate field, not a new org
-- type, per the earlier decision to keep rol (arrendador/corredor) and
-- forma legal (persona natural/empresa) as two independent axes.
create type public.legal_form as enum ('persona_natural', 'empresa');
alter table public.organizations add column legal_form public.legal_form;
