-- Positions from a fixed set, picked on a small pitch (SR-06): every player starts in midfield.
alter table public.children drop constraint children_position_check;

update public.children set position = 'mittelfeld';

alter table public.children
  alter column position set default 'mittelfeld',
  alter column position set not null,
  add constraint children_position_check check (position in ('tor', 'abwehr', 'mittelfeld', 'sturm'));
