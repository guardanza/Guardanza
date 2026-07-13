-- screenings: tenant evaluation. No real Equifax/SII integration yet — the
-- adapter that would call it is isolated in the application layer (see
-- src/lib/adapters/screening) so this stays a stub result for now.

create type public.screening_status as enum ('pendiente', 'verde', 'amarillo', 'rojo');

create table public.screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.screening_status not null default 'pendiente',
  checked_rut text not null,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index screenings_user_id_idx on public.screenings (user_id);
