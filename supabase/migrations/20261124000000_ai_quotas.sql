-- Daily quotas for the paid calls (SR-44, ADR-044): per account, plus one cap per kind over all
-- accounts, so open sign-up cannot run up the bill. The server counts before each paid call;
-- only the server (secret key) may count, so an account cannot spend its own or the global quota
-- through the API. Days are calendar days in Europe/Berlin.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('read_dictation', 'read_list', 'prepare_audio')),
  count int not null default 0 check (count >= 0),
  -- AI_FAKE calls (tests) count for the account but never towards the global cap
  fake boolean not null default false,
  primary key (user_id, day, kind)
);

create index ai_usage_day_kind on public.ai_usage (day, kind);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select, insert, update, delete on public.ai_usage to service_role;

-- 'ok', 'account_limit' or 'global_limit'. p_global_limit null skips the global cap (AI_FAKE).
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_kind text,
  p_account_limit int,
  p_global_limit int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Berlin')::date;
  used int;
begin
  -- One lock per kind and day: parallel calls cannot overshoot the global cap.
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_kind || ':' || today::text));

  if p_global_limit is not null and (
    select coalesce(sum(count), 0) from public.ai_usage where day = today and kind = p_kind and not fake
  ) >= p_global_limit then
    return 'global_limit';
  end if;

  insert into public.ai_usage as u (user_id, day, kind, count, fake)
    values (p_user_id, today, p_kind, 1, p_global_limit is null)
    on conflict (user_id, day, kind) do update set count = u.count + 1 where u.count < p_account_limit
    returning count into used;
  if used is null or used > p_account_limit then
    return 'account_limit';
  end if;

  -- Only today counts; older rows are kept a month for tuning the limits, then dropped.
  delete from public.ai_usage where day < today - 31;
  return 'ok';
end;
$$;
revoke all on function public.consume_ai_quota(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, int, int) to service_role;
