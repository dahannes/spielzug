-- Spielzug: Lernwörter-Diktat (docs/architecture.md)
--
-- Access model
-- - Every family-owned row carries family_id; RLS lets only members of that family see it.
-- - A family is created automatically at the first sign-in (ensure_family()).
-- - The project must not auto-expose new tables, so every grant is explicit; anon gets nothing.
-- - Spoken audio is written by api/words with the service role; members only read it.

-- New Supabase projects grant anon/authenticated full rights on every new object by default.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_id_idx on public.family_members (user_id);

-- Security definer so policies can check membership without recursing into family_members' RLS.
create function private.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = (select auth.uid())
  );
$$;

-- Storage objects are named "<family_id>/…": true if that family is the current user's.
create function private.is_own_family_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members m
    where m.user_id = (select auth.uid())
      and m.family_id::text = (storage.foldername(object_name))[1]
  );
$$;

revoke all on function private.is_family_member(uuid), private.is_own_family_object(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_family_member(uuid), private.is_own_family_object(text) to authenticated;

-- The current user's family; created at the first call. No insert policy is needed on
-- families/family_members because only this function creates them.
create function public.ensure_family()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fid uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select family_id into fid from public.family_members where user_id = uid order by created_at limit 1;
  if fid is null then
    insert into public.families (name) values ('Familie') returning id into fid;
    insert into public.family_members (family_id, user_id) values (fid, uid);
  end if;
  return fid;
end;
$$;

revoke all on function public.ensure_family() from public, anon;
grant execute on function public.ensure_family() to authenticated;

-- ---------------------------------------------------------------------------
-- Lernwörter-Diktat
-- ---------------------------------------------------------------------------

-- Word lists come from class material and stay in the family's database, never in the repo.
create table public.word_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  test_date date,
  -- [{ id, article, word, form, sentence }]
  words jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index word_lists_family_id_idx on public.word_lists (family_id);

create table public.dictation_rounds (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  list_id uuid not null references public.word_lists (id) on delete cascade,
  -- word ids in dictation order
  word_ids text[] not null,
  -- [{ wordId, read, confidence, verdict, errors }] once the sheet is checked
  results jsonb,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);
create index dictation_rounds_family_id_idx on public.dictation_rounds (family_id);
create index dictation_rounds_list_id_idx on public.dictation_rounds (list_id);

-- ---------------------------------------------------------------------------
-- Row Level Security and grants
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.word_lists enable row level security;
alter table public.dictation_rounds enable row level security;

create policy "members read family" on public.families
  for select to authenticated using (private.is_family_member(id));
create policy "members see members" on public.family_members
  for select to authenticated using (private.is_family_member(family_id));
create policy "members manage word lists" on public.word_lists
  for all to authenticated
  using (private.is_family_member(family_id)) with check (private.is_family_member(family_id));
create policy "members manage dictation rounds" on public.dictation_rounds
  for all to authenticated
  using (private.is_family_member(family_id)) with check (private.is_family_member(family_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.families, public.family_members to authenticated;
grant select, insert, update, delete on public.word_lists, public.dictation_rounds to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Storage: spoken words (private; written by api/words with the service role)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dictation-audio', 'dictation-audio', false, 1048576, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "members read own dictation audio" on storage.objects
  for select to authenticated
  using (bucket_id = 'dictation-audio' and private.is_own_family_object(name));
