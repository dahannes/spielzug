-- [SR-62] player colour schemes are restricted to the approved set.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000062', 'schemes@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000062"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

select lives_ok(
  $$insert into public.children (family_id, name, grade, color) select id, 'Max', 4, 'blau-granat' from team$$,
  'an approved scheme is stored'
);
insert into public.children (family_id, name, grade)
select id, 'Lea', 2 from team;
select results_eq(
  $$select color from public.children where name = 'Lea'$$,
  $$values ('schwarz-weiss'::text)$$,
  'the default scheme is schwarz-weiss (one star)'
);
select throws_ok(
  $$insert into public.children (family_id, name, grade, color) select id, 'Tom', 1, 'blue' from team$$,
  '23514', null, 'a legacy colour id is not accepted after migration'
);
select throws_ok(
  $$insert into public.children (family_id, name, grade, color) select id, 'Ole', 1, 'blau-weiss' from team$$,
  '23514', null, 'a renamed scheme id is not accepted after migration'
);
select throws_ok(
  $$insert into public.children (family_id, name, grade, color) select id, 'Ida', 1, 'unknown' from team$$,
  '23514', null, 'an unknown scheme id is rejected'
);

select * from finish();
rollback;
