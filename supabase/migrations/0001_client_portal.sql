-- =====================================================================
-- ERP VERS client portal: tables, access rules and automation
--
-- Run this once in your Supabase project: Dashboard -> SQL Editor ->
-- New query -> paste this whole file -> Run.
--
-- Who sees what (enforced by Postgres row level security, so a bug in
-- the website cannot leak data):
--   * Clients read only their own company's purchases, tasks and
--     APPROVED hours. They can never write anything.
--   * Freelancers read only the tasks you assign them (and the client's
--     name), log hours against those tasks, and see only their own
--     entries. They never see purchases or balances.
--   * Admins (ERP VERS) see and manage everything.
--   * A signed-in account that matches nothing sees nothing.
--   * Signed-out visitors can read nothing.
--
-- Automation:
--   * A client contact whose confirmed email matches a company's domain
--     (e.g. @acme-mfg.com), or an email you invited, is linked to that
--     company automatically. Same for invited freelancers.
--   * Freelancers cannot log more hours on a task than its estimate plus
--     approved change requests. Only admins set estimates.
--   * Freelancer hours wait for admin review before clients see them.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) between 1 and 120),
  low_balance_hours numeric(8,2) not null default 10 check (low_balance_hours >= 0),
  created_at        timestamptz not null default now()
);

-- People who can see a client's dashboard.
create table public.client_members (
  client_id  uuid not null references public.clients(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_id_idx on public.client_members (user_id);

-- Company email domains: confirmed accounts at this domain join the client automatically.
create table public.client_domains (
  domain     text primary key check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  client_id  uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Individual emails invited to a client (e.g. Gmail users, contractors).
create table public.client_invites (
  client_id  uuid not null references public.clients(id) on delete cascade,
  email      text not null check (email = lower(email) and email like '%_@_%'),
  created_at timestamptz not null default now(),
  primary key (client_id, email)
);

-- ERP VERS team members who can manage everything.
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- Freelancers who log hours. Deactivate instead of deleting to keep history.
create table public.freelancers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text not null check (length(trim(full_name)) between 1 and 120),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.freelancer_invites (
  email      text primary key check (email = lower(email) and email like '%_@_%'),
  full_name  text not null check (length(trim(full_name)) between 1 and 120),
  created_at timestamptz not null default now()
);

-- Prepaid hour blocks a client has bought.
create table public.hour_purchases (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  hours        numeric(8,2) not null check (hours > 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  purchased_on date not null default current_date,
  reference    text check (reference is null or length(reference) <= 120),
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index hour_purchases_client_idx on public.hour_purchases (client_id, purchased_on);

-- A requirement you estimate and hand to freelancers.
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  title          text not null check (length(trim(title)) between 1 and 160),
  description    text check (description is null or length(description) <= 2000),
  estimate_hours numeric(8,2) not null check (estimate_hours >= 0),
  status         text not null default 'open' check (status in ('open', 'done')),
  created_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index tasks_client_idx on public.tasks (client_id, created_at);

-- Extra hours added to a task after the client asks for changes.
create table public.change_requests (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 160),
  description  text check (description is null or length(description) <= 2000),
  hours        numeric(8,2) not null check (hours > 0),
  requested_on date not null default current_date,
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index change_requests_task_idx on public.change_requests (task_id);

create table public.task_assignments (
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references public.freelancers(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index task_assignments_user_idx on public.task_assignments (user_id);

-- Hours worked. Freelancer entries start as 'pending' until an admin reviews them.
create table public.time_entries (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  task_id           uuid references public.tasks(id) on delete restrict,
  change_request_id uuid references public.change_requests(id) on delete restrict,
  work_date         date not null,
  consultant        text not null check (length(trim(consultant)) between 1 and 120),
  description       text not null check (length(trim(description)) between 1 and 1000),
  hours             numeric(6,2) not null check (hours > 0 and hours <= 24),
  status            text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  review_note       text check (review_note is null or length(review_note) <= 500),
  reviewed_by       uuid references auth.users(id) on delete set null,
  reviewed_at       timestamptz,
  created_by        uuid default auth.uid() references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index time_entries_client_idx on public.time_entries (client_id, work_date desc);
create index time_entries_task_idx on public.time_entries (task_id);
create index time_entries_status_idx on public.time_entries (status) where status = 'pending';
create index time_entries_created_by_idx on public.time_entries (created_by);

-- ---------------------------------------------------------------------
-- Helper functions. They live in the "private" schema, which is not
-- exposed through the Supabase API, and run with a fixed search_path.
-- ---------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())); $$;

create or replace function private.is_member(p_client_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.client_members
                 where client_id = p_client_id and user_id = (select auth.uid()));
$$;

create or replace function private.is_freelancer()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.freelancers where user_id = (select auth.uid()) and active); $$;

-- Is the current user an active freelancer assigned to this task?
create or replace function private.is_assigned(p_task_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.task_assignments ta
    join public.freelancers f on f.user_id = ta.user_id and f.active
    where ta.task_id = p_task_id and ta.user_id = (select auth.uid())
  );
$$;

-- Does the current user (an active freelancer) have any task for this client?
create or replace function private.is_assigned_to_client(p_client_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.task_assignments ta
    join public.tasks t on t.id = ta.task_id
    join public.freelancers f on f.user_id = ta.user_id and f.active
    where t.client_id = p_client_id and ta.user_id = (select auth.uid())
  );
$$;

-- Personal mailbox providers can never be a company domain.
create or replace function private.is_public_email_domain(p_domain text)
returns boolean language sql immutable set search_path = ''
as $$
  select lower(p_domain) = any (array[
    'gmail.com','googlemail.com','yahoo.com','yahoo.co.in','yahoo.in','yahoo.co.uk','ymail.com','rocketmail.com',
    'outlook.com','outlook.in','hotmail.com','hotmail.co.uk','live.com','live.in','msn.com',
    'icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','pm.me',
    'zoho.com','zohomail.com','zohomail.in','rediffmail.com','gmx.com','gmx.net','mail.com',
    'yandex.com','yandex.ru','tutanota.com','tuta.io','fastmail.com','hey.com','qq.com','163.com'
  ]);
$$;

alter table public.client_domains
  add constraint client_domains_not_public check (not private.is_public_email_domain(domain));

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_member(uuid) from public, anon;
revoke all on function private.is_freelancer() from public, anon;
revoke all on function private.is_assigned(uuid) from public, anon;
revoke all on function private.is_assigned_to_client(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(), private.is_member(uuid), private.is_freelancer(),
  private.is_assigned(uuid), private.is_assigned_to_client(uuid), private.is_public_email_domain(text)
  to authenticated;

-- ---------------------------------------------------------------------
-- Automatic linking of new accounts
-- ---------------------------------------------------------------------

-- Link one confirmed account to everything it was invited to or matches.
create or replace function private.link_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_email     text;
  v_confirmed timestamptz;
  v_meta      jsonb;
begin
  select lower(email), email_confirmed_at, raw_user_meta_data
    into v_email, v_confirmed, v_meta
    from auth.users where id = p_user_id;

  -- Only a confirmed email proves the person owns the inbox.
  if v_email is null or v_confirmed is null then
    return;
  end if;

  -- Invited freelancer
  insert into public.freelancers (user_id, email, full_name)
    select p_user_id, v_email, fi.full_name
    from public.freelancer_invites fi where fi.email = v_email
    on conflict (user_id) do nothing;
  delete from public.freelancer_invites where email = v_email;

  -- Invited client contact
  insert into public.client_members (client_id, user_id, email)
    select ci.client_id, p_user_id, v_email
    from public.client_invites ci where ci.email = v_email
    on conflict do nothing;
  delete from public.client_invites where email = v_email;

  -- Company email domain
  insert into public.client_members (client_id, user_id, email)
    select cd.client_id, p_user_id, v_email
    from public.client_domains cd where cd.domain = split_part(v_email, '@', 2)
    on conflict do nothing;
end;
$$;
revoke all on function private.link_user(uuid) from public, anon, authenticated;

-- Runs when an account is created or confirms its email.
create or replace function public.handle_auth_user_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    perform private.link_user(new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.handle_auth_user_change() from public, anon, authenticated;

create trigger on_auth_user_change
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user_change();

-- Admin: link accounts that registered before their domain or invite was added.
create or replace function public.link_existing_users()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  if not private.is_admin() then
    return 0;
  end if;
  for r in
    select u.id from auth.users u
    where u.email_confirmed_at is not null
      and (
        exists (select 1 from public.freelancer_invites fi where fi.email = lower(u.email))
        or exists (select 1 from public.client_invites ci where ci.email = lower(u.email))
        or exists (select 1 from public.client_domains cd where cd.domain = split_part(lower(u.email), '@', 2))
      )
  loop
    perform private.link_user(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Admin: accounts that are not linked to anything yet.
create or replace function public.pending_registrations()
returns table (user_id uuid, email text, full_name text, company text, registered_at timestamptz, email_confirmed boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return;
  end if;
  return query
    select u.id, u.email::text,
           nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(trim(u.raw_user_meta_data ->> 'company'), ''),
           u.created_at, u.email_confirmed_at is not null
    from auth.users u
    where not exists (select 1 from public.admins a where a.user_id = u.id)
      and not exists (select 1 from public.client_members m where m.user_id = u.id)
      and not exists (select 1 from public.freelancers f where f.user_id = u.id)
    order by u.created_at desc;
end;
$$;

-- Admin: find a registered account by email.
create or replace function public.find_registered_user(p_email text)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return null;
  end if;
  return (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1);
end;
$$;

-- Admin: decline a registration (deletes an account that is linked to nothing).
create or replace function public.decline_registration(p_user_id uuid)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return false;
  end if;
  delete from auth.users u
  where u.id = p_user_id
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and not exists (select 1 from public.client_members m where m.user_id = u.id)
    and not exists (select 1 from public.freelancers f where f.user_id = u.id);
  return found;
end;
$$;

-- Estimate, change requests and hours per task, for tasks the caller may see.
-- Clients get approved hours only; admins and assigned freelancers also see pending.
create or replace function public.task_usage(p_client_id uuid default null)
returns table (task_id uuid, estimate_hours numeric, change_request_hours numeric, total_estimate numeric,
               approved_hours numeric, pending_hours numeric)
language sql stable security definer set search_path = ''
as $$
  select t.id,
         t.estimate_hours,
         coalesce(cr.hours, 0),
         t.estimate_hours + coalesce(cr.hours, 0),
         coalesce(te.approved, 0),
         case when private.is_admin() or private.is_assigned(t.id) then coalesce(te.pending, 0) else 0 end
  from public.tasks t
  left join lateral (select sum(c.hours) as hours from public.change_requests c where c.task_id = t.id) cr on true
  left join lateral (
    select sum(e.hours) filter (where e.status = 'approved') as approved,
           sum(e.hours) filter (where e.status = 'pending')  as pending
    from public.time_entries e where e.task_id = t.id
  ) te on true
  where (p_client_id is null or t.client_id = p_client_id)
    and (private.is_admin() or private.is_member(t.client_id) or private.is_assigned(t.id));
$$;

-- Keep-awake check used by the daily scheduled job. Returns nothing private.
create or replace function public.ping()
returns integer language sql stable set search_path = '' as $$ select 1; $$;

revoke all on function public.link_existing_users() from public, anon;
revoke all on function public.pending_registrations() from public, anon;
revoke all on function public.find_registered_user(text) from public, anon;
revoke all on function public.decline_registration(uuid) from public, anon;
revoke all on function public.task_usage(uuid) from public, anon;
grant execute on function public.link_existing_users(), public.pending_registrations(),
  public.find_registered_user(text), public.decline_registration(uuid), public.task_usage(uuid)
  to authenticated;
grant execute on function public.ping() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Rules on hours logged
-- ---------------------------------------------------------------------

create or replace function private.check_time_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_task      public.tasks%rowtype;
  v_total     numeric;
  v_used      numeric;
  v_is_admin  boolean := private.is_admin();
  v_name      text;
begin
  if new.task_id is not null then
    -- Lock the task so two entries logged at once can't both slip under the estimate.
    select * into v_task from public.tasks where id = new.task_id for update;
    new.client_id := v_task.client_id;
  end if;

  if new.change_request_id is not null and not exists (
    select 1 from public.change_requests where id = new.change_request_id and task_id = new.task_id
  ) then
    raise exception 'CHANGE_REQUEST_MISMATCH';
  end if;

  if v_is_admin then
    return new;
  end if;

  -- Everything below applies to freelancers.
  if new.task_id is null then
    raise exception 'TASK_REQUIRED';
  end if;
  if v_task.status <> 'open' then
    raise exception 'TASK_CLOSED';
  end if;

  select full_name into v_name from public.freelancers where user_id = (select auth.uid());
  new.consultant  := coalesce(v_name, new.consultant);
  new.created_by  := (select auth.uid());
  new.status      := 'pending';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;

  select v_task.estimate_hours + coalesce(sum(c.hours), 0) into v_total
    from public.change_requests c where c.task_id = new.task_id;
  select coalesce(sum(e.hours), 0) into v_used
    from public.time_entries e
    where e.task_id = new.task_id and e.status in ('pending', 'approved') and e.id <> new.id;

  if v_used + new.hours > v_total then
    raise exception 'ESTIMATE_EXCEEDED:%', greatest(v_total - v_used, 0);
  end if;

  return new;
end;
$$;

create trigger time_entries_check
  before insert or update on public.time_entries
  for each row execute function private.check_time_entry();

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table public.clients            enable row level security;
alter table public.client_members     enable row level security;
alter table public.client_domains     enable row level security;
alter table public.client_invites     enable row level security;
alter table public.admins             enable row level security;
alter table public.freelancers        enable row level security;
alter table public.freelancer_invites enable row level security;
alter table public.hour_purchases     enable row level security;
alter table public.tasks              enable row level security;
alter table public.change_requests    enable row level security;
alter table public.task_assignments   enable row level security;
alter table public.time_entries       enable row level security;

-- Signed-out visitors get no table access at all.
revoke all on public.clients, public.client_members, public.client_domains, public.client_invites,
              public.admins, public.freelancers, public.freelancer_invites, public.hour_purchases,
              public.tasks, public.change_requests, public.task_assignments, public.time_entries
  from anon;

-- Tables only admins touch: full access for admins, nothing for anyone else.
create policy "client_domains: admins only" on public.client_domains for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "client_invites: admins only" on public.client_invites for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "freelancer_invites: admins only" on public.freelancer_invites for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- clients: admins manage; members and assigned freelancers read
create policy "clients: read" on public.clients for select to authenticated
  using ((select private.is_admin()) or private.is_member(id) or private.is_assigned_to_client(id));
create policy "clients: admins insert" on public.clients for insert to authenticated
  with check ((select private.is_admin()));
create policy "clients: admins update" on public.clients for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "clients: admins delete" on public.clients for delete to authenticated
  using ((select private.is_admin()));

-- client_members: members see who else at their company has access
create policy "client_members: read" on public.client_members for select to authenticated
  using ((select private.is_admin()) or private.is_member(client_id));
create policy "client_members: admins insert" on public.client_members for insert to authenticated
  with check ((select private.is_admin()));
create policy "client_members: admins delete" on public.client_members for delete to authenticated
  using ((select private.is_admin()));

-- admins: each admin can confirm their own row; managed in SQL only
create policy "admins: read own row" on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- freelancers: admins manage; a freelancer can read their own row
create policy "freelancers: read" on public.freelancers for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy "freelancers: admins insert" on public.freelancers for insert to authenticated
  with check ((select private.is_admin()));
create policy "freelancers: admins update" on public.freelancers for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "freelancers: admins delete" on public.freelancers for delete to authenticated
  using ((select private.is_admin()));

-- hour_purchases: clients and admins only (freelancers never see money)
create policy "hour_purchases: read" on public.hour_purchases for select to authenticated
  using ((select private.is_admin()) or private.is_member(client_id));
create policy "hour_purchases: admins insert" on public.hour_purchases for insert to authenticated
  with check ((select private.is_admin()));
create policy "hour_purchases: admins update" on public.hour_purchases for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "hour_purchases: admins delete" on public.hour_purchases for delete to authenticated
  using ((select private.is_admin()));

-- tasks: only admins create or change them (so only admins set estimates)
create policy "tasks: read" on public.tasks for select to authenticated
  using ((select private.is_admin()) or private.is_member(client_id) or private.is_assigned(id));
create policy "tasks: admins insert" on public.tasks for insert to authenticated
  with check ((select private.is_admin()));
create policy "tasks: admins update" on public.tasks for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "tasks: admins delete" on public.tasks for delete to authenticated
  using ((select private.is_admin()));

-- change_requests: only admins add hours to a task
create policy "change_requests: read" on public.change_requests for select to authenticated
  using ((select private.is_admin()) or private.is_assigned(task_id)
         or exists (select 1 from public.tasks t where t.id = task_id and private.is_member(t.client_id)));
create policy "change_requests: admins insert" on public.change_requests for insert to authenticated
  with check ((select private.is_admin()));
create policy "change_requests: admins update" on public.change_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "change_requests: admins delete" on public.change_requests for delete to authenticated
  using ((select private.is_admin()));

-- task_assignments: a freelancer sees their own assignments
create policy "task_assignments: read" on public.task_assignments for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy "task_assignments: admins insert" on public.task_assignments for insert to authenticated
  with check ((select private.is_admin()));
create policy "task_assignments: admins delete" on public.task_assignments for delete to authenticated
  using ((select private.is_admin()));

-- time_entries
--   admins: everything
--   clients: approved entries for their company
--   freelancers: their own entries; may log on assigned tasks and delete their own pending entries
create policy "time_entries: read" on public.time_entries for select to authenticated
  using (
    (select private.is_admin())
    or (status = 'approved' and private.is_member(client_id))
    or (created_by = (select auth.uid()) and (select private.is_freelancer()))
  );
create policy "time_entries: admins insert" on public.time_entries for insert to authenticated
  with check ((select private.is_admin()));
create policy "time_entries: freelancers log on assigned tasks" on public.time_entries for insert to authenticated
  with check (
    (select private.is_freelancer())
    and task_id is not null and private.is_assigned(task_id)
    and created_by = (select auth.uid()) and status = 'pending'
  );
create policy "time_entries: admins update" on public.time_entries for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "time_entries: admins delete" on public.time_entries for delete to authenticated
  using ((select private.is_admin()));
create policy "time_entries: freelancers delete own pending" on public.time_entries for delete to authenticated
  using (created_by = (select auth.uid()) and status = 'pending' and (select private.is_freelancer()));
