-- Property photos: a single cover photo per property is enough for Fase A.
-- Stored in a public Storage bucket (property photos aren't sensitive the
-- way documents/signature evidence are) and referenced by public URL —
-- simpler than the documents table's storage_path + signed-URL pattern,
-- which exists for genuinely private files.
alter table public.properties add column photo_url text;

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

-- Anyone authenticated can read (bucket is public anyway, but this also
-- covers the storage API's own listing/read checks) and upload; delete is
-- restricted to admins of any org, mirroring the repair catalog's write
-- policy since Fase A has no per-file ownership model for storage objects.
create policy property_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'property-photos');

create policy property_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-photos');

create policy property_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-photos' and public.is_any_org_admin(auth.uid()));
