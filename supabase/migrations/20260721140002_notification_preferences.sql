-- Mockup only for now — toggles are real and persist, but nothing actually
-- sends an email or WhatsApp message yet. One row per user, one pair of
-- switches per notification category.
create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  contract_signed_email boolean not null default true,
  contract_signed_whatsapp boolean not null default false,
  guarantee_paid_email boolean not null default true,
  guarantee_paid_whatsapp boolean not null default false,
  dispute_opened_email boolean not null default true,
  dispute_opened_whatsapp boolean not null default true,
  proposal_received_email boolean not null default true,
  proposal_received_whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
grant select, insert, update on public.notification_preferences to authenticated;

create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
