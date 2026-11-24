-- [SR-05][SR-06][SR-08] trainer membership, invitation and PIN access controls.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'admin@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'member@example.test'),
  ('00000000-0000-0000-0000-000000000013', 'invitee@example.test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000011","email":"admin@example.test"}';
select ok(public.ensure_family() is not null, 'the first trainer gets a team');
select is((select role from public.family_members where user_id = auth.uid()), 'admin', 'the first trainer is the team admin');
create temp table trainer_team on commit drop as select public.ensure_family() as id;
grant select on trainer_team to authenticated, service_role;

reset role;
set local role service_role;
insert into public.team_invitations (family_id, email, token_hash, created_by, expires_at)
  select id, 'invitee@example.test', repeat('c', 64), '00000000-0000-0000-0000-000000000011', now() + interval '7 days'
  from trainer_team;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000013","email":"invitee@example.test"}';
select is(public.accept_team_invitation(repeat('c', 64)), 'accepted', 'an email-matched invitee joins the team');
select is((select family_id from public.family_members where user_id = auth.uid()), (select id from trainer_team), 'the invitee joins the invited team without creating another');
select is((select role from public.family_members where user_id = auth.uid()), 'trainer', 'invitees get the trainer role');
select is(public.accept_team_invitation(repeat('c', 64)), 'invalid_invitation', 'an invitation cannot be reused');
select is((select count(*)::int from public.get_team_trainers()), 2, 'team members can see their team trainer list');
select throws_ok('select * from public.team_invitations', '42501', null, 'members cannot read invitation tokens');
select throws_ok('select * from public.team_security_settings', '42501', null, 'members cannot read stored PIN hashes');
select throws_ok(
  $$update public.family_members set role = 'admin' where user_id = auth.uid()$$,
  '42501', null, 'members cannot change their own role'
);

reset role;
set local role service_role;
insert into public.team_invitations (family_id, email, token_hash, created_by, expires_at)
  select id, 'member@example.test', repeat('d', 64), '00000000-0000-0000-0000-000000000011', now() + interval '7 days'
  from trainer_team;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000012","email":"member@example.test"}';
select isnt(public.ensure_family(), (select id from trainer_team), 'an existing account already belongs to a different team');
select is(public.accept_team_invitation(repeat('d', 64)), 'already_member', 'an existing membership is not transferred by an invitation');
select is((select count(*)::int from public.get_team_trainers()), 1, 'a trainer cannot see another team''s trainer list');
select is((select count(*)::int from public.family_members where user_id = auth.uid()), 1, 'the one-team-per-account invariant remains intact');

reset role;
set local role service_role;
insert into public.team_security_settings (family_id, pin_hash)
  select id, repeat('a', 64) from trainer_team;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000011","email":"admin@example.test"}';
select is(public.check_team_pin((select id from trainer_team), repeat('a', 64)), true, 'the correct team PIN is accepted');
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a wrong PIN is rejected');
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a second wrong PIN is rejected');
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a third wrong PIN is rejected');
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a fourth wrong PIN is rejected');
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a fifth wrong PIN triggers lockout');
select is(public.check_team_pin((select id from trainer_team), repeat('a', 64)), false, 'PIN lockout blocks even a correct PIN');

reset role;
set local role service_role;
update public.team_security_settings
  set locked_until = now() - interval '1 minute'
  where family_id = (select id from trainer_team);
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000011","email":"admin@example.test"}';
select is(public.check_team_pin((select id from trainer_team), repeat('b', 64)), false, 'a wrong PIN after an expired lock is rejected');
select is(public.check_team_pin((select id from trainer_team), repeat('a', 64)), true, 'one wrong PIN after an expired lock does not lock again');

reset role;
set local role service_role;
update public.team_security_settings
  set failed_attempts = 0, locked_until = null
  where family_id = (select id from trainer_team);
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000011","email":"admin@example.test"}';
select is(public.check_team_pin((select id from trainer_team), repeat('a', 64)), true, 'the correct PIN works after the lock is cleared');

reset role;
set local role anon;
select throws_ok(
  $$select public.accept_team_invitation(repeat('c', 64))$$,
  '42501', null, 'anonymous users cannot accept invitations'
);

select * from finish();
rollback;
