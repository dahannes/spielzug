-- [SR-15] a word list is a Wort-Diktat unless it is a Vokabeln list; nothing else is stored.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000061', 'v@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000061"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

insert into public.word_lists (family_id, title) select id, 'Alt' from team;
select is((select discipline from public.word_lists where title = 'Alt'), 'word-dictation', 'a list without a type is a Wort-Diktat');
select lives_ok(
  $$insert into public.word_lists (family_id, title, discipline) select id, 'Englisch', 'vocabulary' from team$$,
  'a Vokabeln list is stored'
);
select throws_ok(
  $$insert into public.word_lists (family_id, title, discipline) select id, 'Falsch', 'times-tables' from team$$,
  '23514', null, 'other training types have no lists'
);

select * from finish();
rollback;
