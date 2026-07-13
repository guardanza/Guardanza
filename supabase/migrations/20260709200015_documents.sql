-- documents: metadata only. The binary lives in Supabase Storage at storage_path.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  storage_path text not null,
  document_type text not null,
  created_at timestamptz not null default now()
);

create index documents_contract_id_idx on public.documents (contract_id);
