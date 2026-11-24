-- [SR-02][SR-03][SR-04] RLS and integrity: families see and change only their own data; anon gets nothing.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');

-- A creates its family, a list, a round and (as the server would) an audio file
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select ok(public.ensure_family() is not null, 'ensure_family creates a family at first use');
select is(public.ensure_family(), public.ensure_family(), 'ensure_family returns the same family again');
insert into public.word_lists (id, family_id, title) values ('00000000-0000-0000-0000-0000000000a1', public.ensure_family(), 'A');
insert into public.children (id, family_id, name, grade) values ('00000000-0000-0000-0000-0000000000c1', public.ensure_family(), 'Kind A', 3);
insert into public.dictation_rounds (family_id, child_id, list_id, word_ids)
  values (public.ensure_family(), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '{x}');
create temp table a_family on commit drop as select public.ensure_family() as id;
grant select on a_family to authenticated;
reset role;
insert into storage.objects (bucket_id, name) select 'dictation-audio', id || '/list/word.mp3' from a_family;

-- B sees nothing of A and cannot write into A's family
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select isnt(public.ensure_family(), (select id from a_family), 'B gets its own family');
select is((select count(*) from public.word_lists)::int, 0, 'B does not see A''s lists');
select is((select count(*) from public.dictation_rounds)::int, 0, 'B does not see A''s rounds');
select is((select count(*) from public.children)::int, 0, 'B does not see A''s children');
insert into public.children (id, family_id, name, grade) values ('00000000-0000-0000-0000-0000000000c2', public.ensure_family(), 'Kind B', 3);
insert into public.word_lists (id, family_id, title) values ('00000000-0000-0000-0000-0000000000b1', public.ensure_family(), 'B');
select throws_ok(
  $$insert into public.dictation_rounds (family_id, child_id, list_id, word_ids)
    values (public.ensure_family(), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '{x}')$$,
  '23503', null, 'B cannot start a round for A''s child'
);
select is((select count(*) from public.families)::int, 1, 'B sees only its own family');
select is((select count(*) from storage.objects where bucket_id = 'dictation-audio')::int, 0, 'B does not see A''s audio');
select throws_ok(
  $$insert into public.word_lists (family_id, title) select id, 'x' from a_family$$,
  '42501', null, 'B cannot write into A''s family'
);
update public.dictation_rounds set results = '[]';
select throws_ok(
  $$insert into public.dictation_rounds (family_id, child_id, list_id, word_ids)
    values (public.ensure_family(), '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', '{x}')$$,
  '23503', null, 'B cannot point a round of its own family at A''s list'
);
reset role;
select throws_ok(
  $$insert into public.family_members (family_id, user_id) select id, '00000000-0000-0000-0000-00000000000b' from a_family$$,
  '23505', null, 'an account belongs to one family only'
);
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select throws_ok(
  $$insert into public.families (name) values ('x')$$,
  '42501', null, 'families are only created by ensure_family'
);
select throws_ok(
  $$insert into public.word_lists (family_id, title, words)
    select public.ensure_family(), 'big', jsonb_agg(i) from generate_series(1, 101) i$$,
  '23514', null, 'a list holds at most 100 words'
);

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select is((select count(*) from public.word_lists)::int, 1, 'A sees its list');
select is((select count(*) from public.children)::int, 1, 'A sees only its own child');
select is((select count(*) from public.dictation_rounds where results is null)::int, 1, 'B''s update did not touch A''s round');

-- anon has no access at all
reset role;
set local role anon;
select throws_ok('select * from public.word_lists', '42501', null, 'anon cannot read word lists');
select throws_ok('select public.ensure_family()', '42501', null, 'anon cannot create families');

select * from finish();
rollback;
