-- [SR-06] positions come from a fixed set; a new player starts in midfield.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000063', 'positions@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000063"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

insert into public.children (family_id, name, grade) select id, 'Lea', 2 from team;
select results_eq($$select position from public.children where name = 'Lea'$$, $$values ('mittelfeld'::text)$$, 'a new player starts in midfield');
select lives_ok($$update public.children set position = 'tor' where name = 'Lea'$$, 'a position from the set is stored');
select throws_ok($$update public.children set position = 'Libero' where name = 'Lea'$$, '23514', null, 'free text is rejected');

select * from finish();
rollback;
