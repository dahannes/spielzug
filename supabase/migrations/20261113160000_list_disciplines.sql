-- A word list belongs to one training type (SR-15): Wort-Diktat (German words) or Vokabeln
-- (English words with their German meaning). Existing lists are Wort-Diktat. The ids are the
-- catalog ids in shared/subjects.ts; the type of a list never changes, its rounds depend on it.
alter table public.word_lists
  add column discipline text not null default 'word-dictation',
  add constraint word_lists_discipline_check check (discipline in ('word-dictation', 'vocabulary'));
