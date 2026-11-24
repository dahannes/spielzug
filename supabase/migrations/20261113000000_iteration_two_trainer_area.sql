-- Iteration 2 trainer area: memberships, invitations, team PIN and player profiles.

alter table public.family_members
  add column role text not null default 'admin'
    check (role in ('admin', 'trainer'));

alter table public.children
  add column shirt_number smallint check (shirt_number between 0 and 99),
  add column position text check (position is null or length(trim(position)) between 1 and 30),
  add column color text not null default 'blue'
    check (color in ('blue', 'red', 'green', 'yellow', 'purple', 'orange'));

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
create index team_invitations_family_id_idx on public.team_invitations (family_id);
create unique index team_invitations_pending_email_idx on public.team_invitations (family_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.team_invitations enable row level security;
revoke all on public.team_invitations from anon, authenticated;
grant select, insert, update, delete on public.team_invitations to service_role;

create table public.team_security_settings (
  family_id uuid primary key references public.families (id) on delete cascade,
  pin_hash text not null check (pin_hash ~ '^[0-9a-f]{64}$'),
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.team_security_settings enable row level security;
revoke all on public.team_security_settings from anon, authenticated;
grant select, insert, update, delete on public.team_security_settings to service_role;

create or replace function public.accept_team_invitation(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  user_email text := lower(trim((select auth.jwt() ->> 'email')));
  invitation public.team_invitations%rowtype;
  existing_family uuid;
begin
  if uid is null or user_email is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid_invitation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ensure_family:' || uid::text, 0));

  select * into invitation
    from public.team_invitations
    where token_hash = p_token_hash
      and email = user_email
      and accepted_at is null
      and revoked_at is null
      and expires_at > now()
    for update;
  if not found then
    return 'invalid_invitation';
  end if;

  select family_id into existing_family
    from public.family_members
    where user_id = uid;
  if existing_family is not null then
    if existing_family = invitation.family_id then
      update public.team_invitations set accepted_at = now() where id = invitation.id;
      return 'accepted';
    end if;
    return 'already_member';
  end if;

  insert into public.family_members (family_id, user_id, role)
    values (invitation.family_id, uid, 'trainer');
  update public.team_invitations set accepted_at = now() where id = invitation.id;
  return 'accepted';
end;
$$;
revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.accept_team_invitation(text) to authenticated;

create function public.get_team_trainers()
returns table (user_id uuid, email text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role
    from public.family_members m
    join auth.users u on u.id = m.user_id
    where private.is_family_member(m.family_id)
    order by m.created_at;
$$;
revoke all on function public.get_team_trainers() from public, anon;
grant execute on function public.get_team_trainers() to authenticated;

create or replace function public.check_team_pin(p_family_id uuid, p_candidate_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.team_security_settings%rowtype;
  attempts int;
begin
  if auth.uid() is null
     or p_candidate_hash !~ '^[0-9a-f]{64}$'
     or not private.is_family_member(p_family_id) then
    return false;
  end if;

  select * into settings
    from public.team_security_settings
    where family_id = p_family_id
    for update;
  if not found or (settings.locked_until is not null and settings.locked_until > now()) then
    return false;
  end if;

  if settings.pin_hash = p_candidate_hash then
    update public.team_security_settings
      set failed_attempts = 0, locked_until = null, updated_at = now()
      where family_id = p_family_id;
    return true;
  end if;

  -- An expired lock starts a fresh count, so one wrong try after the lock does not lock again.
  attempts := case when settings.locked_until is null then settings.failed_attempts else 0 end + 1;
  update public.team_security_settings
    set failed_attempts = attempts,
        locked_until = case when attempts >= 5 then now() + interval '15 minutes' end,
        updated_at = now()
    where family_id = p_family_id;
  return false;
end;
$$;
revoke all on function public.check_team_pin(uuid, text) from public, anon;
grant execute on function public.check_team_pin(uuid, text) to authenticated;
