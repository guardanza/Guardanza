-- contract_guarantee_amounts: the single place that computes "guarantee in
-- both currencies" for a contract. amount_chosen/currency_chosen is the
-- source of truth (what was actually agreed); amount_other/currency_other
-- is a reference figure computed with uf_rate_at_signing — the rate frozen
-- at signature — NEVER with today's UF. Before signing, uf_rate_at_signing
-- is null and amount_other comes back null too (nothing to freeze yet).
-- Both the API and any UI must read this instead of duplicating the CLP<->UF
-- math anywhere else.

create or replace function public.contract_guarantee_amounts(p_contract_id uuid)
returns table (
  currency_chosen public.currency_code,
  amount_chosen numeric,
  currency_other public.currency_code,
  amount_other numeric,
  uf_rate_at_signing numeric,
  is_frozen boolean
)
language sql
stable
as $$
  select
    c.guarantee_currency as currency_chosen,
    c.guarantee_amount as amount_chosen,
    case when c.guarantee_currency = 'CLP' then 'UF'::public.currency_code else 'CLP'::public.currency_code end
      as currency_other,
    case
      when c.uf_rate_at_signing is null then null
      when c.guarantee_currency = 'CLP' then round(c.guarantee_amount / c.uf_rate_at_signing, 4)
      else round(c.guarantee_amount * c.uf_rate_at_signing, 2)
    end as amount_other,
    c.uf_rate_at_signing,
    c.uf_rate_at_signing is not null as is_frozen
  from public.contracts c
  where c.id = p_contract_id;
$$;

grant execute on function public.contract_guarantee_amounts(uuid) to authenticated;
