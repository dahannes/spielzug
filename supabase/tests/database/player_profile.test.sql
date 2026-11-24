-- [SR-06] player profile values are constrained in the database too; every player has a grade.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000031', 'p@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000031"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

select lives_ok(
  $$insert into public.children (family_id, name, grade) select id, 'Max', 4 from team$$,
  'a grade from 1 to 6 is stored'
);
select throws_ok(
  $$insert into public.children (family_id, name, grade) select id, 'Lea', 7 from team$$,
  '23514', null, 'grade 7 is rejected'
);
select throws_ok(
  $$insert into public.children (family_id, name, grade) select id, 'Tom', 0 from team$$,
  '23514', null, 'grade 0 is rejected'
);

select throws_ok(
  $$insert into public.children (family_id, name) select id, 'Ida' from team$$,
  '23502', null, 'a player without a grade is rejected'
);

select * from finish();
rollback;
