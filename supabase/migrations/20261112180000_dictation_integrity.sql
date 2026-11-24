-- Integrity of the dictation data (review 2026-11-12).
-- - A round may only point at a word list of its own family: the foreign key covers
--   (list_id, family_id), so RLS on the round's family_id is enough to keep families apart.
-- - A word list holds at most 100 words: every word costs a Polly recording and LLM tokens.

alter table public.word_lists
  add constraint word_lists_id_family_id_key unique (id, family_id),
  add constraint word_lists_words_check check (jsonb_typeof(words) = 'array' and jsonb_array_length(words) <= 100);

alter table public.dictation_rounds
  drop constraint dictation_rounds_list_id_fkey,
  add constraint dictation_rounds_list_family_fkey
    foreign key (list_id, family_id) references public.word_lists (id, family_id) on delete cascade;
