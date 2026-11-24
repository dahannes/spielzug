alter table public.children drop constraint children_color_check;

update public.children
set color = case color
  when 'blue' then 'blau-weiss'
  when 'red' then 'rot-weiss'
  when 'green' then 'gruen-weiss'
  when 'yellow' then 'schwarz-gelb'
  when 'purple' then 'weinrot-blau'
  when 'orange' then 'rot-schwarz'
end
where color in ('blue', 'red', 'green', 'yellow', 'purple', 'orange');

alter table public.children
  alter column color set default 'blau-weiss',
  add constraint children_color_check
    check (color in ('rot-weiss', 'schwarz-gelb', 'blau-weiss', 'gruen-weiss', 'rot-schwarz', 'weinrot-blau', 'himmelblau', 'weiss-schwarz'));
