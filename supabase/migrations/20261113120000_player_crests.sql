-- Crests built from shape and kit pattern (ADR-036): thirteen schemes; four earlier ids map to their closest one.
alter table public.children drop constraint children_color_check;

update public.children
set color = case color
  when 'rot-weiss' then 'rot-weiss-blau'
  when 'blau-weiss' then 'koenigsblau'
  when 'weinrot-blau' then 'blau-granat'
  when 'weiss-schwarz' then 'schwarz-weiss'
end
where color in ('rot-weiss', 'blau-weiss', 'weinrot-blau', 'weiss-schwarz');

alter table public.children
  alter column color set default 'koenigsblau',
  add constraint children_color_check
    check (color in (
      'weiss-gold', 'rot-weiss-blau', 'rot-gold', 'rot-tuerkis', 'himmelblau', 'koenigsblau', 'blau-granat',
      'schwarz-blau', 'rot-schwarz', 'nachtblau-rot', 'schwarz-gelb', 'gruen-weiss', 'schwarz-weiss'
    ));
