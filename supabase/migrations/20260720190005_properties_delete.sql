-- properties had select/insert/update grants but no delete — the
-- Fase A CRUD only ever created properties, never removed them. Same
-- "org admin" boundary as properties_update_admin.
grant delete on public.properties to authenticated;

create policy properties_delete_admin on public.properties
  for delete to authenticated
  using (public.is_org_admin(properties.organization_id, auth.uid()));
