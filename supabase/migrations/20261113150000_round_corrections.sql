-- A Berichtigung is a round of its own (SR-25): the wrong words of a checked round, written again
-- from memory. It points at that round – same player, same list – and is deleted with it. It is
-- not a dictation: metrics and word choice leave it out (in code).
alter table public.dictation_rounds
  add constraint dictation_rounds_id_child_list_key unique (id, child_id, list_id),
  add column corrects_round_id uuid,
  add constraint dictation_rounds_corrects_round_fkey
    foreign key (corrects_round_id, child_id, list_id) references public.dictation_rounds (id, child_id, list_id) on delete cascade,
  add constraint dictation_rounds_corrects_other_check check (corrects_round_id <> id);
create index dictation_rounds_corrects_round_id_idx on public.dictation_rounds (corrects_round_id);
