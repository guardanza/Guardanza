-- org_code: a short, shareable code (6 digits) standing in for the
-- organization's UUID when a landlord needs to reference a broker they
-- don't belong to (e.g. delegating a property). A raw UUID is unusable as
-- something a person reads aloud or pastes from an email; a 6-digit code
-- is. Knowing the code is what grants the ability to look the org up —
-- same trust model as an invite link — so lookup_organization_by_code()
-- deliberately bypasses the "must be a member to see this org" RLS rule.

alter table public.organizations add column org_code text;

create or replace function public.generate_org_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
    exit when not exists (select 1 from public.organizations where org_code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.organizations_set_code()
returns trigger
language plpgsql
as $$
begin
  if new.org_code is null then
    new.org_code := public.generate_org_code();
  end if;
  return new;
end;
$$;

create trigger organizations_set_code
  before insert on public.organizations
  for each row execute function public.organizations_set_code();

update public.organizations set org_code = public.generate_org_code() where org_code is null;

alter table public.organizations alter column org_code set not null;
alter table public.organizations add constraint organizations_org_code_key unique (org_code);

-- Resolve a shared code to the (minimal, non-sensitive) identity of a
-- broker organization. Restricted to type='broker' since that's the only
-- kind of organization a property ever delegates to.
create or replace function public.lookup_organization_by_code(p_code text)
returns table (id uuid, name text, type public.org_type)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.type
  from public.organizations o
  where o.org_code = p_code and o.type = 'broker';
$$;

grant execute on function public.lookup_organization_by_code(text) to authenticated;
