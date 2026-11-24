-- [SR-07] trainers rename their own team, never another one; only the name is writable.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000021', 'a@example.test'),
  ('00000000-0000-0000-0000-000000000022', 'b@example.test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000022"}';
create temp table other_team on commit drop as select public.ensure_family() as id;
grant select on other_team to authenticated;

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000021"}';
create temp table own_team on commit drop as select public.ensure_family() as id;
grant select on own_team to authenticated;

update public.families set name = 'FC Diktat' where id = (select id from own_team);
select is((select name from public.families where id = (select id from own_team)), 'FC Diktat', 'a trainer renames the own team');

update public.families set name = 'Gekapert' where id = (select id from other_team);
reset role;
select is((select name from public.families where id = (select id from other_team)), 'Familie', 'another team cannot be renamed');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000021"}';
select throws_ok(
  $$update public.families set name = '   ' where id = (select id from own_team)$$,
  '23514', null, 'an empty name is rejected'
);
select throws_ok(
  $$update public.families set created_at = now() where id = (select id from own_team)$$,
  '42501', null, 'only the name is writable'
);
select throws_ok(
  $$update public.families set name = repeat('x', 41) where id = (select id from own_team)$$,
  '23514', null, 'a name longer than 40 characters is rejected'
);

select * from finish();
rollback;
