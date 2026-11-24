-- Every player has a school grade (Klasse 1–6). Players created before the grade existed get
-- Klasse 1 as a placeholder; a trainer sets the real grade in the trainer area afterwards. No
-- column default: new players must choose their grade.
update public.children set grade = 1 where grade is null;

alter table public.children alter column grade set not null;
