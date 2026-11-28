-- Salli — community requests (run once, after the first two setup files).
--
-- Anyone signed in can ask for salawat for a need ("for my father's
-- recovery", goal 10,000); anyone can add to it. Kept safe:
--  - a new request is 'pending' until an admin approves it;
--  - no links, emails or phone numbers in requests; short text only;
--  - at most 2 open requests per person;
--  - three reports hide a request until an admin looks again;
--  - posted anonymously unless the author chooses to show their name.
-- Contributions also count as the contributor's own salawat (entries with
-- source 'community'), so they light lanterns and grow streaks.

-- Admins ----------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
create policy "app_admins: see yourself" on public.app_admins
  for select to authenticated using (user_id = auth.uid());
grant select on public.app_admins to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

-- Requests --------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  note text not null default '' check (char_length(note) <= 200),
  goal integer not null check (goal between 100 and 1000000),
  total bigint not null default 0,
  contributors integer not null default 0,
  anonymous boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'hidden', 'completed')),
  ends_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index requests_status on public.requests (status, created_at desc);
create index requests_user on public.requests (user_id);

create table public.request_contributions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount integer not null check (amount between 1 and 10000),
  created_at timestamptz not null default now()
);
create index request_contributions_request on public.request_contributions (request_id);
create index request_contributions_user on public.request_contributions (user_id, created_at desc);

create table public.request_reports (
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

-- Contributions count as your own salawat too.
alter table public.entries drop constraint if exists entries_source_check;
alter table public.entries
  add constraint entries_source_check check (source in ('tap', 'quick', 'pad', 'reminder', 'telegram', 'community'));

-- New requests: checked and always start as pending ------------------------
create or replace function public.check_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  open_count integer;
  txt text := lower(new.title || ' ' || coalesce(new.note, ''));
begin
  new.title := trim(new.title);
  new.note := trim(coalesce(new.note, ''));
  new.user_id := auth.uid();
  new.status := 'pending';
  new.total := 0;
  new.contributors := 0;
  new.completed_at := null;
  if new.ends_at > now() + interval '30 days' then
    new.ends_at := now() + interval '30 days';
  end if;
  if new.ends_at < now() + interval '1 day' then
    new.ends_at := now() + interval '1 day';
  end if;
  -- No links, emails or phone numbers (keeps people safe and the feed clean).
  if txt ~ '(https?://|www\.|\.com|\.net|\.org|@[a-z0-9]|[0-9][0-9 ().-]{7,}[0-9])' then
    raise exception 'Please leave out links, emails and phone numbers.';
  end if;
  select count(*) into open_count from requests
    where user_id = auth.uid() and status in ('pending', 'approved') and ends_at > now();
  if open_count >= 2 then
    raise exception 'You already have 2 open requests. Wait for one to finish first.';
  end if;
  return new;
end;
$$;
create trigger requests_check before insert on public.requests
  for each row execute function public.check_request();

-- Contributing ------------------------------------------------------------------
create or replace function public.contribute(p_request uuid, p_amount integer)
returns public.requests language plpgsql security definer set search_path = public as $$
declare
  r requests;
  first_time boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_amount < 1 or p_amount > 10000 then
    raise exception 'amount out of range';
  end if;
  select * into r from requests where id = p_request for update;
  if r.id is null or r.status not in ('approved', 'completed') or r.ends_at < now() then
    raise exception 'This request is not open.';
  end if;
  first_time := not exists (select 1 from request_contributions where request_id = p_request and user_id = auth.uid());
  insert into request_contributions (request_id, user_id, amount) values (p_request, auth.uid(), p_amount);
  update requests set
    total = total + p_amount,
    contributors = contributors + case when first_time then 1 else 0 end,
    status = case when status = 'approved' and total + p_amount >= goal then 'completed' else status end,
    completed_at = case when completed_at is null and total + p_amount >= goal then now() else completed_at end
  where id = p_request
  returning * into r;
  return r;
end;
$$;

-- Reporting: three reports hide a request until an admin looks at it.
create or replace function public.report_request(p_request uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into request_reports (request_id, user_id, reason) values (p_request, auth.uid(), left(coalesce(p_reason, ''), 200))
    on conflict do nothing;
  select count(*) into n from request_reports where request_id = p_request;
  if n >= 3 then
    update requests set status = 'hidden' where id = p_request and status in ('approved', 'completed');
  end if;
end;
$$;

-- Moderation (admins only).
create or replace function public.moderate_request(p_request uuid, p_approve boolean)
returns public.requests language plpgsql security definer set search_path = public as $$
declare
  r requests;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  update requests set
    status = case when p_approve then (case when total >= goal then 'completed' else 'approved' end) else 'declined' end,
    -- an approval starts the clock again so the request gets its full time
    ends_at = case when p_approve and status = 'pending' then now() + (ends_at - created_at) else ends_at end
  where id = p_request
  returning * into r;
  if p_approve then
    delete from request_reports where request_id = p_request;
  end if;
  return r;
end;
$$;

-- The feed: open and recently completed requests, with the author's name
-- only when they chose to show it, and how much you gave.
create or replace function public.community_feed(p_limit integer default 50)
returns table (
  id uuid, title text, note text, goal integer, total bigint, contributors integer,
  author text, status text, ends_at timestamptz, created_at timestamptz, completed_at timestamptz,
  mine boolean, my_total bigint
) language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.note, r.goal, r.total, r.contributors,
    case when r.anonymous then null else nullif(p.display_name, '') end,
    r.status, r.ends_at, r.created_at, r.completed_at,
    r.user_id = auth.uid(),
    coalesce((select sum(c.amount) from request_contributions c where c.request_id = r.id and c.user_id = auth.uid()), 0)
  from requests r
  left join profiles p on p.id = r.user_id
  where (r.status = 'approved' and r.ends_at > now())
     or (r.status = 'completed' and r.completed_at > now() - interval '3 days')
     or (r.user_id = auth.uid() and r.status in ('pending', 'approved', 'completed', 'declined') and r.created_at > now() - interval '30 days')
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Admin review queue: pending and hidden requests.
create or replace function public.review_queue()
returns table (id uuid, title text, note text, goal integer, status text, author text, reports bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.note, r.goal, r.status, nullif(p.display_name, ''),
    (select count(*) from request_reports x where x.request_id = r.id), r.created_at
  from requests r left join profiles p on p.id = r.user_id
  where is_admin() and r.status in ('pending', 'hidden')
  order by r.created_at;
$$;

-- Requests you gave to that reached their goal (for the "goal reached" note).
create or replace function public.my_completed_since(p_since timestamptz)
returns table (id uuid, title text, goal integer, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct r.id, r.title, r.goal, r.completed_at
  from requests r join request_contributions c on c.request_id = r.id and c.user_id = auth.uid()
  where r.completed_at > p_since;
$$;

-- Row-level security -------------------------------------------------------------
alter table public.requests enable row level security;
alter table public.request_contributions enable row level security;
alter table public.request_reports enable row level security;

create policy "requests: read open, own, or as admin" on public.requests
  for select to anon, authenticated using (
    status in ('approved', 'completed') or user_id = auth.uid() or is_admin()
  );
create policy "requests: ask" on public.requests
  for insert to authenticated with check (user_id = auth.uid());
create policy "requests: withdraw own" on public.requests
  for delete to authenticated using (user_id = auth.uid());

create policy "request_contributions: own" on public.request_contributions
  for select to authenticated using (user_id = auth.uid());
create policy "request_reports: own" on public.request_reports
  for select to authenticated using (user_id = auth.uid());

grant select (id, title, note, goal, total, contributors, status, ends_at, created_at, completed_at) on public.requests to anon;
grant select, delete on public.requests to authenticated;
grant insert (title, note, goal, anonymous, ends_at) on public.requests to authenticated;
grant select on public.request_contributions, public.request_reports to authenticated;

revoke execute on function public.contribute(uuid, integer), public.report_request(uuid, text), public.moderate_request(uuid, boolean),
  public.community_feed(integer), public.review_queue(), public.my_completed_since(timestamptz), public.is_admin(),
  public.check_request() from public, anon;
grant execute on function public.contribute(uuid, integer), public.report_request(uuid, text), public.moderate_request(uuid, boolean),
  public.review_queue(), public.my_completed_since(timestamptz) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.community_feed(integer) to anon, authenticated;

-- Realtime: progress bars move live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.requests;
  end if;
end;
$$;

-- Make yourself the admin (run once after you have signed in to the app with
-- this email; replace it with yours):
-- insert into public.app_admins (user_id) select id from auth.users where email = 'you@example.com';
