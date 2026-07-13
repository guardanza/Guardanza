-- Extensions & shared helpers used by every subsequent migration.

create extension if not exists "pgcrypto" with schema extensions;

-- Generic updated_at maintenance trigger, reused by every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
