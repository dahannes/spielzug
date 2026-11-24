-- What the model read on the sheet, line by line (number, text, confidence), kept with the round
-- (ADR-034): the matching to the dictated words can be checked and redone later.
alter table public.dictation_rounds add column read_lines jsonb;
