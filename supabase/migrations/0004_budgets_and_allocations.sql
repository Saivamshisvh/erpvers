-- =====================================================================
-- ERP VERS client portal, part 4: client-approved budgets, hours per
-- freelancer, and profit after TDS
--
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Safe to run on the database created by 0001, 0002 and 0003.
--
-- Budgets: each task's estimate is a budget the client approves.
--   draft           ERP VERS is still preparing it (the client can't see it)
--   pending_client  sent to the client to approve
--   approved        the client approved it (or ERP VERS recorded that they
--                   agreed on a call). Only now can freelancers log hours.
--   Extra budget later comes from change requests the client approves.
--
-- Hours per freelancer: task_assignments.allocated_hours is how many of the
-- task's hours each freelancer gets. A freelancer can't log more than that.
-- Whatever ERP VERS doesn't hand out stays as its reserve.
--
-- Hour requests: a freelancer who needs more asks ERP VERS (only ERP VERS
-- and that freelancer see it). ERP VERS gives hours from its reserve, or
-- asks the client for more with a change request first.
--
-- Logged hours: once ERP VERS approves them they are final and show in the
-- client's work log; the client approves the budget, not each entry.
--
-- Money: client_rates.tds_pct (tax deducted at source, e.g. 10) and
-- client_rates.billing_basis ('budget': the client pays for the approved
-- budget; 'logged': the client pays for hours logged). Admins only.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Budgets the client approves
-- ---------------------------------------------------------------------

alter table public.tasks
  add column budget_status text not null default 'draft'
    check (budget_status in ('draft', 'pending_client', 'approved')),
  add column budget_notified_at timestamptz,
  add column budget_approved_by uuid references auth.users(id) on delete set null,
  add column budget_approved_at timestamptz;

-- Tasks that already exist are already agreed with the client.
update public.tasks set budget_status = 'approved', budget_approved_at = now();

-- Clients see a task once its budget has been sent to them.
drop policy "tasks: read" on public.tasks;
create policy "tasks: read" on public.tasks for select to authenticated
  using ((select private.is_admin())
         or (budget_status <> 'draft' and private.is_member(client_id))
         or private.is_assigned(id));

-- Client: approve budgets ERP VERS has sent. Approve only.
-- Pass ids, or null to approve everything waiting for that client.
create function public.client_approve_budgets(p_client_id uuid, p_ids uuid[] default null)
returns integer language plpgsql volatile security definer set search_path = ''
as $$
declare
  n integer;
begin
  if not private.is_member(p_client_id) then
    return 0;
  end if;
  update public.tasks
     set budget_status = 'approved',
         budget_approved_by = (select auth.uid()),
         budget_approved_at = now()
   where client_id = p_client_id
     and budget_status = 'pending_client'
     and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.client_approve_budgets(uuid, uuid[]) from public, anon;
grant execute on function public.client_approve_budgets(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Hours per freelancer
-- ---------------------------------------------------------------------

alter table public.task_assignments
  add column allocated_hours numeric(8,2) not null default 0 check (allocated_hours >= 0);

-- Existing tasks have one freelancer each: give them the whole budget.
update public.task_assignments ta
   set allocated_hours = t.estimate_hours
       + coalesce((select sum(c.hours) from public.change_requests c where c.task_id = t.id and c.status = 'approved'), 0)
  from public.tasks t
 where t.id = ta.task_id
   and (select count(*) from public.task_assignments x where x.task_id = ta.task_id) = 1;

-- What ERP VERS hands out can't be more than the task's budget.
create or replace function private.check_allocation()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_budget numeric;
  v_given  numeric;
begin
  if tg_op = 'UPDATE' and new.allocated_hours <= old.allocated_hours then
    return new;
  end if;
  select t.estimate_hours + coalesce((select sum(c.hours) from public.change_requests c
                                       where c.task_id = t.id and c.status = 'approved'), 0)
    into v_budget
    from public.tasks t where t.id = new.task_id;
  select coalesce(sum(allocated_hours), 0) into v_given
    from public.task_assignments where task_id = new.task_id and user_id <> new.user_id;
  if v_given + new.allocated_hours > v_budget then
    raise exception 'ALLOCATION_OVER_BUDGET:%', greatest(v_budget - v_given, 0);
  end if;
  return new;
end;
$$;
revoke all on function private.check_allocation() from public, anon, authenticated;

create trigger task_assignments_allocation
  before insert or update of allocated_hours on public.task_assignments
  for each row execute function private.check_allocation();

-- ---------------------------------------------------------------------
-- Freelancers ask ERP VERS for more hours (the client never sees these)
-- ---------------------------------------------------------------------

create table public.hour_requests (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.freelancers(user_id) on delete cascade,
  hours         numeric(8,2) not null check (hours > 0 and hours <= 1000),
  reason        text not null check (length(trim(reason)) between 1 and 2000),
  status        text not null default 'requested' check (status in ('requested', 'granted', 'declined')),
  granted_hours numeric(8,2) check (granted_hours is null or granted_hours > 0),
  review_note   text check (review_note is null or length(review_note) <= 500),
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index hour_requests_task_idx on public.hour_requests (task_id);
create index hour_requests_open_idx on public.hour_requests (status) where status = 'requested';

alter table public.hour_requests enable row level security;
revoke all on public.hour_requests from anon;
grant select, insert, update, delete on public.hour_requests to authenticated;

create policy "hour_requests: read" on public.hour_requests for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy "hour_requests: freelancers ask" on public.hour_requests for insert to authenticated
  with check ((select private.is_freelancer()) and private.is_assigned(task_id)
              and user_id = (select auth.uid()) and status = 'requested'
              and granted_hours is null and review_note is null and reviewed_by is null and reviewed_at is null);
create policy "hour_requests: admins update" on public.hour_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "hour_requests: admins delete" on public.hour_requests for delete to authenticated
  using ((select private.is_admin()));

-- Admin: give a freelancer hours from the reserve, in one step.
create function public.grant_hour_request(p_id uuid, p_hours numeric, p_note text default null)
returns void language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_req public.hour_requests%rowtype;
begin
  if not private.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_hours is null or p_hours <= 0 then
    raise exception 'INVALID_HOURS';
  end if;
  select * into v_req from public.hour_requests where id = p_id and status = 'requested' for update;
  if not found then
    raise exception 'ALREADY_HANDLED';
  end if;
  update public.task_assignments
     set allocated_hours = allocated_hours + p_hours
   where task_id = v_req.task_id and user_id = v_req.user_id;
  if not found then
    raise exception 'NOT_ASSIGNED';
  end if;
  update public.hour_requests
     set status = 'granted', granted_hours = p_hours, review_note = nullif(trim(p_note), ''),
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_id;
end;
$$;
revoke all on function public.grant_hour_request(uuid, numeric, text) from public, anon;
grant execute on function public.grant_hour_request(uuid, numeric, text) to authenticated;

-- Change requests are now ERP VERS's requests to the client only:
-- freelancers no longer file or see them.
drop policy "change_requests: freelancers request" on public.change_requests;
drop policy "change_requests: read" on public.change_requests;
create policy "change_requests: read" on public.change_requests for select to authenticated
  using ((select private.is_admin())
         or (status in ('pending_client', 'approved')
             and exists (select 1 from public.tasks t where t.id = task_id and private.is_member(t.client_id))));

-- ---------------------------------------------------------------------
-- Logging hours: the budget must be approved, and each freelancer stays
-- within the hours ERP VERS gave them.
-- ---------------------------------------------------------------------

create or replace function private.check_time_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_task      public.tasks%rowtype;
  v_total     numeric;
  v_used      numeric;
  v_mine      numeric;
  v_given     numeric;
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
  if v_task.budget_status <> 'approved' then
    raise exception 'BUDGET_NOT_APPROVED';
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

  -- The freelancer's own hours.
  select coalesce(allocated_hours, 0) into v_given
    from public.task_assignments where task_id = new.task_id and user_id = (select auth.uid());
  select coalesce(sum(e.hours), 0) into v_mine
    from public.time_entries e
    where e.task_id = new.task_id and e.created_by = (select auth.uid())
      and e.status in ('pending', 'reviewed', 'awaiting_client', 'approved') and e.id <> new.id;
  if v_mine + new.hours > coalesce(v_given, 0) then
    raise exception 'ALLOCATION_EXCEEDED:%', greatest(coalesce(v_given, 0) - v_mine, 0);
  end if;

  -- And the task's budget as a whole.
  select v_task.estimate_hours + coalesce(sum(c.hours), 0) into v_total
    from public.change_requests c where c.task_id = new.task_id and c.status = 'approved';
  select coalesce(sum(e.hours), 0) into v_used
    from public.time_entries e
    where e.task_id = new.task_id and e.status in ('pending', 'reviewed', 'awaiting_client', 'approved') and e.id <> new.id;
  if v_used + new.hours > v_total then
    raise exception 'ESTIMATE_EXCEEDED:%', greatest(v_total - v_used, 0);
  end if;

  return new;
end;
$$;

-- task_usage: same as 0003, but clients don't get numbers for draft budgets.
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
         case when private.is_admin() or private.is_assigned(t.id)
              then coalesce(te.sent, 0) + coalesce(te.unsent, 0)
              else coalesce(te.sent, 0) end,
         case when private.is_admin() or private.is_assigned(t.id) then coalesce(te.pending, 0) else 0 end,
         case when private.is_admin()
              then coalesce(cr.requested, 0) + coalesce(cr.unsent, 0) + coalesce(cr.with_client, 0)
              else coalesce(cr.with_client, 0) end
  from public.tasks t
  left join lateral (
    select sum(c.hours) filter (where c.status = 'approved')       as approved,
           sum(c.hours) filter (where c.status = 'pending_client') as with_client,
           sum(c.hours) filter (where c.status = 'reviewed')       as unsent,
           sum(c.hours) filter (where c.status = 'requested')      as requested
    from public.change_requests c where c.task_id = t.id
  ) cr on true
  left join lateral (
    select sum(e.hours) filter (where e.status in ('awaiting_client', 'approved')) as sent,
           sum(e.hours) filter (where e.status = 'reviewed') as unsent,
           sum(e.hours) filter (where e.status = 'pending')  as pending
    from public.time_entries e where e.task_id = t.id
  ) te on true
  where (p_client_id is null or t.client_id = p_client_id)
    and (private.is_admin()
         or private.is_assigned(t.id)
         or (t.budget_status <> 'draft' and private.is_member(t.client_id)));
$$;
revoke all on function public.task_usage(uuid) from public, anon;
grant execute on function public.task_usage(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Money: TDS and what the client pays for
-- ---------------------------------------------------------------------

alter table public.client_rates
  add column tds_pct numeric(5,2) not null default 0 check (tds_pct between 0 and 100),
  add column billing_basis text not null default 'logged' check (billing_basis in ('logged', 'budget'));

commit;
