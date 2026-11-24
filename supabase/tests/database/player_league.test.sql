-- [SR-63] a player starts in the Kreisliga; the league is 1 to 5.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000064', 'league@example.test');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000064"}';
create temp table team on commit drop as select public.ensure_family() as id;
grant select on team to authenticated;

insert into public.children (family_id, name, grade) select id, 'Lea', 2 from team;
select results_eq($$select league from public.children where name = 'Lea'$$, $$values (1::smallint)$$, 'a new player starts in the Kreisliga');
select lives_ok($$update public.children set league = 5 where name = 'Lea'$$, 'the Bundesliga is stored');
select throws_ok($$update public.children set league = 6 where name = 'Lea'$$, '23514', null, 'above the Bundesliga is rejected');
select throws_ok($$update public.children set league = 0 where name = 'Lea'$$, '23514', null, 'below the Kreisliga is rejected');

select * from finish();
rollback;
