-- Avatar storage: only the URL lives in `profiles`, the image itself goes
-- to Storage — same split as property-photos, never the file in the DB.
alter table public.profiles add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Per-user folder prefix (avatars/<user_id>/<file>), same pattern as
-- applicant-documents — but public read like property-photos, since
-- avatars render in the header for everyone who can see the user (other
-- contract parties), not just the owner.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
