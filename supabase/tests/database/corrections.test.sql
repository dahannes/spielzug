-- [SR-25] a Berichtigung points at a round of the same player and list and goes with it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000051', 'k@example.test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000051"}';
select ok(public.ensure_family() is not null, 'the team exists');
insert into public.word_lists (id, family_id, title) values
  ('00000000-0000-0000-0000-0000000005a1', public.ensure_family(), 'A'),
  ('00000000-0000-0000-0000-0000000005a2', public.ensure_family(), 'B');
insert into public.children (id, family_id, name, grade) values
  ('00000000-0000-0000-0000-0000000005c1', public.ensure_family(), 'Kind 1', 4),
  ('00000000-0000-0000-0000-0000000005c2', public.ensure_family(), 'Kind 2', 4);
insert into public.dictation_rounds (id, family_id, child_id, list_id, word_ids) values
  ('00000000-0000-0000-0000-0000000005d1', public.ensure_family(), '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005a1', '{x,y}');

select lives_ok(
  $$insert into public.dictation_rounds (id, family_id, child_id, list_id, word_ids, corrects_round_id)
    values ('00000000-0000-0000-0000-0000000005d2', public.ensure_family(), '00000000-0000-0000-0000-0000000005c1',
            '00000000-0000-0000-0000-0000000005a1', '{x}', '00000000-0000-0000-0000-0000000005d1')$$,
  'a Berichtigung of the own round'
);
select throws_ok(
  $$insert into public.dictation_rounds (family_id, child_id, list_id, word_ids, corrects_round_id)
    values (public.ensure_family(), '00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005a1',
            '{x}', '00000000-0000-0000-0000-0000000005d1')$$,
  '23503', null, 'not for another player''s round'
);
select throws_ok(
  $$insert into public.dictation_rounds (family_id, child_id, list_id, word_ids, corrects_round_id)
    values (public.ensure_family(), '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005a2',
            '{x}', '00000000-0000-0000-0000-0000000005d1')$$,
  '23503', null, 'not on another list'
);
select throws_ok(
  $$update public.dictation_rounds set corrects_round_id = id where id = '00000000-0000-0000-0000-0000000005d1'$$,
  '23514', null, 'a round does not correct itself'
);
delete from public.dictation_rounds where id = '00000000-0000-0000-0000-0000000005d1';
select is((select count(*) from public.dictation_rounds)::int, 0, 'the Berichtigung goes with its round');

select * from finish();
rollback;
