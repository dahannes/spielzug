-- One family per account (2026-11-12). Two simultaneous first calls of ensure_family() each
-- created a family for the same account, and "the oldest family" was then ambiguous.

-- 1. Duplicates: drop memberships in an account's extra families, but only empty ones (no word
--    lists). If two families of one account both hold lists, the unique constraint below fails
--    and the migration stops without changes – such data needs a manual decision.
with ranked as (
  select m.family_id, m.user_id,
         row_number() over (
           partition by m.user_id
           order by (select count(*) from public.word_lists l where l.family_id = m.family_id) desc, f.created_at, f.id
         ) as rank
  from public.family_members m
  join public.families f on f.id = m.family_id
)
delete from public.family_members m
using ranked r
where m.family_id = r.family_id and m.user_id = r.user_id and r.rank > 1
  and not exists (select 1 from public.word_lists l where l.family_id = m.family_id);

-- Families without members and without lists are leftovers; nobody can see them.
delete from public.families f
where not exists (select 1 from public.family_members m where m.family_id = f.id)
  and not exists (select 1 from public.word_lists l where l.family_id = f.id);

-- 2. An account belongs to exactly one family.
alter table public.family_members add constraint family_members_user_id_key unique (user_id);

-- 3. Serialise the first call per account, so parallel calls cannot both create a family.
create or replace function public.ensure_family()
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
  perform pg_advisory_xact_lock(hashtextextended('ensure_family:' || uid::text, 0));
  select family_id into fid from public.family_members where user_id = uid;
  if fid is null then
    insert into public.families (name) values ('Familie') returning id into fid;
    insert into public.family_members (family_id, user_id) values (fid, uid);
  end if;
  return fid;
end;
$$;
