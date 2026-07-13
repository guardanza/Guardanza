-- get_uf_rate: the ONLY place in the system that knows the UF value of a
-- given day. Everything else (the sign-contract trigger, any read-side
-- calculation) calls this function — never fetches or hardcodes a UF value
-- itself. Today it's a mock constant; swapping it for a real source (e.g.
-- mindicador.cl, fetched and cached by a scheduled job into a proper table)
-- only means rewriting this one function body.

create or replace function public.get_uf_rate(p_date date default current_date)
returns numeric
language sql
stable
as $$
  -- MOCK: fixed value, Fase A only. Replace with a real UF source before
  -- guarantees.funding_mode is ever allowed to be 'real'.
  select 37279.50::numeric(14, 4);
$$;
