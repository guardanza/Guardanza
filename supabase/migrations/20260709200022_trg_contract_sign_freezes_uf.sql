-- Freezing uf_rate_at_signing is keyed off signed_at transitioning from
-- null to a value (the actual signature event), not off any particular
-- status label — sign_contract() (later migration) is what sets both
-- status and signed_at together, this trigger just guarantees the UF rate
-- is never missed regardless of which code path sets signed_at.

create or replace function public.contracts_freeze_uf_on_sign()
returns trigger
language plpgsql
as $$
begin
  if new.signed_at is not null and old.signed_at is null and new.uf_rate_at_signing is null then
    new.uf_rate_at_signing := public.get_uf_rate(new.signed_at::date);
  end if;
  return new;
end;
$$;

create trigger contracts_freeze_uf_on_sign
  before update on public.contracts
  for each row execute function public.contracts_freeze_uf_on_sign();
