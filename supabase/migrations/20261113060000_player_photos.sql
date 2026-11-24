-- Player photos (SR-06, ADR-032): only the stylised, cut-out image is stored – the original never
-- leaves the device. Private bucket, path <family>/<child>-<version>.png; members of the family
-- read, upload, replace and delete their own photos (the trainer gate is a UX barrier on top).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', false, 3145728, array['image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "members read own player photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'player-photos' and private.is_own_family_object(name));
create policy "members upload own player photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'player-photos' and private.is_own_family_object(name));
create policy "members replace own player photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'player-photos' and private.is_own_family_object(name))
  with check (bucket_id = 'player-photos' and private.is_own_family_object(name));
create policy "members delete own player photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'player-photos' and private.is_own_family_object(name));

alter table public.children
  add column photo_path text
    check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}-[0-9]+\.(png|webp)$');
