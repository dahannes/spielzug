-- [SR-13] a word list is meant for a Klasse range within 1–6; without one it is for all grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000041', 'g@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000041"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

insert into public.word_lists (family_id, title) select id, 'Alle' from team;
select results_eq(
  $$select grade_min, grade_max from public.word_lists where title = 'Alle'$$,
  $$values (1::smallint, 6::smallint)$$,
  'a list without a range is for Klasse 1–6'
);
select lives_ok(
  $$insert into public.word_lists (family_id, title, grade_min, grade_max) select id, 'Erste', 1, 2 from team$$,
  'a range 1–2 is stored'
);
select throws_ok(
  $$insert into public.word_lists (family_id, title, grade_min, grade_max) select id, 'Falsch', 4, 2 from team$$,
  '23514', null, 'from must not be above to'
);
select throws_ok(
  $$insert into public.word_lists (family_id, title, grade_min, grade_max) select id, 'Falsch', 0, 7 from team$$,
  '23514', null, 'grades outside 1–6 are rejected'
);

select * from finish();
rollback;
