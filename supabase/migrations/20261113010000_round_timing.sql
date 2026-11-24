-- Training time per round (SR-61): kickoff (first word) and final whistle (last word done).
-- Tracked only; the app does not show it yet.
alter table public.dictation_rounds
  add column started_at timestamptz,
  add column finished_at timestamptz,
  add constraint dictation_rounds_timing_check
    check (finished_at is null or (started_at is not null and finished_at >= started_at));
