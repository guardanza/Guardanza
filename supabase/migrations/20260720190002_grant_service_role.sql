-- service_role bypasses RLS by design, but bypassing RLS doesn't imply the
-- table-level GRANT a role needs to even attempt a query — same caveat
-- documented in 20260709200028_rls_enable_and_policies.sql for
-- anon/authenticated. Every table's GRANT was scoped to anon/authenticated
-- only, so service_role (used by any backend/admin tooling, e.g. the Auth
-- Admin API's underlying Postgres session) had zero table access. Grant the
-- same full read/write service_role always gets on a stock Supabase project.
grant select, insert, update, delete on all tables in schema public to service_role;
