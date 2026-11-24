-- [SR-34][SR-06] dictation and player photos: members reach only their own family's folder.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000041', 's1@example.test'),
  ('00000000-0000-0000-0000-000000000042', 's2@example.test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000042"}';
create temp table other_team on commit drop as select public.ensure_family() as id;
grant select on other_team to authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000041"}';
create temp table own_team on commit drop as select public.ensure_family() as id;
grant select on own_team to authenticated;

select lives_ok(
  $$insert into storage.objects (bucket_id, name) select 'dictation-scans', id || '/l/r.jpg' from own_team$$,
  'a member stores a photo in the own family folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) select 'dictation-scans', id || '/l/r.jpg' from other_team$$,
  '42501', null, 'a member cannot store a photo in another family''s folder'
);
select is((select count(*) from storage.objects where bucket_id = 'dictation-scans')::int, 1, 'the member sees the own photo');

select lives_ok(
  $$insert into storage.objects (bucket_id, name) select 'player-photos', id || '/c-1.png' from own_team$$,
  'a member stores a player photo in the own family folder'
);

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000042"}';
select is((select count(*) from storage.objects where bucket_id = 'dictation-scans')::int, 0, 'another family does not see it');
select is((select count(*) from storage.objects where bucket_id = 'player-photos')::int, 0, 'another family does not see the player photo');

select * from finish();
rollback;
