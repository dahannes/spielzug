-- Each word list is meant for a range of school grades (Klasse von–bis, 1–6). Only players whose
-- grade is in the range see the list on their start page (ADR-035). Existing lists and lists
-- created without a range get 1–6 (all grades), so nothing disappears; a trainer narrows the
-- range in the list editor.
alter table public.word_lists
  add column grade_min smallint not null default 1,
  add column grade_max smallint not null default 6,
  add constraint word_lists_grades_check check (grade_min between 1 and 6 and grade_max between 1 and 6 and grade_min <= grade_max);
