-- Salli — live groups (run once, after the first setup file).
--
-- Adds what the Groups tab needs:
--  - group_board(): the leaderboard in one call — each member's name, streak,
--    days lit this week, whether they lit today, and their week's count only
--    if they share it (never otherwise);
--  - activity kinds for lighting a lantern, reaching a milestone and a nudge
--    (a nudge names who it is for);
--  - reactions use 'mashallah' to match the app;
--  - leave_group() hands the group to the next member if the owner leaves.

-- Activity kinds -----------------------------------------------------------
alter table public.group_events drop constraint if exists group_events_kind_check;
alter table public.group_events
  add constraint group_events_kind_check
  check (kind in ('logged', 'streak', 'goal_passed', 'lit', 'milestone', 'nudge', 'joined'));
alter table public.group_events add column if not exists target_user uuid references auth.users (id) on delete cascade;
create index if not exists group_events_target on public.group_events (target_user, created_at desc);

-- A nudge must be for another member of the same group, at most one per
-- sender, person and day (gentle, never spam).
create or replace function public.check_nudge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'nudge' then
    if new.target_user is null or new.target_user = new.user_id
       or not exists (select 1 from group_members where group_id = new.group_id and user_id = new.target_user) then
      raise exception 'nudge must be for another member of this group';
    end if;
    if exists (select 1 from group_events
               where kind = 'nudge' and user_id = new.user_id and target_user = new.target_user
                 and created_at > now() - interval '20 hours') then
      raise exception 'already nudged today';
    end if;
  elsif new.target_user is not null then
    raise exception 'only nudges have a target';
  end if;
  return new;
end;
$$;
drop trigger if exists group_events_check_nudge on public.group_events;
create trigger group_events_check_nudge before insert on public.group_events
  for each row execute function public.check_nudge();

grant insert (group_id, kind, value, target_user) on public.group_events to authenticated;

-- Reactions: 'mashallah' -----------------------------------------------------
alter table public.reactions drop constraint if exists reactions_kind_check;
update public.reactions set kind = 'mashallah' where kind = 'mashaallah';
alter table public.reactions add constraint reactions_kind_check check (kind in ('ameen', 'mashallah'));

-- The leaderboard -------------------------------------------------------------
-- p_week_start / p_today are the member's Salli dates (Saturday of the
-- Jumu'ah week and today), sent by the app. Counts only appear for members
-- who share them (and always for yourself).
create or replace function public.group_board(p_group uuid, p_week_start date, p_today date)
returns table (
  user_id uuid,
  display_name text,
  role text,
  streak integer,
  lit_days integer,
  lit_today boolean,
  week_total bigint,
  shares boolean
) language sql stable security definer set search_path = public as $$
  select
    m.user_id,
    coalesce(nullif(p.display_name, ''), 'Member') as display_name,
    m.role,
    coalesce(s.current, 0) as streak,
    (select count(*)::int from days d where d.user_id = m.user_id and d.date between p_week_start and p_today and d.lit) as lit_days,
    coalesce((select d.lit from days d where d.user_id = m.user_id and d.date = p_today), false) as lit_today,
    case when m.user_id = auth.uid() or p.share_count_with_group
      then (select coalesce(sum(d.total), 0) from days d where d.user_id = m.user_id and d.date between p_week_start and p_today)
      else null end as week_total,
    coalesce(p.share_count_with_group, false) as shares
  from group_members m
  left join profiles p on p.id = m.user_id
  left join streaks s on s.user_id = m.user_id
  where m.group_id = p_group and is_group_member(p_group);
$$;

-- The week's group total by Salli date (all members, shared or not — it is
-- only ever a total).
create or replace function public.group_week_total(p_group uuid, p_week_start date, p_today date)
returns bigint language sql stable security definer set search_path = public as $$
  select case when is_group_member(p_group) then
    (select coalesce(sum(d.total), 0) from days d
     join group_members m on m.user_id = d.user_id and m.group_id = p_group
     where d.date between p_week_start and p_today)
  else null end;
$$;

-- Leaving: if the owner leaves, the longest-standing member becomes owner;
-- the last one out deletes the group.
create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  was_owner boolean;
  heir uuid;
begin
  select role = 'owner' into was_owner from group_members where group_id = p_group and user_id = auth.uid();
  if was_owner is null then
    return;
  end if;
  delete from group_members where group_id = p_group and user_id = auth.uid();
  if was_owner then
    select user_id into heir from group_members where group_id = p_group order by joined_at limit 1;
    if heir is null then
      delete from groups where id = p_group;
    else
      update group_members set role = 'owner' where group_id = p_group and user_id = heir;
    end if;
  end if;
end;
$$;

-- Joining posts a "joined" event so the group sees who arrived.
create or replace function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  g groups;
  added integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select * into g from groups where invite_code = upper(trim(p_code));
  if g.id is null then
    raise exception 'invite code not found';
  end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    insert into group_events (group_id, user_id, kind) values (g.id, auth.uid(), 'joined');
  end if;
  return g;
end;
$$;

revoke execute on function public.group_board(uuid, date, date) from public, anon;
revoke execute on function public.group_week_total(uuid, date, date) from public, anon;
revoke execute on function public.leave_group(uuid) from public, anon;
revoke execute on function public.check_nudge() from public, anon, authenticated;
grant execute on function public.group_board(uuid, date, date) to authenticated;
grant execute on function public.group_week_total(uuid, date, date) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.join_group(text) to authenticated;

-- Realtime for membership changes too (new members appear live).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'group_members') then
    alter publication supabase_realtime add table public.group_members;
  end if;
end;
$$;
