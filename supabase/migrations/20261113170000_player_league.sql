-- Liga (SR-63, ADR-042): the highest league a player has reached, 1 (Kreisliga) to 5 (Bundesliga).
-- The app raises it when the player's rounds earn more; trainers may set it. Deleting rounds never
-- lowers it. Everyone starts in the Kreisliga; the app catches up with earlier rounds on its own.
alter table public.children
  add column league smallint not null default 1,
  add constraint children_league_check check (league between 1 and 5);
