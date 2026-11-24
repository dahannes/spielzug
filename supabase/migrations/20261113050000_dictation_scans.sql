-- Photos of checked dictation sheets (SR-34): the prepared JPEG the AI read, kept for the match
-- report. Private bucket; path <family>/<list>/<round>.jpg, so deleting a list can clear its
-- folder and members only ever reach their own family's photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dictation-scans', 'dictation-scans', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "members read own dictation scans" on storage.objects
  for select to authenticated
  using (bucket_id = 'dictation-scans' and private.is_own_family_object(name));
create policy "members upload own dictation scans" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dictation-scans' and private.is_own_family_object(name));
create policy "members replace own dictation scans" on storage.objects
  for update to authenticated
  using (bucket_id = 'dictation-scans' and private.is_own_family_object(name))
  with check (bucket_id = 'dictation-scans' and private.is_own_family_object(name));
create policy "members delete own dictation scans" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dictation-scans' and private.is_own_family_object(name));

alter table public.dictation_rounds
  add column scan_path text
    check (scan_path is null or scan_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');
