-- Children (2026-11-12): who practises. Word lists stay shared by the family; rounds – and with
-- them progress and word choice – belong to one child. Profile data (grade, handedness, …) will
-- be new columns on children.

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, family_id)
);
create index children_family_id_idx on public.children (family_id);

alter table public.children enable row level security;
create policy "members manage children" on public.children
  for all to authenticated
  using (private.is_family_member(family_id)) with check (private.is_family_member(family_id));
revoke all on public.children from anon, authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update, delete on public.children to service_role;

-- Rounds belong to a child of the same family. Families that already practised get one child
-- named "Kind" for their rounds; the parents rename it in the app.
alter table public.dictation_rounds add column child_id uuid;
insert into public.children (family_id, name)
  select distinct family_id, 'Kind' from public.dictation_rounds;
update public.dictation_rounds r set child_id = c.id
  from public.children c
  where c.family_id = r.family_id and r.child_id is null;
alter table public.dictation_rounds
  alter column child_id set not null,
  add constraint dictation_rounds_child_family_fkey
    foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade;
create index dictation_rounds_child_id_idx on public.dictation_rounds (child_id);
