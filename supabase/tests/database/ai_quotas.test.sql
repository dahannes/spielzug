-- [SR-44] daily quotas for paid calls: per account, a global cap, and only the server may count.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000041', 'quota-a@example.test'),
  ('00000000-0000-0000-0000-000000000042', 'quota-b@example.test'),
  ('00000000-0000-0000-0000-000000000043', 'quota-c@example.test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000041","email":"quota-a@example.test"}';
select throws_ok(
  $$select public.consume_ai_quota('00000000-0000-0000-0000-000000000041', 'read_list', 1000, null)$$,
  '42501', null, 'an account cannot count (or reset) its own quota'
);
select throws_ok('select * from public.ai_usage', '42501', null, 'accounts cannot read the usage table');

reset role;
set local role service_role;
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000041', 'read_dictation', 2, 3), 'ok', 'the first call is allowed');
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000041', 'read_dictation', 2, 3), 'ok', 'calls up to the account limit are allowed');
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000041', 'read_dictation', 2, 3), 'account_limit', 'the call above the account limit is refused');
select is(
  (select count from public.ai_usage where user_id = '00000000-0000-0000-0000-000000000041' and kind = 'read_dictation'),
  2, 'a refused call is not counted'
);
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000041', 'read_list', 2, 3), 'ok', 'each kind has its own quota');
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000042', 'read_dictation', 2, 3), 'ok', 'another account fills the global cap');
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000043', 'read_dictation', 2, 3), 'global_limit', 'the global cap stops a fresh account');

-- fake calls (AI_FAKE) count for the account, never towards the global cap
select is(public.consume_ai_quota('00000000-0000-0000-0000-000000000043', 'read_list', 5, null), 'ok', 'a fake call skips the global cap');
select is(
  (select coalesce(sum(count), 0)::int from public.ai_usage where kind = 'read_list' and not fake),
  1, 'fake calls do not fill the global cap'
);

select * from finish();
rollback;
