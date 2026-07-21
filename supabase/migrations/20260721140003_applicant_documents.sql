-- applicant_documents: identity/income/screening documents about a person
-- (the checklist a broker reviews before approving a tenant), independent
-- of any specific contract — a person can upload these before ever being
-- attached to a contract. Deliberately separate from `documents`, which is
-- contract-scoped (e.g. the signed lease itself).
--
-- Storage is a PRIVATE bucket (unlike property-photos): these are
-- financial/identity documents. Path convention is `${user_id}/...` and
-- storage policies check that prefix against auth.uid() directly — no
-- basic file with such document types.
create table public.applicant_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index applicant_documents_user_id_idx on public.applicant_documents (user_id);

alter table public.applicant_documents enable row level security;
grant select, insert, delete on public.applicant_documents to authenticated;

-- Fase A: only the person themselves can see/manage their own documents.
-- Broker/landlord visibility for screening purposes is a fast-follow, once
-- there's a real review flow to gate it with.
create policy applicant_documents_own on public.applicant_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('applicant-documents', 'applicant-documents', false)
on conflict (id) do nothing;

create policy applicant_documents_storage_own on storage.objects
  for all to authenticated
  using (bucket_id = 'applicant-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'applicant-documents' and (storage.foldername(name))[1] = auth.uid()::text);
