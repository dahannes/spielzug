-- School grade of a player (Klasse 1–6): shown on the card; later used to filter learning units.
alter table public.children
  add column grade smallint check (grade between 1 and 6);
