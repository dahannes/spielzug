-- Trainers name their team; the name is shown on the player card. Only the name is writable.
alter table public.families
  add constraint families_name_length check (length(trim(name)) between 1 and 40);

create policy "members rename family" on public.families
  for update to authenticated
  using (private.is_family_member(id)) with check (private.is_family_member(id));
grant update (name) on public.families to authenticated;
