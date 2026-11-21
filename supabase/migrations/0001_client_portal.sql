-- =====================================================================
-- ERP VERS client portal: tables and row level security
--
-- Run this once in your Supabase project: Dashboard -> SQL Editor ->
-- New query -> paste this whole file -> Run.
--
-- Privacy model
--   * Every table has row level security (RLS) switched on.
--   * A signed-in client can only read rows that belong to a company
--     they have been added to. This is enforced by Postgres itself, so a
--     bug in the website cannot show one client another client's data.
--   * Clients can never write anything. Only ERP VERS admins can add
--     clients, record purchases and log hours.
--   * Anyone can register an account, but a new account sees nothing until
--     an admin approves it by linking it to a client company.
--   * Visitors who are not signed in can read nothing.
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

-- People (sign-in accounts) who can see a client's dashboard.
create table public.client_members (
  client_id  uuid not null references public.clients(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_id_idx on public.client_members (user_id);

-- ERP VERS team members who can manage every client.
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
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

-- Hours worked for a client.
create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  work_date   date not null,
  consultant  text not null check (length(trim(consultant)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 1000),
  hours       numeric(6,2) not null check (hours > 0 and hours <= 24),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index time_entries_client_idx on public.time_entries (client_id, work_date desc);

-- ---------------------------------------------------------------------
-- Helper functions. They live in the "private" schema, which is not
-- exposed through the Supabase API, and run with a fixed search_path.
-- ---------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create or replace function private.is_member(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_members
    where client_id = p_client_id and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Admin-only functions for registrations. Each one checks the caller is
-- an admin first; for anyone else they return nothing / do nothing.
-- ---------------------------------------------------------------------

-- Accounts that have registered but are not yet linked to any client.
create or replace function public.pending_registrations()
returns table (
  user_id uuid,
  email text,
  full_name text,
  company text,
  registered_at timestamptz,
  email_confirmed boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return;
  end if;
  return query
    select u.id,
           u.email::text,
           nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(trim(u.raw_user_meta_data ->> 'company'), ''),
           u.created_at,
           u.email_confirmed_at is not null
    from auth.users u
    where not exists (select 1 from public.admins a where a.user_id = u.id)
      and not exists (select 1 from public.client_members m where m.user_id = u.id)
    order by u.created_at desc;
end;
$$;

-- Find a registered account by email, so an admin can give it access.
create or replace function public.find_registered_user(p_email text)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return null;
  end if;
  return (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1);
end;
$$;

-- Decline a registration: deletes the account. Only works on accounts that
-- are not admins and have not been linked to any client.
create or replace function public.decline_registration(p_user_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    return false;
  end if;
  delete from auth.users u
  where u.id = p_user_id
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and not exists (select 1 from public.client_members m where m.user_id = u.id);
  return found;
end;
$$;

revoke all on function public.pending_registrations() from public, anon;
revoke all on function public.find_registered_user(text) from public, anon;
revoke all on function public.decline_registration(uuid) from public, anon;
grant execute on function public.pending_registrations() to authenticated;
grant execute on function public.find_registered_user(text) to authenticated;
grant execute on function public.decline_registration(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table public.clients        enable row level security;
alter table public.client_members enable row level security;
alter table public.admins         enable row level security;
alter table public.hour_purchases enable row level security;
alter table public.time_entries   enable row level security;

-- Signed-out visitors get no table access at all.
revoke all on public.clients, public.client_members, public.admins,
              public.hour_purchases, public.time_entries from anon;

-- clients
create policy "clients: members and admins can read"
  on public.clients for select to authenticated
  using ((select private.is_admin()) or (select private.is_member(id)));
create policy "clients: admins can insert"
  on public.clients for insert to authenticated
  with check ((select private.is_admin()));
create policy "clients: admins can update"
  on public.clients for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "clients: admins can delete"
  on public.clients for delete to authenticated
  using ((select private.is_admin()));

-- client_members (members can see who else at their company has access)
create policy "client_members: members and admins can read"
  on public.client_members for select to authenticated
  using ((select private.is_admin()) or (select private.is_member(client_id)));
create policy "client_members: admins can insert"
  on public.client_members for insert to authenticated
  with check ((select private.is_admin()));
create policy "client_members: admins can delete"
  on public.client_members for delete to authenticated
  using ((select private.is_admin()));

-- admins (each admin can only confirm their own row; managed in SQL only)
create policy "admins: read own row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- hour_purchases
create policy "hour_purchases: members and admins can read"
  on public.hour_purchases for select to authenticated
  using ((select private.is_admin()) or (select private.is_member(client_id)));
create policy "hour_purchases: admins can insert"
  on public.hour_purchases for insert to authenticated
  with check ((select private.is_admin()));
create policy "hour_purchases: admins can update"
  on public.hour_purchases for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "hour_purchases: admins can delete"
  on public.hour_purchases for delete to authenticated
  using ((select private.is_admin()));

-- time_entries
create policy "time_entries: members and admins can read"
  on public.time_entries for select to authenticated
  using ((select private.is_admin()) or (select private.is_member(client_id)));
create policy "time_entries: admins can insert"
  on public.time_entries for insert to authenticated
  with check ((select private.is_admin()));
create policy "time_entries: admins can update"
  on public.time_entries for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "time_entries: admins can delete"
  on public.time_entries for delete to authenticated
  using ((select private.is_admin()));
