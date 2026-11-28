-- Salli — initial database schema (Supabase / Postgres)
--
-- Tables from the brief's "Data model and backend" section, with row-level
-- security on every table: users read and write only their own rows; group
-- data only for members; members never see another member's counts unless
-- that member turned sharing on. Totals and streaks are also computed here
-- (triggers + functions) so the phone and the Telegram bot always agree.
--
-- Run once in the Supabase SQL editor (or via the CLI / Management API).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  timezone text not null default 'UTC',
  city text,
  latitude double precision,
  longitude double precision,
  daily_goal integer not null default 10 check (daily_goal between 1 and 100000),
  share_count_with_group boolean not null default false,
  telegram_user_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every logged amount. client_id is made on the phone so an entry synced twice
-- (e.g. after being offline) is never counted twice. Taps are grouped into one
-- entry on the phone, so an entry's amount can grow; it is upserted by client_id.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 100000),
  source text not null check (source in ('tap', 'quick', 'pad', 'reminder', 'telegram')),
  salli_date date not null, -- the Salli day (Maghrib to Maghrib) it belongs to
  client_id text not null check (char_length(client_id) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index entries_user_date on public.entries (user_id, salli_date);
create index entries_user_updated on public.entries (user_id, updated_at);

-- One row per user per Salli day; drives streaks and the heatmap.
create table public.days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total integer not null default 0,
  goal integer not null check (goal > 0),
  lit boolean not null default false,
  shield_used boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0,
  best integer not null default 0,
  shields integer not null default 0 check (shields between 0 and 2),
  last_lit_date date,
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  weekly_goal integer not null default 10000 check (weekly_goal between 1 and 10000000),
  goal_ends_at timestamptz, -- Friday Maghrib, set by the app
  telegram_chat_id bigint unique,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user on public.group_members (user_id);

create table public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('logged', 'streak', 'goal_passed')),
  value integer, -- streak length for 'streak'; never another member's count
  created_at timestamptz not null default now()
);
create index group_events_group on public.group_events (group_id, created_at desc);

create table public.reactions (
  event_id uuid not null references public.group_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ameen', 'mashaallah')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, kind)
);

create table public.reminders (
  id text primary key,
  kind text not null check (kind in ('quran', 'hadith', 'video')),
  arabic text not null,
  english text not null,
  source_ref text not null,
  video_url text,
  verified_by text, -- name of the qualified person who checked it
  published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.reminder_actions (
  reminder_id text not null references public.reminders (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  liked boolean not null default false,
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (reminder_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────

-- Is the current user a member of this group? (security definer so policies
-- on group_members don't recurse into themselves)
create function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

-- Do the current user and `other` share a group?
create function public.shares_group_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- New sign-up → profile row.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 40), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Streak rules (same as the phone: src/store/streaks.ts)
--  • lit day → streak + 1; best kept forever
--  • missed finished day breaks the streak unless a shield is used
--  • 1 shield per 7 lit days in a row, max 2, used automatically
--  • today never breaks the streak while in progress
-- ─────────────────────────────────────────────────────────────────────────

create function public.recompute_streak(p_user uuid, p_today date default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date;
  v_first date;
  v_day date;
  v_lit boolean;
  v_current integer := 0;
  v_best integer := 0;
  v_shields integer := 0;
  v_run integer := 0;
  v_last_lit date;
begin
  select coalesce(p_today, max(date)), min(date) into v_today, v_first from days where user_id = p_user;
  if v_first is null then
    return;
  end if;

  -- Finished days, oldest first (gaps count as missed days).
  for v_day in select d::date from generate_series(v_first, v_today - 1, interval '1 day') d loop
    select coalesce((select lit from days where user_id = p_user and date = v_day), false) into v_lit;
    if v_lit then
      v_current := v_current + 1;
      v_best := greatest(v_best, v_current);
      v_last_lit := v_day;
      v_run := v_run + 1;
      if v_run = 7 then
        v_shields := least(2, v_shields + 1);
        v_run := 0;
      end if;
      update days set shield_used = false where user_id = p_user and date = v_day and shield_used;
    elsif v_current > 0 and v_shields > 0 then
      v_shields := v_shields - 1;
      v_run := 0;
      insert into days (user_id, date, total, goal, lit, shield_used)
      values (p_user, v_day, 0, (select daily_goal from profiles where id = p_user), false, true)
      on conflict (user_id, date) do update set shield_used = true;
    else
      v_current := 0;
      v_run := 0;
    end if;
  end loop;

  -- Today counts only once it is lit.
  if coalesce((select lit from days where user_id = p_user and date = v_today), false) then
    v_current := v_current + 1;
    v_best := greatest(v_best, v_current);
    v_last_lit := v_today;
    if v_run + 1 = 7 then
      v_shields := least(2, v_shields + 1);
    end if;
  end if;

  insert into streaks (user_id, current, best, shields, last_lit_date, updated_at)
  values (p_user, v_current, v_best, v_shields, v_last_lit, now())
  on conflict (user_id) do update set
    current = excluded.current,
    best = greatest(streaks.best, excluded.best), -- best is kept forever
    shields = excluded.shields,
    last_lit_date = excluded.last_lit_date,
    updated_at = now();
end;
$$;

-- Recompute one day's total from its entries, then the streak.
create function public.refresh_day(p_user uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_goal integer;
begin
  select coalesce(sum(amount), 0) into v_total from entries where user_id = p_user and salli_date = p_date;
  select coalesce(
    (select goal from days where user_id = p_user and date = p_date),
    (select daily_goal from profiles where id = p_user),
    1000
  ) into v_goal;

  insert into days (user_id, date, total, goal, lit, updated_at)
  values (p_user, p_date, v_total, v_goal, v_total >= v_goal and v_total > 0, now())
  on conflict (user_id, date) do update set
    total = excluded.total,
    lit = excluded.total >= days.goal and excluded.total > 0,
    updated_at = now();

  perform recompute_streak(p_user, greatest(p_date, (select max(date) from days where user_id = p_user)));
end;
$$;

create function public.entries_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_day(old.user_id, old.salli_date);
    return old;
  end if;
  perform refresh_day(new.user_id, new.salli_date);
  if tg_op = 'UPDATE' and old.salli_date <> new.salli_date then
    perform refresh_day(old.user_id, old.salli_date);
  end if;
  return new;
end;
$$;
create trigger entries_after_change after insert or update or delete on public.entries
  for each row execute function public.entries_changed();

-- Change the daily goal from today on (past days keep the goal they had).
create function public.set_daily_goal(p_goal integer, p_today date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_goal < 1 or p_goal > 100000 then
    raise exception 'goal out of range';
  end if;
  update profiles set daily_goal = p_goal where id = auth.uid();
  insert into days (user_id, date, total, goal, lit)
  values (auth.uid(), p_today, 0, p_goal, false)
  on conflict (user_id, date) do update set goal = p_goal, lit = days.total >= p_goal and days.total > 0;
  perform recompute_streak(auth.uid(), p_today);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Groups (UI arrives in the Groups step)
-- ─────────────────────────────────────────────────────────────────────────

create function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into groups (name, created_by) values (p_name, auth.uid()) returning * into g;
  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'owner');
  return g;
end;
$$;

create function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select * into g from groups where invite_code = upper(trim(p_code));
  if g.id is null then
    raise exception 'invite code not found';
  end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end;
$$;

-- Group total since a moment (e.g. the week's start) — only the total, never
-- per-member counts, so it is safe for every member to call.
create function public.group_total(p_group uuid, p_since timestamptz)
returns bigint language sql stable security definer set search_path = public as $$
  select case when is_group_member(p_group) then
    (select coalesce(sum(e.amount), 0) from entries e
     join group_members m on m.user_id = e.user_id and m.group_id = p_group
     where e.created_at >= p_since)
  else null end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.days enable row level security;
alter table public.streaks enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_events enable row level security;
alter table public.reactions enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_actions enable row level security;

-- profiles: your own row, plus names of people you share a group with.
create policy "profiles: read own and group members" on public.profiles
  for select to authenticated using (id = auth.uid() or shares_group_with(id));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- entries: only your own.
create policy "entries: read own" on public.entries
  for select to authenticated using (user_id = auth.uid());
create policy "entries: add own" on public.entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "entries: change own" on public.entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "entries: delete own" on public.entries
  for delete to authenticated using (user_id = auth.uid());

-- days: your own; a group member's only if they turned sharing on.
create policy "days: read own or shared" on public.days
  for select to authenticated using (
    user_id = auth.uid()
    or (shares_group_with(user_id)
        and exists (select 1 from profiles p where p.id = days.user_id and p.share_count_with_group))
  );
-- days are written by the server functions above, not directly by the app.

-- streaks: your own and your group members' (streaks are shared, counts aren't).
create policy "streaks: read own and group members" on public.streaks
  for select to authenticated using (user_id = auth.uid() or shares_group_with(user_id));

-- groups
create policy "groups: members read" on public.groups
  for select to authenticated using (is_group_member(id));
create policy "groups: owner updates" on public.groups
  for update to authenticated
  using (exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid() and m.role = 'owner'))
  with check (exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid() and m.role = 'owner'));
-- groups are created through create_group() and joined through join_group().

create policy "group_members: members read" on public.group_members
  for select to authenticated using (is_group_member(group_id));
create policy "group_members: leave" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

create policy "group_events: members read" on public.group_events
  for select to authenticated using (is_group_member(group_id));
create policy "group_events: members post own" on public.group_events
  for insert to authenticated with check (user_id = auth.uid() and is_group_member(group_id));

create policy "reactions: members read" on public.reactions
  for select to authenticated using (
    exists (select 1 from group_events e where e.id = event_id and is_group_member(e.group_id))
  );
create policy "reactions: members react" on public.reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from group_events e where e.id = event_id and is_group_member(e.group_id))
  );
create policy "reactions: remove own" on public.reactions
  for delete to authenticated using (user_id = auth.uid());

-- reminders: anyone may read published, verified cards.
create policy "reminders: read published and verified" on public.reminders
  for select to anon, authenticated using (published and verified_by is not null);

create policy "reminder_actions: own" on public.reminder_actions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Privileges (explicit, so the app works even where default grants are off)
-- ─────────────────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- profiles: telegram_user_id stays hidden from the app.
grant select (id, display_name, timezone, city, latitude, longitude, daily_goal, share_count_with_group, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, timezone, city, latitude, longitude, share_count_with_group) on public.profiles to authenticated;

grant select, insert, update, delete on public.entries to authenticated;
grant select on public.days, public.streaks, public.groups, public.group_members to authenticated;
grant update (name, weekly_goal, goal_ends_at) on public.groups to authenticated;
grant delete on public.group_members to authenticated;
grant select, insert on public.group_events to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant select on public.reminders to anon, authenticated;
grant select, insert, update, delete on public.reminder_actions to authenticated;

grant execute on function public.set_daily_goal(integer, date) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.group_total(uuid, timestamptz) to authenticated;
-- is_group_member / shares_group_with are used inside policies:
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime: live updates for counts (e.g. from the Telegram bot) and groups
-- ─────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.entries, public.days, public.streaks,
      public.group_events, public.reactions;
  end if;
end;
$$;
