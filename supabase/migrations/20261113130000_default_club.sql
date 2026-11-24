-- New players start with a one-star club (ADR-039): rarity grows from there. Existing players keep theirs.
alter table public.children alter column color set default 'schwarz-weiss';
