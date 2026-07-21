-- Every new table so far has needed a manual `grant ... to service_role`
-- (see 20260720190002_grant_service_role.sql) because Supabase's stock
-- project template's default privileges never got carried into this
-- project's migration history. Set them going forward so this doesn't
-- need to be repeated on every new table: anything created by the
-- migration-running role in schema public automatically grants
-- service_role full read/write, matching what a stock project gives it.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
