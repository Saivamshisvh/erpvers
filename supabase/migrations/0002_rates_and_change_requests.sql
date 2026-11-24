-- =====================================================================
-- ERP VERS client portal, part 2: rates, money and change-request approval
--
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Safe to run on the database created by 0001_client_portal.sql.
--
-- Money (who sees what, enforced by row level security):
--   * client_rates (currency, hourly rate, INR exchange rate): admins only.
--   * hour_purchases.hourly_rate/currency: admins and that client (what they paid).
--   * freelancers.default_rate_inr and task_assignments.hourly_rate_inr:
--     admins, and each freelancer for their own rows only. Clients never.
--
-- Change requests (extra hours on a task):
--   requested       a freelancer asked for extra hours (only admins and the
--                   assigned freelancers see it)
--   pending_client  ERP VERS approved it and sent it to the client
--   approved        the client approved it (or ERP VERS marked it approved);
--                   only now does the task's hour limit grow
--   rejected        ERP VERS declined it (review_note says why)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Rates
-- ---------------------------------------------------------------------

create table public.client_rates (
  client_id    uuid primary key references public.clients(id) on delete cascade,
  currency     text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  hourly_rate  numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
  -- How many INR one unit of the client's currency is worth, for margin in INR.
  inr_per_unit numeric(12,4) check (inr_per_unit is null or inr_per_unit > 0),
  updated_at   timestamptz not null default now()
);
alter table public.client_rates enable row level security;
revoke all on public.client_rates from anon;
grant select, insert, update, delete on public.client_rates to authenticated;
create policy "client_rates: admins only" on public.client_rates for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- The rate at the time of each purchase, so later rate changes don't rewrite history.
alter table public.hour_purchases
  add column hourly_rate numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
  add column currency    text check (currency is null or currency ~ '^[A-Z]{3}$');

alter table public.freelancers
  add column default_rate_inr numeric(10,2) check (default_rate_inr is null or default_rate_inr >= 0);

alter table public.task_assignments
  add column hourly_rate_inr numeric(10,2) check (hourly_rate_inr is null or hourly_rate_inr >= 0);
create policy "task_assignments: admins update" on public.task_assignments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- Change request approval
-- ---------------------------------------------------------------------

alter table public.change_requests
  add column status text not null default 'pending_client'
    check (status in ('requested', 'pending_client', 'approved', 'rejected')),
  add column requested_by       uuid references auth.users(id) on delete set null,
  add column requested_by_name  text check (requested_by_name is null or length(requested_by_name) <= 120),
  add column review_note        text check (review_note is null or length(review_note) <= 500),
  add column reviewed_by        uuid references auth.users(id) on delete set null,
  add column reviewed_at        timestamptz,
  add column client_notified_at timestamptz,
  add column client_approved_by uuid references auth.users(id) on delete set null,
  add column client_approved_at timestamptz;

-- Change requests that existed before this migration were already in effect.
update public.change_requests set status = 'approved';

create index change_requests_status_idx on public.change_requests (status) where status in ('requested', 'pending_client');

create or replace function private.check_change_request()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_name text;
begin
  if private.is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- The only non-admin update is a client approving through
    -- client_approve_change_requests(): pending_client -> approved, nothing else.
    select * into v_task from public.tasks where id = old.task_id;
    if not (old.status = 'pending_client' and new.status = 'approved'
            and private.is_member(v_task.client_id)
            and new.task_id = old.task_id and new.hours = old.hours and new.title = old.title
            and new.description is not distinct from old.description
            and new.client_approved_by = (select auth.uid())) then
      raise exception 'NOT_ALLOWED';
    end if;
    return new;
  end if;

  -- Insert by a freelancer: always a request waiting for ERP VERS.
  select * into v_task from public.tasks where id = new.task_id;
  if not found or not private.is_assigned(new.task_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if v_task.status <> 'open' then
    raise exception 'TASK_CLOSED';
  end if;
  select full_name into v_name from public.freelancers where user_id = (select auth.uid());
  new.status             := 'requested';
  new.requested_by       := (select auth.uid());
  new.requested_by_name  := v_name;
  new.created_by         := (select auth.uid());
  new.requested_on       := current_date;
  new.review_note        := null;
  new.reviewed_by        := null;
  new.reviewed_at        := null;
  new.client_notified_at := null;
  new.client_approved_by := null;
  new.client_approved_at := null;
  return new;
end;
$$;
revoke all on function private.check_change_request() from public, anon, authenticated;

create trigger change_requests_check
  before insert or update on public.change_requests
  for each row execute function private.check_change_request();

-- Clients see change requests only once ERP VERS has sent them.
drop policy "change_requests: read" on public.change_requests;
create policy "change_requests: read" on public.change_requests for select to authenticated
  using ((select private.is_admin()) or private.is_assigned(task_id)
         or (status in ('pending_client', 'approved')
             and exists (select 1 from public.tasks t where t.id = task_id and private.is_member(t.client_id))));

create policy "change_requests: freelancers request" on public.change_requests for insert to authenticated
  with check ((select private.is_freelancer()) and private.is_assigned(task_id)
              and status = 'requested' and requested_by = (select auth.uid()));

-- Hours: only approved change requests raise the limit.
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
  if tg_op = 'UPDATE' and not v_is_admin then
    if not (old.status = 'awaiting_client' and new.status = 'approved'
            and private.is_member(old.client_id)
            and new.hours = old.hours and new.client_id = old.client_id
            and new.task_id is not distinct from old.task_id
            and new.change_request_id is not distinct from old.change_request_id
            and new.work_date = old.work_date and new.description = old.description
            and new.consultant = old.consultant
            and new.client_approved_by = (select auth.uid())) then
      raise exception 'NOT_ALLOWED';
    end if;
    return new;
  end if;

  if new.task_id is not null then
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

  if new.task_id is null then
    raise exception 'TASK_REQUIRED';
  end if;
  if v_task.status <> 'open' then
    raise exception 'TASK_CLOSED';
  end if;
  if new.change_request_id is not null and not exists (
    select 1 from public.change_requests where id = new.change_request_id and status = 'approved'
  ) then
    raise exception 'CHANGE_REQUEST_NOT_APPROVED';
  end if;

  select full_name into v_name from public.freelancers where user_id = (select auth.uid());
  new.consultant  := coalesce(v_name, new.consultant);
  new.created_by  := (select auth.uid());
  new.status      := 'pending';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.client_notified_at := null;
  new.client_approved_by := null;
  new.client_approved_at := null;

  select v_task.estimate_hours + coalesce(sum(c.hours), 0) into v_total
    from public.change_requests c where c.task_id = new.task_id and c.status = 'approved';
  select coalesce(sum(e.hours), 0) into v_used
    from public.time_entries e
    where e.task_id = new.task_id and e.status in ('pending', 'awaiting_client', 'approved') and e.id <> new.id;

  if v_used + new.hours > v_total then
    raise exception 'ESTIMATE_EXCEEDED:%', greatest(v_total - v_used, 0);
  end if;

  return new;
end;
$$;

-- task_usage: approved change requests count; waiting ones are reported separately.
drop function public.task_usage(uuid);
create function public.task_usage(p_client_id uuid default null)
returns table (task_id uuid, estimate_hours numeric, change_request_hours numeric, total_estimate numeric,
               reviewed_hours numeric, pending_hours numeric, waiting_change_hours numeric)
language sql stable security definer set search_path = ''
as $$
  select t.id,
         t.estimate_hours,
         coalesce(cr.approved, 0),
         t.estimate_hours + coalesce(cr.approved, 0),
         coalesce(te.reviewed, 0),
         case when private.is_admin() or private.is_assigned(t.id) then coalesce(te.pending, 0) else 0 end,
         case when private.is_admin() or private.is_assigned(t.id)
              then coalesce(cr.requested, 0) + coalesce(cr.with_client, 0)
              else coalesce(cr.with_client, 0) end
  from public.tasks t
  left join lateral (
    select sum(c.hours) filter (where c.status = 'approved')       as approved,
           sum(c.hours) filter (where c.status = 'pending_client') as with_client,
           sum(c.hours) filter (where c.status = 'requested')      as requested
    from public.change_requests c where c.task_id = t.id
  ) cr on true
  left join lateral (
    select sum(e.hours) filter (where e.status in ('awaiting_client', 'approved')) as reviewed,
           sum(e.hours) filter (where e.status = 'pending')  as pending
    from public.time_entries e where e.task_id = t.id
  ) te on true
  where (p_client_id is null or t.client_id = p_client_id)
    and (private.is_admin() or private.is_member(t.client_id) or private.is_assigned(t.id));
$$;
revoke all on function public.task_usage(uuid) from public, anon;
grant execute on function public.task_usage(uuid) to authenticated;

-- Client: approve change requests ERP VERS has sent. Approve only.
-- Pass ids, or null to approve everything waiting for that client.
create or replace function public.client_approve_change_requests(p_client_id uuid, p_ids uuid[] default null)
returns integer language plpgsql volatile security definer set search_path = ''
as $$
declare
  n       integer;
  v_tasks uuid[];
begin
  if not private.is_member(p_client_id) then
    return 0;
  end if;
  with done as (
    update public.change_requests c
       set status = 'approved',
           client_approved_by = (select auth.uid()),
           client_approved_at = now()
      from public.tasks t
     where t.id = c.task_id
       and t.client_id = p_client_id
       and c.status = 'pending_client'
       and (p_ids is null or c.id = any (p_ids))
    returning c.task_id
  )
  select count(*), array_agg(distinct task_id) into n, v_tasks from done;
  -- Re-open finished tasks so the extra work can be logged.
  if n > 0 then
    update public.tasks set status = 'open' where id = any (v_tasks) and status <> 'open';
  end if;
  return n;
end;
$$;
revoke all on function public.client_approve_change_requests(uuid, uuid[]) from public, anon;
grant execute on function public.client_approve_change_requests(uuid, uuid[]) to authenticated;

commit;
